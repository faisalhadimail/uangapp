// Helper functions for formatting Indonesian Rupiah currency and dates.

/**
 * Format number as Indonesian Rupiah.
 * @example formatRupiah(1500000) → "Rp1.500.000"
 */
export function formatRupiah(amount: number, withSymbol = true): string {
  const formatted = new Intl.NumberFormat("id-ID", {
    style: withSymbol ? "currency" : "decimal",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return formatted;
}

/**
 * Compact rupiah format for charts/labels.
 * @example formatRupiahShort(1500000) → "Rp1,5jt"
 * @example formatRupiahShort(25000) → "Rp25rb"
 */
export function formatRupiahShort(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}Rp${(abs / 1_000_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `${sign}Rp${(abs / 1_000_000).toFixed(1).replace(".0", "")}jt`;
  if (abs >= 1_000) return `${sign}Rp${(abs / 1_000).toFixed(0)}rb`;
  return `${sign}Rp${abs}`;
}

const MONTHS_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const MONTHS_ID_FULL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Parse YYYY-MM-DD string into a Date in local time (avoid UTC off-by-one). */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Format YYYY-MM-DD string to "12 Sep 2025". */
export function formatDateShort(iso: string): string {
  const d = parseDate(iso);
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format YYYY-MM-DD string to "Jumat, 12 September 2025". */
export function formatDateLong(iso: string): string {
  const d = parseDate(iso);
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return `${days[d.getDay()]}, ${d.getDate()} ${MONTHS_ID_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

/** Get current YYYY-MM string for the month of `date`. */
export function currentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Get human label like "September 2025" from YYYY-MM. */
export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return `${MONTHS_ID_FULL[(m ?? 1) - 1]} ${y}`;
}

/** Build YYYY-MM-DD for today in local time. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
