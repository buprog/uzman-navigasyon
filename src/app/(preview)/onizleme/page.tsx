"use client";

import { useState, useRef, useEffect } from "react";

export default function OnizlemePage() {
  const [device, setDevice] = useState<"iphone" | "android">("iphone");
  const [firstTourId, setFirstTourId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [containerHeight, setContainerHeight] = useState(868);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const deviceSpecs = {
    iphone: { width: 390, height: 844, name: "iPhone 14 Pro" },
    android: { width: 412, height: 915, name: "Pixel 7" },
  };

  const spec = deviceSpecs[device];
  const frameWidth = spec.width + 24;
  const frameHeight = spec.height + 24;

  // Calculate scale for viewport fit
  useEffect(() => {
    const calculateScale = () => {
      const toolbarHeight = 120;
      const padding = 64;
      
      const availableHeight = window.innerHeight - toolbarHeight - padding;
      const availableWidth = window.innerWidth - padding;
      
      const scaleH = availableHeight / frameHeight;
      const scaleW = availableWidth / frameWidth;
      const newScale = Math.min(1, scaleH, scaleW);
      
      setScale(newScale);
      setContainerHeight(frameHeight * newScale);
    };
    
    calculateScale();
    window.addEventListener("resize", calculateScale);
    return () => window.removeEventListener("resize", calculateScale);
  }, [device, frameHeight, frameWidth]);

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
            {spec.name} · {spec.width}×{spec.height} · scale: {scale.toFixed(2)}
          </div>
        </div>

        <div className="flex justify-center">
          <div
            className="relative"
            style={{
              width: frameWidth,
              height: containerHeight,
            }}
          >
            <div
              className="absolute left-0 top-0"
              style={{
                width: frameWidth,
                height: frameHeight,
                transform: `scale(${scale})`,
                transformOrigin: "top center",
              }}
            >
              {/* Phone frame */}
              <div
                className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 shadow-2xl"
                style={{ width: frameWidth, height: frameHeight }}
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
    </div>
  );
}
