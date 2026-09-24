# Admin Panel Security Report

## Overview
The admin panel has been significantly hardened with multiple layers of security, including a secret path, HTTP Basic Authentication, optional IP allowlist, and comprehensive security headers.

## Security Layers

### Layer 1: Secret Path (Obscurity)
The admin panel is no longer accessible at predictable URLs like `/yonetim`. Instead, it is served under a secret path defined by the `ADMIN_PATH` environment variable.

**Configuration:**
- **Environment Variable**: `ADMIN_PATH`
- **Format**: Must match `^[a-z0-9-]{12,64}$` (12-64 characters, lowercase letters, numbers, and hyphens)
- **Example**: `kapi-7f3a9x2b8c4d1e5f6g7h`
- **Validation**: Invalid or missing values result in the admin panel being completely disabled (404)

**Implementation:**
- Physical routes stored in `src/app/__a/` (internal directory)
- Middleware rewrites `/${ADMIN_PATH}` → `/__a` and `/${ADMIN_PATH}/giris` → `/__a/giris`
- Direct access to `/__a/*` returns 404 (only rewritten requests are allowed)
- All admin links and redirects are built dynamically from the environment variable
- Admin cookie scoped to the secret path (e.g., `path=/${ADMIN_PATH}`)

**Security Benefits:**
- Admin panel URL not discoverable through directory scanning
- No hints or redirects from public URLs
- Path not hardcoded anywhere in the codebase (can be changed without code changes)
- Attempting to access `/yonetim` returns a plain 404 (identical to any unknown page)

### Layer 2: HTTP Basic Authentication
Every request to the admin panel (including the login page) requires HTTP Basic Authentication credentials.

**Configuration:**
- **Environment Variables**: 
  - `ADMIN_BASIC_USER` - Username for Basic Auth
  - `ADMIN_BASIC_PASSWORD` - Password for Basic Auth
- **Required**: Yes (if admin panel is enabled)
- **Algorithm**: Constant-time comparison to prevent timing attacks

**Implementation:**
- Middleware enforces Basic Auth for all requests matching `/${ADMIN_PATH}/*`
- Middleware enforces Basic Auth for all `/api/admin/*` API routes
- Returns `401 Unauthorized` with `WWW-Authenticate: Basic realm="Restricted"` header on failure
- Failed attempts are logged (IP and timestamp, no credentials)
- Rate limiting: Maximum 5 failures per IP within 15 minutes

**Security Benefits:**
- Browser prompts for credentials before loading any admin page
- Prevents automated scanners and bots
- Additional barrier even if secret path is discovered
- Credentials never sent over unencrypted connections (HTTPS only)

### Layer 3: Admin Login (Existing)
After passing Basic Auth, users must log in with admin credentials (second layer of authentication).

**Configuration:**
- **Environment Variables**:
  - `ADMIN_EMAIL` - Admin account email
  - `ADMIN_PASSWORD` - Admin account password
- **Session**: Signed cookie with 1-hour expiration
- **Algorithm**: Constant-time comparison + HMAC signature

**Implementation:**
- Login form at `/${ADMIN_PATH}/giris`
- Session cookie scoped to `/${ADMIN_PATH}`
- Rate limiting on login attempts
- All admin actions logged with IP, timestamp, and action details

### Layer 4: IP Allowlist (Optional)
Restrict admin access to specific IP addresses or CIDR blocks.

**Configuration:**
- **Environment Variable**: `ADMIN_IP_ALLOWLIST` (optional)
- **Format**: Comma-separated list of IPs or CIDR blocks
- **Example**: `203.0.113.1,198.51.100.0/24,192.0.2.50`
- **Behavior**: If unset, all IPs are allowed (useful for dynamic home IPs)

**Implementation:**
- Middleware checks client IP (from `x-forwarded-for` or `request.ip`)
- Returns 404 if IP not in allowlist
- Applies to all admin routes and API endpoints
- Logs unauthorized IP attempts

