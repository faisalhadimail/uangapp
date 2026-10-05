import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/accounts
 * Returns accounts with computed current balance.
 * Balance = initialBalance + sum(income) - sum(expense) + sum(transfers in) - sum(transfers out)
 */
export async function GET() {
  try {
    const accounts = await db.account.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        transactionsFrom: { select: { type: true, amount: true } },
        transactionsTo: { select: { type: true, amount: true } },
      },
    });

    const computed = accounts.map((acc) => {
      let delta = 0;
      for (const t of acc.transactionsFrom) {
        if (t.type === "income") delta += t.amount;
        else if (t.type === "expense") delta -= t.amount;
        else if (t.type === "transfer") delta -= t.amount;
      }
      for (const t of acc.transactionsTo) {
        if (t.type === "transfer") delta += t.amount;
      }
      return {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        initialBalance: acc.initialBalance,
        balance: acc.initialBalance + delta,
        createdAt: acc.createdAt,
      };
    });

    return NextResponse.json({ accounts: computed });
  } catch (error) {
    console.error("GET /api/accounts error:", error);
    return NextResponse.json({ error: "Gagal memuat rekening" }, { status: 500 });
  }
}

/**
 * POST /api/accounts
 * Body: { name, type?, initialBalance? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, initialBalance } = body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nama rekening wajib diisi" }, { status: 400 });
    }

    const account = await db.account.create({
      data: {
        name: name.trim(),
        type: typeof type === "string" ? type : "cash",
        initialBalance: typeof initialBalance === "number" ? initialBalance : 0,
      },
    });
    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    console.error("POST /api/accounts error:", error);
    return NextResponse.json({ error: "Gagal membuat rekening" }, { status: 500 });
  }
}
