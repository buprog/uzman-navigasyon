import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { limitsFor, getEffectivePlan } from "@/lib/plan";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  
  // Check and enforce premium expiration
  const effectivePlan = getEffectivePlan(user.plan, user.premiumExpiresAt);
  if (effectivePlan === "basic" && user.plan === "premium") {
    // Premium expired - downgrade to basic
    await prisma.user.update({
      where: { id: user.id },
      data: { plan: "basic" },
    });
    user.plan = "basic";
  }
  
  return NextResponse.json({ user, limits: limitsFor(user.plan) });
}
