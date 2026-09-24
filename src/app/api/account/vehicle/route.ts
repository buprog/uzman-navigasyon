import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FUEL_TYPES, type FuelType } from "@/lib/vehicleCatalog";

const FUEL_SET = new Set(FUEL_TYPES.map((f) => f.value));

const vehicleSelect = {
  id: true,
  vehicleMake: true,
  vehicleModel: true,
  fuelType: true,
  consumptionPer100: true,
  bloodType: true,
  emergencyPhone: true,
  preferTolls: true,
  odometerKm: true,
  tireTreadMm: true,
  autoStopNotifications: true,
} as const;

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });

  const vehicle = await prisma.user.findUnique({
    where: { id: user.id },
    select: vehicleSelect,
  });
  return NextResponse.json({ vehicle });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 });
  }

  const data: {
    vehicleMake?: string | null;
    vehicleModel?: string | null;
    fuelType?: string | null;
    consumptionPer100?: number | null;
    bloodType?: string | null;
    emergencyPhone?: string | null;
    preferTolls?: boolean;
    odometerKm?: number | null;
    tireTreadMm?: number | null;
    autoStopNotifications?: boolean;
  } = {};

  if ("vehicleMake" in body) {
    const v = body.vehicleMake;
    data.vehicleMake = v === null || v === "" ? null : String(v).slice(0, 80);
  }
  if ("vehicleModel" in body) {
    const v = body.vehicleModel;
    data.vehicleModel = v === null || v === "" ? null : String(v).slice(0, 80);
  }
  if ("fuelType" in body) {
    const v = body.fuelType;
    if (v === null || v === "") data.fuelType = null;
    else if (typeof v === "string" && FUEL_SET.has(v as FuelType)) data.fuelType = v;
    else return NextResponse.json({ error: "Geçersiz yakıt tipi." }, { status: 400 });
  }
  if ("consumptionPer100" in body) {
    const v = body.consumptionPer100;
    if (v === null || v === "") data.consumptionPer100 = null;
    else {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return NextResponse.json({ error: "Tüketim 0–100 arasında olmalı." }, { status: 400 });
      }
      data.consumptionPer100 = n;
    }
  }
  if ("bloodType" in body) {
    const v = body.bloodType;
    data.bloodType = v === null || v === "" ? null : String(v).slice(0, 20);
  }
  if ("emergencyPhone" in body) {
    const v = body.emergencyPhone;
    data.emergencyPhone = v === null || v === "" ? null : String(v).slice(0, 40);
  }
  if ("preferTolls" in body) {
    data.preferTolls = Boolean(body.preferTolls);
  }
  if ("odometerKm" in body) {
    const v = body.odometerKm;
    if (v === null || v === "") data.odometerKm = null;
    else {
      const n = Math.round(Number(v));
      if (!Number.isFinite(n) || n < 0 || n > 9_999_999) {
        return NextResponse.json({ error: "Km saati geçersiz." }, { status: 400 });
      }
      data.odometerKm = n;
    }
  }
  if ("tireTreadMm" in body) {
    const v = body.tireTreadMm;
    if (v === null || v === "") data.tireTreadMm = null;
    else {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 20) {
        return NextResponse.json({ error: "Diş derinliği 0–20 mm olmalı." }, { status: 400 });
      }
      data.tireTreadMm = n;
    }
  }
  if ("autoStopNotifications" in body) {
    data.autoStopNotifications = Boolean(body.autoStopNotifications);
  }

  const vehicle = await prisma.user.update({
    where: { id: user.id },
    data,
    select: vehicleSelect,
  });

  return NextResponse.json({ vehicle, message: "Araç profili kaydedildi." });
}
