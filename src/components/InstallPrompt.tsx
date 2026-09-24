"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed === "true") {
      return;
    }

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isIOSStandalone = (navigator as any).standalone;
    if (isStandalone || isIOSStandalone) {
      return;
    }

    const timer = setTimeout(() => {
      setShowIOSInstructions(true);
    }, 3000);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      clearTimeout(timer);
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
      setShowIOSInstructions(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "dismissed") {
      localStorage.setItem("pwa-install-dismissed", "true");
    }

    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa-install-dismissed", "true");
    setShowInstallButton(false);
    setShowIOSInstructions(false);
  };

  if (showIOSInstructions) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md">
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="flex items-start gap-2">
            <svg className="h-4 w-4 shrink-0 text-teal-700 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-900">Ana Ekrana Ekle</h3>
              <ol className="mt-1 text-xs text-slate-600 space-y-0.5 list-decimal list-inside">
                <li>Tarayıcınızdaki <strong>Paylaş</strong> düğmesine (veya ⋮ menüsüne) dokunun</li>
                <li><strong>Ana Ekrana Ekle</strong> seçeneğini seçin</li>
              </ol>
            </div>
            <button
              onClick={handleDismiss}
              className="shrink-0 text-slate-400 hover:text-slate-600"
              aria-label="Kapat"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!showInstallButton) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md">
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <svg className="h-5 w-5 shrink-0 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900">Uygulamayı Yükle</h3>
              <p className="text-xs text-slate-600">Ana ekrana hızlı erişim</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
            >
              Kapat
            </button>
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 text-xs rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition"
            >
              Yükle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
