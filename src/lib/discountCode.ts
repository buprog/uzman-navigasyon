/**
 * Discount code utilities - status computation and validation
 */

export type DiscountCodeType = "PREMIUM_DAYS" | "PERCENT";
export type DiscountCodeStatus = "Aktif" | "Pasif";

export type DiscountStatusReason =
  | "Başlamadı"
  | "Süresi doldu"
  | "Kullanıldı"
  | "Devre dışı";

export interface DiscountCodeStatusResult {
  status: DiscountCodeStatus;
  reason?: DiscountStatusReason;
}

/**
 * Compute the status of a discount code
 * Aktif: startsAt <= now <= endsAt && !disabled && usedCount < maxUses
 * Pasif: with reason (Başlamadı / Süresi doldu / Kullanıldı / Devre dışı)
 */
export function getDiscountCodeStatus(code: {
  startsAt: Date | string;
  endsAt: Date | string;
  disabled: boolean;
  usedCount: number;
  maxUses: number;
}): DiscountCodeStatusResult {
  const now = new Date();
  const startsAt = new Date(code.startsAt);
  const endsAt = new Date(code.endsAt);

  if (code.disabled) {
    return { status: "Pasif", reason: "Devre dışı" };
  }

  if (code.usedCount >= code.maxUses) {
    return { status: "Pasif", reason: "Kullanıldı" };
  }

  if (now < startsAt) {
    return { status: "Pasif", reason: "Başlamadı" };
  }

  if (now > endsAt) {
    return { status: "Pasif", reason: "Süresi doldu" };
  }

  return { status: "Aktif" };
}

/**
 * Validate and normalize a discount code
 * Returns uppercase, trimmed code
 */
export function normalizeDiscountCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Check if a code is valid format (PREFIX-XXXXXX or similar)
 */
export function isValidCodeFormat(code: string): boolean {
  const normalized = normalizeDiscountCode(code);
  // At least 3 chars, contains alphanumeric and dash
  return /^[A-Z0-9]+-[A-Z0-9]+$/.test(normalized);
}
