import { NextRequest, NextResponse } from "next/server";
import { createDemoSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await createDemoSession();
  
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/";
  return NextResponse.redirect(new URL(returnTo, request.url));
}
