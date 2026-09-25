import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 requests per minute per key

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

function getClientKey(req: Request, deviceId: string): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return `${ip}:${deviceId}`;
}

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

/**
 * POST /api/family/join
 * Join a family using an invite code
 * Contract: {"inviteCode": string, "deviceId": string, "platform": "android"|"web"}
 */
export async function POST(req: Request) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const body = await req.json();
    const { inviteCode, deviceId, platform } = body;

    if (!inviteCode || !deviceId || !platform) {
      return NextResponse.json(
        {
          ok: false,
          error: "bad_request",
          message: "inviteCode, deviceId ve platform gerekli",
        },
        { status: 400, headers }
      );
    }

    // Rate limiting
    const clientKey = getClientKey(req, deviceId);
    if (!checkRateLimit(clientKey)) {
      return NextResponse.json(
        {
          ok: false,
          error: "rate_limited",
          message: "Çok fazla istek. Lütfen biraz bekleyin.",
        },
        { status: 429, headers }
      );
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // Acquire device lock to enforce one-family-per-device atomically
      const deviceLock = hashStringTo32bit(deviceId);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${deviceLock})`;

      // Find the family and lock it for atomic seat claiming
      const familyRow = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "FamilyPlan" WHERE "inviteCode" = ${inviteCode.toUpperCase().trim()} FOR UPDATE
      `;

      if (familyRow.length === 0) {
        return {
          status: 404,
          body: {
            ok: false,
            error: "not_found",
            message: "Geçersiz davet kodu",
          },
        };
      }

      const familyId = familyRow[0].id;

      const family = await tx.familyPlan.findUnique({
        where: { id: familyId },
        include: {
          members: {
            where: { removedAt: null },
          },
        },
      });

      if (!family) {
        return {
          status: 404,
          body: {
            ok: false,
            error: "not_found",
            message: "Geçersiz davet kodu",
          },
        };
      }

      // Check if family is active
      if (family.status !== "ACTIVE") {
        return {
          status: 410,
          body: {
            ok: false,
            error: "closed",
            message: "Bu aile kapalı",
          },
        };
      }

      // Check if premium expired
      if (family.premiumUntil <= now) {
        return {
          status: 410,
          body: {
            ok: false,
            error: "expired",
            message: "Bu ailenin premium süresi dolmuş",
          },
        };
      }

      // Check if device is already a member of THIS family
      const existingMembershipSameFamily = await tx.familyMember.findFirst({
        where: {
          familyId: family.id,
          deviceId,
        },
      });

      if (existingMembershipSameFamily && !existingMembershipSameFamily.removedAt) {
        // Already an active member of THIS family
        return {
          status: 409,
          body: {
            ok: false,
            error: "already_member",
            message: "Zaten bu ailenin üyesisiniz",
            premiumUntil: family.premiumUntil.toISOString(),
          },
        };
      }

      // Check if device is in a DIFFERENT active family
      const existingMembershipOtherFamily = await tx.familyMember.findFirst({
        where: {
          deviceId,
          removedAt: null,
          NOT: {
            familyId: family.id,
          },
        },
        include: {
          family: true,
        },
      });

      if (existingMembershipOtherFamily && existingMembershipOtherFamily.family.status === "ACTIVE") {
        return {
          status: 409,
          body: {
            ok: false,
            error: "in_other_family",
            message: "Başka bir ailenin üyesisiniz",
          },
        };
      }

      // Handle rejoin case
      if (existingMembershipSameFamily && existingMembershipSameFamily.removedAt) {
        // Reactivate the membership
        // Check if there's space
        if (family.members.length >= family.maxMembers) {
          return {
            status: 410,
            body: {
              ok: false,
              error: "full",
              message: "Aile dolu",
            },
          };
        }

        await tx.familyMember.update({
          where: { id: existingMembershipSameFamily.id },
          data: {
            removedAt: null,
            joinedAt: now,
            role: "MEMBER",
          },
        });

        return {
          status: 200,
          body: {
            ok: true,
            premiumUntil: family.premiumUntil.toISOString(),
            role: "MEMBER",
          },
        };
      }

      // New member: check if family is full
      if (family.members.length >= family.maxMembers) {
        return {
          status: 410,
          body: {
            ok: false,
            error: "full",
            message: "Aile dolu",
          },
        };
      }

      // Join the family
      await tx.familyMember.create({
        data: {
          familyId: family.id,
          deviceId,
          role: "MEMBER",
        },
      });

      return {
        status: 200,
        body: {
          ok: true,
          premiumUntil: family.premiumUntil.toISOString(),
          role: "MEMBER",
        },
      };
    });

    return NextResponse.json(result.body, { status: result.status, headers });
  } catch (error) {
    console.error("Failed to join family:", error);
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
