"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OnizlemePage() {
  const [device, setDevice] = useState<"iphone" | "android">("iphone");
  const [firstTourId, setFirstTourId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const router = useRouter();

  // Check screen size and redirect on mobile
  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        router.push("/");
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [router]);

  // Fetch first tour ID for quick navigation
  useEffect(() => {
    fetch("/api/tours")
      .then((r) => r.json())
      .then((data) => {
        if (data.tours && data.tours.length > 0) {
          setFirstTourId(data.tours[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const reload = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const navigate = (path: string) => {
    if (iframeRef.current) {
      iframeRef.current.src = path;
    }
  };

  const clearSessionAndReload = async () => {
    if (iframeRef.current) {
      iframeRef.current.src = "/api/auth/clear-and-reload";
    }
  };

  const deviceSpecs = {
    iphone: { width: 390, height: 844, name: "iPhone 14 Pro" },
    android: { width: 412, height: 915, name: "Pixel 7" },
  };

  const spec = deviceSpecs[device];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-800">
              Mobil Önizleme
            </h1>
            
            <div className="flex gap-2 border-l border-slate-200 pl-3">
              <button
                onClick={() => setDevice("iphone")}
                className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                  device === "iphone"
                    ? "bg-teal-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                iPhone
              </button>
              <button
                onClick={() => setDevice("android")}
                className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                  device === "android"
                    ? "bg-teal-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Android
              </button>
            </div>

            <div className="flex flex-wrap gap-2 border-l border-slate-200 pl-3">
              <button
                onClick={reload}
                className="rounded bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                🔄 Yenile
              </button>
              <button
                onClick={() => navigate("/")}
                className="rounded bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                🏠 Ana sayfa
              </button>
              <button
                onClick={() => navigate("/turlar")}
                className="rounded bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                📋 Turlar
              </button>
              <button
                onClick={() => navigate("/auth")}
                className="rounded bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                👤 Auth
              </button>
              {firstTourId && (
                <button
                  onClick={() => navigate(`/navigasyon/${firstTourId}`)}
                  className="rounded bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
                >
                  🧭 Nav
                </button>
              )}
              <button
                onClick={clearSessionAndReload}
                className="rounded bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-200"
              >
                🆕 Yeni ziyaretçi
              </button>
            </div>
          </div>
          
          <div className="mt-2 text-xs text-slate-500">
            {spec.name} · {spec.width}×{spec.height}
          </div>
        </div>

        <div className="flex justify-center">
          <div className="relative" style={{ width: spec.width + 24, height: spec.height + 24 }}>
            {/* Phone frame */}
            <div
              className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 shadow-2xl"
              style={{ width: spec.width + 24, height: spec.height + 24 }}
            >
              {/* Notch or punch hole */}
              {device === "iphone" ? (
                <div className="absolute left-1/2 top-0 z-20 h-7 w-40 -translate-x-1/2 rounded-b-3xl bg-slate-900"></div>
              ) : (
                <div className="absolute right-16 top-3 z-20 h-3 w-3 rounded-full bg-slate-900 ring-2 ring-slate-800"></div>
              )}

              {/* Screen */}
              <div
                className="absolute left-3 top-3 overflow-hidden rounded-[2rem] bg-white"
                style={{ width: spec.width, height: spec.height }}
              >
                <iframe
                  ref={iframeRef}
                  src="/"
                  className="h-full w-full border-0"
                  title="Mobile Preview"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation"
                />
              </div>

              {/* Bottom bar (Android) */}
              {device === "android" && (
                <div className="absolute bottom-2 left-1/2 h-1 w-32 -translate-x-1/2 rounded-full bg-slate-700"></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
