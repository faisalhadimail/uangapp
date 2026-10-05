import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/targets
 * Returns all financial targets, sorted by isActive desc then targetDate asc.
 */
export async function GET() {
  try {
    const targets = await db.financialTarget.findMany({
      orderBy: [{ isActive: "desc" }, { targetDate: "asc" }],
    });
    return NextResponse.json({ targets });
  } catch (error) {
    console.error("GET /api/targets error:", error);
    return NextResponse.json({ error: "Gagal memuat target" }, { status: 500 });
  }
}

/**
 * POST /api/targets
 * Body: { name, type?, targetAmount, currentAmount?, targetDate?, monthlyContribution?, color?, icon? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, targetAmount, currentAmount, targetDate, monthlyContribution, color, icon } = body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nama target wajib diisi" }, { status: 400 });
    }
    if (!targetAmount || typeof targetAmount !== "number" || targetAmount <= 0) {
      return NextResponse.json({ error: "Target jumlah harus lebih dari 0" }, { status: 400 });
    }
    if (type && !["debt_free", "emergency_fund", "retirement", "education", "home", "custom"].includes(type)) {
      return NextResponse.json({ error: "Tipe target tidak valid" }, { status: 400 });
    }

    const target = await db.financialTarget.create({
      data: {
        name: name.trim(),
        type: type ?? "custom",
        targetAmount: Math.round(targetAmount),
        currentAmount: typeof currentAmount === "number" ? Math.round(currentAmount) : 0,
        targetDate: typeof targetDate === "string" && targetDate ? targetDate : null,
        monthlyContribution: typeof monthlyContribution === "number" ? Math.round(monthlyContribution) : null,
        color: typeof color === "string" ? color : "#10b981",
        icon: typeof icon === "string" ? icon : "Target",
      },
    });
    return NextResponse.json({ target }, { status: 201 });
  } catch (error) {
    console.error("POST /api/targets error:", error);
    return NextResponse.json({ error: "Gagal membuat target" }, { status: 500 });
  }
}

/**
 * PATCH /api/targets
 * Body: { id, currentAmount?, name?, targetAmount?, targetDate?, monthlyContribution?, isActive? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, currentAmount, name, targetAmount, targetDate, monthlyContribution, isActive, color, icon, type } = body ?? {};

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (typeof currentAmount === "number") data.currentAmount = Math.round(currentAmount);
    if (typeof name === "string" && name.trim()) data.name = name.trim();
    if (typeof targetAmount === "number") data.targetAmount = Math.round(targetAmount);
    if (typeof targetDate === "string") data.targetDate = targetDate || null;
    if (typeof monthlyContribution === "number") data.monthlyContribution = Math.round(monthlyContribution);
    if (typeof isActive === "boolean") data.isActive = isActive;
    if (typeof color === "string") data.color = color;
    if (typeof icon === "string") data.icon = icon;
    if (typeof type === "string" && ["debt_free", "emergency_fund", "retirement", "education", "home", "custom"].includes(type)) data.type = type;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
    }

    const target = await db.financialTarget.update({ where: { id }, data });
    return NextResponse.json({ target });
  } catch (error) {
    console.error("PATCH /api/targets error:", error);
    return NextResponse.json({ error: "Gagal memperbarui target" }, { status: 500 });
  }
}

/**
 * DELETE /api/targets?id=ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }
    await db.financialTarget.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/targets error:", error);
    return NextResponse.json({ error: "Gagal menghapus target" }, { status: 500 });
  }
}
