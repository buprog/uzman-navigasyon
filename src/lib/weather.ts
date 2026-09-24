/**
 * Weather-adaptive theme utilities (client-side)
 */

export type WeatherCondition = "none" | "clear" | "cloudy" | "rain" | "snow";
export type WeatherThemeStrategy = "variant" | "replace" | "off-in-dark";

/**
 * Configuration constant for weather theme behavior
 * - variant: Weather modifies CSS variables on top of gender theme (default)
 * - replace: Weather completely replaces gender theme
 * - off-in-dark: Weather theme is disabled in dark mode
 */
export const WEATHER_THEME_STRATEGY: WeatherThemeStrategy = "variant";

/**
 * Display names for weather conditions
 */
export const WEATHER_LABELS = {
  none: "Yok",
  clear: "Güneşli",
  cloudy: "Bulutlu",
  rain: "Yağmurlu",
  snow: "Karlı",
} as const;

/**
 * Map WMO weather codes to our weather conditions
 * https://open-meteo.com/en/docs
 */
export function wmoCodeToWeather(code: number, isDay: boolean): WeatherCondition {
  // Clear sky
  if (code === 0) return "clear";
  
  // Mainly clear, partly cloudy
  if (code === 1 || code === 2) return "clear";
  
  // Overcast
  if (code === 3) return "cloudy";
  
  // Fog, depositing rime fog
  if (code >= 45 && code <= 48) return "cloudy";
  
  // Drizzle (light, moderate, dense)
  if (code >= 51 && code <= 55) return "rain";
  
  // Freezing drizzle
  if (code >= 56 && code <= 57) return "rain";
  
  // Rain (slight, moderate, heavy)
  if (code >= 61 && code <= 65) return "rain";
  
  // Freezing rain
  if (code >= 66 && code <= 67) return "rain";
  
  // Snow fall (slight, moderate, heavy)
  if (code >= 71 && code <= 75) return "snow";
  
  // Snow grains
  if (code === 77) return "snow";
  
  // Rain showers (slight, moderate, violent)
  if (code >= 80 && code <= 82) return "rain";
  
  // Snow showers (slight, heavy)
  if (code >= 85 && code <= 86) return "snow";
  
  // Thunderstorm (slight, moderate, heavy, with hail)
  if (code >= 95 && code <= 99) return "rain";
  
  // Default fallback
  return isDay ? "clear" : "none";
}

/**
 * Round coordinates to reduce cache key variations
 * Rounds to 2 decimal places (~1km precision)
 */
export function roundCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  return {
    lat: Math.round(lat * 100) / 100,
    lng: Math.round(lng * 100) / 100,
  };
}

/**
 * Weather cache entry
 */
export interface WeatherCache {
  condition: WeatherCondition;
  timestamp: number;
  lat: number;
  lng: number;
}

const WEATHER_CACHE_KEY = "un_weather_cache";
const WEATHER_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Get cached weather data
 */
export function getWeatherCache(): WeatherCache | null {
  if (typeof window === "undefined") return null;
  
  try {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!cached) return null;
    
    const data = JSON.parse(cached) as WeatherCache;
    
    // Check if cache is still valid
    if (Date.now() - data.timestamp > WEATHER_CACHE_DURATION) {
      localStorage.removeItem(WEATHER_CACHE_KEY);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

/**
 * Set weather cache
 */
export function setWeatherCache(lat: number, lng: number, condition: WeatherCondition): void {
  if (typeof window === "undefined") return;
  
  try {
    const cache: WeatherCache = {
      condition,
      timestamp: Date.now(),
      lat,
      lng,
    };
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore errors
  }
}

/**
 * Check if cached weather is still valid for given coordinates
 */
export function isWeatherCacheValid(lat: number, lng: number): boolean {
  const cache = getWeatherCache();
  if (!cache) return false;
  
  const rounded = roundCoordinates(lat, lng);
  
  // Check if coordinates match (within 0.1 degree ~ 11km)
  return (
    Math.abs(cache.lat - rounded.lat) < 0.1 &&
    Math.abs(cache.lng - rounded.lng) < 0.1
  );
}
