import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { countReservationsThisMonth, limitsFor } from "@/lib/plan";

export async function GET(_: Request, { params }: { params: { shareCode: string } }) {
  const departure = await prisma.departure.findUnique({
    where: { shareCode: params.shareCode },
    include: {
      tour: {
        include: {
          user: { select: { name: true, companyName: true, plan: true } },
          stops: { orderBy: [{ dayIndex: "asc" }, { order: "asc" }] },
        },
      },
    },
  });
  if (!departure || departure.status === "iptal" || departure.status === "taslak") {
    return NextResponse.json({ error: "Program bulunamadı veya henüz yayınlanmadı." }, { status: 404 });
  }
  return NextResponse.json({
    departure: {
      id: departure.id,
      date: departure.date,
      capacity: departure.capacity,
      bookedCount: departure.bookedCount,
      status: departure.status,
      shareCode: departure.shareCode,
      note: departure.note,
    },
    tour: {
      id: departure.tour.id,
      name: departure.tour.name,
      description: departure.tour.description,
      dayCount: departure.tour.dayCount,
      startName: departure.tour.startName,
      endName: departure.tour.endName,
      stops: departure.tour.stops.filter((s) => !s.skipped),
    },
    operator: {
      name: departure.tour.user.companyName || departure.tour.user.name,
    },
  });
}

export async function POST(req: Request, { params }: { params: { shareCode: string } }) {
  const departure = await prisma.departure.findUnique({
    where: { shareCode: params.shareCode },
    include: { tour: { include: { user: true } } },
  });
  if (!departure || departure.status === "iptal" || departure.status === "taslak") {
    return NextResponse.json({ error: "Rezervasyon alınamıyor." }, { status: 404 });
  }
  if (departure.status === "dolu" || departure.bookedCount >= departure.capacity) {
    return NextResponse.json({ error: "Bu kalkış dolu." }, { status: 400 });
  }

  const operator = departure.tour.user;
  const limits = limitsFor(operator.plan);
  const monthCount = await countReservationsThisMonth(operator.id);
  if (monthCount >= limits.maxReservationsPerMonth) {
    return NextResponse.json(
      {
        error: "Operatör bu ay için rezervasyon kotasına ulaştı. Lütfen daha sonra tekrar deneyin.",
        code: "PLAN_LIMIT",
      },
      { status: 403 }
    );
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const pax = Math.max(1, Number(body.pax) || 1);
  const note = String(body.note || "");

  if (!name || !email) {
    return NextResponse.json({ error: "Ad ve e-posta gerekli." }, { status: 400 });
  }
  if (departure.bookedCount + pax > departure.capacity) {
    return NextResponse.json(
      { error: `Yetersiz kontenjan. Kalan: ${departure.capacity - departure.bookedCount}` },
      { status: 400 }
    );
  }

  const reservation = await prisma.reservation.create({
    data: {
      departureId: departure.id,
      name,
      email,
      phone,
      pax,
      note,
      status: "beklemede",
    },
  });

  return NextResponse.json({
    reservation: { id: reservation.id, status: reservation.status },
    message: "Rezervasyon talebiniz alındı. Operatör onayından sonra bilgilendirileceksiniz.",
  });
}
