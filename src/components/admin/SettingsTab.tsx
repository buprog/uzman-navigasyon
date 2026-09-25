"use client";

import { FormEvent, useState, useEffect } from "react";

type Settings = {
  rotationInterval: number;
  rotationMode: string;
};

export function SettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      setSettings(data.settings);
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const fd = new FormData(e.currentTarget);
    const body = {
      rotationInterval: parseInt(fd.get("rotationInterval") as string),
      rotationMode: fd.get("rotationMode"),
    };

    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setSaving(false);

    if (res.ok) {
      setSettings(data.settings);
      setMessage("✅ Ayarlar kaydedildi");
      setTimeout(() => setMessage(""), 3000);
    } else {
      setMessage("❌ " + (data.error || "Kaydetme başarısız"));
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Reklam Rotasyon Ayarları</h2>
        <p className="text-sm text-slate-600 mt-1">
          Banner reklamların dönüş hızı ve sıralaması
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Rotasyon Aralığı (saniye)</label>
            <input
              name="rotationInterval"
              type="number"
              min="1"
              max="60"
              required
              defaultValue={settings?.rotationInterval || 5}
              className="input"
            />
            <p className="text-xs text-slate-600 mt-1">
              Banner reklamlar kaç saniyede bir değişecek (1-60 arası)
            </p>
          </div>

          <div>
            <label className="label">Rotasyon Modu</label>
            <select
              name="rotationMode"
              required
              defaultValue={settings?.rotationMode || "sıralı"}
              className="input"
            >
              <option value="sıralı">Sıralı (sort order'a göre)</option>
              <option value="rastgele">Rastgele</option>
            </select>
            <p className="text-xs text-slate-600 mt-1">
              Sıralı: Küçük sort order'dan büyüğe doğru gösterilir
              <br />
              Rastgele: Her rotasyonda rastgele bir reklam gösterilir
            </p>
          </div>

          {message && (
            <div className={`rounded-lg border p-3 ${
              message.includes("✅")
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}>
              <p className="text-sm">{message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
          </button>
        </form>
      </div>
    </div>
  );
}
