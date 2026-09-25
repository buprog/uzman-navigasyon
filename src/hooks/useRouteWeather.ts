"use client";

import { useState, useEffect } from "react";
import { RoutePoint, RouteWeatherPoint, ROUTE_WEATHER_ENABLED, generateMockWeather } from "@/lib/routeWeather";

interface UseRouteWeatherOptions {
  enabled?: boolean;
  mockData?: RouteWeatherPoint[] | null;
  useMock?: boolean;
}

export function useRouteWeather(
  points: RoutePoint[] | null,
  options: UseRouteWeatherOptions = {}
) {
  const { enabled = ROUTE_WEATHER_ENABLED, mockData = null, useMock = false } = options;

  const [weatherPoints, setWeatherPoints] = useState<RouteWeatherPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchWeather = async () => {
    if (!enabled || !points || points.length === 0) {
      setWeatherPoints(null);
      return;
    }

    // Use mock data if provided (for preview)
    if (mockData) {
      setWeatherPoints(mockData);
      setLoading(false);
      setError(null);
      return;
    }

    // Generate mock data if useMock is true
    if (useMock) {
      const mock = generateMockWeather(points);
      setWeatherPoints(mock);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = new URL('/api/rota-hava', window.location.origin);
      url.searchParams.set('points', JSON.stringify(points));

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setWeatherPoints(data);
    } catch (err) {
      console.error("Failed to fetch route weather:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setWeatherPoints(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, [enabled, points, mockData, useMock]);

  return {
    weatherPoints,
    loading,
    error,
    retry: fetchWeather,
  };
}
