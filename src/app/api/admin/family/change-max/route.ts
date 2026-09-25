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
    const { ids, maxMembers } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0 || !maxMembers) {
      return NextResponse.json(
        { error: "ids (array) ve maxMembers gerekli" },
        { status: 400 }
      );
    }

    if (maxMembers < 2 || maxMembers > 20) {
      return NextResponse.json(
        { error: "maxMembers 2-20 arası olmalı" },
        { status: 400 }
      );
    }

    // Check each family's active member count
    for (const id of ids) {
      const family = await prisma.familyPlan.findUnique({
        where: { id },
        include: {
          members: {
            where: { removedAt: null },
          },
        },
      });

      if (family && family.members.length > maxMembers) {
        return NextResponse.json(
          {
            error: `Aile ${family.inviteCode} için yeni limit (${maxMembers}) mevcut üye sayısından (${family.members.length}) küçük olamaz`,
          },
          { status: 400 }
        );
      }
    }

    await prisma.familyPlan.updateMany({
      where: { id: { in: ids } },
      data: { maxMembers },
    });

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await logAdminAccess(
      adminEmail,
      ip,
      "change_family_max_members",
      undefined,
      `Changed ${ids.length} families to max ${maxMembers}`
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/family/change-max]", e);
    return NextResponse.json({ error: "Max üye değiştirilemedi" }, { status: 500 });
  }
}
