import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDate, todayISO } from "@/lib/format";

/**
 * GET /api/summary?month=YYYY-MM
 *
 * Returns the family finance dashboard summary for the given month (defaults to current month):
 *   - totalIncome, totalExpense, totalTransfer (sums for the month)
 *   - netCashflow (income - expense) for the month
 *   - totalBalance (sum of all account balances, including initialBalance)
 *   - expenseByCategory: [{ categoryId, name, color, icon, amount, percentage }]
 *   - incomeByCategory:  [{ categoryId, name, color, icon, amount, percentage }]
 *   - dailyFlow: [{ day: "YYYY-MM-DD", income, expense }]
 *   - recentTransactions: last 5 across all months
 *   - Tahap 2:
 *     - budgets: [{ id, categoryId, amount, spent, remaining, percentage, category }]
 *     - upcomingBills: bills for current month with paid/overdue status
 *     - totalDebt, totalReceivable (unpaid amounts)
 *     - totalSavings, totalSavingsTarget
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const month = request.nextUrl.searchParams.get("month") || defaultMonth;

    // Validate YYYY-MM format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Format bulan tidak valid (YYYY-MM)" }, { status: 400 });
    }

    // Fetch accounts (for total balance)
    const accounts = await db.account.findMany({
      include: {
        transactionsFrom: { select: { type: true, amount: true } },
        transactionsTo: { select: { type: true, amount: true } },
      },
    });

    const accountBalances = accounts.map((acc) => {
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
      };
    });

    const totalBalance = accountBalances.reduce((sum, a) => sum + a.balance, 0);

    // Fetch this month's transactions
    const txns = await db.transaction.findMany({
      where: { date: { startsWith: month } },
      include: { category: true },
    });

    const totalIncome = txns
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const totalExpense = txns
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    const totalTransfer = txns
      .filter((t) => t.type === "transfer")
      .reduce((s, t) => s + t.amount, 0);

    // Aggregate by category
    const byCategory = (tType: "income" | "expense") => {
      const map = new Map<
        string,
        { categoryId: string; name: string; color: string; icon: string; amount: number }
      >();
      for (const t of txns.filter((t) => t.type === tType)) {
        const key = t.categoryId ?? "uncategorized";
        const existing = map.get(key);
        if (existing) existing.amount += t.amount;
        else {
          map.set(key, {
            categoryId: key,
            name: t.category?.name ?? "Lainnya",
            color: t.category?.color ?? "#94a3b8",
            icon: t.category?.icon ?? "Wallet",
            amount: t.amount,
          });
        }
      }
      const total = tType === "income" ? totalIncome : totalExpense;
      return Array.from(map.values())
        .map((c) => ({
          ...c,
          percentage: total > 0 ? Math.round((c.amount / total) * 100) : 0,
        }))
        .sort((a, b) => b.amount - a.amount);
    };

    const expenseByCategory = byCategory("expense");
    const incomeByCategory = byCategory("income");

    // Daily flow for the month
    const [yearStr, monthStr] = month.split("-");
    const yearNum = Number(yearStr);
    const monthNum = Number(monthStr);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const dailyMap = new Map<string, { income: number; expense: number }>();
    for (let d = 1; d <= daysInMonth; d++) {
      const dayKey = `${month}-${String(d).padStart(2, "0")}`;
      dailyMap.set(dayKey, { income: 0, expense: 0 });
    }
    for (const t of txns) {
      const entry = dailyMap.get(t.date);
      if (!entry) continue;
      if (t.type === "income") entry.income += t.amount;
      else if (t.type === "expense") entry.expense += t.amount;
    }
    const dailyFlow = Array.from(dailyMap.entries()).map(([day, v]) => ({ day, ...v }));

    // Recent transactions (5 most recent across all months)
    const recentTransactions = await db.transaction.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 5,
      include: {
        category: true,
        account: { select: { id: true, name: true, type: true } },
        toAccount: { select: { id: true, name: true, type: true } },
        member: { select: { id: true, name: true, color: true, avatar: true, role: true } },
      },
    });

    // Previous month for comparison
    const prevDate = new Date(yearNum, monthNum - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    const prevTxns = await db.transaction.findMany({
      where: { date: { startsWith: prevMonth } },
      select: { type: true, amount: true },
    });
    const prevIncome = prevTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const prevExpense = prevTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    // ---- Tahap 2: Budgets with spent this month --------------------------
    const budgetRecords = await db.budget.findMany({
      include: { category: true },
      orderBy: { category: { name: "asc" } },
    });
    const spentByCat = new Map<string, number>();
    for (const t of txns.filter((t) => t.type === "expense")) {
      if (!t.categoryId) continue;
      spentByCat.set(t.categoryId, (spentByCat.get(t.categoryId) ?? 0) + t.amount);
    }
    const budgets = budgetRecords.map((b) => {
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
    const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
    const totalBudgetSpent = budgets.reduce((s, b) => s + b.spent, 0);

    // ---- Tahap 2: Bills for the month (paid/overdue status) -------------
    const billRecords = await db.bill.findMany({
      where: { isActive: true },
      orderBy: [{ dueDay: "asc" }, { name: "asc" }],
      include: { paidRecords: { where: { month } } },
    });
    const today = parseDate(todayISO());
    const isCurrentMonth = yearNum === now.getFullYear() && monthNum === now.getMonth() + 1;
    const upcomingBills = billRecords.map((b) => {
      const isPaid = b.paidRecords.length > 0;
      const dueDateThisMonth = new Date(yearNum, monthNum - 1, b.dueDay);
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
    const unpaidBills = upcomingBills.filter((b) => !b.isPaid);
    const unpaidBillsCount = unpaidBills.length;
    const unpaidBillsTotal = unpaidBills.reduce((s, b) => s + b.amount, 0);

    // ---- Tahap 2: Debts & receivables (unpaid totals) -------------------
    const debtRecords = await db.debt.findMany({ where: { isPaid: false } });
    const totalDebt = debtRecords
      .filter((d) => d.type === "debt")
      .reduce((s, d) => s + d.amount, 0);
    const totalReceivable = debtRecords
      .filter((d) => d.type === "receivable")
      .reduce((s, d) => s + d.amount, 0);

    // ---- Tahap 2: Savings total ------------------------------------------
    const savings = await db.saving.findMany();
    const totalSavings = savings.reduce((s, sv) => s + sv.currentAmount, 0);
    const totalSavingsTarget = savings.reduce((s, sv) => s + sv.targetAmount, 0);

    return NextResponse.json({
      month,
      totalBalance,
      totalIncome,
      totalExpense,
      totalTransfer,
      netCashflow: totalIncome - totalExpense,
      prevIncome,
      prevExpense,
      expenseByCategory,
      incomeByCategory,
      dailyFlow,
      accountBalances,
      recentTransactions,
      // Tahap 2 fields
      budgets,
      totalBudget,
      totalBudgetSpent,
      upcomingBills,
      unpaidBillsCount,
      unpaidBillsTotal,
      totalDebt,
      totalReceivable,
      totalSavings,
      totalSavingsTarget,
    });
  } catch (error) {
    console.error("GET /api/summary error:", error);
    return NextResponse.json({ error: "Gagal memuat ringkasan" }, { status: 500 });
  }
}
