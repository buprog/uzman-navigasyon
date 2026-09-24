"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapView } from "@/components/MapView";
import { BottomSheet } from "@/components/BottomSheet";
import type maplibregl from "maplibre-gl";
import {
  estimateFuelCost,
  mockChargingNearCentroid,
  routeDistanceKm,
} from "@/lib/fuelEstimate";
import type { FuelType } from "@/lib/vehicleCatalog";
import {
  SAMPLE_BRIEFING_VIDEOS,
  formatDuration,
  mockTireServiceOffers,
} from "@/lib/driverAssistStubs";

type Stop = {
  id: string;
  dayIndex: number;
  order: number;
  type: string;
  name: string;
  durationMin: number;
  note: string;
  lat: number;
  lng: number;
  address: string;
  skipped: boolean;
};

type Tour = {
  id: string;
  name: string;
  description: string;
  dayCount: number;
  startName: string;
  endName: string;
  stops: Stop[];
};

type VehicleProfile = {
  vehicleMake: string | null;
  vehicleModel: string | null;
  fuelType: string | null;
  consumptionPer100: number | null;
  preferTolls: boolean;
  odometerKm: number | null;
  tireTreadMm: number | null;
  bloodType: string | null;
};

const TYPES = [
  { value: "gecis", label: "Geçiş" },
  { value: "gezi", label: "Gezi" },
  { value: "yemek", label: "Yemek" },
  { value: "konaklama", label: "Konaklama" },
];

