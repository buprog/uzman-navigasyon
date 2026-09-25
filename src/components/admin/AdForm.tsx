"use client";

import { FormEvent, useState, useEffect } from "react";

type Ad = {
  id: string;
  title: string;
  text: string;
  imageUrl: string;
  detailContent: string;
  clickUrl: string | null;
  targetGender: string;
  active: boolean;
  startDate: string | null;
  endDate: string | null;
  sortOrder: number;
};

type Props = {
  ad: Ad | null;
  onClose: () => void;
};

export function AdForm({ ad, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadMode, setUploadMode] = useState<"url" | "upload">("url");
  const [uploading, setUploading] = useState(false);
  const [blobSupported, setBlobSupported] = useState(false);

  useEffect(() => {
    // Check if Vercel Blob upload is supported
    fetch("/api/admin/ads/upload-check")
      .then((res) => res.json())
      .then((data) => setBlobSupported(data.supported))
      .catch(() => setBlobSupported(false));
  }, []);

  async function handleImageUpload(file: File): Promise<string> {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/ads/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      return data.url;
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    
    let imageUrl = fd.get("imageUrl") as string;
    
    // Handle image upload if file is selected
    if (uploadMode === "upload" && fd.get("imageFile")) {
      const file = fd.get("imageFile") as File;
      if (file.size > 0) {
        try {
          imageUrl = await handleImageUpload(file);
        } catch (err) {
          setError("Görsel yükleme başarısız");
          setLoading(false);
          return;
        }
      }
    }

    const body = {
      title: fd.get("title"),
      text: fd.get("text"),
      imageUrl,
      detailContent: fd.get("detailContent"),
      clickUrl: fd.get("clickUrl") || null,
      targetGender: fd.get("targetGender"),
      active: fd.get("active") === "true",
      startDate: fd.get("startDate") || null,
      endDate: fd.get("endDate") || null,
      sortOrder: parseInt(fd.get("sortOrder") as string) || 0,
    };

    const endpoint = ad ? `/api/admin/ads/${ad.id}` : "/api/admin/ads";
    const method = ad ? "PUT" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "İşlem başarısız");
      return;
    }

    onClose();
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-4">
        {ad ? "Reklamı Düzenle" : "Yeni Reklam Ekle"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Başlık *</label>
          <input
            name="title"
            required
            defaultValue={ad?.title}
            className="input"
            placeholder="Kapadokya Balon Turu"
          />
        </div>

        <div>
          <label className="label">Kısa Açıklama *</label>
          <input
            name="text"
            required
            defaultValue={ad?.text}
            className="input"
            placeholder="Gün doğumunda unutulmaz bir deneyim"
          />
        </div>

        <div>
          <label className="label">Detaylı İçerik</label>
          <textarea
            name="detailContent"
            rows={3}
            defaultValue={ad?.detailContent}
            className="input"
            placeholder="Detay sayfasında gösterilecek uzun açıklama..."
          />
        </div>

        <div>
          <label className="label">Görsel</label>
          {blobSupported && (
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setUploadMode("url")}
                className={`px-3 py-1 text-sm rounded ${
                  uploadMode === "url"
                    ? "bg-teal-700 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                URL
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("upload")}
                className={`px-3 py-1 text-sm rounded ${
                  uploadMode === "upload"
                    ? "bg-teal-700 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                Yükle
              </button>
            </div>
          )}
          
          {uploadMode === "url" ? (
            <input
              name="imageUrl"
              type="url"
              required
              defaultValue={ad?.imageUrl}
              className="input"
              placeholder="https://example.com/image.jpg"
            />
          ) : (
            <div>
              <input
                name="imageFile"
                type="file"
                accept="image/*"
                className="input"
              />
              {uploading && <p className="text-xs text-teal-700 mt-1">Yükleniyor...</p>}
              {ad?.imageUrl && (
                <p className="text-xs text-slate-600 mt-1">
                  Mevcut: {ad.imageUrl}
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="label">Tıklama URL'si (opsiyonel)</label>
          <input
            name="clickUrl"
            type="url"
            defaultValue={ad?.clickUrl || ""}
            className="input"
            placeholder="https://example.com (boş bırakılırsa detay sayfasına yönlendirir)"
          />
          <p className="text-xs text-slate-600 mt-1">
            Dış linkler yeni sekmede açılır
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Hedef Kitle *</label>
            <select
              name="targetGender"
              required
              defaultValue={ad?.targetGender || "ALL"}
              className="input"
            >
              <option value="ALL">Tümü</option>
              <option value="MALE">Erkek</option>
              <option value="FEMALE">Kadın</option>
            </select>
          </div>

          <div>
            <label className="label">Durum *</label>
            <select
              name="active"
              required
              defaultValue={ad?.active ? "true" : "false"}
              className="input"
            >
              <option value="true">Aktif</option>
              <option value="false">Pasif</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Başlangıç Tarihi</label>
            <input
              name="startDate"
              type="datetime-local"
              defaultValue={ad?.startDate ? new Date(ad.startDate).toISOString().slice(0, 16) : ""}
              className="input"
            />
          </div>

          <div>
            <label className="label">Bitiş Tarihi</label>
            <input
              name="endDate"
              type="datetime-local"
              defaultValue={ad?.endDate ? new Date(ad.endDate).toISOString().slice(0, 16) : ""}
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="label">Sıralama Önceliği *</label>
          <input
            name="sortOrder"
            type="number"
            required
            defaultValue={ad?.sortOrder || 0}
            className="input"
            placeholder="0"
          />
          <p className="text-xs text-slate-600 mt-1">
            Küçük sayılar önce gösterilir
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || uploading}
            className="btn-primary flex-1"
          >
            {loading ? "Kaydediliyor..." : ad ? "Güncelle" : "Ekle"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading || uploading}
            className="btn-secondary"
          >
            İptal
          </button>
        </div>
      </form>
    </div>
  );
}
