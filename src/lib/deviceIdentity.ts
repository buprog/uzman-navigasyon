/**
 * Device Identity Layer
 * Pluggable providers for different platforms:
 * - Web: localStorage + cookie + lightweight fingerprint
 * - Future: Apple DeviceCheck, Google Play subscription eligibility
 */

import { nanoid } from "nanoid";

const DEVICE_ID_KEY = "un_device_id";
const DEVICE_ID_COOKIE = "un_did";

/**
 * Generate a lightweight browser fingerprint
 * Uses stable signals only - no tracking, no third-party SDKs
 * Used as fallback when stored deviceId is missing
 */
async function generateFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "";

  const signals: string[] = [];

  // User agent
  signals.push(navigator.userAgent || "");

  // Platform
  signals.push(navigator.platform || "");

  // Screen resolution
  signals.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

  // Timezone
  try {
    signals.push(Intl.DateTimeFormat().resolvedOptions().timeZone || "");
  } catch {}

  // Language
  signals.push(navigator.language || "");

  // Hardware concurrency
  signals.push(String(navigator.hardwareConcurrency || 0));

  // Canvas fingerprint (simple, stable hash)
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px 'Arial'";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("Uzman Nav", 2, 15);
      signals.push(canvas.toDataURL());
    }
  } catch {}

  // Hash the signals
  const text = signals.join("|");
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Get or create persistent device ID
 * Tries: localStorage -> cookie -> create new
 */
function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";

  // Try localStorage
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (deviceId) {
    // Sync to cookie
    setCookie(DEVICE_ID_COOKIE, deviceId, 365 * 2);
    return deviceId;
  }

  // Try cookie
  deviceId = getCookie(DEVICE_ID_COOKIE);
  if (deviceId) {
    // Sync to localStorage
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    return deviceId;
  }

  // Create new
  deviceId = nanoid(32);
  localStorage.setItem(DEVICE_ID_KEY, deviceId);
  setCookie(DEVICE_ID_COOKIE, deviceId, 365 * 2);
  return deviceId;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Get device identity for current device
 * Returns deviceId and fingerprint
 */
export async function getDeviceIdentity(): Promise<{
  deviceId: string;
  fingerprint: string;
}> {
  const deviceId = getOrCreateDeviceId();
  const fingerprint = await generateFingerprint();
  return { deviceId, fingerprint };
}

/**
 * Future provider interfaces (not implemented yet)
 */

// TODO: Apple DeviceCheck provider
// Per-device bits that survive app reinstall
// https://developer.apple.com/documentation/devicecheck
export interface AppleDeviceCheckProvider {
  getDeviceToken(): Promise<string>;
  queryTwoBits(): Promise<[boolean, boolean]>;
  updateTwoBits(bit0: boolean, bit1: boolean): Promise<void>;
}

// TODO: Google Play subscription eligibility
// Store-account-based subscription and trial tracking
// https://developer.android.com/google/play/billing
export interface GooglePlayBillingProvider {
  getPlayAccountId(): Promise<string>;
  checkSubscriptionEligibility(): Promise<{
    eligible: boolean;
    hasActiveSub: boolean;
    trialUsed: boolean;
  }>;
}
