/**
 * Konum bazlı sorgular — en yakın servis, şarj, POI bulma
 * Haversine mesafe hesaplama ile
 */

import { haversineKm } from "./fuelEstimate";

export type LocationPoint = {
  lat: number;
  lng: number;
};

export type ServiceResult = {
  id: string;
  brand: string;
  name: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  website: string;
  lat: number;
  lng: number;
  distanceKm: number;
};

export type ChargerResult = {
  id: string;
  name: string;
  network: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  connectors: string;
  lat: number;
  lng: number;
  distanceKm: number;
};

export type POIResult = {
  id: string;
  category: string;
  name: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  lat: number;
  lng: number;
  distanceKm: number;
  isEmergency: boolean;
};

/**
 * Liste içinden en yakın N tanesini bul (haversine mesafe ile)
 */
export function findNearest<T extends { lat: number; lng: number }>(
  userLocation: LocationPoint,
  items: T[],
  maxResults = 10
): Array<T & { distanceKm: number }> {
  const withDistance = items.map((item) => ({
    ...item,
    distanceKm: haversineKm(
      userLocation.lat,
      userLocation.lng,
      item.lat,
      item.lng
    ),
  }));

  withDistance.sort((a, b) => a.distanceKm - b.distanceKm);
  return withDistance.slice(0, maxResults);
}

/**
 * Reverse geocode — il ve ilçe bilgisi (Nominatim/OSM)
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ il: string; ilce: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=tr`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "UzmanNavigasyon/1.0 (tour planner)",
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const addr = data.address || {};

    const il =
      addr.province ||
      addr.state ||
      addr.city ||
      addr.county ||
      "Bilinmeyen İl";
    const ilce =
      addr.city ||
      addr.town ||
      addr.district ||
      addr.municipality ||
      "Bilinmeyen İlçe";

    return { il, ilce };
  } catch {
    return null;
  }
}
