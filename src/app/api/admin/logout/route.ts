import { NextResponse } from "next/server";
import { destroyAdminSession } from "@/lib/adminAuth";

export async function POST(req: Request) {
  await destroyAdminSession();
  return NextResponse.json({ success: true });
}
