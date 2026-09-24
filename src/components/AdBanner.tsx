"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";

type Ad = {
  id: string;
  title: string;
  text: string;
  imageUrl: string;
  clickUrl: string | null;
  targetGender: string;
};

type Settings = {
  rotationInterval: number;
  rotationMode: string;
};

type Props = {
  hideOnPages?: string[]; // pages where banner should be hidden
};

export function AdBanner({ hideOnPages = [] }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [impressionTracked, setImpressionTracked] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<Settings>({ rotationInterval: 5, rotationMode: "sıralı" });

  // Check if banner should be hidden on current page
  const shouldHide = hideOnPages.some(page => pathname.startsWith(page));

  useEffect(() => {
    async function fetchAds() {
      try {
        const res = await fetch("/api/ads");
        const data = await res.json();
        setAds(data.ads || []);
      } catch (err) {
        console.error("Failed to fetch ads:", err);
      } finally {
        setLoading(false);
      }
    }

    async function fetchSettings() {
      try {
        const res = await fetch("/api/ads/settings");
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      }
    }

    fetchAds();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (ads.length === 0) return;

    // Rotate ads based on settings
    const interval = setInterval(() => {
      if (settings.rotationMode === "rastgele") {
        // Random mode
        const randomIndex = Math.floor(Math.random() * ads.length);
        setCurrentIndex(randomIndex);
      } else {
        // Sequential mode (sıralı)
        setCurrentIndex((prev) => (prev + 1) % ads.length);
      }
    }, settings.rotationInterval * 1000);

    return () => clearInterval(interval);
  }, [ads.length, settings]);

  useEffect(() => {
    // Track impression when ad is shown
    if (ads.length > 0 && !impressionTracked.has(ads[currentIndex].id)) {
      const ad = ads[currentIndex];
      fetch(`/api/ads/${ad.id}/impression`, { method: "POST" })
        .catch(err => console.error("Failed to track impression:", err));
      setImpressionTracked(prev => new Set(prev).add(ad.id));
    }
  }, [currentIndex, ads, impressionTracked]);

  async function handleClick() {
    if (ads.length === 0) return;
    const ad = ads[currentIndex];
    
    // Track click
    await fetch(`/api/ads/${ad.id}/click`, { method: "POST" })
      .catch(err => console.error("Failed to track click:", err));
    
    // Navigate based on clickUrl
    if (ad.clickUrl) {
      // External link: open in new tab with noopener and sponsored
      window.open(ad.clickUrl, "_blank", "noopener,noreferrer");
    } else {
      // Internal detail page
      router.push(`/reklam/${ad.id}`);
    }
  }

  if (loading || ads.length === 0 || shouldHide) {
    return null;
  }

  const currentAd = ads[currentIndex];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg">
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 transition-colors"
      >
        <div className="flex-shrink-0 relative w-20 h-20 rounded overflow-hidden bg-slate-100">
          <Image
            src={currentAd.imageUrl}
            alt={currentAd.title}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Reklam
            </span>
            {ads.length > 1 && (
              <span className="text-[10px] text-slate-400">
                {currentIndex + 1} / {ads.length}
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-slate-800 truncate">
            {currentAd.title}
          </h3>
          <p className="text-xs text-slate-600 truncate">
            {currentAd.text}
          </p>
        </div>
        <svg
          className="w-5 h-5 text-slate-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
}
