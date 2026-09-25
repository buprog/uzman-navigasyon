/**
 * Server-only discount code generation
 * Uses Node.js crypto for secure random number generation
 */

import { randomInt } from "node:crypto";

/**
 * Generate a random discount code
 * Format: PREFIX-XXXXXX
 * Alphabet: A-Z excluding ambiguous chars (O, I)
 */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding O, I, 0, 1

export function generateDiscountCode(prefix: string = "DISC"): string {
  const suffix = Array.from({ length: 6 }, () => {
    const randomIndex = randomInt(0, CODE_ALPHABET.length);
    return CODE_ALPHABET.charAt(randomIndex);
  }).join("");
  return `${prefix.toUpperCase()}-${suffix}`;
}
