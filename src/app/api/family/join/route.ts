import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      // Find the family
      const family = await tx.familyPlan.findUnique({
        where: { inviteCode: inviteCode.toUpperCase().trim() },
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

      // Check if device is already a member
      const existingMembership = family.members.find(
        (m) => m.deviceId === deviceId
      );
      if (existingMembership) {
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

      // Check if device is in another family
      const otherFamily = await tx.familyMember.findFirst({
        where: {
          deviceId,
          removedAt: null,
        },
        include: {
          family: true,
        },
      });

      if (otherFamily && otherFamily.family.status === "ACTIVE") {
        return {
          status: 409,
          body: {
            ok: false,
            error: "in_other_family",
            message: "Başka bir ailenin üyesisiniz",
          },
        };
      }

      // Check if family is full
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
