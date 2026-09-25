import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAccess } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids (array) gerekli" },
        { status: 400 }
      );
    }

    const now = new Date();
    const skippedDevices: string[] = [];

    await prisma.$transaction(async (tx) => {
      // Get all members of the families being reopened
      const membersToReactivate = await tx.familyMember.findMany({
        where: {
          familyId: { in: ids },
          removedAt: { not: null },
        },
        include: {
          family: true,
        },
      });

      // Group by device
      const deviceMap = new Map<string, Array<typeof membersToReactivate[0]>>();
      for (const member of membersToReactivate) {
        if (!deviceMap.has(member.deviceId)) {
          deviceMap.set(member.deviceId, []);
        }
        deviceMap.get(member.deviceId)!.push(member);
      }

      // Reactivate status of families
      await tx.familyPlan.updateMany({
        where: { id: { in: ids } },
        data: { status: "ACTIVE" },
      });

      // For each device, check if they're now in another active family
      for (const [deviceId, members] of Array.from(deviceMap.entries())) {
        // Check if device is currently active in another family
        const activeInOther = await tx.familyMember.findFirst({
          where: {
            deviceId,
            removedAt: null,
            familyId: { notIn: ids },
          },
          include: {
            family: true,
          },
        });

        if (activeInOther && activeInOther.family.status === "ACTIVE") {
          // Skip reactivation for this device
          skippedDevices.push(deviceId);
        } else {
          // Reactivate all memberships for this device in the reopened families
          const memberIds = members.map((m) => m.id);
          await tx.familyMember.updateMany({
            where: { id: { in: memberIds } },
            data: { removedAt: null, joinedAt: now },
          });
        }
      }
    });

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await logAdminAccess(
      adminEmail,
      ip,
      "reopen_families",
      undefined,
      `Reopened ${ids.length} families, skipped ${skippedDevices.length} devices`
    );

    return NextResponse.json({
      ok: true,
      skippedDevices: skippedDevices.map((d) => d.substring(0, 8)),
    });
  } catch (e) {
    console.error("[admin/family/bulk-reopen]", e);
    return NextResponse.json({ error: "Aileler açılamadı" }, { status: 500 });
  }
}
