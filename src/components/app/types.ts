// Shared type definitions used by client components.

export type CategoryType = "income" | "expense";

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
}

export type AccountType = "bank" | "cash" | "ewallet";

export interface AccountWithBalance {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  balance: number;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
}

export type TransactionType = "income" | "expense" | "transfer";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  categoryId: string | null;
  category: Category | null;
  accountId: string;
  account: { id: string; name: string; type: AccountType };
  toAccountId: string | null;
  toAccount: { id: string; name: string; type: AccountType } | null;
  // Tahap 4: anggota yang mencatat
  memberId: string | null;
  member: FamilyMember | null;
  createdAt: string;
}

export interface CategoryAggregate {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
  percentage: number;
}

export interface DailyFlow {
  day: string;
  income: number;
  expense: number;
}

// ---- Tahap 2: Budget, Saving, Bill, Debt ----

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  category: Category;
}

/** Budget with current month's spending. Computed by /api/summary */
export interface BudgetWithSpent extends Budget {
  spent: number;
  remaining: number;
  percentage: number;
}

export type SavingType = "goal" | "emergency";

export interface Saving {
  id: string;
  name: string;
  type: SavingType;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  color: string;
  icon: string;
}

export type BillRecurrence = "monthly" | "weekly" | "once";

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  recurrence: BillRecurrence;
  color: string;
  icon: string;
  isActive: boolean;
  /** YYYY-MM of months already paid (from PaidBill records) */
  paidMonths?: string[];
}

/** Bill with paid status for the queried month. Computed by API. */
export interface BillWithStatus extends Bill {
  isPaid: boolean;
  isOverdue: boolean;
}

export type DebtType = "debt" | "receivable";

export interface Debt {
  id: string;
  type: DebtType;
  personName: string;
  amount: number;
  description: string;
  dueDate: string | null;
  isPaid: boolean;
  paidDate: string | null;
}

// ---- Summary (extended) ----

export interface Summary {
  month: string;
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  totalTransfer: number;
  netCashflow: number;
  prevIncome: number;
  prevExpense: number;
  expenseByCategory: CategoryAggregate[];
  incomeByCategory: CategoryAggregate[];
  dailyFlow: DailyFlow[];
  accountBalances: AccountWithBalance[];
  recentTransactions: Transaction[];
  // Tahap 2 fields
  budgets?: BudgetWithSpent[];
  totalBudget?: number;
  totalBudgetSpent?: number;
  upcomingBills?: BillWithStatus[];
  unpaidBillsCount?: number;
  unpaidBillsTotal?: number;
  totalDebt?: number;       // utang belum dibayar
  totalReceivable?: number; // piutang belum diterima
  totalSavings?: number;     // total dana tabungan terkumpul
  totalSavingsTarget?: number;
}

// ---- Tahap 3: WhatsApp ----

export type WhatsAppReportType = "monthly" | "weekly" | "custom";

export interface WhatsAppTemplate {
  id: string;
  name: string;
  body: string;
  reportType: WhatsAppReportType;
  isDefault: boolean;
}

export type RecipientRole = "spouse" | "self" | "family" | "other";

export interface WhatsAppRecipient {
  id: string;
  name: string;
  phone: string;
  role: RecipientRole;
  isActive: boolean;
}

export type ScheduleFrequency = "monthly" | "weekly";

export interface ScheduledReport {
  id: string;
  name: string;
  frequency: ScheduleFrequency;
  dayOfWeek: number;
  hour: number;
  minute: number;
  nextRunAt: string;
  isActive: boolean;
  templateId: string | null;
  template: WhatsAppTemplate | null;
  recipientIds: string[]; // parsed from comma-separated
  recipientCount: number;
}

export interface ScheduledReportLog {
  id: string;
  scheduledReportId: string;
  sentAt: string;
  status: "sent" | "failed" | "skipped";
  preview: string;
}

/** Variables that can be substituted in a template body. */
export interface TemplateVariables {
  bulan: string;
  nama_keluarga: string;
  saldo: string;
  pemasukan: string;
  pengeluaran: string;
  arus_kas: string;
  top_kategori: string;
  tagihan_belum: string;
  utang: string;
  piutang: string;
  tabungan: string;
}

// ---- Tahap 4: Family Members & Notifications ----

export type MemberRole = "admin" | "editor" | "viewer";

export interface FamilyMember {
  id: string;
  name: string;
  role: MemberRole;
  color: string;
  avatar: string;
  isActive: boolean;
  isCurrentUser: boolean;
  transactionCount?: number;
}

export type NotificationType =
  | "bill_due"
  | "debt_overdue"
  | "budget_over"
  | "schedule_due"
  | "info";

export type NotificationPriority = "low" | "normal" | "high";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  color: string;
  actionUrl: string | null;
  createdAt: string;
  readAt: string | null;
  priority: NotificationPriority;
  memberId: string | null;
}

/** Role permissions matrix */
export const ROLE_PERMISSIONS: Record<MemberRole, {
  label: string;
  description: string;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageMembers: boolean;
  canViewReports: boolean;
}> = {
  admin: {
    label: "Admin",
    description: "Akses penuh — tambah, edit, hapus, kelola anggota",
    canAdd: true,
    canEdit: true,
    canDelete: true,
    canManageMembers: true,
    canViewReports: true,
  },
  editor: {
    label: "Editor",
    description: "Tambah & edit transaksi, anggaran, tagihan",
    canAdd: true,
    canEdit: true,
    canDelete: false,
    canManageMembers: false,
    canViewReports: true,
  },
  viewer: {
    label: "Pengamat",
    description: "Lihat data saja, tidak bisa mengubah",
    canAdd: false,
    canEdit: false,
    canDelete: false,
    canManageMembers: false,
    canViewReports: true,
  },
};

// ---- Tahap 5: Insights, Targets, Backup, Receipt Scan ----

export type InsightType = "trend" | "health" | "warning" | "tip" | "milestone";

export interface FinancialInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  color: string;
  value: number | null;
  maxValue: number | null;
  month: string;
  createdAt: string;
  dismissedAt: string | null;
}

export type TargetType =
  | "debt_free"
  | "emergency_fund"
  | "retirement"
  | "education"
  | "home"
  | "custom";

export interface FinancialTarget {
  id: string;
  name: string;
  type: TargetType;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  monthlyContribution: number | null;
  color: string;
  icon: string;
  isActive: boolean;
}

export interface BackupRecord {
  id: string;
  createdAt: string;
  filename: string;
  sizeBytes: number;
  recordCount: number;
  trigger: "manual" | "auto";
  note: string | null;
}

export type ReceiptScanStatus = "pending" | "confirmed" | "rejected";

export interface ReceiptScan {
  id: string;
  createdAt: string;
  filename: string;
  merchant: string | null;
  totalAmount: number | null;
  date: string | null;
  suggestedCategory: string | null;
  status: ReceiptScanStatus;
  transactionId: string | null;
}

/** Health score breakdown for the dashboard widget. */
export interface HealthScore {
  score: number; // 0-100
  label: string;
  color: string;
  factors: Array<{
    label: string;
    status: "good" | "warning" | "bad";
    detail: string;
  }>;
}
