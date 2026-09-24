import { NextRequest, NextResponse } from "next/server";
import { createDemoSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await createDemoSession();
  } catch (error) {
    console.error("[auth/init] Failed to create demo session:", error);
    // Redirect with error flag
    return NextResponse.redirect(new URL("/?init=error", request.url));
  }
  
  // Only allow relative paths starting with a single /
  let returnTo = request.nextUrl.searchParams.get("returnTo") || "/";
  if (!returnTo.startsWith("/") || returnTo.startsWith("//") || returnTo.startsWith("/\\")) {
    returnTo = "/";
  }
  
  return NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}init=1`, request.url));
}
