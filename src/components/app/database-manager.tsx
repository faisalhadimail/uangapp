"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Database,
  Download,
  Upload,
  Trash2,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  FileJson,
  HardDrive,
  Table,
  ShieldAlert,
  Eye,
  X,
} from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TableStats {
  users: number;
  sessions: number;
  categories: number;
  accounts: number;
  transactions: number;
  budgets: number;
  savings: number;
  bills: number;
  paidBills: number;
  debts: number;
  whatsAppTemplates: number;
  whatsAppRecipients: number;
  scheduledReports: number;
  scheduledReportLogs: number;
  familyMembers: number;
  notifications: number;
  financialInsights: number;
  financialTargets: number;
  backupRecords: number;
  receiptScans: number;
}

interface DbStats {
  tables: TableStats;
  totalRecords: number;
  tableCount: number;
  lastActivity: string | null;
}

const TABLE_LABELS: Record<keyof TableStats, string> = {
  users: "Users",
  sessions: "Sessions",
  categories: "Categories",
  accounts: "Accounts",
  transactions: "Transactions",
  budgets: "Budgets",
  savings: "Savings",
  bills: "Bills",
  paidBills: "Paid Bills",
  debts: "Debts",
  whatsAppTemplates: "WhatsApp Templates",
  whatsAppRecipients: "Recipients",
  scheduledReports: "Schedules",
  scheduledReportLogs: "Schedule Logs",
  familyMembers: "Family Members",
  notifications: "Notifications",
  financialInsights: "Insights",
  financialTargets: "Targets",
  backupRecords: "Backups",
  receiptScans: "Receipt Scans",
};

