import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const COOKIE = "un_session";
const SECRET = process.env.AUTH_SECRET || "uzman-navigasyon-dev-secret-change-me";

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const payload = `${userId}.${Date.now()}`;
  const token = `${payload}.${sign(payload)}`;
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  cookies().set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getSessionUser() {
  const token = cookies().get(COOKIE)?.value;
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
  const userId = payload.split(".")[0];
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, companyName: true, plan: true },
  });
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