**Security Benefits:**
- Restricts access to known network locations
- Prevents access from compromised credentials outside trusted networks
- Simple CIDR prefix matching (e.g., `198.51.100.` matches `198.51.100.*`)

### Layer 5: Security Headers
Comprehensive HTTP security headers applied to all admin responses.

**Headers Applied:**
1. **`Strict-Transport-Security`** (site-wide): `max-age=63072000; includeSubDomains; preload`
   - Forces HTTPS for 2 years
   - Applies to all subdomains
   - Eligible for browser preload list

2. **`X-Robots-Tag`** (admin only): `noindex, nofollow`
   - Prevents search engine indexing
   - Admin panel never appears in search results

3. **`Cache-Control`** (admin only): `no-store`
   - Prevents caching of sensitive admin pages
   - Ensures fresh authentication checks

4. **`X-Frame-Options`** (admin only): `DENY`
   - Prevents admin panel from being embedded in iframes
   - Protects against clickjacking attacks
   - Overrides `/onizleme` SAMEORIGIN allowance for admin

5. **`Referrer-Policy`** (admin only): `no-referrer`
   - Prevents leaking admin URLs in referrer headers
   - Protects secret path from exposure

## Environment Variables

**Required (for admin access):**
- `ADMIN_PATH` - Secret path (12-64 chars, `^[a-z0-9-]{12,64}$`)
- `ADMIN_BASIC_USER` - HTTP Basic Auth username
- `ADMIN_BASIC_PASSWORD` - HTTP Basic Auth password
- `ADMIN_EMAIL` - Admin login email
- `ADMIN_PASSWORD` - Admin login password

**Optional:**
- `ADMIN_IP_ALLOWLIST` - Comma-separated IP allowlist (if unset, all IPs allowed)

**Example `.env` configuration:**
```bash
# Admin panel - all fields required except IP allowlist
ADMIN_PATH="kapi-7f3a9x2b8c4d1e5f6g7h"
ADMIN_BASIC_USER="admin"
ADMIN_BASIC_PASSWORD="strong-basic-password-here"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="strong-admin-password-here"
# ADMIN_IP_ALLOWLIST="203.0.113.1,198.51.100.0/24"
```

## Files Modified/Created

**New Files:**
- `src/lib/adminPath.ts` - Admin path utilities and validation
- `src/middleware.ts` - Security middleware (Basic Auth, IP allowlist, rewrites, headers)
- `src/app/__a/page.tsx` - Internal admin dashboard route
- `src/app/__a/giris/page.tsx` - Internal admin login route

**Modified Files:**
- `src/lib/adminAuth.ts` - Updated cookie scoping to secret path
- `src/components/admin/AdminDashboard.tsx` - Dynamic logout redirect
- `src/app/layout.tsx` - Updated AdBanner hideOnPages to internal path
- `.env.example` - Updated admin panel configuration documentation

**Removed Files:**
- `src/app/yonetim/page.tsx` - Old public admin route (removed)
- `src/app/yonetim/giris/page.tsx` - Old public login route (removed)

## Verification Steps

### 1. Verify Old Public URLs Return 404
**Test**: Access old admin URLs
```bash
curl -I https://your-domain.com/yonetim
curl -I https://your-domain.com/yonetim/giris
```
**Expected**: `404 Not Found` (plain 404, identical to any unknown page)
**Verify**: No hints, no redirects, no special error messages

### 2. Verify Secret Path Without Basic Auth Returns 401
**Test**: Access secret path without credentials
```bash
# Replace 'kapi-...' with your actual ADMIN_PATH
curl -I https://your-domain.com/kapi-7f3a9x2b8c4d1e5f6g7h
```
**Expected**: 
```
401 Unauthorized
WWW-Authenticate: Basic realm="Restricted"
```
**Verify**: Browser shows Basic Auth prompt

