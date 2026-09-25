"use client";

import { FormEvent, useState, useEffect } from "react";

type Settings = {
  rotationInterval: number;
  rotationMode: string;
  individualYearlyTl: number;
  familyYearlyTl: number | null;
  familyMaxMembers: number;
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
    const familyYearlyTlValue = fd.get("familyYearlyTl") as string;
    const body = {
      rotationInterval: parseInt(fd.get("rotationInterval") as string),
      rotationMode: fd.get("rotationMode"),
      individualYearlyTl: parseFloat(fd.get("individualYearlyTl") as string),
      familyYearlyTl: familyYearlyTlValue ? parseFloat(familyYearlyTlValue) : null,
      familyMaxMembers: parseInt(fd.get("familyMaxMembers") as string),
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
    <div className="space-y-8">
      {/* Ad Rotation Settings */}
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Reklam Rotasyon Ayarları</h2>
          <p className="text-sm text-slate-600 mt-1">
            Banner reklamların dönüş hızı ve sıralaması
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <hr className="my-6" />

            {/* Pricing Settings */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Fiyatlandırma Ayarları</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="label">Bireysel Yıllık Fiyat (TL)</label>
                  <input
                    name="individualYearlyTl"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    defaultValue={settings?.individualYearlyTl || 600}
                    className="input"
                  />
                  <p className="text-xs text-slate-600 mt-1">
                    Bireysel premium yıllık abonelik fiyatı
                  </p>
                </div>

                <div>
                  <label className="label">Aile Yıllık Fiyat (TL)</label>
                  <input
                    name="familyYearlyTl"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={settings?.familyYearlyTl || ""}
                    placeholder="Boş bırakılırsa gösterilmez"
                    className="input"
                  />
                  <p className="text-xs text-slate-600 mt-1">
                    Aile premium yıllık abonelik fiyatı (boş bırakılırsa aile seçeneği gösterilmez)
                  </p>
                </div>

                <div>
                  <label className="label">Aile Max Üye Sayısı</label>
                  <input
                    name="familyMaxMembers"
                    type="number"
                    min="2"
                    max="20"
                    required
                    defaultValue={settings?.familyMaxMembers || 5}
                    className="input"
                  />
                  <p className="text-xs text-slate-600 mt-1">
                    Bir ailede maksimum kaç üye olabilir (yönetici dahil, 2-20 arası)
                  </p>
                </div>
              </div>
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
    </div>
  );
}
