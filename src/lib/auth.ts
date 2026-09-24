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
    select: { 
      id: true, 
      email: true, 
      name: true, 
      companyName: true, 
      plan: true,
      gender: true,
      themePreference: true,
    },
  });
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function ensureDemoUser() {
  const email = "operator@demo.com";
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const passwordHash = await hashPassword("demo1234");
    user = await prisma.user.create({
      data: {
        email,
        name: "Demo Operatör",
        companyName: "Anadolu Turizm",
        plan: "basic",
        authProvider: "credentials",
        passwordHash,
        vehicleMake: "Toyota",
        vehicleModel: "Corolla",
        fuelType: "hibrit",
        consumptionPer100: 4.5,
        bloodType: "A Rh+",
        emergencyPhone: "+90 555 111 22 33",
        preferTolls: true,
        odometerKm: 78500,
        tireTreadMm: 4.2,
      },
    });
  }
  return user;
}

export async function createDemoSession() {
  const user = await ensureDemoUser();
  await createSession(user.id);
  return user;
}

export function isDemoUser(user: { email: string } | null): boolean {
  return user?.email === "operator@demo.com";
}
