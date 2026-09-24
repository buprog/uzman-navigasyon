import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const settings = await prisma.adSettings.findUnique({
      where: { id: "default" },
      select: {
        rotationInterval: true,
        rotationMode: true,
      },
    });

    if (!settings) {
      // Return defaults if not found
      return NextResponse.json({
        settings: {
          rotationInterval: 5,
          rotationMode: "sıralı",
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (e) {
    console.error("[ads/settings]", e);
    return NextResponse.json({
      settings: {
        rotationInterval: 5,
        rotationMode: "sıralı",
      },
    });
  }
}
