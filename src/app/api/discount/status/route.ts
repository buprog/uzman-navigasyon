import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/discount/status?deviceId=...
 * Public API to check device premium status
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

    const device = await prisma.deviceIdentity.findUnique({
      where: { deviceId },
    });

    const premiumUntil =
      device?.premiumExpiresAt && device.premiumExpiresAt > new Date()
        ? device.premiumExpiresAt.toISOString()
        : null;

    return NextResponse.json({ premiumUntil }, { headers });
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
