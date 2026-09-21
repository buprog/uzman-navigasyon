import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { limitsFor } from "@/lib/plan";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user, limits: limitsFor(user.plan) });
}
