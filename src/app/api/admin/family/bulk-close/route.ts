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
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids (array) gerekli" },
        { status: 400 }
      );
    }

    await prisma.familyPlan.updateMany({
      where: { id: { in: ids } },
      data: { status: "CLOSED" },
    });

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await logAdminAccess(
      adminEmail,
      ip,
      "close_families",
      undefined,
      `Closed ${ids.length} families`
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/family/bulk-close]", e);
    return NextResponse.json({ error: "Aileler kapatılamadı" }, { status: 500 });
  }
}
