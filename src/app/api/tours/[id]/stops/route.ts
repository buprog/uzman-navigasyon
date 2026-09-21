import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const tour = await prisma.tour.findFirst({ where: { id: params.id, userId: user.id } });
  if (!tour) return NextResponse.json({ error: "Tur bulunamadı." }, { status: 404 });

  const body = await req.json();
  const dayIndex = Number(body.dayIndex) || 0;
  const maxOrder = await prisma.stop.aggregate({
    where: { tourId: tour.id, dayIndex },
    _max: { order: true },
  });

  const stop = await prisma.stop.create({
    data: {
      tourId: tour.id,
      dayIndex,
      order: (maxOrder._max.order ?? -1) + 1,
      type: String(body.type || "gezi"),
      name: String(body.name || "Yeni durak"),
      durationMin: Number(body.durationMin) || 60,
      note: String(body.note || ""),
      lat: Number(body.lat),
      lng: Number(body.lng),
      address: String(body.address || ""),
    },
  });

  // bump dayCount if needed
  if (dayIndex + 1 > tour.dayCount) {
    await prisma.tour.update({ where: { id: tour.id }, data: { dayCount: dayIndex + 1 } });
  }

  return NextResponse.json({ stop });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  // bulk reorder: { stops: [{ id, dayIndex, order }] }
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const tour = await prisma.tour.findFirst({ where: { id: params.id, userId: user.id } });
  if (!tour) return NextResponse.json({ error: "Tur bulunamadı." }, { status: 404 });

  const body = await req.json();
  const items = Array.isArray(body.stops) ? body.stops : [];
  await prisma.$transaction(
    items.map((s: { id: string; dayIndex: number; order: number }) =>
      prisma.stop.update({
        where: { id: s.id },
        data: { dayIndex: s.dayIndex, order: s.order },
      })
    )
  );
  return NextResponse.json({ ok: true });
}
