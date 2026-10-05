"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Home as HomeIcon,
  Receipt,
  BarChart3,
  Target,
  MoreHorizontal,
  Plus,
  Loader2,
  Wallet,
  Tag,
  Settings,
  PiggyBank,
  HandCoins,
  ChevronLeft,
  LogOut,
} from "lucide-react";
import { Dashboard } from "@/components/app/dashboard";
import { Transactions } from "@/components/app/transactions";
import { Reports } from "@/components/app/reports";
import { Categories } from "@/components/app/categories";
import { Budgets } from "@/components/app/budgets";
import { Savings } from "@/components/app/savings";
import { Bills } from "@/components/app/bills";
import { Debts } from "@/components/app/debts";
import { MoreMenu, type MoreView } from "@/components/app/more-menu";
import { WhatsAppHub } from "@/components/app/whatsapp-hub";
import { FamilySection } from "@/components/app/family-section";
import { NotificationsBell } from "@/components/app/notifications-bell";
import { NotificationsPage } from "@/components/app/notifications-page";
import { Tahap5Section } from "@/components/app/tahap5-section";
import { DatabaseManager } from "@/components/app/database-manager";
import { LoginScreen } from "@/components/app/login-screen";
import { AddTransactionSheet } from "@/components/app/add-transaction-sheet";
import { AddCategorySheet } from "@/components/app/add-category-sheet";
import { AddAccountSheet } from "@/components/app/add-account-sheet";
import { currentMonthKey, todayISO, monthLabel } from "@/lib/format";
import type {
  Category,
  AccountWithBalance,
  Transaction,
  Summary,
  Saving,
  BillWithStatus,
  Debt,
  BudgetWithSpent,
  FamilyMember,
} from "@/components/app/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Tab = "home" | "transactions" | "budgets" | "reports" | "more";

const NAV_ITEMS: { id: Tab; label: string; icon: typeof HomeIcon }[] = [
  { id: "home", label: "Beranda", icon: HomeIcon },
  { id: "transactions", label: "Transaksi", icon: Receipt },
  { id: "budgets", label: "Anggaran", icon: Target },
  { id: "reports", label: "Laporan", icon: BarChart3 },
  { id: "more", label: "Lainnya", icon: MoreHorizontal },
];

// Sub-views accessible from the "Lainnya" menu
type SubView = MoreView | null;

