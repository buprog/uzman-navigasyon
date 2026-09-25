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
    sameSite: "strict",
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

  const parts = token.split(".");
  if (parts.length < 4) return null; // email.sub.timestamp.signature

  const sig = parts.pop()!;
  const payload = parts.join(".");
  const expected = sign(payload);

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  const email = parts[0];
  if (!email) return null;

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
