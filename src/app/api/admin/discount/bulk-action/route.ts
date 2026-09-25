import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

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
          // Export as Excel using exceljs
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet("İndirim Kodları");

          // Add headers
          worksheet.columns = [
            { header: "Kod", key: "code", width: 20 },
            { header: "Tür", key: "type", width: 20 },
            { header: "İsim Soyisim", key: "fullName", width: 25 },
            { header: "Firma", key: "company", width: 25 },
            { header: "Telefon", key: "phone", width: 15 },
            { header: "E-posta", key: "email", width: 30 },
            { header: "Başlangıç", key: "startsAt", width: 12 },
            { header: "Bitiş", key: "endsAt", width: 12 },
            { header: "Kullanım", key: "usage", width: 12 },
            { header: "Grup", key: "batchName", width: 20 },
            { header: "Not", key: "note", width: 30 },
          ];

          // Add rows
          codes.forEach((c) => {
            worksheet.addRow({
              code: c.code,
              type:
                c.type === "PREMIUM_DAYS"
                  ? `Premium (${c.premiumDays} gün)`
                  : `İndirim %${c.percent}`,
              fullName: c.fullName || "",
              company: c.company || "",
              phone: c.phone || "",
              email: c.email || "",
              startsAt: c.startsAt.toISOString().split("T")[0],
              endsAt: c.endsAt.toISOString().split("T")[0],
              usage: `${c.usedCount}/${c.maxUses}`,
              batchName: c.batchName || "",
              note: c.note || "",
            });
          });

          // Generate buffer
          const buffer = await workbook.xlsx.writeBuffer();

          const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");

          return new NextResponse(buffer, {
            headers: {
              "Content-Type":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              "Content-Disposition": `attachment; filename="indirim-kodlari-${dateStr}.xlsx"`,
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

          const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");

          return new NextResponse(content, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Content-Disposition": `attachment; filename="indirim-kodlari-${dateStr}.txt"`,
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
