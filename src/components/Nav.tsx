"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

type User = { id: string; name: string; email: string; plan: string };

export function Nav() {
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const hideOn = pathname?.startsWith("/p/");

  const isDemoUser = user?.email === "operator@demo.com";
  const displayName = isDemoUser ? "Misafir" : user?.name || "Misafir";

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.user || null))
      .catch(() => setUser(null));
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await fetch("/api/auth/demo", { method: "POST" });
    setUser(null);
    setDropdownOpen(false);
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
          {user && (
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
            </>
          )}
          
          {/* Avatar dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 transition"
              title={displayName}
            >
              {displayName.charAt(0).toUpperCase()}
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="font-semibold text-slate-900">{displayName}</p>
                  {user && !isDemoUser && (
                    <p className="mt-0.5 text-xs text-slate-500">{user.email}</p>
                  )}
                </div>
                
                <div className="py-1">
                  {isDemoUser ? (
                    <Link
                      href="/auth"
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Üye Ol
                    </Link>
                  ) : (
                    <>
                      <div className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Plan:</span>
                          <span className={user?.plan === "premium" ? "badge-premium" : "badge-basic"}>
                            {user?.plan === "premium" ? "Premium" : "Basic"}
                          </span>
                        </div>
                      </div>
                      {user?.plan === "basic" && (
                        <Link
                          href="/ayarlar"
                          className="block px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 transition"
                          onClick={() => setDropdownOpen(false)}
                        >
                          Premium&apos;a yükselt
                        </Link>
                      )}
                      <button
                        onClick={logout}
                        className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition"
                      >
                        Çıkış yap
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
