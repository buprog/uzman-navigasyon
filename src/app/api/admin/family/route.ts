import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const families = await prisma.familyPlan.findMany({
      include: {
        members: {
          orderBy: {
            joinedAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ families });
  } catch (e) {
    console.error("[admin/family/GET]", e);
    return NextResponse.json({ error: "Aileler alınamadı" }, { status: 500 });
  }
}
