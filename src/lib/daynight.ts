/**
 * Day/Night mode detection based on sunrise/sunset
 * Uses solar position algorithm (NOAA-based) for accurate local times
 */

import { DayNight } from "./theme";

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
}

export interface DayNightCache {
  daynight: DayNight;
  sunrise: string; // ISO string
  sunset: string; // ISO string
  lat?: number;
  lng?: number;
  date: string; // YYYY-MM-DD
}

const DAYNIGHT_CACHE_KEY = "un_daynight_cache";
const LOCATION_PERMISSION_SHOWN_KEY = "un_daynight_permission_shown";

/**
 * Calculate sunrise and sunset times for a given location and date
 * Based on NOAA solar calculation
 * https://www.esrl.noaa.gov/gmd/grad/solcalc/calcdetails.html
 */
export function calculateSunTimes(lat: number, lng: number, date: Date = new Date()): SunTimes {
  const julianDay = getJulianDay(date);
  const julianCentury = (julianDay - 2451545) / 36525;
  
  // Sun's geometric mean longitude (degrees)
  const geomMeanLongSun = (280.46646 + julianCentury * (36000.76983 + julianCentury * 0.0003032)) % 360;
  
  // Sun's geometric mean anomaly (degrees)
  const geomMeanAnomSun = 357.52911 + julianCentury * (35999.05029 - 0.0001537 * julianCentury);
  
  // Eccentricity of Earth's orbit
  const eccentOrbit = 0.016708634 - julianCentury * (0.000042037 + 0.0000001267 * julianCentury);
  
  // Sun's equation of center
  const sunEqOfCenter = 
    Math.sin(toRadians(geomMeanAnomSun)) * (1.914602 - julianCentury * (0.004817 + 0.000014 * julianCentury)) +
    Math.sin(toRadians(2 * geomMeanAnomSun)) * (0.019993 - 0.000101 * julianCentury) +
    Math.sin(toRadians(3 * geomMeanAnomSun)) * 0.000289;
  
  // Sun's true longitude (degrees)
  const sunTrueLong = geomMeanLongSun + sunEqOfCenter;
  
  // Sun's apparent longitude (degrees)
  const sunAppLong = sunTrueLong - 0.00569 - 0.00478 * Math.sin(toRadians(125.04 - 1934.136 * julianCentury));
  
  // Mean obliquity of ecliptic (degrees)
  const meanObliqEcliptic = 23 + (26 + ((21.448 - julianCentury * (46.815 + julianCentury * (0.00059 - julianCentury * 0.001813)))) / 60) / 60;
  
  // Obliquity correction (degrees)
  const obliqCorr = meanObliqEcliptic + 0.00256 * Math.cos(toRadians(125.04 - 1934.136 * julianCentury));
  
  // Sun's declination (degrees)
  const sunDeclination = toDegrees(Math.asin(Math.sin(toRadians(obliqCorr)) * Math.sin(toRadians(sunAppLong))));
  
  // Equation of time (minutes)
  const varY = Math.tan(toRadians(obliqCorr / 2)) * Math.tan(toRadians(obliqCorr / 2));
  const eqOfTime = 4 * toDegrees(
    varY * Math.sin(2 * toRadians(geomMeanLongSun)) -
    2 * eccentOrbit * Math.sin(toRadians(geomMeanAnomSun)) +
    4 * eccentOrbit * varY * Math.sin(toRadians(geomMeanAnomSun)) * Math.cos(2 * toRadians(geomMeanLongSun)) -
    0.5 * varY * varY * Math.sin(4 * toRadians(geomMeanLongSun)) -
    1.25 * eccentOrbit * eccentOrbit * Math.sin(2 * toRadians(geomMeanAnomSun))
  );
  
  // Hour angle for sunrise (degrees)
  const haAngle = toDegrees(Math.acos(Math.cos(toRadians(90.833)) / (Math.cos(toRadians(lat)) * Math.cos(toRadians(sunDeclination))) - Math.tan(toRadians(lat)) * Math.tan(toRadians(sunDeclination))));
  
  // Solar noon (minutes from midnight)
  const solarNoon = (720 - 4 * lng - eqOfTime) / 1440;
  
  // Sunrise time (fraction of day)
  const sunriseTime = solarNoon - haAngle * 4 / 1440;
  
  // Sunset time (fraction of day)
  const sunsetTime = solarNoon + haAngle * 4 / 1440;
  
  // Convert to Date objects
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  const sunrise = new Date(year, month, day);
  sunrise.setHours(0, 0, 0, 0);
  sunrise.setMinutes(sunriseTime * 1440);
  
  const sunset = new Date(year, month, day);
  sunset.setHours(0, 0, 0, 0);
  sunset.setMinutes(sunsetTime * 1440);
  
  return { sunrise, sunset };
}

