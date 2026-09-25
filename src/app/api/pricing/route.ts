import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/pricing
 * Public API to get pricing information
 */
export async function GET() {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const settings = await prisma.adSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      // Return defaults if settings don't exist yet
      return NextResponse.json(
        {
          individualYearlyTl: 600,
          familyYearlyTl: null,
          familyMaxMembers: 5,
        },
        { headers }
      );
    }

    return NextResponse.json(
      {
        individualYearlyTl: settings.individualYearlyTl,
        familyYearlyTl: settings.familyYearlyTl,
        familyMaxMembers: settings.familyMaxMembers,
      },
      { headers }
    );
  } catch (error) {
    console.error("Failed to fetch pricing:", error);
    return NextResponse.json(
      { error: "Bir hata oluştu" },
      { status: 500, headers }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
