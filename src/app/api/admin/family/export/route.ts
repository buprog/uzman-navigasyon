import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAccess } from "@/lib/adminAuth";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "excel";
    const body = await req.json();
    const { ids } = body;

    // Fetch families
    const families = await prisma.familyPlan.findMany({
      where: ids && ids.length > 0 ? { id: { in: ids } } : undefined,
      include: {
        members: {
          where: { removedAt: null },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (format === "txt") {
      // TXT export
      let txt = "Aile Üyelikleri Export\n";
      txt += `Tarih: ${new Date().toLocaleString("tr-TR")}\n`;
      txt += `Toplam: ${families.length}\n\n`;
      txt += "=".repeat(80) + "\n\n";

      families.forEach((f, i) => {
        const activeMembers = f.members.length;
        const isExpired = new Date(f.premiumUntil) < new Date();
        const statusText = f.status === "CLOSED" ? "Kapatıldı" : isExpired ? "Süresi doldu" : "Aktif";

        txt += `${i + 1}. ${f.name || "(isimsiz)"}\n`;
        txt += `   Kod: ${f.inviteCode}\n`;
        txt += `   Yönetici: ${f.ownerDeviceId.substring(0, 8)}\n`;
        if (f.fullName) txt += `   Ad: ${f.fullName}\n`;
        if (f.email) txt += `   Email: ${f.email}\n`;
        if (f.phone) txt += `   Telefon: ${f.phone}\n`;
        txt += `   Üye: ${activeMembers} / ${f.maxMembers}\n`;
        txt += `   Premium Bitiş: ${new Date(f.premiumUntil).toLocaleDateString("tr-TR")}\n`;
        txt += `   Durum: ${statusText}\n`;
        txt += `   Kaynak: ${f.source === "code" ? "Kod" : f.source === "admin" ? "Admin" : "Satın Alım"}\n`;
        txt += `   Oluşturma: ${new Date(f.createdAt).toLocaleDateString("tr-TR")}\n`;
        if (f.note) txt += `   Not: ${f.note}\n`;
        txt += "\n";
      });

      const ip = req.headers.get("x-forwarded-for") || "unknown";
      await logAdminAccess(
        adminEmail,
        ip,
        "export_families_txt",
        undefined,
        `Exported ${families.length} families`
      );

      return new NextResponse(txt, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="aileler-${new Date().toISOString().split("T")[0].replace(/-/g, "")}.txt"`,
        },
      });
    } else {
      // Excel export
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Aileler");

      worksheet.columns = [
        { header: "Aile Adı", key: "name", width: 20 },
        { header: "Davet Kodu", key: "inviteCode", width: 15 },
        { header: "Yönetici Device ID", key: "ownerDeviceId", width: 20 },
        { header: "Ad Soyad", key: "fullName", width: 25 },
        { header: "Email", key: "email", width: 30 },
        { header: "Telefon", key: "phone", width: 15 },
        { header: "Üye Sayısı", key: "memberCount", width: 12 },
        { header: "Max Üye", key: "maxMembers", width: 12 },
        { header: "Premium Bitiş", key: "premiumUntil", width: 15 },
        { header: "Durum", key: "status", width: 15 },
        { header: "Kaynak", key: "source", width: 12 },
        { header: "Oluşturma Tarihi", key: "createdAt", width: 15 },
        { header: "Not", key: "note", width: 30 },
      ];

      families.forEach((f) => {
        const activeMembers = f.members.length;
        const isExpired = new Date(f.premiumUntil) < new Date();
        const statusText = f.status === "CLOSED" ? "Kapatıldı" : isExpired ? "Süresi doldu" : "Aktif";

        worksheet.addRow({
          name: f.name || "(isimsiz)",
          inviteCode: f.inviteCode,
          ownerDeviceId: f.ownerDeviceId.substring(0, 8),
          fullName: f.fullName || "",
          email: f.email || "",
          phone: f.phone || "",
          memberCount: activeMembers,
          maxMembers: f.maxMembers,
          premiumUntil: new Date(f.premiumUntil).toLocaleDateString("tr-TR"),
          status: statusText,
          source: f.source === "code" ? "Kod" : f.source === "admin" ? "Admin" : "Satın Alım",
          createdAt: new Date(f.createdAt).toLocaleDateString("tr-TR"),
          note: f.note || "",
        });
      });

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      const buffer = await workbook.xlsx.writeBuffer();

      const ip = req.headers.get("x-forwarded-for") || "unknown";
      await logAdminAccess(
        adminEmail,
        ip,
        "export_families_excel",
        undefined,
        `Exported ${families.length} families`
      );

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="aileler-${new Date().toISOString().split("T")[0].replace(/-/g, "")}.xlsx"`,
        },
      });
    }
  } catch (e) {
    console.error("[admin/family/export]", e);
    return NextResponse.json({ error: "Export başarısız" }, { status: 500 });
  }
}
