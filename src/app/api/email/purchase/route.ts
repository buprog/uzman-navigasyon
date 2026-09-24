import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { normalizeEmail } from "@/lib/email";

const DEMO_EMAIL = "operator@demo.com";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Block demo user
    if (user.email === DEMO_EMAIL) {
      return NextResponse.json({ error: "Demo user cannot purchase" }, { status: 403 });
    }

    // Check test mode (only allow if explicitly enabled)
    if (process.env.PAYMENT_TEST_MODE !== "true") {
      return NextResponse.json({ error: "Payment system unavailable" }, { status: 403 });
    }

    const body = await req.json();
    const { usedCampaign } = body;
    const emailNormalized = normalizeEmail(user.email);

    // Find or create EmailIdentity
    let emailIdentity = await prisma.emailIdentity.findUnique({
      where: { emailNormalized },
    });

    if (!emailIdentity) {
      emailIdentity = await prisma.emailIdentity.create({
        data: {
          emailNormalized,
          linkedUserIds: [user.id],
        },
      });
    }

    // Calculate premium expiry (1 year from now)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Update EmailIdentity
    await prisma.emailIdentity.update({
      where: { id: emailIdentity.id },
      data: {
        premiumExpiresAt: expiresAt,
        campaignUsed: usedCampaign || emailIdentity.campaignUsed,
        linkedUserIds: emailIdentity.linkedUserIds.includes(user.id)
          ? emailIdentity.linkedUserIds
          : [...emailIdentity.linkedUserIds, user.id],
      },
    });

    // Upgrade user to premium
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        plan: "premium",
        premiumExpiresAt: expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      premiumExpiresAt: expiresAt,
    });
  } catch (e) {
    console.error("[email/purchase]", e);
    return NextResponse.json({ error: "Purchase failed" }, { status: 500 });
  }
}
