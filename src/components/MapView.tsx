"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type MapStop = {
  id?: string;
  name: string;
  lat: number;
  lng: number;
  type?: string;
  dayIndex?: number;
  order?: number;
};

export type MockCharger = {
  name: string;
  lat: number;
  lng: number;
  mock?: boolean;
};

type Props = {
  stops: MapStop[];
  interactive?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onMapTap?: () => void;
  className?: string;
  center?: [number, number];
  zoom?: number;
  mockChargers?: MockCharger[];
  mapRef?: React.MutableRefObject<maplibregl.Map | null>;
  showAttribution?: boolean;
};

const TYPE_COLOR: Record<string, string> = {
  gecis: "#64748b",
  gezi: "#0f766e",
  yemek: "#ea580c",
  konaklama: "#7c3aed",
};

function orderStops(stops: MapStop[]) {
  return [...stops].sort((a, b) => {
    const da = a.dayIndex ?? 0;
    const db = b.dayIndex ?? 0;
    if (da !== db) return da - db;
    return (a.order ?? 0) - (b.order ?? 0);
  });
}

async function fetchRoadRoute(coords: [number, number][]): Promise<[number, number][]> {
  if (coords.length < 2) return coords;
  // OSRM public API: too many waypoints often fails — chunk pairwise
  try {
    if (coords.length <= 25) {
      const path = coords.map((c) => `${c[0]},${c[1]}`).join(";");
      const url = `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const geometry = data?.routes?.[0]?.geometry?.coordinates;
        if (Array.isArray(geometry) && geometry.length >= 2) {
          return geometry as [number, number][];
        }
      }
    }
    // Pairwise fallback
    const merged: [number, number][] = [];
    for (let i = 0; i < coords.length - 1; i++) {
      const a = coords[i];
      const b = coords[i + 1];
      const url = `https://router.project-osrm.org/route/v1/driving/${a[0]},${a[1]};${b[0]},${b[1]}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) {
        merged.push(a, b);
        continue;
      }
      const data = await res.json();
      const geometry = data?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
      if (geometry?.length) {
        if (merged.length) geometry.shift();
        merged.push(...geometry);
      } else {
        merged.push(a, b);
      }
    }
    if (merged.length >= 2) return merged;
  } catch {
    /* straight line */
  }
  return coords;
}

function ensureRouteLayers(map: maplibregl.Map) {
  if (!map.getSource("route")) {
    map.addSource("route", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      },
    });
  }
  if (!map.getLayer("route-line-casing")) {
    map.addLayer({
      id: "route-line-casing",
      type: "line",
      source: "route",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#ffffff",
        "line-width": 10,
        "line-opacity": 0.95,
      },
    });
  }
  if (!map.getLayer("route-line")) {
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#0d9488",
        "line-width": 6,
        "line-opacity": 1,
      },
    });
  }
}

function setRouteData(map: maplibregl.Map, lineCoords: [number, number][]) {
  ensureRouteLayers(map);
  (map.getSource("route") as maplibregl.GeoJSONSource).setData({
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: lineCoords.length >= 2 ? lineCoords : [],
    },
  });
}

