/**
 * Sürücü asistanı stub’ları — gerçek video CDN / partner teklifi yok.
 */

export type BriefingVideo = {
  id: string;
  title: string;
  durationSec: number;
  topic: string;
};

/** Yola çıkmadan izle — örnek kart listesi (video yok). */
export const SAMPLE_BRIEFING_VIDEOS: BriefingVideo[] = [
  {
    id: "br-1",
    title: "Kalkış öncesi araç kontrol listesi",
    durationSec: 90,
    topic: "güvenlik",
  },
  {
    id: "br-2",
    title: "Yorgunluk ve mola planı",
    durationSec: 75,
    topic: "sürüş",
  },
  {
    id: "br-3",
    title: "Acil durumda ne yapılır? (112 / konum)",
    durationSec: 120,
    topic: "acil",
  },
  {
    id: "br-4",
    title: "Bagaj ve lastik basıncı hatırlatması",
    durationSec: 60,
    topic: "bakım",
  },
];

export type OfferStub = {
  id: string;
  title: string;
  reason: string;
  badge: string;
};

/** Düşük diş / yüksek km için örnek öneriler (mock). */
export function mockTireServiceOffers(opts: {
  odometerKm?: number | null;
  tireTreadMm?: number | null;
  vehicleMake?: string | null;
}): OfferStub[] {
  const offers: OfferStub[] = [];
  const tread = opts.tireTreadMm;
  const km = opts.odometerKm;
  const make = opts.vehicleMake || "aracınız";

  if (tread != null && tread < 3) {
    offers.push({
      id: "tire-low",
      title: "Lastik değişim önerisi (örnek)",
      reason: `Diş derinliği ${tread.toFixed(1)} mm — yasal sınır yakınında. Canlı teklif yok; örnek kart.`,
      badge: "örnek / yakında",
    });
  } else if (tread != null && tread < 4) {
    offers.push({
      id: "tire-watch",
      title: "Lastik kontrolü planlayın (örnek)",
      reason: `Diş ${tread.toFixed(1)} mm — bir sonraki bakıma not.`,
      badge: "örnek / yakında",
    });
  }

  if (km != null && km >= 100_000) {
    offers.push({
      id: "svc-hi-km",
      title: `${make} yetkili servis bakımı (örnek)`,
      reason: `Km saati ${km.toLocaleString("tr-TR")} — periyodik bakım hatırlatması stub.`,
      badge: "örnek / yakında",
    });
  } else if (km != null && km >= 60_000) {
    offers.push({
      id: "svc-mid-km",
      title: "Ara bakım paketi (örnek)",
      reason: `Km saati ${km.toLocaleString("tr-TR")} — yağ / filtre kontrolü stub.`,
      badge: "örnek / yakında",
    });
  }

  if (offers.length === 0) {
    offers.push({
      id: "ok",
      title: "Şimdilik acil öneri yok",
      reason:
        "Diş derinliği ve km girildiğinde örnek lastik/servis kartları burada görünür. Partner teklifi yok.",
      badge: "bilgi",
    });
  }

  return offers;
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}:${String(s).padStart(2, "0")}` : `${m}:00`;
}
