/**
 * Day planner utility for multi-day tour suggestions.
 * Generates simple day-by-day stop suggestions:
 * - Day 1: Outbound travel (start → destination)
 * - Days 2..N-1: Explore around destination (local POIs)
 * - Day N: Return travel (destination → start, if round-trip)
 * 
 * Days chain by location: each day starts where the previous day ended.
 */

import { NOMINATIM_UA } from "./nominatim";

type PlaceCoords = {
  lat: number;
  lng: number;
  name: string;
};

export type DaySuggestion = {
  dayIndex: number;
  type: "outbound" | "explore" | "return";
  label: string;
  stops: Array<{
    name: string;
    lat: number;
    lng: number;
    type: "gecis" | "gezi" | "yemek" | "konaklama";
    durationMin: number;
    note: string;
    address: string;
  }>;
};

/**
 * Generates simple day-by-day suggestions for a multi-day tour.
 */
export async function generateDaySuggestions(params: {
  dayCount: number;
  startPlace: PlaceCoords;
  endPlace: PlaceCoords | null;
}): Promise<DaySuggestion[]> {
  const { dayCount, startPlace, endPlace } = params;
  
  if (dayCount < 2) {
    return [];
  }

  const suggestions: DaySuggestion[] = [];
  const isRoundTrip = !endPlace || areSameLocation(startPlace, endPlace);
  const destination = endPlace && !isRoundTrip ? endPlace : startPlace;

  // Day 1: Outbound travel to destination
  const day1Stops = [];
  day1Stops.push({
    name: startPlace.name,
    lat: startPlace.lat,
    lng: startPlace.lng,
    type: "gecis" as const,
    durationMin: 0,
    note: "Başlangıç noktası",
    address: "",
  });

  // If there's a different destination, add it as the end of day 1
  if (!isRoundTrip && endPlace) {
    day1Stops.push({
      name: endPlace.name,
      lat: endPlace.lat,
      lng: endPlace.lng,
      type: "konaklama" as const,
      durationMin: 60,
      note: "Varış / konaklama",
      address: "",
    });
  }

  suggestions.push({
    dayIndex: 0,
    type: "outbound",
    label: "Gidiş",
    stops: day1Stops,
  });

  // Middle days: Explore around destination
  const middleDayCount = dayCount - 2;
  if (middleDayCount > 0) {
    const nearbyPOIs = await findNearbyPOIs(destination, middleDayCount * 3);
    
    for (let i = 0; i < middleDayCount; i++) {
      const dayIndex = i + 1;
      const dayPOIs = nearbyPOIs.slice(i * 3, (i + 1) * 3);
      
      const dayStops = [];
      
      // Start from the destination (where day 1 ended)
      dayStops.push({
        name: destination.name,
        lat: destination.lat,
        lng: destination.lng,
        type: "gecis" as const,
        durationMin: 0,
        note: "Günlük başlangıç noktası",
        address: "",
      });

      // Add nearby POIs
      dayPOIs.forEach((poi, idx) => {
        dayStops.push({
          name: poi.name,
          lat: poi.lat,
          lng: poi.lng,
          type: idx === dayPOIs.length - 1 ? ("konaklama" as const) : ("gezi" as const),
          durationMin: idx === dayPOIs.length - 1 ? 60 : 90,
          note: poi.note,
          address: poi.address,
        });
      });

      suggestions.push({
        dayIndex,
        type: "explore",
        label: `Bölgede gezi (Gün ${dayIndex + 1})`,
        stops: dayStops,
      });
    }
  }

  // Last day: Return (if multi-day)
  if (dayCount >= 2) {
    const lastDayIndex = dayCount - 1;
    const returnStops = [];

    // Start from destination
    returnStops.push({
      name: destination.name,
      lat: destination.lat,
      lng: destination.lng,
      type: "gecis" as const,
      durationMin: 0,
      note: "Dönüş başlangıcı",
      address: "",
    });

    // Return to start (if not round-trip)
    if (!isRoundTrip) {
      returnStops.push({
        name: startPlace.name,
        lat: startPlace.lat,
        lng: startPlace.lng,
        type: "gecis" as const,
        durationMin: 0,
        note: "Dönüş noktası",
        address: "",
      });
    }

    suggestions.push({
      dayIndex: lastDayIndex,
      type: "return",
      label: "Dönüş",
      stops: returnStops,
    });
  }

  return suggestions;
}

function areSameLocation(a: PlaceCoords, b: PlaceCoords): boolean {
  return (
    Math.abs(a.lat - b.lat) < 0.001 && 
    Math.abs(a.lng - b.lng) < 0.001
  );
}

/**
 * Finds nearby POIs (points of interest) around a location using Nominatim.
 */
async function findNearbyPOIs(
  center: PlaceCoords,
  limit: number
): Promise<Array<{ name: string; lat: number; lng: number; note: string; address: string }>> {
  const pois: Array<{ name: string; lat: number; lng: number; note: string; address: string }> = [];
  
  const categories = [
    { query: "tourism", label: "turistik" },
    { query: "park", label: "park" },
    { query: "museum", label: "müze" },
    { query: "beach", label: "plaj" },
    { query: "restaurant", label: "restoran" },
  ];

  try {
    // Search for POIs near the center
    const radius = 0.1; // ~10km radius
    
    for (const cat of categories.slice(0, 3)) {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", cat.query);
      url.searchParams.set("format", "json");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("viewbox", `${center.lng - radius},${center.lat + radius},${center.lng + radius},${center.lat - radius}`);
      url.searchParams.set("bounded", "1");
      url.searchParams.set("limit", "5");
      url.searchParams.set("accept-language", "tr");

      const res = await fetch(url.toString(), {
        headers: {
          "User-Agent": NOMINATIM_UA,
          Accept: "application/json",
        },
        next: { revalidate: 3600 },
      });

      if (res.ok) {
        const data = await res.json();
        for (const item of data) {
          if (pois.length >= limit) break;
          
          const name = item.name || item.display_name?.split(",")[0] || `${cat.label} noktası`;
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            pois.push({
              name,
              lat,
              lng,
              note: `${cat.label} - öneri`,
              address: item.display_name || "",
            });
          }
        }
      }

      if (pois.length >= limit) break;
    }
  } catch (err) {
    console.error("Error finding nearby POIs:", err);
  }

  // If we couldn't find enough POIs, create some basic suggestions around the destination
  if (pois.length < 3) {
    const fallbackPOIs = [
      { name: `${center.name} Merkez`, lat: center.lat, lng: center.lng, note: "Merkez bölge", address: "" },
      { name: `${center.name} çevresi`, lat: center.lat + 0.01, lng: center.lng + 0.01, note: "Çevre gezisi", address: "" },
      { name: `${center.name} bölgesi`, lat: center.lat - 0.01, lng: center.lng - 0.01, note: "Bölge gezisi", address: "" },
    ];
    
    while (pois.length < limit && fallbackPOIs.length > 0) {
      pois.push(fallbackPOIs.shift()!);
    }
  }

  return pois.slice(0, limit);
}
