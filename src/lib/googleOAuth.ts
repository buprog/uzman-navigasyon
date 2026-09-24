/**
 * Google OAuth 2.0 with PKCE for admin authentication
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';
import { createHash, randomBytes } from 'crypto';

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

/**
 * Build callback URL from request or env
 */
export function getCallbackUrl(request?: Request): string {
  // Use server-only env var if set
  if (process.env.APP_BASE_URL) {
    return `${process.env.APP_BASE_URL}/api/oauth/google/callback`;
  }
  
  // Derive from request headers
  if (request) {
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    return `${proto}://${host}/api/oauth/google/callback`;
  }
  
  // Fallback
  return 'http://localhost:3000/api/oauth/google/callback';
}

/**
 * Generate PKCE code verifier and challenge
 */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  return { codeVerifier, codeChallenge };
}

/**
 * Generate cryptographically secure random string
 */
export function generateRandomString(length: number = 32): string {
  return randomBytes(length).toString('base64url');
}

/**
 * Build Google OAuth authorization URL
 */
export function buildAuthorizationUrl(
  state: string,
  codeChallenge: string,
  nonce: string,
  callbackUrl: string
): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'online',
    prompt: 'select_account',
  });

  return `${GOOGLE_OAUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  callbackUrl: string
): Promise<{ idToken: string; accessToken: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth not configured');
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: callbackUrl,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();
  
  return {
    idToken: data.id_token,
    accessToken: data.access_token,
  };
}

/**
 * Verify Google ID token and extract claims
 */
export async function verifyIdToken(
  idToken: string,
  expectedNonce: string
): Promise<{
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID not configured');
  }

  // Verify token signature using Google's JWKS
  const JWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: clientId,
  });

  // Verify nonce
  if (payload.nonce !== expectedNonce) {
    throw new Error('Invalid nonce');
  }

  // Verify email is verified
  if (payload.email_verified !== true) {
    throw new Error('Email not verified');
  }

  return {
    sub: payload.sub as string,
    email: payload.email as string,
    emailVerified: payload.email_verified as boolean,
    name: payload.name as string | undefined,
    picture: payload.picture as string | undefined,
  };
}

/**
 * Check if email is in allowlist
 */
export function isEmailAllowed(email: string): boolean {
  const allowedEmails = process.env.ADMIN_ALLOWED_EMAILS;
  
  if (!allowedEmails) {
    return false;
  }

  const allowed = allowedEmails
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0);

  return allowed.includes(email.trim().toLowerCase());
}

/**
 * Check if Google sub is in allowlist (if configured)
 */
export function isGoogleSubAllowed(sub: string): boolean {
  const allowedSubs = process.env.ADMIN_ALLOWED_GOOGLE_SUBS;
  
  // If not configured, skip this check
  if (!allowedSubs) {
    return true;
  }

  const allowed = allowedSubs
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return allowed.includes(sub);
}

/**
 * Check if Google OAuth is configured
 */
export function isGoogleOAuthConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.ADMIN_ALLOWED_EMAILS
  );
}
