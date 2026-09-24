/**
 * First-trip trial state management
 * Since all basic users share operator@demo.com, trial state is per-device (localStorage)
 */

const TRIAL_KEY = "un_first_trip_trial";
const TRIAL_COMPLETED_KEY = "un_trial_completed";
const TRIAL_NOTIFICATION_SHOWN_KEY = "un_trial_notification_shown";

export type TrialState = {
  active: boolean;
  completedAt: string | null;
  notificationShown: boolean;
};

export function getTrialState(): TrialState {
  if (typeof window === "undefined") {
    return { active: true, completedAt: null, notificationShown: false };
  }

  try {
    const completed = localStorage.getItem(TRIAL_COMPLETED_KEY);
    const notificationShown = localStorage.getItem(TRIAL_NOTIFICATION_SHOWN_KEY) === "true";
    
    if (completed) {
      return { active: false, completedAt: completed, notificationShown };
    }

    const trial = localStorage.getItem(TRIAL_KEY);
    if (trial === "false") {
      return { active: false, completedAt: null, notificationShown };
    }

    return { active: true, completedAt: null, notificationShown: false };
  } catch {
    return { active: true, completedAt: null, notificationShown: false };
  }
}

export function completeTrialWithPayment() {
  if (typeof window === "undefined") return;
  try {
    const now = new Date().toISOString();
    localStorage.setItem(TRIAL_COMPLETED_KEY, now);
    localStorage.removeItem(TRIAL_KEY);
  } catch {}
}

export function completeTrialWithoutPayment() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TRIAL_KEY, "false");
    localStorage.removeItem(TRIAL_COMPLETED_KEY);
  } catch {}
}

/**
 * Complete trial server-side (persists across page reloads)
 */
export async function completeTrialServerSide() {
  try {
    await fetch("/api/trial/complete", {
      method: "POST",
    });
  } catch (err) {
    console.error("Failed to complete trial server-side:", err);
  }
}

export function resetTrial() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TRIAL_KEY);
    localStorage.removeItem(TRIAL_COMPLETED_KEY);
    localStorage.removeItem(TRIAL_NOTIFICATION_SHOWN_KEY);
  } catch {}
}

export function markNotificationShown() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TRIAL_NOTIFICATION_SHOWN_KEY, "true");
  } catch {}
}

export function shouldShowNotification(): boolean {
  const state = getTrialState();
  return !state.active && !state.notificationShown;
}

export function isTrialActive(): boolean {
  return getTrialState().active;
}

/**
 * Check if trial should be reset via query param
 * Usage: ?denemeSifirla=1
 */
export function checkTrialResetParam() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (params.get("denemeSifirla") === "1") {
    resetTrial();
    window.location.search = "";
  }
}
