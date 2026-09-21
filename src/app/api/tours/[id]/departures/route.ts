import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { countActiveDepartures, LIMIT_MESSAGES, limitsFor } from "@/lib/plan";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const tour = await prisma.tour.findFirst({ where: { id: params.id, userId: user.id } });
  if (!tour) return NextResponse.json({ error: "Tur bulunamadı." }, { status: 404 });

  const departures = await prisma.departure.findMany({
    where: { tourId: tour.id },
    orderBy: { date: "asc" },
    include: { _count: { select: { reservations: true } } },
  });
  return NextResponse.json({ departures, tour });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const tour = await prisma.tour.findFirst({ where: { id: params.id, userId: user.id } });
  if (!tour) return NextResponse.json({ error: "Tur bulunamadı." }, { status: 404 });

  const body = await req.json();
  const status = String(body.status || "taslak");
  const limits = limitsFor(user.plan);

  if (status === "yayin" || status === "dolu") {
    const active = await countActiveDepartures(user.id);
    if (active >= limits.maxActiveDepartures) {
      return NextResponse.json(
        { error: LIMIT_MESSAGES.departures, code: "PLAN_LIMIT", upgrade: true },
        { status: 403 }
      );
    }
  }

  const departure = await prisma.departure.create({
    data: {
      tourId: tour.id,
      date: String(body.date || new Date().toISOString().slice(0, 10)),
      capacity: Math.max(1, Number(body.capacity) || 20),
      status,
      note: String(body.note || ""),
      shareCode: nanoid(),
    },
  });
  return NextResponse.json({ departure });
}
