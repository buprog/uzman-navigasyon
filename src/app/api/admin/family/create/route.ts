import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAccess } from "@/lib/adminAuth";
import { generateFamilyInviteCode } from "@/lib/familyInviteCode";

export const dynamic = "force-dynamic";

/**
 * Hash a string to a 32-bit integer for pg_advisory_xact_lock
 */
function hashStringTo32bit(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash >>> 0; // Ensure unsigned
}

export async function POST(req: Request) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { ownerDeviceId, name, premiumDays, maxMembers, fullName, phone, email, note } = body;

    if (!ownerDeviceId || !premiumDays || !maxMembers) {
      return NextResponse.json(
        { error: "ownerDeviceId, premiumDays ve maxMembers gerekli" },
        { status: 400 }
      );
    }

    if (maxMembers < 2 || maxMembers > 20) {
      return NextResponse.json(
        { error: "maxMembers 2-20 arası olmalı" },
        { status: 400 }
      );
    }

    // Generate unique invite code
    let inviteCode: string;
    let attempts = 0;
    while (true) {
      inviteCode = generateFamilyInviteCode();
      const existing = await prisma.familyPlan.findUnique({
        where: { inviteCode },
      });
      if (!existing) break;
      attempts++;
      if (attempts > 10) {
        throw new Error("Failed to generate unique invite code");
      }
    }

    const now = new Date();
    const premiumUntil = new Date(now.getTime() + premiumDays * 24 * 60 * 60 * 1000);

    // Create family in transaction with device lock
    const result = await prisma.$transaction(async (tx) => {
      // Acquire device lock to enforce one-family-per-device atomically
      const deviceLock = hashStringTo32bit(ownerDeviceId);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${deviceLock})`;

      // Check if device is already a MEMBER in another family
      const existingMembership = await tx.familyMember.findFirst({
        where: {
          deviceId: ownerDeviceId,
          removedAt: null,
        },
        include: {
          family: true,
        },
      });

      if (existingMembership) {
        if (existingMembership.role === "MEMBER" && existingMembership.family.status === "ACTIVE") {
          throw new Error("Bu cihaz başka bir ailenin üyesi");
        }
        if (existingMembership.role === "OWNER" && existingMembership.family.status === "ACTIVE") {
          throw new Error("Bu cihaz zaten aktif bir aileye sahip");
        }
      }

      const family = await tx.familyPlan.create({
        data: {
          ownerDeviceId,
          name: name || null,
          inviteCode,
          maxMembers,
          premiumUntil,
          status: "ACTIVE",
          source: "admin",
          fullName: fullName || null,
          phone: phone || null,
          email: email || null,
          note: note || null,
        },
      });

      // Create owner membership
      await tx.familyMember.create({
        data: {
          familyId: family.id,
          deviceId: ownerDeviceId,
          role: "OWNER",
        },
      });

      return family;
    });

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await logAdminAccess(
      adminEmail,
      ip,
      "create_family",
      result.id,
      `Owner: ${ownerDeviceId.substring(0, 8)}, Days: ${premiumDays}, Max: ${maxMembers}`
    );

    return NextResponse.json({ family: result });
  } catch (e: any) {
    console.error("[admin/family/create]", e);
    return NextResponse.json(
      { error: e.message || "Aile oluşturulamadı" },
      { status: 400 }
    );
  }
}
