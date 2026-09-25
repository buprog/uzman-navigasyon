import { randomInt } from "crypto";

/**
 * Generate a family invite code in format AILE-XXXXXX
 * Excludes confusing characters: 0, O, 1, I
 */
export function generateFamilyInviteCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // No 0, O, 1, I
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[randomInt(chars.length)];
  }
  return `AILE-${code}`;
}
