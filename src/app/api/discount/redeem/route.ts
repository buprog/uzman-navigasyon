import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeDiscountCode } from "@/lib/discountCode";
import { generateFamilyInviteCode } from "@/lib/familyInviteCode";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute per key

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
 * POST /api/discount/redeem
 * Public API to redeem a discount code
 * Contract: {"code": string, "deviceId": string, "platform": "android"|"web"}
 */
export async function POST(req: Request) {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const body = await req.json();
    const { code: rawCode, deviceId, platform } = body;

    // Validate input
    if (!rawCode || !deviceId || !platform) {
      return NextResponse.json(
        {
          ok: false,
          error: "bad_request",
          message: "code, deviceId ve platform gerekli",
        },
        { status: 400, headers }
      );
    }

    if (platform !== "android" && platform !== "web") {
      return NextResponse.json(
        {
          ok: false,
          error: "bad_request",
          message: "platform 'android' veya 'web' olmalı",
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

    const code = normalizeDiscountCode(rawCode);

    // Use interactive transaction for atomicity
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Find the code
        const discountCode = await tx.discountCode.findUnique({
          where: { code },
        });

        if (!discountCode) {
          return {
            status: 404,
            body: {
              ok: false,
              error: "not_found",
              message: "Geçersiz kod",
            },
          };
        }

        // Check if already redeemed by this device (idempotent)
        const existingRedemption = await tx.discountRedemption.findUnique({
          where: {
            codeId_deviceId: {
              codeId: discountCode.id,
              deviceId,
            },
          },
        });

        if (existingRedemption) {
          // Return existing premium info
          const responseBody: any = {
            ok: false,
            error: "already_redeemed",
            message: "Bu kod zaten kullanılmış",
            premiumUntil: existingRedemption.premiumUntil?.toISOString() || null,
          };

          // For FAMILY type, also return family info
          if (discountCode.type === "FAMILY") {
            const family = await tx.familyPlan.findFirst({
              where: {
                ownerDeviceId: deviceId,
                discountCodeId: discountCode.id,
              },
            });
            if (family) {
              responseBody.type = "FAMILY";
              responseBody.inviteCode = family.inviteCode;
              responseBody.maxMembers = family.maxMembers;
            }
          }

          return {
            status: 409,
            body: responseBody,
          };
        }

        // Check code validity
        const now = new Date();

        if (discountCode.disabled) {
          return {
            status: 410,
            body: {
              ok: false,
              error: "disabled",
              message: "Bu kod devre dışı",
            },
          };
        }

        if (now < discountCode.startsAt) {
          return {
            status: 400,
            body: {
              ok: false,
              error: "not_started",
              message: "Bu kod henüz geçerli değil",
            },
          };
        }

        if (now > discountCode.endsAt) {
          return {
            status: 410,
            body: {
              ok: false,
              error: "expired",
              message: "Bu kodun süresi dolmuş",
            },
          };
        }

        if (discountCode.usedCount >= discountCode.maxUses) {
          return {
            status: 410,
            body: {
              ok: false,
              error: "used_up",
              message: "Bu kod kullanım limitine ulaştı",
            },
          };
        }

        // Atomically claim a use with conditional update
        const updated = await tx.discountCode.updateMany({
          where: {
            id: discountCode.id,
            disabled: false,
            startsAt: { lte: now },
            endsAt: { gte: now },
            usedCount: { lt: discountCode.maxUses },
          },
          data: {
            usedCount: { increment: 1 },
          },
        });

        // If no rows updated, re-read the code and return accurate reason
        if (updated.count === 0) {
          const currentCode = await tx.discountCode.findUnique({
            where: { id: discountCode.id },
          });

          if (!currentCode) {
            return {
              status: 404,
              body: {
                ok: false,
                error: "not_found",
                message: "Geçersiz kod",
              },
            };
          }

          if (currentCode.disabled) {
            return {
              status: 410,
              body: {
                ok: false,
                error: "disabled",
                message: "Bu kod devre dışı",
              },
            };
          }

          if (now < currentCode.startsAt) {
            return {
              status: 400,
              body: {
                ok: false,
                error: "not_started",
                message: "Bu kod henüz geçerli değil",
              },
            };
          }

          if (now > currentCode.endsAt) {
            return {
              status: 410,
              body: {
                ok: false,
                error: "expired",
                message: "Bu kodun süresi dolmuş",
              },
            };
          }

          // Must be used up
          return {
            status: 410,
            body: {
              ok: false,
              error: "used_up",
              message: "Bu kod kullanım limitine ulaştı",
            },
          };
        }

        // Calculate premium until and handle type-specific logic
        let premiumUntil: Date | null = null;
        let familyInviteCode: string | undefined;
        let familyMaxMembers: number | undefined;

        if (discountCode.type === "PREMIUM_DAYS") {
          // Find or create device identity
          let device = await tx.deviceIdentity.findUnique({
            where: { deviceId },
          });

          const currentPremium = device?.premiumExpiresAt || now;
          const extendFrom = currentPremium > now ? currentPremium : now;
          premiumUntil = new Date(
            extendFrom.getTime() +
              (discountCode.premiumDays || 365) * 24 * 60 * 60 * 1000
          );

          if (device) {
            // Update existing device
            await tx.deviceIdentity.update({
              where: { id: device.id },
              data: { premiumExpiresAt: premiumUntil },
            });
          } else {
            // Create new device
            await tx.deviceIdentity.create({
              data: {
                deviceId,
                fingerprintHash: null,
                premiumExpiresAt: premiumUntil,
              },
            });
          }
        } else if (discountCode.type === "FAMILY") {
          // Acquire device lock to enforce one-family-per-device atomically
          const deviceLock = hashStringTo32bit(deviceId);
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(${deviceLock})`;

          // Check if device is already a MEMBER in another family
          const existingMembership = await tx.familyMember.findFirst({
            where: {
              deviceId,
              removedAt: null,
            },
            include: {
              family: true,
            },
          });

          if (existingMembership) {
            // Check if it's not their own OWNER membership
            if (existingMembership.role === "MEMBER" && existingMembership.family.status === "ACTIVE") {
              // Device is a MEMBER in another family - cannot create their own family
              return {
                status: 409,
                body: {
                  ok: false,
                  error: "in_other_family",
                  message: "Başka bir ailenin üyesisiniz, önce ayrılmanız gerekiyor",
                },
              };
            }
          }

          // Create or extend family plan
          const maxMembers = discountCode.familyMaxMembers || 5;
          const premiumDays = discountCode.premiumDays || 365;

          // Check if device already owns an active family
          const existingFamily = await tx.familyPlan.findFirst({
            where: {
              ownerDeviceId: deviceId,
              status: "ACTIVE",
            },
          });

          if (existingFamily) {
            // Extend existing family
            const currentPremium = existingFamily.premiumUntil;
            const extendFrom = currentPremium > now ? currentPremium : now;
            premiumUntil = new Date(
              extendFrom.getTime() + premiumDays * 24 * 60 * 60 * 1000
            );

            // maxMembers = max of existing and code
            const newMaxMembers = Math.max(existingFamily.maxMembers, maxMembers);

            await tx.familyPlan.update({
              where: { id: existingFamily.id },
              data: {
                premiumUntil,
                maxMembers: newMaxMembers,
              },
            });

            familyInviteCode = existingFamily.inviteCode;
            familyMaxMembers = newMaxMembers;
          } else {
            // Create new family plan
            premiumUntil = new Date(
              now.getTime() + premiumDays * 24 * 60 * 60 * 1000
            );

            // Generate unique invite code
            let inviteCode: string;
            let attempts = 0;
            while (true) {
              inviteCode = generateFamilyInviteCode();
              const existing = await tx.familyPlan.findUnique({
                where: { inviteCode },
              });
              if (!existing) break;
              attempts++;
              if (attempts > 10) {
                throw new Error("Failed to generate unique invite code");
              }
            }

            const family = await tx.familyPlan.create({
              data: {
                ownerDeviceId: deviceId,
                inviteCode,
                maxMembers,
                premiumUntil,
                status: "ACTIVE",
                source: "code",
                discountCodeId: discountCode.id,
              },
            });

            // Create owner membership
            await tx.familyMember.create({
              data: {
                familyId: family.id,
                deviceId,
                role: "OWNER",
              },
            });

            familyInviteCode = inviteCode;
            familyMaxMembers = maxMembers;
          }
        }

        // Record redemption
        await tx.discountRedemption.create({
          data: {
            codeId: discountCode.id,
            deviceId,
            platform,
            premiumUntil,
          },
        });

        const responseBody: any = {
          ok: true,
          type: discountCode.type,
          premiumDays:
            discountCode.type === "PREMIUM_DAYS" || discountCode.type === "FAMILY"
              ? discountCode.premiumDays
              : null,
          percent:
            discountCode.type === "PERCENT" ? discountCode.percent : null,
          premiumUntil: premiumUntil?.toISOString() || null,
        };

        // Add family-specific fields
        if (discountCode.type === "FAMILY") {
          responseBody.inviteCode = familyInviteCode;
          responseBody.maxMembers = familyMaxMembers;
        }

        return {
          status: 200,
          body: responseBody,
        };
      });

      return NextResponse.json(result.body, { status: result.status, headers });
    } catch (error) {
      // Check for P2002 (unique constraint violation on DiscountRedemption)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        // Transaction rolled back, re-read the existing redemption
        const existingRedemption = await prisma.discountRedemption.findUnique({
          where: {
            codeId_deviceId: {
              codeId: (await prisma.discountCode.findUnique({ where: { code } }))!.id,
              deviceId,
            },
          },
          include: {
            code: true,
          },
        });

        if (existingRedemption) {
          const responseBody: any = {
            ok: false,
            error: "already_redeemed",
            message: "Bu kod zaten kullanılmış",
            premiumUntil: existingRedemption.premiumUntil?.toISOString() || null,
          };

          // For FAMILY type, also return family info
          if (existingRedemption.code.type === "FAMILY") {
            const family = await prisma.familyPlan.findFirst({
              where: {
                ownerDeviceId: deviceId,
                discountCodeId: existingRedemption.code.id,
              },
            });
            if (family) {
              responseBody.type = "FAMILY";
              responseBody.inviteCode = family.inviteCode;
              responseBody.maxMembers = family.maxMembers;
            }
          }

          return NextResponse.json(responseBody, { status: 409, headers });
        }
      }

      throw error;
    }
  } catch (error) {
    console.error("Failed to redeem discount code:", error);
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

/**
 * OPTIONS /api/discount/redeem
 * CORS preflight
 */
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