export default function PlanlayiciPage() {
  const { turId } = useParams<{ turId: string }>();
  const router = useRouter();
  const [tour, setTour] = useState<Tour | null>(null);
  const [vehicle, setVehicle] = useState<VehicleProfile | null>(null);
  const [userPlan, setUserPlan] = useState<string>("basic");
  const [activeDay, setActiveDay] = useState(0);
  const [selected, setSelected] = useState<Stop | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [fullScreenMap, setFullScreenMap] = useState(false);
  const [addStopMode, setAddStopMode] = useState(false);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mobileToolbarRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  
  const isPremium = userPlan === "premium";

  const load = useCallback(async () => {
    const res = await fetch(`/api/tours/${turId}`);
    if (res.status === 401) {
      await fetch("/api/auth/demo", { method: "POST" });
      const res2 = await fetch(`/api/tours/${turId}`);
      if (!res2.ok) {
        setMsg("Tur yüklenemedi");
        return;
      }
      const data = await res2.json();
      setTour(data.tour);
      return;
    }
    if (!res.ok) {
      setMsg("Tur yüklenemedi");
      return;
    }
    const data = await res.json();
    setTour(data.tour);
  }, [turId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) setUserPlan(d.user.plan || "basic");
      })
      .catch(() => {});
      
    fetch("/api/account/vehicle")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.vehicle) setVehicle(d.vehicle);
      })
      .catch(() => {});
  }, []);

  const dayStops = useMemo(() => {
    if (!tour) return [];
    return tour.stops
      .filter((s) => s.dayIndex === activeDay)
      .sort((a, b) => a.order - b.order);
  }, [tour, activeDay]);

  const activeStopsForCost = useMemo(() => {
    return dayStops.filter((s) => !s.skipped);
  }, [dayStops]);

  const costEstimate = useMemo(() => {
    if (!vehicle?.fuelType || vehicle.consumptionPer100 == null) return null;
    const distanceKm = routeDistanceKm(activeStopsForCost);
    if (distanceKm <= 0) return null;
    return estimateFuelCost({
      distanceKm,
      fuelType: vehicle.fuelType as FuelType,
      consumptionPer100: vehicle.consumptionPer100,
    });
  }, [vehicle, activeStopsForCost]);

  const mockChargers = useMemo(() => {
    if (vehicle?.fuelType !== "elektrikli") return [];
    return mockChargingNearCentroid(activeStopsForCost);
  }, [vehicle, activeStopsForCost]);

  const tireOffers = useMemo(
    () =>
      mockTireServiceOffers({
        odometerKm: vehicle?.odometerKm,
        tireTreadMm: vehicle?.tireTreadMm,
        vehicleMake: vehicle?.vehicleMake,
      }),
    [vehicle]
  );

  async function saveTourMeta(patch: Partial<Tour>) {
    if (!tour) return;
    setSaving(true);
    await fetch(`/api/tours/${tour.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(false);
    setMsg("Kaydedildi");
    await load();
  }

  async function addStopAt(lat: number, lng: number) {
    if (!tour || !addStopMode) return;
    const res = await fetch(`/api/tours/${tour.id}/stops`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat,
        lng,
        dayIndex: activeDay,
        name: `Durak ${dayStops.length + 1}`,
        type: "gezi",
      }),
    });
    const data = await res.json();
    if (res.ok) {
      await load();
      setSelected(data.stop);
      setDrawerOpen(true);
      setAddStopMode(false);
    }
  }

  function handleMapTap() {
    if (window.innerWidth >= 1024) return;
    setFullScreenMap(!fullScreenMap);
  }

  function handleMapClick(lat: number, lng: number) {
    if (addStopMode) {
      addStopAt(lat, lng);
    }
  }

  useEffect(() => {
    if (!mapRef.current) return;
    
    if (fullScreenMap) {
      setTimeout(() => {
        mapRef.current?.resize();
      }, 320);
    } else {
      mapRef.current.resize();
    }
  }, [fullScreenMap]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (fullScreenMap) {
        document.body.classList.add('planner-fullscreen-mobile');
      } else {
        document.body.classList.remove('planner-fullscreen-mobile');
      }
    }
    return () => {
      if (typeof window !== 'undefined') {
        document.body.classList.remove('planner-fullscreen-mobile');
      }
    };
  }, [fullScreenMap]);

  async function saveStop(form: Partial<Stop>) {
    if (!tour || !selected) return;
    const res = await fetch(`/api/tours/${tour.id}/stops/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setDrawerOpen(false);
      setSelected(null);
      await load();
    }
  }

  async function deleteStop() {
    if (!tour || !selected) return;
    if (!confirm("Durağı sil?")) return;
    await fetch(`/api/tours/${tour.id}/stops/${selected.id}`, { method: "DELETE" });
    setDrawerOpen(false);
    setSelected(null);
    await load();
  }

  async function moveStop(stopId: string, dir: -1 | 1) {
    if (!tour) return;
    const list = [...dayStops];
    const idx = list.findIndex((s) => s.id === stopId);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= list.length) return;
    [list[idx], list[j]] = [list[j], list[idx]];
    const payload = list.map((s, order) => ({
      id: s.id,
      dayIndex: activeDay,
      order,
    }));
    await fetch(`/api/tours/${tour.id}/stops`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stops: payload }),
    });
    await load();
  }

  if (!tour) {
    return <div className="p-8 text-slate-500">Planlayıcı yükleniyor…</div>;
  }

  const days = Array.from({ length: tour.dayCount }, (_, i) => i);

  const planPanelContent = (
    <>
      <div className="border-b border-slate-100 p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            PLAN
          </h2>
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500">Gün</label>
            <input
              type="number"
              min={1}
              className="input !w-14 !py-1 !text-xs"
              value={tour?.dayCount || 1}
              onChange={(e) =>
                setTour(tour ? {
                  ...tour,
                  dayCount: Math.max(1, Number(e.target.value) || 1),
                } : null)
              }
              onBlur={() => tour && saveTourMeta({ dayCount: tour.dayCount })}
            />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {Array.from({ length: tour?.dayCount || 1 }, (_, i) => i).map((d) => (
            <button
              key={d}
              onClick={() => setActiveDay(d)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                activeDay === d
                  ? "bg-teal-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Gün {d + 1}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <p className="text-xs text-slate-400 flex-1">
            {addStopMode ? "Haritaya dokunarak durak ekleyin" : "Durak eklemek için modu aktifleştirin"}
          </p>
          <button
            onClick={() => setAddStopMode(!addStopMode)}
            className={`text-xs rounded px-2 py-1 font-medium transition ${
              addStopMode
                ? "bg-teal-700 text-white"
                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            }`}
          >
            {addStopMode ? "İptal" : "Durak ekle"}
          </button>
        </div>
      </div>

      {/* Cost estimate section */}
      <div className="border-b border-slate-100 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Yol maliyeti{" "}
          <span className="normal-case tracking-normal rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold text-amber-800">
            örnek fiyat
          </span>
        </h3>
        {!vehicle?.fuelType || vehicle.consumptionPer100 == null ? (
          <p className="mt-1 text-xs text-slate-500">
            Araç profili eksik.{" "}
            <Link href="/ayarlar" className="text-teal-700 underline">
              Ayarlar
            </Link>
            'dan marka, yakıt ve tüketim girin.
          </p>
        ) : costEstimate ? (
          <div className="mt-1 space-y-0.5 text-sm">
            <p>
              Mesafe (kuş bakışı):{" "}
              <strong>{costEstimate.distanceKm.toFixed(1)} km</strong>
            </p>
            <p>
              Tüketim: {costEstimate.amountUsed.toFixed(2)}{" "}
              {costEstimate.unit} (
              {costEstimate.consumptionPer100} {costEstimate.unit}/100 km)
            </p>
            <p>
              Tahmini maliyet:{" "}
              <strong className="text-teal-800">
                ₺{costEstimate.costTry.toFixed(0)}
              </strong>
            </p>
            <p className="text-[10px] text-slate-400">
              {costEstimate.unitLabel} · {costEstimate.note}
            </p>
            {vehicle.preferTolls === false && (
              <p className="text-[10px] text-amber-700">
                Paralı yol tercihi kapalı (ücret API'si yok).
              </p>
            )}
          </div>
        ) : (
          <p className="mt-1 text-xs text-slate-500">
            Bu günde en az 2 durak gerekli.
          </p>
        )}
        {vehicle?.fuelType === "elektrikli" && (
          <p className="mt-2 rounded bg-blue-50 px-2 py-1 text-[10px] text-blue-800">
            Elektrikli: haritada örnek şarj pinleri (örnek / yakında) —
            canlı istasyon verisi değil.
          </p>
        )}
      </div>

      {/* Premium features */}
      <div className="border-b border-slate-100 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Arama özellikleri
        </h3>
        <ul className="mt-2 space-y-2">
          <li className={`rounded-lg border p-2 text-xs ${isPremium ? "border-teal-200 bg-teal-50/30" : "border-slate-200 bg-slate-50 opacity-60"}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {!isPremium && <span className="text-slate-400">🔒</span>}
                <span className={isPremium ? "font-medium text-teal-900" : "text-slate-600"}>
                  Otomobil servislerini bulma
                </span>
              </div>
              {isPremium && <span className="badge-premium !text-[9px] !px-1.5 !py-0.5">Premium</span>}
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              Rota üzerindeki servisleri haritada görüntüle
            </p>
            {!isPremium && (
              <button
                onClick={() => router.push("/auth")}
                className="mt-2 w-full rounded bg-slate-700 px-2 py-1 text-[10px] font-medium text-white hover:bg-slate-800 transition"
              >
                Aktif et
              </button>
            )}
          </li>
          
          <li className={`rounded-lg border p-2 text-xs ${isPremium ? "border-teal-200 bg-teal-50/30" : "border-slate-200 bg-slate-50 opacity-60"}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {!isPremium && <span className="text-slate-400">🔒</span>}
                <span className={isPremium ? "font-medium text-teal-900" : "text-slate-600"}>
                  Otel bulma
                </span>
              </div>
              {isPremium && <span className="badge-premium !text-[9px] !px-1.5 !py-0.5">Premium</span>}
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              Güzergâh yakınındaki otelleri ara ve ekle
            </p>
            {!isPremium && (
              <button
                onClick={() => router.push("/auth")}
                className="mt-2 w-full rounded bg-slate-700 px-2 py-1 text-[10px] font-medium text-white hover:bg-slate-800 transition"
              >
                Aktif et
              </button>
            )}
          </li>
          
          <li className={`rounded-lg border p-2 text-xs ${isPremium ? "border-teal-200 bg-teal-50/30" : "border-slate-200 bg-slate-50 opacity-60"}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {!isPremium && <span className="text-slate-400">🔒</span>}
                <span className={isPremium ? "font-medium text-teal-900" : "text-slate-600"}>
                  Restoran bulma
                </span>
              </div>
              {isPremium && <span className="badge-premium !text-[9px] !px-1.5 !py-0.5">Premium</span>}
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              Yol üzerindeki restoranları keşfet
            </p>
            {!isPremium && (
              <button
                onClick={() => router.push("/auth")}
                className="mt-2 w-full rounded bg-slate-700 px-2 py-1 text-[10px] font-medium text-white hover:bg-slate-800 transition"
              >
                Aktif et
              </button>
            )}
          </li>
          
          <li className={`rounded-lg border p-2 text-xs ${isPremium ? "border-teal-200 bg-teal-50/30" : "border-slate-200 bg-slate-50 opacity-60"}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {!isPremium && <span className="text-slate-400">🔒</span>}
                <span className={isPremium ? "font-medium text-teal-900" : "text-slate-600"}>
                  Çevredeki aktiviteleri bulma
                </span>
              </div>
              {isPremium && <span className="badge-premium !text-[9px] !px-1.5 !py-0.5">Premium</span>}
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              Rotanıza yakın turistik aktiviteler
            </p>
            {!isPremium && (
              <button
                onClick={() => router.push("/auth")}
                className="mt-2 w-full rounded bg-slate-700 px-2 py-1 text-[10px] font-medium text-white hover:bg-slate-800 transition"
              >
                Aktif et
              </button>
            )}
          </li>
        </ul>
      </div>
      
      {/* Emergency button */}
      <div className="border-b border-slate-100 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Acil durum
        </h3>
        <button
          type="button"
          className="mt-2 w-full rounded-lg border-2 border-red-500 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 transition"
          onClick={() => {
            if (confirm("En yakın acil servisleri haritada göster?")) {
              setMsg("Acil servisler: 112'yi arayın. Harita özelliği yakında.");
            }
          }}
        >
          🚨 Acil buton (112)
        </button>
        <p className="mt-2 text-[10px] text-slate-500">
          Tüm kullanıcılar için ücretsiz. En yakın acil servisler.
        </p>
      </div>

      {/* Suggestions stub */}
      <div className="border-b border-slate-100 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Öneriler{" "}
          <span className="normal-case tracking-normal rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold text-amber-800">
            örnek / yakında
          </span>
        </h3>
        <ul className="mt-1 space-y-1">
          {tireOffers.slice(0, 2).map((o) => (
            <li key={o.id} className="text-[11px] text-slate-600">
              <span className="font-medium text-slate-800">{o.title}</span>
              <span className="ml-1 rounded bg-amber-100 px-1 text-[9px] text-amber-800">
                {o.badge}
              </span>
            </li>
          ))}
        </ul>
        <Link href="/ayarlar" className="mt-1 inline-block text-[10px] text-teal-700">
          Km / lastik ayarla →
        </Link>
      </div>

      <ul className="flex-1 space-y-2 overflow-y-auto p-3">
        {dayStops.map((s, i) => (
          <li
            key={s.id}
            className={`rounded-lg border p-2 text-sm ${
              s.skipped ? "opacity-50" : ""
            } ${
              selected?.id === s.id
                ? "border-teal-500 bg-teal-50"
                : "border-slate-200"
            }`}
          >
            <button
              className="w-full text-left"
              onClick={() => {
                setSelected(s);
                setDrawerOpen(true);
              }}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-700 text-xs text-white">
                  {i + 1}
                </span>
                <span className="font-medium">{s.name}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {TYPES.find((t) => t.value === s.type)?.label || s.type} ·{" "}
                {s.durationMin} dk
              </p>
            </button>
            <div className="mt-1 flex gap-1">
              <button
                className="text-xs text-slate-500 hover:text-teal-700"
                onClick={() => moveStop(s.id, -1)}
              >
                ↑
              </button>
              <button
                className="text-xs text-slate-500 hover:text-teal-700"
                onClick={() => moveStop(s.id, 1)}
              >
                ↓
              </button>
            </div>
          </li>
        ))}
        {dayStops.length === 0 && (
          <li className="text-sm text-slate-400">Bu günde durak yok.</li>
        )}
      </ul>
    </>
  );

  return (
    <div className="flex h-[calc(100dvh-57px)] lg:h-[calc(100vh-57px)] flex-col planner-container">
      {/* Mobile toolbar - hide when fullScreenMap */}
      <div 
        ref={mobileToolbarRef}
        className={`lg:hidden transition-transform duration-300 ${fullScreenMap ? "-translate-y-full absolute inset-x-0 top-0 z-20" : "relative z-10"}`}
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 text-sm">
          <Link href="/turlar" className="text-slate-500 hover:text-teal-800 shrink-0">
            ← <span className="hidden sm:inline">Turlarım</span>
          </Link>
          <input
            className="input !w-auto min-w-[120px] flex-1 font-semibold sm:min-w-[200px]"
            value={tour?.name || ""}
            onChange={(e) => setTour(tour ? { ...tour, name: e.target.value } : null)}
            onBlur={() => tour && saveTourMeta({ name: tour.name })}
          />
          <button
            className="btn-primary !py-1.5 shrink-0"
            disabled={saving}
            onClick={() =>
              tour && saveTourMeta({
                name: tour.name,
                description: tour.description,
                dayCount: tour.dayCount,
              })
            }
          >
            {saving ? "…" : "Kaydet"}
          </button>
          <Link href={`/turlar/${tour?.id}/kalkislar`} className="btn-secondary !py-1.5 shrink-0">
            <span className="hidden sm:inline">Kalkışlar /</span> Paylaş
          </Link>
          <Link
            href={`/navigasyon/${tour?.id}`}
            className="btn-primary !py-1.5 !bg-blue-600 hover:!bg-blue-700 shrink-0"
          >
            🧭 <span className="hidden sm:inline">Navigasyonu Başlat</span>
          </Link>
          <a
            href="tel:112"
            className="btn-secondary !py-1.5 !bg-red-600 !text-white hover:!bg-red-700 shrink-0"
            title="Acil Durum"
          >
            <span className="hidden sm:inline">Acil:</span> 112
          </a>
          <button className="btn-secondary !py-1.5 hidden sm:inline-block shrink-0" onClick={() => window.print()}>
            Yazdır
          </button>
          <button
            className="btn-secondary !py-1.5 hidden md:inline-block shrink-0"
            onClick={() => setBriefingOpen(true)}
            title="Örnek brifing listesi — video CDN yok"
          >
            Yola çıkmadan izle{" "}
            <span className="text-[10px] opacity-70">(örnek)</span>
          </button>
          {msg && <span className="text-xs text-teal-700 w-full sm:w-auto">{msg}</span>}
        </div>
      </div>

      {/* Desktop toolbar */}
      <div className="hidden lg:flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 text-sm">
        <Link href="/turlar" className="text-slate-500 hover:text-teal-800 shrink-0">
          ← Turlarım
        </Link>
        <input
          className="input !w-auto min-w-[120px] flex-1 font-semibold sm:min-w-[200px]"
          value={tour?.name || ""}
          onChange={(e) => setTour(tour ? { ...tour, name: e.target.value } : null)}
          onBlur={() => tour && saveTourMeta({ name: tour.name })}
        />
        <button
          className="btn-primary !py-1.5 shrink-0"
          disabled={saving}
          onClick={() =>
            tour && saveTourMeta({
              name: tour.name,
              description: tour.description,
              dayCount: tour.dayCount,
            })
          }
        >
          {saving ? "…" : "Kaydet"}
        </button>
        <Link href={`/turlar/${tour?.id}/kalkislar`} className="btn-secondary !py-1.5 shrink-0">
          Kalkışlar / Paylaş
        </Link>
        <Link
          href={`/navigasyon/${tour?.id}`}
          className="btn-primary !py-1.5 !bg-blue-600 hover:!bg-blue-700 shrink-0"
        >
          🧭 Navigasyonu Başlat
        </Link>
        <a
          href="tel:112"
          className="btn-secondary !py-1.5 !bg-red-600 !text-white hover:!bg-red-700 shrink-0"
          title="Acil Durum"
        >
          Acil: 112
        </a>
        <button className="btn-secondary !py-1.5 shrink-0" onClick={() => window.print()}>
          Yazdır
        </button>
        <button
          className="btn-secondary !py-1.5 shrink-0"
          onClick={() => setBriefingOpen(true)}
          title="Örnek brifing listesi — video CDN yok"
        >
          Yola çıkmadan izle{" "}
          <span className="text-[10px] opacity-70">(örnek)</span>
        </button>
        {msg && <span className="text-xs text-teal-700">{msg}</span>}
      </div>

      {/* Main content - fixed structure for desktop */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row relative">
        {/* Desktop: side panel */}
        <aside className="hidden lg:flex w-80 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white print:w-full print:flex">
          {planPanelContent}
        </aside>

        {/* Mobile: Bottom sheet */}
        <div className="lg:hidden">
          <BottomSheet fullScreen={fullScreenMap} toolbarRef={mobileToolbarRef}>
            {planPanelContent}
          </BottomSheet>
        </div>

        {/* Map - full viewport on mobile, flex-1 on desktop */}
        <div className="absolute inset-0 lg:relative lg:flex-1 print:hidden">
          <MapView
            stops={tour ? [...tour.stops]
              .filter((s) => !s.skipped)
              .sort((a, b) => a.dayIndex - b.dayIndex || a.order - b.order) : []}
            onMapClick={handleMapClick}
            onMapTap={handleMapTap}
            mapRef={mapRef}
            className="h-full w-full"
            mockChargers={mockChargers}
          />
        </div>

        {/* Floating 112 button (mobile full-screen mode) */}
        {fullScreenMap && (
          <a
            href="tel:112"
            className="fixed z-40 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition lg:hidden"
            style={{ 
              top: 'max(1rem, env(safe-area-inset-top))',
              right: 'max(1rem, env(safe-area-inset-right))'
            }}
            title="Acil Durum"
          >
            112
          </a>
        )}
      </div>

      {/* Briefing modal */}
      {briefingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Yola çıkmadan izle</h3>
              <button
                className="text-slate-400 hover:text-slate-700"
                onClick={() => setBriefingOpen(false)}
              >
                ✕
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Örnek / yakında: kısa brifing listesi — gerçek video CDN yok.
              Kartlar yer tutucu; canlı yayın iddiası yok.
            </p>
            <ul className="mt-4 space-y-2">
              {SAMPLE_BRIEFING_VIDEOS.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded bg-slate-200 text-xs text-slate-500">
                    ▶ {formatDuration(v.durationSec)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{v.title}</p>
                    <p className="text-[10px] uppercase text-slate-400">
                      {v.topic} · yakında
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary !py-1 !text-xs !opacity-50"
                    disabled
                  >
                    İzle
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Stop drawer */}
      {drawerOpen && selected && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="font-semibold">Durak düzenle</h3>
            <button
              className="text-slate-400 hover:text-slate-700"
              onClick={() => {
                setDrawerOpen(false);
                setSelected(null);
              }}
            >
              ✕
            </button>
          </div>
          <form
            className="space-y-3 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              saveStop({
                name: String(fd.get("name")),
                type: String(fd.get("type")),
                durationMin: Number(fd.get("durationMin")),
                note: String(fd.get("note")),
                address: String(fd.get("address")),
                dayIndex: Number(fd.get("dayIndex")),
                lat: Number(fd.get("lat")),
                lng: Number(fd.get("lng")),
                skipped: fd.get("skipped") === "on",
              });
            }}
          >
            <div>
              <label className="label">Ad</label>
              <input name="name" defaultValue={selected.name} className="input" required />
            </div>
            <div>
              <label className="label">Tür</label>
              <select name="type" defaultValue={selected.type} className="input">
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Süre (dk)</label>
                <input
                  name="durationMin"
                  type="number"
                  defaultValue={selected.durationMin}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Gün</label>
                <select name="dayIndex" defaultValue={selected.dayIndex} className="input">
                  {Array.from({ length: tour?.dayCount || 1 }, (_, i) => i).map((d) => (
                    <option key={d} value={d}>
                      Gün {d + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Adres</label>
              <input name="address" defaultValue={selected.address} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Enlem</label>
                <input
                  name="lat"
                  type="number"
                  step="any"
                  defaultValue={selected.lat}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Boylam</label>
                <input
                  name="lng"
                  type="number"
                  step="any"
                  defaultValue={selected.lng}
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="label">Not</label>
              <textarea name="note" rows={3} defaultValue={selected.note} className="input" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input name="skipped" type="checkbox" defaultChecked={selected.skipped} />
              Atlama (skip)
            </label>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="btn-primary flex-1">
                Kaydet
              </button>
              <button type="button" onClick={deleteStop} className="btn-danger">
                Sil
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

