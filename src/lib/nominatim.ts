/** Shared Nominatim helpers — always call from server with User-Agent. */

export const NOMINATIM_UA =
  "UzmanNavigasyon/0.1 (tur planlayici; contact: operator@demo.com)";

export type NominatimAddress = Record<string, string>;

export type GeoPlace = {
  id: string;
  name: string;
  displayName: string;
  adminArea: string;
  lat: number;
  lng: number;
  type: string;
};

export function placeFromNominatim(item: {
  place_id?: number | string;
  display_name: string;
  lat: string | number;
  lon: string | number;
  name?: string;
  type?: string;
  class?: string;
  address?: NominatimAddress;
}): GeoPlace {
  const addr = item.address || {};
  const name =
    item.name ||
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.county ||
    addr.state ||
    String(item.display_name).split(",")[0]?.trim() ||
    "Konum";
  const district =
    addr.town || addr.suburb || addr.county || addr.municipality || addr.city_district || "";
  const province = addr.state || addr.province || addr.city || "";
  const adminParts = [district, province].filter(
    (p, i, arr) => p && arr.indexOf(p) === i && p !== name
  );

  return {
    id: String(item.place_id ?? `${item.lat},${item.lon}`),
    name,
    displayName: item.display_name,
    adminArea: adminParts.join(", "),
    lat: Number(item.lat),
    lng: Number(item.lon),
    type: item.type || item.class || "",
  };
}

export function shortLabelFromAddress(addr: NominatimAddress, fallback: string): string {
  const district =
    addr.suburb ||
    addr.neighbourhood ||
    addr.quarter ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.county ||
    "";
  const province = addr.state || addr.province || addr.city || "";
  const parts = [district, province].filter((p, i, arr) => p && arr.indexOf(p) === i);
  if (parts.length) return parts.join(", ");
  return fallback.split(",")[0]?.trim() || fallback;
}
