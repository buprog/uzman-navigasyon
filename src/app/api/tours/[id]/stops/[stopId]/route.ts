import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; stopId: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const tour = await prisma.tour.findFirst({ where: { id: params.id, userId: user.id } });
  if (!tour) return NextResponse.json({ error: "Tur bulunamadı." }, { status: 404 });

  const stop = await prisma.stop.findFirst({ where: { id: params.stopId, tourId: tour.id } });
  if (!stop) return NextResponse.json({ error: "Durak bulunamadı." }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of ["name", "type", "note", "address"] as const) {
    if (body[key] !== undefined) data[key] = String(body[key]);
  }
  if (body.durationMin !== undefined) data.durationMin = Number(body.durationMin) || 0;
  if (body.dayIndex !== undefined) data.dayIndex = Number(body.dayIndex) || 0;
  if (body.order !== undefined) data.order = Number(body.order) || 0;
  if (body.lat !== undefined) data.lat = Number(body.lat);
  if (body.lng !== undefined) data.lng = Number(body.lng);
  if (body.skipped !== undefined) data.skipped = Boolean(body.skipped);

  const updated = await prisma.stop.update({ where: { id: stop.id }, data });
  return NextResponse.json({ stop: updated });
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string; stopId: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const tour = await prisma.tour.findFirst({ where: { id: params.id, userId: user.id } });
  if (!tour) return NextResponse.json({ error: "Tur bulunamadı." }, { status: 404 });
  const stop = await prisma.stop.findFirst({ where: { id: params.stopId, tourId: tour.id } });
  if (!stop) return NextResponse.json({ error: "Durak bulunamadı." }, { status: 404 });
  await prisma.stop.delete({ where: { id: stop.id } });
  return NextResponse.json({ ok: true });
}
