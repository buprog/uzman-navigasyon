import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    await prisma.ad.update({
      where: { id },
      data: { impressions: { increment: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[ads/impression]", e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
