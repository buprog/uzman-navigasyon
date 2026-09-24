"use client";

import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="card max-w-md text-center">
        <svg
          className="mx-auto h-16 w-16 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
          />
        </svg>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          İnternet Bağlantısı Yok
        </h1>
        <p className="mt-2 text-slate-600">
          Uzman Navigasyon&apos;ı kullanmak için internet bağlantısı gerekiyor.
          Lütfen bağlantınızı kontrol edin ve tekrar deneyin.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Yeniden Dene
          </button>
          <Link href="/" className="btn-secondary">
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
