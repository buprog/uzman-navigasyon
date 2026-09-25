# Admin Google OAuth Implementation Report

## Overview
Admin authentication has been completely replaced with Google OAuth 2.0, providing enterprise-grade security through Google's identity platform with email allowlisting.

## Authentication Flow

### Previous System (Removed)
- ❌ HTTP Basic Authentication (ADMIN_BASIC_USER/PASSWORD)
- ❌ Email/password login form (ADMIN_EMAIL/PASSWORD)
- ❌ Two-layer authentication

### New System (Google OAuth)
- ✅ Secret path (ADMIN_PATH) - Layer 1
- ✅ Google OAuth 2.0 with PKCE - Layer 2
- ✅ Email allowlist verification - Layer 3
- ✅ Optional Google sub (user ID) allowlist - Layer 4
- ✅ Optional IP allowlist - Layer 5

## OAuth 2.0 Implementation

### Standard Compliance
- **Protocol**: OAuth 2.0 Authorization Code Flow with PKCE
- **OpenID Connect**: Yes (openid, email, profile scopes)
- **Security**: State parameter, nonce, code_verifier
- **Token Verification**: JWT signature via Google JWKS, iss, aud, exp, nonce validation
- **Email Verification**: Requires `email_verified === true`

### Redirect URI (Exact)
**IMPORTANT**: Register this exact URI in Google Cloud Console:

```
https://uzman-navigasyon.vercel.app/api/oauth/google/callback
```

### Flow Sequence

1. **User visits** `/${ADMIN_PATH}/signin`
   - Shows "Google ile giriş yap" button
   - Or "Giriş yapılandırılmamış" if not configured

2. **User clicks sign-in button**
   - Client calls `/api/oauth/google/authorize` (POST)
   - Server generates: state, nonce, code_verifier, code_challenge
   - Stores state/nonce/code_verifier in short-lived cookies (10 min)
   - Returns Google authorization URL
   - Client redirects to Google OAuth consent screen

3. **User authenticates with Google**
   - Selects Google account
   - Grants permissions (openid, email, profile)
   - Google redirects to callback URI with code and state

4. **Callback handler** `/api/oauth/google/callback` (GET)
   - Validates state parameter (CSRF protection)
   - Retrieves stored OAuth state from cookies
   - Exchanges authorization code for tokens using code_verifier (PKCE)
   - Verifies ID token:
     - JWT signature via Google JWKS
     - Issuer (accounts.google.com)
     - Audience (GOOGLE_CLIENT_ID)
     - Expiration
     - Nonce match
     - email_verified === true
   - Checks email against ADMIN_ALLOWED_EMAILS
   - Checks Google sub against ADMIN_ALLOWED_GOOGLE_SUBS (if set)
   - Creates admin session (8-hour cookie, httpOnly, Secure, path-scoped)
   - Logs success to AdminAccessLog
   - Redirects to `/${ADMIN_PATH}`

5. **Failed Authentication**
   - Logs attempt to AdminAccessLog (email, IP, reason)
   - Returns generic "Yetkisiz" (403) - no details leaked
   - Rate limited (5 attempts per 15 minutes per IP)

## Environment Variables

### Required
```bash
# Secret admin path (already set in Vercel)
ADMIN_PATH=""

# Google OAuth credentials
# Get from: https://console.cloud.google.com
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Email allowlist (comma-separated)
# Only these Google accounts can access admin panel
ADMIN_ALLOWED_EMAILS="admin@example.com,owner@company.com"
```

### Optional
```bash
# Google sub (user ID) allowlist for extra security
# Comma-separated Google sub values
ADMIN_ALLOWED_GOOGLE_SUBS="123456789012345678901,987654321098765432109"

# Admin session signing secret (uses AUTH_SECRET if not set)
ADMIN_SESSION_SECRET=""

# IP allowlist (comma-separated IPs or CIDR blocks)
ADMIN_IP_ALLOWLIST="203.0.113.1,198.51.100.0/24"
```

