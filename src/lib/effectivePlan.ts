/**
 * Device-aware effective plan resolution with family membership support
 * Priority: device individual premium > family membership > user plan
 */

import { cookies } from "next/headers";
import { prisma } from "./prisma";

export type PremiumSource = "individual" | "family" | null;

export type FamilyInfo = {
  role: "OWNER" | "MEMBER";
  inviteCode?: string; // owner only
  members?: Array<{
    deviceIdShort: string;
    role: "OWNER" | "MEMBER";
    joinedAt: string;
  }>; // owner only
  maxMembers: number;
  premiumUntil: string;
};

export type EffectivePlan = {
  plan: "basic" | "premium";
  premiumExpiresAt: Date | null;
  isDevicePremium: boolean;
  source?: PremiumSource;
  family?: FamilyInfo;
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
 * Check if device has active family membership
 */
async function getFamilyMembership(deviceId: string): Promise<{
  hasPremium: boolean;
  premiumExpiresAt: Date | null;
  familyInfo: FamilyInfo | null;
}> {
  const now = new Date();

  // Find active membership for this device
  const membership = await prisma.familyMember.findFirst({
    where: {
      deviceId,
      removedAt: null,
    },
    include: {
      family: {
        include: {
          members: {
            where: {
              removedAt: null,
            },
            orderBy: {
              joinedAt: "asc",
            },
          },
        },
      },
    },
  });

  if (!membership || membership.family.status !== "ACTIVE") {
    return { hasPremium: false, premiumExpiresAt: null, familyInfo: null };
  }

  const family = membership.family;
  const hasPremium = family.premiumUntil > now;

  if (!hasPremium) {
    return { hasPremium: false, premiumExpiresAt: null, familyInfo: null };
  }

  const familyInfo: FamilyInfo = {
    role: membership.role as "OWNER" | "MEMBER",
    maxMembers: family.maxMembers,
    premiumUntil: family.premiumUntil.toISOString(),
  };

  // Include invite code and member list only for owner
  if (membership.role === "OWNER") {
    familyInfo.inviteCode = family.inviteCode;
    familyInfo.members = family.members.map((m) => ({
      deviceIdShort: m.deviceId.substring(0, 8),
      role: m.role as "OWNER" | "MEMBER",
      joinedAt: m.joinedAt.toISOString(),
    }));
  }

  return {
    hasPremium,
    premiumExpiresAt: family.premiumUntil,
    familyInfo,
  };
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
 * Resolve effective plan for a user, considering device premium and family membership
 * Priority: device individual premium > family membership > user plan
 */
export async function getEffectivePlan(
  userPlan: string | null | undefined,
  userPremiumExpiresAt: Date | string | null | undefined,
  deviceId?: string | null
): Promise<EffectivePlan> {
  // Get actual device ID
  const actualDeviceId = deviceId ?? getDeviceIdFromCookie();

  // First check device individual premium
  const devicePremium = await getDevicePremium(actualDeviceId);

  if (devicePremium.hasPremium) {
    return {
      plan: "premium",
      premiumExpiresAt: devicePremium.premiumExpiresAt,
      isDevicePremium: true,
      source: "individual",
    };
  }

  // Then check family membership
  if (actualDeviceId) {
    const familyMembership = await getFamilyMembership(actualDeviceId);

    if (familyMembership.hasPremium) {
      return {
        plan: "premium",
        premiumExpiresAt: familyMembership.premiumExpiresAt,
        isDevicePremium: true,
        source: "family",
        family: familyMembership.familyInfo!,
      };
    }
  }

  // Fall back to user plan
  if (userPlan !== "premium") {
    return {
      plan: "basic",
      premiumExpiresAt: null,
      isDevicePremium: false,
      source: null,
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
        source: null,
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
    source: "individual",
  };
}
