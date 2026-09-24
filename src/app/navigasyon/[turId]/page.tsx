"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { NavigationView } from "@/components/NavigationView";
import { PaymentModal } from "@/components/PaymentModal";
import type { MapStop } from "@/components/MapView";
import { isTrialActive, checkTrialResetParam } from "@/lib/trial";

type Stop = {
  id: string;
  dayIndex: number;
  order: number;
  type: string;
  name: string;
  durationMin: number;
  note: string;
  lat: number;
  lng: number;
  address: string;
  skipped: boolean;
};

type Tour = {
  id: string;
  name: string;
  description: string;
  dayCount: number;
  startName: string;
  endName: string;
  stops: Stop[];
};

export default function NavigasyonPage() {
  const { turId } = useParams<{ turId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [userPlan, setUserPlan] = useState<string>("basic");
  const [trialActive, setTrialActive] = useState(true);

  // Detect if in preview mode for mock weather
  const useMockWeather = searchParams.get('previewRouteWeather') === 'mock' || 
                         searchParams.get('previewTheme') !== null;

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tours/${turId}`);
      if (res.status === 401) {
        await fetch("/api/auth/demo", { method: "POST" });
        const res2 = await fetch(`/api/tours/${turId}`);
        if (!res2.ok) {
          setError("Tur yüklenemedi");
          setLoading(false);
          return;
        }
        const data = await res2.json();
        setTour(data.tour);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError("Tur yüklenemedi");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setTour(data.tour);
      setLoading(false);
    } catch {
      setError("Tur yüklenirken bir hata oluştu");
      setLoading(false);
    }
  }, [turId, router]);

  useEffect(() => {
    load();
    
    // Check trial reset param
    checkTrialResetParam();
    
    // Load trial and user state
    setTrialActive(isTrialActive());
    
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) setUserPlan(d.user.plan || "basic");
      })
      .catch(() => {});
  }, [load]);

  const handleExit = () => {
    router.push(`/planlayici/${turId}`);
  };
  
  const handleFirstArrival = () => {
    // Only show payment modal if trial is active and user is not premium
    if (trialActive && userPlan !== "premium") {
      setShowPaymentModal(true);
    }
  };
  
  const handlePaymentComplete = () => {
    setShowPaymentModal(false);
    setUserPlan("premium");
    setTrialActive(false);
  };
  
  const handlePaymentClose = () => {
    setShowPaymentModal(false);
    setTrialActive(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mb-4 text-4xl">🗺️</div>
          <p className="text-sm text-slate-500">Navigasyon hazırlanıyor…</p>
        </div>
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
          <h2 className="text-xl font-bold text-red-600">Hata</h2>
          <p className="mt-3 text-sm text-slate-600">
            {error || "Tur bulunamadı"}
          </p>
          <button
            onClick={() => router.push("/turlar")}
            className="btn-primary mt-6 w-full"
          >
            Turlarım&apos;a Dön
          </button>
        </div>
      </div>
    );
  }

  const activeStops: MapStop[] = tour.stops
    .filter((s) => !s.skipped)
    .sort((a, b) => a.dayIndex - b.dayIndex || a.order - b.order)
    .map((s) => ({
      id: s.id,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      type: s.type,
      dayIndex: s.dayIndex,
      order: s.order,
    }));

  if (activeStops.length < 2) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
          <h2 className="text-xl font-bold text-amber-600">Yetersiz Durak</h2>
          <p className="mt-3 text-sm text-slate-600">
            Navigasyon başlatmak için en az 2 aktif durak gerekiyor. Lütfen
            planlayıcıdan durakları ekleyin.
          </p>
          <button
            onClick={() => router.push(`/planlayici/${turId}`)}
            className="btn-primary mt-6 w-full"
          >
            Planlayıcıya Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <NavigationView 
        stops={activeStops} 
        onExit={handleExit}
        onFirstArrival={handleFirstArrival}
        useMockWeather={useMockWeather}
      />
      {showPaymentModal && (
        <PaymentModal
          onClose={handlePaymentClose}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </>
  );
}
