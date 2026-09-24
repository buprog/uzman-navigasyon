/**
 * OAuth state management (short-lived cookies)
 */

import { cookies } from 'next/headers';

const STATE_COOKIE = 'oauth_state';
const NONCE_COOKIE = 'oauth_nonce';
const CODE_VERIFIER_COOKIE = 'oauth_cv';
const MAX_AGE = 10 * 60; // 10 minutes

export interface OAuthState {
  state: string;
  nonce: string;
  codeVerifier: string;
}

/**
 * Store OAuth state in cookies
 */
export function storeOAuthState(data: OAuthState): void {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: MAX_AGE,
    path: '/',
  };

  cookies().set(STATE_COOKIE, data.state, cookieOptions);
  cookies().set(NONCE_COOKIE, data.nonce, cookieOptions);
  cookies().set(CODE_VERIFIER_COOKIE, data.codeVerifier, cookieOptions);
}

/**
 * Retrieve and validate OAuth state from cookies
 */
export function getOAuthState(expectedState: string): OAuthState | null {
  const state = cookies().get(STATE_COOKIE)?.value;
  const nonce = cookies().get(NONCE_COOKIE)?.value;
  const codeVerifier = cookies().get(CODE_VERIFIER_COOKIE)?.value;

  if (!state || !nonce || !codeVerifier) {
    return null;
  }

  // Verify state matches
  if (state !== expectedState) {
    return null;
  }

  return { state, nonce, codeVerifier };
}

/**
 * Clear OAuth state cookies
 */
export function clearOAuthState(): void {
  cookies().delete(STATE_COOKIE);
  cookies().delete(NONCE_COOKIE);
  cookies().delete(CODE_VERIFIER_COOKIE);
}
