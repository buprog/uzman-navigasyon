"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Reservation = {
  id: string;
  name: string;
  email: string;
  phone: string;
  pax: number;
  note: string;
  status: string;
  createdAt: string;
  departure: {
    date: string;
    tour: { id: string; name: string };
  };
};

const STATUS_LABEL: Record<string, string> = {
  beklemede: "Beklemede",
  onayli: "Onaylı",
  iptal: "İptal",
};

export default function RezervasyonlarPage() {
  const router = useRouter();
  const [items, setItems] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState("");

  async function load(status?: string) {
    const q = status ? `?status=${status}` : "";
    const res = await fetch(`/api/reservations${q}`);
    if (res.status === 401) {
      await fetch("/api/auth/demo", { method: "POST" });
      const res2 = await fetch(`/api/reservations${q}`);
      const data = await res2.json();
      setItems(data.reservations || []);
      return;
    }
    const data = await res.json();
    setItems(data.reservations || []);
  }

  useEffect(() => {
    load(filter || undefined);
  }, [filter]);

  async function setStatus(id: string, status: string) {
    await fetch(`/api/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load(filter || undefined);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold">Rezervasyonlar</h1>
      <div className="mt-4 flex gap-2">
        {[
          { v: "", l: "Tümü" },
          { v: "beklemede", l: "Beklemede" },
          { v: "onayli", l: "Onaylı" },
          { v: "iptal", l: "İptal" },
        ].map((f) => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={`rounded-full px-3 py-1 text-sm ${
              filter === f.v ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Müşteri</th>
              <th className="px-4 py-3">Kişi</th>
              <th className="px-4 py-3">Tur / Tarih</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-slate-500">
                    {r.email}
                    {r.phone ? ` · ${r.phone}` : ""}
                  </div>
                </td>
                <td className="px-4 py-3">{r.pax}</td>
                <td className="px-4 py-3">
                  {r.departure.tour.name}
                  <div className="text-xs text-slate-500">{r.departure.date}</div>
                </td>
                <td className="px-4 py-3">{STATUS_LABEL[r.status] || r.status}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {r.status !== "onayli" && (
                      <button
                        className="btn-primary !py-1 !text-xs"
                        onClick={() => setStatus(r.id, "onayli")}
                      >
                        Onayla
                      </button>
                    )}
                    {r.status !== "iptal" && (
                      <button
                        className="btn-danger !py-1 !text-xs"
                        onClick={() => setStatus(r.id, "iptal")}
                      >
                        İptal
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Rezervasyon yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
