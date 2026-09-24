import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findNearest } from "@/lib/locationQueries";

/**
 * GET /api/pois/nearest?lat=X&lng=Y&category=restaurant&emergencyOnly=false&limit=10
 * Kullanıcının konumuna göre en yakın POI'leri bul
 * 
 * category: restaurant | hotel | entertainment | health (opsiyonel, boşsa hepsi)
 * emergencyOnly: true ise sadece isEmergency=true olan sağlık POI'leri döner
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const category = searchParams.get("category");
  const emergencyOnly = searchParams.get("emergencyOnly") === "true";
  const limitStr = searchParams.get("limit");

  const lat = latStr ? parseFloat(latStr) : null;
  const lng = lngStr ? parseFloat(lngStr) : null;
  const limit = limitStr ? parseInt(limitStr, 10) : 10;

  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "Geçersiz konum parametreleri (lat, lng gerekli)" },
      { status: 400 }
    );
  }

  try {
    const where: { category?: string; isEmergency?: boolean } = {};
    
    if (category) {
      where.category = category;
    }
    
    if (emergencyOnly) {
      where.isEmergency = true;
    }

    const pois = await prisma.pOI.findMany({ where });

    if (pois.length === 0) {
      return NextResponse.json({
        nearest: [],
        message: category
          ? `${category} kategorisinde POI bulunamadı`
          : "Hiç POI bulunamadı",
      });
    }

    const nearest = findNearest({ lat, lng }, pois, limit);

    return NextResponse.json({
      nearest: nearest.map((p) => ({
        id: p.id,
        category: p.category,
        name: p.name,
        address: p.address,
        city: p.city,
        province: p.province,
        phone: p.phone,
        lat: p.lat,
        lng: p.lng,
        distanceKm: p.distanceKm,
        isEmergency: p.isEmergency,
      })),
    });
  } catch (error) {
    console.error("POI sorgu hatası:", error);
    return NextResponse.json(
      { error: "POI sorgulanamadı" },
      { status: 500 }
    );
  }
}
