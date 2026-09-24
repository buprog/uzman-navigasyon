import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    const showForPremium = process.env.SHOW_ADS_FOR_PREMIUM !== "false";
    
    // Don't show ads to premium users if flag is false
    if (!showForPremium && sessionUser?.plan === "premium") {
      return NextResponse.json({ ads: [] });
    }

    // Determine target gender for filtering
    let targetGenders = ["ALL"];
    
    // Only use gender targeting for signed-in users with consent
    if (sessionUser && sessionUser.id !== "demo-operator-id") {
      const user = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: { gender: true, consentGiven: true, consentTextVersion: true },
      });
      
      // User must have given consent (v1.2+ includes ad targeting)
      if (user?.consentGiven && user.consentTextVersion && 
          parseFloat(user.consentTextVersion.replace('v', '')) >= 1.2) {
        if (user.gender === "MALE") {
          targetGenders = ["ALL", "MALE"];
        } else if (user.gender === "FEMALE") {
          targetGenders = ["ALL", "FEMALE"];
        }
      }
    }

    const now = new Date();
    const ads = await prisma.ad.findMany({
      where: {
        active: true,
        targetGender: { in: targetGenders },
        OR: [
          { startDate: null },
          { startDate: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } },
            ],
          },
        ],
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        title: true,
        text: true,
        imageUrl: true,
        targetGender: true,
      },
    });

    return NextResponse.json({ ads });
  } catch (e) {
    console.error("[ads/GET]", e);
    return NextResponse.json({ ads: [] });
  }
}
