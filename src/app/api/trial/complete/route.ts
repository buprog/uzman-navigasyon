import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

const DEVICE_ID_COOKIE = "un_did";

/**
 * Mark trial as completed server-side
 * This persists across page reloads
 */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    const deviceId = cookies().get(DEVICE_ID_COOKIE)?.value;

    if (!deviceId) {
      return NextResponse.json({ error: "Device ID required" }, { status: 400 });
    }

    // Find or create device identity
    let device = await prisma.deviceIdentity.findUnique({
      where: { deviceId },
    });

    if (!device) {
      device = await prisma.deviceIdentity.create({
        data: {
          deviceId,
          linkedUserIds: user ? [user.id] : [],
        },
      });
    }

    // Mark trial as completed by setting a completion timestamp
    await prisma.deviceIdentity.update({
      where: { id: device.id },
      data: {
        trialCompletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[trial/complete]", e);
    return NextResponse.json({ error: "Failed to complete trial" }, { status: 500 });
  }
}
