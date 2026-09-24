import { cookies } from "next/headers";
import { WeatherCondition } from "./weather";

const WEATHER_THEME_COOKIE = "un_weather_theme";
const PREVIEW_WEATHER_COOKIE = "un_preview_weather";

/**
 * Get weather theme enabled status from server-side
 */
export function getServerWeatherEnabled(
  user?: {
    weatherThemeEnabled: boolean;
  },
  previewWeatherParam?: string | null
): boolean {
  // Preview mode always enabled if a weather param is provided
  if (previewWeatherParam && previewWeatherParam !== "none") {
    return true;
  }

  // Check for preview weather cookie (for /onizleme)
  const previewWeather = cookies().get(PREVIEW_WEATHER_COOKIE)?.value;
  if (previewWeather && previewWeather !== "none") {
    return true;
  }

  // Check for guest cookie
  const guestEnabled = cookies().get(WEATHER_THEME_COOKIE)?.value;
  
  if (!user) {
    // Guest user
    return guestEnabled === "true";
  }

  // Logged-in user
  return user.weatherThemeEnabled;
}

/**
 * Get weather condition from server-side for preview
 */
export function getServerWeatherCondition(
  previewWeatherParam?: string | null
): WeatherCondition | null {
  // Check for preview weather parameter (for /onizleme iframe)
  if (previewWeatherParam) {
    const validConditions = ["none", "clear", "cloudy", "rain", "snow"];
    if (validConditions.includes(previewWeatherParam)) {
      return previewWeatherParam as WeatherCondition;
    }
  }

  // Check for preview weather cookie (for /onizleme)
  const previewWeather = cookies().get(PREVIEW_WEATHER_COOKIE)?.value;
  const validConditions = ["none", "clear", "cloudy", "rain", "snow"];
  if (previewWeather && validConditions.includes(previewWeather)) {
    return previewWeather as WeatherCondition;
  }

  // No preview - weather will be determined client-side
  return null;
}
