import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });

  const reservation = await prisma.reservation.findFirst({
    where: { id: params.id, departure: { tour: { userId: user.id } } },
    include: { departure: true },
  });
  if (!reservation) return NextResponse.json({ error: "Rezervasyon bulunamadı." }, { status: 404 });

  const body = await req.json();
  const status = String(body.status || "");
  if (!["onayli", "iptal", "beklemede"].includes(status)) {
    return NextResponse.json({ error: "Geçersiz durum." }, { status: 400 });
  }

  const prev = reservation.status;
  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.reservation.update({
      where: { id: reservation.id },
      data: { status },
    });

    let bookedDelta = 0;
    if (prev !== "onayli" && status === "onayli") bookedDelta = reservation.pax;
    if (prev === "onayli" && status !== "onayli") bookedDelta = -reservation.pax;

    if (bookedDelta !== 0) {
      const dep = await tx.departure.update({
        where: { id: reservation.departureId },
        data: { bookedCount: { increment: bookedDelta } },
      });
      if (dep.bookedCount >= dep.capacity && dep.status === "yayin") {
        await tx.departure.update({ where: { id: dep.id }, data: { status: "dolu" } });
      } else if (dep.bookedCount < dep.capacity && dep.status === "dolu") {
        await tx.departure.update({ where: { id: dep.id }, data: { status: "yayin" } });
      }
    }
    return res;
  });

  return NextResponse.json({ reservation: updated });
}