/**
 * Get Julian Day from Date
 */
function getJulianDay(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  
  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  const jd = jdn + (hours - 12) / 24 + minutes / 1440 + seconds / 86400;
  
  return jd;
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

function toDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}

/**
 * Determine if it's day or night based on current time and sun times
 */
export function getDayNight(sunTimes?: SunTimes, now: Date = new Date()): DayNight {
  if (!sunTimes) {
    // Fallback: 07:00-19:00 local time
    const hours = now.getHours();
    return hours >= 7 && hours < 19 ? "day" : "night";
  }
  
  const time = now.getTime();
  return time >= sunTimes.sunrise.getTime() && time < sunTimes.sunset.getTime() ? "day" : "night";
}

/**
 * Get cached day/night data
 */
export function getDayNightCache(): DayNightCache | null {
  if (typeof window === "undefined") return null;
  
  try {
    const cached = localStorage.getItem(DAYNIGHT_CACHE_KEY);
    if (!cached) return null;
    
    const data = JSON.parse(cached) as DayNightCache;
    
    // Check if cache is for today
    const today = new Date().toISOString().split("T")[0];
    if (data.date !== today) {
      localStorage.removeItem(DAYNIGHT_CACHE_KEY);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

/**
 * Set day/night cache
 */
export function setDayNightCache(
  daynight: DayNight,
  sunTimes: SunTimes,
  lat?: number,
  lng?: number
): void {
  if (typeof window === "undefined") return;
  
  try {
    const today = new Date().toISOString().split("T")[0];
    const cache: DayNightCache = {
      daynight,
      sunrise: sunTimes.sunrise.toISOString(),
      sunset: sunTimes.sunset.toISOString(),
      lat,
      lng,
      date: today,
    };
    localStorage.setItem(DAYNIGHT_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore errors
  }
}

/**
 * Check if location permission prompt has been shown
 */
export function hasShownLocationPermission(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(LOCATION_PERMISSION_SHOWN_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Mark location permission prompt as shown
 */
export function markLocationPermissionShown(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCATION_PERMISSION_SHOWN_KEY, "true");
  } catch {
    // Ignore errors
  }
}

/**
 * Round coordinates for privacy (2 decimal places ~1km precision)
 */
export function roundCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  return {
    lat: Math.round(lat * 100) / 100,
    lng: Math.round(lng * 100) / 100,
  };
}

/**
 * Get current day/night mode with geolocation if available
 * This is the main function to use client-side
 */
export async function getCurrentDayNight(): Promise<{
  daynight: DayNight;
  sunTimes: SunTimes;
}> {
  const now = new Date();
  
  // Check cache first
  const cached = getDayNightCache();
  if (cached) {
    const sunTimes = {
      sunrise: new Date(cached.sunrise),
      sunset: new Date(cached.sunset),
    };
    return {
      daynight: getDayNight(sunTimes, now),
      sunTimes,
    };
  }
  
  // Try to get geolocation if permission is granted
  let sunTimes: SunTimes;
  
  try {
    if (navigator.permissions) {
      const result = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      
      if (result.state === "granted") {
        // Use geolocation
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            maximumAge: 30 * 60 * 1000, // 30 minutes
          });
        });
        
        const rounded = roundCoordinates(position.coords.latitude, position.coords.longitude);
        sunTimes = calculateSunTimes(rounded.lat, rounded.lng, now);
        const daynight = getDayNight(sunTimes, now);
        setDayNightCache(daynight, sunTimes, rounded.lat, rounded.lng);
        
        return { daynight, sunTimes };
      }
    }
  } catch {
    // Ignore errors, fall back to time-based
  }
  
  // Fallback: Use time-based (07:00-19:00)
  const fallbackSunrise = new Date(now);
  fallbackSunrise.setHours(7, 0, 0, 0);
  
  const fallbackSunset = new Date(now);
  fallbackSunset.setHours(19, 0, 0, 0);
  
  sunTimes = { sunrise: fallbackSunrise, sunset: fallbackSunset };
  const daynight = getDayNight(sunTimes, now);
  setDayNightCache(daynight, sunTimes);
  
  return { daynight, sunTimes };
}
