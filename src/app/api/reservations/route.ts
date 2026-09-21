import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const tourId = searchParams.get("tourId");

  const reservations = await prisma.reservation.findMany({
    where: {
      departure: {
        tour: {
          userId: user.id,
          ...(tourId ? { id: tourId } : {}),
        },
      },
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      departure: {
        include: { tour: { select: { id: true, name: true } } },
      },
    },
  });
  return NextResponse.json({ reservations });
}
