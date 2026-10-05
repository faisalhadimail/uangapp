import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentMonthKey, parseDate, todayISO } from "@/lib/format";

/**
 * GET /api/bills
 * Returns all active bills with paid status for the given (or current) month.
 * Query: ?month=YYYY-MM (optional) and ?includeInactive=true (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const month = params.get("month") || currentMonthKey();
    const includeInactive = params.get("includeInactive") === "true";

    const bills = await db.bill.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ dueDay: "asc" }, { name: "asc" }],
      include: { paidRecords: { where: { month } } },
    });

    const today = parseDate(todayISO());
    const [yearStr, monthStr] = month.split("-").map(Number);
    const now = new Date();
    const isCurrentMonth = yearStr === now.getFullYear() && monthStr === now.getMonth() + 1;

    const result = bills.map((b) => {
      const isPaid = b.paidRecords.length > 0;
      // Overdue: not paid, due day has passed (only meaningful for current month)
      const dueDateThisMonth = new Date(yearStr, monthStr - 1, b.dueDay);
      const isOverdue = isCurrentMonth && !isPaid && dueDateThisMonth < today;
      return {
        id: b.id,
        name: b.name,
        amount: b.amount,
        dueDay: b.dueDay,
        recurrence: b.recurrence,
        color: b.color,
        icon: b.icon,
        isActive: b.isActive,
        isPaid,
        isOverdue,
      };
    });

    return NextResponse.json({ bills: result, month });
  } catch (error) {
    console.error("GET /api/bills error:", error);
    return NextResponse.json({ error: "Gagal memuat tagihan" }, { status: 500 });
  }
}

/**
 * POST /api/bills
 * Body: { name, amount, dueDay, recurrence?, color?, icon? }
 * Creates a new recurring bill.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, amount, dueDay, recurrence, color, icon } = body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nama tagihan wajib diisi" }, { status: 400 });
    }
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Jumlah tagihan harus lebih dari 0" }, { status: 400 });
    }
    if (!dueDay || typeof dueDay !== "number" || dueDay < 1 || dueDay > 31) {
      return NextResponse.json({ error: "Tanggal jatuh tempo harus antara 1-31" }, { status: 400 });
    }
    if (recurrence && !["monthly", "weekly", "once"].includes(recurrence)) {
      return NextResponse.json({ error: "Recurrence tidak valid" }, { status: 400 });
    }

    const bill = await db.bill.create({
      data: {
        name: name.trim(),
        amount: Math.round(amount),
        dueDay,
        recurrence: recurrence ?? "monthly",
        color: typeof color === "string" ? color : "#0ea5e9",
        icon: typeof icon === "string" ? icon : "Receipt",
      },
    });
    return NextResponse.json({ bill }, { status: 201 });
  } catch (error) {
    console.error("POST /api/bills error:", error);
    return NextResponse.json({ error: "Gagal membuat tagihan" }, { status: 500 });
  }
}

/**
 * PATCH /api/bills
 * Body: { id, isActive? } — toggle active status
 * Body: { id, markPaid, month } — mark as paid/unpaid for given month
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isActive, markPaid, month } = body ?? {};

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }

    // Toggle active status
    if (typeof isActive === "boolean") {
      const bill = await db.bill.update({ where: { id }, data: { isActive } });
      return NextResponse.json({ bill });
    }

    // Mark paid / unpaid
    if (typeof markPaid === "boolean") {
      const targetMonth = typeof month === "string" ? month : currentMonthKey();
      if (markPaid) {
        await db.paidBill.upsert({
          where: { billId_month: { billId: id, month: targetMonth } },
          create: { billId: id, month: targetMonth },
          update: {},
        });
      } else {
        await db.paidBill.deleteMany({
          where: { billId: id, month: targetMonth },
        });
      }
      return NextResponse.json({ success: true, month: targetMonth, paid: markPaid });
    }

    return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/bills error:", error);
    return NextResponse.json({ error: "Gagal memperbarui tagihan" }, { status: 500 });
  }
}

/**
 * DELETE /api/bills?id=ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }
    await db.bill.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/bills error:", error);
    return NextResponse.json({ error: "Gagal menghapus tagihan" }, { status: 500 });
  }
}
