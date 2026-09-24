import { NextRequest, NextResponse } from 'next/server';
import { 
  exchangeCodeForTokens, 
  verifyIdToken, 
  isEmailAllowed,
  isGoogleSubAllowed,
  getCallbackUrl
} from '@/lib/googleOAuth';
import { getOAuthState, clearOAuthState } from '@/lib/oauthState';
import { createAdminSession } from '@/lib/adminAuth';
import { getAdminDashboardUrl } from '@/lib/adminPath';
import { logAdminAccess, truncateIp } from '@/lib/adminAuth';

// Rate limiting
const callbackAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = callbackAttempts.get(ip);

  if (!record || now > record.resetAt) {
    callbackAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() 
    || request.headers.get('x-real-ip') 
    || request.ip 
    || 'unknown';
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    // Rate limiting
    if (!checkRateLimit(ip)) {
      return new NextResponse(null, { status: 429 });
    }

    const { searchParams } = request.nextUrl;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      clearOAuthState();
      return new NextResponse('Authentication failed', { status: 400 });
    }

    // Validate required parameters
    if (!code || !state) {
      return new NextResponse(null, { status: 400 });
    }

    // Verify state and retrieve stored OAuth data
    const oauthState = getOAuthState(state);
    if (!oauthState) {
      // Invalid state or direct hit without initiation
      return new NextResponse(null, { status: 404 });
    }

    // Clear state cookies (one-time use)
    clearOAuthState();

    // Exchange code for tokens
    const callbackUrl = getCallbackUrl(request);
    const { idToken } = await exchangeCodeForTokens(code, oauthState.codeVerifier, callbackUrl);

    // Verify ID token
    const claims = await verifyIdToken(idToken, oauthState.nonce);

    // Check email allowlist
    if (!isEmailAllowed(claims.email)) {
      await logAdminAccess(
        claims.email,
        ip,
        'oauth_rejected_email',
        undefined,
        `Email not in allowlist`
      );
      return new NextResponse('Yetkisiz', { status: 403 });
    }

    // Check Google sub allowlist (if configured)
    if (!isGoogleSubAllowed(claims.sub)) {
      await logAdminAccess(
        claims.email,
        ip,
        'oauth_rejected_sub',
        undefined,
        `Google sub not in allowlist`
      );
      return new NextResponse('Yetkisiz', { status: 403 });
    }

    // Create admin session
    await createAdminSession(claims.email, claims.sub, claims.name);

    // Log successful login
    await logAdminAccess(
      claims.email,
      ip,
      'oauth_login_success',
      claims.sub
    );

    // Redirect to admin dashboard
    const dashboardUrl = getAdminDashboardUrl();
    if (dashboardUrl) {
      return NextResponse.redirect(new URL(dashboardUrl, request.url));
    } else {
      return new NextResponse('Admin panel disabled', { status: 503 });
    }
  } catch (error) {
    console.error('OAuth callback error:', error);
    
    // Log failure
    try {
      await logAdminAccess(
        'unknown',
        ip,
        'oauth_callback_error',
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } catch (logError) {
      console.error('Failed to log OAuth error:', logError);
    }

    // Generic error response (no details)
    return new NextResponse('Yetkisiz', { status: 403 });
  }
}