## Google Cloud Console Setup

### 1. Create OAuth 2.0 Client

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Name: "Uzman Navigasyon Admin"
7. **Authorized redirect URIs**:
   ```
   https://uzman-navigasyon.vercel.app/api/oauth/google/callback
   ```
8. Click **Create**
9. Copy **Client ID** and **Client secret**

### 2. Configure OAuth Consent Screen

1. Navigate to **APIs & Services** > **OAuth consent screen**
2. User Type: **Internal** (if using Google Workspace) or **External**
3. Fill in required fields:
   - App name: "Uzman Navigasyon Admin"
   - User support email: your email
   - Developer contact: your email
4. Scopes: (automatically included by our code)
   - `openid`
   - `email`
   - `profile`
5. Save and continue

### 3. Add Test Users (if External)

If using External user type:
1. Add admin emails to **Test users** list
2. Or publish the app (requires verification for production)

## Session Management

### Session Cookie
- **Name**: `c_sess`
- **Content**: Signed payload (`email.sub.timestamp.signature`)
- **Duration**: 8 hours
- **Security**: httpOnly, Secure, SameSite=Lax
- **Path**: Scoped to `/${ADMIN_PATH}`
- **Signing**: HMAC-SHA256 with ADMIN_SESSION_SECRET or AUTH_SECRET

### Session Validation
- Signature verification (constant-time comparison)
- No expiration check in cookie (relies on maxAge)
- Email extracted from signed payload
- Validated on each admin page/API request

### Sign Out
- "Sign Out" button in admin panel
- Calls `/api/admin/logout` (POST)
- Clears admin session cookie
- Redirects to `/${ADMIN_PATH}/signin`

## Security Features

### PKCE (Proof Key for Code Exchange)
- Prevents authorization code interception attacks
- Code verifier: 32-byte random string (base64url)
- Code challenge: SHA256(code_verifier) in base64url
- Challenge method: S256

### State Parameter
- 32-byte cryptographically secure random string
- Prevents CSRF attacks
- Stored in cookie, verified on callback
- One-time use (cookie deleted after validation)

### Nonce
- 32-byte cryptographically secure random string
- Prevents token replay attacks
- Stored in cookie, validated in ID token
- One-time use

### Rate Limiting
- Callback endpoint: 5 attempts per 15 minutes per IP
- Sign-in page: (inherits from callback rate limit)
- Prevents brute force and enumeration attacks

### Email Allowlist
- Only explicitly allowed Google accounts can authenticate
- Case-insensitive, trimmed comparison
- Comma-separated in ADMIN_ALLOWED_EMAILS
- Logged rejections (email, IP, time, reason)

### Google Sub Allowlist (Optional)
- Additional layer: pin specific Google user IDs
- Protects against email takeover/transfer
- If set, both email AND sub must match
- Useful for high-security scenarios

### IP Allowlist (Optional)
- Restrict admin access to specific IPs/networks
- Applied before OAuth flow starts
- Returns 404 (not 403) to hide admin panel existence

### No Information Leakage
- Failed auth: Generic "Yetkisiz" message (no details)
- Direct callback hits: 404 (not 400/401)
- Invalid state: 404 (not 400)
- OAuth errors: Generic response
- Admin path not revealed in any error message

### AdminAccessLog
All authentication attempts logged:
- `oauth_login_success`: Successful authentication
- `oauth_rejected_email`: Email not in allowlist
- `oauth_rejected_sub`: Google sub not in allowlist
- `oauth_callback_error`: Technical error during callback
- Includes: email (attempted), IP (truncated), timestamp, reason

## File Structure

### New Files
- `src/lib/googleOAuth.ts` - OAuth flow utilities, token verification
- `src/lib/oauthState.ts` - State/nonce/code_verifier cookie management
- `src/app/api/oauth/google/authorize/route.ts` - Initiate OAuth flow
- `src/app/api/oauth/google/callback/route.ts` - Handle OAuth callback
- `src/components/admin/GoogleSignInButton.tsx` - Sign-in UI component

