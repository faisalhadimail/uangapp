import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildTemplateVariables, substituteTemplate, DEFAULT_TEMPLATE_BODY } from "@/lib/whatsapp";
import { currentMonthKey } from "@/lib/format";

/**
 * GET /api/whatsapp/preview
 * Query:
 *   ?templateId=ID  (optional, defaults to default template)
 *   ?month=YYYY-MM  (optional, defaults to current month)
 *
 * Returns the rendered preview text with variables substituted from real data.
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const templateId = params.get("templateId");
    const month = params.get("month") || currentMonthKey();

    // Load template
    let template;
    if (templateId) {
      template = await db.whatsAppTemplate.findUnique({ where: { id: templateId } });
    }
    if (!template) {
      template = await db.whatsAppTemplate.findFirst({ where: { isDefault: true } });
    }
    if (!template) {
      template = await db.whatsAppTemplate.findFirst();
    }

    const templateBody = template?.body ?? DEFAULT_TEMPLATE_BODY;

    // Build summary data (reuse /api/summary logic via fetch would be complex; replicate minimal version)
    const now = new Date();
    const [yearStr, monthStr] = month.split("-").map(Number);
    const yearNum = yearStr;
    const monthNum = monthStr;

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

    // Aggregate by category
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

    // Unpaid bills for this month
    const bills = await db.bill.findMany({
      where: { isActive: true },
      include: { paidRecords: { where: { month } } },
    });
    const unpaidBills = bills.filter((b) => b.paidRecords.length === 0);
    const unpaidBillsCount = unpaidBills.length;
    const unpaidBillsTotal = unpaidBills.reduce((s, b) => s + b.amount, 0);

    // Unpaid debts
    const debtRecords = await db.debt.findMany({ where: { isPaid: false } });
    const totalDebt = debtRecords.filter((d) => d.type === "debt").reduce((s, d) => s + d.amount, 0);
    const totalReceivable = debtRecords.filter((d) => d.type === "receivable").reduce((s, d) => s + d.amount, 0);

    // Savings
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
    const preview = substituteTemplate(templateBody, vars);

    return NextResponse.json({
      preview,
      templateId: template?.id ?? null,
      templateName: template?.name ?? "Default",
      variables: vars,
    });
  } catch (error) {
    console.error("GET /api/whatsapp/preview error:", error);
    return NextResponse.json({ error: "Gagal membuat preview" }, { status: 500 });
  }
}
