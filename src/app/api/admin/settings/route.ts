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
          individualYearlyTl: 600,
          familyYearlyTl: null,
          familyMaxMembers: 5,
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

    // Validate pricing fields if provided
    const updateData: any = {
      rotationInterval: body.rotationInterval,
      rotationMode: body.rotationMode,
    };

    if (body.individualYearlyTl !== undefined) {
      if (body.individualYearlyTl < 0) {
        return NextResponse.json(
          { error: "Bireysel fiyat negatif olamaz" },
          { status: 400 }
        );
      }
      updateData.individualYearlyTl = body.individualYearlyTl;
    }

    if (body.familyYearlyTl !== undefined) {
      if (body.familyYearlyTl !== null && body.familyYearlyTl < 0) {
        return NextResponse.json(
          { error: "Aile fiyat negatif olamaz" },
          { status: 400 }
        );
      }
      updateData.familyYearlyTl = body.familyYearlyTl;
    }

    if (body.familyMaxMembers !== undefined) {
      if (body.familyMaxMembers < 2 || body.familyMaxMembers > 20) {
        return NextResponse.json(
          { error: "Aile max üye 2-20 arası olmalı" },
          { status: 400 }
        );
      }
      updateData.familyMaxMembers = body.familyMaxMembers;
    }

    const settings = await prisma.adSettings.upsert({
      where: { id: "default" },
      update: updateData,
      create: {
        id: "default",
        rotationInterval: body.rotationInterval,
        rotationMode: body.rotationMode,
        individualYearlyTl: body.individualYearlyTl ?? 600,
        familyYearlyTl: body.familyYearlyTl ?? null,
        familyMaxMembers: body.familyMaxMembers ?? 5,
      },
    });

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await logAdminAccess(
      adminEmail,
      ip,
      "update_settings",
      undefined,
      `Interval: ${settings.rotationInterval}s, Mode: ${settings.rotationMode}, IndividualTl: ${settings.individualYearlyTl}, FamilyTl: ${settings.familyYearlyTl}, FamilyMax: ${settings.familyMaxMembers}`
    );

    return NextResponse.json({ settings });
  } catch (e) {
    console.error("[admin/settings/PUT]", e);
    return NextResponse.json({ error: "Ayarlar kaydedilemedi" }, { status: 500 });
  }
}
