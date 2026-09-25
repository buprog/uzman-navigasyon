import { NextResponse } from "next/server";
import { prisma, isDatabaseNotReadyError } from "@/lib/prisma";
import { createSession, verifyPassword, getSessionUser } from "@/lib/auth";
import { isTourOwned, removeTourOwnership } from "@/lib/tourOwnership";

const DEMO_EMAIL = "operator@demo.com";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const currentTourId = body.currentTourId ? String(body.currentTourId) : null;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "E-posta veya şifre hatalı." }, { status: 401 });
    }

    // Transfer current tour from demo user if logging in from demo session
    const previousUser = await getSessionUser();
    if (previousUser && previousUser.email === DEMO_EMAIL && user.email !== DEMO_EMAIL && currentTourId) {
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
