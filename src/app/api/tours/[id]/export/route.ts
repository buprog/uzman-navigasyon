import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { toTourExport } from "@/lib/exportTour";

/** JSON export of a tour — foundation for future Drive backup / mobile. */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });

  const tour = await prisma.tour.findFirst({
    where: { id: params.id, userId: user.id },
    include: { stops: { orderBy: [{ dayIndex: "asc" }, { order: "asc" }] } },
  });
  if (!tour) return NextResponse.json({ error: "Tur bulunamadı." }, { status: 404 });

  const payload = toTourExport(tour);
  return NextResponse.json(payload, {
    headers: {
      "Content-Disposition": `attachment; filename="tur-${tour.id}.json"`,
    },
  });
}
