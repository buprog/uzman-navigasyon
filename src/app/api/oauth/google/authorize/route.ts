import { NextResponse } from 'next/server';
import { generatePKCE, generateRandomString, buildAuthorizationUrl, isGoogleOAuthConfigured } from '@/lib/googleOAuth';
import { storeOAuthState } from '@/lib/oauthState';

export async function POST() {
  try {
    if (!isGoogleOAuthConfigured()) {
      return NextResponse.json(
        { error: 'OAuth not configured' },
        { status: 503 }
      );
    }

    // Generate PKCE parameters
    const { codeVerifier, codeChallenge } = generatePKCE();
    const state = generateRandomString();
    const nonce = generateRandomString();

    // Store in cookies
    storeOAuthState({ state, nonce, codeVerifier });

    // Build authorization URL
    const authorizationUrl = buildAuthorizationUrl(state, codeChallenge, nonce);

    return NextResponse.json({ authorizationUrl });
  } catch (error) {
    console.error('OAuth authorization error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate authorization' },
      { status: 500 }
    );
  }
}
