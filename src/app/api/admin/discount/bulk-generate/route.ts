import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { generateDiscountCode } from "@/lib/discountCode";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/discount/bulk-generate
 * Bulk generate discount codes
 */
export async function POST(req: Request) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      count,
      prefix,
      type,
      premiumDays,
      percent,
      startsAt,
      endsAt,
      maxUses,
      batchName,
      fullName,
      company,
      phone,
      email,
    } = body;

    // Validate
    if (!count || count < 1 || count > 1000) {
      return NextResponse.json(
        { error: "Adet 1-1000 arası olmalı" },
        { status: 400 }
      );
    }

    if (!type || !startsAt || !endsAt) {
      return NextResponse.json(
        { error: "type, startsAt, endsAt gerekli" },
        { status: 400 }
      );
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

    const batchId = nanoid(16);
    const codes: string[] = [];
    const maxRetries = 10;

    // Generate unique codes
    for (let i = 0; i < count; i++) {
      let code = "";
      let retries = 0;

      while (retries < maxRetries) {
        const candidate = generateDiscountCode(prefix || "DISC");

        // Check if already generated in this batch
        if (codes.includes(candidate)) {
          retries++;
          continue;
        }

        // Check if exists in database
        const existing = await prisma.discountCode.findUnique({
          where: { code: candidate },
        });

        if (!existing) {
          code = candidate;
          break;
        }

        retries++;
      }

      if (!code) {
        return NextResponse.json(
          { error: "Benzersiz kod oluşturulamadı, lütfen tekrar deneyin" },
          { status: 500 }
        );
      }

      codes.push(code);
    }

    // Create all codes in a transaction
    const created = await prisma.$transaction(
      codes.map((code) =>
        prisma.discountCode.create({
          data: {
            code,
            type,
            premiumDays: type === "PREMIUM_DAYS" ? premiumDays : null,
            percent: type === "PERCENT" ? percent : null,
            startsAt: new Date(startsAt),
            endsAt: new Date(endsAt),
            maxUses: maxUses || 1,
            batchId,
            batchName: batchName || null,
            fullName: fullName || null,
            company: company || null,
            phone: phone || null,
            email: email || null,
          },
        })
      )
    );

    return NextResponse.json({ codes: created, batchId });
  } catch (error) {
    console.error("Failed to bulk generate codes:", error);
    return NextResponse.json(
      { error: "Toplu kod oluşturma başarısız" },
      { status: 500 }
    );
  }
}
