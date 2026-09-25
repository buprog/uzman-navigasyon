import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDevicePremium } from "@/lib/effectivePlan";

export const dynamic = "force-dynamic";

/**
 * GET /api/discount/status?deviceId=...
 * Public API to check device premium status with family membership support
 */
export async function GET(req: Request) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get("deviceId");

    if (!deviceId) {
      return NextResponse.json(
        { error: "deviceId gerekli" },
        { status: 400, headers }
      );
    }

    const now = new Date();

    // Check device individual premium
    const devicePremium = await getDevicePremium(deviceId);

    // Check family membership
    const membership = await prisma.familyMember.findFirst({
      where: {
        deviceId,
        removedAt: null,
      },
      include: {
        family: {
          include: {
            members: {
              where: {
                removedAt: null,
              },
              orderBy: {
                joinedAt: "asc",
              },
            },
          },
        },
      },
    });

    let premiumUntil: string | null = null;
    let source: "individual" | "family" | null = null;
    let family: any = null;

    // Individual premium takes priority
    if (devicePremium.hasPremium) {
      premiumUntil = devicePremium.premiumExpiresAt!.toISOString();
      source = "individual";
    } else if (
      membership &&
      membership.family.status === "ACTIVE" &&
      membership.family.premiumUntil > now
    ) {
      // Family premium
      premiumUntil = membership.family.premiumUntil.toISOString();
      source = "family";

      family = {
        role: membership.role,
        maxMembers: membership.family.maxMembers,
        premiumUntil: membership.family.premiumUntil.toISOString(),
      };

      // Include invite code and member list only for owner
      if (membership.role === "OWNER") {
        family.inviteCode = membership.family.inviteCode;
        family.members = membership.family.members.map((m) => ({
          deviceIdShort: m.deviceId.substring(0, 8),
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
        }));
      }
    }

    return NextResponse.json(
      {
        premiumUntil,
        source,
        family,
      },
      { headers }
    );
  } catch (error) {
    console.error("Failed to check discount status:", error);
    return NextResponse.json(
      { error: "Bir hata oluştu" },
      { status: 500, headers }
    );
  }
}

/**
 * OPTIONS /api/discount/status
 * CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