### Modified Files
- `src/lib/adminAuth.ts` - Session management for OAuth
- `src/middleware.ts` - Removed Basic Auth, kept path rewriting
- `src/app/__console/signin/page.tsx` - Google sign-in button
- `src/components/admin/AdminDashboard.tsx` - Sign Out button
- `.env.example` - Updated environment variables

### Removed Files
- `src/app/api/admin/login/route.ts` - Old email/password login

## Verification Steps

### 1. Secret Path Without Session → Sign-In Page
**Test**: Access secret path in incognito/private window
```bash
# Visit in browser (replace with your ADMIN_PATH)
https://uzman-navigasyon.vercel.app/vault-xxxxxxxxx/signin
```
**Expected**: 
- Google sign-in button visible
- "Google ile giriş yap"
- No email/password form

### 2. Old Admin URLs → 404
**Test**: Access predictable admin URLs
```bash
curl -I https://uzman-navigasyon.vercel.app/yonetim
curl -I https://uzman-navigasyon.vercel.app/admin
curl -I https://uzman-navigasyon.vercel.app/console
```
**Expected**: `404 Not Found` for all

### 3. Non-Allowlisted Google Account → Rejected
**Test**: Sign in with Google account NOT in ADMIN_ALLOWED_EMAILS
1. Click "Google ile giriş yap"
2. Authenticate with non-allowlisted account
3. Callback processes
**Expected**:
- "Yetkisiz" message (403)
- No details about why rejected
- Logged in AdminAccessLog with reason `oauth_rejected_email`

### 4. Allowlisted Google Account → Success
**Test**: Sign in with account IN ADMIN_ALLOWED_EMAILS
1. Click "Google ile giriş yap"
2. Authenticate with allowlisted account
3. Callback processes
**Expected**:
- Redirected to `/${ADMIN_PATH}`
- Admin dashboard loads
- "Sign Out" button visible
- Email shown in dashboard header
- Logged in AdminAccessLog as `oauth_login_success`

### 5. Direct Callback Access → 404
**Test**: Access callback URL directly
```bash
curl -I https://uzman-navigasyon.vercel.app/api/oauth/google/callback
```
**Expected**: `404` or `400` (no state parameter)

### 6. Session Duration → 8 Hours
**Test**: After successful login
1. Check browser cookies: `c_sess` cookie present
2. Cookie attributes: httpOnly, Secure, SameSite=Lax
3. Max-Age: 28800 seconds (8 hours)
4. Path: `/${ADMIN_PATH}`

### 7. Sign Out → Session Cleared
**Test**: Click "Sign Out" button
**Expected**:
- Redirected to `/${ADMIN_PATH}/signin`
- Cookie `c_sess` deleted
- Accessing `/${ADMIN_PATH}` redirects back to signin

### 8. Unconfigured OAuth → Error Message
**Test**: Visit signin without GOOGLE_CLIENT_ID/SECRET set
**Expected**:
- "Giriş yapılandırılmamış" message
- No sign-in button
- No error details

## Security Headers

All admin routes continue to have:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Robots-Tag: noindex, nofollow`
- `Cache-Control: no-store`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`

## Migration from Old System

