import { NextResponse } from "next/server";
import { prisma, isDatabaseNotReadyError } from "@/lib/prisma";
import { createSession, verifyPassword, getSessionUser } from "@/lib/auth";

const DEMO_EMAIL = "operator@demo.com";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "E-posta veya şifre hatalı." }, { status: 401 });
    }

    // Transfer tours from demo user if logging in from demo session
    const previousUser = await getSessionUser();
    if (previousUser && previousUser.email === DEMO_EMAIL && user.email !== DEMO_EMAIL) {
      // Transfer all demo user's tours to the logged-in user
      await prisma.tour.updateMany({
        where: { userId: previousUser.id },
        data: { userId: user.id },
      });
    }

    await createSession(user.id);
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      companyName: user.companyName,
      plan: user.plan,
    });
  } catch (e) {
    console.error("[auth/login]", e);
    if (isDatabaseNotReadyError(e)) {
      return NextResponse.json(
        { error: "Veritabanı hazır değil. README’deki kurulumu çalıştırın." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Giriş başarısız." }, { status: 500 });
  }
}
