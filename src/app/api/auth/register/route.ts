import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma, isDatabaseNotReadyError } from "@/lib/prisma";
import { createSession, hashPassword, getSessionUser } from "@/lib/auth";
import { normalizeEmail } from "@/lib/email";
import { isTourOwned, removeTourOwnership } from "@/lib/tourOwnership";

const DEMO_EMAIL = "operator@demo.com";
const DEVICE_ID_COOKIE = "un_did";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const emailRaw = String(body.email || "").trim();
    const email = normalizeEmail(emailRaw);
    const password = String(body.password || "");
    const name = String(body.name || "").trim();
    const companyName = body.companyName ? String(body.companyName).trim() : null;
    const gender = String(body.gender || "UNSPECIFIED");
    const consentGiven = body.consentGiven === true;
    const verified = body.verified === true; // Email verification status
    const currentTourId = body.currentTourId ? String(body.currentTourId) : null;

    if (!email || !password || !name || password.length < 6) {
      return NextResponse.json(
        { error: "Ad, e-posta ve en az 6 karakter şifre gerekli." },
        { status: 400 }
      );
    }

    // For basic users, verification is optional
    // For premium upgrade, verification will be required before payment

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Bu e-posta zaten kayıtlı." }, { status: 409 });
    }

    // Check EmailIdentity for existing premium status
    const emailIdentity = await prisma.emailIdentity.findUnique({
      where: { emailNormalized: email },
    });

    // Determine initial plan
    let initialPlan = "basic";
    if (emailIdentity?.premiumExpiresAt && new Date(emailIdentity.premiumExpiresAt) > new Date()) {
      initialPlan = "premium";
    }

    const user = await prisma.user.create({
      data: {
        email,
        name,
        companyName,
        gender,
        plan: initialPlan,
        authProvider: "credentials",
        passwordHash: await hashPassword(password),
        consentGiven,
        consentTimestamp: consentGiven ? new Date() : null,
        consentTextVersion: consentGiven ? "v1.4" : null,
      },
    });

    // Link user to EmailIdentity
    if (emailIdentity) {
      await prisma.emailIdentity.update({
        where: { id: emailIdentity.id },
        data: {
          linkedUserIds: {
            push: user.id,
          },
        },
      });
    }

    // Transfer current tour from demo user if registering from demo session
    const previousUser = await getSessionUser();
    if (previousUser && previousUser.email === DEMO_EMAIL && currentTourId) {
      // Verify ownership via signed cookie
      if (isTourOwned(currentTourId)) {
        // Only transfer the specific tour if it exists, belongs to demo user, and is NOT a sample
        const tour = await prisma.tour.findFirst({
          where: {
            id: currentTourId,
            userId: previousUser.id,
            isSample: false,
          },
        });
        
        if (tour) {
          await prisma.tour.update({
            where: { id: tour.id },
            data: { userId: user.id },
          });
          // Remove from ownership cookie after transfer
          removeTourOwnership(currentTourId);
        }
      }
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
    console.error("[auth/register]", e);
    if (isDatabaseNotReadyError(e)) {
      return NextResponse.json(
        { error: "Veritabanı hazır değil. README'deki kurulumu çalıştırın." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Kayıt başarısız." }, { status: 500 });
  }
}
