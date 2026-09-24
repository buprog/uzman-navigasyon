/**
 * Admin path utilities
 * The admin panel is served under a secret path from ADMIN_PATH env var
 */

const ADMIN_PATH_REGEX = /^[a-z0-9-]{8,64}$/;

/**
 * Get and validate the admin path from environment
 * Returns null if unset or invalid (panel disabled)
 */
export function getAdminPath(): string | null {
  const path = process.env.ADMIN_PATH;
  
  if (!path) {
    return null;
  }
  
  if (!ADMIN_PATH_REGEX.test(path)) {
    console.error('ADMIN_PATH is invalid. Must match ^[a-z0-9-]{8,64}$');
    return null;
  }
  
  return path;
}

/**
 * Check if admin panel is enabled
 */
export function isAdminEnabled(): boolean {
  return getAdminPath() !== null;
}

/**
 * Get admin login URL (or null if disabled)
 */
export function getAdminLoginUrl(): string | null {
  const path = getAdminPath();
  return path ? `/${path}/signin` : null;
}

/**
 * Get admin dashboard URL (or null if disabled)
 */
export function getAdminDashboardUrl(): string | null {
  const path = getAdminPath();
  return path ? `/${path}` : null;
}

/**
 * Check if a request pathname is for the admin panel
 */
export function isAdminRequest(pathname: string): boolean {
  const path = getAdminPath();
  if (!path) return false;
  
  return pathname === `/${path}` || pathname.startsWith(`/${path}/`);
}

/**
 * Check if a request pathname is for the internal admin route
 */
export function isInternalAdminPath(pathname: string): boolean {
  return pathname === '/__console' || pathname.startsWith('/__console/');
}

/**
 * Rewrite admin path to internal path
 */
export function rewriteAdminPath(pathname: string): string {
  const path = getAdminPath();
  if (!path) return pathname;
  
  if (pathname === `/${path}`) {
    return '/__console';
  }
  
  if (pathname.startsWith(`/${path}/`)) {
    return pathname.replace(`/${path}`, '/__console');
  }
  
  return pathname;
}
