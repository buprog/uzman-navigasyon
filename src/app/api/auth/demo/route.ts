import { NextResponse } from "next/server";
import { createDemoSession, getSessionUser } from "@/lib/auth";

export async function POST() {
  try {
    const existing = await getSessionUser();
    if (existing) {
      return NextResponse.json({ user: existing });
    }
    const user = await createDemoSession();
    return NextResponse.json({ user });
  } catch (e) {
    console.error("[auth/demo]", e);
    return NextResponse.json({ error: "Demo session failed." }, { status: 500 });
  }
}
