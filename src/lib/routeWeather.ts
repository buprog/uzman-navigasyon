/**
 * Route weather utilities
 * Samples points along route and fetches weather forecasts for ETAs
 */

export interface RoutePoint {
  lat: number;
  lng: number;
  distance: number; // km from start
  eta: Date; // estimated time of arrival
  label: string; // "Start", "Stop Name", "km 120", "Destination"
}

export interface WeatherData {
  temperature: number;
  weatherCode: number;
  isDay: boolean;
  precipitation: number; // probability %
  windSpeed: number; // km/h
}

export interface RouteWeatherPoint extends RoutePoint {
  current?: WeatherData;
  forecast?: WeatherData;
  hourlyForecast?: Array<{
    time: Date;
    weather: WeatherData;
  }>;
}

/**
 * Feature flag for route weather
 */
export const ROUTE_WEATHER_ENABLED = true; // Set to false to disable for all users

/**
 * Sampling configuration
 */
export const ROUTE_WEATHER_CONFIG = {
  minSpacing: 30, // km
  maxSpacing: 50, // km
  targetSpacing: 40, // km
  maxPoints: 15,
  cacheMinutes: 30,
};

/**
 * Sample points along a route polyline
 * Always includes start and destination
 */
export function sampleRoutePoints(
  polyline: Array<[number, number]>, // [lat, lng] pairs
  totalDistance: number, // km
  totalDuration: number, // seconds
  departureTime: Date,
  stops?: Array<{ name: string; lat: number; lng: number }> | null
): RoutePoint[] {
  if (polyline.length === 0) return [];

  const points: RoutePoint[] = [];
  const spacing = calculateSpacing(totalDistance);

  // Always add start point
  const [startLat, startLng] = polyline[0];
  points.push({
    lat: startLat,
    lng: startLng,
    distance: 0,
    eta: departureTime,
    label: stops?.[0]?.name || "Start",
  });

  // Sample intermediate points
  let accumulatedDistance = 0;
  let nextSampleDistance = spacing;

  for (let i = 1; i < polyline.length; i++) {
    const [prevLat, prevLng] = polyline[i - 1];
    const [currLat, currLng] = polyline[i];
    const segmentDist = haversineDistance(prevLat, prevLng, currLat, currLng);
    accumulatedDistance += segmentDist;

    // Check if we should sample this point
    if (accumulatedDistance >= nextSampleDistance && points.length < ROUTE_WEATHER_CONFIG.maxPoints - 1) {
      const fraction = accumulatedDistance / totalDistance;
      const etaSeconds = departureTime.getTime() + (totalDuration * fraction * 1000);
      const label = findNearestStopLabel(currLat, currLng, stops) || `km ${Math.round(accumulatedDistance)}`;

      points.push({
        lat: currLat,
        lng: currLng,
        distance: accumulatedDistance,
        eta: new Date(etaSeconds),
        label,
      });

      nextSampleDistance += spacing;
    }
  }

  // Always add destination
  const [destLat, destLng] = polyline[polyline.length - 1];
  const etaSeconds = departureTime.getTime() + (totalDuration * 1000);
  points.push({
    lat: destLat,
    lng: destLng,
    distance: totalDistance,
    eta: new Date(etaSeconds),
    label: stops?.[stops.length - 1]?.name || "Destination",
  });

  return points;
}

/**
 * Calculate optimal spacing based on total distance
 */
function calculateSpacing(totalDistance: number): number {
  const { minSpacing, maxSpacing, targetSpacing, maxPoints } = ROUTE_WEATHER_CONFIG;

  // If route is short, use minimum spacing
  if (totalDistance <= targetSpacing * 2) {
    return minSpacing;
  }

  // Calculate spacing to keep within max points
  const idealSpacing = totalDistance / (maxPoints - 1);

  // Clamp to min/max range
  return Math.max(minSpacing, Math.min(maxSpacing, idealSpacing));
}

/**
 * Find nearest stop label for a point
 */
function findNearestStopLabel(
  lat: number,
  lng: number,
  stops?: Array<{ name: string; lat: number; lng: number }> | null
): string | null {
  if (!stops || stops.length === 0) return null;

  let nearest = null;
  let minDist = Infinity;

  for (const stop of stops) {
    const dist = haversineDistance(lat, lng, stop.lat, stop.lng);
    if (dist < minDist && dist < 5) { // Within 5km
      minDist = dist;
      nearest = stop.name;
    }
  }

  return nearest;
}

/**
 * Haversine distance between two points (km)
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Round coordinates for API calls and caching
 */
export function roundCoordinate(coord: number): number {
  return Math.round(coord * 100) / 100;
}

/**
 * Format coordinates for batched Open-Meteo API call
 */
