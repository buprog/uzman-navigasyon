import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/", request.url));
  
  // Clear the session cookie (must match the name in src/lib/auth.ts)
  res.cookies.set("un_session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return res;
}
