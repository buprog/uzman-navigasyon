"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlanBadge } from "@/components/PlanBadge";
import {
  BLOOD_TYPES,
  FUEL_TYPES,
  VEHICLE_CATALOG,
  findModelDefaults,
  type FuelType,
} from "@/lib/vehicleCatalog";
import { mockTireServiceOffers } from "@/lib/driverAssistStubs";

type User = {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
  plan: string;
};

type VehicleForm = {
  vehicleMake: string;
  vehicleModel: string;
  fuelType: FuelType | "";
  consumptionPer100: string;
  bloodType: string;
  emergencyPhone: string;
  preferTolls: boolean;
  odometerKm: string;
  tireTreadMm: string;
  autoStopNotifications: boolean;
};

const emptyVehicle: VehicleForm = {
  vehicleMake: "",
  vehicleModel: "",
  fuelType: "",
  consumptionPer100: "",
  bloodType: "",
  emergencyPhone: "",
  preferTolls: true,
  odometerKm: "",
  tireTreadMm: "",
  autoStopNotifications: true,
};

export default function AyarlarPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [msg, setMsg] = useState("");
  const [vehicleMsg, setVehicleMsg] = useState("");
  const [vehicle, setVehicle] = useState<VehicleForm>(emptyVehicle);
  const [savingVehicle, setSavingVehicle] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (r.status === 401) router.push("/giris");
        return r.json();
      })
      .then((d) => setUser(d.user));

    fetch("/api/account/vehicle")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.vehicle) return;
        const v = d.vehicle;
        setVehicle({
          vehicleMake: v.vehicleMake || "",
          vehicleModel: v.vehicleModel || "",
          fuelType: (v.fuelType as FuelType) || "",
          consumptionPer100:
            v.consumptionPer100 != null ? String(v.consumptionPer100) : "",
          bloodType: v.bloodType || "",
          emergencyPhone: v.emergencyPhone || "",
          preferTolls: v.preferTolls !== false,
          odometerKm: v.odometerKm != null ? String(v.odometerKm) : "",
          tireTreadMm: v.tireTreadMm != null ? String(v.tireTreadMm) : "",
          autoStopNotifications: v.autoStopNotifications !== false,
        });
      });
  }, [router]);

  const models = useMemo(() => {
    if (!vehicle.vehicleMake) return [];
    return (
      VEHICLE_CATALOG.find((e) => e.make === vehicle.vehicleMake)?.models ?? []
    );
  }, [vehicle.vehicleMake]);

  const offers = useMemo(
    () =>
      mockTireServiceOffers({
        odometerKm:
          vehicle.odometerKm === "" ? null : Number(vehicle.odometerKm),
        tireTreadMm:
          vehicle.tireTreadMm === "" ? null : Number(vehicle.tireTreadMm),
        vehicleMake: vehicle.vehicleMake || null,
      }),
    [vehicle.odometerKm, vehicle.tireTreadMm, vehicle.vehicleMake]
  );

  function onMakeChange(make: string) {
    setVehicle((prev) => ({
      ...prev,
      vehicleMake: make,
      vehicleModel: "",
      fuelType: "",
      consumptionPer100: "",
    }));
  }

  function onModelChange(model: string) {
    const defaults = findModelDefaults(vehicle.vehicleMake, model);
    setVehicle((prev) => ({
      ...prev,
      vehicleModel: model,
      fuelType: defaults?.defaultFuel ?? prev.fuelType,
      consumptionPer100: defaults
        ? String(defaults.defaultConsumption)
        : prev.consumptionPer100,
    }));
  }

  async function setPlan(plan: "basic" | "premium") {
    const res = await fetch("/api/account/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (res.ok) {
      setUser(data.user);
      setMsg(data.message);
    }
  }

  async function saveVehicle(e: React.FormEvent) {
    e.preventDefault();
    setSavingVehicle(true);
    setVehicleMsg("");
    const res = await fetch("/api/account/vehicle", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicleMake: vehicle.vehicleMake || null,
        vehicleModel: vehicle.vehicleModel || null,
        fuelType: vehicle.fuelType || null,
        consumptionPer100:
          vehicle.consumptionPer100 === ""
            ? null
            : Number(vehicle.consumptionPer100),
        bloodType: vehicle.bloodType || null,
        emergencyPhone: vehicle.emergencyPhone || null,
        preferTolls: vehicle.preferTolls,
        odometerKm:
          vehicle.odometerKm === "" ? null : Number(vehicle.odometerKm),
        tireTreadMm:
          vehicle.tireTreadMm === "" ? null : Number(vehicle.tireTreadMm),
        autoStopNotifications: vehicle.autoStopNotifications,
      }),
    });
    const data = await res.json();
    setSavingVehicle(false);
    if (res.ok) {
      setVehicleMsg(data.message || "Kaydedildi.");
    } else {
      setVehicleMsg(data.error || "Kayıt başarısız.");
    }
  }

  if (!user) return <div className="p-8 text-slate-500">Yükleniyor…</div>;

  const isElectric = vehicle.fuelType === "elektrikli";

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold">Hesap ayarları</h1>
      <div className="card mt-6 space-y-3">
        <p>
          <span className="text-sm text-slate-500">Ad:</span> {user.name}
        </p>
        <p>
          <span className="text-sm text-slate-500">E-posta:</span> {user.email}
        </p>
        <p>
          <span className="text-sm text-slate-500">Şirket:</span>{" "}
          {user.companyName || "—"}
        </p>
        <p className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Plan:</span>{" "}
          <PlanBadge plan={user.plan} />
        </p>
      </div>

      <div className="card mt-6">
        <h2 className="font-semibold">Araç ve sürücü profili</h2>
        <p className="mt-1 text-sm text-slate-600">
          Yakıt tahmini, lastik/servis önerileri ve ileride servis/şarj katmanları
          için. <strong>Canlı pompa fiyatı, canlı trafik, video CDN veya 112 SMS yok</strong> —
          hepsi <span className="rounded bg-amber-100 px-1 text-amber-900">örnek / yakında</span> iskeleti.
        </p>
        <form className="mt-4 space-y-3" onSubmit={saveVehicle}>
          <div>
            <label className="label">Marka</label>
            <select
              className="input"
              value={vehicle.vehicleMake}
              onChange={(e) => onMakeChange(e.target.value)}
            >
              <option value="">Seçin…</option>
              {VEHICLE_CATALOG.map((e) => (
                <option key={e.make} value={e.make}>
                  {e.make}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Model</label>
            <select
              className="input"
              value={vehicle.vehicleModel}
              onChange={(e) => onModelChange(e.target.value)}
              disabled={!vehicle.vehicleMake}
            >
              <option value="">Seçin…</option>
              {models.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Yakıt tipi</label>
            <select
              className="input"
              value={vehicle.fuelType}
              onChange={(e) =>
                setVehicle((p) => ({
                  ...p,
                  fuelType: e.target.value as FuelType | "",
                }))
              }
            >
              <option value="">Seçin…</option>
              {FUEL_TYPES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">
              Ortalama tüketim ({isElectric ? "kWh" : "L"}/100 km)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              className="input"
              value={vehicle.consumptionPer100}
              onChange={(e) =>
                setVehicle((p) => ({ ...p, consumptionPer100: e.target.value }))
              }
              placeholder={isElectric ? "örn. 16.5" : "örn. 6.0"}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Km saati</label>
              <input
                type="number"
                min="0"
                className="input"
                value={vehicle.odometerKm}
                onChange={(e) =>
                  setVehicle((p) => ({ ...p, odometerKm: e.target.value }))
                }
                placeholder="örn. 78500"
              />
            </div>
            <div>
              <label className="label">Lastik diş (mm)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="20"
                className="input"
                value={vehicle.tireTreadMm}
                onChange={(e) =>
                  setVehicle((p) => ({ ...p, tireTreadMm: e.target.value }))
                }
                placeholder="örn. 4.5"
              />
            </div>
          </div>
          <div>
            <label className="label">Kan grubu</label>
            <select
              className="input"
              value={vehicle.bloodType}
              onChange={(e) =>
                setVehicle((p) => ({ ...p, bloodType: e.target.value }))
              }
            >
              <option value="">Seçin…</option>
              {BLOOD_TYPES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Acil kişi telefonu</label>
            <input
              type="tel"
              className="input"
              value={vehicle.emergencyPhone}
              onChange={(e) =>
                setVehicle((p) => ({ ...p, emergencyPhone: e.target.value }))
              }
              placeholder="+90 5xx xxx xx xx"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={vehicle.preferTolls}
              onChange={(e) =>
                setVehicle((p) => ({ ...p, preferTolls: e.target.checked }))
              }
            />
            Paralı yolları tercih et (ücret / trafik API yok — yakında)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={vehicle.autoStopNotifications}
              onChange={(e) =>
                setVehicle((p) => ({ ...p, autoStopNotifications: e.target.checked }))
              }
            />
            <span>
              <strong>Oto-duruş bildirimleri</strong> — aracım durduğunda "Çevremde ne var" otomatik göster
            </span>
          </label>
          <button type="submit" className="btn-primary" disabled={savingVehicle}>
            {savingVehicle ? "Kaydediliyor…" : "Araç profilini kaydet"}
          </button>
          {vehicleMsg && (
            <p className="text-sm text-teal-700">{vehicleMsg}</p>
          )}
        </form>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-700">
            Öneriler{" "}
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
              örnek / yakında
            </span>
          </h3>
          <ul className="mt-2 space-y-2">
            {offers.map((o) => (
              <li
                key={o.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{o.title}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                    {o.badge}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{o.reason}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <button
            type="button"
            className="btn-secondary w-full !opacity-60"
            disabled
            title="Yakında"
          >
            112’ye konum SMS (yakında)
          </button>
          <p className="mt-2 text-xs text-amber-900">
            Stub: gerçek SMS gönderimi yok (canlı 112 entegrasyonu değil). İleride
            operatör SMS API + açık onay ile konum paylaşımı eklenecek. Acil
            durumda doğrudan 112’yi arayın.
          </p>
        </div>
      </div>

      <div className="card mt-6">
        <h2 className="font-semibold">Freemium (demo)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Gerçek ödeme yok. Demo için planı buradan değiştirebilirsiniz.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setPlan("premium")}
            className="btn-primary"
            disabled={user.plan === "premium"}
          >
            Premium&apos;a geç (demo)
          </button>
          <button
            onClick={() => setPlan("basic")}
            className="btn-secondary"
            disabled={user.plan === "basic"}
          >
            Basic&apos;e dön
          </button>
        </div>
        {msg && <p className="mt-3 text-sm text-teal-700">{msg}</p>}
      </div>
    </div>
  );
}
