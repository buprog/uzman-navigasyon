import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { limitsFor } from "@/lib/plan";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  
  // Check and enforce premium expiration
  if (user.plan === "premium" && user.premiumExpiresAt) {
    if (new Date() > new Date(user.premiumExpiresAt)) {
      // Premium expired - downgrade to basic
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: "basic" },
      });
      user.plan = "basic";
    }
  }
  
  return NextResponse.json({ user, limits: limitsFor(user.plan) });
}
