import { cookies } from "next/headers";
import { Theme, Gender, ThemePreference, resolveTheme } from "./theme";

const THEME_COOKIE = "un_theme";
const PREVIEW_THEME_COOKIE = "un_preview_theme";

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
