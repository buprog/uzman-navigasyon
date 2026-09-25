/**
 * Device-aware effective plan resolution
 * When a device has redeemed premium, treat the request as premium
 * even if the shared demo user is basic
 */

import { cookies } from "next/headers";
import { prisma } from "./prisma";

export type EffectivePlan = {
  plan: "basic" | "premium";
  premiumExpiresAt: Date | null;
  isDevicePremium: boolean;
};

const DEVICE_ID_COOKIE = "un_did";

/**
 * Get device ID from cookie
 */
export function getDeviceIdFromCookie(): string | null {
  try {
    const deviceId = cookies().get(DEVICE_ID_COOKIE)?.value;
    return deviceId || null;
  } catch {
    return null;
  }
}

/**
 * Check if device has active premium
 */
export async function getDevicePremium(
  deviceId: string | null
): Promise<{ hasPremium: boolean; premiumExpiresAt: Date | null }> {
  if (!deviceId) {
    return { hasPremium: false, premiumExpiresAt: null };
  }

  try {
    const device = await prisma.deviceIdentity.findUnique({
      where: { deviceId },
    });

    if (!device || !device.premiumExpiresAt) {
      return { hasPremium: false, premiumExpiresAt: null };
    }

    const now = new Date();
    const hasPremium = device.premiumExpiresAt > now;

    return {
      hasPremium,
      premiumExpiresAt: hasPremium ? device.premiumExpiresAt : null,
    };
  } catch {
    return { hasPremium: false, premiumExpiresAt: null };
  }
}

/**
 * Resolve effective plan for a user, considering device premium
 * Device premium overrides user plan
 */
export async function getEffectivePlan(
  userPlan: string | null | undefined,
  userPremiumExpiresAt: Date | string | null | undefined,
  deviceId?: string | null
): Promise<EffectivePlan> {
  // First check device premium
  const actualDeviceId = deviceId ?? getDeviceIdFromCookie();
  const devicePremium = await getDevicePremium(actualDeviceId);

  if (devicePremium.hasPremium) {
    return {
      plan: "premium",
      premiumExpiresAt: devicePremium.premiumExpiresAt,
      isDevicePremium: true,
    };
  }

  // Fall back to user plan
  if (userPlan !== "premium") {
    return {
      plan: "basic",
      premiumExpiresAt: null,
      isDevicePremium: false,
    };
  }

  // Check if user premium expired
  if (userPremiumExpiresAt) {
    const expiryDate =
      typeof userPremiumExpiresAt === "string"
        ? new Date(userPremiumExpiresAt)
        : userPremiumExpiresAt;
    if (new Date() > expiryDate) {
      return {
        plan: "basic",
        premiumExpiresAt: null,
        isDevicePremium: false,
      };
    }
  }

  return {
    plan: "premium",
    premiumExpiresAt:
      typeof userPremiumExpiresAt === "string"
        ? new Date(userPremiumExpiresAt)
        : userPremiumExpiresAt || null,
    isDevicePremium: false,
  };
}
