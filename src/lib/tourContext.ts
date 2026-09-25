/**
 * Track the current tour in the browser for register/login tour transfer
 */

const CURRENT_TOUR_KEY = "un_current_tour";

/**
 * Set the current tour ID (when viewing/creating a tour)
 */
export function setCurrentTourId(tourId: string | null) {
  if (typeof window === "undefined") return;
  
  try {
    if (tourId) {
      localStorage.setItem(CURRENT_TOUR_KEY, tourId);
    } else {
      localStorage.removeItem(CURRENT_TOUR_KEY);
    }
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Get the current tour ID for transfer during register/login
 * Checks both URL and localStorage
 */
export function getCurrentTourId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  
  // First check URL (planner or navigation page)
  const match = window.location.pathname.match(/\/(planlayici|navigasyon)\/([^/]+)/);
  if (match) {
    return match[2];
  }
  
  // Fallback to localStorage (tour was created but user navigated away)
  try {
    const stored = localStorage.getItem(CURRENT_TOUR_KEY);
    return stored || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Clear the current tour ID (after transfer or logout)
 */
export function clearCurrentTourId() {
  setCurrentTourId(null);
}
