"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

export type PlaceValue = {
  name: string;
  lat: number;
  lng: number;
  displayName: string;
};

type GeoResult = {
  id: string;
  name: string;
  displayName: string;
  adminArea: string;
  lat: number;
  lng: number;
  type: string;
};

type Props = {
  id?: string;
  label: string;
  placeholder?: string;
  value: PlaceValue | null;
  onChange: (place: PlaceValue | null) => void;
  /** Show "Konumumu kullan" and optionally auto-detect when permission already granted */
  enableGeolocation?: boolean;
  autoDetectOnLoad?: boolean;
};

export function PlaceSearch({
  id,
  label,
  placeholder,
  value,
  onChange,
  enableGeolocation = false,
  autoDetectOnLoad = false,
}: Props) {
  const listId = useId();
  const inputId = id || listId;
  const [query, setQuery] = useState(value?.name || "");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const skipSearchRef = useRef(false);
  const autoTriedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (value) {
      skipSearchRef.current = true;
      setQuery(value.name);
    }
  }, [value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const search = useCallback(async (q: string) => {
    abortRef.current?.abort();
    if (q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const res = await fetch(`/api/geo/search?q=${encodeURIComponent(q.trim())}`, {
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (!ctrl.signal.aborted) {
        setResults(Array.isArray(data.results) ? data.results : []);
        setOpen(true);
        setActiveIdx(-1);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setResults([]);
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  function applyPlace(place: PlaceValue) {
    skipSearchRef.current = true;
    setQuery(place.name);
    setResults([]);
    setOpen(false);
    setGeoError("");
    onChangeRef.current(place);
  }

  function select(r: GeoResult) {
    applyPlace({
      name: r.name,
      lat: r.lat,
      lng: r.lng,
      displayName: r.displayName,
    });
  }

  function clear() {
    setQuery("");
    setResults([]);
    setOpen(false);
    setGeoError("");
    onChange(null);
  }

  async function reverseAndFill(lat: number, lng: number) {
    const res = await fetch(
      `/api/geo/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`
    );
    const data = await res.json();
    if (!res.ok || !data.place) {
      throw new Error(data.error || "Konum alınamadı");
    }
    const p = data.place as GeoResult;
    applyPlace({
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      displayName: p.displayName,
    });
  }

  function useMyLocation() {
    setGeoError("");
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Konum alınamadı");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await reverseAndFill(pos.coords.latitude, pos.coords.longitude);
        } catch {
          setGeoError("Konum alınamadı");
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("Konum izni gerekli");
        } else {
          setGeoError("Konum alınamadı");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  // Soft auto-detect: only if permission already granted (no surprise prompt)
  useEffect(() => {
    if (!enableGeolocation || !autoDetectOnLoad || autoTriedRef.current) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    autoTriedRef.current = true;

    const tryIfGranted = async () => {
      try {
        const perms = (navigator as Navigator & { permissions?: Permissions }).permissions;
        if (perms?.query) {
          const status = await perms.query({ name: "geolocation" as PermissionName });
          if (status.state !== "granted") return;
        } else {
          return; // avoid prompting on load without Permissions API
        }
      } catch {
        return;
      }
      setGeoLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await reverseAndFill(pos.coords.latitude, pos.coords.longitude);
          } catch {
            /* silent on auto */
          } finally {
            setGeoLoading(false);
          }
        },
        () => setGeoLoading(false),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 }
      );
    };
    void tryIfGranted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableGeolocation, autoDetectOnLoad]);

  function onKeyDown(e: KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      select(results[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="label mb-0">
          {label}
        </label>
        {enableGeolocation && (
          <button
            type="button"
            onClick={useMyLocation}
            disabled={geoLoading}
            className="text-xs font-medium text-teal-700 hover:text-teal-900 disabled:opacity-50"
          >
            {geoLoading ? "Konum alınıyor…" : "Konumumu kullan"}
          </button>
        )}
      </div>
      <div className="relative">
        <input
          id={inputId}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${listId}-list`}
          aria-autocomplete="list"
          className="input pr-8"
          placeholder={placeholder || "İl, ilçe veya yer ara…"}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onChange(null);
            setGeoError("");
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {(query || value) && (
          <button
            type="button"
            aria-label="Temizle"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        )}
      </div>
      {value && (
        <p className="mt-1 truncate text-xs text-slate-500" title={value.displayName}>
          {value.displayName}
          <span className="ml-1 text-slate-400">
            ({value.lat.toFixed(4)}, {value.lng.toFixed(4)})
          </span>
        </p>
      )}
      {geoError && <p className="mt-1 text-xs text-red-600">{geoError}</p>}
      {loading && <p className="mt-1 text-xs text-slate-400">Aranıyor…</p>}
      {open && results.length > 0 && (
        <ul
          id={`${listId}-list`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {results.map((r, i) => (
            <li key={r.id} role="option" aria-selected={i === activeIdx}>
              <button
                type="button"
                className={`flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-teal-50 ${
                  i === activeIdx ? "bg-teal-50" : ""
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(r)}
              >
                <span className="font-medium text-slate-900">{r.name}</span>
                <span className="truncate text-xs text-slate-500">
                  {r.adminArea || r.displayName}
                </span>
                <span className="text-[10px] text-slate-400">
                  {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !loading && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-lg">
          Sonuç bulunamadı
        </div>
      )}
    </div>
  );
}
