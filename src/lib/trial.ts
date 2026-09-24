/**
 * First-trip trial state management
 * Since all basic users share operator@demo.com, trial state is per-device (localStorage)
 */

const TRIAL_KEY = "un_first_trip_trial";
const TRIAL_COMPLETED_KEY = "un_trial_completed";

export type TrialState = {
  active: boolean;
  completedAt: string | null;
};

export function getTrialState(): TrialState {
  if (typeof window === "undefined") {
    return { active: true, completedAt: null };
  }

  try {
    const completed = localStorage.getItem(TRIAL_COMPLETED_KEY);
    if (completed) {
      return { active: false, completedAt: completed };
    }

    const trial = localStorage.getItem(TRIAL_KEY);
    if (trial === "false") {
      return { active: false, completedAt: null };
    }

    return { active: true, completedAt: null };
  } catch {
    return { active: true, completedAt: null };
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

export function resetTrial() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TRIAL_KEY);
    localStorage.removeItem(TRIAL_COMPLETED_KEY);
  } catch {}
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
