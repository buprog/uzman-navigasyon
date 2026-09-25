import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";
import { getAdminPath } from "./adminPath";
import { isGoogleOAuthConfigured } from "./googleOAuth";

const ADMIN_COOKIE = "c_sess";
const SECRET = process.env.ADMIN_SESSION_SECRET || process.env.AUTH_SECRET || "uzman-navigasyon-dev-secret-change-me";

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function isAdminEnabled(): boolean {
  return isGoogleOAuthConfigured();
}

export async function createAdminSession(
  email: string,
  googleSub?: string,
  name?: string
) {
  const payload = `${email}.${googleSub || 'unknown'}.${Date.now()}`;
  const token = `${payload}.${sign(payload)}`;
  
  cookies().set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // Allow OAuth callback cross-site navigation
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

export async function destroyAdminSession() {
  cookies().set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getAdminSession(): Promise<string | null> {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  // Split by last dot to get signature
  const lastDotIndex = token.lastIndexOf('.');
  if (lastDotIndex === -1) return null;
  
  const payload = token.substring(0, lastDotIndex);
  const sig = token.substring(lastDotIndex + 1);
  const expected = sign(payload);

  // Verify signature
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  // Parse payload: email.sub.timestamp
  const parts = payload.split('.');
  if (parts.length < 3) return null;
  
  // Last part is timestamp, second-to-last is sub, rest is email
  const timestamp = parts[parts.length - 1];
  const email = parts.slice(0, parts.length - 2).join('.');
  
  if (!email) return null;

  // Verify token age (8 hours max)
  const tokenTime = parseInt(timestamp, 10);
  if (isNaN(tokenTime)) return null;
  
  const now = Date.now();
  const maxAge = 8 * 60 * 60 * 1000; // 8 hours
  if (now - tokenTime > maxAge) {
    return null; // Token expired
  }

  // Re-check email against allowlist
  const allowedEmails = process.env.ADMIN_ALLOWED_EMAILS;
  if (!allowedEmails) return null;
  
  const allowedList = allowedEmails.split(',').map(e => e.trim().toLowerCase());
  if (!allowedList.includes(email.toLowerCase())) {
    return null; // Email no longer in allowlist
  }

  return email;
}

export async function requireAdmin(): Promise<string | null> {
  const email = await getAdminSession();
  return email;
}

/**
 * Truncate IP for privacy (remove last octet)
 */
export function truncateIp(ip: string | null): string {
  if (!ip) return "unknown";
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
  }
  return "unknown";
}

/**
 * Log admin access
 */
export async function logAdminAccess(
  adminEmail: string,
  ip: string | null,
  action: string,
  targetId?: string,
  details?: string
) {
  await prisma.adminAccessLog.create({
    data: {
      adminEmail,
      ipTruncated: truncateIp(ip),
      action,
      targetId,
      details,
    },
  });
}
