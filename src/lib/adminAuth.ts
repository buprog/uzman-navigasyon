import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";

const ADMIN_COOKIE = "un_admin";
const SECRET = process.env.AUTH_SECRET || "uzman-navigasyon-dev-secret-change-me";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const ADMIN_ENABLED = Boolean(ADMIN_EMAIL && ADMIN_PASSWORD);

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function isAdminEnabled(): boolean {
  return ADMIN_ENABLED;
}

/**
 * Constant-time comparison for admin credentials
 */
export function verifyAdminCredentials(email: string, password: string): boolean {
  if (!ADMIN_ENABLED) return false;

  try {
    const emailMatch = timingSafeEqual(
      Buffer.from(email.trim().toLowerCase()),
      Buffer.from(ADMIN_EMAIL!.trim().toLowerCase())
    );
    const passwordMatch = timingSafeEqual(
      Buffer.from(password),
      Buffer.from(ADMIN_PASSWORD!)
    );
    return emailMatch && passwordMatch;
  } catch {
    return false;
  }
}

export async function createAdminSession(email: string) {
  const payload = `${email}.${Date.now()}`;
  const token = `${payload}.${sign(payload)}`;
  cookies().set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/yonetim",
    maxAge: 60 * 60 * 2, // 2 hours (short-lived)
  });
}

export async function destroyAdminSession() {
  cookies().set(ADMIN_COOKIE, "", { httpOnly: true, path: "/yonetim", maxAge: 0 });
}

export async function getAdminSession(): Promise<string | null> {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length < 3) return null;

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

  const email = payload.split(".")[0];
  if (!email || email !== ADMIN_EMAIL) return null;

  return email;
}

export async function requireAdmin(): Promise<string> {
  const email = await getAdminSession();
  if (!email) throw new Error("ADMIN_UNAUTHORIZED");
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