### 3. Verify Basic Auth Works
**Test**: Access with Basic Auth credentials
```bash
# Replace with your ADMIN_BASIC_USER and ADMIN_BASIC_PASSWORD
curl -u admin:basic-password https://your-domain.com/kapi-7f3a9x2b8c4d1e5f6g7h/giris
```
**Expected**: `200 OK` with login form HTML
**Verify**: Login form loads successfully

### 4. Verify Direct Access to Internal Path Returns 404
**Test**: Try to access internal route directly
```bash
curl -I https://your-domain.com/__a
curl -I https://your-domain.com/__a/giris
```
**Expected**: `404 Not Found`
**Verify**: Internal path is not directly accessible

### 5. Verify IP Allowlist (If Configured)
**Test**: Access from non-allowed IP
```bash
# From an IP not in ADMIN_IP_ALLOWLIST
curl -u admin:basic-password https://your-domain.com/kapi-7f3a9x2b8c4d1e5f6g7h
```
**Expected**: `404 Not Found` (if IP allowlist is configured)
**Verify**: Only allowed IPs can access

### 6. Verify Admin API Routes Require Basic Auth
**Test**: Access admin API without Basic Auth
```bash
curl -I https://your-domain.com/api/admin/ads
```
**Expected**: `401 Unauthorized`
**Verify**: API routes also protected

### 7. Verify Rate Limiting
**Test**: Make multiple failed Basic Auth attempts
```bash
# Try 6+ times with wrong credentials
for i in {1..6}; do curl -u wrong:wrong https://your-domain.com/kapi-...; done
```
**Expected**: After 5 failures, `429 Too Many Requests` with `Retry-After: 900`
**Verify**: Rate limiting prevents brute force

### 8. Verify Security Headers
**Test**: Check response headers
```bash
curl -u admin:basic-password -I https://your-domain.com/kapi-7f3a9x2b8c4d1e5f6g7h
```
**Expected headers:**
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Robots-Tag: noindex, nofollow
Cache-Control: no-store
X-Frame-Options: DENY
Referrer-Policy: no-referrer
```
**Verify**: All security headers present

### 9. Verify Login Flow
**Test**: Complete full authentication flow
1. Navigate to `https://your-domain.com/[ADMIN_PATH]/giris`
2. Browser prompts for Basic Auth → Enter `ADMIN_BASIC_USER` and `ADMIN_BASIC_PASSWORD`
3. Login form appears → Enter `ADMIN_EMAIL` and `ADMIN_PASSWORD`
4. Redirects to dashboard at `https://your-domain.com/[ADMIN_PATH]`

**Verify**: 
- Both authentication layers work
- Dashboard loads with ads and settings tabs
- Logout redirects to login page with `/giris` suffix

### 10. Verify Admin Panel Not Linked from Public UI
**Test**: Inspect public pages
- Check navigation menu
- Check `/onizleme` preview page
- Check page footers
- Search codebase for hardcoded admin path

**Expected**: No links or references to admin panel in public UI
**Verify**: Admin panel completely hidden from normal users

## Logging and Monitoring

**Failed Basic Auth Attempts:**
- Logged to console with IP and timestamp
- Credentials never logged
- Rate limited after 5 failures per 15-minute window

**Admin Actions:**
- All CRUD operations logged to `AdminAccessLog` table
- Includes: timestamp, admin email, action, target ID, IP (truncated), details
- Viewable in admin panel

**Security Events to Monitor:**
1. Multiple 401 responses from same IP (brute force attempt)
2. Multiple 404 responses to secret path (scanning/guessing)
3. 429 rate limit responses (sustained attack)
4. Admin actions outside business hours
5. Admin access from unexpected IPs

## Attack Surface Reduction

**Before:**
- Admin panel at predictable URL (`/yonetim`)
- Single authentication layer (email/password)
- No IP restrictions
- Minimal security headers
- Vulnerable to automated scanning

