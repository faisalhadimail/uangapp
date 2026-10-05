import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatRupiah, currentMonthKey, parseDate, todayISO } from "@/lib/format";

/**
 * POST /api/notifications/generate
 *
 * Scans the database for conditions that should generate notifications:
 *   1. Bills due soon (within 3 days) or overdue
 *   2. Debts overdue (dueDate < today)
 *   3. Budgets over limit (>100% spent)
 *   4. Scheduled WhatsApp reports due (nextRunAt <= now)
 *
 * Idempotent: skips if a notification of the same type+title already exists
 * and was created within the last 24 hours.
 *
 * Returns: { generated: number, summary: {...} }
 */
export async function POST() {
  try {
    const now = new Date();
    const nowIso = now.toISOString();
    const today = todayISO();
    const month = currentMonthKey();
    const [yearNum, monthNum] = month.split("-").map(Number);
    const isCurrentMonth = yearNum === now.getFullYear() && monthNum === now.getMonth() + 1;

    // Get existing notifications from last 24h to dedupe
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const recentNotifs = await db.notification.findMany({
      where: { createdAt: { gte: cutoff } },
      select: { type: true, title: true },
    });
    const recentSet = new Set(recentNotifs.map((n) => `${n.type}::${n.title}`));

    let generated = 0;
    const newNotifs: Array<{
      type: string;
      title: string;
      message: string;
      color: string;
      priority: string;
      actionUrl: string | null;
      createdAt: string;
    }> = [];

    function tryAdd(
      type: string,
      title: string,
      message: string,
      color: string,
      priority: string,
      actionUrl: string | null = null,
    ) {
      const key = `${type}::${title}`;
      if (recentSet.has(key)) return;
      newNotifs.push({
        type,
        title,
        message,
        color,
        priority,
        actionUrl,
        createdAt: nowIso,
      });
      recentSet.add(key);
      generated++;
    }

    // 1. Bills due or overdue
    const bills = await db.bill.findMany({
      where: { isActive: true },
      include: { paidRecords: { where: { month } } },
    });

    const todayDate = parseDate(today);
    for (const b of bills) {
      const isPaid = b.paidRecords.length > 0;
      if (isPaid || !isCurrentMonth) continue;

      const dueDateThisMonth = new Date(yearNum, monthNum - 1, b.dueDay);
      const diffDays = Math.ceil((dueDateThisMonth.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        // Overdue
        tryAdd(
          "bill_due",
          `Tagihan terlambat: ${b.name}`,
          `Tagihan ${b.name} (${formatRupiah(b.amount)}) jatuh tempo tanggal ${b.dueDay} dan sudah lewat ${Math.abs(diffDays)} hari. Segera lakukan pembayaran.`,
          "#ef4444",
          "high",
          "more:bill",
        );
      } else if (diffDays <= 3) {
        // Due soon
        tryAdd(
          "bill_due",
          `Tagihan jatuh tempo: ${b.name}`,
          `Tagihan ${b.name} (${formatRupiah(b.amount)}) jatuh tempo dalam ${diffDays} hari (tanggal ${b.dueDay}). Siapkan dana pembayaran.`,
          "#f59e0b",
          "normal",
          "more:bill",
        );
      }
    }

    // 2. Debts overdue
    const debts = await db.debt.findMany({ where: { isPaid: false } });
    for (const d of debts) {
      if (!d.dueDate) continue;
      const dueDate = parseDate(d.dueDate);
      const diffDays = Math.ceil((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        const typeLabel = d.type === "debt" ? "Utang ke" : "Piutang dari";
        tryAdd(
          "debt_overdue",
          `${d.type === "debt" ? "Utang" : "Piutang"} terlambat: ${d.personName}`,
          `${typeLabel} ${d.personName} sebesar ${formatRupiah(d.amount)} (${d.description}) jatuh tempo ${d.dueDate} dan sudah lewat ${Math.abs(diffDays)} hari.`,
          "#ef4444",
          "high",
          "more:debt",
        );
      } else if (diffDays <= 3) {
        const typeLabel = d.type === "debt" ? "Utang ke" : "Piutang dari";
        tryAdd(
          "debt_overdue",
          `Jatuh tempo ${diffDays} hari: ${d.personName}`,
          `${typeLabel} ${d.personName} sebesar ${formatRupiah(d.amount)} jatuh tempo dalam ${diffDays} hari (${d.dueDate}).`,
          "#f59e0b",
          "normal",
          "more:debt",
        );
      }
    }

    // 3. Budgets over limit
    const budgets = await db.budget.findMany({ include: { category: true } });
    const txns = await db.transaction.findMany({
      where: { date: { startsWith: month }, type: "expense" },
      select: { categoryId: true, amount: true },
    });
    const spentByCat = new Map<string, number>();
    for (const t of txns) {
      if (!t.categoryId) continue;
      spentByCat.set(t.categoryId, (spentByCat.get(t.categoryId) ?? 0) + t.amount);
    }

    for (const b of budgets) {
      const spent = spentByCat.get(b.categoryId) ?? 0;
      const percentage = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;

      if (percentage >= 100) {
        tryAdd(
          "budget_over",
          `Anggaran terlampaui: ${b.category.name}`,
          `Pengeluaran ${b.category.name} mencapai ${formatRupiah(spent)} dari anggaran ${formatRupiah(b.amount)} (${percentage}%). Pertimbangkan untuk mengurangi pengeluaran kategori ini.`,
          "#ef4444",
          "high",
          "budgets",
        );
      } else if (percentage >= 80) {
        tryAdd(
          "budget_over",
          `Anggaran mendekati batas: ${b.category.name}`,
          `Pengeluaran ${b.category.name} sudah ${percentage}% dari anggaran (${formatRupiah(spent)} dari ${formatRupiah(b.amount)}). Hati-hati, hampir mencapai batas.`,
          "#f59e0b",
          "normal",
          "budgets",
        );
      }
    }

    // 4. Scheduled WhatsApp reports due
    const schedules = await db.scheduledReport.findMany({
      where: { isActive: true },
    });
    for (const s of schedules) {
      const nextRun = new Date(s.nextRunAt);
      if (nextRun.getTime() <= now.getTime()) {
        tryAdd(
          "schedule_due",
          `Laporan WhatsApp jatuh tempo: ${s.name}`,
          `Jadwal "${s.name}" sudah waktunya dikirim. Buka WhatsApp Hub untuk mengirim laporan ke penerima.`,
          "#25D366",
          "normal",
          "more:whatsapp",
        );
      }
    }

    // Bulk insert new notifications
    if (newNotifs.length > 0) {
      await db.notification.createMany({
        data: newNotifs,
      });
    }

    return NextResponse.json({
      generated,
      summary: {
        bill_due: newNotifs.filter((n) => n.type === "bill_due").length,
        debt_overdue: newNotifs.filter((n) => n.type === "debt_overdue").length,
        budget_over: newNotifs.filter((n) => n.type === "budget_over").length,
        schedule_due: newNotifs.filter((n) => n.type === "schedule_due").length,
      },
    });
  } catch (error) {
    console.error("POST /api/notifications/generate error:", error);
    return NextResponse.json({ error: "Gagal membuat notifikasi" }, { status: 500 });
  }
}
