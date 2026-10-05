import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/transactions
 * Optional query:
 *   ?month=YYYY-MM  → filter by month
 *   ?type=income|expense|transfer
 *   ?limit=N        → limit results (most recent first)
 *   ?accountId=ID   → filter by account
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const month = params.get("month");
    const type = params.get("type");
    const accountId = params.get("accountId");
    const limitParam = params.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (accountId) where.accountId = accountId;
    if (month) {
      // month is YYYY-MM
      where.date = { startsWith: month };
    }

    const transactions = await db.transaction.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        category: true,
        account: { select: { id: true, name: true, type: true } },
        toAccount: { select: { id: true, name: true, type: true } },
        member: { select: { id: true, name: true, color: true, avatar: true, role: true } },
      },
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("GET /api/transactions error:", error);
    return NextResponse.json({ error: "Gagal memuat transaksi" }, { status: 500 });
  }
}

/**
 * POST /api/transactions
 * Body: {
 *   type: "income"|"expense"|"transfer",
 *   amount: number,
 *   description: string,
 *   date: "YYYY-MM-DD",
 *   categoryId?: string,
 *   accountId: string,
 *   toAccountId?: string (for transfer),
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, amount, description, date, categoryId, accountId, toAccountId, memberId } = body ?? {};

    // Validation
    if (!["income", "expense", "transfer"].includes(type)) {
      return NextResponse.json({ error: "Tipe transaksi tidak valid" }, { status: 400 });
    }
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Jumlah harus lebih dari 0" }, { status: 400 });
    }
    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json({ error: "Keterangan wajib diisi" }, { status: 400 });
    }
    if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Tanggal tidak valid (format YYYY-MM-DD)" }, { status: 400 });
    }
    if (!accountId || typeof accountId !== "string") {
      return NextResponse.json({ error: "Rekening asal wajib dipilih" }, { status: 400 });
    }
    if (type === "transfer") {
      if (!toAccountId || typeof toAccountId !== "string") {
        return NextResponse.json({ error: "Rekening tujuan wajib untuk transfer" }, { status: 400 });
      }
      if (toAccountId === accountId) {
        return NextResponse.json({ error: "Rekening asal dan tujuan tidak boleh sama" }, { status: 400 });
      }
    }
    if (type !== "transfer" && !categoryId) {
      return NextResponse.json({ error: "Kategori wajib dipilih" }, { status: 400 });
    }

    const transaction = await db.transaction.create({
      data: {
        type,
        amount: Math.round(amount),
        description: description.trim(),
        date,
        categoryId: type === "transfer" ? null : categoryId,
        accountId,
        toAccountId: type === "transfer" ? toAccountId : null,
        // Tahap 4: record which family member created this transaction
        memberId: typeof memberId === "string" && memberId ? memberId : null,
      },
      include: {
        category: true,
        account: { select: { id: true, name: true, type: true } },
        toAccount: { select: { id: true, name: true, type: true } },
        member: { select: { id: true, name: true, color: true, avatar: true, role: true } },
      },
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error("POST /api/transactions error:", error);
    return NextResponse.json({ error: "Gagal membuat transaksi" }, { status: 500 });
  }
}

/**
 * DELETE /api/transactions?id=ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID transaksi wajib diisi" }, { status: 400 });
    }
    await db.transaction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/transactions error:", error);
    return NextResponse.json({ error: "Gagal menghapus transaksi" }, { status: 500 });
  }
}
