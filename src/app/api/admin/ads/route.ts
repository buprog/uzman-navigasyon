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

export async function GET(req: Request) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const ads = await prisma.ad.findMany({
      orderBy: { sortOrder: "asc" },
    });

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await logAdminAccess(adminEmail, ip, "view_ads");

    return NextResponse.json({ ads });
  } catch (e) {
    console.error("[admin/ads/GET]", e);
    return NextResponse.json({ error: "Listeleme başarısız" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Validate required fields
    if (!body.title || !body.text || !body.imageUrl) {
      return NextResponse.json(
        { error: "Başlık, açıklama ve görsel zorunlu" },
        { status: 400 }
      );
    }

    // Validate URLs
    if (!validateUrl(body.imageUrl)) {
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

    // Sanitize text fields
    const ad = await prisma.ad.create({
      data: {
        title: sanitizeText(body.title),
        text: sanitizeText(body.text),
        imageUrl: body.imageUrl,
        detailContent: sanitizeText(body.detailContent || ""),
        clickUrl: body.clickUrl || null,
        targetGender: body.targetGender || "ALL",
        active: body.active !== false,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        sortOrder: body.sortOrder || 0,
      },
    });

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await logAdminAccess(adminEmail, ip, "create_ad", ad.id, `Created: ${ad.title}`);

    return NextResponse.json({ ad });
  } catch (e) {
    console.error("[admin/ads/POST]", e);
    return NextResponse.json({ error: "Ekleme başarısız" }, { status: 500 });
  }
}
