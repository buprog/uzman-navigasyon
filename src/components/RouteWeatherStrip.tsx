"use client";

import { useState, useEffect } from "react";
import { RouteWeatherPoint, getWeatherIcon, ROUTE_WEATHER_ENABLED } from "@/lib/routeWeather";

interface RouteWeatherStripProps {
  points: RouteWeatherPoint[];
  onRetry?: () => void;
}

export function RouteWeatherStrip({ points, onRetry }: RouteWeatherStripProps) {
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  if (!ROUTE_WEATHER_ENABLED) return null;
  if (points.length === 0) return null;

  const handleChipClick = (index: number) => {
    setSelectedPoint(selectedPoint === index ? null : index);
  };

  const handleRetry = () => {
    setError(false);
    setLoading(true);
    onRetry?.();
  };

  if (error) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Hava bilgisi alınamadı</span>
          <button
            onClick={handleRetry}
            className="text-sm text-teal-700 hover:text-teal-800 font-semibold"
          >
            Tekrar dene
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 mb-4">
        <div className="flex gap-2 overflow-x-auto">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-24 h-20 bg-slate-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      {/* Scrollable strip */}
      <div className="bg-white border border-slate-200 rounded-lg p-2 overflow-hidden">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-300">
          {points.map((point, index) => {
            const weather = point.forecast || point.current;
            if (!weather) return null;

            const { icon, description } = getWeatherIcon(weather.weatherCode, weather.isDay);

            return (
              <button
                key={index}
                onClick={() => handleChipClick(index)}
                className={`flex-shrink-0 flex flex-col items-center justify-center p-2 rounded-lg border-2 transition min-w-[80px] ${
                  selectedPoint === index
                    ? "border-teal-700 bg-teal-50"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-xs font-semibold text-slate-900">
                  {Math.round(weather.temperature)}°C
                </div>
                <div className="text-xs text-slate-600 truncate w-full text-center">
                  {point.label}
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                  {weather.precipitation > 0 && (
                    <span>💧{weather.precipitation}%</span>
                  )}
                  {weather.windSpeed > 0 && (
                    <span>💨{Math.round(weather.windSpeed)}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded detail panel */}
      {selectedPoint !== null && points[selectedPoint] && (
        <div className="mt-2 bg-white border border-slate-200 rounded-lg p-4 animate-slideDown">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">
              {points[selectedPoint].label}
            </h3>
            <button
              onClick={() => setSelectedPoint(null)}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>

          <div className="text-sm text-slate-600 mb-3">
            Tahmini varış: {new Date(points[selectedPoint].eta).toLocaleString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
              day: 'numeric',
              month: 'short',
            })}
          </div>

          {points[selectedPoint].hourlyForecast && points[selectedPoint].hourlyForecast!.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-2">Saatlik Tahmin</h4>
              <div className="space-y-2">
                {points[selectedPoint].hourlyForecast!.map((hour, i) => {
                  const { icon, description } = getWeatherIcon(hour.weather.weatherCode, hour.weather.isDay);
                  return (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 w-16">
                        {new Date(hour.time).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-lg">{icon}</span>
                        <span className="text-xs text-slate-500">{description}</span>
                      </div>
                      <span className="font-semibold text-slate-900 w-12 text-right">
                        {Math.round(hour.weather.temperature)}°C
                      </span>
                      {hour.weather.precipitation > 0 && (
                        <span className="text-xs text-blue-600 w-12 text-right">
                          💧{hour.weather.precipitation}%
                        </span>
                      )}
                      {hour.weather.windSpeed > 0 && (
                        <span className="text-xs text-slate-500 w-16 text-right">
                          💨{Math.round(hour.weather.windSpeed)} km/h
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Loading skeleton for route weather strip
 */
export function RouteWeatherStripSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-2 mb-4">
      <div className="flex gap-2 overflow-x-auto">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-20 h-24 bg-slate-100 rounded-lg animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
