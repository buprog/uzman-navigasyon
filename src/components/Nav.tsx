"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

type User = { id: string; name: string; email: string; plan: string };

export function Nav() {
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileAvatarRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const hideOn = pathname?.startsWith("/p/") || pathname?.startsWith("/onizleme");

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
      const target = event.target as Node;
      
      // Avatar dropdown: close only if outside BOTH desktop and mobile refs
      const inAvatar = [dropdownRef, mobileAvatarRef].some(r => r.current?.contains(target));
      if (!inAvatar) {
        setDropdownOpen(false);
      }
      
      // Hamburger menu: separate check
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setMobileMenuOpen(false);
      }
    }
    if (dropdownOpen || mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen, mobileMenuOpen]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await fetch("/api/auth/demo", { method: "POST" });
    setUser(null);
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  if (hideOn) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur transition-transform duration-300 planner-fullscreen-mobile:lg:translate-y-0 planner-fullscreen-mobile:-translate-y-full">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-teal-800">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-sm text-white">
              UN
            </span>
            <span className="hidden xs:inline">Uzman Navigasyon</span>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-3 text-sm md:flex">
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 transition"
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
                      <Link
                        href="/ayarlar/tema"
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                        onClick={() => setDropdownOpen(false)}
                      >
                        🎨 Tema
                      </Link>
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

        {/* Mobile nav */}
        <div className="flex items-center gap-2 md:hidden">
          {/* Avatar with dropdown */}
          <div className="relative" ref={mobileAvatarRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-semibold text-white"
              title={displayName}
            >
              {displayName.charAt(0).toUpperCase()}
            </button>

            {/* Avatar dropdown (mobile) */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="font-semibold text-slate-900">{displayName}</p>
                  {user && !isDemoUser && (
                    <p className="mt-0.5 text-xs text-slate-500">{user.email}</p>
                  )}
                </div>
                
                <div className="py-1">
                  {isDemoUser ? (
                    <>
                      <Link
                        href="/auth"
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Üye Ol
                      </Link>
                      <Link
                        href="/ayarlar"
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Ayarlar
                      </Link>
                    </>
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

          {/* Hamburger with menu */}
          {user && (
            <div className="relative" ref={mobileMenuRef}>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-slate-600 hover:bg-slate-100"
                aria-label="Menu"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Mobile menu dropdown */}
              {mobileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg">
                  <div className="py-1">
                    <Link
                      href="/turlar"
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Turlarım
                    </Link>
                    <Link
                      href="/rezervasyonlar"
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Rezervasyonlar
                    </Link>
                    <Link
                      href="/ayarlar"
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Ayarlar
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
