import { cookies } from "next/headers";
import { Theme, ColorMode, Gender, ThemePreference, ColorModePreference, resolveTheme } from "./theme";

const THEME_COOKIE = "un_theme";
const PREVIEW_THEME_COOKIE = "un_preview_theme";
const MODE_COOKIE = "un_mode";
const PREVIEW_MODE_COOKIE = "un_preview_mode";

/**
 * Get theme from server-side (for SSR)
 * Reads from preview cookie first (for /onizleme), then user session
 */
export function getServerTheme(
  user?: {
    gender: Gender;
    themePreference: ThemePreference;
  },
  previewThemeParam?: string | null
): Theme {
  // Check for preview theme parameter (for /onizleme iframe)
  if (previewThemeParam && ["neutral", "female", "male"].includes(previewThemeParam)) {
    return previewThemeParam as Theme;
  }

  // Check for preview theme cookie (for /onizleme)
  const previewTheme = cookies().get(PREVIEW_THEME_COOKIE)?.value as Theme | undefined;
  if (previewTheme && ["neutral", "female", "male"].includes(previewTheme)) {
    return previewTheme;
  }

  // Check for guest theme cookie
  const guestTheme = cookies().get(THEME_COOKIE)?.value as Theme | undefined;
  
  if (!user) {
    // Guest user
    return guestTheme && ["neutral", "female", "male"].includes(guestTheme)
      ? guestTheme
      : "neutral";
  }

  // Logged-in user
  return resolveTheme(user.themePreference, user.gender);
}

/**
 * Get color mode from server-side (for SSR)
 * Returns explicit mode or null for system (client will detect via prefers-color-scheme)
 */
export function getServerMode(
  user?: {
    colorModePreference: ColorModePreference;
  },
  previewModeParam?: string | null
): ColorMode | null {
  // Check for preview mode parameter (for /onizleme iframe)
  if (previewModeParam) {
    if (previewModeParam === "light" || previewModeParam === "dark") {
      return previewModeParam;
    }
    if (previewModeParam === "system") {
      return null; // Let client handle system detection
    }
  }

  // Check for preview mode cookie (for /onizleme)
  const previewMode = cookies().get(PREVIEW_MODE_COOKIE)?.value;
  if (previewMode === "light" || previewMode === "dark") {
    return previewMode;
  }

  // Check for guest mode cookie
  const guestMode = cookies().get(MODE_COOKIE)?.value;
  
  if (!user) {
    // Guest user
    if (guestMode === "light" || guestMode === "dark") {
      return guestMode;
    }
    return null; // System
  }

  // Logged-in user
  return user.colorModePreference as ColorMode | null;
}
