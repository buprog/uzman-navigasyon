/**
 * Device-aware effective plan resolution with family membership support
 * premiumUntil = LATER of individual and family premium (if both active)
 * source = whichever gives the later date (tie: individual)
 * family info included whenever device has active membership in ACTIVE unexpired family
 */

import { cookies } from "next/headers";
import { prisma } from "./prisma";

export type PremiumSource = "individual" | "family" | null;

export type FamilyInfo = {
  role: "OWNER" | "MEMBER";
  inviteCode?: string; // owner only
  members?: Array<{
    id: string; // member id for removal
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

export type DevicePremiumStatus = {
  premiumUntil: string | null;
  source: PremiumSource;
  family: FamilyInfo | null;
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
 * Get device premium status (shared helper for /api/auth/me and /api/discount/status)
 * Returns the LATER of individual and family premium, plus family info if applicable
 */
export async function getDevicePremiumStatus(
  deviceId: string
): Promise<DevicePremiumStatus> {
  const now = new Date();

  // Check individual premium
  const device = await prisma.deviceIdentity.findUnique({
    where: { deviceId },
  });

  const individualPremium = device?.premiumExpiresAt;
  const individualActive =
    individualPremium && individualPremium > now ? individualPremium : null;

  // Check family membership
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

  let familyPremium: Date | null = null;
  let familyInfo: FamilyInfo | null = null;

  if (
    membership &&
    membership.family.status === "ACTIVE" &&
    membership.family.premiumUntil > now
  ) {
    familyPremium = membership.family.premiumUntil;

    familyInfo = {
      role: membership.role as "OWNER" | "MEMBER",
      maxMembers: membership.family.maxMembers,
      premiumUntil: membership.family.premiumUntil.toISOString(),
    };

    // Include invite code and member list only for owner
    if (membership.role === "OWNER") {
      familyInfo.inviteCode = membership.family.inviteCode;
      familyInfo.members = membership.family.members.map((m) => ({
        id: m.id,
        deviceIdShort: m.deviceId.substring(0, 8),
        role: m.role as "OWNER" | "MEMBER",
        joinedAt: m.joinedAt.toISOString(),
      }));
    }
  }

  // Determine the later premium date and source
  let premiumUntil: string | null = null;
  let source: PremiumSource = null;

  if (individualActive && familyPremium) {
    // Both active: choose the later one (tie: individual)
    if (individualActive >= familyPremium) {
      premiumUntil = individualActive.toISOString();
      source = "individual";
    } else {
      premiumUntil = familyPremium.toISOString();
      source = "family";
    }
  } else if (individualActive) {
    premiumUntil = individualActive.toISOString();
    source = "individual";
  } else if (familyPremium) {
    premiumUntil = familyPremium.toISOString();
    source = "family";
  }

  return {
    premiumUntil,
    source,
    family: familyInfo,
  };
}

/**
 * Resolve effective plan for a user, considering device premium and family membership
 * Returns the LATER of individual and family premium
 */
export async function getEffectivePlan(
  userPlan: string | null | undefined,
  userPremiumExpiresAt: Date | string | null | undefined,
  deviceId?: string | null
): Promise<EffectivePlan> {
  const actualDeviceId = deviceId ?? getDeviceIdFromCookie();

  if (actualDeviceId) {
    const deviceStatus = await getDevicePremiumStatus(actualDeviceId);

    if (deviceStatus.premiumUntil) {
      return {
        plan: "premium",
        premiumExpiresAt: new Date(deviceStatus.premiumUntil),
        isDevicePremium: true,
        source: deviceStatus.source,
        family: deviceStatus.family || undefined,
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
