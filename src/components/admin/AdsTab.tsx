"use client";

import { useState, useEffect } from "react";
import { AdForm } from "./AdForm";

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
  impressions: number;
  clicks: number;
  createdAt: string;
};

export function AdsTab() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchAds();
  }, []);

  async function fetchAds() {
    try {
      const res = await fetch("/api/admin/ads");
      const data = await res.json();
      setAds(data.ads || []);
    } catch (err) {
      console.error("Failed to fetch ads:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    try {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchAds();
        setDeleteConfirm(null);
      } else {
        alert("Silme işlemi başarısız");
      }
    } catch (err) {
      console.error("Failed to delete ad:", err);
      alert("Silme işlemi başarısız");
    }
  }

  function handleEdit(ad: Ad) {
    setEditingAd(ad);
    setShowForm(true);
  }

  function handleCreate() {
    setEditingAd(null);
    setShowForm(true);
  }

  function handleFormClose() {
    setShowForm(false);
    setEditingAd(null);
    fetchAds();
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Reklam Yönetimi</h2>
          <p className="text-sm text-slate-600 mt-1">
            Toplam {ads.length} reklam
          </p>
        </div>
        <button onClick={handleCreate} className="btn-primary">
          + Yeni Reklam
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8">
            <AdForm
              ad={editingAd}
              onClose={handleFormClose}
            />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Reklam
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Hedef
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                İstatistik
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Durum
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Sıra
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {ads.map((ad) => {
              const ctr = ad.impressions > 0
                ? ((ad.clicks / ad.impressions) * 100).toFixed(1)
                : "0.0";

              return (
                <tr key={ad.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={ad.imageUrl}
                        alt={ad.title}
                        className="w-12 h-12 rounded object-cover bg-slate-100"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {ad.title}
                        </p>
                        <p className="text-xs text-slate-600 truncate">
                          {ad.text}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      ad.targetGender === "ALL"
                        ? "bg-slate-100 text-slate-700"
                        : ad.targetGender === "MALE"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-pink-100 text-pink-700"
                    }`}>
                      {ad.targetGender === "ALL" ? "Tümü" : ad.targetGender === "MALE" ? "Erkek" : "Kadın"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs">
                      <p className="text-slate-600">
                        👁️ {ad.impressions.toLocaleString()}
                      </p>
                      <p className="text-slate-600">
                        🖱️ {ad.clicks.toLocaleString()} ({ctr}%)
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      ad.active
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-700"
                    }`}>
                      {ad.active ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono text-slate-700">
                      {ad.sortOrder}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(ad)}
                        className="text-xs px-3 py-1 rounded bg-teal-100 text-teal-700 hover:bg-teal-200 font-semibold transition"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleDelete(ad.id)}
                        className={`text-xs px-3 py-1 rounded font-semibold transition ${
                          deleteConfirm === ad.id
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        {deleteConfirm === ad.id ? "Emin misiniz?" : "Sil"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {ads.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-600">Henüz reklam eklenmemiş.</p>
            <button
              onClick={handleCreate}
              className="mt-4 btn-primary"
            >
              İlk Reklamı Ekle
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
