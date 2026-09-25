import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { generateDiscountCode } from "@/lib/discountCodeGen";
import { normalizeDiscountCode } from "@/lib/discountCode";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/discount
 * List all discount codes with filters
 */
export async function GET(req: Request) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // aktif | pasif | hepsi
  const batchId = searchParams.get("batchId");
  const search = searchParams.get("search");

  try {
    const codes = await prisma.discountCode.findMany({
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Client-side filtering for status (computed field)
    let filtered = codes;

    if (batchId) {
      filtered = filtered.filter((c) => c.batchId === batchId);
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.code.toLowerCase().includes(lowerSearch) ||
          c.fullName?.toLowerCase().includes(lowerSearch) ||
          c.company?.toLowerCase().includes(lowerSearch) ||
          c.phone?.toLowerCase().includes(lowerSearch) ||
          c.email?.toLowerCase().includes(lowerSearch) ||
          c.batchName?.toLowerCase().includes(lowerSearch)
      );
    }

    if (status && status !== "hepsi") {
      const now = new Date();
      filtered = filtered.filter((c) => {
        const isActive =
          c.startsAt <= now &&
          now <= c.endsAt &&
          !c.disabled &&
          c.usedCount < c.maxUses;
        return status === "aktif" ? isActive : !isActive;
      });
    }

    return NextResponse.json({ codes: filtered });
  } catch (error) {
    console.error("Failed to fetch discount codes:", error);
    return NextResponse.json(
      { error: "Failed to fetch discount codes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/discount
 * Create a single discount code
 */
export async function POST(req: Request) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      code: inputCode,
      type,
      premiumDays,
      percent,
      startsAt,
      endsAt,
      maxUses,
      batchName,
      batchId,
      fullName,
      company,
      phone,
      email,
      note,
      disabled,
    } = body;

    // Validate required fields
    if (!type || !startsAt || !endsAt) {
      return NextResponse.json(
        { error: "type, startsAt, endsAt gerekli" },
        { status: 400 }
      );
    }

    if (type !== "PREMIUM_DAYS" && type !== "PERCENT") {
      return NextResponse.json({ error: "Geçersiz tür" }, { status: 400 });
    }

    if (type === "PREMIUM_DAYS" && !premiumDays) {
      return NextResponse.json(
        { error: "premiumDays gerekli" },
        { status: 400 }
      );
    }

    if (type === "PERCENT" && !percent) {
      return NextResponse.json({ error: "percent gerekli" }, { status: 400 });
    }

    // Generate or use provided code
    const code = inputCode
      ? normalizeDiscountCode(inputCode)
      : generateDiscountCode("DISC");

    // Check uniqueness
    const existing = await prisma.discountCode.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Bu kod zaten mevcut" },
        { status: 400 }
      );
    }

    const newCode = await prisma.discountCode.create({
      data: {
        code,
        type,
        premiumDays: type === "PREMIUM_DAYS" ? premiumDays : null,
        percent: type === "PERCENT" ? percent : null,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        maxUses: maxUses || 1,
        batchName: batchName || null,
        batchId: batchId || null,
        fullName: fullName || null,
        company: company || null,
        phone: phone || null,
        email: email || null,
        note: note || null,
        disabled: disabled || false,
      },
    });

    return NextResponse.json({ code: newCode });
  } catch (error) {
    console.error("Failed to create discount code:", error);
    return NextResponse.json(
      { error: "İndirim kodu oluşturulamadı" },
      { status: 500 }
    );
  }
}
