import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

const THEME_COOKIE = "un_theme";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const themePreference = body.themePreference;

    // Validate theme preference
    if (themePreference !== null && !["neutral", "female", "male"].includes(themePreference)) {
      return NextResponse.json(
        { error: "Geçersiz tema tercihi" },
        { status: 400 }
      );
    }

    const user = await getSessionUser();

    if (user) {
      // Logged-in user: update database
      await prisma.user.update({
        where: { id: user.id },
        data: { themePreference },
      });
    } else {
      // Guest user: set cookie
      if (themePreference) {
        cookies().set(THEME_COOKIE, themePreference, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 365, // 1 year
        });
      } else {
        // Remove cookie if set to automatic
        cookies().set(THEME_COOKIE, "", {
          httpOnly: true,
          path: "/",
          maxAge: 0,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[account/theme]", e);
    return NextResponse.json(
      { error: "Tema güncellenemedi" },
      { status: 500 }
    );
  }
}
