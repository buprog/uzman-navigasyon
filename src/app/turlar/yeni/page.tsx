"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UpgradeBanner } from "@/components/PlanBadge";
import { PlaceSearch, type PlaceValue } from "@/components/PlaceSearch";
import { computeDayCount } from "@/lib/dayCount";

export default function YeniTurPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [upgrade, setUpgrade] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [startPlace, setStartPlace] = useState<PlaceValue | null>(null);
  const [endPlace, setEndPlace] = useState<PlaceValue | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const dayInfo = useMemo(
    () => computeDayCount(startDate || null, endDate || null),
    [startDate, endDate]
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setUpgrade(false);

    if (dayInfo.error) {
      setError(dayInfo.error);
      return;
    }

    setLoading(true);
    const res = await fetch("/api/tours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: noteOpen ? description : "",
        startName: startPlace?.name || "",
        endName: endPlace?.name || "",
        startDate: startDate || null,
        endDate: endDate || null,
        dayCount: dayInfo.dayCount,
        startPlace: startPlace
          ? {
              name: startPlace.name,
              lat: startPlace.lat,
              lng: startPlace.lng,
              displayName: startPlace.displayName,
            }
          : null,
        endPlace: endPlace
          ? {
              name: endPlace.name,
              lat: endPlace.lat,
              lng: endPlace.lng,
              displayName: endPlace.displayName,
            }
          : null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Oluşturulamadı");
      setUpgrade(!!data.upgrade);
      return;
    }
    router.push(`/planlayici/${data.tour.id}`);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold">Yeni tur</h1>
      <p className="mt-1 text-sm text-slate-500">
        Ad, başlangıç/bitiş ve tarihler yeterli — gün sayısı otomatik hesaplanır.
      </p>
      {upgrade && (
        <div className="mt-4">
          <UpgradeBanner message={error} />
        </div>
      )}
      <form onSubmit={onSubmit} className="card mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="tour-name">
            Tur adı
          </label>
          <input
            id="tour-name"
            required
            className="input"
            placeholder="Örn. Kapadokya 3 Gün"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <PlaceSearch
          id="start-place"
          label="Başlangıç noktası"
          placeholder="Örn. İstanbul, Ayvalık…"
          value={startPlace}
          onChange={setStartPlace}
          enableGeolocation
          autoDetectOnLoad
        />

        <PlaceSearch
          id="end-place"
          label="Bitiş noktası"
          placeholder="Örn. Balıkesir, Göreme…"
          value={endPlace}
          onChange={setEndPlace}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="start-date">
              Başlangıç tarihi
            </label>
            <input
              id="start-date"
              type="date"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="end-date">
              Bitiş tarihi
            </label>
            <input
              id="end-date"
              type="date"
              className="input"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-600">Gün sayısı: </span>
          <span className="font-semibold text-slate-900">{dayInfo.dayCount}</span>
          <span className="ml-1 text-xs text-slate-400">(tarihlerden otomatik)</span>
          {dayInfo.error && (
            <p className="mt-1 text-xs text-red-600">{dayInfo.error}</p>
          )}
        </div>

        <div>
          <button
            type="button"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
            onClick={() => setNoteOpen((v) => !v)}
            aria-expanded={noteOpen}
          >
            {noteOpen ? "▾ Notu gizle" : "▸ Not ekle (isteğe bağlı)"}
          </button>
          {noteOpen && (
            <textarea
              className="input mt-2"
              rows={3}
              placeholder="Tur notu / açıklama…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          )}
        </div>

        {!upgrade && error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !!dayInfo.error}
          className="btn-primary w-full"
        >
          {loading ? "Oluşturuluyor…" : "Planlayıcıya geç"}
        </button>
      </form>
    </div>
  );
}
