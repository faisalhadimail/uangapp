// Helpers for WhatsApp template variable substitution.

import { formatRupiah, formatRupiahShort, monthLabel } from "./format";
import type { Summary, TemplateVariables } from "@/components/app/types";

/**
 * Build a TemplateVariables object from a Summary, used for WhatsApp template substitution.
 *
 * Available variables:
 *   {{bulan}}          - Bulan laporan (e.g. "Oktober 2026")
 *   {{nama_keluarga}}  - Nama keluarga (default: "Keluarga")
 *   {{saldo}}          - Total saldo semua rekening (e.g. "Rp 50.062.000")
 *   {{pemasukan}}      - Total pemasukan bulan ini
 *   {{pengeluaran}}    - Total pengeluaran bulan ini
 *   {{arus_kas}}       - Arus kas bersih (income - expense)
 *   {{top_kategori}}   - Top 3 kategori pengeluaran dengan persentase
 *   {{tagihan_belum}}  - Jumlah tagihan belum dibayar + total
 *   {{utang}}          - Total utang belum lunas
 *   {{piutang}}        - Total piutang belum diterima
 *   {{tabungan}}       - Total tabungan terkumpul
 */
export function buildTemplateVariables(
  summary: Summary,
  familyName = "Keluarga",
): TemplateVariables {
  const bulan = monthLabel(summary.month);

  // Top 3 expense categories
  const top3 = (summary.expenseByCategory ?? []).slice(0, 3);
  const topKategori =
    top3.length > 0
      ? top3
          .map((c) => `• ${c.name}: ${formatRupiah(c.amount)} (${c.percentage}%)`)
          .join("\n")
      : "Belum ada pengeluaran bulan ini.";

  const tagihanBelum =
    summary.unpaidBillsCount && summary.unpaidBillsCount > 0
      ? `${summary.unpaidBillsCount} tagihan · ${formatRupiah(summary.unpaidBillsTotal ?? 0)}`
      : "Semua tagihan lunas";

  return {
    bulan,
    nama_keluarga: familyName,
    saldo: formatRupiah(summary.totalBalance),
    pemasukan: formatRupiah(summary.totalIncome),
    pengeluaran: formatRupiah(summary.totalExpense),
    arus_kas: formatRupiah(summary.netCashflow),
    top_kategori: topKategori,
    tagihan_belum: tagihanBelum,
    utang: formatRupiah(summary.totalDebt ?? 0),
    piutang: formatRupiah(summary.totalReceivable ?? 0),
    tabungan: formatRupiah(summary.totalSavings ?? 0),
  };
}

/**
 * Substitute variables in a template body string.
 * Supports {{variable_name}} syntax.
 */
export function substituteTemplate(body: string, vars: TemplateVariables): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return String((vars as Record<string, string>)[key] ?? `{{${key}}}`);
  });
}

/** Default template body — used as starter template when none exists. */
export const DEFAULT_TEMPLATE_BODY = `*Laporan Keuangan {{nama_keluarga}}*

*Bulan:* {{bulan}}

*Ringkasan:*
• Saldo: {{saldo}}
• Pemasukan: {{pemasukan}}
• Pengeluaran: {{pengeluaran}}
• Arus Kas: {{arus_kas}}

*Pengeluaran Terbesar:*
{{top_kategori}}

*Status:*
• Tagihan belum dibayar: {{tagihan_belum}}
• Utang aktif: {{utang}}
• Piutang aktif: {{piutang}}
• Tabungan terkumpul: {{tabungan}}

_Dikirim otomatis dari Catatan Keuangan Keluarga_`;

/** Weekly template — shorter version. */
export const WEEKLY_TEMPLATE_BODY = `*Update Mingguan {{nama_keluarga}}*

Per {{bulan}}:
• Saldo: {{saldo}}
• Pemasukan: {{pemasukan}}
• Pengeluaran: {{pengeluaran}}
• Arus Kas: {{arus_kas}}

Top pengeluaran:
{{top_kategori}}

_Dari Catatan Keuangan Keluarga_`;

/** List of variable names that can be used in templates (for the editor UI). */
export const TEMPLATE_VARIABLES: Array<{ name: string; label: string; example: string }> = [
  { name: "bulan", label: "Bulan Laporan", example: "Oktober 2026" },
  { name: "nama_keluarga", label: "Nama Keluarga", example: "Keluarga Budi" },
  { name: "saldo", label: "Total Saldo", example: "Rp 50.062.000" },
  { name: "pemasukan", label: "Pemasukan Bulan Ini", example: "Rp 20.500.000" },
  { name: "pengeluaran", label: "Pengeluaran Bulan Ini", example: "Rp 2.838.000" },
  { name: "arus_kas", label: "Arus Kas Bersih", example: "Rp 17.662.000" },
  { name: "top_kategori", label: "Top 3 Kategori Pengeluaran", example: "• Belanja: Rp1.85jt (65%)" },
  { name: "tagihan_belum", label: "Tagihan Belum Dibayar", example: "3 tagihan · Rp 1.250.000" },
  { name: "utang", label: "Total Utang Aktif", example: "Rp 7.200.000" },
  { name: "piutang", label: "Total Piutang Aktif", example: "Rp 3.500.000" },
  { name: "tabungan", label: "Total Tabungan", example: "Rp 47.750.000" },
];

/**
 * Build a wa.me URL for sending a message to a phone number.
 * @param phone Phone number in international format without "+" (e.g. "6281234567890")
 * @param text Message body (will be URL-encoded)
 */
export function buildWhatsAppUrl(phone: string, text: string): string {
  const normalized = phone.replace(/[^\d]/g, "");
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${normalized}?text=${encoded}`;
}

/**
 * Build a wa.me URL without a specific recipient (lets user pick contact in WhatsApp).
 */
export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Compute the next run datetime for a scheduled report.
 * Returns ISO string (UTC).
 */
export function computeNextRun(
  frequency: "monthly" | "weekly",
  dayOfWeek: number,
  hour: number,
  minute: number,
  from: Date = new Date(),
): string {
  const next = new Date(from);
  next.setSeconds(0, 0);

  if (frequency === "monthly") {
    // dayOfWeek is day of month (1-28)
    const dayOfMonth = Math.max(1, Math.min(28, dayOfWeek));
    next.setHours(hour, minute, 0, 0);
    // If today is past the target day, move to next month
    if (next.getDate() > dayOfMonth || (next.getDate() === dayOfMonth && (next.getHours() > hour || (next.getHours() === hour && next.getMinutes() > minute)))) {
      next.setMonth(next.getMonth() + 1);
    }
    next.setDate(dayOfMonth);
  } else {
    // weekly: dayOfWeek 0=Min..6=Sab
    const targetDay = Math.max(0, Math.min(6, dayOfWeek));
    next.setHours(hour, minute, 0, 0);
    const currentDay = next.getDay();
    let daysUntil = (targetDay - currentDay + 7) % 7;
    // If today is target day but time already passed, go to next week
    if (daysUntil === 0 && from.getTime() > next.getTime()) {
      daysUntil = 7;
    }
    next.setDate(next.getDate() + daysUntil);
  }

  return next.toISOString();
}

/** Format a phone number for display: 62812... → +62 812-... */
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("62")) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 6)}-${digits.slice(6, 10)}-${digits.slice(10)}`;
  }
  return phone;
}
