import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAccess } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { familyId, memberId } = body;

    if (!familyId || !memberId) {
      return NextResponse.json(
        { error: "familyId ve memberId gerekli" },
        { status: 400 }
      );
    }

    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      include: { family: true },
    });

    if (!member || member.familyId !== familyId) {
      return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });
    }

    if (member.role === "OWNER") {
      return NextResponse.json({ error: "Yönetici çıkarılamaz" }, { status: 400 });
    }

    await prisma.familyMember.update({
      where: { id: memberId },
      data: { removedAt: new Date() },
    });

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await logAdminAccess(
      adminEmail,
      ip,
      "remove_family_member",
      familyId,
      `Removed member ${member.deviceId.substring(0, 8)}`
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/family/remove-member]", e);
    return NextResponse.json({ error: "Üye çıkarılamadı" }, { status: 500 });
  }
}
