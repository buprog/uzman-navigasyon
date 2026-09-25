import { NextResponse } from "next/server";

/**
 * Check if trial reset is allowed
 * Only works in non-production or when PAYMENT_TEST_MODE is enabled
 */
export async function GET() {
  // Check if in development or test mode (server-side check)
  const isDev = process.env.NODE_ENV !== "production";
  const isTestMode = process.env.PAYMENT_TEST_MODE === "true";
  
  const allowed = isDev || isTestMode;
  
  return NextResponse.json({ allowed });
}
