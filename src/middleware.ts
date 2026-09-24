import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdminRequest, isInternalAdminPath, rewriteAdminPath, getAdminPath } from '@/lib/adminPath';

const BASIC_AUTH_HEADER = 'x-admin-basic-auth-verified';

// In-memory rate limiting for basic auth failures
const basicAuthFailures = new Map<string, { count: number; resetAt: number }>();
const BASIC_AUTH_RATE_LIMIT = 5; // Max failures per window
const BASIC_AUTH_RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() 
    || request.headers.get('x-real-ip') 
    || request.ip 
    || 'unknown';
}

function checkBasicAuthRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = basicAuthFailures.get(ip);
  
  if (!record || now > record.resetAt) {
    basicAuthFailures.set(ip, { count: 0, resetAt: now + BASIC_AUTH_RATE_WINDOW });
    return true;
  }
  
  if (record.count >= BASIC_AUTH_RATE_LIMIT) {
    return false;
  }
  
  return true;
}

function recordBasicAuthFailure(ip: string): void {
  const now = Date.now();
  const record = basicAuthFailures.get(ip);
  
  if (!record || now > record.resetAt) {
    basicAuthFailures.set(ip, { count: 1, resetAt: now + BASIC_AUTH_RATE_WINDOW });
  } else {
    record.count++;
  }
  
  // Log the failure
  console.warn(`[Security] Basic auth failure from IP: ${ip} at ${new Date().toISOString()}`);
}

function verifyBasicAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }
  
  const base64Credentials = authHeader.slice(6);
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');
  
  const expectedUser = process.env.ADMIN_BASIC_USER;
  const expectedPassword = process.env.ADMIN_BASIC_PASSWORD;
  
  if (!expectedUser || !expectedPassword) {
    console.error('[Security] ADMIN_BASIC_USER or ADMIN_BASIC_PASSWORD not set');
    return false;
  }
  
  // Constant-time comparison
  const userMatch = constantTimeCompare(username, expectedUser);
  const passwordMatch = constantTimeCompare(password, expectedPassword);
  
  return userMatch && passwordMatch;
}

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

function checkIpAllowlist(ip: string): boolean {
  const allowlist = process.env.ADMIN_IP_ALLOWLIST;
  
  // If no allowlist, allow all
  if (!allowlist) {
    return true;
  }
  
  const allowedIps = allowlist.split(',').map(s => s.trim());
  
  // Simple IP matching (exact match or CIDR prefix)
  for (const allowed of allowedIps) {
    if (allowed.includes('/')) {
      // CIDR notation - simple prefix match
      const [prefix] = allowed.split('/');
      if (ip.startsWith(prefix.split('.').slice(0, -1).join('.') + '.')) {
        return true;
      }
    } else {
      // Exact match
      if (ip === allowed) {
        return true;
      }
    }
  }
  
  console.warn(`[Security] IP ${ip} not in allowlist`);
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if admin panel is enabled
  const adminPath = getAdminPath();
  
  // Block direct access to internal admin path
  if (isInternalAdminPath(pathname)) {
    // Only allow if coming from our rewrite (has the special header)
    if (!request.headers.get(BASIC_AUTH_HEADER)) {
      return new NextResponse(null, { status: 404 });
    }
  }
  
  // Handle admin requests
  if (isAdminRequest(pathname)) {
    if (!adminPath) {
      // Admin panel disabled
      return new NextResponse(null, { status: 404 });
    }
    
    const ip = getClientIp(request);
    
    // Check IP allowlist
    if (!checkIpAllowlist(ip)) {
      return new NextResponse(null, { status: 404 });
    }
    
    // Check rate limit for basic auth
    if (!checkBasicAuthRateLimit(ip)) {
      return new NextResponse('Too many authentication attempts', {
        status: 429,
        headers: {
          'Retry-After': '900', // 15 minutes
        },
      });
    }
    
    // Verify HTTP Basic Auth
    if (!verifyBasicAuth(request)) {
      recordBasicAuthFailure(ip);
      return new NextResponse('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Restricted"',
        },
      });
    }
    
    // Rewrite to internal path
    const rewrittenPath = rewriteAdminPath(pathname);
    const url = request.nextUrl.clone();
    url.pathname = rewrittenPath;
    
    // Add header to mark as verified and from rewrite
    const headers = new Headers(request.headers);
    headers.set(BASIC_AUTH_HEADER, 'true');
    
    const response = NextResponse.rewrite(url, { request: { headers } });
    
    // Add security headers for admin
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'no-referrer');
    
    return response;
  }
  
  // Handle admin API routes
  if (pathname.startsWith('/api/admin/')) {
    if (!adminPath) {
      return new NextResponse(null, { status: 404 });
    }
    
    const ip = getClientIp(request);
    
    // Check IP allowlist
    if (!checkIpAllowlist(ip)) {
      return new NextResponse(null, { status: 404 });
    }
    
    // Check rate limit
    if (!checkBasicAuthRateLimit(ip)) {
      return new NextResponse('Too many authentication attempts', {
        status: 429,
      });
    }
    
    // Verify HTTP Basic Auth
    if (!verifyBasicAuth(request)) {
      recordBasicAuthFailure(ip);
      return new NextResponse('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Restricted"',
        },
      });
    }
  }
  
  // Add HSTS header to all responses
  const response = NextResponse.next();
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (sw.js, manifest.json, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons|offline|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp)).*)',
  ],
};
