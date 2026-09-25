import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAccess } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/**
 * Hash a string to a 32-bit integer for pg_advisory_xact_lock
 */
function hashStringTo32bit(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash >>> 0;
}

interface SkipReason {
  familyId: string;
  deviceIdShort?: string;
  reason: "already_active" | "owner_in_other_family" | "in_other_family" | "full";
}

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

    const reopened: string[] = [];
    const skipped: SkipReason[] = [];

    await prisma.$transaction(async (tx) => {
      // Get only CLOSED families
      const families = await tx.familyPlan.findMany({
        where: {
          id: { in: ids },
          status: "CLOSED",
        },
        include: {
          members: {
            where: {
              removedAt: { not: null },
            },
            orderBy: {
              joinedAt: "asc",
            },
          },
        },
      });

      // Skip already ACTIVE families
      const alreadyActive = ids.filter(
        (id) => !families.find((f) => f.id === id)
      );
      alreadyActive.forEach((familyId) => {
        skipped.push({ familyId, reason: "already_active" });
      });

      for (const family of families) {
        // Only reactivate members whose removedAt equals closedAt
        const membersToReactivate = family.members.filter(
          (m) =>
            family.closedAt &&
            m.removedAt &&
            m.removedAt.getTime() === family.closedAt.getTime()
        );

        if (membersToReactivate.length === 0) {
          reopened.push(family.id);
          await tx.familyPlan.update({
            where: { id: family.id },
            data: { status: "ACTIVE", closedAt: null },
          });
          continue;
        }

        // Find owner
        const owner = membersToReactivate.find((m) => m.role === "OWNER");
        const members = membersToReactivate.filter((m) => m.role === "MEMBER");

        // Sort device IDs for deterministic lock order
        const devicesToCheck = [
          ...(owner ? [owner.deviceId] : []),
          ...members.map((m) => m.deviceId),
        ].sort();

        // Take advisory locks in sorted order
        for (const deviceId of devicesToCheck) {
          await tx.$executeRawUnsafe(
            `SELECT pg_advisory_xact_lock(${hashStringTo32bit(deviceId)})`
          );
        }

        // Check if owner can be reactivated
        let ownerRestored = false;
        if (owner) {
          const ownerInOther = await tx.familyMember.findFirst({
            where: {
              deviceId: owner.deviceId,
              familyId: { not: family.id },
              removedAt: null,
              family: {
                status: "ACTIVE",
              },
            },
          });

          if (ownerInOther) {
            // Can't reopen: owner is in another family
            skipped.push({
              familyId: family.id,
              deviceIdShort: owner.deviceId.substring(0, 8),
              reason: "owner_in_other_family",
            });
            continue; // Leave family CLOSED
          }

          // Restore owner
          await tx.familyMember.update({
            where: { id: owner.id },
            data: { removedAt: null },
          });
          ownerRestored = true;
        }

        // Count active members after owner restoration
        const activeCount = await tx.familyMember.count({
          where: {
            familyId: family.id,
            removedAt: null,
          },
        });

        // Restore members while under maxMembers
        for (const member of members) {
          const currentActive = await tx.familyMember.count({
            where: {
              familyId: family.id,
              removedAt: null,
            },
          });

          if (currentActive >= family.maxMembers) {
            skipped.push({
              familyId: family.id,
              deviceIdShort: member.deviceId.substring(0, 8),
              reason: "full",
            });
            continue;
          }

          const memberInOther = await tx.familyMember.findFirst({
            where: {
              deviceId: member.deviceId,
              familyId: { not: family.id },
              removedAt: null,
              family: {
                status: "ACTIVE",
              },
            },
          });

          if (memberInOther) {
            skipped.push({
              familyId: family.id,
              deviceIdShort: member.deviceId.substring(0, 8),
              reason: "in_other_family",
            });
            continue;
          }

          await tx.familyMember.update({
            where: { id: member.id },
            data: { removedAt: null },
          });
        }

        // Mark family as ACTIVE and clear closedAt
        await tx.familyPlan.update({
          where: { id: family.id },
          data: { status: "ACTIVE", closedAt: null },
        });

        reopened.push(family.id);
      }
    });

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await logAdminAccess(
      adminEmail,
      ip,
      "reopen_families",
      undefined,
      `Reopened ${reopened.length} families, skipped ${skipped.length} entries`
    );

    return NextResponse.json({
      ok: true,
      reopened,
      skipped,
    });
  } catch (e) {
    console.error("[admin/family/bulk-reopen]", e);
    return NextResponse.json({ error: "Aileler açılamadı" }, { status: 500 });
  }
}