export default function Home() {
  // Auth state
  const [authUser, setAuthUser] = useState<{
    id: string;
    email: string;
    name: string;
    familyMemberId: string | null;
  } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [tab, setTab] = useState<Tab>("home");
  const [subView, setSubView] = useState<SubView>(null);
  const [monthKey, setMonthKey] = useState<string>(currentMonthKey());

  const [summary, setSummary] = useState<Summary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [savings, setSavings] = useState<Saving[]>([]);
  const [bills, setBills] = useState<BillWithStatus[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingTxns, setLoadingTxns] = useState(true);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingAccs, setLoadingAccs] = useState(true);
  const [loadingBudgets, setLoadingBudgets] = useState(true);
  const [loadingSavings, setLoadingSavings] = useState(true);
  const [loadingBills, setLoadingBills] = useState(true);
  const [loadingDebts, setLoadingDebts] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const [addTxnOpen, setAddTxnOpen] = useState(false);
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [addAccOpen, setAddAccOpen] = useState(false);
  const [defaultCatType, setDefaultCatType] = useState<"income" | "expense">("expense");

  const { toast } = useToast();

  // ---- Data loaders -------------------------------------------------------
  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const res = await fetch(`/api/summary?month=${monthKey}`);
      if (!res.ok) throw new Error("Gagal memuat ringkasan");
      const data = await res.json();
      setSummary(data as Summary);
      // Also sync budgets and bills (they come in summary for convenience)
      if (data.budgets) setBudgets(data.budgets);
      if (data.upcomingBills) {
        setBills(data.upcomingBills);
        setLoadingBills(false);
        setLoadingBudgets(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSummary(false);
    }
  }, [monthKey]);

  const loadTransactions = useCallback(async () => {
    setLoadingTxns(true);
    try {
      const res = await fetch(`/api/transactions?month=${monthKey}`);
      if (!res.ok) throw new Error("Gagal memuat transaksi");
      const data = await res.json();
      setTransactions(data.transactions as Transaction[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTxns(false);
    }
  }, [monthKey]);

  const loadCategories = useCallback(async () => {
    setLoadingCats(true);
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Gagal memuat kategori");
      const data = await res.json();
      setCategories(data.categories as Category[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCats(false);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    setLoadingAccs(true);
    try {
      const res = await fetch("/api/accounts");
      if (!res.ok) throw new Error("Gagal memuat rekening");
      const data = await res.json();
      setAccounts(data.accounts as AccountWithBalance[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAccs(false);
    }
  }, []);

  const loadSavings = useCallback(async () => {
    setLoadingSavings(true);
    try {
      const res = await fetch("/api/savings");
      if (!res.ok) throw new Error("Gagal memuat tabungan");
      const data = await res.json();
      setSavings(data.savings as Saving[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSavings(false);
    }
  }, []);

  const loadDebts = useCallback(async () => {
    setLoadingDebts(true);
    try {
      const res = await fetch("/api/debts");
      if (!res.ok) throw new Error("Gagal memuat utang & piutang");
      const data = await res.json();
      setDebts(data.debts as Debt[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDebts(false);
    }
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/family/members");
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      setMembers(data.members as FamilyMember[]);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadUnreadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?unreadOnly=true");
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      setUnreadNotifications(data.unreadCount as number);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([
      loadSummary(),
      loadTransactions(),
      loadCategories(),
      loadAccounts(),
      loadSavings(),
      loadDebts(),
      loadMembers(),
      loadUnreadNotifications(),
    ]);
  }, [loadSummary, loadTransactions, loadCategories, loadAccounts, loadSavings, loadDebts, loadMembers, loadUnreadNotifications]);

  // ---- Auth check: run first on mount -----------------------------------
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setAuthUser(data.user);
        } else {
          setAuthUser(null);
        }
      } catch {
        setAuthUser(null);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  // ---- First mount: seed if empty, then load (only when authenticated) ----
  useEffect(() => {
    if (!authUser) return;
    (async () => {
      // Try loading existing data first
      await Promise.all([loadCategories(), loadAccounts(), loadMembers()]);
      // If no categories yet, seed sample data
      if (categories.length === 0 && accounts.length === 0) {
        setSeeding(true);
        try {
          const res = await fetch("/api/seed", { method: "POST" });
          const data = await res.json();
          if (data.seeded) {
            toast({
              title: "Selamat datang di Tahap 5!",
              description:
                "Aplikasi lengkap: anggaran, tabungan, tagihan, utang, WhatsApp, multi-anggota, notifikasi, analisis keuangan, target, backup & scan struk.",
            });
          }
        } catch (err) {
          console.error(err);
        } finally {
          setSeeding(false);
        }
      }
      await Promise.all([
        loadSummary(),
        loadTransactions(),
        loadSavings(),
        loadDebts(),
        loadMembers(),
        loadUnreadNotifications(),
      ]);
    })();
  }, [authUser]);

  // ---- Reload on month change ---------------------------------------------
  useEffect(() => {
    if (!authUser) return;
    loadSummary();
    loadTransactions();
  }, [monthKey, loadSummary, loadTransactions, authUser]);

  // ---- Logout handler -----------------------------------------------------
  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setAuthUser(null);
      // Reset all data state
      setSummary(null);
      setTransactions([]);
      setCategories([]);
      setAccounts([]);
      setBudgets([]);
      setSavings([]);
      setBills([]);
      setDebts([]);
      setMembers([]);
      setUnreadNotifications(0);
      setTab("home");
      setSubView(null);
      toast({ title: "Berhasil logout", description: "Sampai jumpa lagi!" });
    } catch (err) {
      console.error(err);
      toast({ title: "Gagal logout", variant: "destructive" });
    }
  }

  // ---- Auth gating: show login screen if not authenticated ----------------
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Memuat...</p>
      </div>
    );
  }

  if (!authUser) {
    return <LoginScreen onSuccess={(user) => setAuthUser(user)} />;
  }

  // ---- Handlers -----------------------------------------------------------
  function handleAddTransaction() {
    setAddTxnOpen(true);
  }

  function handleAddCategory(type: "income" | "expense") {
    setDefaultCatType(type);
    setAddCatOpen(true);
  }

  function refreshAll() {
    loadAll();
  }

  function handleTabChange(newTab: Tab) {
    setTab(newTab);
    setSubView(null); // reset sub-view when changing main tab
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleSubViewNavigate(view: MoreView) {
    setSubView(view);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleNotificationAction(actionUrl: string | null) {
    if (!actionUrl) return;
    // Parse action URL — format: "tab" or "more:subview" or "more:notifications"
    if (actionUrl.startsWith("more:")) {
      const sub = actionUrl.slice(5) as MoreView;
      // Map: bill → bills, debt → debts, whatsapp → whatsapp, notifications → notifications
      const mapped = sub === "bill" ? "bills" : sub === "debt" ? "debts" : sub;
      setTab("more");
      setSubView(mapped as MoreView);
    } else if (["home", "transactions", "budgets", "reports", "more"].includes(actionUrl)) {
      setTab(actionUrl as Tab);
      setSubView(null);
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    // Refresh notifications after navigation
    loadUnreadNotifications();
  }

  // Header title based on current view
  const headerSubtitle = (() => {
    if (tab === "reports") return monthLabel(monthKey);
    if (tab === "more" && subView) {
      const map: Record<MoreView, string> = {
        whatsapp: "WhatsApp",
        family: "Keluarga",
        notifications: "Notifikasi",
        tahap5: "Fitur Lanjutan",
        database: "Database",
        savings: "Tabungan",
        bills: "Tagihan",
        debts: "Utang & Piutang",
        categories: "Kategori",
        accounts: "Rekening",
        settings: "Pengaturan",
      };
      return map[subView];
    }
    return "Hari ini";
  })();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            {subView && tab === "more" ? (
              <button
                onClick={() => setSubView(null)}
                className="shrink-0 rounded-lg p-1 -ml-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Kembali"
              >
                <ChevronLeft className="size-5" />
              </button>
            ) : (
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
                <Wallet className="size-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight truncate">
                {subView && tab === "more" ? headerSubtitle : "Keuangan Keluarga"}
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight truncate">
                {subView && tab === "more" ? "Lainnya" : headerSubtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <NotificationsBell onAction={handleNotificationAction} />
            <Button
              onClick={handleAddTransaction}
              size="icon"
              className="rounded-xl shadow-sm shrink-0"
              aria-label="Tambah transaksi"
            >
              <Plus className="size-5" />
            </Button>
            <Button
              onClick={handleLogout}
              size="icon"
              variant="ghost"
              className="rounded-xl shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 mx-auto w-full max-w-md px-4 py-4 pb-28">
        {seeding ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Menyiapkan data contoh...</p>
          </div>
        ) : (
          <>
            {/* Sub-view (when navigating from Lainnya) */}
            {tab === "more" && subView === "whatsapp" && (
              <WhatsAppHub onRefresh={loadSummary} />
            )}
            {tab === "more" && subView === "family" && (
              <FamilySection onRefresh={loadMembers} />
            )}
            {tab === "more" && subView === "notifications" && (
              <NotificationsPage onAction={handleNotificationAction} />
            )}
            {tab === "more" && subView === "tahap5" && (
              <Tahap5Section />
            )}
            {tab === "more" && subView === "database" && (
              <DatabaseManager onRefresh={loadSummary} />
            )}
            {tab === "more" && subView === "savings" && (
              <Savings
                savings={savings}
                loading={loadingSavings}
                onRefresh={loadSavings}
              />
            )}
            {tab === "more" && subView === "bills" && (
              <Bills
                bills={bills}
                loading={loadingBills}
                monthKey={monthKey}
                onRefresh={loadSummary}
              />
            )}
            {tab === "more" && subView === "debts" && (
              <Debts debts={debts} loading={loadingDebts} onRefresh={loadDebts} />
            )}
            {tab === "more" && subView === "categories" && (
              <Categories
                categories={categories}
                loading={loadingCats}
                summary={summary}
                monthKey={monthKey}
                onAddCategory={handleAddCategory}
              />
            )}
            {tab === "more" && subView === "accounts" && (
              <SettingsPanel
                accounts={accounts}
                loadingAccs={loadingAccs}
                onAddAccount={() => setAddAccOpen(true)}
                onRefresh={refreshAll}
              />
            )}
            {tab === "more" && subView === "settings" && (
              <SettingsPanel
                accounts={accounts}
                loadingAccs={loadingAccs}
                onAddAccount={() => setAddAccOpen(true)}
                onRefresh={refreshAll}
              />
            )}

            {/* Main tab content */}
            {tab === "home" && (
              <Dashboard
                summary={summary}
                loading={loadingSummary}
                onAddTransaction={handleAddTransaction}
                onNavigateTransactions={() => handleTabChange("transactions")}
                onNavigateReports={() => handleTabChange("reports")}
                onNavigateBudgets={() => handleTabChange("budgets")}
                onNavigateBills={() => {
                  handleTabChange("more");
                  setSubView("bills");
                }}
                onNavigateSavings={() => {
                  handleTabChange("more");
                  setSubView("savings");
                }}
              />
            )}

            {tab === "transactions" && (
              <Transactions
                transactions={transactions}
                loading={loadingTxns}
                monthKey={monthKey}
                onAddTransaction={handleAddTransaction}
                onRefresh={refreshAll}
              />
            )}

            {tab === "budgets" && (
              <Budgets
                budgets={budgets}
                loading={loadingSummary}
                monthKey={monthKey}
                categories={categories}
                onRefresh={loadSummary}
              />
            )}

            {tab === "reports" && (
              <Reports
                summary={summary}
                loading={loadingSummary}
                monthKey={monthKey}
                onMonthChange={setMonthKey}
              />
            )}

            {/* Lainnya main view */}
            {tab === "more" && !subView && (
              <MoreMenu
                summary={summary}
                unreadNotifications={unreadNotifications}
                memberCount={members.length}
                onNavigate={handleSubViewNavigate}
              />
            )}
          </>
        )}
      </main>

      {/* Bottom navigation */}
      <nav className="sticky bottom-0 z-20 border-t border-border/60 bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-md grid-cols-5 px-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2.5 transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
                {active && (
                  <span className="absolute -top-px h-0.5 w-8 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Sheets */}
      <AddTransactionSheet
        open={addTxnOpen}
        onOpenChange={setAddTxnOpen}
        categories={categories}
        accounts={accounts}
        members={members}
        currentMemberId={members.find((m) => m.isCurrentUser)?.id}
        onSuccess={refreshAll}
      />
      <AddCategorySheet
        open={addCatOpen}
        onOpenChange={setAddCatOpen}
        defaultType={defaultCatType}
        onSuccess={loadCategories}
      />
      <AddAccountSheet
        open={addAccOpen}
        onOpenChange={setAddAccOpen}
        onSuccess={refreshAll}
      />
    </div>
  );
}

// --- Settings panel (used by "Lainnya" → Rekening/Pengaturan) --------------
function SettingsPanel({
  accounts,
  loadingAccs,
  onAddAccount,
  onRefresh,
}: {
  accounts: AccountWithBalance[];
  loadingAccs: boolean;
  onAddAccount: () => void;
  onRefresh: () => void;
}) {
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h2 className="text-lg font-bold">Rekening</h2>
        <p className="text-sm text-muted-foreground">Kelola bank, tunai, dan e-wallet.</p>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Daftar Rekening</h3>
          <Button variant="ghost" size="sm" onClick={onAddAccount} className="text-primary">
            <Plus className="size-4" /> Tambah
          </Button>
        </div>

        {loadingAccs ? (
          <>
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </>
        ) : accounts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Belum ada rekening. Tambahkan bank, dompet tunai, atau e-wallet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-br from-teal-500 to-emerald-500 p-4 text-white">
                <p className="text-xs text-white/80">Total Saldo Semua Rekening</p>
                <p className="mt-0.5 text-2xl font-bold">
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(totalBalance)}
                </p>
              </div>
            </Card>
            {accounts.map((acc) => (
              <AccountRow key={acc.id} account={acc} />
            ))}
          </div>
        )}
      </div>

      {/* About */}
      <Card className="border-0 shadow-sm bg-secondary/50">
        <CardContent className="space-y-2 p-4 text-xs text-muted-foreground">
          <p className="text-sm font-medium text-foreground">Tentang Aplikasi</p>
          <p>
            <strong>Catatan Keuangan Keluarga</strong> — versi Tahap 5. Aplikasi keuangan keluarga
            lengkap dengan analisis keuangan cerdas, perencanaan target, backup/restore, scan struk,
            multi-anggota dengan hak akses, notifikasi cerdas, dan integrasi WhatsApp.
          </p>
          <p className="pt-1">Versi 5.0 · Tahap 5 — Versi Final</p>
        </CardContent>
      </Card>
    </div>
  );
}

function AccountRow({ account }: { account: AccountWithBalance }) {
  const typeLabel =
    account.type === "bank" ? "Bank" : account.type === "cash" ? "Tunai" : "E-Wallet";

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
          <Wallet className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{account.name}</p>
          <p className="text-xs text-muted-foreground">{typeLabel}</p>
        </div>
        <p className="text-sm font-bold">
          {new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(account.balance)}
        </p>
      </CardContent>
    </Card>
  );
}
