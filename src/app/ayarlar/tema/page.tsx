"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { THEME_LABELS, MODE_LABELS } from "@/lib/theme";

type ThemePreference = "neutral" | "female" | "male" | null;
type ColorModePreference = "light" | "dark" | null;

export default function ThemeSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemePreference>(null);
  const [currentMode, setCurrentMode] = useState<ColorModePreference>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Fetch current user to get theme and mode preferences
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setCurrentTheme(data.user?.themePreference || null);
          setCurrentMode(data.user?.colorModePreference || null);
        }
      } catch (err) {
        console.error("Failed to fetch user:", err);
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

  async function handleModeChange(mode: ColorModePreference) {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/account/mode", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colorModePreference: mode }),
      });

      if (res.ok) {
        setCurrentMode(mode);
        setMessage("✅ Görünüm tercihi kaydedildi");
        setTimeout(() => {
          router.refresh();
        }, 500);
      } else {
        setMessage("❌ Görünüm güncellenemedi");
      }
    } catch (err) {
      setMessage("❌ Görünüm güncellenemedi");
    } finally {
      setLoading(false);
    }
  }

  const themes: { value: ThemePreference; label: string; preview: string }[] = [
    { value: null, label: THEME_LABELS.null, preview: "Cinsiyetinize göre otomatik tema" },
    { value: "neutral", label: THEME_LABELS.neutral, preview: "Varsayılan temiz görünüm" },
    { value: "female", label: THEME_LABELS.female, preview: "Sıcak pastel tonlar, yumuşak köşeler" },
    { value: "male", label: THEME_LABELS.male, preview: "Koyu arka plan, keskin hatlar" },
  ];

  const modes: { value: ColorModePreference; label: string; preview: string }[] = [
    { value: null, label: MODE_LABELS.null, preview: "İşletim sisteminize göre otomatik" },
    { value: "light", label: MODE_LABELS.light, preview: "Açık renkli görünüm" },
    { value: "dark", label: MODE_LABELS.dark, preview: "Karanlık görünüm" },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Görünüm Ayarları</h1>
        <p className="text-sm text-slate-600">
          Uygulamanın tema ve rengini kişiselleştirin
        </p>
      </div>

      {/* Color Mode Selector */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Görünüm</h2>
        {modes.map((mode) => (
          <button
            key={mode.value || "system"}
            onClick={() => handleModeChange(mode.value)}
            disabled={loading}
            className={`w-full text-left p-4 rounded-lg border-2 transition ${
              currentMode === mode.value
                ? "border-teal-700 bg-teal-50"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  currentMode === mode.value
                    ? "border-teal-700 bg-teal-700"
                    : "border-slate-300"
                }`}
              >
                {currentMode === mode.value && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{mode.label}</p>
                <p className="text-xs text-slate-600 mt-0.5">{mode.preview}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Theme Selector */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        {themes.map((theme) => (
          <button
            key={theme.value || "auto"}
            onClick={() => handleThemeChange(theme.value)}
            disabled={loading}
            className={`w-full text-left p-4 rounded-lg border-2 transition ${
              currentTheme === theme.value
                ? "border-teal-700 bg-teal-50"
                : "border-slate-200 hover:border-slate-300 bg-white"
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
                <p className="font-semibold text-slate-900">{theme.label}</p>
                <p className="text-xs text-slate-600 mt-0.5">{theme.preview}</p>
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
          💡 <strong>Görünüm:</strong> "Sistem" seçeneği, işletim sisteminizin karanlık/açık mod tercihini takip eder ve OS değişikliklerine anında tepki verir.
        </p>
        <p className="text-xs text-slate-600">
          💡 <strong>Tema:</strong> Otomatik tema, kayıt sırasında seçtiğiniz cinsiyete göre belirlenir.
          Misafir kullanıcılar için varsayılan nötr tema uygulanır.
        </p>
      </div>
    </div>
  );
}
