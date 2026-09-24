import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { generateDaySuggestions } from "@/lib/dayPlanner";

type Params = {
  params: { id: string };
};

/**
 * POST /api/tours/[id]/day-suggestions
 * Generate and optionally apply day-by-day suggestions for a multi-day tour.
 */
export async function POST(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  }

  const tour = await prisma.tour.findFirst({
    where: { id: params.id, userId: user.id },
    include: { stops: true },
  });

  if (!tour) {
    return NextResponse.json({ error: "Tur bulunamadı." }, { status: 404 });
  }

  // Need at least 2 days and start/end places for suggestions
  if (tour.dayCount < 2) {
    return NextResponse.json(
      { error: "Öneri için en az 2 günlük tur gerekli." },
      { status: 400 }
    );
  }

  // Find start and end places from stops
  // Start: first stop on day 0
  const startStop = tour.stops.find((s) => s.dayIndex === 0 && s.order === 0);
  
  if (!startStop) {
    return NextResponse.json(
      { error: "Başlangıç noktası bulunamadı. Lütfen tura başlangıç noktası ekleyin." },
      { status: 400 }
    );
  }

  const startPlace = {
    lat: startStop.lat,
    lng: startStop.lng,
    name: startStop.name || tour.startName || "Başlangıç",
  };

  // Robust end place resolution (multiple strategies):
  let endStop = null;
  
  // Strategy 1: Find stop on last day that's not the start
  endStop = tour.stops.find(
    (s) => s.dayIndex === tour.dayCount - 1 && s.id !== startStop.id
  );
  
  // Strategy 2: If tour.endName exists, find stop matching that name
  if (!endStop && tour.endName) {
    endStop = tour.stops.find(
      (s) => s.id !== startStop.id && 
      (s.name.toLowerCase().includes(tour.endName.toLowerCase()) ||
       s.note.toLowerCase().includes("bitiş") ||
       s.note.toLowerCase().includes("varış"))
    );
  }
  
  // Strategy 3: Find the stop furthest from start
  if (!endStop) {
    let maxDist = 0;
    for (const stop of tour.stops) {
      if (stop.id === startStop.id) continue;
      const dist = Math.sqrt(
        Math.pow(stop.lat - startStop.lat, 2) + 
        Math.pow(stop.lng - startStop.lng, 2)
      );
      if (dist > maxDist) {
        maxDist = dist;
        endStop = stop;
      }
    }
  }

  let endPlace = null;
  if (endStop) {
    // Check if end is different from start (at least 0.01 degrees, ~1km)
    const distFromStart = Math.sqrt(
      Math.pow(endStop.lat - startStop.lat, 2) + 
      Math.pow(endStop.lng - startStop.lng, 2)
    );
    
    if (distFromStart > 0.01) {
      endPlace = {
        lat: endStop.lat,
        lng: endStop.lng,
        name: endStop.name || tour.endName || "Varış",
      };
    }
  }
  
  // Critical validation: must have distinct start and end for multi-day suggestions
  if (!endPlace) {
    return NextResponse.json(
      { error: "Varış noktası bulunamadı veya başlangıçla aynı. Lütfen farklı bir varış noktası ekleyin." },
      { status: 400 }
    );
  }
  
  // Additional safety: require at least 2 stops on day 0 OR valid endPlace
  const day0Stops = tour.stops.filter((s) => s.dayIndex === 0);
  if (day0Stops.length < 2 && !endPlace) {
    return NextResponse.json(
      { error: "Yeterli durak yok. Lütfen başlangıç ve varış noktası ekleyin." },
      { status: 400 }
    );
  }

  const body = await req.json();
  const apply = body.apply === true;

  // Generate suggestions
  const suggestions = await generateDaySuggestions({
    dayCount: tour.dayCount,
    startPlace,
    endPlace,
  });

  // Critical validation: ensure day 1 (dayIndex 0) has at least 2 stops
  const day1Suggestion = suggestions.find((s) => s.dayIndex === 0);
  if (!day1Suggestion || day1Suggestion.stops.length < 2) {
    return NextResponse.json(
      { error: "Gün 1 için yeterli durak oluşturulamadı. Başlangıç ve varış noktalarını kontrol edin." },
      { status: 500 }
    );
  }

  if (!apply) {
    return NextResponse.json({ suggestions });
  }

  // Apply suggestions: delete existing stops and create new ones
  await prisma.stop.deleteMany({
    where: { tourId: tour.id },
  });

  const stopsToCreate: Array<{
    dayIndex: number;
    order: number;
    type: string;
    name: string;
    durationMin: number;
    note: string;
    lat: number;
    lng: number;
    address: string;
  }> = [];

  suggestions.forEach((daySuggestion) => {
    daySuggestion.stops.forEach((stop, index) => {
      stopsToCreate.push({
        dayIndex: daySuggestion.dayIndex,
        order: index,
        type: stop.type,
        name: stop.name,
        durationMin: stop.durationMin,
        note: stop.note,
        lat: stop.lat,
        lng: stop.lng,
        address: stop.address,
      });
    });
  });

  await prisma.tour.update({
    where: { id: tour.id },
    data: {
      stops: { create: stopsToCreate },
    },
  });

  const updatedTour = await prisma.tour.findUnique({
    where: { id: tour.id },
    include: { stops: true },
  });

  return NextResponse.json({ 
    success: true, 
    tour: updatedTour,
    appliedDays: suggestions.length 
  });
}
