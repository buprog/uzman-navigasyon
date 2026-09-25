import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { countTours, LIMIT_MESSAGES, limitsFor, getEffectivePlan } from "@/lib/plan";

async function ownedTour(id: string, userId: string) {
  return prisma.tour.findFirst({
    where: { id, userId },
    include: { stops: { orderBy: [{ dayIndex: "asc" }, { order: "asc" }] } },
  });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const tour = await ownedTour(params.id, user.id);
  if (!tour) return NextResponse.json({ error: "Tur bulunamadı." }, { status: 404 });
  return NextResponse.json({ tour });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const existing = await prisma.tour.findFirst({ where: { id: params.id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Tur bulunamadı." }, { status: 404 });

  const body = await req.json();

  if (body.action === "duplicate") {
    const effectivePlan = getEffectivePlan(user.plan, user.premiumExpiresAt);
    const limits = limitsFor(effectivePlan);
    if (existing.isSample && !limits.canCopySample) {
      return NextResponse.json(
        { error: LIMIT_MESSAGES.sampleCopy, code: "PLAN_LIMIT", upgrade: true },
        { status: 403 }
      );
    }
    const current = await countTours(user.id);
    if (current >= limits.maxTours) {
      return NextResponse.json(
        { error: LIMIT_MESSAGES.tours, code: "PLAN_LIMIT", upgrade: true },
        { status: 403 }
      );
    }
    const full = await ownedTour(params.id, user.id);
    if (!full) return NextResponse.json({ error: "Tur bulunamadı." }, { status: 404 });
    const copy = await prisma.tour.create({
      data: {
        userId: user.id,
        name: `${full.name} (kopya)`,
        description: full.description,
        startName: full.startName,
        endName: full.endName,
        startDate: full.startDate,
        endDate: full.endDate,
        dayCount: full.dayCount,
        isSample: false,
        stops: {
          create: full.stops.map((s) => ({
            dayIndex: s.dayIndex,
            order: s.order,
            type: s.type,
            name: s.name,
            durationMin: s.durationMin,
            note: s.note,
            lat: s.lat,
            lng: s.lng,
            address: s.address,
            skipped: s.skipped,
          })),
        },
      },
      include: { stops: true },
    });
    return NextResponse.json({ tour: copy });
  }

  const data: Record<string, unknown> = {};
  for (const key of ["name", "description", "startName", "endName", "startDate", "endDate"] as const) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (body.dayCount !== undefined) data.dayCount = Math.max(1, Number(body.dayCount) || 1);

  const tour = await prisma.tour.update({ where: { id: params.id }, data });
  return NextResponse.json({ tour });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const existing = await prisma.tour.findFirst({ where: { id: params.id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Tur bulunamadı." }, { status: 404 });
  await prisma.tour.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
