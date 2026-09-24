import { NextRequest, NextResponse } from "next/server";
import { wmoCodeToWeather, roundCoordinates, WeatherCondition } from "@/lib/weather";

/**
 * Weather API route - fetches weather from Open-Meteo or OpenWeatherMap
 * GET /api/hava?lat=38.5&lng=34.5
 */

interface WeatherResponse {
  condition: WeatherCondition;
  lat: number;
  lng: number;
}

// In-memory cache for server-side
const serverCache = new Map<string, { data: WeatherResponse; timestamp: number }>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

function getCacheKey(lat: number, lng: number): string {
  const rounded = roundCoordinates(lat, lng);
  return `${rounded.lat},${rounded.lng}`;
}

function getFromCache(lat: number, lng: number): WeatherResponse | null {
  const key = getCacheKey(lat, lng);
  const cached = serverCache.get(key);
  
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    serverCache.delete(key);
    return null;
  }
  
  return cached.data;
}

function setInCache(lat: number, lng: number, data: WeatherResponse): void {
  const key = getCacheKey(lat, lng);
  serverCache.set(key, { data, timestamp: Date.now() });
  
  // Clean up old cache entries (keep max 100)
  if (serverCache.size > 100) {
    const entries = Array.from(serverCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    serverCache.delete(entries[0][0]);
  }
}

/**
 * Fetch weather from Open-Meteo (free, no API key)
 */
async function fetchOpenMeteo(lat: number, lng: number): Promise<WeatherResponse> {
  const rounded = roundCoordinates(lat, lng);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${rounded.lat}&longitude=${rounded.lng}&current=weather_code,is_day`;
  
  const response = await fetch(url, {
    next: { revalidate: 900 }, // 15 minutes
  });
  
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }
  
  const data = await response.json();
  const weatherCode = data.current?.weather_code ?? 0;
  const isDay = data.current?.is_day === 1;
  
  const condition = wmoCodeToWeather(weatherCode, isDay);
  
  return {
    condition,
    lat: rounded.lat,
    lng: rounded.lng,
  };
}

/**
 * Fetch weather from OpenWeatherMap (requires API key)
 */
async function fetchOpenWeatherMap(lat: number, lng: number, apiKey: string): Promise<WeatherResponse> {
  const rounded = roundCoordinates(lat, lng);
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${rounded.lat}&lon=${rounded.lng}&appid=${apiKey}`;
  
  const response = await fetch(url, {
    next: { revalidate: 900 }, // 15 minutes
  });
  
  if (!response.ok) {
    throw new Error(`OpenWeatherMap API error: ${response.status}`);
  }
  
  const data = await response.json();
  const weatherId = data.weather?.[0]?.id ?? 800;
  
  // Map OpenWeatherMap weather IDs to our conditions
  let condition: WeatherCondition = "clear";
  
  if (weatherId >= 200 && weatherId < 300) {
    // Thunderstorm
    condition = "rain";
  } else if (weatherId >= 300 && weatherId < 400) {
    // Drizzle
    condition = "rain";
  } else if (weatherId >= 500 && weatherId < 600) {
    // Rain
    condition = "rain";
  } else if (weatherId >= 600 && weatherId < 700) {
    // Snow
    condition = "snow";
  } else if (weatherId >= 700 && weatherId < 800) {
    // Atmosphere (fog, mist, etc.)
    condition = "cloudy";
  } else if (weatherId === 800) {
    // Clear
    condition = "clear";
  } else if (weatherId > 800) {
    // Clouds
    condition = "cloudy";
  }
  
  return {
    condition,
    lat: rounded.lat,
    lng: rounded.lng,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = parseFloat(searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("lng") || "");
    
    // Validate coordinates
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 }
      );
    }
    
    // Check cache
    const cached = getFromCache(lat, lng);
    if (cached) {
      return NextResponse.json(cached);
    }
    
    // Try OpenWeatherMap if API key is set, otherwise use Open-Meteo
    let weatherData: WeatherResponse;
    
    const openWeatherApiKey = process.env.OPENWEATHER_API_KEY;
    
    if (openWeatherApiKey) {
      try {
        weatherData = await fetchOpenWeatherMap(lat, lng, openWeatherApiKey);
      } catch (error) {
        console.warn("OpenWeatherMap failed, falling back to Open-Meteo:", error);
        weatherData = await fetchOpenMeteo(lat, lng);
      }
    } else {
      weatherData = await fetchOpenMeteo(lat, lng);
    }
    
    // Cache the result
    setInCache(lat, lng, weatherData);
    
    return NextResponse.json(weatherData);
  } catch (error) {
    console.error("Weather API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 }
    );
  }
}
