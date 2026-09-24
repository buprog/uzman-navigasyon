"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapView } from "@/components/MapView";
import Link from "next/link";

type LocationInfo = {
  lat: number;
  lng: number;
  il: string;
  ilce: string;
};

type ServiceResult = {
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

type ChargerResult = {
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

type POIResult = {
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

type Category = "restaurant" | "hotel" | "entertainment" | "health" | "service" | "charging";

const CATEGORY_LABELS: Record<Category, string> = {
  restaurant: "Lokanta",
  hotel: "Otel",
  entertainment: "Eğlence",
  health: "Sağlık",
  service: "Servis",
  charging: "Şarj",
};

export default function CevrmdePage() {
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [vehicleBrand, setVehicleBrand] = useState<string | null>(null);
  
  // Category results
  const [restaurants, setRestaurants] = useState<POIResult[]>([]);
  const [hotels, setHotels] = useState<POIResult[]>([]);
  const [entertainment, setEntertainment] = useState<POIResult[]>([]);
  const [health, setHealth] = useState<POIResult[]>([]);
  const [services, setServices] = useState<ServiceResult[]>([]);
  const [chargers, setChargers] = useState<ChargerResult[]>([]);
  
  // Accordion state (multi-open supported)
  const [openCategories, setOpenCategories] = useState<Set<Category>>(new Set());
  
  // Emergency health filter
  const [emergencyHealthOnly, setEmergencyHealthOnly] = useState(false);
  
  // Emergency/arıza mode
  const [emergencyMode, setEmergencyMode] = useState(false);

  // Load vehicle info
  useEffect(() => {
    fetch("/api/account/vehicle")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.vehicle?.vehicleMake) {
          setVehicleBrand(d.vehicle.vehicleMake);
        }
      })
      .catch(() => {});
  }, []);

  const getCurrentLocation = useCallback(async () => {
    setLoading(true);
    setError("");

    if (!navigator.geolocation) {
      setError("Tarayıcınız konum hizmetlerini desteklemiyor");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // Reverse geocode
        try {
          const geoRes = await fetch(`/api/geo/location?lat=${lat}&lng=${lng}`);
          const geoData = await geoRes.json();
          
          setLocation({
            lat,
            lng,
            il: geoData.il || "Bilinmeyen",
            ilce: geoData.ilce || "Bilinmeyen",
          });
        } catch {
          setLocation({
            lat,
            lng,
            il: "Bilinmeyen",
            ilce: "Bilinmeyen",
          });
        }

        setLoading(false);
      },
      (err) => {
        setError(`Konum alınamadı: ${err.message}`);
        setLoading(false);
      }
    );
  }, []);

  const loadCategoryData = useCallback(
    async (category: Category) => {
      if (!location) return;

      try {
        switch (category) {
          case "restaurant": {
            const res = await fetch(
              `/api/pois/nearest?lat=${location.lat}&lng=${location.lng}&category=restaurant&limit=10`
            );
            const data = await res.json();
            setRestaurants(data.nearest || []);
            break;
          }
          case "hotel": {
            const res = await fetch(
              `/api/pois/nearest?lat=${location.lat}&lng=${location.lng}&category=hotel&limit=10`
            );
            const data = await res.json();
            setHotels(data.nearest || []);
            break;
          }
          case "entertainment": {
            const res = await fetch(
              `/api/pois/nearest?lat=${location.lat}&lng=${location.lng}&category=entertainment&limit=10`
            );
            const data = await res.json();
            setEntertainment(data.nearest || []);
            break;
          }
          case "health": {
            const res = await fetch(
              `/api/pois/nearest?lat=${location.lat}&lng=${location.lng}&category=health&emergencyOnly=${emergencyHealthOnly}&limit=10`
            );
            const data = await res.json();
            setHealth(data.nearest || []);
            break;
          }
          case "service": {
            if (!vehicleBrand) {
              setServices([]);
              return;
            }
            const res = await fetch(
              `/api/services/nearest?lat=${location.lat}&lng=${location.lng}&brand=${vehicleBrand}&limit=5`
            );
            const data = await res.json();
            setServices(data.nearest || []);
            break;
          }
          case "charging": {
            const res = await fetch(
              `/api/charging/nearest?lat=${location.lat}&lng=${location.lng}&limit=5`
            );
            const data = await res.json();
            setChargers(data.nearest || []);
            break;
          }
        }
      } catch (err) {
        console.error(`${category} yüklenemedi:`, err);
      }
    },
    [location, vehicleBrand, emergencyHealthOnly]
  );

  const toggleCategory = (category: Category) => {
    const newOpen = new Set(openCategories);
    if (newOpen.has(category)) {
      newOpen.delete(category);
    } else {
      newOpen.add(category);
      // Load data when opening
      loadCategoryData(category);
    }
    setOpenCategories(newOpen);
  };

  // Reload health when emergency filter changes
  useEffect(() => {
    if (openCategories.has("health") && location) {
      loadCategoryData("health");
    }
  }, [emergencyHealthOnly, location, loadCategoryData, openCategories]);

  const shareLocation = async () => {
    if (!location) return;

    const text = `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;

    // Try Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Konumum",
          text: `Konum: ${text} (${location.il}, ${location.ilce})`,
        });
        return;
      } catch {}
    }

    // Fallback: clipboard
    try {
      await navigator.clipboard.writeText(text);
      alert("Koordinatlar kopyalandı: " + text);
    } catch {
      alert("Paylaşım başarısız");
    }
  };

  const allPOIs = useMemo(() => {
    const list: Array<POIResult & { color: string }> = [];
    
    if (openCategories.has("restaurant")) {
      restaurants.forEach((p) => list.push({ ...p, color: "orange" }));
    }
    if (openCategories.has("hotel")) {
      hotels.forEach((p) => list.push({ ...p, color: "blue" }));
    }
    if (openCategories.has("entertainment")) {
      entertainment.forEach((p) => list.push({ ...p, color: "purple" }));
    }
    if (openCategories.has("health")) {
      health.forEach((p) => list.push({ ...p, color: p.isEmergency ? "red" : "green" }));
    }
    
    return list;
  }, [openCategories, restaurants, hotels, entertainment, health]);

  const mapStops = useMemo(() => {
    const stops: Array<{ lat: number; lng: number; name: string }> = [];
    
    allPOIs.forEach((poi) => {
      stops.push({ lat: poi.lat, lng: poi.lng, name: poi.name });
    });
    
    if (openCategories.has("service")) {
      services.forEach((s) => {
        stops.push({ lat: s.lat, lng: s.lng, name: s.name });
      });
    }
    
    if (openCategories.has("charging")) {
      chargers.forEach((c) => {
        stops.push({ lat: c.lat, lng: c.lng, name: c.name });
      });
    }
    
    return stops;
  }, [allPOIs, openCategories, services, chargers]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="text-sm text-slate-500 hover:text-teal-800">
            ← Ana sayfa
          </Link>
          <h1 className="text-lg font-semibold">Çevremde ne var</h1>
          <div className="w-20" />
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-4">
        {/* Get location button */}
        {!location && (
          <div className="card max-w-md">
            <h2 className="text-xl font-semibold">Konumunuzu belirleyin</h2>
            <p className="mt-2 text-sm text-slate-600">
              Yakınınızdaki servisleri, şarj istasyonlarını, lokantaları, otelleri ve sağlık
              noktalarını görebilmek için konumunuzu paylaşın.
            </p>
            <button
              onClick={getCurrentLocation}
              disabled={loading}
              className="btn-primary mt-4 w-full"
            >
              {loading ? "Konum alınıyor..." : "📍 Konumumu Al"}
            </button>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        )}

        {location && (
          <div className="space-y-4">
            {/* Emergency/Arıza mode toggle */}
            <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <div>
                <h3 className="font-semibold text-red-900">Acil durum / Arıza modu</h3>
                <p className="text-xs text-red-700">
                  Açıkken konum kartı ön planda, listeleme arka planda
                </p>
              </div>
              <button
                onClick={() => setEmergencyMode(!emergencyMode)}
                className={`rounded-lg px-4 py-2 font-semibold transition-colors ${
                  emergencyMode
                    ? "bg-red-600 text-white"
                    : "bg-white text-red-600 border border-red-300"
                }`}
              >
                {emergencyMode ? "AÇIK" : "KAPALI"}
              </button>
            </div>

            {/* Location card */}
            <div
              className={`card ${
                emergencyMode
                  ? "border-red-400 bg-red-50 shadow-xl ring-4 ring-red-200"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Mevcut Konumunuz</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    <strong>{location.il}</strong> / {location.ilce}
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </p>
                </div>
                <button
                  onClick={shareLocation}
                  className="btn-primary !py-2 whitespace-nowrap"
                >
                  📤 Paylaş
                </button>
              </div>
              {emergencyMode && (
                <p className="mt-3 rounded border border-red-300 bg-white px-3 py-2 text-sm text-red-800">
                  <strong>Arıza / Acil:</strong> Paylaş butonuna basarak konumunuzu
                  anında paylaşabilirsiniz. Koordinatlar otomatik kopyalanır.
                </p>
              )}
            </div>

            {/* Map */}
            <div className={emergencyMode ? "opacity-50" : ""}>
              <div className="card p-0 overflow-hidden">
                <MapView
                  stops={mapStops}
                  className="h-96 w-full"
                  userLocation={location}
                />
              </div>
            </div>

            {/* Categories accordion */}
            <div className={emergencyMode ? "opacity-40" : ""}>
              <h3 className="mb-3 text-lg font-semibold">Kategoriler</h3>
              <div className="space-y-2">
                {/* Restaurant */}
                <div className="card !p-0 overflow-hidden">
                  <button
                    onClick={() => toggleCategory("restaurant")}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span className="font-semibold">🍽️ Lokanta</span>
                    <span className="text-slate-400">
                      {openCategories.has("restaurant") ? "▼" : "▶"}
                    </span>
                  </button>
                  {openCategories.has("restaurant") && (
                    <div className="border-t border-slate-200 px-4 py-3">
                      {restaurants.length === 0 ? (
                        <p className="text-sm text-slate-500">Lokanta bulunamadı</p>
                      ) : (
                        <ul className="space-y-2">
                          {restaurants.map((r) => (
                            <li key={r.id} className="text-sm">
                              <strong>{r.name}</strong>
                              <p className="text-xs text-slate-600">{r.address}</p>
                              <p className="text-xs text-slate-500">
                                {r.distanceKm.toFixed(1)} km · {r.phone}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Hotel */}
                <div className="card !p-0 overflow-hidden">
                  <button
                    onClick={() => toggleCategory("hotel")}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span className="font-semibold">🏨 Otel</span>
                    <span className="text-slate-400">
                      {openCategories.has("hotel") ? "▼" : "▶"}
                    </span>
                  </button>
                  {openCategories.has("hotel") && (
                    <div className="border-t border-slate-200 px-4 py-3">
                      {hotels.length === 0 ? (
                        <p className="text-sm text-slate-500">Otel bulunamadı</p>
                      ) : (
                        <ul className="space-y-2">
                          {hotels.map((h) => (
                            <li key={h.id} className="text-sm">
                              <strong>{h.name}</strong>
                              <p className="text-xs text-slate-600">{h.address}</p>
                              <p className="text-xs text-slate-500">
                                {h.distanceKm.toFixed(1)} km · {h.phone}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Entertainment */}
                <div className="card !p-0 overflow-hidden">
                  <button
                    onClick={() => toggleCategory("entertainment")}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span className="font-semibold">🎭 Eğlence</span>
                    <span className="text-slate-400">
                      {openCategories.has("entertainment") ? "▼" : "▶"}
                    </span>
                  </button>
                  {openCategories.has("entertainment") && (
                    <div className="border-t border-slate-200 px-4 py-3">
                      {entertainment.length === 0 ? (
                        <p className="text-sm text-slate-500">Eğlence yeri bulunamadı</p>
                      ) : (
                        <ul className="space-y-2">
                          {entertainment.map((e) => (
                            <li key={e.id} className="text-sm">
                              <strong>{e.name}</strong>
                              <p className="text-xs text-slate-600">{e.address}</p>
                              <p className="text-xs text-slate-500">
                                {e.distanceKm.toFixed(1)} km · {e.phone}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Health */}
                <div className="card !p-0 overflow-hidden">
                  <button
                    onClick={() => toggleCategory("health")}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span className="font-semibold">🏥 Sağlık</span>
                    <span className="text-slate-400">
                      {openCategories.has("health") ? "▼" : "▶"}
                    </span>
                  </button>
                  {openCategories.has("health") && (
                    <div className="border-t border-slate-200 px-4 py-3">
                      <label className="mb-3 flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={emergencyHealthOnly}
                          onChange={(e) => setEmergencyHealthOnly(e.target.checked)}
                        />
                        <span className="font-medium text-red-700">
                          Sadece acil sağlık (112 / ER)
                        </span>
                      </label>
                      {health.length === 0 ? (
                        <p className="text-sm text-slate-500">Sağlık noktası bulunamadı</p>
                      ) : (
                        <ul className="space-y-2">
                          {health.map((h) => (
                            <li
                              key={h.id}
                              className={`text-sm ${
                                h.isEmergency ? "rounded border border-red-200 bg-red-50 p-2" : ""
                              }`}
                            >
                              <strong>{h.name}</strong>
                              {h.isEmergency && (
                                <span className="ml-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                  ACİL
                                </span>
                              )}
                              <p className="text-xs text-slate-600">{h.address}</p>
                              <p className="text-xs text-slate-500">
                                {h.distanceKm.toFixed(1)} km · {h.phone}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Service */}
                <div className="card !p-0 overflow-hidden">
                  <button
                    onClick={() => toggleCategory("service")}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span className="font-semibold">
                      🔧 Servis
                      {vehicleBrand && (
                        <span className="ml-2 text-xs text-slate-500">({vehicleBrand})</span>
                      )}
                    </span>
                    <span className="text-slate-400">
                      {openCategories.has("service") ? "▼" : "▶"}
                    </span>
                  </button>
                  {openCategories.has("service") && (
                    <div className="border-t border-slate-200 px-4 py-3">
                      {!vehicleBrand ? (
                        <p className="text-sm text-slate-500">
                          Araç markası belirlenmemiş.{" "}
                          <Link href="/ayarlar" className="text-teal-700 underline">
                            Ayarlar
                          </Link>
                        </p>
                      ) : services.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          {vehicleBrand} için yetkili servis bulunamadı
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {services.map((s) => (
                            <li key={s.id} className="text-sm">
                              <strong>{s.name}</strong>
                              <p className="text-xs text-slate-600">{s.address}</p>
                              <p className="text-xs text-slate-500">
                                {s.distanceKm.toFixed(1)} km · {s.phone}
                                {s.website && (
                                  <a
                                    href={s.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-2 text-teal-700 underline"
                                  >
                                    web
                                  </a>
                                )}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Charging */}
                <div className="card !p-0 overflow-hidden">
                  <button
                    onClick={() => toggleCategory("charging")}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span className="font-semibold">⚡ Şarj</span>
                    <span className="text-slate-400">
                      {openCategories.has("charging") ? "▼" : "▶"}
                    </span>
                  </button>
                  {openCategories.has("charging") && (
                    <div className="border-t border-slate-200 px-4 py-3">
                      {chargers.length === 0 ? (
                        <p className="text-sm text-slate-500">Şarj istasyonu bulunamadı</p>
                      ) : (
                        <ul className="space-y-2">
                          {chargers.map((c) => (
                            <li key={c.id} className="text-sm">
                              <strong>{c.name}</strong>
                              <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                                {c.network}
                              </span>
                              <p className="text-xs text-slate-600">{c.address}</p>
                              <p className="text-xs text-slate-500">
                                {c.distanceKm.toFixed(1)} km · {c.connectors}
                                {c.phone && ` · ${c.phone}`}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
