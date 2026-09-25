"use client";

import { useEffect } from "react";
import { getCurrentDayNight, hasShownLocationPermission, markLocationPermissionShown } from "@/lib/daynight";

/**
 * Client component that detects and updates day/night mode
 * Re-evaluates on timer and visibility change
 */
export function DayNightDetector() {
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    async function updateDayNight() {
      try {
        const { daynight, sunTimes } = await getCurrentDayNight();
        const html = document.documentElement;
        const currentMode = html.getAttribute("data-mode");
        
        if (currentMode !== daynight) {
          html.setAttribute("data-mode", daynight);
        }

        // Schedule next check at sunrise/sunset
        const now = new Date();
        const nextTransition = daynight === "day" ? sunTimes.sunset : 
          (now < sunTimes.sunrise ? sunTimes.sunrise : new Date(sunTimes.sunrise.getTime() + 24 * 60 * 60 * 1000));
        
        const delay = Math.max(60000, nextTransition.getTime() - now.getTime()); // At least 1 minute
        
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(updateDayNight, delay);
      } catch (error) {
        console.error("Day/night detection error:", error);
      }
    }

    // Initial update
    updateDayNight();

    // Re-check every minute as backup
    intervalId = setInterval(updateDayNight, 60000);

    // Re-check on visibility change (tab becomes visible)
    function handleVisibilityChange() {
      if (!document.hidden) {
        updateDayNight();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Show location permission chip if not shown yet
    async function showLocationChip() {
      if (hasShownLocationPermission()) return;
      
      try {
        if (!navigator.permissions) return;
        
        const result = await navigator.permissions.query({ name: "geolocation" as PermissionName });
        
        if (result.state === "prompt") {
          // Show a small dismissible chip (you can implement this UI)
          // For now, we'll just mark it as shown
          markLocationPermissionShown();
        }
      } catch {
        // Ignore errors
      }
    }

    showLocationChip();

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null; // This component doesn't render anything
}
