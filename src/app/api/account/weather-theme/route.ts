import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

const WEATHER_THEME_COOKIE = "un_weather_theme";

/**
 * Update user's weather theme preference
 * POST /api/account/weather-theme
 * Body: { enabled: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const { enabled } = await request.json();
    
    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Invalid enabled value" },
        { status: 400 }
      );
    }
    
    const user = await getSessionUser();
    
    if (user) {
      // Update database for logged-in user
      await prisma.user.update({
        where: { id: user.id },
        data: { weatherThemeEnabled: enabled },
      });
    } else {
      // Set cookie for guest user
      cookies().set(WEATHER_THEME_COOKIE, enabled ? "true" : "false", {
        httpOnly: false, // Allow client-side access
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 365 * 24 * 60 * 60, // 1 year
      });
    }
    
    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    console.error("Weather theme preference update error:", error);
    return NextResponse.json(
      { error: "Failed to update preference" },
      { status: 500 }
    );
  }
}