### What Changed
- ❌ Removed: `ADMIN_BASIC_USER`, `ADMIN_BASIC_PASSWORD`
- ❌ Removed: `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- ❌ Removed: HTTP Basic Auth middleware
- ❌ Removed: Email/password login form
- ✅ Added: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- ✅ Added: `ADMIN_ALLOWED_EMAILS` (required)
- ✅ Added: `ADMIN_ALLOWED_GOOGLE_SUBS` (optional)
- ✅ Added: `ADMIN_SESSION_SECRET` (optional)

### What Stayed
- ✅ Secret path from `ADMIN_PATH`
- ✅ IP allowlist (`ADMIN_IP_ALLOWLIST`)
- ✅ `/yonetim` returns 404
- ✅ AdminAccessLog for all admin actions
- ✅ Security headers (HSTS, X-Frame-Options, etc.)
- ✅ Referrer-Policy: no-referrer (path not leaked)
- ✅ Admin panel UI (Turkish text inside)
- ✅ Session cookie scoped to secret path

## Troubleshooting

### "Giriş yapılandırılmamış"
**Problem**: Sign-in page shows this message
**Solution**:
- Verify `GOOGLE_CLIENT_ID` is set
- Verify `GOOGLE_CLIENT_SECRET` is set
- Verify `ADMIN_ALLOWED_EMAILS` is set
- Check Vercel environment variables dashboard

### "Yetkisiz" after Google authentication
**Problem**: Authenticated with Google but rejected
**Solution**:
- Verify email is in `ADMIN_ALLOWED_EMAILS`
- Check AdminAccessLog for rejection reason
- Ensure email in allowlist matches exactly (case-insensitive)
- If using `ADMIN_ALLOWED_GOOGLE_SUBS`, verify sub is included

### "redirect_uri_mismatch" error
**Problem**: Google shows redirect URI mismatch
**Solution**:
- Verify exact redirect URI in Google Cloud Console:
  ```
  https://uzman-navigasyon.vercel.app/api/oauth/google/callback
  ```
- Check `NEXT_PUBLIC_BASE_URL` is set correctly
- Ensure no trailing slashes in redirect URI

### Rate limit (429) on callback
**Problem**: Too many authentication attempts
**Solution**:
- Wait 15 minutes
- Check IP in AdminAccessLog
- Verify not under attack

### Session expires immediately
**Problem**: Logged in but redirected back to signin
**Solution**:
- Check cookie is being set (browser dev tools)
- Verify cookie path matches admin path
- Check `AUTH_SECRET` or `ADMIN_SESSION_SECRET` is set
- Ensure browser accepts cookies

## Production Checklist

- [ ] Google OAuth client created in Google Cloud Console
- [ ] Redirect URI registered: `https://uzman-navigasyon.vercel.app/api/oauth/google/callback`
- [ ] `GOOGLE_CLIENT_ID` set in Vercel
- [ ] `GOOGLE_CLIENT_SECRET` set in Vercel
- [ ] `ADMIN_ALLOWED_EMAILS` configured with admin emails
- [ ] `ADMIN_PATH` set (already configured)
- [ ] `AUTH_SECRET` or `ADMIN_SESSION_SECRET` set
- [ ] Optional: `ADMIN_ALLOWED_GOOGLE_SUBS` for extra security
- [ ] Optional: `ADMIN_IP_ALLOWLIST` if restricting by IP
- [ ] Test authentication with allowlisted account
- [ ] Test rejection with non-allowlisted account
- [ ] Verify `/yonetim` returns 404
- [ ] Verify session duration (8 hours)
- [ ] Verify Sign Out works
- [ ] Monitor AdminAccessLog for failed attempts

## Compliance

### GDPR/KVKK
- User data (email, sub) only stored in session cookie (8 hours)
- No Google user data stored in database
- AdminAccessLog stores admin email (required for audit)
- Sign out clears all session data

### Security Best Practices
- OAuth 2.0 with PKCE (industry standard)
- JWT signature verification
- Email verification required
- No password storage (delegated to Google)
- Rate limiting
- CSRF protection (state parameter)
- Replay protection (nonce)
- Secure cookie attributes
- No information leakage on errors

## Conclusion

The admin panel now uses enterprise-grade Google OAuth authentication, eliminating the need for password management while providing robust security through email allowlisting. The exact redirect URI that must be registered in Google Cloud Console is:

```
https://uzman-navigasyon.vercel.app/api/oauth/google/callback
```

All environment variables must be configured in Vercel dashboard for the authentication to function.
