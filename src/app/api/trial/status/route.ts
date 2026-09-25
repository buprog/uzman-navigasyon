import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const DEVICE_ID_COOKIE = "un_did";

/**
 * Get trial status from server-side device identity
 */
export async function GET() {
  try {
    const deviceId = cookies().get(DEVICE_ID_COOKIE)?.value;

    if (!deviceId) {
      return NextResponse.json({ trialActive: true, trialCompletedAt: null });
    }

    const device = await prisma.deviceIdentity.findUnique({
      where: { deviceId },
      select: { trialCompletedAt: true },
    });

    if (!device) {
      return NextResponse.json({ trialActive: true, trialCompletedAt: null });
    }

    return NextResponse.json({
      trialActive: !device.trialCompletedAt,
      trialCompletedAt: device.trialCompletedAt,
    });
  } catch (e) {
    console.error("[trial/status]", e);
    return NextResponse.json({ trialActive: true, trialCompletedAt: null }, { status: 500 });
  }
}
