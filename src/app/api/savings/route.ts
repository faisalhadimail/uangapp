import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/savings
 * Returns all savings, sorted by type then name.
 */
export async function GET() {
  try {
    const savings = await db.saving.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ savings });
  } catch (error) {
    console.error("GET /api/savings error:", error);
    return NextResponse.json({ error: "Gagal memuat tabungan" }, { status: 500 });
  }
}

/**
 * POST /api/savings
 * Body: { name, type?, targetAmount, currentAmount?, targetDate?, color?, icon? }
 * Creates a new saving target.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, targetAmount, currentAmount, targetDate, color, icon } = body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nama tabungan wajib diisi" }, { status: 400 });
    }
    if (!targetAmount || typeof targetAmount !== "number" || targetAmount <= 0) {
      return NextResponse.json({ error: "Target jumlah harus lebih dari 0" }, { status: 400 });
    }
    if (type && !["goal", "emergency"].includes(type)) {
      return NextResponse.json({ error: "Tipe harus 'goal' atau 'emergency'" }, { status: 400 });
    }

    const saving = await db.saving.create({
      data: {
        name: name.trim(),
        type: type === "emergency" ? "emergency" : "goal",
        targetAmount: Math.round(targetAmount),
        currentAmount: typeof currentAmount === "number" ? Math.round(currentAmount) : 0,
        targetDate: typeof targetDate === "string" && targetDate ? targetDate : null,
        color: typeof color === "string" ? color : "#10b981",
        icon: typeof icon === "string" ? icon : "PiggyBank",
      },
    });
    return NextResponse.json({ saving }, { status: 201 });
  } catch (error) {
    console.error("POST /api/savings error:", error);
    return NextResponse.json({ error: "Gagal membuat tabungan" }, { status: 500 });
  }
}

/**
 * PATCH /api/savings
 * Body: { id, currentAmount?, name?, targetAmount?, targetDate?, type? }
 * Updates a saving (most common: change currentAmount to add/withdraw funds).
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, currentAmount, name, targetAmount, targetDate, type, color, icon } = body ?? {};

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (typeof currentAmount === "number") data.currentAmount = Math.round(currentAmount);
    if (typeof name === "string" && name.trim()) data.name = name.trim();
    if (typeof targetAmount === "number") data.targetAmount = Math.round(targetAmount);
    if (typeof targetDate === "string") data.targetDate = targetDate || null;
    if (typeof type === "string" && ["goal", "emergency"].includes(type)) data.type = type;
    if (typeof color === "string") data.color = color;
    if (typeof icon === "string") data.icon = icon;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
    }

    const saving = await db.saving.update({
      where: { id },
      data,
    });
    return NextResponse.json({ saving });
  } catch (error) {
    console.error("PATCH /api/savings error:", error);
    return NextResponse.json({ error: "Gagal memperbarui tabungan" }, { status: 500 });
  }
}

/**
 * DELETE /api/savings?id=ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }
    await db.saving.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/savings error:", error);
    return NextResponse.json({ error: "Gagal menghapus tabungan" }, { status: 500 });
  }
}
