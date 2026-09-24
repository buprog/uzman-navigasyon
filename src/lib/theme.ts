export type Theme = "neutral" | "female" | "male";
export type ColorMode = "light" | "dark";
export type Gender = "MALE" | "FEMALE" | "UNSPECIFIED";
export type ThemePreference = "neutral" | "female" | "male" | null; // null = automatic
export type ColorModePreference = "light" | "dark" | null; // null = system (prefers-color-scheme)

/**
 * Map gender to automatic theme
 */
export function genderToTheme(gender: Gender): Theme {
  switch (gender) {
    case "MALE":
      return "male";
    case "FEMALE":
      return "female";
    case "UNSPECIFIED":
    default:
      return "neutral";
  }
}

/**
 * Resolve the effective theme based on preference and gender
 */
export function resolveTheme(
  themePreference: ThemePreference,
  gender: Gender
): Theme {
  if (themePreference) {
    return themePreference as Theme;
  }
  return genderToTheme(gender);
}


/**
 * Theme preference display names
 */
export const THEME_LABELS = {
  null: "Otomatik (cinsiyete göre)",
  neutral: "Nötr",
  female: "Sıcak pastel",
  male: "Koyu keskin",
} as const;

/**
 * Color mode preference display names
 */
export const MODE_LABELS = {
  null: "Sistem",
  light: "Açık",
  dark: "Karanlık",
} as const;
