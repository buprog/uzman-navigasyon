import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

const MODE_COOKIE = "un_mode";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const colorModePreference = body.colorModePreference;

    // Validate mode preference
    if (colorModePreference !== null && !["light", "dark"].includes(colorModePreference)) {
      return NextResponse.json(
        { error: "Geçersiz görünüm tercihi" },
        { status: 400 }
      );
    }

    const user = await getSessionUser();

    if (user) {
      // Logged-in user: update database
      await prisma.user.update({
        where: { id: user.id },
        data: { colorModePreference },
      });
    } else {
      // Guest user: set cookie
      if (colorModePreference) {
        cookies().set(MODE_COOKIE, colorModePreference, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 365, // 1 year
        });
      } else {
        // Remove cookie if set to system
        cookies().set(MODE_COOKIE, "", {
          httpOnly: true,
          path: "/",
          maxAge: 0,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[account/mode]", e);
    return NextResponse.json(
      { error: "Görünüm güncellenemedi" },
      { status: 500 }
    );
  }
}
