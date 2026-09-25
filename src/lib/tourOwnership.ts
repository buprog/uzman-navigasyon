/**
 * Tour ownership tracking via signed cookie
 * Proves which tours were created by this browser during demo session
 */

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const OWNERSHIP_COOKIE = "un_tour_own";
const SECRET = process.env.AUTH_SECRET || "uzman-navigasyon-dev-secret-change-me";
const MAX_TOURS = 20;

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

/**
 * Add a tour ID to the ownership cookie
 */
export function addTourOwnership(tourId: string) {
  const existing = getOwnedTourIds();
  
  // Add new tour if not already present
  if (!existing.includes(tourId)) {
    existing.push(tourId);
    
    // Cap at MAX_TOURS (FIFO)
    if (existing.length > MAX_TOURS) {
      existing.shift();
    }
  }
  
  // Sign and store
  const payload = existing.join(",");
  const token = `${payload}.${sign(payload)}`;
  
  cookies().set(OWNERSHIP_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/**
 * Get list of tour IDs owned by this browser
 */
export function getOwnedTourIds(): string[] {
  const token = cookies().get(OWNERSHIP_COOKIE)?.value;
  if (!token) return [];
  
  const parts = token.split(".");
  if (parts.length !== 2) return [];
  
  const [payload, sig] = parts;
  const expected = sign(payload);
  
  // Verify signature
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return [];
    }
  } catch {
    return [];
  }
  
  // Return tour IDs
  if (!payload) return [];
  return payload.split(",").filter(Boolean);
}

/**
 * Remove a tour ID from ownership cookie (after transfer)
 */
export function removeTourOwnership(tourId: string) {
  const existing = getOwnedTourIds();
  const filtered = existing.filter(id => id !== tourId);
  
  if (filtered.length === 0) {
    // Clear cookie if empty
    cookies().set(OWNERSHIP_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    return;
  }
  
  // Re-sign and store
  const payload = filtered.join(",");
  const token = `${payload}.${sign(payload)}`;
  
  cookies().set(OWNERSHIP_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/**
 * Check if a tour ID is owned by this browser
 */
export function isTourOwned(tourId: string): boolean {
  return getOwnedTourIds().includes(tourId);
}
