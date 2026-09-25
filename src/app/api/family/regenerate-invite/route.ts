import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateFamilyInviteCode } from "@/lib/familyInviteCode";

export const dynamic = "force-dynamic";

/**
 * POST /api/family/regenerate-invite
 * Regenerate family invite code (owner only)
 * Contract: {"ownerDeviceId": string}
 */
export async function POST(req: Request) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const body = await req.json();
    const { ownerDeviceId } = body;

    if (!ownerDeviceId) {
      return NextResponse.json(
        {
          ok: false,
          error: "bad_request",
          message: "ownerDeviceId gerekli",
        },
        { status: 400, headers }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find owner's family
      const ownerMembership = await tx.familyMember.findFirst({
        where: {
          deviceId: ownerDeviceId,
          role: "OWNER",
          removedAt: null,
          family: {
            status: "ACTIVE",
          },
        },
        include: {
          family: true,
        },
      });

      if (!ownerMembership) {
        return {
          status: 404,
          body: {
            ok: false,
            error: "not_found",
            message: "Aile bulunamadı veya yetki yok",
          },
        };
      }

      // Generate new unique invite code
      let newInviteCode: string;
      let attempts = 0;
      while (true) {
        newInviteCode = generateFamilyInviteCode();
        const existing = await tx.familyPlan.findUnique({
          where: { inviteCode: newInviteCode },
        });
        if (!existing) break;
        attempts++;
        if (attempts > 10) {
          throw new Error("Failed to generate unique invite code");
        }
      }

      // Update family with new invite code
      await tx.familyPlan.update({
        where: { id: ownerMembership.family.id },
        data: { inviteCode: newInviteCode },
      });

      return {
        status: 200,
        body: {
          ok: true,
          inviteCode: newInviteCode,
        },
      };
    });

    return NextResponse.json(result.body, { status: result.status, headers });
  } catch (error) {
    console.error("Failed to regenerate invite code:", error);
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
