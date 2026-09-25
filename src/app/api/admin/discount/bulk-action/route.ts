import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/discount/bulk-action
 * Bulk actions: export, disable, delete, assign contact
 */
export async function POST(req: Request) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, ids, format, detailed, contactInfo } = body;

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "action ve ids gerekli" },
        { status: 400 }
      );
    }

    const codes = await prisma.discountCode.findMany({
      where: { id: { in: ids } },
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
    });

    if (codes.length === 0) {
      return NextResponse.json({ error: "Kod bulunamadı" }, { status: 404 });
    }

    switch (action) {
      case "export": {
        if (format === "xlsx") {
          // Export as Excel
          const rows = codes.map((c) => ({
            Kod: c.code,
            Tür:
              c.type === "PREMIUM_DAYS"
                ? `Premium (${c.premiumDays} gün)`
                : `İndirim %${c.percent}`,
            "İsim Soyisim": c.fullName || "",
            Firma: c.company || "",
            Telefon: c.phone || "",
            "E-posta": c.email || "",
            Başlangıç: c.startsAt.toISOString().split("T")[0],
            Bitiş: c.endsAt.toISOString().split("T")[0],
            Kullanım: `${c.usedCount}/${c.maxUses}`,
            Grup: c.batchName || "",
            Not: c.note || "",
          }));

          const worksheet = XLSX.utils.json_to_sheet(rows);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "İndirim Kodları");

          const buffer = XLSX.write(workbook, {
            type: "buffer",
            bookType: "xlsx",
          });

          return new NextResponse(buffer, {
            headers: {
              "Content-Type":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              "Content-Disposition": `attachment; filename="indirim-kodlari-${new Date().toISOString().split("T")[0]}.xlsx"`,
            },
          });
        } else if (format === "txt") {
          // Export as TXT
          let content = "";

          if (detailed) {
            // Tab-separated detailed format
            content = "Kod\tTür\tİsim\tFirma\tTelefon\tE-posta\tBaşlangıç\tBitiş\tKullanım\tGrup\n";
            for (const c of codes) {
              const type =
                c.type === "PREMIUM_DAYS"
                  ? `Premium (${c.premiumDays} gün)`
                  : `İndirim %${c.percent}`;
              content += `${c.code}\t${type}\t${c.fullName || ""}\t${c.company || ""}\t${c.phone || ""}\t${c.email || ""}\t${c.startsAt.toISOString().split("T")[0]}\t${c.endsAt.toISOString().split("T")[0]}\t${c.usedCount}/${c.maxUses}\t${c.batchName || ""}\n`;
            }
          } else {
            // One code per line
            content = codes.map((c) => c.code).join("\n");
          }

          return new NextResponse(content, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Content-Disposition": `attachment; filename="indirim-kodlari-${new Date().toISOString().split("T")[0]}.txt"`,
            },
          });
        }

        return NextResponse.json({ error: "Geçersiz format" }, { status: 400 });
      }

      case "disable": {
        // Bulk disable
        await prisma.discountCode.updateMany({
          where: { id: { in: ids } },
          data: { disabled: true },
        });

        return NextResponse.json({ success: true, count: codes.length });
      }

      case "delete": {
        // Bulk delete
        await prisma.discountCode.deleteMany({
          where: { id: { in: ids } },
        });

        return NextResponse.json({ success: true, count: codes.length });
      }

      case "assign_contact": {
        // Bulk assign contact info
        if (!contactInfo) {
          return NextResponse.json(
            { error: "contactInfo gerekli" },
            { status: 400 }
          );
        }

        const { fullName, company, phone, email } = contactInfo;

        await prisma.discountCode.updateMany({
          where: { id: { in: ids } },
          data: {
            ...(fullName !== undefined && { fullName }),
            ...(company !== undefined && { company }),
            ...(phone !== undefined && { phone }),
            ...(email !== undefined && { email }),
          },
        });

        return NextResponse.json({ success: true, count: codes.length });
      }

      default:
        return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Failed to perform bulk action:", error);
    return NextResponse.json(
      { error: "Toplu işlem başarısız" },
      { status: 500 }
    );
  }
}
