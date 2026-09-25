import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { limitsFor } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { getEffectivePlan } from "@/lib/effectivePlan";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  
  // Get effective plan considering device premium
  const effectivePlanResult = await getEffectivePlan(
    user.plan,
    user.premiumExpiresAt
  );
  
  // If user premium expired (but not device premium), downgrade user record
  if (
    effectivePlanResult.plan === "basic" &&
    !effectivePlanResult.isDevicePremium &&
    user.plan === "premium"
  ) {
    await prisma.user.update({
      where: { id: user.id },
      data: { plan: "basic" },
    });
    user.plan = "basic";
  }
  
  // Return effective plan to client (device premium or user premium)
  return NextResponse.json({
    user: {
      ...user,
      plan: effectivePlanResult.plan,
      premiumExpiresAt: effectivePlanResult.premiumExpiresAt,
    },
    limits: limitsFor(effectivePlanResult.plan),
  });
}
