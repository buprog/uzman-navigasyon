import type { MapStop } from "@/components/MapView";

// Feature flag: sesli navigasyon v1'de kapalı
export const VOICE_NAV_ENABLED = false;

export type NavigationStep = {
  instruction: string;
  distance: number;
  location: [number, number];
};

export type NavigationRoute = {
  steps: NavigationStep[];
  totalDistance: number;
  coordinates: [number, number][];
};

export type NavigationState = {
  currentStopIndex: number;
  currentLocation: [number, number] | null;
  route: NavigationRoute | null;
  isOffRoute: boolean;
  nextStep: NavigationStep | null;
  distanceToNextStep: number;
};

const OFF_ROUTE_THRESHOLD_M = 50;

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function isOffRoute(
  currentLocation: [number, number],
  routeCoordinates: [number, number][]
): boolean {
  if (routeCoordinates.length < 2) return false;

  const [lng, lat] = currentLocation;
  let minDistance = Infinity;

  for (const [routeLng, routeLat] of routeCoordinates) {
    const distance = haversineDistance(lat, lng, routeLat, routeLng);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return minDistance > OFF_ROUTE_THRESHOLD_M;
}

export async function fetchOSRMRoute(
  from: [number, number],
  to: [number, number]
): Promise<NavigationRoute | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return null;

    const coordinates = (route.geometry?.coordinates as [number, number][]) || [];
    const legs = route.legs || [];
    const steps: NavigationStep[] = [];

    for (const leg of legs) {
      const legSteps = leg.steps || [];
      for (const step of legSteps) {
        const instruction =
          step.maneuver?.modifier
            ? `${getManeuverText(step.maneuver.type)} ${step.maneuver.modifier}`
            : getManeuverText(step.maneuver?.type || "");
        const distance = step.distance || 0;
        const location = step.maneuver?.location as [number, number] | undefined;

        if (location) {
          steps.push({
            instruction: instruction || "Devam edin",
            distance,
            location,
          });
        }
      }
    }

    return {
      steps,
      totalDistance: route.distance || 0,
      coordinates,
    };
  } catch {
    return null;
  }
}

export async function fetchMultiStopRoute(
  stops: MapStop[]
): Promise<NavigationRoute | null> {
  if (stops.length < 2) return null;

  try {
    const coords = stops.map((s) => `${s.lng},${s.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return null;

    const coordinates = (route.geometry?.coordinates as [number, number][]) || [];
    const legs = route.legs || [];
    const steps: NavigationStep[] = [];

    for (const leg of legs) {
      const legSteps = leg.steps || [];
      for (const step of legSteps) {
        const instruction =
          step.maneuver?.modifier
            ? `${getManeuverText(step.maneuver.type)} ${step.maneuver.modifier}`
            : getManeuverText(step.maneuver?.type || "");
        const distance = step.distance || 0;
        const location = step.maneuver?.location as [number, number] | undefined;

        if (location) {
          steps.push({
            instruction: instruction || "Devam edin",
            distance,
            location,
          });
        }
      }
    }

    return {
      steps,
      totalDistance: route.distance || 0,
      coordinates,
    };
  } catch {
    return null;
  }
}

function getManeuverText(type: string): string {
  const maneuvers: Record<string, string> = {
    turn: "Dönün",
    "new name": "Devam edin",
    depart: "Yola çıkın",
    arrive: "Hedefe ulaştınız",
    merge: "Birleşin",
    "on ramp": "Rampaya girin",
    "off ramp": "Rampadan çıkın",
    fork: "Yol ayrımında",
    "end of road": "Yol sonunda",
    continue: "Devam edin",
    roundabout: "Dönel kavşağa girin",
    rotary: "Dönel kavşağa girin",
    "roundabout turn": "Dönel kavşakta dönün",
    notification: "Bildirim",
    "exit roundabout": "Dönel kavşaktan çıkın",
    "exit rotary": "Dönel kavşaktan çıkın",
  };
  return maneuvers[type] || "Devam edin";
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function speakInstruction(text: string, lang = "tr-TR"): void {
  // Feature flag: v1'de sesli yönlendirme kapalı
  if (!VOICE_NAV_ENABLED) {
    return;
  }

  if (!("speechSynthesis" in window)) {
    console.warn("TTS desteklenmiyor");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  window.speechSynthesis.speak(utterance);
}

export function requestNotificationPermission(): void {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}
