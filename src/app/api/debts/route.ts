import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/debts
 * Returns all debts & receivables, sorted by type then unpaid-first then dueDate.
 * Query: ?type=debt|receivable (optional), ?status=unpaid|paid (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const type = params.get("type");
    const status = params.get("status");

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status === "unpaid") where.isPaid = false;
    if (status === "paid") where.isPaid = true;

    const debts = await db.debt.findMany({
      where,
      orderBy: [{ type: "asc" }, { isPaid: "asc" }, { dueDate: "asc" }],
    });
    return NextResponse.json({ debts });
  } catch (error) {
    console.error("GET /api/debts error:", error);
    return NextResponse.json({ error: "Gagal memuat utang & piutang" }, { status: 500 });
  }
}

/**
 * POST /api/debts
 * Body: { type, personName, amount, description, dueDate? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, personName, amount, description, dueDate } = body ?? {};

    if (!["debt", "receivable"].includes(type)) {
      return NextResponse.json({ error: "Tipe harus 'debt' atau 'receivable'" }, { status: 400 });
    }
    if (!personName || typeof personName !== "string" || !personName.trim()) {
      return NextResponse.json({ error: "Nama pihak wajib diisi" }, { status: 400 });
    }
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Jumlah harus lebih dari 0" }, { status: 400 });
    }
    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json({ error: "Keterangan wajib diisi" }, { status: 400 });
    }
    if (dueDate && typeof dueDate === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return NextResponse.json({ error: "Format tanggal jatuh tempo tidak valid" }, { status: 400 });
    }

    const debt = await db.debt.create({
      data: {
        type,
        personName: personName.trim(),
        amount: Math.round(amount),
        description: description.trim(),
        dueDate: typeof dueDate === "string" && dueDate ? dueDate : null,
      },
    });
    return NextResponse.json({ debt }, { status: 201 });
  } catch (error) {
    console.error("POST /api/debts error:", error);
    return NextResponse.json({ error: "Gagal membuat utang/piutang" }, { status: 500 });
  }
}

/**
 * PATCH /api/debts
 * Body: { id, isPaid, paidDate? } — mark as paid/unpaid
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isPaid, paidDate } = body ?? {};

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }
    if (typeof isPaid !== "boolean") {
      return NextResponse.json({ error: "isPaid wajib boolean" }, { status: 400 });
    }

    const debt = await db.debt.update({
      where: { id },
      data: {
        isPaid,
        paidDate: isPaid ? (typeof paidDate === "string" ? paidDate : new Date().toISOString().slice(0, 10)) : null,
      },
    });
    return NextResponse.json({ debt });
  } catch (error) {
    console.error("PATCH /api/debts error:", error);
    return NextResponse.json({ error: "Gagal memperbarui utang/piutang" }, { status: 500 });
  }
}

/**
 * DELETE /api/debts?id=ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }
    await db.debt.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/debts error:", error);
    return NextResponse.json({ error: "Gagal menghapus utang/piutang" }, { status: 500 });
  }
}
