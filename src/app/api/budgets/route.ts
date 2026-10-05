import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentMonthKey } from "@/lib/format";

/**
 * GET /api/budgets
 * Returns all budgets with the amount spent in the given (or current) month.
 * Query: ?month=YYYY-MM (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const month = request.nextUrl.searchParams.get("month") || currentMonthKey();

    const budgets = await db.budget.findMany({
      include: { category: true },
      orderBy: { category: { name: "asc" } },
    });

    // Aggregate spent per category for this month
    const txns = await db.transaction.findMany({
      where: { date: { startsWith: month }, type: "expense" },
      select: { categoryId: true, amount: true },
    });
    const spentByCat = new Map<string, number>();
    for (const t of txns) {
      if (!t.categoryId) continue;
      spentByCat.set(t.categoryId, (spentByCat.get(t.categoryId) ?? 0) + t.amount);
    }

    const result = budgets.map((b) => {
      const spent = spentByCat.get(b.categoryId) ?? 0;
      return {
        id: b.id,
        categoryId: b.categoryId,
        amount: b.amount,
        category: b.category,
        spent,
        remaining: b.amount - spent,
        percentage: b.amount > 0 ? Math.min(100, Math.round((spent / b.amount) * 100)) : 0,
      };
    });

    return NextResponse.json({ budgets: result, month });
  } catch (error) {
    console.error("GET /api/budgets error:", error);
    return NextResponse.json({ error: "Gagal memuat anggaran" }, { status: 500 });
  }
}

/**
 * POST /api/budgets
 * Body: { categoryId, amount }
 * Creates or updates (upsert) a budget for the given category.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { categoryId, amount } = body ?? {};

    if (!categoryId || typeof categoryId !== "string") {
      return NextResponse.json({ error: "Kategori wajib dipilih" }, { status: 400 });
    }
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Jumlah anggaran harus lebih dari 0" }, { status: 400 });
    }

    // Verify category is expense type
    const category = await db.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
    }
    if (category.type !== "expense") {
      return NextResponse.json({ error: "Anggaran hanya untuk kategori pengeluaran" }, { status: 400 });
    }

    const budget = await db.budget.upsert({
      where: { categoryId },
      create: { categoryId, amount: Math.round(amount) },
      update: { amount: Math.round(amount) },
      include: { category: true },
    });

    return NextResponse.json({ budget }, { status: 201 });
  } catch (error) {
    console.error("POST /api/budgets error:", error);
    return NextResponse.json({ error: "Gagal menyimpan anggaran" }, { status: 500 });
  }
}

/**
 * DELETE /api/budgets?id=ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID anggaran wajib diisi" }, { status: 400 });
    }
    await db.budget.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/budgets error:", error);
    return NextResponse.json({ error: "Gagal menghapus anggaran" }, { status: 500 });
  }
}
