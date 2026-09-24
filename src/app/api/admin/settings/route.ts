import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAccess } from "@/lib/adminAuth";

export async function GET(req: Request) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const settings = await prisma.adSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      // Create default settings if not exists
      const newSettings = await prisma.adSettings.create({
        data: {
          id: "default",
          rotationInterval: 5,
          rotationMode: "sıralı",
        },
      });
      return NextResponse.json({ settings: newSettings });
    }

    return NextResponse.json({ settings });
  } catch (e) {
    console.error("[admin/settings/GET]", e);
    return NextResponse.json({ error: "Ayarlar alınamadı" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (!body.rotationInterval || body.rotationInterval < 1 || body.rotationInterval > 60) {
      return NextResponse.json(
        { error: "Rotasyon aralığı 1-60 saniye arası olmalı" },
        { status: 400 }
      );
    }

    if (!["sıralı", "rastgele"].includes(body.rotationMode)) {
      return NextResponse.json(
        { error: "Geçersiz rotasyon modu" },
        { status: 400 }
      );
    }

    const settings = await prisma.adSettings.upsert({
      where: { id: "default" },
      update: {
        rotationInterval: body.rotationInterval,
        rotationMode: body.rotationMode,
      },
      create: {
        id: "default",
        rotationInterval: body.rotationInterval,
        rotationMode: body.rotationMode,
      },
    });

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await logAdminAccess(
      adminEmail,
      ip,
      "update_ad_settings",
      undefined,
      `Interval: ${settings.rotationInterval}s, Mode: ${settings.rotationMode}`
    );

    return NextResponse.json({ settings });
  } catch (e) {
    console.error("[admin/settings/PUT]", e);
    return NextResponse.json({ error: "Ayarlar kaydedilemedi" }, { status: 500 });
  }
}
