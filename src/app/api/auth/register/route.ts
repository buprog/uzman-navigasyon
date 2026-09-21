import { NextResponse } from "next/server";
import { prisma, isDatabaseNotReadyError } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();
    const companyName = body.companyName ? String(body.companyName).trim() : null;

    if (!email || !password || !name || password.length < 6) {
      return NextResponse.json(
        { error: "Ad, e-posta ve en az 6 karakter şifre gerekli." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Bu e-posta zaten kayıtlı." }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        email,
        name,
        companyName,
        plan: "basic",
        authProvider: "credentials",
        passwordHash: await hashPassword(password),
      },
    });

    await createSession(user.id);
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      companyName: user.companyName,
      plan: user.plan,
    });
  } catch (e) {
    console.error("[auth/register]", e);
    if (isDatabaseNotReadyError(e)) {
      return NextResponse.json(
        { error: "Veritabanı hazır değil. README’deki kurulumu çalıştırın." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Kayıt başarısız." }, { status: 500 });
  }
}
