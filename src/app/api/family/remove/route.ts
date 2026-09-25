import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/family/remove
 * Remove a member from family (owner only)
 * Contract: {"ownerDeviceId": string, "memberDeviceIdShort"?: string, "memberId"?: string}
 */
export async function POST(req: Request) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const body = await req.json();
    const { ownerDeviceId, memberDeviceIdShort, memberId } = body;

    if (!ownerDeviceId || (!memberDeviceIdShort && !memberId)) {
      return NextResponse.json(
        {
          ok: false,
          error: "bad_request",
          message: "ownerDeviceId ve (memberDeviceIdShort veya memberId) gerekli",
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
        },
        include: {
          family: {
            include: {
              members: {
                where: { removedAt: null },
              },
            },
          },
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

      // Find member to remove
      let memberToRemove;
      if (memberId) {
        memberToRemove = ownerMembership.family.members.find(
          (m) => m.id === memberId
        );
      } else if (memberDeviceIdShort) {
        memberToRemove = ownerMembership.family.members.find((m) =>
          m.deviceId.startsWith(memberDeviceIdShort)
        );
      }

      if (!memberToRemove) {
        return {
          status: 404,
          body: {
            ok: false,
            error: "member_not_found",
            message: "Üye bulunamadı",
          },
        };
      }

      // Cannot remove self
      if (memberToRemove.deviceId === ownerDeviceId) {
        return {
          status: 400,
          body: {
            ok: false,
            error: "cannot_remove_self",
            message: "Kendinizi çıkaramazsınız",
          },
        };
      }

      // Remove member
      await tx.familyMember.update({
        where: { id: memberToRemove.id },
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
    console.error("Failed to remove family member:", error);
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
