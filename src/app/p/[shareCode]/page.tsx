"use client";

import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { MapView } from "@/components/MapView";

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
};

export default function PublicItineraryPage() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [data, setData] = useState<{
    departure: { date: string; capacity: number; bookedCount: number; status: string; note: string };
    tour: { name: string; description: string; dayCount: number; stops: Stop[] };
    operator: { name: string };
  } | null>(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [thanks, setThanks] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetch(`/api/public/${shareCode}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Bulunamadı");
        setData(d);
      })
      .catch((e) => setError(e.message));
  }, [shareCode]);

  const byDay = useMemo(() => {
    if (!data) return [];
    const map = new Map<number, Stop[]>();
    data.tour.stops.forEach((s) => {
      const list = map.get(s.dayIndex) || [];
      list.push(s);
      map.set(s.dayIndex, list);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [data]);

  async function submitReservation(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/public/${shareCode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone"),
        pax: Number(fd.get("pax")),
        note: fd.get("note"),
      }),
    });
    const d = await res.json();
    if (!res.ok) {
      setFormError(d.error || "Gönderilemedi");
      return;
    }
    setThanks(d.message);
    setShowForm(false);
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-bold">Program bulunamadı</h1>
        <p className="mt-2 text-slate-500">{error}</p>
      </div>
    );
  }
  if (!data) return <div className="p-8 text-slate-500">Yükleniyor…</div>;

  return (
    <div className="min-h-screen bg-slate-50 [html[data-mode='night']_&]:bg-slate-900">
      <header className="border-b border-slate-200 bg-white [html[data-mode='night']_&]:bg-slate-800 [html[data-mode='night']_&]:border-slate-700">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-teal-700 [html[data-mode='night']_&]:text-teal-400">Uzman Navigasyon</p>
            <h1 className="text-2xl font-bold text-slate-900 [html[data-mode='night']_&]:text-slate-100">{data.tour.name}</h1>
            <p className="text-sm text-slate-500 [html[data-mode='night']_&]:text-slate-400">
              {data.operator.name} · Kalkış: {data.departure.date} ·{" "}
              {data.departure.bookedCount}/{data.departure.capacity} dolu
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            Rezervasyon talebi
          </button>
        </div>
      </header>

      {thanks && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900 [html[data-mode='night']_&]:bg-teal-900/30 [html[data-mode='night']_&]:border-teal-700 [html[data-mode='night']_&]:text-teal-100">
            {thanks}
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-2">
        <div className="space-y-4">
          {data.tour.description && (
            <p className="text-sm text-slate-600">{data.tour.description}</p>
          )}
          {byDay.map(([day, stops]) => (
            <div key={day} className="card">
              <h2 className="font-semibold text-teal-800 [html[data-mode='night']_&]:text-teal-400">Gün {day + 1}</h2>
              <ol className="mt-3 space-y-3">
                {stops.map((s, i) => (
                  <li key={s.id} className="border-l-2 border-teal-200 pl-3">
                    <p className="font-medium">
                      {i + 1}. {s.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {s.type} · {s.durationMin} dk
                      {s.address ? ` · ${s.address}` : ""}
                    </p>
                    {s.note && <p className="mt-1 text-sm text-slate-600">{s.note}</p>}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <div className="h-[480px] overflow-hidden rounded-xl border border-slate-200 shadow-sm">
          <MapView stops={data.tour.stops} interactive={false} className="h-full w-full" />
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={submitReservation} className="card w-full max-w-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Rezervasyon talebi</h3>
              <button type="button" onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>
            <div>
              <label className="label">Ad soyad</label>
              <input name="name" required className="input" />
            </div>
            <div>
              <label className="label">E-posta</label>
              <input name="email" type="email" required className="input" />
            </div>
            <div>
              <label className="label">Telefon</label>
              <input name="phone" className="input" />
            </div>
            <div>
              <label className="label">Kişi sayısı</label>
              <input name="pax" type="number" min={1} defaultValue={1} className="input" />
            </div>
            <div>
              <label className="label">Not</label>
              <textarea name="note" rows={2} className="input" />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <button type="submit" className="btn-primary w-full">
              Gönder
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
