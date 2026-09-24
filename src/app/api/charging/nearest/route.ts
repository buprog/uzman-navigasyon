import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findNearest } from "@/lib/locationQueries";

/**
 * GET /api/charging/nearest?lat=X&lng=Y&limit=5
 * Kullanıcının konumuna göre en yakın şarj istasyonlarını bul
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
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
    const stations = await prisma.chargingStation.findMany();

    if (stations.length === 0) {
      return NextResponse.json({
        nearest: [],
        message: "Hiç şarj istasyonu bulunamadı",
      });
    }

    const nearest = findNearest({ lat, lng }, stations, limit);

    return NextResponse.json({
      nearest: nearest.map((s) => ({
        id: s.id,
        name: s.name,
        network: s.network,
        address: s.address,
        city: s.city,
        province: s.province,
        phone: s.phone,
        connectors: s.connectors,
        lat: s.lat,
        lng: s.lng,
        distanceKm: s.distanceKm,
      })),
    });
  } catch (error) {
    console.error("Şarj istasyonu sorgu hatası:", error);
    return NextResponse.json(
      { error: "Şarj istasyonları sorgulanamadı" },
      { status: 500 }
    );
  }
}
