"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapStop } from "./MapView";
import {
  fetchMultiStopRoute,
  formatDistance,
  haversineDistance,
  isOffRoute,
  speakInstruction,
  VOICE_NAV_ENABLED,
  type NavigationRoute,
  type NavigationStep,
} from "@/lib/navigation";

type Props = {
  stops: MapStop[];
  onExit: () => void;
  onFirstArrival?: () => void;
};

export function NavigationView({ stops, onExit, onFirstArrival }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSpokenStepRef = useRef<number>(-1);
  const rerouteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const firstArrivalTriggeredRef = useRef<boolean>(false);

  const [mapReady, setMapReady] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [nextStep, setNextStep] = useState<NavigationStep | null>(null);
  const [distanceToNextStep, setDistanceToNextStep] = useState(0);
  const [offRoute, setOffRoute] = useState(false);
  const [speed, setSpeed] = useState<number | null>(null);
  const [isRerouting, setIsRerouting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const currentStop = stops[currentStopIndex];
  const nextStop = stops[currentStopIndex + 1];

  const requestLocationPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      setError("Tarayıcınız konum özelliğini desteklemiyor.");
      return false;
    }

    try {
      const result = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });
      setPermissionGranted(true);
      setCurrentLocation([result.coords.longitude, result.coords.latitude]);
      return true;
    } catch (err) {
      if ((err as GeolocationPositionError).code === 1) {
        setError(
          "Konum izni reddedildi. Lütfen tarayıcı ayarlarından konum iznini etkinleştirin."
        );
      } else {
        setError("Konum alınamadı. Lütfen GPS'inizi açın ve tekrar deneyin.");
      }
      return false;
    }
  }, []);

  const calculateRoute = useCallback(
    async (from: [number, number], toStopIndex: number) => {
      if (toStopIndex >= stops.length) return;

      const remainingStops = stops.slice(toStopIndex);
      const routeStops = [
        { lat: from[1], lng: from[0], name: "Mevcut konum" },
        ...remainingStops,
      ];

      const newRoute = await fetchMultiStopRoute(routeStops);
      if (newRoute) {
        setRoute(newRoute);
        setOffRoute(false);
        setIsRerouting(false);

        if (newRoute.steps.length > 0) {
          setNextStep(newRoute.steps[0]);
          lastSpokenStepRef.current = -1;
        }
      }
    },
    [stops]
  );

  const handleReroute = useCallback(
    (location: [number, number]) => {
      if (isRerouting) return;

      setIsRerouting(true);
      setOffRoute(true);

      if (rerouteTimeoutRef.current) {
        clearTimeout(rerouteTimeoutRef.current);
      }

      rerouteTimeoutRef.current = setTimeout(() => {
        void calculateRoute(location, currentStopIndex);
        speakInstruction("Rota yeniden hesaplanıyor", "tr-TR", voiceEnabled);
      }, 2000);
    },
    [calculateRoute, currentStopIndex, isRerouting]
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [
              "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: currentLocation || [stops[0]?.lng || 35.2, stops[0]?.lat || 39.0],
      zoom: 15,
      interactive: true,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    const markReady = () => {
      try {
        map.resize();
        setMapReady(true);
      } catch {
        /* ignore */
      }
    };

    if (map.loaded()) markReady();
    else map.once("load", markReady);

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(containerRef.current);

    mapRef.current = map;

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !currentLocation) return;
    const map = mapRef.current;
    if (!map) return;

    map.easeTo({
      center: currentLocation,
      zoom: 16,
      duration: 500,
    });

    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:20px;height:20px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4);";
      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(currentLocation)
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat(currentLocation);
    }
  }, [currentLocation, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !route) return;

    if (!map.getSource("nav-route")) {
      map.addSource("nav-route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        },
      });
    }

    if (!map.getLayer("nav-route-casing")) {
      map.addLayer({
        id: "nav-route-casing",
        type: "line",
        source: "nav-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": 12,
          "line-opacity": 0.95,
        },
      });
    }

    if (!map.getLayer("nav-route-line")) {
      map.addLayer({
        id: "nav-route-line",
        type: "line",
        source: "nav-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": offRoute ? "#ef4444" : "#3b82f6",
          "line-width": 8,
          "line-opacity": 1,
        },
      });
    }

    (map.getSource("nav-route") as maplibregl.GeoJSONSource).setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: route.coordinates,
      },
    });

    if (map.getLayer("nav-route-line")) {
      map.setPaintProperty(
        "nav-route-line",
        "line-color",
        offRoute ? "#ef4444" : "#3b82f6"
      );
    }
  }, [route, mapReady, offRoute]);

  useEffect(() => {
    if (!currentLocation || !route || !nextStep) return;

    const [lng, lat] = currentLocation;
    const [stepLng, stepLat] = nextStep.location;
    const distance = haversineDistance(lat, lng, stepLat, stepLng);
    setDistanceToNextStep(distance);

    if (route.coordinates.length > 0 && !isRerouting) {
      const isOff = isOffRoute(currentLocation, route.coordinates);
      if (isOff && !offRoute) {
        handleReroute(currentLocation);
      }
    }

    const stepIndex = route.steps.findIndex((s) => s === nextStep);
    if (distance < 50 && stepIndex !== lastSpokenStepRef.current) {
      speakInstruction(nextStep.instruction, "tr-TR", voiceEnabled);
      lastSpokenStepRef.current = stepIndex;

      if (stepIndex < route.steps.length - 1) {
        setNextStep(route.steps[stepIndex + 1]);
      }
    }

    if (currentStop && haversineDistance(lat, lng, currentStop.lat, currentStop.lng) < 30) {
      // Trigger first arrival callback once
      if (!firstArrivalTriggeredRef.current && onFirstArrival) {
        firstArrivalTriggeredRef.current = true;
        onFirstArrival();
      }
      
      if (currentStopIndex < stops.length - 1) {
        setCurrentStopIndex(currentStopIndex + 1);
        void calculateRoute(currentLocation, currentStopIndex + 1);
        speakInstruction(`${currentStop.name} hedefe ulaştınız. Bir sonraki hedefe yönlendiriliyorsunuz.`, "tr-TR", voiceEnabled);
      } else {
        speakInstruction("Tüm duraklara ulaştınız. Navigasyon tamamlandı.", "tr-TR", voiceEnabled);
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
      }
    }
  }, [currentLocation, route, nextStep, currentStop, currentStopIndex, stops, offRoute, isRerouting, handleReroute, calculateRoute, voiceEnabled]);

  useEffect(() => {
    if (!permissionGranted) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];
        setCurrentLocation(location);

        if (position.coords.speed !== null) {
          setSpeed(position.coords.speed * 3.6);
        }
      },
      (err) => {
        console.error("Konum takip hatası:", err);
        setError("Konum takibi başarısız. GPS sinyali alınamıyor.");
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [permissionGranted]);

  useEffect(() => {
    if (currentLocation && currentStopIndex < stops.length) {
      void calculateRoute(currentLocation, currentStopIndex);
    }
  }, []);

  const handleStart = async () => {
    const granted = await requestLocationPermission();
    if (granted && currentLocation) {
      await calculateRoute(currentLocation, currentStopIndex);
      speakInstruction("Navigasyon başlatıldı", "tr-TR", voiceEnabled);
    }
  };

  const handleRecalculate = () => {
    if (currentLocation) {
      void calculateRoute(currentLocation, currentStopIndex);
      speakInstruction("Rota yeniden hesaplanıyor", "tr-TR", voiceEnabled);
    }
  };

  if (!permissionGranted) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
          <h2 className="text-xl font-bold text-slate-800">Konum İzni Gerekli</h2>
          <p className="mt-3 text-sm text-slate-600">
            Navigasyon için cihazınızın konumuna erişim gerekiyor. Konum izni vermek
            için aşağıdaki butona tıklayın.
          </p>
          {error && (
            <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
          <div className="mt-6 flex gap-3">
            <button onClick={handleStart} className="btn-primary flex-1">
              Konum İzni Ver ve Başlat
            </button>
            <button onClick={onExit} className="btn-secondary">
              İptal
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            💡 Not: HTTPS veya localhost üzerinden erişim gereklidir. Emülatör
            kullanıyorsanız konum simülasyonu etkinleştirin. İlk sesli talimat
            için kullanıcı etkileşimi (buton tıklama) gerekir.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen flex-col">
      <div ref={containerRef} className="flex-1" />

      {!mapReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100">
          <p className="text-sm text-slate-500">Harita yükleniyor…</p>
        </div>
      )}

      <div className="absolute left-4 right-4 top-4 z-20">
        {offRoute && (
          <div className="mb-2 rounded-lg bg-red-500 p-3 text-center text-sm font-medium text-white shadow-lg">
            ⚠️ Rotadan çıktınız - Yeniden hesaplanıyor…
          </div>
        )}

        {nextStep && (
          <div className="rounded-xl bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-2xl font-bold text-slate-800">
                  {formatDistance(distanceToNextStep)}
                </p>
                <p className="mt-1 text-base text-slate-600">{nextStep.instruction}</p>
              </div>
              <div className="ml-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500 text-3xl text-white">
                →
              </div>
            </div>

            {currentStop && (
              <div className="mt-3 border-t border-slate-200 pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Hedef
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {currentStop.name}
                </p>
                {nextStop && (
                  <p className="mt-1 text-xs text-slate-500">
                    Sonraki: {nextStop.name}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col gap-2">
        {speed !== null && (
          <div className="rounded-lg bg-white/90 px-3 py-2 text-center text-sm font-medium text-slate-700 shadow">
            🚗 {Math.round(speed)} km/h
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleRecalculate}
            className="btn-secondary flex-1"
            disabled={isRerouting}
          >
            {isRerouting ? "Hesaplanıyor…" : "Yeniden Hesapla"}
          </button>
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`px-4 py-2 rounded-lg font-medium ${
              voiceEnabled
                ? "bg-teal-600 text-white hover:bg-teal-700"
                : "bg-slate-300 text-slate-600 hover:bg-slate-400"
            }`}
            title={voiceEnabled ? "Sesi kapat" : "Sesi aç"}
          >
            {voiceEnabled ? "🔊" : "🔇"}
          </button>
          <button onClick={onExit} className="btn-danger px-6">
            Bitir
          </button>
        </div>

        <p className="text-center text-xs text-slate-500">
          Durak {currentStopIndex + 1} / {stops.length}
          {VOICE_NAV_ENABLED && voiceEnabled && (
            <span className="ml-2 text-teal-600">• Sesli yön aktif</span>
          )}
        </p>
      </div>
    </div>
  );
}
