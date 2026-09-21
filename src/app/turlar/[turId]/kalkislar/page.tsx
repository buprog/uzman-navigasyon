"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { UpgradeBanner } from "@/components/PlanBadge";

type Departure = {
  id: string;
  date: string;
  capacity: number;
  bookedCount: number;
  status: string;
  shareCode: string;
  note: string;
  _count: { reservations: number };
};

const STATUSES = [
  { value: "taslak", label: "Taslak" },
  { value: "yayin", label: "Yayın" },
  { value: "dolu", label: "Dolu" },
  { value: "iptal", label: "İptal" },
];

export default function KalkislarPage() {
  const { turId } = useParams<{ turId: string }>();
  const router = useRouter();
  const [tourName, setTourName] = useState("");
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState("");
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/tours/${turId}/departures`);
    if (res.status === 401) {
      router.push("/giris");
      return;
    }
    const data = await res.json();
    setDepartures(data.departures || []);
    setTourName(data.tour?.name || "");
  }, [turId, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function createDeparture(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUpgradeMsg("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/tours/${turId}/departures`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: fd.get("date"),
        capacity: Number(fd.get("capacity")),
        status: fd.get("status"),
        note: fd.get("note"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.upgrade) setUpgradeMsg(data.error);
      else alert(data.error);
      return;
    }
    setShowForm(false);
    await load();
  }

  async function updateStatus(id: string, status: string) {
    setUpgradeMsg("");
    const res = await fetch(`/api/departures/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.upgrade) setUpgradeMsg(data.error);
      else alert(data.error);
      return;
    }
    await load();
  }

  function copyLink(code: string) {
    const url = `${window.location.origin}/p/${code}`;
    navigator.clipboard.writeText(url);
    setCopied(code);
    setTimeout(() => setCopied(""), 2000);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/turlar" className="text-sm text-slate-500 hover:text-teal-800">
        ← Turlarım
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kalkışlar</h1>
          <p className="text-sm text-slate-500">{tourName}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Yeni kalkış
        </button>
      </div>

      {upgradeMsg && (
        <div className="mt-4">
          <UpgradeBanner message={upgradeMsg} />
        </div>
      )}

      {showForm && (
        <form onSubmit={createDeparture} className="card mt-6 space-y-3">
          <h2 className="font-semibold">Yeni / düzenle kalkış</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Tarih</label>
              <input name="date" type="date" required className="input" />
            </div>
            <div>
              <label className="label">Kontenjan</label>
              <input name="capacity" type="number" min={1} defaultValue={20} className="input" />
            </div>
            <div>
              <label className="label">Durum</label>
              <select name="status" className="input" defaultValue="taslak">
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Not</label>
            <input name="note" className="input" />
          </div>
          <p className="text-xs text-slate-400">
            Basic: en fazla 2 aktif (yayın/dolu) kalkış. Önce taslak kaydedip sonra yayınlayabilirsiniz.
          </p>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">
              Kaydet
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              İptal
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {departures.map((d) => (
          <div key={d.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{d.date}</p>
              <p className="text-sm text-slate-500">
                {d.bookedCount}/{d.capacity} dolu · {d._count.reservations} talep ·{" "}
                {STATUSES.find((s) => s.value === d.status)?.label}
              </p>
              <p className="text-xs text-slate-400">Kod: {d.shareCode}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="input !w-auto !py-1.5"
                value={d.status}
                onChange={(e) => updateStatus(d.id, e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                className="btn-secondary !py-1.5"
                onClick={() => copyLink(d.shareCode)}
                disabled={d.status === "taslak" || d.status === "iptal"}
                title={d.status === "taslak" ? "Önce yayınlayın" : ""}
              >
                {copied === d.shareCode ? "Kopyalandı!" : "Paylaşım linki"}
              </button>
              <Link href={`/p/${d.shareCode}`} className="btn-secondary !py-1.5" target="_blank">
                Önizle
              </Link>
              <Link href="/rezervasyonlar" className="btn-secondary !py-1.5">
                Rezervasyonlar
              </Link>
            </div>
          </div>
        ))}
        {departures.length === 0 && (
          <p className="text-slate-500">Henüz kalkış yok.</p>
        )}
      </div>
    </div>
  );
}
