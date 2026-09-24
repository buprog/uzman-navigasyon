import { NextRequest, NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/locationQueries";

/**
 * GET /api/geo/location?lat=X&lng=Y
 * Koordinatları il/ilçe bilgisine çevir (reverse geocode)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");

  const lat = latStr ? parseFloat(latStr) : null;
  const lng = lngStr ? parseFloat(lngStr) : null;

  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "Geçersiz konum parametreleri (lat, lng gerekli)" },
      { status: 400 }
    );
  }

  try {
    const location = await reverseGeocode(lat, lng);
    
    if (!location) {
      return NextResponse.json({
        lat,
        lng,
        il: "Bilinmeyen",
        ilce: "Bilinmeyen",
        success: false,
      });
    }

    return NextResponse.json({
      lat,
      lng,
      il: location.il,
      ilce: location.ilce,
      success: true,
    });
  } catch (error) {
    console.error("Reverse geocode hatası:", error);
    return NextResponse.json(
      { error: "Konum bilgisi alınamadı" },
      { status: 500 }
    );
  }
}
