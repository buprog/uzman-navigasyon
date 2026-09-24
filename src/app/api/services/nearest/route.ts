import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findNearest } from "@/lib/locationQueries";

/**
 * GET /api/services/nearest?lat=X&lng=Y&brand=Toyota&limit=5
 * Kullanıcının konumuna göre en yakın yetkili servisi bul (marka filtreli)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const brand = searchParams.get("brand");
  const limitStr = searchParams.get("limit");

  const lat = latStr ? parseFloat(latStr) : null;
  const lng = lngStr ? parseFloat(lngStr) : null;
  const limit = limitStr ? parseInt(limitStr, 10) : 5;

  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "Geçersiz konum parametreleri (lat, lng gerekli)" },
      { status: 400 }
    );
  }

  try {
    // Marka filtresi varsa uygula
    const where = brand ? { brand } : {};
    const services = await prisma.authorizedService.findMany({ where });

    if (services.length === 0) {
      return NextResponse.json({
        nearest: [],
        message: brand
          ? `${brand} markası için yetkili servis bulunamadı`
          : "Hiç yetkili servis bulunamadı",
      });
    }

    const nearest = findNearest({ lat, lng }, services, limit);

    return NextResponse.json({
      nearest: nearest.map((s) => ({
        id: s.id,
        brand: s.brand,
        name: s.name,
        address: s.address,
        city: s.city,
        province: s.province,
        phone: s.phone,
        website: s.website,
        lat: s.lat,
        lng: s.lng,
        distanceKm: s.distanceKm,
      })),
    });
  } catch (error) {
    console.error("Servis sorgu hatası:", error);
    return NextResponse.json(
      { error: "Servis sorgulanamadı" },
      { status: 500 }
    );
  }
}
