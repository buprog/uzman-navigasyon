import { NextRequest, NextResponse } from "next/server";
import { NOMINATIM_UA, placeFromNominatim } from "@/lib/nominatim";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "tr");
  url.searchParams.set("limit", "8");
  url.searchParams.set("accept-language", "tr");

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
        { error: "Konum araması şu an kullanılamıyor.", results: [] },
        { status: 502 }
      );
    }

    const data = (await res.json()) as Array<{
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
      name?: string;
      type?: string;
      class?: string;
      address?: Record<string, string>;
    }>;

    return NextResponse.json({ results: data.map(placeFromNominatim) });
  } catch {
    return NextResponse.json(
      { error: "Konum araması başarısız.", results: [] },
      { status: 502 }
    );
  }
}
