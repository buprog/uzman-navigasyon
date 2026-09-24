import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAccess } from "@/lib/adminAuth";

function sanitizeText(text: string): string {
  return text.trim().replace(/<script.*?<\/script>/gi, "");
}

function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const { id } = params;
    const body = await req.json();

    // Validate URLs
    if (body.imageUrl && !validateUrl(body.imageUrl)) {
      return NextResponse.json(
        { error: "Geçersiz görsel URL'si (http/https gerekli)" },
        { status: 400 }
      );
    }

    if (body.clickUrl && !validateUrl(body.clickUrl)) {
      return NextResponse.json(
        { error: "Geçersiz tıklama URL'si (http/https gerekli)" },
        { status: 400 }
      );
    }

    const ad = await prisma.ad.update({
      where: { id },
      data: {
        title: body.title ? sanitizeText(body.title) : undefined,
        text: body.text ? sanitizeText(body.text) : undefined,
        imageUrl: body.imageUrl,
        detailContent: body.detailContent !== undefined ? sanitizeText(body.detailContent) : undefined,
        clickUrl: body.clickUrl !== undefined ? (body.clickUrl || null) : undefined,
        targetGender: body.targetGender,
        active: body.active,
        startDate: body.startDate !== undefined ? (body.startDate ? new Date(body.startDate) : null) : undefined,
        endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : undefined,
        sortOrder: body.sortOrder !== undefined ? body.sortOrder : undefined,
      },
    });

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await logAdminAccess(adminEmail, ip, "update_ad", ad.id, `Updated: ${ad.title}`);

    return NextResponse.json({ ad });
  } catch (e) {
    console.error("[admin/ads/PUT]", e);
    return NextResponse.json({ error: "Güncelleme başarısız" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const { id } = params;

    const ad = await prisma.ad.findUnique({ where: { id } });
    if (!ad) {
      return NextResponse.json({ error: "Reklam bulunamadı" }, { status: 404 });
    }

    await prisma.ad.delete({ where: { id } });

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await logAdminAccess(adminEmail, ip, "delete_ad", id, `Deleted: ${ad.title}`);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/ads/DELETE]", e);
    return NextResponse.json({ error: "Silme başarısız" }, { status: 500 });
  }
}
