import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PAYMENT_CONFIG } from "@/lib/paymentConfig";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { deviceId, fingerprint } = body;

    if (!deviceId) {
      return NextResponse.json({ error: "deviceId required" }, { status: 400 });
    }

    // Try to find existing device by deviceId or fingerprint
    let device = await prisma.deviceIdentity.findUnique({
      where: { deviceId },
    });

    if (!device && fingerprint) {
      // Fallback: try to find by fingerprint
      device = await prisma.deviceIdentity.findFirst({
        where: { fingerprintHash: fingerprint },
      });

      // Update deviceId if found by fingerprint
      if (device) {
        device = await prisma.deviceIdentity.update({
          where: { id: device.id },
          data: {
            deviceId,
            lastSeenAt: new Date(),
          },
        });
      }
    }

    // Create new device if not found
    if (!device) {
      device = await prisma.deviceIdentity.create({
        data: {
          deviceId,
          fingerprintHash: fingerprint || null,
          campaignStartedAt: new Date(), // Start campaign on first sign-up view
        },
      });
    } else {
      // Update last seen
      await prisma.deviceIdentity.update({
        where: { id: device.id },
        data: { lastSeenAt: new Date() },
      });
    }

    // Check campaign eligibility
    const now = new Date();
    const campaignEligible =
      device.campaignStartedAt &&
      !device.campaignUsed &&
      now.getTime() - new Date(device.campaignStartedAt).getTime() <
        PAYMENT_CONFIG.yearly.campaignDays * 24 * 60 * 60 * 1000;

    // Check premium status
    const hasPremium = device.premiumExpiresAt && new Date(device.premiumExpiresAt) > now;

    return NextResponse.json({
      device: {
        id: device.id,
        deviceId: device.deviceId,
        campaignEligible,
        hasPremium,
        premiumExpiresAt: device.premiumExpiresAt,
      },
    });
  } catch (e) {
    console.error("[device/identity]", e);
    return NextResponse.json({ error: "Device identity check failed" }, { status: 500 });
  }
}
