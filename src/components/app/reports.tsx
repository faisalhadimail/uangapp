"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  BarChart3,
  Download,
  Share2,
  Loader2,
  TrendingUp,
  TrendingDown,
  FileText,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatRupiah, formatRupiahShort, monthLabel } from "@/lib/format";
import type { Summary, CategoryAggregate } from "./types";
import { CategoryIcon } from "./icon-map";
import { useToast } from "@/hooks/use-toast";

interface ReportsProps {
  summary: Summary | null;
  loading: boolean;
  monthKey: string;
  onMonthChange: (m: string) => void;
}

const MONTHS_BACK = 6;

/** Generate the last N month keys ending at the given month. */
function getMonthRange(endMonth: string, count: number): string[] {
  const [y, m] = endMonth.split("-").map(Number);
  const arr: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    arr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return arr;
}

export function Reports({ summary, loading, monthKey, onMonthChange }: ReportsProps) {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  // Build month selector options (last 6 months + current)
  const monthOptions = useMemo(() => getMonthRange(monthKey, MONTHS_BACK).reverse(), [monthKey]);

  if (loading || !summary) {
    return <ReportsSkeleton />;
  }

  const topExpenses = summary.expenseByCategory.slice(0, 8);
  const topIncomes = summary.incomeByCategory.slice(0, 5);
  const savingsRate =
    summary.totalIncome > 0
      ? Math.round(((summary.totalIncome - summary.totalExpense) / summary.totalIncome) * 100)
      : 0;

  // Build monthly comparison data (synthetic from prevIncome/prevExpense + current)
  // For simplicity: show two bars for current and previous month
  const monthComparisonData = [
    {
      name: monthLabel(getMonthRange(monthKey, 2)[0]).split(" ")[0].slice(0, 3),
      pemasukan: summary.prevIncome,
      pengeluaran: summary.prevExpense,
    },
    {
      name: monthLabel(monthKey).split(" ")[0].slice(0, 3),
      pemasukan: summary.totalIncome,
      pengeluaran: summary.totalExpense,
    },
  ];

  // Build daily expense bar data (skip zero days for cleaner chart)
  const dailyExpense = summary.dailyFlow
    .filter((d) => d.expense > 0)
    .map((d) => {
      const day = Number(d.day.split("-")[2]);
      return { name: String(day), pengeluaran: d.expense };
    });

  function buildShareText() {
    const lines: string[] = [];
    lines.push(`*Ringkasan Keuangan Keluarga*`);
    lines.push(`Bulan: ${monthLabel(monthKey)}`);
    lines.push(``);
    lines.push(`*Total Saldo:* ${formatRupiah(summary.totalBalance)}`);
    lines.push(`*Pemasukan:* ${formatRupiah(summary.totalIncome)}`);
    lines.push(`*Pengeluaran:* ${formatRupiah(summary.totalExpense)}`);
    lines.push(`*Arus Kas Bersih:* ${formatRupiah(summary.netCashflow)}`);
    lines.push(``);
    if (summary.expenseByCategory.length > 0) {
      lines.push(`*Pengeluaran per Kategori:*`);
      summary.expenseByCategory.slice(0, 5).forEach((c) => {
        lines.push(`• ${c.name}: ${formatRupiah(c.amount)} (${c.percentage}%)`);
      });
    }
    lines.push(``);
    lines.push(`_Dikirim dari Catatan Keuangan Keluarga_`);
    return lines.join("\n");
  }

  function handleShareWhatsApp() {
    const text = encodeURIComponent(buildShareText());
    const url = `https://wa.me/?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
    toast({ title: "Membuka WhatsApp...", description: "Pilih kontak untuk membagikan ringkasan." });
  }

  async function handleExportPDF() {
    setExporting(true);
    try {
      // Use browser print with a dedicated print-only div
      const printable = document.getElementById("report-printable");
      if (!printable) throw new Error("Konten laporan tidak ditemukan");

      const original = document.body.innerHTML;
      const printWindow = window.open("", "_blank", "width=800,height=900");
      if (!printWindow) {
        toast({
          title: "Pop-up diblokir",
          description: "Izinkan pop-up untuk mengunduh PDF.",
          variant: "destructive",
        });
        return;
      }
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="id">
          <head>
            <meta charset="utf-8" />
            <title>Laporan Keuangan — ${monthLabel(monthKey)}</title>
            <style>
              * { box-sizing: border-box; }
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1a2e35; max-width: 800px; margin: 0 auto; }
              h1 { font-size: 24px; margin: 0 0 4px 0; color: #0f766e; }
              .subtitle { color: #64748b; font-size: 14px; margin-bottom: 32px; }
              .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px; }
              .summary-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
              .summary-card .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
              .summary-card .value { font-size: 16px; font-weight: 700; color: #1a2e35; }
              .summary-card.income .value { color: #10b981; }
              .summary-card.expense .value { color: #ef4444; }
              h2 { font-size: 16px; margin: 24px 0 12px 0; color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
              table { width: 100%; border-collapse: collapse; font-size: 13px; }
              th { text-align: left; padding: 8px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
              td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; }
              td.amount { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
              .total-row td { font-weight: 700; border-top: 2px solid #0f766e; border-bottom: none; }
              .color-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
              .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
              @media print {
                body { padding: 20px; }
                @page { margin: 1cm; }
              }
            </style>
          </head>
          <body>
            <h1>Laporan Keuangan Keluarga</h1>
            <div class="subtitle">Periode: ${monthLabel(monthKey)}</div>

            <div class="summary-grid">
              <div class="summary-card">
                <div class="label">Total Saldo</div>
                <div class="value">${formatRupiah(summary.totalBalance)}</div>
              </div>
              <div class="summary-card income">
                <div class="label">Pemasukan</div>
                <div class="value">${formatRupiah(summary.totalIncome)}</div>
              </div>
              <div class="summary-card expense">
                <div class="label">Pengeluaran</div>
                <div class="value">${formatRupiah(summary.totalExpense)}</div>
              </div>
              <div class="summary-card">
                <div class="label">Arus Kas Bersih</div>
                <div class="value">${formatRupiah(summary.netCashflow)}</div>
              </div>
            </div>

            ${
              summary.expenseByCategory.length > 0
                ? `
              <h2>Rincian Pengeluaran per Kategori</h2>
              <table>
                <thead>
                  <tr><th>Kategori</th><th style="text-align:right;">Jumlah</th><th style="text-align:right;">Persentase</th></tr>
                </thead>
                <tbody>
                  ${summary.expenseByCategory
                    .map(
                      (c) => `
                    <tr>
                      <td><span class="color-dot" style="background:${c.color}"></span>${c.name}</td>
                      <td class="amount">${formatRupiah(c.amount)}</td>
                      <td class="amount">${c.percentage}%</td>
                    </tr>
                  `,
                    )
                    .join("")}
                  <tr class="total-row">
                    <td>Total</td>
                    <td class="amount">${formatRupiah(summary.totalExpense)}</td>
                    <td class="amount">100%</td>
                  </tr>
                </tbody>
              </table>
              `
                : ""
            }

            ${
              summary.incomeByCategory.length > 0
                ? `
              <h2>Rincian Pemasukan per Kategori</h2>
              <table>
                <thead>
                  <tr><th>Sumber</th><th style="text-align:right;">Jumlah</th><th style="text-align:right;">Persentase</th></tr>
                </thead>
                <tbody>
                  ${summary.incomeByCategory
                    .map(
                      (c) => `
                    <tr>
                      <td><span class="color-dot" style="background:${c.color}"></span>${c.name}</td>
                      <td class="amount">${formatRupiah(c.amount)}</td>
                      <td class="amount">${c.percentage}%</td>
                    </tr>
                  `,
                    )
                    .join("")}
                  <tr class="total-row">
                    <td>Total</td>
                    <td class="amount">${formatRupiah(summary.totalIncome)}</td>
                    <td class="amount">100%</td>
                  </tr>
                </tbody>
              </table>
              `
                : ""
            }

            ${
              summary.accountBalances.length > 0
                ? `
              <h2>Saldo Rekening</h2>
              <table>
                <thead>
                  <tr><th>Rekening</th><th>Tipe</th><th style="text-align:right;">Saldo</th></tr>
                </thead>
                <tbody>
                  ${summary.accountBalances
                    .map(
                      (a) => `
                    <tr>
                      <td>${a.name}</td>
                      <td>${a.type}</td>
                      <td class="amount">${formatRupiah(a.balance)}</td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>
              `
                : ""
            }

            <div class="footer">
              Dibuat pada ${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · Aplikasi Keuangan Keluarga
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      // Give the new window a moment to render before triggering print
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 250);
      toast({ title: "Menyiapkan PDF...", description: "Pilih 'Save as PDF' pada dialog cetak." });
    } catch (err) {
      toast({
        title: "Gagal mengekspor",
        description: err instanceof Error ? err.message : "Coba lagi nanti.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Hidden printable area marker (kept for future direct-print flow) */}
      <div id="report-printable" className="hidden" />

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <Button
          onClick={handleExportPDF}
          disabled={exporting}
          variant="outline"
          className="h-14 rounded-2xl border-0 bg-secondary text-foreground hover:bg-accent"
        >
          {exporting ? (
            <>
              <Loader2 className="size-5 animate-spin" /> Menyiapkan...
            </>
          ) : (
            <>
              <Download className="size-5" /> Ekspor PDF
            </>
          )}
        </Button>
        <Button
          onClick={handleShareWhatsApp}
          className="h-14 rounded-2xl bg-[#25D366] text-white hover:bg-[#1ebe5d]"
        >
          <Share2 className="size-5" /> Bagikan WhatsApp
        </Button>
      </div>

      {/* Month selector */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {monthOptions.map((m) => (
          <button
            key={m}
            onClick={() => onMonthChange(m)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
              m === monthKey
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {monthLabel(m)}
          </button>
        ))}
      </div>

      {/* Big summary card */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-br from-teal-500 to-emerald-500 p-5 text-white">
            <p className="text-xs text-white/80">Arus Kas Bulan Ini</p>
            <p className="mt-1 text-3xl font-bold">{formatRupiah(summary.netCashflow)}</p>
            <div className="mt-3 flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="size-3.5" />
                <span>+{formatRupiahShort(summary.totalIncome)} masuk</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingDown className="size-3.5" />
                <span>-{formatRupiahShort(summary.totalExpense)} keluar</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x">
            <div className="p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Saldo</p>
              <p className="text-sm font-bold">{formatRupiah(summary.totalBalance)}</p>
            </div>
            <div className="p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Tingkat Tabungan</p>
              <p className={`text-sm font-bold ${savingsRate >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                {savingsRate}%
              </p>
            </div>
            <div className="p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Transfer</p>
              <p className="text-sm font-bold">{formatRupiah(summary.totalTransfer)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly comparison bar chart */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Perbandingan Bulan</h3>
          </div>
          <div className="h-48 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthComparisonData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 180)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "oklch(0.55 0.02 220)" }}
                  tickLine={false}
                  axisLine={false}
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
                  }}
                  formatter={(value: number, name: string) => [
                    formatRupiah(value),
                    name === "pemasukan" ? "Pemasukan" : "Pengeluaran",
                  ]}
                />
                <Bar dataKey="pemasukan" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={48} />
                <Bar dataKey="pengeluaran" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Daily expense bar */}
      {dailyExpense.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Pengeluaran Harian</h3>
              </div>
              <span className="text-xs text-muted-foreground">{dailyExpense.length} hari aktif</span>
            </div>
            <div className="h-40 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyExpense} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 180)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "oklch(0.55 0.02 220)" }}
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
                    }}
                    formatter={(value: number) => [formatRupiah(value), "Pengeluaran"]}
                    labelFormatter={(d) => `Tanggal ${d}`}
                  />
                  <Bar dataKey="pengeluaran" radius={[4, 4, 0, 0]} maxBarSize={24}>
                    {dailyExpense.map((entry, idx) => (
                      <Cell key={idx} fill="#f43f5e" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense breakdown by category - full list */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Rincian Pengeluaran</h3>
          </div>
          {topExpenses.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Belum ada pengeluaran bulan ini.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {topExpenses.map((c) => (
                <CategoryRow key={c.categoryId} item={c} total={summary.totalExpense} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Income breakdown */}
      {topIncomes.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="size-4 text-emerald-500" />
              <h3 className="text-sm font-semibold">Sumber Pemasukan</h3>
            </div>
            <ul className="space-y-2.5">
              {topIncomes.map((c) => (
                <CategoryRow key={c.categoryId} item={c} total={summary.totalIncome} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CategoryRow({ item, total }: { item: CategoryAggregate; total: number }) {
  return (
    <li className="flex items-center gap-3">
      <Avatar className="size-10 rounded-xl">
        <AvatarFallback
          className="rounded-xl"
          style={{ backgroundColor: `${item.color}22`, color: item.color }}
        >
          <CategoryIcon name={item.icon} className="size-5" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <p className="ml-2 shrink-0 text-sm font-bold">{formatRupiah(item.amount)}</p>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${item.percentage}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">{item.percentage}%</span>
        </div>
      </div>
    </li>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-4 pb-4">
      <div className="grid grid-cols-2 gap-2.5">
        <Skeleton className="h-14 rounded-2xl" />
        <Skeleton className="h-14 rounded-2xl" />
      </div>
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-56 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
