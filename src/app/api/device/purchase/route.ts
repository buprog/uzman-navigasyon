import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { deviceId, usedCampaign } = body;

    if (!deviceId) {
      return NextResponse.json({ error: "deviceId required" }, { status: 400 });
    }

    // Find device
    const device = await prisma.deviceIdentity.findUnique({
      where: { deviceId },
    });

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // Calculate premium expiry (1 year from now)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Update device identity
    await prisma.deviceIdentity.update({
      where: { id: device.id },
      data: {
        premiumExpiresAt: expiresAt,
        campaignUsed: usedCampaign || device.campaignUsed,
        linkedUserIds: {
          push: user.id,
        },
      },
    });

    // Upgrade user to premium
    await prisma.user.update({
      where: { id: user.id },
      data: { plan: "premium" },
    });

    return NextResponse.json({
      success: true,
      premiumExpiresAt: expiresAt,
    });
  } catch (e) {
    console.error("[device/purchase]", e);
    return NextResponse.json({ error: "Purchase failed" }, { status: 500 });
  }
}