**After:**
- Admin panel at unpredictable secret URL (entropy: ~60-260 bits for 12-64 char path)
- Three authentication layers (Basic Auth → Login → Session)
- Optional IP allowlist
- Comprehensive security headers
- HSTS preload eligible
- Rate limiting on authentication
- No search engine indexing
- No iframe embedding
- No referrer leakage

## Best Practices

1. **Generate Strong Secret Path:**
   ```bash
   openssl rand -hex 16 | tr '[:upper:]' '[:lower:]' | sed 's/\(..\)/\1-/g; s/-$//'
   # Example output: 7f3a9x2b8c4d1e5f6g7h8i9j0k1l2m3n
   ```

2. **Use Different Credentials for Each Layer:**
   - Basic Auth credentials ≠ Admin login credentials
   - Prevents single point of failure

3. **Rotate Credentials Regularly:**
   - Change ADMIN_PATH every 3-6 months
   - Change passwords every 3 months
   - Update IP allowlist as needed

4. **Enable IP Allowlist in Production:**
   - Even with dynamic IPs, consider using VPN with static IP
   - Or use office/home network range

5. **Monitor Logs:**
   - Set up alerts for failed authentication attempts
   - Review admin action logs regularly
   - Check for unusual access patterns

6. **Backup Access:**
   - Document admin credentials securely (password manager)
   - Keep ADMIN_PATH in multiple secure locations
   - Have a recovery plan if credentials are lost

7. **HTTPS Only:**
   - Never access admin panel over HTTP
   - Vercel automatically redirects HTTP to HTTPS
   - HSTS header enforces HTTPS for 2 years

## Compliance

**KVKK Compliance:**
- Admin access logged with IP (truncated for privacy)
- All data access/modifications logged
- Audit trail for compliance reporting
- Secure authentication prevents unauthorized access

**Security Standards:**
- Follows OWASP recommendations
- Defense in depth (multiple layers)
- Principle of least privilege
- Secure by default

## Troubleshooting

**Problem**: Admin panel returns 404 even at secret path
**Solution**: 
- Verify `ADMIN_PATH` is set and valid (12-64 chars, `^[a-z0-9-]{12,64}$`)
- Check server logs for validation errors
- Ensure all required env vars are set

**Problem**: Basic Auth keeps prompting
**Solution**:
- Verify `ADMIN_BASIC_USER` and `ADMIN_BASIC_PASSWORD` are set correctly
- Check for whitespace in credentials
- Clear browser cache/cookies
- Try incognito/private mode

**Problem**: Login form loads but login fails
**Solution**:
- Verify `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set correctly
- Check session cookie is being set (scoped to secret path)
- Verify `AUTH_SECRET` is set

**Problem**: 429 Too Many Requests
**Solution**:
- Wait 15 minutes for rate limit to reset
- Check logs for failed attempts
- Verify credentials are correct

## Maintenance

**Changing Admin Path:**
1. Update `ADMIN_PATH` in environment variables
2. Redeploy application
3. Update bookmarks/documentation
4. Old path will return 404 immediately

**Changing Credentials:**
1. Update relevant env vars (`ADMIN_BASIC_*` or `ADMIN_EMAIL`/`ADMIN_PASSWORD`)
2. Redeploy application
3. Existing sessions will be invalidated
4. Users must re-authenticate with new credentials

**Disabling Admin Panel:**
1. Unset `ADMIN_PATH` or set to empty string
2. Redeploy application
3. All admin routes will return 404
4. Admin panel completely disabled

## Conclusion

The admin panel is now protected by multiple independent security layers, each providing defense against different attack vectors. The combination of a secret path, HTTP Basic Authentication, optional IP allowlist, and comprehensive security headers significantly reduces the attack surface and makes unauthorized access extremely difficult.

The secret path provides security through obscurity (not a primary defense, but a valuable additional layer). The Basic Auth and admin login provide authentication in depth. The IP allowlist provides network-level access control. The security headers provide browser-level protections.

All security measures are configurable through environment variables, allowing easy adaptation to different deployment scenarios without code changes.
