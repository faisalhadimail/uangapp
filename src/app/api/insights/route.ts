import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatRupiah, currentMonthKey } from "@/lib/format";
import type { HealthScore } from "@/components/app/types";

/**
 * GET /api/insights
 * Query: ?month=YYYY-MM (optional, defaults to current month)
 *
 * Returns:
 *   - healthScore: { score, label, color, factors[] }
 *   - insights: array of generated insights (trend, warning, tip, milestone)
 *
 * Insights are computed on-the-fly from current data, not stored.
 * The /api/insights/store endpoint can persist them if needed.
 */
export async function GET(request: NextRequest) {
  try {
    const month = request.nextUrl.searchParams.get("month") || currentMonthKey();
    const [yearNum, monthNum] = month.split("-").map(Number);

    // ---- Load all needed data ----
    const accounts = await db.account.findMany({
      include: {
        transactionsFrom: { select: { type: true, amount: true, date: true } },
        transactionsTo: { select: { type: true, amount: true, date: true } },
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
    const netCashflow = totalIncome - totalExpense;

    // Previous month for trend
    const prevDate = new Date(yearNum, monthNum - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    const prevTxns = await db.transaction.findMany({
      where: { date: { startsWith: prevMonth } },
      select: { type: true, amount: true },
    });
    const prevIncome = prevTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const prevExpense = prevTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    // Budgets
    const budgets = await db.budget.findMany({ include: { category: true } });
    const spentByCat = new Map<string, number>();
    for (const t of txns.filter((t) => t.type === "expense" && t.categoryId)) {
      spentByCat.set(t.categoryId!, (spentByCat.get(t.categoryId!) ?? 0) + t.amount);
    }

    // Savings
    const savings = await db.saving.findMany();
    const totalSavings = savings.reduce((s, sv) => s + sv.currentAmount, 0);
    const totalSavingsTarget = savings.reduce((s, sv) => s + sv.targetAmount, 0);

    // Debts
    const unpaidDebts = await db.debt.findMany({ where: { isPaid: false, type: "debt" } });
    const totalDebt = unpaidDebts.reduce((s, d) => s + d.amount, 0);

    // Bills
    const bills = await db.bill.findMany({
      where: { isActive: true },
      include: { paidRecords: { where: { month } } },
    });
    const unpaidBills = bills.filter((b) => b.paidRecords.length === 0);
    const unpaidBillsTotal = unpaidBills.reduce((s, b) => s + b.amount, 0);

    // ---- Compute health score (0-100) ----
    const factors: HealthScore["factors"] = [];
    let score = 0;

    // 1. Positive cashflow (+30 max)
    if (netCashflow > 0) {
      score += 30;
      factors.push({
        label: "Arus Kas Positif",
        status: "good",
        detail: `Surplus ${formatRupiah(netCashflow)} bulan ini`,
      });
    } else if (netCashflow === 0) {
      score += 15;
      factors.push({
        label: "Arus Kas Seimbang",
        status: "warning",
        detail: "Pemasukan = pengeluaran bulan ini",
      });
    } else {
      factors.push({
        label: "Arus Kas Negatif",
        status: "bad",
        detail: `Defisit ${formatRupiah(Math.abs(netCashflow))} bulan ini`,
      });
    }

    // 2. Savings rate (+25 max)
    const savingsRate = totalIncome > 0 ? (netCashflow / totalIncome) * 100 : 0;
    if (savingsRate >= 20) {
      score += 25;
      factors.push({
        label: "Tingkat Tabungan Tinggi",
        status: "good",
        detail: `${Math.round(savingsRate)}% dari pemasukan ditabung`,
      });
    } else if (savingsRate >= 10) {
      score += 15;
      factors.push({
        label: "Tingkat Tabungan Cukup",
        status: "warning",
        detail: `${Math.round(savingsRate)}% — target ideal ≥20%`,
      });
    } else if (savingsRate > 0) {
      score += 5;
      factors.push({
        label: "Tingkat Tabungan Rendah",
        status: "warning",
        detail: `Hanya ${Math.round(savingsRate)}% dari pemasukan`,
      });
    } else {
      factors.push({
        label: "Tidak Menabung",
        status: "bad",
        detail: "Belum ada surplus untuk ditabung",
      });
    }

    // 3. Emergency fund (+20 max)
    const monthlyExpenseAvg = totalExpense > 0 ? totalExpense : (prevExpense || 1);
    const emergencyMonthsCovered = totalSavings / monthlyExpenseAvg;
    if (emergencyMonthsCovered >= 6) {
      score += 20;
      factors.push({
        label: "Dana Darurat Mencukupi",
        status: "good",
        detail: `Tabungan cukup untuk ${emergencyMonthsCovered.toFixed(1)} bulan`,
      });
    } else if (emergencyMonthsCovered >= 3) {
      score += 12;
      factors.push({
        label: "Dana Darurat Hampir Cukup",
        status: "warning",
        detail: `${emergencyMonthsCovered.toFixed(1)} bulan — target 6 bulan`,
      });
    } else if (emergencyMonthsCovered > 0) {
      score += 5;
      factors.push({
        label: "Dana Darurat Kurang",
        status: "warning",
        detail: `Hanya ${emergencyMonthsCovered.toFixed(1)} bulan pengeluaran`,
      });
    } else {
      factors.push({
        label: "Belum Ada Dana Darurat",
        status: "bad",
        detail: "Belum ada tabungan darurat",
      });
    }

    // 4. Debt ratio (+15 max)
    const debtToIncomeRatio = totalIncome > 0 ? (totalDebt / totalIncome) * 100 : 0;
    if (totalDebt === 0) {
      score += 15;
      factors.push({
        label: "Bebas Utang",
        status: "good",
        detail: "Tidak ada utang aktif",
      });
    } else if (debtToIncomeRatio < 30) {
      score += 10;
      factors.push({
        label: "Utang Terkendali",
        status: "good",
        detail: `Rasio utang ${Math.round(debtToIncomeRatio)}% dari pemasukan`,
      });
    } else if (debtToIncomeRatio < 50) {
      score += 5;
      factors.push({
        label: "Utang Cukup Tinggi",
        status: "warning",
        detail: `Rasio ${Math.round(debtToIncomeRatio)}% — ideal <30%`,
      });
    } else {
      factors.push({
        label: "Utang Tinggi",
        status: "bad",
        detail: `Rasio ${Math.round(debtToIncomeRatio)}% — berisiko`,
      });
    }

    // 5. Budget adherence (+10 max)
    const overBudgetCount = budgets.filter((b) => {
      const spent = spentByCat.get(b.categoryId) ?? 0;
      return spent > b.amount;
    }).length;
    if (budgets.length === 0) {
      score += 5;
      factors.push({
        label: "Belum Ada Anggaran",
        status: "warning",
        detail: "Buat anggaran untuk kontrol pengeluaran",
      });
    } else if (overBudgetCount === 0) {
      score += 10;
      factors.push({
        label: "Anggaran Tercapai",
        status: "good",
        detail: "Semua kategori dalam batas anggaran",
      });
    } else {
      score += 3;
      factors.push({
        label: "Anggaran Terlampaui",
        status: "warning",
        detail: `${overBudgetCount} dari ${budgets.length} kategori over-budget`,
      });
    }

    // Label based on score
    let label = "Perlu Perhatian";
    let color = "#ef4444";
    if (score >= 80) {
      label = "Sangat Sehat";
      color = "#10b981";
    } else if (score >= 60) {
      label = "Sehat";
      color = "#84cc16";
    } else if (score >= 40) {
      label = "Cukup";
      color = "#f59e0b";
    } else if (score >= 20) {
      label = "Kurang";
      color = "#f97316";
    }

    const healthScore: HealthScore = { score, label, color, factors };

    // ---- Generate insights ----
    const insights: Array<{
      type: string;
      title: string;
      description: string;
      color: string;
      value: number | null;
      maxValue: number | null;
    }> = [];

    // Trend insight
    if (prevExpense > 0) {
      const expenseChange = Math.round(((totalExpense - prevExpense) / prevExpense) * 100);
      if (Math.abs(expenseChange) >= 5) {
        insights.push({
          type: "trend",
          title: expenseChange > 0 ? "Pengeluaran Naik" : "Pengeluaran Turun",
          description: `Pengeluaran ${expenseChange > 0 ? "naik" : "turun"} ${Math.abs(expenseChange)}% dibanding bulan lalu (${formatRupiah(prevExpense)} → ${formatRupiah(totalExpense)}).`,
          color: expenseChange > 0 ? "#ef4444" : "#10b981",
          value: Math.abs(expenseChange),
          maxValue: 100,
        });
      }
    }

    if (prevIncome > 0) {
      const incomeChange = Math.round(((totalIncome - prevIncome) / prevIncome) * 100);
      if (Math.abs(incomeChange) >= 5) {
        insights.push({
          type: "trend",
          title: incomeChange > 0 ? "Pemasukan Naik" : "Pemasukan Turun",
          description: `Pemasukan ${incomeChange > 0 ? "naik" : "turun"} ${Math.abs(incomeChange)}% dibanding bulan lalu (${formatRupiah(prevIncome)} → ${formatRupiah(totalIncome)}).`,
          color: incomeChange > 0 ? "#10b981" : "#f59e0b",
          value: Math.abs(incomeChange),
          maxValue: 100,
        });
      }
    }

    // Warning insights
    if (overBudgetCount > 0) {
      const overBudgets = budgets.filter((b) => {
        const spent = spentByCat.get(b.categoryId) ?? 0;
        return spent > b.amount;
      });
      for (const b of overBudgets.slice(0, 2)) {
        const spent = spentByCat.get(b.categoryId) ?? 0;
        const over = spent - b.amount;
        insights.push({
          type: "warning",
          title: `Anggaran ${b.category.name} terlampaui`,
          description: `Pengeluaran ${b.category.name} ${formatRupiah(spent)} melebihi batas ${formatRupiah(b.amount)} (over ${formatRupiah(over)}). Pertimbangkan menahan pengeluaran kategori ini.`,
          color: "#ef4444",
          value: b.amount > 0 ? Math.round((spent / b.amount) * 100) : null,
          maxValue: 100,
        });
      }
    }

    if (unpaidBillsTotal > 0 && unpaidBills.length >= 3) {
      insights.push({
        type: "warning",
        title: `${unpaidBills.length} tagihan belum dibayar`,
        description: `Total ${formatRupiah(unpaidBillsTotal)} tagihan belum dibayar bulan ini. Pastikan ada dana cukup sebelum jatuh tempo.`,
        color: "#f59e0b",
        value: unpaidBills.length,
        maxValue: null,
      });
    }

    // Tip insights
    if (savingsRate < 10 && totalIncome > 0) {
      insights.push({
        type: "tip",
        title: "Tingkatkan Tingkat Tabungan",
        description: `Saat ini Anda menabung ${Math.round(savingsRate)}% dari pemasukan. Idealnya ≥20%. Coba kurangi pengeluaran non-esensial atau tamb sumber pemasukan.`,
        color: "#0ea5e9",
        value: Math.round(savingsRate),
        maxValue: 100,
      });
    }

    if (totalDebt > 0 && debtToIncomeRatio >= 30) {
      insights.push({
        type: "tip",
        title: "Strategi Pelunasan Utang",
        description: `Total utang ${formatRupiah(totalDebt)} (rasio ${Math.round(debtToIncomeRatio)}%). Pertimbangkan metode snowball (lunasi utang terkecil dulu) atau avalanche (lunasi utang bunga tertinggi dulu).`,
        color: "#8b5cf6",
        value: Math.round(debtToIncomeRatio),
        maxValue: 100,
      });
    }

    // Milestone insights
    if (savings.length > 0) {
      const completedSavings = savings.filter((s) => s.currentAmount >= s.targetAmount);
      for (const s of completedSavings.slice(0, 1)) {
        insights.push({
          type: "milestone",
          title: `Target tercapai: ${s.name}`,
          description: `Selamat! Tabungan "${s.name}" sudah mencapai target ${formatRupiah(s.targetAmount)}. Pertimbangkan menetapkan target baru.`,
          color: "#10b981",
          value: 100,
          maxValue: 100,
        });
      }
    }

    if (totalBalance > 0 && totalSavings > 0 && totalDebt === 0) {
      insights.push({
        type: "milestone",
        title: "Bebas Utang!",
        description: `Selamat! Anda tidak memiliki utang aktif. Total saldo ${formatRupiah(totalBalance)} dan tabungan ${formatRupiah(totalSavings)}.`,
        color: "#10b981",
        value: 100,
        maxValue: 100,
      });
    }

    return NextResponse.json({
      month,
      healthScore,
      insights,
      summary: {
        totalBalance,
        totalIncome,
        totalExpense,
        netCashflow,
        totalSavings,
        totalSavingsTarget,
        totalDebt,
        savingsRate: Math.round(savingsRate),
        overBudgetCount,
        unpaidBillsCount: unpaidBills.length,
        unpaidBillsTotal,
      },
    });
  } catch (error) {
    console.error("GET /api/insights error:", error);
    return NextResponse.json({ error: "Gagal membuat analisis" }, { status: 500 });
  }
}
