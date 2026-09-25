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
    const { ids, days } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0 || !days) {
      return NextResponse.json(
        { error: "ids (array) ve days gerekli" },
        { status: 400 }
      );
    }

    // Extend premium period for all selected families
    await Promise.all(
      ids.map(async (id) => {
        const family = await prisma.familyPlan.findUnique({
          where: { id },
        });

        if (family) {
          const now = new Date();
          const currentPremium = family.premiumUntil;
          const extendFrom = currentPremium > now ? currentPremium : now;
          const newPremiumUntil = new Date(
            extendFrom.getTime() + days * 24 * 60 * 60 * 1000
          );

          await prisma.familyPlan.update({
            where: { id },
            data: { premiumUntil: newPremiumUntil },
          });
        }
      })
    );

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await logAdminAccess(
      adminEmail,
      ip,
      "extend_families",
      undefined,
      `Extended ${ids.length} families by ${days} days`
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/family/extend]", e);
    return NextResponse.json({ error: "Süre uzatılamadı" }, { status: 500 });
  }
}
