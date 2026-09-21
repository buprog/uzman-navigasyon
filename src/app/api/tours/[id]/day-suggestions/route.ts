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

  // Try to get start/end coordinates from existing stops or tour metadata
  const startStop = tour.stops.find((s) => s.dayIndex === 0 && s.order === 0);
  const endStop = tour.stops.find(
    (s) => s.dayIndex === tour.dayCount - 1
  );

  if (!startStop) {
    return NextResponse.json(
      { error: "Başlangıç noktası bulunamadı." },
      { status: 400 }
    );
  }

  const startPlace = {
    lat: startStop.lat,
    lng: startStop.lng,
    name: startStop.name || tour.startName || "Başlangıç",
  };

  let endPlace = null;
  if (endStop && endStop.id !== startStop.id) {
    endPlace = {
      lat: endStop.lat,
      lng: endStop.lng,
      name: endStop.name || tour.endName || "Bitiş",
    };
  }

  const body = await req.json();
  const apply = body.apply === true;

  // Generate suggestions
  const suggestions = await generateDaySuggestions({
    dayCount: tour.dayCount,
    startPlace,
    endPlace,
  });

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
