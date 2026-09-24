"use client";

import { useState } from "react";

type DeviceType = "iphone" | "android";
type ThemePreview = "female" | "male" | "neutral";
type DayNightPreview = "auto" | "day" | "night";

const BRIGHTNESS_MIN = 50;
const BRIGHTNESS_MAX = 150;
const BRIGHTNESS_DEFAULT = 100;
const BRIGHTNESS_STEP = 5;

export default function PreviewPage() {
  const [device, setDevice] = useState<DeviceType>("iphone");
  const [themePreview, setThemePreview] = useState<ThemePreview>("neutral");
  const [dayNightPreview, setDayNightPreview] = useState<DayNightPreview>("auto");
  const [brightnessPreview, setBrightnessPreview] = useState(BRIGHTNESS_DEFAULT);
  
  const iframeUrl = `/?previewTheme=${themePreview}${dayNightPreview !== "auto" ? `&previewMode=${dayNightPreview}` : ""}${brightnessPreview !== BRIGHTNESS_DEFAULT ? `&previewBrightness=${brightnessPreview}` : ""}`;
  
  // Device dimensions
  const dimensions = {
    iphone: { width: 375, height: 812, name: "iPhone 13" },
    android: { width: 360, height: 800, name: "Android" },
  };
  
  const currentDevice = dimensions[device];

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              📱 Mobil Önizleme
            </h1>
            <p className="text-sm text-slate-400">
              Uygulamayı farklı cihazlarda ve temalarda önizleyin
            </p>
          </div>
          
          <a
            href="/"
            className="px-4 py-2 bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition font-semibold"
          >
            Geri Dön
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls */}
          <div className="lg:col-span-1 space-y-4">
            {/* Device selector */}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h3 className="text-sm font-semibold text-white mb-3">Cihaz</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setDevice("iphone")}
                  className={`w-full px-4 py-2 rounded-lg text-left transition ${
                    device === "iphone"
                      ? "bg-teal-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  📱 iPhone 13
                  <span className="block text-xs opacity-75">375 × 812</span>
                </button>
                <button
                  onClick={() => setDevice("android")}
                  className={`w-full px-4 py-2 rounded-lg text-left transition ${
                    device === "android"
                      ? "bg-teal-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  🤖 Android
                  <span className="block text-xs opacity-75">360 × 800</span>
                </button>
              </div>
            </div>

            {/* Theme simulator */}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h3 className="text-sm font-semibold text-white mb-3">
                Cinsiyet / Tema Taklidi
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setThemePreview("neutral")}
                  className={`w-full px-4 py-2 rounded-lg text-left transition ${
                    themePreview === "neutral"
                      ? "bg-slate-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Belirtmek istemiyorum
                  <span className="block text-xs opacity-75">Nötr tema</span>
                </button>
                <button
                  onClick={() => setThemePreview("female")}
                  className={`w-full px-4 py-2 rounded-lg text-left transition ${
                    themePreview === "female"
                      ? "bg-pink-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Kadın
                  <span className="block text-xs opacity-75">Sıcak pastel</span>
                </button>
                <button
                  onClick={() => setThemePreview("male")}
                  className={`w-full px-4 py-2 rounded-lg text-left transition ${
                    themePreview === "male"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Erkek
                  <span className="block text-xs opacity-75">Koyu keskin</span>
                </button>
              </div>
            </div>

            {/* Day/Night simulator */}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h3 className="text-sm font-semibold text-white mb-3">
                Gündüz / Gece
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setDayNightPreview("auto")}
                  className={`w-full px-4 py-2 rounded-lg text-left transition ${
                    dayNightPreview === "auto"
                      ? "bg-purple-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  🔄 Otomatik
                  <span className="block text-xs opacity-75">Gün doğumu/batımına göre</span>
                </button>
                <button
                  onClick={() => setDayNightPreview("day")}
                  className={`w-full px-4 py-2 rounded-lg text-left transition ${
                    dayNightPreview === "day"
                      ? "bg-yellow-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  ☀️ Gündüz
                  <span className="block text-xs opacity-75">Açık palet</span>
                </button>
                <button
                  onClick={() => setDayNightPreview("night")}
                  className={`w-full px-4 py-2 rounded-lg text-left transition ${
                    dayNightPreview === "night"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  🌙 Gece
                  <span className="block text-xs opacity-75">Koyu palet</span>
                </button>
              </div>
            </div>

            {/* Brightness slider */}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h3 className="text-sm font-semibold text-white mb-3">Parlaklık</h3>
              <div className="space-y-2">
                <label htmlFor="brightness-preview" className="block text-xs text-slate-400">
                  {brightnessPreview}%
                </label>
                <input
                  id="brightness-preview"
                  type="range"
                  min={BRIGHTNESS_MIN}
                  max={BRIGHTNESS_MAX}
                  step={BRIGHTNESS_STEP}
                  value={brightnessPreview}
                  onChange={(e) => setBrightnessPreview(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{BRIGHTNESS_MIN}%</span>
                  <span>{BRIGHTNESS_DEFAULT}%</span>
                  <span>{BRIGHTNESS_MAX}%</span>
                </div>
                {brightnessPreview !== BRIGHTNESS_DEFAULT && (
                  <button
                    onClick={() => setBrightnessPreview(BRIGHTNESS_DEFAULT)}
                    className="text-xs text-teal-400 hover:text-teal-300"
                  >
                    🔄 Sıfırla
                  </button>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <p className="text-xs text-slate-400">
                💡 Tema, gündüz/gece ve parlaklık taklidi gerçek hesap verilerinizi değiştirmez, sadece önizleme içindir.
              </p>
            </div>
          </div>

          {/* Device frame */}
          <div className="lg:col-span-3 flex items-start justify-center">
            <div
              className="relative bg-slate-800 rounded-[3rem] p-4 shadow-2xl border-8 border-slate-900"
              style={{
                width: currentDevice.width + 32,
                minHeight: currentDevice.height + 32,
              }}
            >
              {/* Device notch (iPhone only) */}
              {device === "iphone" && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-full z-10" />
              )}
              
              {/* Status bar */}
              <div className="absolute top-2 left-4 right-4 flex items-center justify-between text-xs text-white z-10">
                <span className="font-mono">9:41</span>
                <div className="flex items-center gap-1">
                  <span>📶</span>
                  <span>📡</span>
                  <span>🔋</span>
                </div>
              </div>

              {/* iframe */}
              <iframe
                key={`${device}-${themePreview}-${dayNightPreview}-${brightnessPreview}`}
                src={iframeUrl}
                className="w-full h-full rounded-[2.5rem] bg-white"
                style={{
                  width: currentDevice.width,
                  height: currentDevice.height,
                }}
                title="Preview"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
