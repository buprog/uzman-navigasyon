"use client";

import { useState, useEffect } from "react";
import { getDiscountCodeStatus } from "@/lib/discountCode";

type DiscountCode = {
  id: string;
  code: string;
  type: string;
  premiumDays: number | null;
  percent: number | null;
  startsAt: string;
  endsAt: string;
  maxUses: number;
  usedCount: number;
  batchName: string | null;
  batchId: string | null;
  fullName: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
  disabled: boolean;
  createdAt: string;
};

export function DiscountCodesTab() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"hepsi" | "aktif" | "pasif">(
    "hepsi"
  );
  const [grupFilter, setGrupFilter] = useState<string>("");
  const [searchText, setSearchText] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [showAssignContactModal, setShowAssignContactModal] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [assignContactForm, setAssignContactForm] = useState({
    fullName: "",
    company: "",
    phone: "",
    email: "",
  });

  // Form states
  const [form, setForm] = useState({
    code: "",
    type: "PREMIUM_DAYS",
    premiumDays: "365",
    percent: "",
    startsAt: "",
    endsAt: "",
    maxUses: "1",
    batchName: "",
    fullName: "",
    company: "",
    phone: "",
    email: "",
    note: "",
  });

  const [bulkForm, setBulkForm] = useState({
    count: "10",
    prefix: "DISC",
    type: "PREMIUM_DAYS",
    premiumDays: "365",
    percent: "",
    startsAt: "",
    endsAt: "",
    maxUses: "1",
    batchName: "",
    fullName: "",
    company: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    fetchCodes();
  }, []);

  async function fetchCodes() {
    try {
      const res = await fetch(`/api/admin/discount?status=${statusFilter}&search=${searchText}`);
      const data = await res.json();
      setCodes(data.codes || []);
    } catch (err) {
      console.error("Failed to fetch codes:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCode() {
    try {
      const res = await fetch("/api/admin/discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code || undefined,
          type: form.type,
          premiumDays: form.type === "PREMIUM_DAYS" ? parseInt(form.premiumDays) : null,
          percent: form.type === "PERCENT" ? parseInt(form.percent) : null,
          startsAt: form.startsAt,
          endsAt: form.endsAt,
          maxUses: parseInt(form.maxUses),
          batchName: form.batchName || null,
          fullName: form.fullName || null,
          company: form.company || null,
          phone: form.phone || null,
          email: form.email || null,
          note: form.note || null,
        }),
      });

      if (res.ok) {
        setShowCreateForm(false);
        resetForm();
        fetchCodes();
      } else {
        const data = await res.json();
        alert(data.error || "Oluşturma başarısız");
      }
    } catch (err) {
      console.error("Failed to create code:", err);
      alert("Oluşturma başarısız");
    }
  }

  async function handleBulkGenerate() {
    try {
      const res = await fetch("/api/admin/discount/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: parseInt(bulkForm.count),
          prefix: bulkForm.prefix,
          type: bulkForm.type,
          premiumDays: bulkForm.type === "PREMIUM_DAYS" ? parseInt(bulkForm.premiumDays) : null,
          percent: bulkForm.type === "PERCENT" ? parseInt(bulkForm.percent) : null,
          startsAt: bulkForm.startsAt,
          endsAt: bulkForm.endsAt,
          maxUses: parseInt(bulkForm.maxUses),
          batchName: bulkForm.batchName || null,
          fullName: bulkForm.fullName || null,
          company: bulkForm.company || null,
          phone: bulkForm.phone || null,
          email: bulkForm.email || null,
        }),
      });

      if (res.ok) {
        setShowBulkForm(false);
        resetBulkForm();
        fetchCodes();
        alert("Kodlar oluşturuldu");
      } else {
        const data = await res.json();
        alert(data.error || "Oluşturma başarısız");
      }
    } catch (err) {
      console.error("Failed to bulk generate:", err);
      alert("Oluşturma başarısız");
    }
  }

  async function handleEdit(code: DiscountCode) {
    setEditingCode(code);
  }

  async function handleSaveEdit() {
    if (!editingCode) return;

    try {
      const res = await fetch(`/api/admin/discount/${editingCode.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: editingCode.startsAt,
          endsAt: editingCode.endsAt,
          fullName: editingCode.fullName || null,
          company: editingCode.company || null,
          phone: editingCode.phone || null,
          email: editingCode.email || null,
          note: editingCode.note || null,
          disabled: editingCode.disabled,
        }),
      });

      if (res.ok) {
        setEditingCode(null);
        fetchCodes();
      } else {
        alert("Güncelleme başarısız");
      }
    } catch (err) {
      console.error("Failed to update code:", err);
      alert("Güncelleme başarısız");
    }
  }

  async function handleDelete(id: string) {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    try {
      const res = await fetch(`/api/admin/discount/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchCodes();
        setDeleteConfirm(null);
      } else {
        alert("Silme başarısız");
      }
    } catch (err) {
      console.error("Failed to delete code:", err);
      alert("Silme başarısız");
    }
  }

  async function handleBulkAction(action: string, format?: string, detailed?: boolean) {
    if (selectedIds.size === 0) {
      alert("Lütfen en az bir kod seçin");
      return;
    }

    if (action === "delete") {
      if (!confirm(`${selectedIds.size} kodu silmek istediğinizden emin misiniz?`)) {
        return;
      }
    }

    try {
      const res = await fetch("/api/admin/discount/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ids: Array.from(selectedIds),
          format,
          detailed,
        }),
      });

      if (action === "export" && res.ok) {
        // Download file
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
        a.download =
          format === "xlsx"
            ? `indirim-kodlari-${dateStr}.xlsx`
            : `indirim-kodlari-${dateStr}.txt`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else if (res.ok) {
        fetchCodes();
        setSelectedIds(new Set());
        alert("İşlem tamamlandı");
      } else {
        const data = await res.json();
        alert(data.error || "İşlem başarısız");
      }
    } catch (err) {
      console.error("Failed to perform bulk action:", err);
      alert("İşlem başarısız");
    }
  }

  async function handleAssignContact() {
    if (selectedIds.size === 0) {
      alert("Lütfen en az bir kod seçin");
      return;
    }

    try {
      const res = await fetch("/api/admin/discount/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign_contact",
          ids: Array.from(selectedIds),
          contactInfo: assignContactForm,
        }),
      });

      if (res.ok) {
        setShowAssignContactModal(false);
        setAssignContactForm({
          fullName: "",
          company: "",
          phone: "",
          email: "",
        });
        fetchCodes();
        setSelectedIds(new Set());
        alert("İletişim bilgileri atandı");
      } else {
        const data = await res.json();
        alert(data.error || "İşlem başarısız");
      }
    } catch (err) {
      console.error("Failed to assign contact:", err);
      alert("İşlem başarısız");
    }
  }

  function toggleSelect(id: string) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredCodes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCodes.map((c) => c.id)));
    }
  }

  function resetForm() {
    setForm({
      code: "",
      type: "PREMIUM_DAYS",
      premiumDays: "365",
      percent: "",
      startsAt: "",
      endsAt: "",
      maxUses: "1",
      batchName: "",
      fullName: "",
      company: "",
      phone: "",
      email: "",
      note: "",
    });
  }

  function resetBulkForm() {
    setBulkForm({
      count: "10",
      prefix: "DISC",
      type: "PREMIUM_DAYS",
      premiumDays: "365",
      percent: "",
      startsAt: "",
      endsAt: "",
      maxUses: "1",
      batchName: "",
      fullName: "",
      company: "",
      phone: "",
      email: "",
    });
  }

  const filteredCodes = codes.filter((c) => {
    if (statusFilter !== "hepsi") {
      const status = getDiscountCodeStatus({
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        disabled: c.disabled,
        usedCount: c.usedCount,
        maxUses: c.maxUses,
      });
      const isActive = status.status === "Aktif";
      if (statusFilter === "aktif" && !isActive) return false;
      if (statusFilter === "pasif" && isActive) return false;
    }
    if (grupFilter && c.batchName !== grupFilter) {
      return false;
    }
    if (searchText) {
      const lower = searchText.toLowerCase();
      return (
        c.code.toLowerCase().includes(lower) ||
        c.fullName?.toLowerCase().includes(lower) ||
        c.company?.toLowerCase().includes(lower) ||
        c.phone?.toLowerCase().includes(lower) ||
        c.email?.toLowerCase().includes(lower) ||
        c.batchName?.toLowerCase().includes(lower)
      );
    }
    return true;
  });

  // Get unique batch names for grup filter
  const uniqueBatchNames = Array.from(
    new Set(codes.map((c) => c.batchName).filter((b) => b))
  ).sort();

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
          <h2 className="text-xl font-bold text-slate-900">İndirim Kodları</h2>
          <p className="text-sm text-slate-600 mt-1">
            Toplam {codes.length} kod, {filteredCodes.length} gösteriliyor
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreateForm(true)} className="btn-primary">
            + Tek Kod
          </button>
          <button onClick={() => setShowBulkForm(true)} className="btn-primary">
            + Toplu Oluştur
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase">
            Durum
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="input mt-1"
          >
            <option value="hepsi">Hepsi</option>
            <option value="aktif">Aktif</option>
            <option value="pasif">Pasif</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase">
            Grup
          </label>
          <select
            value={grupFilter}
            onChange={(e) => setGrupFilter(e.target.value)}
            className="input mt-1"
          >
            <option value="">Hepsi</option>
            {uniqueBatchNames.map((name) => (
              <option key={name} value={name || ""}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs font-semibold text-slate-600 uppercase">
            Arama
          </label>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Kod, isim, firma, telefon, e-posta, grup..."
            className="input mt-1"
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-teal-50 rounded-xl p-4 mb-4 flex items-center gap-4">
          <p className="font-semibold text-teal-900">
            {selectedIds.size} kod seçildi
          </p>
          <button
            onClick={() => handleBulkAction("export", "xlsx")}
            className="btn-secondary text-sm"
          >
            📥 Excel
          </button>
          <button
            onClick={() => handleBulkAction("export", "txt", true)}
            className="btn-secondary text-sm"
          >
            📄 TXT (detaylı)
          </button>
          <button
            onClick={() => handleBulkAction("export", "txt", false)}
            className="btn-secondary text-sm"
          >
            📄 TXT (sadece kod)
          </button>
          <button
            onClick={() => handleBulkAction("disable")}
            className="btn-secondary text-sm"
          >
            🚫 Pasif Yap
          </button>
          <button
            onClick={() => setShowAssignContactModal(true)}
            className="btn-secondary text-sm"
          >
            👤 Kişi/Firma Ata
          </button>
          <button
            onClick={() => handleBulkAction("delete")}
            className="btn-secondary text-sm bg-red-100 text-red-700 hover:bg-red-200"
          >
            🗑️ Sil
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredCodes.length && filteredCodes.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Kod
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Tür
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Kişi/Firma
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                İletişim
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Tarih
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Kullanım
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Durum
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                Grup
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredCodes.map((c) => {
              const status = getDiscountCodeStatus({
                startsAt: c.startsAt,
                endsAt: c.endsAt,
                disabled: c.disabled,
                usedCount: c.usedCount,
                maxUses: c.maxUses,
              });

              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-slate-900">
                      {c.code}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.type === "PREMIUM_DAYS" ? (
                      <span className="text-teal-700">
                        Premium ({c.premiumDays} gün)
                      </span>
                    ) : (
                      <span className="text-orange-700">İndirim %{c.percent}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs">
                      {c.fullName && <p className="font-semibold">{c.fullName}</p>}
                      {c.company && <p className="text-slate-600">{c.company}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs">
                      {c.phone && <p>{c.phone}</p>}
                      {c.email && <p className="text-slate-600">{c.email}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p>
                      {new Date(c.startsAt).toLocaleDateString("tr-TR")}
                    </p>
                    <p className="text-slate-600">
                      {new Date(c.endsAt).toLocaleDateString("tr-TR")}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-slate-900">
                      {c.usedCount}/{c.maxUses}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        status.status === "Aktif"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {status.status}
                      {status.reason && ` (${status.reason})`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {c.batchName || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(c)}
                        className="text-xs px-3 py-1 rounded bg-teal-100 text-teal-700 hover:bg-teal-200 font-semibold transition"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className={`text-xs px-3 py-1 rounded font-semibold transition ${
                          deleteConfirm === c.id
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        {deleteConfirm === c.id ? "Emin misiniz?" : "Sil"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredCodes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-600">Kod bulunamadı.</p>
          </div>
        )}
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8 p-6">
            <h3 className="text-xl font-bold mb-4">Yeni İndirim Kodu</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Kod (boş bırakılırsa otomatik)</label>
                <input
                  type="text"
                  className="input"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="DISC-XXXXXX"
                />
              </div>
              <div>
                <label className="label">Tür</label>
                <select
                  className="input"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="PREMIUM_DAYS">Premium (gün)</option>
                  <option value="PERCENT">İndirim (%)</option>
                </select>
              </div>
              {form.type === "PREMIUM_DAYS" && (
                <div>
                  <label className="label">Gün sayısı</label>
                  <input
                    type="number"
                    className="input"
                    value={form.premiumDays}
                    onChange={(e) => setForm({ ...form, premiumDays: e.target.value })}
                  />
                </div>
              )}
              {form.type === "PERCENT" && (
                <div>
                  <label className="label">İndirim (%)</label>
                  <input
                    type="number"
                    className="input"
                    value={form.percent}
                    onChange={(e) => setForm({ ...form, percent: e.target.value })}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Başlangıç</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Bitiş</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={form.endsAt}
                    onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Maksimum kullanım</label>
                <input
                  type="number"
                  className="input"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Grup adı</label>
                <input
                  type="text"
                  className="input"
                  value={form.batchName}
                  onChange={(e) => setForm({ ...form, batchName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">İsim Soyisim</label>
                  <input
                    type="text"
                    className="input"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Firma</label>
                  <input
                    type="text"
                    className="input"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Telefon</label>
                  <input
                    type="tel"
                    className="input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">E-posta</label>
                  <input
                    type="email"
                    className="input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Not</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="btn-secondary"
              >
                İptal
              </button>
              <button onClick={handleCreateCode} className="btn-primary">
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Generate Form Modal */}
      {showBulkForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8 p-6">
            <h3 className="text-xl font-bold mb-4">Toplu Kod Oluştur</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Adet (1-1000)</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    className="input"
                    value={bulkForm.count}
                    onChange={(e) => setBulkForm({ ...bulkForm, count: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Önek</label>
                  <input
                    type="text"
                    className="input"
                    value={bulkForm.prefix}
                    onChange={(e) => setBulkForm({ ...bulkForm, prefix: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Tür</label>
                <select
                  className="input"
                  value={bulkForm.type}
                  onChange={(e) => setBulkForm({ ...bulkForm, type: e.target.value })}
                >
                  <option value="PREMIUM_DAYS">Premium (gün)</option>
                  <option value="PERCENT">İndirim (%)</option>
                </select>
              </div>
              {bulkForm.type === "PREMIUM_DAYS" && (
                <div>
                  <label className="label">Gün sayısı</label>
                  <input
                    type="number"
                    className="input"
                    value={bulkForm.premiumDays}
                    onChange={(e) => setBulkForm({ ...bulkForm, premiumDays: e.target.value })}
                  />
                </div>
              )}
              {bulkForm.type === "PERCENT" && (
                <div>
                  <label className="label">İndirim (%)</label>
                  <input
                    type="number"
                    className="input"
                    value={bulkForm.percent}
                    onChange={(e) => setBulkForm({ ...bulkForm, percent: e.target.value })}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Başlangıç</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={bulkForm.startsAt}
                    onChange={(e) => setBulkForm({ ...bulkForm, startsAt: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Bitiş</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={bulkForm.endsAt}
                    onChange={(e) => setBulkForm({ ...bulkForm, endsAt: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Maksimum kullanım (her kod için)</label>
                <input
                  type="number"
                  className="input"
                  value={bulkForm.maxUses}
                  onChange={(e) => setBulkForm({ ...bulkForm, maxUses: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Grup adı</label>
                <input
                  type="text"
                  className="input"
                  value={bulkForm.batchName}
                  onChange={(e) => setBulkForm({ ...bulkForm, batchName: e.target.value })}
                />
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Ortak kişi/firma bilgisi (opsiyonel)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">İsim Soyisim</label>
                    <input
                      type="text"
                      className="input"
                      value={bulkForm.fullName}
                      onChange={(e) => setBulkForm({ ...bulkForm, fullName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Firma</label>
                    <input
                      type="text"
                      className="input"
                      value={bulkForm.company}
                      onChange={(e) => setBulkForm({ ...bulkForm, company: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="label">Telefon</label>
                    <input
                      type="tel"
                      className="input"
                      value={bulkForm.phone}
                      onChange={(e) => setBulkForm({ ...bulkForm, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">E-posta</label>
                    <input
                      type="email"
                      className="input"
                      value={bulkForm.email}
                      onChange={(e) => setBulkForm({ ...bulkForm, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowBulkForm(false);
                  resetBulkForm();
                }}
                className="btn-secondary"
              >
                İptal
              </button>
              <button onClick={handleBulkGenerate} className="btn-primary">
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8 p-6">
            <h3 className="text-xl font-bold mb-4">
              Düzenle: {editingCode.code}
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Başlangıç</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={editingCode.startsAt.slice(0, 16)}
                    onChange={(e) =>
                      setEditingCode({ ...editingCode, startsAt: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">Bitiş</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={editingCode.endsAt.slice(0, 16)}
                    onChange={(e) =>
                      setEditingCode({ ...editingCode, endsAt: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">İsim Soyisim</label>
                  <input
                    type="text"
                    className="input"
                    value={editingCode.fullName || ""}
                    onChange={(e) =>
                      setEditingCode({ ...editingCode, fullName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">Firma</label>
                  <input
                    type="text"
                    className="input"
                    value={editingCode.company || ""}
                    onChange={(e) =>
                      setEditingCode({ ...editingCode, company: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Telefon</label>
                  <input
                    type="tel"
                    className="input"
                    value={editingCode.phone || ""}
                    onChange={(e) =>
                      setEditingCode({ ...editingCode, phone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">E-posta</label>
                  <input
                    type="email"
                    className="input"
                    value={editingCode.email || ""}
                    onChange={(e) =>
                      setEditingCode({ ...editingCode, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="label">Not</label>
                <textarea
                  className="input"
                  rows={2}
                  value={editingCode.note || ""}
                  onChange={(e) =>
                    setEditingCode({ ...editingCode, note: e.target.value })
                  }
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingCode.disabled}
                  onChange={(e) =>
                    setEditingCode({ ...editingCode, disabled: e.target.checked })
                  }
                />
                <span className="text-sm font-semibold">Devre dışı</span>
              </label>
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <button
                onClick={() => setEditingCode(null)}
                className="btn-secondary"
              >
                İptal
              </button>
              <button onClick={handleSaveEdit} className="btn-primary">
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Contact Modal */}
      {showAssignContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8 p-6">
            <h3 className="text-xl font-bold mb-4">
              Kişi/Firma Bilgisi Ata ({selectedIds.size} kod)
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">İsim Soyisim</label>
                  <input
                    type="text"
                    className="input"
                    value={assignContactForm.fullName}
                    onChange={(e) =>
                      setAssignContactForm({ ...assignContactForm, fullName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">Firma</label>
                  <input
                    type="text"
                    className="input"
                    value={assignContactForm.company}
                    onChange={(e) =>
                      setAssignContactForm({ ...assignContactForm, company: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Telefon</label>
                  <input
                    type="tel"
                    className="input"
                    value={assignContactForm.phone}
                    onChange={(e) =>
                      setAssignContactForm({ ...assignContactForm, phone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">E-posta</label>
                  <input
                    type="email"
                    className="input"
                    value={assignContactForm.email}
                    onChange={(e) =>
                      setAssignContactForm({ ...assignContactForm, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <p className="text-sm text-slate-600">
                Bu bilgiler seçili tüm kodlara atanacak. Boş bırakılan alanlar değiştirilmez.
              </p>
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowAssignContactModal(false);
                  setAssignContactForm({
                    fullName: "",
                    company: "",
                    phone: "",
                    email: "",
                  });
                }}
                className="btn-secondary"
              >
                İptal
              </button>
              <button onClick={handleAssignContact} className="btn-primary">
                Ata
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
