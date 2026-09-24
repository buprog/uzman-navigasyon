import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  // Clear the session cookie
  cookies().set("un_session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  // Redirect to home
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"));
}
