"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type User = { id: string; name: string; email: string; plan: string };

export function Nav() {
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const hideOn = pathname?.startsWith("/p/");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.user || null))
      .catch(() => setUser(null));
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  if (hideOn) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-teal-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-sm text-white">
            UN
          </span>
          Uzman Navigasyon
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link href="/turlar" className="text-slate-600 hover:text-teal-800">
                Turlarım
              </Link>
              <Link href="/rezervasyonlar" className="text-slate-600 hover:text-teal-800">
                Rezervasyonlar
              </Link>
              <Link href="/ayarlar" className="text-slate-600 hover:text-teal-800">
                Ayarlar
              </Link>
              <span className={user.plan === "premium" ? "badge-premium" : "badge-basic"}>
                {user.plan === "premium" ? "Premium" : "Basic"}
              </span>
              <span className="hidden text-slate-500 sm:inline">{user.name}</span>
              <button onClick={logout} className="btn-secondary !py-1.5">
                Çıkış
              </button>
            </>
          ) : (
            <>
              <Link href="/giris" className="text-slate-600 hover:text-teal-800">
                Giriş
              </Link>
              <Link href="/kayit" className="btn-primary !py-1.5">
                Kayıt ol
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
