import { prisma } from "./prisma";

export type Plan = "basic" | "premium";

export const PLAN_LIMITS = {
  basic: {
    maxTours: 3,
    maxActiveDepartures: 2,
    maxReservationsPerMonth: 20,
    canCopySample: false,
  },
  premium: {
    maxTours: Infinity,
    maxActiveDepartures: Infinity,
    maxReservationsPerMonth: Infinity,
    canCopySample: true,
  },
} as const;

/**
 * Resolve effective plan, checking if premium has expired
 */
export function getEffectivePlan(
  plan: string | null | undefined,
  premiumExpiresAt: Date | string | null | undefined
): Plan {
  if (plan !== "premium") return "basic";
  
  // Check if premium expired
  if (premiumExpiresAt) {
    const expiryDate = typeof premiumExpiresAt === "string" 
      ? new Date(premiumExpiresAt) 
      : premiumExpiresAt;
    if (new Date() > expiryDate) {
      return "basic";
    }
  }
  
  return "premium";
}

export function isPremium(plan: string | null | undefined): boolean {
  return plan === "premium";
}

export function limitsFor(plan: string | null | undefined) {
  return isPremium(plan) ? PLAN_LIMITS.premium : PLAN_LIMITS.basic;
}

/** Active = yayin or dolu (not taslak/iptal) */
export async function countActiveDepartures(userId: string) {
  return prisma.departure.count({
    where: {
      tour: { userId },
      status: { in: ["yayin", "dolu"] },
    },
  });
}

export async function countTours(userId: string) {
  return prisma.tour.count({ where: { userId } });
}

export async function countReservationsThisMonth(userId: string) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return prisma.reservation.count({
    where: {
      departure: { tour: { userId } },
      createdAt: { gte: start },
    },
  });
}

export const PREMIUM_CTA = "Premium'a geç";
export const LIMIT_MESSAGES = {
  tours: `Basic planda en fazla ${PLAN_LIMITS.basic.maxTours} tur oluşturabilirsiniz. ${PREMIUM_CTA}`,
  departures: `Basic planda en fazla ${PLAN_LIMITS.basic.maxActiveDepartures} aktif kalkış açabilirsiniz. ${PREMIUM_CTA}`,
  reservations: `Basic planda aylık en fazla ${PLAN_LIMITS.basic.maxReservationsPerMonth} rezervasyon talebi alabilirsiniz. ${PREMIUM_CTA}`,
  sampleCopy: `Örnek tur kopyalama Premium özelliğidir. ${PREMIUM_CTA}`,
} as const;
