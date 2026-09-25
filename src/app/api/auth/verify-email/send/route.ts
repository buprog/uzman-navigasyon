import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateVerificationCode, normalizeEmail, sendVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Geçerli bir e-posta adresi gerekli." }, { status: 400 });
    }

    // Delete old codes for this email
    await prisma.emailVerificationCode.deleteMany({
      where: {
        email,
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // older than 24h
        },
      },
    });

    // Check for recent code (rate limiting)
    const recentCode = await prisma.emailVerificationCode.findFirst({
      where: {
        email,
        createdAt: {
          gt: new Date(Date.now() - 60 * 1000), // last 1 minute
        },
      },
    });

    if (recentCode) {
      return NextResponse.json(
        { error: "Çok sık deneme. Lütfen 1 dakika bekleyin." },
        { status: 429 }
      );
    }

    // Generate code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save code
    await prisma.emailVerificationCode.create({
      data: {
        email,
        code,
        expiresAt,
      },
    });

    // Send email
    const result = await sendVerificationEmail(email, code);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 503 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[verify-email/send]", e);
    return NextResponse.json(
      { error: "Doğrulama kodu gönderilemedi." },
      { status: 500 }
    );
  }
}
