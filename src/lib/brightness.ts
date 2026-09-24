/**
 * Brightness control utilities
 * Adjusts app UI brightness via CSS filter: brightness(x)
 */

export const BRIGHTNESS_MIN = 50;
export const BRIGHTNESS_MAX = 150;
export const BRIGHTNESS_DEFAULT = 100;
export const BRIGHTNESS_STEP = 5;

const BRIGHTNESS_STORAGE_KEY = "un_brightness";

/**
 * Validate brightness value
 */
export function validateBrightness(value: number): number {
  const clamped = Math.max(BRIGHTNESS_MIN, Math.min(BRIGHTNESS_MAX, value));
  return Math.round(clamped / BRIGHTNESS_STEP) * BRIGHTNESS_STEP;
}

/**
 * Get brightness from localStorage
 */
export function getBrightnessFromStorage(): number {
  if (typeof window === "undefined") return BRIGHTNESS_DEFAULT;
  
  try {
    const stored = localStorage.getItem(BRIGHTNESS_STORAGE_KEY);
    if (!stored) return BRIGHTNESS_DEFAULT;
    
    const value = parseInt(stored, 10);
    if (isNaN(value)) return BRIGHTNESS_DEFAULT;
    
    return validateBrightness(value);
  } catch {
    return BRIGHTNESS_DEFAULT;
  }
}

/**
 * Set brightness in localStorage
 */
export function setBrightnessInStorage(value: number): void {
  if (typeof window === "undefined") return;
  
  try {
    const validated = validateBrightness(value);
    localStorage.setItem(BRIGHTNESS_STORAGE_KEY, validated.toString());
  } catch {
    // Ignore errors
  }
}

/**
 * Apply brightness to document
 */
export function applyBrightness(value: number): void {
  if (typeof window === "undefined") return;
  
  const validated = validateBrightness(value);
  const root = document.documentElement;
  
  if (validated === BRIGHTNESS_DEFAULT) {
    // Skip filter at 100%
    root.style.removeProperty("--app-brightness");
    root.style.removeProperty("filter");
  } else {
    const decimal = validated / 100;
    root.style.setProperty("--app-brightness", decimal.toString());
    root.style.setProperty("filter", `brightness(${decimal})`);
  }
}

/**
 * Format brightness for accessibility
 */
export function formatBrightnessForAria(value: number): string {
  return `%${value}`;
}
