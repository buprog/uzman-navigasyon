import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdminRequest, isInternalAdminPath, rewriteAdminPath, getAdminPath } from '@/lib/adminPath';

const ADMIN_REWRITE_HEADER = 'x-admin-rewrite';

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() 
    || request.headers.get('x-real-ip') 
    || request.ip 
    || 'unknown';
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
    if (!request.headers.get(ADMIN_REWRITE_HEADER)) {
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
    
    // Rewrite to internal path
    const rewrittenPath = rewriteAdminPath(pathname);
    const url = request.nextUrl.clone();
    url.pathname = rewrittenPath;
    
    // Add header to mark as from rewrite
    const headers = new Headers(request.headers);
    headers.set(ADMIN_REWRITE_HEADER, 'true');
    
    const response = NextResponse.rewrite(url, { request: { headers } });
    
    // Add security headers for admin
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'no-referrer');
    
    return response;
  }
  
  // Admin API routes: IP allowlist only (session checked in route handlers)
  if (pathname.startsWith('/api/admin/')) {
    if (!adminPath) {
      return new NextResponse(null, { status: 404 });
    }
    
    const ip = getClientIp(request);
    
    // Check IP allowlist
    if (!checkIpAllowlist(ip)) {
      return new NextResponse(null, { status: 404 });
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
