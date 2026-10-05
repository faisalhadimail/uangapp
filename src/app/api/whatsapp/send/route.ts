import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildTemplateVariables, substituteTemplate, DEFAULT_TEMPLATE_BODY, buildWhatsAppUrl } from "@/lib/whatsapp";
import { currentMonthKey } from "@/lib/format";
import { markScheduleSent } from "../scheduled/route";

/**
 * POST /api/whatsapp/send
 *
 * Sends a WhatsApp message. Two modes:
 *
 * Mode 1 — Quick send (no scheduleId):
 *   Body: { templateId?, recipientIds?: string[] }
 *   Returns: { urls: [{ recipientId, name, phone, url }] }
 *   The client opens each URL (wa.me/<phone>?text=<encoded>).
 *   If recipientIds is empty, returns a single share URL (no specific recipient).
 *
 * Mode 2 — Triggered scheduled send:
 *   Body: { scheduleId }
 *   Loads the schedule's template & recipients, marks as sent, computes next run.
 *   Returns: { urls: [...] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, recipientIds, scheduleId, month: monthParam } = body ?? {};

    const month = typeof monthParam === "string" ? monthParam : currentMonthKey();

    // Load template
    let template = templateId
      ? await db.whatsAppTemplate.findUnique({ where: { id: templateId } })
      : await db.whatsAppTemplate.findFirst({ where: { isDefault: true } });
    if (!template) {
      template = await db.whatsAppTemplate.findFirst();
    }
    const templateBody = template?.body ?? DEFAULT_TEMPLATE_BODY;

    // Build summary data
    const accounts = await db.account.findMany({
      include: {
        transactionsFrom: { select: { type: true, amount: true } },
        transactionsTo: { select: { type: true, amount: true } },
      },
    });
    const totalBalance = accounts.reduce((sum, acc) => {
      let delta = 0;
      for (const t of acc.transactionsFrom) {
        if (t.type === "income") delta += t.amount;
        else if (t.type === "expense") delta -= t.amount;
        else if (t.type === "transfer") delta -= t.amount;
      }
      for (const t of acc.transactionsTo) {
        if (t.type === "transfer") delta += t.amount;
      }
      return sum + acc.initialBalance + delta;
    }, 0);

    const txns = await db.transaction.findMany({
      where: { date: { startsWith: month } },
      include: { category: true },
    });
    const totalIncome = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    const expenseByCat = new Map<string, { name: string; color: string; icon: string; amount: number }>();
    for (const t of txns.filter((t) => t.type === "expense" && t.categoryId)) {
      const existing = expenseByCat.get(t.categoryId!);
      if (existing) existing.amount += t.amount;
      else {
        expenseByCat.set(t.categoryId!, {
          name: t.category?.name ?? "Lainnya",
          color: t.category?.color ?? "#94a3b8",
          icon: t.category?.icon ?? "Wallet",
          amount: t.amount,
        });
      }
    }
    const expenseByCategory = Array.from(expenseByCat.entries())
      .map(([categoryId, v]) => ({
        categoryId,
        name: v.name,
        color: v.color,
        icon: v.icon,
        amount: v.amount,
        percentage: totalExpense > 0 ? Math.round((v.amount / totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const bills = await db.bill.findMany({
      where: { isActive: true },
      include: { paidRecords: { where: { month } } },
    });
    const unpaidBills = bills.filter((b) => b.paidRecords.length === 0);
    const unpaidBillsCount = unpaidBills.length;
    const unpaidBillsTotal = unpaidBills.reduce((s, b) => s + b.amount, 0);

    const debtRecords = await db.debt.findMany({ where: { isPaid: false } });
    const totalDebt = debtRecords.filter((d) => d.type === "debt").reduce((s, d) => s + d.amount, 0);
    const totalReceivable = debtRecords.filter((d) => d.type === "receivable").reduce((s, d) => s + d.amount, 0);

    const savings = await db.saving.findMany();
    const totalSavings = savings.reduce((s, sv) => s + sv.currentAmount, 0);
    const totalSavingsTarget = savings.reduce((s, sv) => s + sv.targetAmount, 0);

    const summary = {
      month,
      totalBalance,
      totalIncome,
      totalExpense,
      totalTransfer: 0,
      netCashflow: totalIncome - totalExpense,
      prevIncome: 0,
      prevExpense: 0,
      expenseByCategory,
      incomeByCategory: [],
      dailyFlow: [],
      accountBalances: [],
      recentTransactions: [],
      budgets: [],
      totalBudget: 0,
      totalBudgetSpent: 0,
      upcomingBills: [],
      unpaidBillsCount,
      unpaidBillsTotal,
      totalDebt,
      totalReceivable,
      totalSavings,
      totalSavingsTarget,
    };

    const vars = buildTemplateVariables(summary as never, "Keluarga");
    const message = substituteTemplate(templateBody, vars);

    // Resolve recipients
    let recipients: { id: string; name: string; phone: string }[] = [];
    if (scheduleId) {
      const schedule = await db.scheduledReport.findUnique({ where: { id: scheduleId } });
      if (!schedule) {
        return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 });
      }
      const ids = schedule.recipientIds ? schedule.recipientIds.split("|").filter(Boolean) : [];
      const allRecipients = await db.whatsAppRecipient.findMany({ where: { isActive: true } });
      recipients = allRecipients
        .filter((r) => ids.includes(r.id))
        .map((r) => ({ id: r.id, name: r.name, phone: r.phone }));
    } else if (Array.isArray(recipientIds) && recipientIds.length > 0) {
      const allRecipients = await db.whatsAppRecipient.findMany();
      recipients = allRecipients
        .filter((r) => recipientIds.includes(r.id))
        .map((r) => ({ id: r.id, name: r.name, phone: r.phone }));
    }

    // Build URLs
    let urls: { recipientId: string | null; name: string; phone: string | null; url: string }[];
    if (recipients.length === 0) {
      // No specific recipient — return a single wa.me share URL (user picks contact)
      urls = [
        {
          recipientId: null,
          name: "Pilih kontak",
          phone: null,
          url: `https://wa.me/?text=${encodeURIComponent(message)}`,
        },
      ];
    } else {
      urls = recipients.map((r) => ({
        recipientId: r.id,
        name: r.name,
        phone: r.phone,
        url: buildWhatsAppUrl(r.phone, message),
      }));
    }

    // If scheduled, log the send and advance nextRunAt
    if (scheduleId) {
      await markScheduleSent(scheduleId, message);
    }

    return NextResponse.json({
      sent: true,
      message,
      messageLength: message.length,
      urls,
      templateName: template?.name ?? "Default",
      recipientCount: recipients.length,
    });
  } catch (error) {
    console.error("POST /api/whatsapp/send error:", error);
    return NextResponse.json({ error: "Gagal mengirim laporan" }, { status: 500 });
  }
}
