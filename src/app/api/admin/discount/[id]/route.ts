import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/discount/[id]
 * Update discount code
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      startsAt,
      endsAt,
      fullName,
      company,
      phone,
      email,
      note,
      disabled,
    } = body;

    const updated = await prisma.discountCode.update({
      where: { id: params.id },
      data: {
        ...(startsAt && { startsAt: new Date(startsAt) }),
        ...(endsAt && { endsAt: new Date(endsAt) }),
        ...(fullName !== undefined && { fullName }),
        ...(company !== undefined && { company }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(note !== undefined && { note }),
        ...(disabled !== undefined && { disabled }),
      },
    });

    return NextResponse.json({ code: updated });
  } catch (error) {
    console.error("Failed to update discount code:", error);
    return NextResponse.json(
      { error: "Güncelleme başarısız" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/discount/[id]
 * Delete discount code
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.discountCode.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete discount code:", error);
    return NextResponse.json({ error: "Silme başarısız" }, { status: 500 });
  }
}