export function MapView({
  stops,
  interactive = true,
  onMapClick,
  onMapTap,
  className = "h-full w-full",
  center = [35.2, 39.0],
  zoom = 5.5,
  mockChargers = [],
  mapRef: externalMapRef,
  showAttribution = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalMapRef = useRef<maplibregl.Map | null>(null);
  const mapRef = externalMapRef || internalMapRef;
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const chargerMarkersRef = useRef<maplibregl.Marker[]>([]);
  const onClickRef = useRef(onMapClick);
  const onTapRef = useRef(onMapTap);
  const routeGenRef = useRef(0);
  const [mapReady, setMapReady] = useState(false);
  const clickStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  onClickRef.current = onMapClick;
  onTapRef.current = onMapTap;

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
            attribution: "© OpenStreetMap | MapLibre",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center,
      zoom,
      interactive,
      attributionControl: false,
    });
    
    if (showAttribution) {
      const attributionControl = new maplibregl.AttributionControl({
        compact: true,
        customAttribution: "Rota: OSRM (yoksa kuş bakışı)",
      });
      map.addControl(attributionControl, "bottom-left");
      
      setTimeout(() => {
        const attrElement = map.getContainer().querySelector('.maplibregl-ctrl-attrib');
        if (attrElement) {
          attrElement.classList.remove('maplibregl-compact-show');
        }
      }, 100);
    }
    
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("mousedown", (e) => {
      clickStartRef.current = { x: e.point.x, y: e.point.y, time: Date.now() };
    });

    map.on("touchstart", (e) => {
      if (e.points.length === 1) {
        clickStartRef.current = { x: e.points[0].x, y: e.points[0].y, time: Date.now() };
      } else {
        clickStartRef.current = null;
      }
    });

    map.on("click", (e) => {
      const start = clickStartRef.current;
      if (!start) return;
      
      const dx = Math.abs(e.point.x - start.x);
      const dy = Math.abs(e.point.y - start.y);
      const dt = Date.now() - start.time;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 10 && dt < 500) {
        const features = map.queryRenderedFeatures(e.point);
        const isOnMarkerOrControl = features.some(f => f.layer.id.includes("marker"));
        
        if (!isOnMarkerOrControl && onTapRef.current) {
          onTapRef.current();
        }
        
        if (onClickRef.current) {
          onClickRef.current(e.lngLat.lat, e.lngLat.lng);
        }
      }
      
      clickStartRef.current = null;
    });

    const markReady = () => {
      try {
        map.resize();
        ensureRouteLayers(map);
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
      setMapReady(false);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAttribution]);

  // Draw markers + route whenever stops change AND map is ready
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    let cancelled = false;
    const gen = ++routeGenRef.current;

    const update = async () => {
      map.resize();

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      chargerMarkersRef.current.forEach((m) => m.remove());
      chargerMarkersRef.current = [];

      const ordered = orderStops(stops);
      const coords: [number, number][] = [];
      ordered.forEach((s, i) => {
        const lat = Number(s.lat);
        const lng = Number(s.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        coords.push([lng, lat]);
        const el = document.createElement("div");
        el.style.cssText = `width:28px;height:28px;border-radius:50%;background:${TYPE_COLOR[s.type || "gezi"] || "#0f766e"};color:#fff;display:flex;align-items:center;justify-content:center;font:bold 11px sans-serif;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:pointer;`;
        el.textContent = String(i + 1);
        el.title = s.name;
        markersRef.current.push(
          new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map)
        );
      });

      mockChargers.forEach((c) => {
        if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return;
        const el = document.createElement("div");
        el.style.cssText =
          "min-width:28px;height:28px;padding:0 6px;border-radius:8px;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;font:bold 10px sans-serif;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);";
        el.textContent = "⚡";
        el.title = `${c.name} — örnek / yakında`;
        chargerMarkersRef.current.push(
          new maplibregl.Marker({ element: el }).setLngLat([c.lng, c.lat]).addTo(map)
        );
      });

      // Always show straight line first (guaranteed visible)
      setRouteData(map, coords);

      if (coords.length >= 2) {
        const road = await fetchRoadRoute(coords);
        if (cancelled || gen !== routeGenRef.current) return;
        setRouteData(map, road);
      }

      if (coords.length === 1) {
        map.easeTo({ center: coords[0], zoom: 11 });
      } else if (coords.length > 1) {
        const bounds = coords.reduce(
          (b, c) => b.extend(c),
          new maplibregl.LngLatBounds(coords[0], coords[0])
        );
        map.fitBounds(bounds, { padding: 56, maxZoom: 13, duration: 600 });
      }
    };

    void update();
    return () => {
      cancelled = true;
    };
  }, [stops, mockChargers, mapReady]);

  return (
    <div className={`relative ${className}`} style={{ minHeight: 280 }}>
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {!mapReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100 text-sm text-slate-500">
          Harita yükleniyor…
        </div>
      )}
    </div>
  );
}
