import { NextRequest, NextResponse } from "next/server";
import {
  NOMINATIM_UA,
  placeFromNominatim,
  shortLabelFromAddress,
} from "@/lib/nominatim";

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "Geçersiz koordinat." }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "Geçersiz koordinat." }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "tr");
  url.searchParams.set("zoom", "14");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": NOMINATIM_UA,
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Konum alınamadı." },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      place_id?: number;
      display_name?: string;
      lat?: string;
      lon?: string;
      name?: string;
      type?: string;
      class?: string;
      address?: Record<string, string>;
      error?: string;
    };

    if (data.error || !data.display_name) {
      return NextResponse.json({ error: "Konum alınamadı." }, { status: 404 });
    }

    // Prefer Turkey; still return result if outside (user may travel)
    const place = placeFromNominatim({
      place_id: data.place_id,
      display_name: data.display_name,
      lat: data.lat ?? lat,
      lon: data.lon ?? lon,
      name: data.name,
      type: data.type,
      class: data.class,
      address: data.address,
    });

    // Prefer il/ilçe style short name for start pin
    if (data.address) {
      place.name = shortLabelFromAddress(data.address, place.name);
    }

    return NextResponse.json({ place });
  } catch {
    return NextResponse.json({ error: "Konum alınamadı." }, { status: 502 });
  }
}
