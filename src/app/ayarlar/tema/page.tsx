"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { THEME_LABELS } from "@/lib/theme";
import { 
  BRIGHTNESS_MIN, 
  BRIGHTNESS_MAX, 
  BRIGHTNESS_DEFAULT, 
  BRIGHTNESS_STEP,
  getBrightnessFromStorage,
  setBrightnessInStorage,
  applyBrightness,
  formatBrightnessForAria
} from "@/lib/brightness";

type ThemePreference = "neutral" | "female" | "male" | null;

export default function ThemeSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemePreference>(null);
  const [brightness, setBrightness] = useState(BRIGHTNESS_DEFAULT);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Fetch current user to get theme and brightness preferences
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setCurrentTheme(data.user?.themePreference || null);
          const userBrightness = data.user?.brightness || getBrightnessFromStorage();
          setBrightness(userBrightness);
        } else {
          // Guest user - use localStorage
          setBrightness(getBrightnessFromStorage());
        }
      } catch (err) {
        console.error("Failed to fetch user:", err);
        setBrightness(getBrightnessFromStorage());
      }
    }
    fetchUser();
  }, []);

  async function handleThemeChange(theme: ThemePreference) {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/account/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themePreference: theme }),
      });

      if (res.ok) {
        setCurrentTheme(theme);
        setMessage("✅ Tema tercihi kaydedildi");
        setTimeout(() => {
          router.refresh();
        }, 500);
      } else {
        setMessage("❌ Tema güncellenemedi");
      }
    } catch (err) {
      setMessage("❌ Tema güncellenemedi");
    } finally {
      setLoading(false);
    }
  }

  function handleBrightnessChange(value: number) {
    setBrightness(value);
    setBrightnessInStorage(value);
    applyBrightness(value);
  }

  async function handleBrightnessSave() {
    try {
      await fetch("/api/account/brightness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brightness }),
      });
    } catch (err) {
      console.error("Failed to save brightness:", err);
    }
  }

  function handleBrightnessReset() {
    handleBrightnessChange(BRIGHTNESS_DEFAULT);
    handleBrightnessSave();
    setMessage("✅ Parlaklık sıfırlandı");
  }

  const themes: { value: ThemePreference; label: string; preview: string }[] = [
    { value: null, label: THEME_LABELS.null, preview: "Cinsiyetinize göre otomatik tema" },
    { value: "neutral", label: THEME_LABELS.neutral, preview: "Varsayılan temiz görünüm" },
    { value: "female", label: THEME_LABELS.female, preview: "Sıcak pastel tonlar, yumuşak köşeler" },
    { value: "male", label: THEME_LABELS.male, preview: "Koyu arka plan, keskin hatlar" },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 [html[data-mode='night']_&]:text-slate-100 mb-2">Görünüm Ayarları</h1>
        <p className="text-sm text-slate-600 [html[data-mode='night']_&]:text-slate-300">
          Uygulamanın tema ve parlaklığını kişiselleştirin
        </p>
      </div>

      {/* Brightness Slider */}
      <div className="bg-white [html[data-mode='night']_&]:bg-slate-800 rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 [html[data-mode='night']_&]:text-slate-100 mb-4">Parlaklık</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="brightness-slider" className="block text-sm text-slate-700 mb-2">
              Ekran parlaklığı: <span className="font-semibold">{brightness}%</span>
            </label>
            <input
              id="brightness-slider"
              type="range"
              min={BRIGHTNESS_MIN}
              max={BRIGHTNESS_MAX}
              step={BRIGHTNESS_STEP}
              value={brightness}
              onChange={(e) => handleBrightnessChange(parseInt(e.target.value, 10))}
              onMouseUp={handleBrightnessSave}
              onTouchEnd={handleBrightnessSave}
              aria-label="Parlaklık ayarı"
              aria-valuetext={formatBrightnessForAria(brightness)}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-700"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>{BRIGHTNESS_MIN}%</span>
              <span>{BRIGHTNESS_DEFAULT}%</span>
              <span>{BRIGHTNESS_MAX}%</span>
            </div>
          </div>
          
          {brightness !== BRIGHTNESS_DEFAULT && (
            <button
              onClick={handleBrightnessReset}
              className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            >
              🔄 Sıfırla (100%)
            </button>
          )}
          
          <p className="text-xs text-slate-600">
            💡 Bu ayar sadece uygulamanın parlaklığını değiştirir, cihazınızın ekran parlaklığını etkilemez.
          </p>
        </div>
      </div>

      {/* Theme Selector */}
      <div className="bg-white [html[data-mode='night']_&]:bg-slate-800 rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 [html[data-mode='night']_&]:text-slate-100 mb-3">Tema</h2>
        {themes.map((theme) => (
          <button
            key={theme.value || "auto"}
            onClick={() => handleThemeChange(theme.value)}
            disabled={loading}
            className={`w-full text-left p-4 rounded-lg border-2 transition ${
              currentTheme === theme.value
                ? "border-teal-700 bg-teal-50 [html[data-mode='night']_&]:bg-teal-900/30 [html[data-mode='night']_&]:border-teal-500"
                : "border-slate-200 hover:border-slate-300 bg-white [html[data-mode='night']_&]:bg-slate-700 [html[data-mode='night']_&]:border-slate-600 [html[data-mode='night']_&]:hover:border-slate-500"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  currentTheme === theme.value
                    ? "border-teal-700 bg-teal-700"
                    : "border-slate-300"
                }`}
              >
                {currentTheme === theme.value && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 [html[data-mode='night']_&]:text-slate-100">{theme.label}</p>
                <p className="text-xs text-slate-600 [html[data-mode='night']_&]:text-slate-300 mt-0.5">{theme.preview}</p>
              </div>
            </div>
          </button>
        ))}

        {message && (
          <div
            className={`rounded-lg border p-3 ${
              message.includes("✅")
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <p className="text-sm">{message}</p>
          </div>
        )}

        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={() => router.push("/ayarlar")}
            className="btn-secondary"
          >
            ← Ayarlara Dön
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-lg bg-slate-50 border border-slate-200 p-4">
        <p className="text-xs text-slate-600 mb-2">
          💡 <strong>Tema:</strong> Otomatik tema, kayıt sırasında seçtiğiniz cinsiyete göre belirlenir.
          Misafir kullanıcılar için varsayılan nötr tema uygulanır.
        </p>
        <p className="text-xs text-slate-600">
          🌙 <strong>Gündüz/Gece:</strong> Uygulama otomatik olarak gün doğumu ve gün batımına göre
          açık veya koyu renk paletine geçer. İzin vermeniz halinde, bulunduğunuz yerin gün doğumu/batımı
          kullanılır; aksi takdirde saat 07:00-19:00 arası gündüz sayılır.
        </p>
      </div>
    </div>
  );
}
