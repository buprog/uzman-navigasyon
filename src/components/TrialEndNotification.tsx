"use client";

import { useEffect, useState } from "react";
import { shouldShowNotification, markNotificationShown } from "@/lib/trial";

export function TrialEndNotification() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (shouldShowNotification()) {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    markNotificationShown();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center">
      <div className="max-w-md rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="text-lg">🔒</span>
          <div className="flex-1">
            <p className="text-sm text-amber-900">
              Eğer premium bu özellikleri kullanmak istiyorsanız, lütfen paketi satın alın.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-amber-600 hover:text-amber-800 transition"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
