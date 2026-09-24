import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBrightness } from "@/lib/brightness";

/**
 * Update user's brightness preference
 * POST /api/account/brightness
 * Body: { brightness: number }
 */
export async function POST(request: NextRequest) {
  try {
    const { brightness } = await request.json();
    
    if (typeof brightness !== "number") {
      return NextResponse.json(
        { error: "Invalid brightness value" },
        { status: 400 }
      );
    }
    
    const validated = validateBrightness(brightness);
    const user = await getSessionUser();
    
    if (user) {
      // Update database for logged-in user
      await prisma.user.update({
        where: { id: user.id },
        data: { brightness: validated },
      });
    }
    
    // Always return success (guests use localStorage only)
    return NextResponse.json({ success: true, brightness: validated });
  } catch (error) {
    console.error("Brightness preference update error:", error);
    return NextResponse.json(
      { error: "Failed to update preference" },
      { status: 500 }
    );
  }
}
