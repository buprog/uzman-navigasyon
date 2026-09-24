/**
 * Payment configuration - ALL PRICING CONSTANTS IN ONE PLACE
 * Real payment provider (iyzico/Stripe) can be plugged in later
 * 
 * PREMIUM PACKAGE: YEARLY/SENELIK ONLY
 */

// Core pricing constants
export const NORMAL_PRICE_TRY = 600;      // Normal yearly price
export const CAMPAIGN_DISCOUNT = 0.40;    // 40% discount
export const CAMPAIGN_DAYS = 15;          // Campaign valid for 15 days per email

// Derived values
const CAMPAIGN_PRICE_TRY = NORMAL_PRICE_TRY * (1 - CAMPAIGN_DISCOUNT);

export const PAYMENT_CONFIG = {
  yearly: {
    price: NORMAL_PRICE_TRY,
    campaignPrice: CAMPAIGN_PRICE_TRY,
    campaignDays: CAMPAIGN_DAYS,
    campaignDiscount: CAMPAIGN_DISCOUNT,
    currency: "TRY",
    period: "Yıllık / Senelik",
    periodDescription: "Yılda bir otomatik yenilenir",
    campaignBadge: `%${(CAMPAIGN_DISCOUNT * 100).toFixed(0)} kampanya`,
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
