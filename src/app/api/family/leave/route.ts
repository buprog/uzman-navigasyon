import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/family/leave
 * Leave current family (only for members, not owner)
 * Contract: {"deviceId": string}
 */
export async function POST(req: Request) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const body = await req.json();
    const { deviceId } = body;

    if (!deviceId) {
      return NextResponse.json(
        {
          ok: false,
          error: "bad_request",
          message: "deviceId gerekli",
        },
        { status: 400, headers }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find active membership
      const membership = await tx.familyMember.findFirst({
        where: {
          deviceId,
          removedAt: null,
        },
      });

      if (!membership) {
        return {
          status: 404,
          body: {
            ok: false,
            error: "not_found",
            message: "Aktif aile üyeliği bulunamadı",
          },
        };
      }

      // Owner cannot leave
      if (membership.role === "OWNER") {
        return {
          status: 400,
          body: {
            ok: false,
            error: "owner_cannot_leave",
            message: "Aile sahibi ayrılamaz",
          },
        };
      }

      // Mark as removed
      await tx.familyMember.update({
        where: { id: membership.id },
        data: { removedAt: new Date() },
      });

      return {
        status: 200,
        body: {
          ok: true,
        },
      };
    });

    return NextResponse.json(result.body, { status: result.status, headers });
  } catch (error) {
    console.error("Failed to leave family:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "server_error",
        message: "Bir hata oluştu",
      },
      { status: 500, headers }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
