import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Demo stub — no payment. Sets plan to basic|premium. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });

  const body = await req.json();
  const plan = body.plan === "premium" ? "premium" : "basic";
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { plan },
    select: { id: true, email: true, name: true, companyName: true, plan: true },
  });
  return NextResponse.json({ user: updated, message: plan === "premium" ? "Premium aktif (demo)." : "Basic plana geçildi." });
}
