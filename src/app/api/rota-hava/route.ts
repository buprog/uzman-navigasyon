import { NextRequest, NextResponse } from "next/server";
import { 
  RoutePoint, 
  RouteWeatherPoint, 
  WeatherData,
  roundCoordinate,
  createRouteWeatherCacheKey,
  ROUTE_WEATHER_CONFIG
} from "@/lib/routeWeather";

/**
 * Route weather API
 * GET /api/rota-hava?points=[...RoutePoint[]]
 * 
 * Fetches weather forecasts for route points from Open-Meteo
 */

// In-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = ROUTE_WEATHER_CONFIG.cacheMinutes * 60 * 1000;

// Rate limiting (simple in-memory)
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute

function checkRateLimit(deviceId: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(deviceId);

  if (!limit || now > limit.resetAt) {
    rateLimits.set(deviceId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (limit.count >= RATE_LIMIT_MAX) {
    return false;
  }

  limit.count++;
  return true;
}

function getFromCache(key: string): any | null {
  const cached = cache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }

  return cached.data;
}

function setInCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });

  // Clean up old cache entries (keep max 100)
  if (cache.size > 100) {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    cache.delete(entries[0][0]);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get device ID from cookie or generate one
    const deviceId = request.cookies.get("un_device")?.value || "anonymous";

    // Rate limiting
    if (!checkRateLimit(deviceId)) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    // Parse points from query
    const pointsParam = request.nextUrl.searchParams.get("points");
    if (!pointsParam) {
      return NextResponse.json(
        { error: "Missing points parameter" },
        { status: 400 }
      );
    }

    const points: RoutePoint[] = JSON.parse(pointsParam);
    if (!Array.isArray(points) || points.length === 0) {
      return NextResponse.json(
        { error: "Invalid points parameter" },
        { status: 400 }
      );
    }

    // Round coordinates and create cache key
    const roundedLats = points.map(p => roundCoordinate(p.lat)).join(',');
    const roundedLngs = points.map(p => roundCoordinate(p.lng)).join(',');
    const cacheKey = createRouteWeatherCacheKey(roundedLats, roundedLngs);

    // Check cache
    const cached = getFromCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Calculate forecast days needed
    const lastEta = new Date(points[points.length - 1].eta);
    const now = new Date();
    const hoursDiff = (lastEta.getTime() - now.getTime()) / (1000 * 60 * 60);
    const forecastDays = Math.max(1, Math.min(16, Math.ceil(hoursDiff / 24) + 1));

    // Determine API endpoint
    const apiKey = process.env.OPEN_METEO_API_KEY;
    const baseUrl = apiKey 
      ? 'https://customer-api.open-meteo.com/v1/forecast'
      : 'https://api.open-meteo.com/v1/forecast';

    // Build URL
    const url = new URL(baseUrl);
    url.searchParams.set('latitude', roundedLats);
    url.searchParams.set('longitude', roundedLngs);
    url.searchParams.set('hourly', 'temperature_2m,precipitation_probability,weather_code,wind_speed_10m,is_day');
    url.searchParams.set('current', 'temperature_2m,weather_code,wind_speed_10m');
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', forecastDays.toString());
    
    if (apiKey) {
      url.searchParams.set('apikey', apiKey);
    }

    // Fetch weather data
    const response = await fetch(url.toString(), {
      next: { revalidate: ROUTE_WEATHER_CONFIG.cacheMinutes * 60 },
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const data = await response.json();

    // Open-Meteo batch endpoint returns arrays for each location
    // The response structure is:
    // - data[0].hourly, data[0].current for first location
    // - data[1].hourly, data[1].current for second location, etc.
    // OR if single location: data.hourly, data.current
    
    const locations = Array.isArray(data) ? data : [data];

    // Process response for each point
    const weatherPoints: RouteWeatherPoint[] = points.map((point, index) => {
      const locationData = locations[index] || locations[0];
      const eta = new Date(point.eta);
      const etaHour = eta.toISOString().slice(0, 13) + ':00:00'; // Round to hour

      // Find the hourly index for this ETA
      const hourlyTimes = locationData.hourly?.time || [];
      const etaIndex = hourlyTimes.findIndex((t: string) => t >= etaHour);

      // Current weather (only for first point if within current hour)
      let current: WeatherData | undefined;
      if (index === 0 && locationData.current) {
        // Get is_day from the first hourly entry
        const firstIsDay = locationData.hourly?.is_day?.[0] === 1;
        current = {
          temperature: locationData.current.temperature_2m || 0,
          weatherCode: locationData.current.weather_code || 0,
          isDay: firstIsDay,
          precipitation: 0, // Not available in current
          windSpeed: locationData.current.wind_speed_10m || 0,
        };
      }

      // Forecast weather at ETA
      let forecast: WeatherData | undefined;
      if (etaIndex >= 0 && locationData.hourly) {
        forecast = {
          temperature: locationData.hourly.temperature_2m?.[etaIndex] || 0,
          weatherCode: locationData.hourly.weather_code?.[etaIndex] || 0,
          isDay: locationData.hourly.is_day?.[etaIndex] === 1,
          precipitation: locationData.hourly.precipitation_probability?.[etaIndex] || 0,
          windSpeed: locationData.hourly.wind_speed_10m?.[etaIndex] || 0,
        };
      }

      // Hourly forecast (next 12 hours around ETA)
      const hourlyForecast: Array<{ time: Date; weather: WeatherData }> = [];
      if (etaIndex >= 0 && locationData.hourly) {
        const startIndex = Math.max(0, etaIndex - 3);
        const endIndex = Math.min(hourlyTimes.length, etaIndex + 9);

        for (let i = startIndex; i < endIndex; i++) {
          hourlyForecast.push({
            time: new Date(hourlyTimes[i]),
            weather: {
              temperature: locationData.hourly.temperature_2m?.[i] || 0,
              weatherCode: locationData.hourly.weather_code?.[i] || 0,
              isDay: locationData.hourly.is_day?.[i] === 1,
              precipitation: locationData.hourly.precipitation_probability?.[i] || 0,
              windSpeed: locationData.hourly.wind_speed_10m?.[i] || 0,
            },
          });
        }
      }

      return {
        ...point,
        current,
        forecast,
        hourlyForecast,
      };
    });

    // Cache and return
    setInCache(cacheKey, weatherPoints);
    return NextResponse.json(weatherPoints);
  } catch (error) {
    console.error("Route weather API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 }
    );
  }
}
