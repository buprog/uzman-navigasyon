import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { countTours, LIMIT_MESSAGES, limitsFor } from "@/lib/plan";
import { computeDayCount } from "@/lib/dayCount";
import { addTourOwnership } from "@/lib/tourOwnership";
import { getEffectivePlan } from "@/lib/effectivePlan";

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
  const effectivePlanResult = await getEffectivePlan(user.plan, user.premiumExpiresAt);
  return NextResponse.json({ tours, plan: effectivePlanResult.plan, limits: limitsFor(effectivePlanResult.plan) });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });

  const effectivePlanResult = await getEffectivePlan(user.plan, user.premiumExpiresAt);
  const limits = limitsFor(effectivePlanResult.plan);
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

  // Track ownership for demo session transfer
  addTourOwnership(tour.id);

  return NextResponse.json({ tour });
}
