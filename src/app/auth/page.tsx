"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    
    const endpoint = mode === "signup" ? "/api/auth/register" : "/api/auth/login";
    const body: any = {
      email: fd.get("email"),
      password: fd.get("password"),
    };
    
    if (mode === "signup") {
      body.name = fd.get("name");
      body.companyName = fd.get("companyName");
    }
    
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || (mode === "signup" ? "Kayıt başarısız" : "Giriş başarısız"));
      return;
    }
    router.push("/turlar");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => { setMode("signup"); setError(""); }}
          className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
            mode === "signup"
              ? "bg-teal-700 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Üye Ol
        </button>
        <button
          onClick={() => { setMode("login"); setError(""); }}
          className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
            mode === "login"
              ? "bg-teal-700 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Giriş Yap
        </button>
      </div>

      <div className="card">
        <h1 className="text-2xl font-bold">
          {mode === "signup" ? "Hesap oluştur" : "Giriş yap"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {mode === "signup"
            ? "Basic planla ücretsiz başlayın."
            : "Hesabınıza giriş yapın."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <>
              <div>
                <label className="label">Ad soyad</label>
                <input name="name" required className="input" />
              </div>
            </>
          )}
          <div>
            <label className="label">E-posta</label>
            <input name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label">Şifre {mode === "signup" && "(min. 6)"}</label>
            <input
              name="password"
              type="password"
              minLength={mode === "signup" ? 6 : undefined}
              required
              className="input"
            />
          </div>
          {mode === "signup" && (
            <div>
              <label className="label">Şirket adı (opsiyonel)</label>
              <input name="companyName" className="input" />
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading
              ? (mode === "signup" ? "Kaydediliyor…" : "Giriş yapılıyor…")
              : (mode === "signup" ? "Hesap oluştur" : "Giriş yap")}
          </button>
        </form>
      </div>
    </div>
  );
}
