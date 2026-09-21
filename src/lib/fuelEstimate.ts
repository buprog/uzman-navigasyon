/**
 * Yol maliyeti tahmini — örnek birim fiyatlar (canlı API yok).
 * Birim fiyatlar: örnek / eğitim amaçlı sabitler; gerçek pompa fiyatı değildir.
 */

import type { FuelType } from "./vehicleCatalog";

/** Örnek birim fiyatlar (TRY) — belgeleme: örnek fiyat */
export const SAMPLE_UNIT_PRICES: Record<FuelType, { price: number; unit: string; label: string }> = {
  benzin: { price: 45.5, unit: "L", label: "örnek benzin ₺/L" },
  dizel: { price: 43.2, unit: "L", label: "örnek dizel ₺/L" },
  lpg: { price: 22.0, unit: "L", label: "örnek LPG ₺/L" },
  elektrikli: { price: 7.5, unit: "kWh", label: "örnek şarj ₺/kWh" },
  hibrit: { price: 45.5, unit: "L", label: "örnek benzin ₺/L (hibrit)" },
};

const EARTH_KM = 6371;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(a));
}

/** Duraklar arası haversine toplamı (km). order’a göre sıralı beklenir. */
export function routeDistanceKm(
  stops: { lat: number; lng: number; skipped?: boolean }[]
): number {
  const pts = stops.filter(
    (s) => !s.skipped && Number.isFinite(s.lat) && Number.isFinite(s.lng)
  );
  let sum = 0;
  for (let i = 1; i < pts.length; i++) {
    sum += haversineKm(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng);
  }
  return sum;
}

export type CostEstimate = {
  distanceKm: number;
  consumptionPer100: number;
  fuelType: FuelType;
  unitPrice: number;
  unit: string;
  unitLabel: string;
  amountUsed: number; // L veya kWh
  costTry: number;
  isElectric: boolean;
  note: string;
};

export function estimateFuelCost(opts: {
  distanceKm: number;
  fuelType: FuelType;
  consumptionPer100: number;
}): CostEstimate {
  const meta = SAMPLE_UNIT_PRICES[opts.fuelType];
  const amountUsed = (opts.distanceKm * opts.consumptionPer100) / 100;
  const costTry = amountUsed * meta.price;
  const isElectric = opts.fuelType === "elektrikli";
  return {
    distanceKm: opts.distanceKm,
    consumptionPer100: opts.consumptionPer100,
    fuelType: opts.fuelType,
    unitPrice: meta.price,
    unit: meta.unit,
    unitLabel: meta.label,
    amountUsed,
    costTry,
    isElectric,
    note: isElectric
      ? "Elektrikli: maliyet örnek kWh fiyatı ile; şarj istasyonu katmanı yakında (şimdilik örnek pinler)."
      : "Mesafe duraklar arası kuş bakışı (haversine) toplamıdır; OSRM yolu yoksa yaklaşık değerdir. Fiyatlar örnek sabittir.",
  };
}

/** Rota merkezine yakın birkaç örnek EV şarj noktası (mock). */
export function mockChargingNearCentroid(
  stops: { lat: number; lng: number; skipped?: boolean }[]
): { name: string; lat: number; lng: number; mock: true }[] {
  const pts = stops.filter(
    (s) => !s.skipped && Number.isFinite(s.lat) && Number.isFinite(s.lng)
  );
  if (pts.length === 0) return [];
  const lat = pts.reduce((a, s) => a + s.lat, 0) / pts.length;
  const lng = pts.reduce((a, s) => a + s.lng, 0) / pts.length;
  // ~2–4 km ofsetler (derece cinsinden kabaca)
  const d = 0.025;
  return [
    { name: "Örnek Şarj A (yakında)", lat: lat + d, lng: lng + d * 0.4, mock: true },
    { name: "Örnek Şarj B (yakında)", lat: lat - d * 0.7, lng: lng + d, mock: true },
    { name: "Örnek Şarj C (yakında)", lat: lat + d * 0.3, lng: lng - d * 0.9, mock: true },
  ];
}
