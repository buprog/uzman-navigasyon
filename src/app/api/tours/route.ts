import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { countTours, LIMIT_MESSAGES, limitsFor } from "@/lib/plan";
import { computeDayCount } from "@/lib/dayCount";
import { generateDaySuggestions } from "@/lib/dayPlanner";

type PlacePayload = {
  name?: string;
  lat?: number;
  lng?: number;
  displayName?: string;
} | null;

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });

  const tours = await prisma.tour.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { stops: true, departures: true } },
    },
  });
  return NextResponse.json({ tours, plan: user.plan, limits: limitsFor(user.plan) });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });

  const limits = limitsFor(user.plan);
  const current = await countTours(user.id);
  if (current >= limits.maxTours) {
    return NextResponse.json(
      { error: LIMIT_MESSAGES.tours, code: "PLAN_LIMIT", upgrade: true },
      { status: 403 }
    );
  }

  const body = await req.json();
  const name = String(body.name || "").trim() || "Yeni Tur";
  const description = String(body.description || "");
  const startPlace = (body.startPlace || null) as PlacePayload;
  const endPlace = (body.endPlace || null) as PlacePayload;
  const startName = String(
    startPlace?.name || body.startName || ""
  ).trim();
  const endName = String(endPlace?.name || body.endName || "").trim();
  const startDate = body.startDate ? String(body.startDate) : null;
  const endDate = body.endDate ? String(body.endDate) : null;

  const { dayCount, error: dateError } = computeDayCount(startDate, endDate);
  if (dateError) {
    return NextResponse.json({ error: dateError }, { status: 400 });
  }

  // For multi-day tours with valid start/end coordinates, auto-generate all day suggestions
  const shouldAutoGenerate = 
    dayCount >= 2 &&
    startPlace &&
    Number.isFinite(Number(startPlace.lat)) &&
    Number.isFinite(Number(startPlace.lng)) &&
    endPlace &&
    Number.isFinite(Number(endPlace.lat)) &&
    Number.isFinite(Number(endPlace.lng));

  let stopsToCreate: Array<{
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

  if (shouldAutoGenerate) {
    // Check if start and end are different (at least 0.01 degrees apart)
    const sameAsStart =
      Math.abs(Number(endPlace.lat) - Number(startPlace.lat)) < 0.01 &&
      Math.abs(Number(endPlace.lng) - Number(startPlace.lng)) < 0.01;

    if (!sameAsStart) {
      // Auto-generate day suggestions for all days
      try {
        const suggestions = await generateDaySuggestions({
          dayCount,
          startPlace: {
            lat: Number(startPlace.lat),
            lng: Number(startPlace.lng),
            name: String(startPlace.name || startName || "Başlangıç"),
          },
          endPlace: {
            lat: Number(endPlace.lat),
            lng: Number(endPlace.lng),
            name: String(endPlace.name || endName || "Varış"),
          },
        });

        // Convert suggestions to stops
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
      } catch (err) {
        console.error("Failed to auto-generate day suggestions:", err);
        // Fall back to basic start/end stops
        shouldAutoGenerate && (stopsToCreate = []);
      }
    }
  }

  // Fallback: if auto-generation didn't happen, create basic start/end stops
  if (stopsToCreate.length === 0) {
    if (
      startPlace &&
      Number.isFinite(Number(startPlace.lat)) &&
      Number.isFinite(Number(startPlace.lng))
    ) {
      stopsToCreate.push({
        dayIndex: 0,
        order: 0,
        type: "gecis",
        name: String(startPlace.name || startName || "Başlangıç"),
        durationMin: 0,
        note: "Başlangıç noktası",
        lat: Number(startPlace.lat),
        lng: Number(startPlace.lng),
        address: String(startPlace.displayName || ""),
      });
    }

    if (
      endPlace &&
      Number.isFinite(Number(endPlace.lat)) &&
      Number.isFinite(Number(endPlace.lng))
    ) {
      const sameAsStart =
        startPlace &&
        Math.abs(Number(endPlace.lat) - Number(startPlace.lat)) < 1e-6 &&
        Math.abs(Number(endPlace.lng) - Number(startPlace.lng)) < 1e-6;
      if (!sameAsStart) {
        stopsToCreate.push({
          dayIndex: Math.max(0, dayCount - 1),
          order: 0,
          type: "gecis",
          name: String(endPlace.name || endName || "Bitiş"),
          durationMin: 0,
          note: "Bitiş noktası",
          lat: Number(endPlace.lat),
          lng: Number(endPlace.lng),
          address: String(endPlace.displayName || ""),
        });
      }
    }
  }

  const tour = await prisma.tour.create({
    data: {
      userId: user.id,
      name,
      description,
      startName,
      endName,
      startDate,
      endDate,
      dayCount,
      stops:
        stopsToCreate.length > 0
          ? { create: stopsToCreate }
          : undefined,
    },
    include: { stops: true },
  });

  return NextResponse.json({ tour });
}
