import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/email";

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim();
    const code = String(body.code || "").trim();

    if (!email || !code) {
      return NextResponse.json(
        { error: "E-posta ve kod gerekli." },
        { status: 400 }
      );
    }

    // Find the code
    const verificationCode = await prisma.emailVerificationCode.findFirst({
      where: {
        email,
        code,
        verified: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!verificationCode) {
      return NextResponse.json(
        { error: "Geçersiz veya süresi dolmuş kod." },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date() > verificationCode.expiresAt) {
      return NextResponse.json(
        { error: "Kod süresi doldu. Yeni kod isteyin." },
        { status: 400 }
      );
    }

    // Check attempts
    if (verificationCode.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "Çok fazla yanlış deneme. Yeni kod isteyin." },
        { status: 429 }
      );
    }

    // Increment attempts
    await prisma.emailVerificationCode.update({
      where: { id: verificationCode.id },
      data: { attempts: verificationCode.attempts + 1 },
    });

    // Verify code is correct (already checked in WHERE, but double-check)
    if (verificationCode.code !== code) {
      return NextResponse.json(
        { error: "Kod yanlış. Tekrar deneyin." },
        { status: 400 }
      );
    }

    // Mark as verified
    await prisma.emailVerificationCode.update({
      where: { id: verificationCode.id },
      data: { verified: true },
    });

    // Ensure EmailIdentity exists
    const emailNormalized = normalizeEmail(email);
    let emailIdentity = await prisma.emailIdentity.findUnique({
      where: { emailNormalized },
    });

    if (!emailIdentity) {
      emailIdentity = await prisma.emailIdentity.create({
        data: { emailNormalized },
      });
    }

    // Check campaign eligibility
    const now = new Date();
    const campaignDaysMs = 15 * 24 * 60 * 60 * 1000;
    const campaignEligible =
      !emailIdentity.campaignUsed &&
      now.getTime() - emailIdentity.campaignStartedAt.getTime() < campaignDaysMs;

    const campaignDaysLeft = campaignEligible
      ? Math.ceil(
          (campaignDaysMs -
            (now.getTime() - emailIdentity.campaignStartedAt.getTime())) /
            (24 * 60 * 60 * 1000)
        )
      : 0;

    return NextResponse.json({
      success: true,
      emailIdentity: {
        campaignEligible,
        campaignDaysLeft,
        hasPremium: emailIdentity.premiumExpiresAt
          ? new Date(emailIdentity.premiumExpiresAt) > now
          : false,
      },
    });
  } catch (e) {
    console.error("[verify-email/verify]", e);
    return NextResponse.json(
      { error: "Doğrulama başarısız." },
      { status: 500 }
    );
  }
}
