"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlanBadge, UpgradeBanner } from "@/components/PlanBadge";

type Tour = {
  id: string;
  name: string;
  dayCount: number;
  updatedAt: string;
  isSample: boolean;
  _count: { stops: number; departures: number };
};

export default function TurlarPage() {
  const router = useRouter();
  const [tours, setTours] = useState<Tour[]>([]);
  const [plan, setPlan] = useState("basic");
  const [error, setError] = useState("");
  const [upgradeMsg, setUpgradeMsg] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/tours");
    if (res.status === 401) {
      router.push("/giris");
      return;
    }
    const data = await res.json();
    setTours(data.tours || []);
    setPlan(data.plan || "basic");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function duplicate(id: string) {
    setUpgradeMsg("");
    const res = await fetch(`/api/tours/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate" }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.upgrade) setUpgradeMsg(data.error);
      else setError(data.error || "Çoğaltılamadı");
      return;
    }
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Bu turu silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/tours/${id}`, { method: "DELETE" });
    await load();
  }

  if (loading) return <div className="p-8 text-slate-500">Yükleniyor…</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Turlarım</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            Planınız: <PlanBadge plan={plan} />
            {plan === "basic" && <span>· en fazla 3 tur</span>}
          </p>
        </div>
        <Link href="/turlar/yeni" className="btn-primary">
          + Yeni tur
        </Link>
      </div>

      {upgradeMsg && (
        <div className="mt-4">
          <UpgradeBanner message={upgradeMsg} />
        </div>
      )}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tours.map((t) => (
          <div key={t.id} className="card flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold text-slate-900">{t.name}</h2>
              {t.isSample && (
                <Link
                  href={`/planlayici/${t.id}`}
                  className="inline-flex items-center rounded-full bg-teal-700 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-800 transition"
                >
                  Turu gör
                </Link>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {t.dayCount} gün · {t._count.stops} durak · {t._count.departures} kalkış
            </p>
            <p className="text-xs text-slate-400">
              Güncellendi: {new Date(t.updatedAt).toLocaleString("tr-TR")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/planlayici/${t.id}`} className="btn-secondary !py-1.5 !text-xs">
                Düzenle
              </Link>
              <Link
                href={`/turlar/${t.id}/kalkislar`}
                className="btn-secondary !py-1.5 !text-xs"
              >
                Kalkışlar
              </Link>
              <button onClick={() => duplicate(t.id)} className="btn-secondary !py-1.5 !text-xs">
                Çoğalt
              </button>
              <button onClick={() => remove(t.id)} className="btn-danger !py-1.5 !text-xs">
                Sil
              </button>
            </div>
          </div>
        ))}
        {tours.length === 0 && (
          <p className="text-slate-500">Henüz tur yok. Yeni tur oluşturun veya seed çalıştırın.</p>
        )}
      </div>
    </div>
  );
}
