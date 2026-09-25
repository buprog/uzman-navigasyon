"use client";

import { useState, useEffect } from "react";

type FamilyPlan = {
  id: string;
  ownerDeviceId: string;
  name: string | null;
  maxMembers: number;
  inviteCode: string;
  premiumUntil: string;
  status: string;
  source: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
  createdAt: string;
  members: Array<{
    id: string;
    deviceId: string;
    role: string;
    joinedAt: string;
    removedAt: string | null;
  }>;
};

export function FamilyTab() {
  const [families, setFamilies] = useState<FamilyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [textFilter, setTextFilter] = useState("");
  const [message, setMessage] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchFamilies();
  }, []);

  async function fetchFamilies() {
    try {
      const res = await fetch("/api/admin/family");
      const data = await res.json();
      if (res.ok) {
        setFamilies(data.families || []);
      }
    } catch (err) {
      console.error("Failed to fetch families:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(filteredFamilies.map((f) => f.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  function handleSelectOne(id: string, checked: boolean) {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  }

  async function handleExtendPeriod() {
    const days = prompt("Kaç gün eklenecek?");
    if (!days || isNaN(parseInt(days))) return;

    try {
      const res = await fetch("/api/admin/family/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), days: parseInt(days) }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Süre uzatıldı");
        fetchFamilies();
        setSelectedIds(new Set());
      } else {
        setMessage("❌ " + (data.error || "İşlem başarısız"));
      }
    } catch {
      setMessage("❌ İşlem başarısız");
    }
    setTimeout(() => setMessage(""), 3000);
  }

  async function handleChangeMaxMembers() {
    const max = prompt("Yeni max üye sayısı (2-20):");
    if (!max || isNaN(parseInt(max))) return;
    const maxInt = parseInt(max);
    if (maxInt < 2 || maxInt > 20) {
      alert("2-20 arası olmalı");
      return;
    }

    try {
      const res = await fetch("/api/admin/family/change-max", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), maxMembers: maxInt }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Max üye güncellendi");
        fetchFamilies();
        setSelectedIds(new Set());
      } else {
        setMessage("❌ " + (data.error || "İşlem başarısız"));
      }
    } catch {
      setMessage("❌ İşlem başarısız");
    }
    setTimeout(() => setMessage(""), 3000);
  }

  async function handleBulkClose() {
    if (!confirm(`${selectedIds.size} aile kapatılacak. Emin misiniz?`)) return;

    try {
      const res = await fetch("/api/admin/family/bulk-close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Aileler kapatıldı");
        fetchFamilies();
        setSelectedIds(new Set());
      } else {
        setMessage("❌ " + (data.error || "İşlem başarısız"));
      }
    } catch {
      setMessage("❌ İşlem başarısız");
    }
    setTimeout(() => setMessage(""), 3000);
  }

  async function handleBulkReopen() {
    if (!confirm(`${selectedIds.size} aile yeniden açılacak. Emin misiniz?`)) return;

    try {
      const res = await fetch("/api/admin/family/bulk-reopen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Aileler yeniden açıldı");
        fetchFamilies();
        setSelectedIds(new Set());
      } else {
        setMessage("❌ " + (data.error || "İşlem başarısız"));
      }
    } catch {
      setMessage("❌ İşlem başarısız");
    }
    setTimeout(() => setMessage(""), 3000);
  }

  async function handleExportExcel() {
    try {
      const res = await fetch("/api/admin/family/export?format=excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedIds.size > 0 ? Array.from(selectedIds) : undefined,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `aileler-${new Date().toISOString().split("T")[0].replace(/-/g, "")}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        setMessage("✅ Excel indirildi");
      } else {
        setMessage("❌ Export başarısız");
      }
    } catch {
      setMessage("❌ Export başarısız");
    }
    setTimeout(() => setMessage(""), 3000);
  }

  async function handleExportTxt() {
    try {
      const res = await fetch("/api/admin/family/export?format=txt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedIds.size > 0 ? Array.from(selectedIds) : undefined,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `aileler-${new Date().toISOString().split("T")[0].replace(/-/g, "")}.txt`;
        a.click();
        window.URL.revokeObjectURL(url);
        setMessage("✅ TXT indirildi");
      } else {
        setMessage("❌ Export başarısız");
      }
    } catch {
      setMessage("❌ Export başarısız");
    }
    setTimeout(() => setMessage(""), 3000);
  }

  async function handleRemoveMember(familyId: string, memberId: string) {
    if (!confirm("Bu üye aileden çıkarılacak. Emin misiniz?")) return;

    try {
      const res = await fetch("/api/admin/family/remove-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId, memberId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Üye çıkarıldı");
        fetchFamilies();
      } else {
        setMessage("❌ " + (data.error || "İşlem başarısız"));
      }
    } catch {
      setMessage("❌ İşlem başarısız");
    }
    setTimeout(() => setMessage(""), 3000);
  }

  const filteredFamilies = families.filter((f) => {
    if (statusFilter === "active" && f.status !== "ACTIVE") return false;
    if (statusFilter === "closed" && f.status !== "CLOSED") return false;
    if (statusFilter === "expired" && f.status === "ACTIVE" && new Date(f.premiumUntil) > new Date()) return false;
    if (textFilter) {
      const text = textFilter.toLowerCase();
      return (
        f.inviteCode.toLowerCase().includes(text) ||
        f.ownerDeviceId.toLowerCase().includes(text) ||
        f.name?.toLowerCase().includes(text) ||
        f.fullName?.toLowerCase().includes(text) ||
        f.email?.toLowerCase().includes(text)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Aile Üyelikleri</h2>
          <p className="text-sm text-slate-600 mt-1">Toplam: {families.length}</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          ➕ Yeni Aile
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-lg border p-3 ${
            message.includes("✅")
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      <div className="mb-4 flex gap-2 items-center">
        <input
          type="text"
          placeholder="Kod, cihaz, ad, email ara..."
          value={textFilter}
          onChange={(e) => setTextFilter(e.target.value)}
          className="input flex-1"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
          <option value="all">Tümü</option>
          <option value="active">Aktif</option>
          <option value="closed">Kapalı</option>
          <option value="expired">Süresi Dolmuş</option>
        </select>
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-4 bg-teal-50 border border-teal-200 rounded-lg p-4">
          <p className="text-sm font-medium text-teal-900 mb-2">
            {selectedIds.size} aile seçildi
          </p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleExtendPeriod} className="btn-secondary text-sm">
              ⏰ Süre Uzat
            </button>
            <button onClick={handleChangeMaxMembers} className="btn-secondary text-sm">
              👥 Max Üye Değiştir
            </button>
            <button onClick={handleBulkClose} className="btn-secondary text-sm">
              🔒 Kapat
            </button>
            <button onClick={handleBulkReopen} className="btn-secondary text-sm">
              🔓 Yeniden Aç
            </button>
            <button onClick={handleExportExcel} className="btn-secondary text-sm">
              📊 Excel İndir
            </button>
            <button onClick={handleExportTxt} className="btn-secondary text-sm">
              📄 TXT İndir
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredFamilies.length && filteredFamilies.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Aile Adı / Kodu</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Yönetici</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Üye / Max</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Premium Bitiş</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Kaynak</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFamilies.map((f) => {
                const activeMembers = f.members.filter((m) => !m.removedAt).length;
                const isExpired = new Date(f.premiumUntil) < new Date();
                const statusText = f.status === "CLOSED" ? "Kapatıldı" : isExpired ? "Süresi doldu" : "Aktif";
                const statusColor = f.status === "CLOSED" || isExpired ? "text-red-600" : "text-green-600";

                return (
                  <>
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(f.id)}
                          onChange={(e) => handleSelectOne(f.id, e.target.checked)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-900">
                          {f.name || "(isimsiz)"}
                        </div>
                        <div className="text-xs text-slate-600">{f.inviteCode}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-900">{f.ownerDeviceId.substring(0, 8)}</div>
                        {f.fullName && <div className="text-xs text-slate-600">{f.fullName}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {activeMembers} / {f.maxMembers}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {new Date(f.premiumUntil).toLocaleDateString("tr-TR")}
                      </td>
                      <td className={`px-4 py-3 text-sm font-medium ${statusColor}`}>
                        {statusText}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {f.source === "code" ? "Kod" : f.source === "admin" ? "Admin" : "Satın Alım"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
                          className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                        >
                          {expandedId === f.id ? "Gizle" : "Detay"}
                        </button>
                      </td>
                    </tr>
                    {expandedId === f.id && (
                      <tr>
                        <td colSpan={8} className="px-4 py-3 bg-slate-50">
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-slate-900">Üyeler:</h4>
                            <div className="space-y-1">
                              {f.members
                                .filter((m) => !m.removedAt)
                                .map((m) => (
                                  <div
                                    key={m.id}
                                    className="flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-200"
                                  >
                                    <div>
                                      <span className="text-sm font-medium text-slate-900">
                                        {m.deviceId.substring(0, 8)}
                                      </span>
                                      <span className="text-xs text-slate-600 ml-2">
                                        ({m.role === "OWNER" ? "Yönetici" : "Üye"})
                                      </span>
                                      <span className="text-xs text-slate-500 ml-2">
                                        Katıldı: {new Date(m.joinedAt).toLocaleDateString("tr-TR")}
                                      </span>
                                    </div>
                                    {m.role !== "OWNER" && (
                                      <button
                                        onClick={() => handleRemoveMember(f.id, m.id)}
                                        className="text-red-600 hover:text-red-700 text-xs font-medium"
                                      >
                                        Çıkar
                                      </button>
                                    )}
                                  </div>
                                ))}
                            </div>
                            {f.note && (
                              <div className="mt-2">
                                <span className="text-xs font-semibold text-slate-700">Not:</span>
                                <p className="text-xs text-slate-600">{f.note}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <CreateFamilyModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            fetchFamilies();
            setShowCreateModal(false);
            setMessage("✅ Aile oluşturuldu");
            setTimeout(() => setMessage(""), 3000);
          }}
        />
      )}
    </div>
  );
}

type CreateFamilyModalProps = {
  onClose: () => void;
  onSuccess: () => void;
};

function CreateFamilyModal({ onClose, onSuccess }: CreateFamilyModalProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const body = {
      ownerDeviceId: fd.get("ownerDeviceId"),
      name: fd.get("name") || undefined,
      premiumDays: parseInt(fd.get("premiumDays") as string),
      maxMembers: parseInt(fd.get("maxMembers") as string),
      fullName: fd.get("fullName") || undefined,
      phone: fd.get("phone") || undefined,
      email: fd.get("email") || undefined,
      note: fd.get("note") || undefined,
    };

    const res = await fetch("/api/admin/family/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSubmitting(false);

    if (res.ok) {
      onSuccess();
    } else {
      const data = await res.json();
      alert("Hata: " + (data.error || "Oluşturulamadı"));
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Yeni Aile Oluştur</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Yönetici Device ID *</label>
            <input name="ownerDeviceId" required className="input" />
          </div>
          <div>
            <label className="label">Aile Adı</label>
            <input name="name" className="input" />
          </div>
          <div>
            <label className="label">Premium Gün Sayısı *</label>
            <input name="premiumDays" type="number" min="1" required defaultValue="365" className="input" />
          </div>
          <div>
            <label className="label">Max Üye *</label>
            <input name="maxMembers" type="number" min="2" max="20" required defaultValue="5" className="input" />
          </div>
          <div>
            <label className="label">Ad Soyad</label>
            <input name="fullName" className="input" />
          </div>
          <div>
            <label className="label">Telefon</label>
            <input name="phone" className="input" />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" className="input" />
          </div>
          <div>
            <label className="label">Not</label>
            <textarea name="note" rows={2} className="input"></textarea>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              İptal
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? "Oluşturuluyor..." : "Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
