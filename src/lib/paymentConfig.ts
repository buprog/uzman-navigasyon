/**
 * Payment configuration - placeholder prices, easy to update in ONE PLACE
 * Real payment provider (iyzico/Stripe) can be plugged in later
 * 
 * PREMIUM PACKAGE: YEARLY/SENELIK ONLY
 */

export const PAYMENT_CONFIG = {
  yearly: {
    price: 600.00,            // ₺600/yıl - Normal fiyat (değiştirilebilir)
    campaignPrice: 360.00,    // ₺360/yıl - Kampanya fiyatı (%40 indirim)
    campaignDays: 15,         // İlk 15 gün kampanya geçerli
    currency: "TRY",
    period: "Yıllık / Senelik",
    periodDescription: "Yılda bir otomatik yenilenir",
    campaignBadge: "%40 kampanya",
  },
} as const;

/**
 * Process a test payment (placeholder)
 * In production, replace with real payment provider (iyzico, Stripe, etc.)
 */
export async function processTestPayment(params: {
  userId: string;
  plan: "yearly";
  email: string;
}): Promise<{ success: boolean; message: string }> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Placeholder: always succeed in test mode
  // TODO: Replace with real payment provider integration
  return {
    success: true,
    message: `Test ödemesi başarılı: ${PAYMENT_CONFIG.yearly.period} Premium (Gerçek ücret alınmadı)`,
  };
}