export function DatabaseManager({ onRefresh }: { onRefresh?: () => void }) {
  const [stats, setStats] = useState<DbStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreData, setRestoreData] = useState("");
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [keepUsers, setKeepUsers] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/database/stats");
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // ---- Backup ----
  async function handleBackup() {
    setBackupLoading(true);
    try {
      const res = await fetch("/api/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", note: "Manual backup" }),
      });
      if (!res.ok) throw new Error("Gagal membuat backup");
      const data = await res.json();

      // Trigger download
      const blob = new Blob([JSON.stringify(data.downloadData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.downloadFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Backup berhasil dibuat",
        description: `${data.backup.recordCount} record · ${(data.backup.sizeBytes / 1024).toFixed(1)} KB`,
      });
      loadStats();
      onRefresh?.();
    } catch (err) {
      toast({
        title: "Gagal membuat backup",
        description: err instanceof Error ? err.message : "Coba lagi.",
        variant: "destructive",
      });
    } finally {
      setBackupLoading(false);
    }
  }

  // ---- Restore ----
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRestoreData(text);
      setRestoreOpen(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleRestore() {
    if (!restoreData.trim()) {
      toast({ title: "Data backup kosong", variant: "destructive" });
      return;
    }
    setRestoreLoading(true);
    try {
      const data = JSON.parse(restoreData);
      const res = await fetch("/api/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", data }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Gagal restore");
      }
      const result = await res.json();
      toast({
        title: "Restore berhasil!",
        description: "Database telah dipulihkan dari backup.",
      });
      setRestoreOpen(false);
      setRestoreData("");
      loadStats();
      onRefresh?.();
      // Reload page to refresh all data
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast({
        title: "Gagal restore",
        description: "Format JSON tidak valid atau data rusak.",
        variant: "destructive",
      });
    } finally {
      setRestoreLoading(false);
    }
  }

  // ---- Clear/Delete database ----
  async function handleClear() {
    if (clearConfirmText !== "HAPUS") {
      toast({ title: "Ketik 'HAPUS' untuk konfirmasi", variant: "destructive" });
      return;
    }
    setClearLoading(true);
    try {
      const res = await fetch("/api/database/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true, keepUsers }),
      });
      if (!res.ok) throw new Error("Gagal menghapus");
      const data = await res.json();
      toast({
        title: "Database dikosongkan",
        description: `${data.totalDeleted} record dihapus.`,
      });
      setClearOpen(false);
      setClearConfirmText("");
      loadStats();
      onRefresh?.();
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast({
        title: "Gagal mengosongkan database",
        description: err instanceof Error ? err.message : "Coba lagi.",
        variant: "destructive",
      });
    } finally {
      setClearLoading(false);
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h2 className="flex items-center gap-1.5 text-lg font-bold">
          <Database className="size-5 text-primary" /> Database
        </h2>
        <p className="text-sm text-muted-foreground">Backup, restore, dan kelola data</p>
      </div>

      {/* Stats Card */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-primary/80 p-4 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/80">Total Records</p>
              <p className="text-2xl font-bold">
                {loading ? "..." : stats?.totalRecords.toLocaleString("id-ID")}
              </p>
            </div>
            <HardDrive className="size-8 text-white/70" />
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-white/80">
            <span>{stats?.tableCount ?? 20} tabel</span>
            {stats?.lastActivity && (
              <span>
                · Aktivitas:{" "}
                {new Date(stats.lastActivity).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* 3 Main Actions */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Backup */}
        <button onClick={handleBackup} disabled={backupLoading} className="text-left">
          <Card className="border-0 shadow-sm transition-all hover:shadow-md active:scale-[0.98] h-full">
            <CardContent className="flex flex-col items-center gap-1.5 p-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                {backupLoading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Download className="size-5" />
                )}
              </div>
              <p className="text-xs font-semibold">Backup</p>
              <p className="text-[10px] text-muted-foreground text-center">Ekspor JSON</p>
            </CardContent>
          </Card>
        </button>

        {/* Restore */}
        <button onClick={() => fileInputRef.current?.click()} className="text-left">
          <Card className="border-0 shadow-sm transition-all hover:shadow-md active:scale-[0.98] h-full">
            <CardContent className="flex flex-col items-center gap-1.5 p-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Upload className="size-5" />
              </div>
              <p className="text-xs font-semibold">Restore</p>
              <p className="text-[10px] text-muted-foreground text-center">Impor JSON</p>
            </CardContent>
          </Card>
        </button>

        {/* Delete */}
        <button onClick={() => setClearOpen(true)} className="text-left">
          <Card className="border-0 shadow-sm transition-all hover:shadow-md active:scale-[0.98] h-full">
            <CardContent className="flex flex-col items-center gap-1.5 p-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <Trash2 className="size-5" />
              </div>
              <p className="text-xs font-semibold">Hapus</p>
              <p className="text-[10px] text-muted-foreground text-center">Kosongkan DB</p>
            </CardContent>
          </Card>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Table Breakdown */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Table className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Detail per Tabel</h3>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-6 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {stats &&
                Object.entries(stats.tables).map(([key, count]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg bg-secondary px-3 py-1.5"
                  >
                    <span className="text-[11px] text-muted-foreground">
                      {TABLE_LABELS[key as keyof TableStats] ?? key}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-bold",
                        count > 0 ? "text-foreground" : "text-muted-foreground/50",
                      )}
                    >
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restore Sheet */}
      <Sheet open={restoreOpen} onOpenChange={setRestoreOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] p-0 sm:max-w-md sm:mx-auto sm:rounded-t-2xl sm:rounded-b-2xl sm:mb-6 sm:border">
          <SheetHeader className="px-5 pt-5 pb-3">
            <SheetTitle className="flex items-center gap-2">
              <Upload className="size-5 text-amber-500" /> Konfirmasi Restore
            </SheetTitle>
            <SheetDescription className="sr-only">
              Restore database dari file backup JSON.
            </SheetDescription>
          </SheetHeader>

          <div className="px-5 pb-4 space-y-4 overflow-y-auto thin-scrollbar" style={{ maxHeight: "50vh" }}>
            <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 p-3">
              <AlertTriangle className="size-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-xs font-semibold text-amber-800">Peringatan!</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700">
                  Restore akan <strong>menghapus semua data saat ini</strong> dan menggantinya
                  dengan data dari file backup. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold">Preview data (first 500 chars):</p>
              <div className="rounded-2xl bg-secondary p-3">
                <pre className="max-h-32 overflow-auto thin-scrollbar whitespace-pre-wrap break-words font-mono text-[10px] text-muted-foreground">
                  {restoreData.slice(0, 500)}
                  {restoreData.length > 500 ? "..." : ""}
                </pre>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Total: {(restoreData.length / 1024).toFixed(1)} KB
              </p>
            </div>

            <Button
              onClick={handleRestore}
              disabled={restoreLoading}
              className="w-full h-12 rounded-2xl bg-amber-500 text-white hover:bg-amber-600"
            >
              {restoreLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Merestore...
                </>
              ) : (
                "Restore Sekarang"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Clear/Delete AlertDialog */}
      <AlertDialog open={clearOpen} onOpenChange={(o) => { setClearOpen(o); if (!o) setClearConfirmText(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <ShieldAlert className="size-5" /> Hapus Semua Data?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan <strong>menghapus permanen</strong> semua data dari database
              ({stats?.totalRecords.toLocaleString("id-ID")} record).
              <br />
              <br />
              Pastikan Anda sudah membuat backup sebelum melanjutkan.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 px-1">
            <label className="flex items-center gap-2.5 rounded-2xl bg-secondary p-3">
              <input
                type="checkbox"
                checked={keepUsers}
                onChange={(e) => setKeepUsers(e.target.checked)}
                className="size-4 rounded border-border accent-primary"
              />
              <div>
                <p className="text-xs font-semibold">Pertahankan akun user</p>
                <p className="text-[11px] text-muted-foreground">
                  Tetap login setelah database dikosongkan
                </p>
              </div>
            </label>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-text" className="text-xs">
                Ketik <strong className="text-rose-600">HAPUS</strong> untuk konfirmasi
              </Label>
              <Input
                id="confirm-text"
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                placeholder="HAPUS"
                className="h-11 rounded-2xl text-center font-bold tracking-widest uppercase"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClear}
              disabled={clearLoading || clearConfirmText !== "HAPUS"}
              className="bg-destructive text-white hover:bg-destructive/90 disabled:opacity-40"
            >
              {clearLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" /> Hapus Permanen
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
