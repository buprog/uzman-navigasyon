"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AdsTab } from "./AdsTab";
import { SettingsTab } from "./SettingsTab";

type Props = {
  adminEmail: string;
};

export function AdminDashboard({ adminEmail }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<"ads" | "settings">("ads");

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    // Redirect to login page (same path with /signin)
    router.push(pathname + '/signin');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              🛠️ Yönetim Paneli
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {adminEmail}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="btn-secondary"
          >
            Çıkış Yap
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("ads")}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === "ads"
                ? "text-teal-700 border-b-2 border-teal-700"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📢 Reklamlar
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === "settings"
                ? "text-teal-700 border-b-2 border-teal-700"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ⚙️ Ayarlar
          </button>
        </div>

        {activeTab === "ads" && <AdsTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}
