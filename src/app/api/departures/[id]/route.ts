import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { countActiveDepartures, LIMIT_MESSAGES, limitsFor, getEffectivePlan } from "@/lib/plan";

async function ownedDeparture(id: string, userId: string) {
  return prisma.departure.findFirst({
    where: { id, tour: { userId } },
    include: { tour: true },
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const existing = await ownedDeparture(params.id, user.id);
  if (!existing) return NextResponse.json({ error: "Kalkış bulunamadı." }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.date !== undefined) data.date = String(body.date);
  if (body.capacity !== undefined) data.capacity = Math.max(1, Number(body.capacity) || 1);
  if (body.note !== undefined) data.note = String(body.note);
  if (body.status !== undefined) {
    const status = String(body.status);
    const becomingActive = (status === "yayin" || status === "dolu") &&
      existing.status !== "yayin" && existing.status !== "dolu";
    if (becomingActive) {
      const effectivePlan = getEffectivePlan(user.plan, user.premiumExpiresAt);
      const limits = limitsFor(effectivePlan);
      const active = await countActiveDepartures(user.id);
      if (active >= limits.maxActiveDepartures) {
        return NextResponse.json(
          { error: LIMIT_MESSAGES.departures, code: "PLAN_LIMIT", upgrade: true },
          { status: 403 }
        );
      }
    }
    data.status = status;
  }

  const departure = await prisma.departure.update({ where: { id: params.id }, data });
  return NextResponse.json({ departure });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const existing = await ownedDeparture(params.id, user.id);
  if (!existing) return NextResponse.json({ error: "Kalkış bulunamadı." }, { status: 404 });
  await prisma.departure.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
