"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  Banknote,
  Smartphone,
  ChevronRight,
  Target,
  Receipt,
  PiggyBank,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Circle,
  Activity,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatRupiah, formatRupiahShort, formatDateShort, parseDate } from "@/lib/format";
import type { Summary } from "./types";
import { CategoryIcon } from "./icon-map";
import { cn } from "@/lib/utils";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const ACCOUNT_ICONS: Record<string, typeof Landmark> = {
  bank: Landmark,
  cash: Banknote,
  ewallet: Smartphone,
};

interface DashboardProps {
  summary: Summary | null;
  loading: boolean;
  onAddTransaction: () => void;
  onNavigateTransactions: () => void;
  onNavigateReports: () => void;
  onNavigateBudgets: () => void;
  onNavigateBills: () => void;
  onNavigateSavings: () => void;
}

export function Dashboard({
  summary,
  loading,
  onAddTransaction,
  onNavigateTransactions,
  onNavigateReports,
  onNavigateBudgets,
  onNavigateBills,
  onNavigateSavings,
}: DashboardProps) {
  if (loading || !summary) {
    return <DashboardSkeleton />;
  }

  const incomeTrend =
    summary.prevIncome > 0
      ? Math.round(((summary.totalIncome - summary.prevIncome) / summary.prevIncome) * 100)
      : null;
  const expenseTrend =
    summary.prevExpense > 0
      ? Math.round(((summary.totalExpense - summary.prevExpense) / summary.prevExpense) * 100)
      : null;

  // Compact daily flow for chart (skip zero days at start/end)
  const dailyFlow = summary.dailyFlow.map((d) => ({
    day: parseDate(d.day).getDate(),
    income: d.income,
    expense: d.expense,
    raw: d.day,
  }));

  const pieData = summary.expenseByCategory.slice(0, 5).map((c) => ({
    name: c.name,
    value: c.amount,
    color: c.color,
  }));

  return (
    <div className="space-y-5 pb-4">
      {/* Hero balance card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-5 text-white shadow-lg shadow-emerald-500/20">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 size-32 rounded-full bg-white/5" />

        <div className="relative">
          <p className="text-sm font-medium text-white/80">Total Saldo Keluarga</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{formatRupiah(summary.totalBalance)}</p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
              <ArrowUpRight className="size-3.5 shrink-0 text-emerald-100" />
              <div className="min-w-0">
                <p className="text-[10px] leading-tight text-white/70">Pemasukan</p>
                <p className="truncate text-white">{formatRupiahShort(summary.totalIncome)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
              <ArrowDownLeft className="size-3.5 shrink-0 text-rose-100" />
              <div className="min-w-0">
                <p className="text-[10px] leading-tight text-white/70">Pengeluaran</p>
                <p className="truncate text-white">{formatRupiahShort(summary.totalExpense)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Income / Expense / Net cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <StatCard
          label="Pemasukan"
          value={summary.totalIncome}
          icon={<ArrowUpRight className="size-4 text-emerald-500" />}
          trend={incomeTrend}
        />
        <StatCard
          label="Pengeluaran"
          value={summary.totalExpense}
          icon={<ArrowDownLeft className="size-4 text-rose-500" />}
          trend={expenseTrend}
          trendInverted
        />
        <StatCard
          label="Arus Kas"
          value={summary.netCashflow}
          icon={<Wallet className="size-4 text-sky-500" />}
        />
      </div>

      {/* Cash flow chart */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Arus Kas Harian</h3>
              <p className="text-xs text-muted-foreground">Pemasukan vs pengeluaran</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Masuk</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-rose-400" />
                <span className="text-muted-foreground">Keluar</span>
              </div>
            </div>
          </div>

          {dailyFlow.length === 0 || (summary.totalIncome === 0 && summary.totalExpense === 0) ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Belum ada transaksi bulan ini.
            </div>
          ) : (
            <div className="h-44 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyFlow} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 180)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "oklch(0.55 0.02 220)" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={(v) => formatRupiahShort(v)}
                    tick={{ fontSize: 10, fill: "oklch(0.55 0.02 220)" }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "none",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                      fontSize: 12,
                      padding: "8px 12px",
                    }}
                    labelFormatter={(d) => `Tanggal ${d}`}
                    formatter={(value: number, name: string) => [
                      formatRupiah(value),
                      name === "income" ? "Pemasukan" : "Pengeluaran",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#incomeGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fill="url(#expenseGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accounts quick list */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold">Rekening</h3>
          <span className="text-xs text-muted-foreground">{summary.accountBalances.length} rekening</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {summary.accountBalances.slice(0, 4).map((acc) => {
            const Icon = ACCOUNT_ICONS[acc.type] ?? Wallet;
            return (
              <Card key={acc.id} className="border-0 shadow-sm">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">{acc.name}</p>
                    <p className="truncate text-sm font-semibold">{formatRupiah(acc.balance)}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Tahap 2: Budget progress widget */}
      {summary.budgets && summary.budgets.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Target className="size-4 text-violet-500" />
              <h3 className="text-sm font-semibold">Anggaran</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={onNavigateBudgets} className="text-xs text-primary">
              Detail <ChevronRight className="size-3.5" />
            </Button>
          </div>

          <Card className="border-0 shadow-sm overflow-hidden">
            {/* Overall progress bar */}
            <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 px-4 py-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {formatRupiah(summary.totalBudgetSpent ?? 0)} dari {formatRupiah(summary.totalBudget ?? 0)}
                </span>
                <span className="font-bold text-violet-600">
                  {summary.totalBudget && summary.totalBudget > 0
                    ? Math.min(100, Math.round(((summary.totalBudgetSpent ?? 0) / summary.totalBudget) * 100))
                    : 0}
                  %
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
                  style={{
                    width: `${
                      summary.totalBudget && summary.totalBudget > 0
                        ? Math.min(100, Math.round(((summary.totalBudgetSpent ?? 0) / summary.totalBudget) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <CardContent className="p-0">
              <ScrollArea className="thin-scrollbar max-h-56">
                <ul className="divide-y">
                  {summary.budgets
                    .slice()
                    .sort((a, b) => b.percentage - a.percentage)
                    .slice(0, 5)
                    .map((b) => {
                      const isOver = b.spent > b.amount;
                      const isWarning = !isOver && b.percentage >= 80;
                      const barColor = isOver ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500";
                      return (
                        <li key={b.id} className="flex items-center gap-3 px-4 py-2.5">
                          <Avatar className="size-8 rounded-lg">
                            <AvatarFallback
                              className="rounded-lg"
                              style={{ backgroundColor: `${b.category.color}22`, color: b.category.color }}
                            >
                              <CategoryIcon name={b.category.icon} className="size-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-xs font-medium">{b.category.name}</p>
                              <p className="shrink-0 text-[11px] text-muted-foreground">
                                {formatRupiahShort(b.spent)}/{formatRupiahShort(b.amount)}
                              </p>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                              <div
                                className={cn("h-full rounded-full transition-all", barColor)}
                                style={{ width: `${Math.min(100, b.percentage)}%` }}
                              />
                            </div>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tahap 2: Upcoming bills widget */}
      {summary.upcomingBills && summary.upcomingBills.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Receipt className="size-4 text-sky-500" />
              <h3 className="text-sm font-semibold">Tagihan Bulan Ini</h3>
              {summary.unpaidBillsCount && summary.unpaidBillsCount > 0 ? (
                <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                  {summary.unpaidBillsCount} belum bayar
                </span>
              ) : null}
            </div>
            <Button variant="ghost" size="sm" onClick={onNavigateBills} className="text-xs text-primary">
              Detail <ChevronRight className="size-3.5" />
            </Button>
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <ScrollArea className="thin-scrollbar max-h-56">
                <ul className="divide-y">
                  {summary.upcomingBills
                    .slice()
                    .sort((a, b) => {
                      // Overdue first, then unpaid, then by due day
                      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
                      if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
                      return a.dueDay - b.dueDay;
                    })
                    .slice(0, 5)
                    .map((b) => (
                      <li key={b.id} className="flex items-center gap-3 px-4 py-2.5">
                        {b.isPaid ? (
                          <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
                        ) : b.isOverdue ? (
                          <AlertTriangle className="size-5 shrink-0 text-rose-500" />
                        ) : (
                          <Circle className="size-5 shrink-0 text-muted-foreground/40" />
                        )}
                        <Avatar className="size-8 rounded-lg">
                          <AvatarFallback
                            className="rounded-lg"
                            style={{ backgroundColor: `${b.color}22`, color: b.color }}
                          >
                            <CategoryIcon name={b.icon} className="size-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-xs font-medium", b.isPaid && "text-muted-foreground line-through")}>
                            {b.name}
                          </p>
                          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Calendar className="size-3" /> Tgl {b.dueDay}
                            {b.isOverdue && <span className="font-medium text-rose-500">· Terlambat</span>}
                          </p>
                        </div>
                        <p className={cn("shrink-0 text-xs font-bold", b.isPaid && "text-muted-foreground")}>
                          {formatRupiahShort(b.amount)}
                        </p>
                      </li>
                    ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tahap 2: Savings quick stat */}
      {summary.totalSavings !== undefined && summary.totalSavings > 0 && (
        <Card className="border-0 shadow-sm overflow-hidden">
          <button onClick={onNavigateSavings} className="w-full text-left">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm">
                <PiggyBank className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Total Tabungan</p>
                <p className="text-base font-bold">{formatRupiah(summary.totalSavings ?? 0)}</p>
                <p className="text-[11px] text-muted-foreground">
                  dari {formatRupiah(summary.totalSavingsTarget ?? 0)} ·{" "}
                  {summary.totalSavingsTarget && summary.totalSavingsTarget > 0
                    ? Math.round((summary.totalSavings / summary.totalSavingsTarget) * 100)
                    : 0}
                  % tercapai
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </CardContent>
          </button>
        </Card>
      )}

      {/* Tahap 5: Health Score Widget */}
      <HealthScoreWidget onClick={() => onNavigateReports()} />

      {/* Expense breakdown */}
      {pieData.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Pengeluaran per Kategori</h3>
                <p className="text-xs text-muted-foreground">5 kategori terbesar bulan ini</p>
              </div>
              <Button variant="ghost" size="sm" onClick={onNavigateReports} className="text-xs text-primary">
                Detail <ChevronRight className="size-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <ResponsiveContainer width={112} height={112}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={50}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">Total</span>
                  <span className="text-xs font-bold">{formatRupiahShort(summary.totalExpense)}</span>
                </div>
              </div>

              <div className="flex-1 space-y-1.5">
                {pieData.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="truncate">{c.name}</span>
                    </div>
                    <span className="ml-2 shrink-0 font-medium">
                      {Math.round((c.value / summary.totalExpense) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent transactions */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold">Transaksi Terbaru</h3>
          <Button variant="ghost" size="sm" onClick={onNavigateTransactions} className="text-xs text-primary">
            Lihat semua <ChevronRight className="size-3.5" />
          </Button>
        </div>

        {summary.recentTransactions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                <Wallet className="size-6" />
              </div>
              <p className="text-sm font-medium">Belum ada transaksi</p>
              <p className="text-xs text-muted-foreground">Mulai catat pemasukan atau pengeluaran pertama Anda.</p>
              <Button onClick={onAddTransaction} size="sm" className="mt-1 rounded-xl">
                <Plus className="size-4" /> Tambah Transaksi
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <ScrollArea className="thin-scrollbar max-h-80">
                <ul className="divide-y">
                  {summary.recentTransactions.map((t) => (
                    <TransactionRow key={t.id} transaction={t} />
                  ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  trend,
  trendInverted = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  trend?: number | null;
  trendInverted?: boolean;
}) {
  const showTrend = trend !== null && trend !== undefined;
  const isUp = (trend ?? 0) >= 0;
  const isGood = trendInverted ? !isUp : isUp;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="flex flex-col gap-1.5 p-3">
        <div className="flex items-center justify-between">
          <div className="flex size-7 items-center justify-center rounded-lg bg-secondary">{icon}</div>
          {showTrend && (
            <span
              className={`flex items-center gap-0.5 text-[10px] font-semibold ${
                isGood ? "text-emerald-600" : "text-rose-500"
              }`}
            >
              {isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {Math.abs(trend!)}%
            </span>
          )}
        </div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`text-sm font-bold ${value < 0 ? "text-rose-500" : ""}`}>{formatRupiah(value)}</p>
      </CardContent>
    </Card>
  );
}

export function TransactionRow({ transaction: t }: { transaction: import("./types").Transaction }) {
  const isIn = t.type === "income";
  const isTransfer = t.type === "transfer";
  const sign = isIn ? "+" : isTransfer ? "" : "-";
  const color = isIn ? "text-emerald-600" : isTransfer ? "text-sky-600" : "text-rose-500";

  const iconName = t.category?.icon ?? "Plus";
  const iconColor = t.category?.color ?? "#0ea5e9";

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Avatar className="size-10 rounded-xl">
        <AvatarFallback
          className="rounded-xl"
          style={{ backgroundColor: `${iconColor}22`, color: iconColor }}
        >
          <CategoryIcon name={iconName} className="size-5" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{t.description}</p>
        <p className="truncate text-xs text-muted-foreground">
          {t.category?.name ?? "Transfer"} · {formatDateShort(t.date)} · {t.account.name}
          {isTransfer && t.toAccount ? ` → ${t.toAccount.name}` : ""}
          {t.member && <span className="ml-1">· oleh {t.member.name}</span>}
        </p>
      </div>
      <p className={`shrink-0 text-sm font-bold ${color}`}>
        {sign}
        {formatRupiah(t.amount)}
      </p>
    </li>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 pb-4">
      <Skeleton className="h-40 rounded-3xl" />
      <div className="grid grid-cols-3 gap-2.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-56 rounded-2xl" />
      <div className="grid grid-cols-2 gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

// Tahap 5: Health Score Widget (fetches its own data)
function HealthScoreWidget({ onClick }: { onClick: () => void }) {
  const [data, setData] = useState<{ score: number; label: string; color: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/insights");
        if (!res.ok) return;
        const d = await res.json();
        if (cancelled) return;
        setData({
          score: d.healthScore.score,
          label: d.healthScore.label,
          color: d.healthScore.color,
        });
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <button onClick={onClick} className="w-full text-left">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div
              className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${data.color}22`, color: data.color }}
            >
              <Activity className="size-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Skor Kesehatan Keuangan</p>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </div>
              <div className="flex items-end gap-1.5">
                <p className="text-2xl font-bold" style={{ color: data.color }}>
                  {data.score}
                </p>
                <p className="mb-0.5 text-xs text-muted-foreground">/100 · {data.label}</p>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${data.score}%`, backgroundColor: data.color }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </button>
    </Card>
  );
}

// Keep MONTHS_SHORT for potential future month picker
export { MONTHS_SHORT };
