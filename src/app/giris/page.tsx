"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function GirisPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function fillDemoCredentials() {
    setEmail("operator@demo.com");
    setPassword("demo1234");
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Giriş başarısız");
      return;
    }
    router.push("/turlar");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold">Giriş</h1>
      <p className="mt-1 text-sm text-slate-500">
        Hesabınız yok mu?{" "}
        <Link href="/kayit" className="text-teal-700 underline">
          Kayıt ol
        </Link>
      </p>
      <form onSubmit={onSubmit} className="card mt-6 space-y-4">
        <div>
          <label className="label">E-posta</label>
          <input
            name="email"
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Şifre</label>
          <input
            name="password"
            type="password"
            required
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={fillDemoCredentials}
          className="w-full rounded border border-teal-600 bg-white px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
        >
          Demo hesabı doldur
        </button>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Giriş yapılıyor…" : "Giriş yap"}
        </button>
      </form>
      <p className="mt-4 text-xs text-slate-400">
        Test hesabı: operator@demo.com / demo1234
      </p>
    </div>
  );
}
