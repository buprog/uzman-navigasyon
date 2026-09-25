"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getCurrentTourId } from "@/lib/tourContext";

export default function KayitPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        password: fd.get("password"),
        companyName: fd.get("companyName"),
        currentTourId: getCurrentTourId(),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Kayıt başarısız");
      return;
    }
    router.push("/turlar");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold">Kayıt ol</h1>
      <p className="mt-1 text-sm text-slate-500">
        Basic planla ücretsiz başlayın.{" "}
        <Link href="/giris" className="text-teal-700 underline">
          Giriş
        </Link>
      </p>
      <form onSubmit={onSubmit} className="card mt-6 space-y-4">
        <div>
          <label className="label">Ad soyad</label>
          <input name="name" required className="input" />
        </div>
        <div>
          <label className="label">E-posta</label>
          <input name="email" type="email" required className="input" />
        </div>
        <div>
          <label className="label">Şifre (min. 6)</label>
          <input name="password" type="password" minLength={6} required className="input" />
        </div>
        <div>
          <label className="label">Şirket adı (opsiyonel)</label>
          <input name="companyName" className="input" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Kaydediliyor…" : "Hesap oluştur"}
        </button>
      </form>
    </div>
  );
}
