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
  
  // Critical: endPlace MUST exist for multi-day suggestions
  if (!endPlace) {
    throw new Error("endPlace is required for multi-day suggestions");
  }

  const suggestions: DaySuggestion[] = [];
  
  // Determine the destination
  const isRoundTrip = areSameLocation(startPlace, endPlace);
  const destination = !isRoundTrip ? endPlace : startPlace;

  // Day 1: Outbound travel (start → destination)
  // ALWAYS has 2 stops: start + destination
  const day1Stops = [];
  
  // Stop 1: Starting point
  day1Stops.push({
    name: startPlace.name,
    lat: startPlace.lat,
    lng: startPlace.lng,
    type: "gecis" as const,
    durationMin: 0,
    note: "Başlangıç noktası",
    address: "",
  });

  // Stop 2: Destination (arrival point - anchor for all subsequent days)
  day1Stops.push({
    name: endPlace.name,
    lat: endPlace.lat,
    lng: endPlace.lng,
    type: "konaklama" as const,
    durationMin: 60,
    note: "Varış / konaklama (günlük başlangıç çapası)",
    address: "",
  });

  suggestions.push({
    dayIndex: 0,
    type: "outbound",
    label: "Gidiş",
    stops: day1Stops,
  });

  // Middle days: Explore around destination
  const middleDayCount = dayCount - 2;
  if (middleDayCount > 0 && destination) {
    const nearbyPOIs = await findNearbyPOIs(destination, middleDayCount * 3);
    
    for (let i = 0; i < middleDayCount; i++) {
      const dayIndex = i + 1;
      const dayPOIs = nearbyPOIs.slice(i * 3, (i + 1) * 3);
      
      const dayStops = [];
      
      // CRITICAL: Each day starts where the previous day ended (day 1 ended at destination)
      // This is the anchor point for all subsequent days
      dayStops.push({
        name: destination.name,
        lat: destination.lat,
        lng: destination.lng,
        type: "gecis" as const,
        durationMin: 0,
        note: `Gün ${dayIndex + 1} başlangıç - önceki gün varış noktası`,
        address: "",
      });

      // Add nearby POIs (always ensure at least 2 POIs per day)
      if (dayPOIs.length < 2) {
        // Fallback: create simple offset points around destination
        const fallbacks = [
          { lat: destination.lat + 0.02, lng: destination.lng + 0.01, name: `${destination.name} Kuzey`, note: "Yerel gezinti" },
          { lat: destination.lat - 0.01, lng: destination.lng + 0.02, name: `${destination.name} Güney`, note: "Yerel gezinti" },
          { lat: destination.lat + 0.01, lng: destination.lng - 0.02, name: `${destination.name} Batı`, note: "Yerel gezinti" },
        ];
        
        while (dayPOIs.length < 2 && fallbacks.length > 0) {
          const fb = fallbacks.shift()!;
          dayPOIs.push({
            name: fb.name,
            lat: fb.lat,
            lng: fb.lng,
            note: fb.note,
            address: "",
          });
        }
      }

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

  // Last day: Return (destination → start)
  if (dayCount >= 2 && destination) {
    const lastDayIndex = dayCount - 1;
    const returnStops = [];

    // Start from destination (where middle days have been exploring)
    returnStops.push({
      name: destination.name,
      lat: destination.lat,
      lng: destination.lng,
      type: "gecis" as const,
      durationMin: 0,
      note: `Gün ${lastDayIndex + 1} dönüş başlangıcı - önceki gün varış noktası`,
      address: "",
    });

    // Return to start (always, even for round trips)
    returnStops.push({
      name: startPlace.name,
      lat: startPlace.lat,
      lng: startPlace.lng,
      type: "gecis" as const,
      durationMin: 0,
      note: "Dönüş noktası",
      address: "",
    });

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

  // If we couldn't find enough POIs, create fallback suggestions around the destination
  // Use larger offsets (~2-5km) to make routes more visible
  if (pois.length < 3) {
    const fallbackPOIs = [
      { name: `${center.name} Merkez`, lat: center.lat, lng: center.lng, note: "Merkez bölge", address: "" },
      { name: `${center.name} Kuzey`, lat: center.lat + 0.03, lng: center.lng + 0.01, note: "Kuzey bölgesi gezisi", address: "" },
      { name: `${center.name} Güney`, lat: center.lat - 0.02, lng: center.lng + 0.02, note: "Güney bölgesi gezisi", address: "" },
      { name: `${center.name} Doğu`, lat: center.lat + 0.01, lng: center.lng + 0.03, note: "Doğu bölgesi gezisi", address: "" },
      { name: `${center.name} Batı`, lat: center.lat - 0.01, lng: center.lng - 0.03, note: "Batı bölgesi gezisi", address: "" },
      { name: `${center.name} çevresi`, lat: center.lat + 0.02, lng: center.lng - 0.02, note: "Çevre gezisi", address: "" },
    ];
    
    while (pois.length < limit && fallbackPOIs.length > 0) {
      pois.push(fallbackPOIs.shift()!);
    }
  }

  return pois.slice(0, limit);
}