export function formatCoordinatesForAPI(points: RoutePoint[]): {
  latitudes: string;
  longitudes: string;
} {
  const lats = points.map(p => roundCoordinate(p.lat)).join(',');
  const lngs = points.map(p => roundCoordinate(p.lng)).join(',');

  return {
    latitudes: lats,
    longitudes: lngs,
  };
}

/**
 * Calculate required forecast days to cover all ETAs
 */
export function calculateForecastDays(points: RoutePoint[]): number {
  if (points.length === 0) return 1;

  const lastEta = points[points.length - 1].eta;
  const now = new Date();
  const hoursDiff = (lastEta.getTime() - now.getTime()) / (1000 * 60 * 60);
  const daysDiff = Math.ceil(hoursDiff / 24);

  return Math.max(1, Math.min(16, daysDiff + 1)); // Max 16 days per Open-Meteo
}

/**
 * Map WMO weather code to icon and description
 */
export function getWeatherIcon(code: number, isDay: boolean): { icon: string; description: string } {
  // Clear
  if (code === 0) return { icon: isDay ? '☀️' : '🌙', description: isDay ? 'Güneşli' : 'Açık' };

  // Mainly clear
  if (code === 1 || code === 2) return { icon: isDay ? '🌤️' : '🌙', description: isDay ? 'Az bulutlu' : 'Parçalı bulutlu' };

  // Overcast
  if (code === 3) return { icon: '☁️', description: 'Bulutlu' };

  // Fog
  if (code >= 45 && code <= 48) return { icon: '🌫️', description: 'Sisli' };

  // Drizzle
  if (code >= 51 && code <= 55) return { icon: '🌦️', description: 'Çisenti' };

  // Freezing drizzle
  if (code >= 56 && code <= 57) return { icon: '🌧️', description: 'Dondurucu çiselti' };

  // Rain
  if (code >= 61 && code <= 65) return { icon: '🌧️', description: 'Yağmur' };

  // Freezing rain
  if (code >= 66 && code <= 67) return { icon: '🌧️', description: 'Dondurucu yağmur' };

  // Snow
  if (code >= 71 && code <= 75) return { icon: '❄️', description: 'Kar' };

  // Snow grains
  if (code === 77) return { icon: '❄️', description: 'Kar taneleri' };

  // Rain showers
  if (code >= 80 && code <= 82) return { icon: '🌦️', description: 'Sağanak yağmur' };

  // Snow showers
  if (code >= 85 && code <= 86) return { icon: '🌨️', description: 'Sağanak kar' };

  // Thunderstorm
  if (code >= 95 && code <= 99) return { icon: '⛈️', description: 'Fırtına' };

  return { icon: '🌡️', description: 'Bilinmeyen' };
}

/**
 * Create cache key for route weather
 */
export function createRouteWeatherCacheKey(latitudes: string, longitudes: string): string {
  return `route-weather:${latitudes}:${longitudes}`;
}

/**
 * Generate mock weather data for preview/demo purposes
 */
export function generateMockWeather(points: RoutePoint[]): RouteWeatherPoint[] {
  return points.map((point, index) => {
    // Generate semi-realistic mock weather
    const baseTemp = 20 + Math.sin(index * 0.5) * 5;
    const isDay = point.eta.getHours() >= 7 && point.eta.getHours() < 19;
    
    // Current weather for first point
    const current: WeatherData | undefined = index === 0 ? {
      temperature: baseTemp,
      weatherCode: 1,
      isDay,
      precipitation: 10,
      windSpeed: 15,
    } : undefined;

    // Forecast at ETA
    const forecast: WeatherData = {
      temperature: baseTemp + Math.random() * 3,
      weatherCode: [0, 1, 2, 3, 61][Math.floor(Math.random() * 5)],
      isDay,
      precipitation: Math.floor(Math.random() * 40),
      windSpeed: 10 + Math.random() * 20,
    };

    // Hourly forecast
    const hourlyForecast: Array<{ time: Date; weather: WeatherData }> = [];
    for (let i = -3; i < 9; i++) {
      const hourTime = new Date(point.eta.getTime() + i * 60 * 60 * 1000);
      const hourIsDay = hourTime.getHours() >= 7 && hourTime.getHours() < 19;
      
      hourlyForecast.push({
        time: hourTime,
        weather: {
          temperature: baseTemp + Math.sin(i * 0.5) * 3,
          weatherCode: [0, 1, 2, 3][Math.floor(Math.random() * 4)],
          isDay: hourIsDay,
          precipitation: Math.floor(Math.random() * 30),
          windSpeed: 10 + Math.random() * 15,
        },
      });
    }

    return {
      ...point,
      current,
      forecast,
      hourlyForecast,
    };
  });
}
