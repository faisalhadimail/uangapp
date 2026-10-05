"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Trophy,
  Target,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  Activity,
  Shield,
  GraduationCap,
  PiggyBank,
  CreditCard,
  Home,
  Check,
  ChevronRight,
  Download,
  Upload,
  FileText,
  ScanLine,
  Camera,
  X,
} from "lucide-react";
import { formatRupiah, formatRupiahShort, formatDateShort, monthLabel, currentMonthKey } from "@/lib/format";
import { COLOR_CHOICES, ICON_CHOICES, CategoryIcon } from "./icon-map";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type {
  FinancialInsight,
  FinancialTarget,
  TargetType,
  BackupRecord,
  ReceiptScan,
  HealthScore,
} from "./types";

// =========================================================================
// Main Tahap 5 Section — handles all 4 sub-views
// =========================================================================
type Tahap5View = "analisis" | "target" | "backup" | "scan";

interface Tahap5SectionProps {
  initialView?: Tahap5View;
}

export function Tahap5Section({ initialView = "analisis" }: Tahap5SectionProps) {
  const [view, setView] = useState<Tahap5View>(initialView);

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h2 className="text-lg font-bold">Fitur Lanjutan</h2>
        <p className="text-sm text-muted-foreground">Analisis, target, backup & scan struk</p>
      </div>

      {/* Sub-view tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {[
          { id: "analisis" as const, label: "Analisis", icon: Activity },
          { id: "target" as const, label: "Target", icon: Target },
          { id: "backup" as const, label: "Backup", icon: Download },
          { id: "scan" as const, label: "Scan Struk", icon: ScanLine },
        ].map((t) => {
          const Icon = t.icon;
          const active = view === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {view === "analisis" && <AnalisisView />}
      {view === "target" && <TargetView />}
      {view === "backup" && <BackupView />}
      {view === "scan" && <ScanView />}
    </div>
  );
}

// =========================================================================
// Analisis View — Health Score + Insights
// =========================================================================
const INSIGHT_ICONS: Record<string, typeof Sparkles> = {
  trend: TrendingUp,
  health: Activity,
  warning: AlertTriangle,
  tip: Lightbulb,
  milestone: Trophy,
};

function AnalisisView() {
  const [data, setData] = useState<{
    healthScore: HealthScore;
    insights: FinancialInsight[];
    summary: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/insights");
      if (!res.ok) throw new Error("Gagal");
      const d = await res.json();
      setData({
        healthScore: d.healthScore,
        insights: d.insights,
        summary: d.summary,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
    toast({ title: "Analisis diperbarui" });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  if (!data) return null;

  const { healthScore: hs, insights, summary } = data;

  return (
    <div className="space-y-4">
      {/* Health Score Hero */}
      <div
        className="relative overflow-hidden rounded-3xl p-5 text-white shadow-lg"
        style={{ background: `linear-gradient(135deg, ${hs.color}, ${hs.color}dd)` }}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-white/15" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 size-32 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white/85">Skor Kesehatan Keuangan</p>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-lg bg-white/15 p-1.5 text-white backdrop-blur-sm transition-all hover:bg-white/25 disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
            </button>
          </div>

          <div className="mt-3 flex items-end gap-3">
            <p className="text-5xl font-bold leading-none">{hs.score}</p>
            <p className="mb-1 text-lg font-medium text-white/85">/100</p>
          </div>
          <p className="mt-1 text-base font-bold">{hs.label}</p>

          {/* Progress ring visual */}
          <div className="mt-4">
            <div className="h-2.5 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${hs.score}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Health Factors */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Activity className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Faktor Penentu Skor</h3>
          </div>
          <ul className="space-y-2.5">
            {hs.factors.map((f, idx) => {
              const statusColor =
                f.status === "good" ? "#10b981" : f.status === "warning" ? "#f59e0b" : "#ef4444";
              const statusBg =
                f.status === "good" ? "bg-emerald-50" : f.status === "warning" ? "bg-amber-50" : "bg-rose-50";
              return (
                <li key={idx} className="flex items-start gap-2.5">
                  <div
                    className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full", statusBg)}
                    style={{ color: statusColor }}
                  >
                    {f.status === "good" ? (
                      <Check className="size-3.5" />
                    ) : (
                      <AlertTriangle className="size-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">{f.label}</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{f.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-secondary p-3">
          <p className="text-[10px] text-muted-foreground">Tingkat Tabungan</p>
          <p className="text-sm font-bold text-emerald-600">{summary.savingsRate}%</p>
        </div>
        <div className="rounded-2xl bg-secondary p-3">
          <p className="text-[10px] text-muted-foreground">Over Budget</p>
          <p className="text-sm font-bold text-rose-500">{summary.overBudgetCount}</p>
        </div>
        <div className="rounded-2xl bg-secondary p-3">
          <p className="text-[10px] text-muted-foreground">Tagihan Aktif</p>
          <p className="text-sm font-bold text-amber-600">{summary.unpaidBillsCount}</p>
        </div>
      </div>

      {/* Insights */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 px-1">
          <Sparkles className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Insight Otomatis</h3>
          <span className="text-xs text-muted-foreground">({insights.length})</span>
        </div>

        {insights.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Tidak ada insight khusus bulan ini. Semua baik-baik saja!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {insights.map((insight) => {
              const Icon = INSIGHT_ICONS[insight.type] ?? Sparkles;
              return (
                <Card key={insight.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${insight.color}22`, color: insight.color }}
                      >
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{insight.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {insight.description}
                        </p>
                        {insight.value !== null && insight.maxValue !== null && (
                          <div className="mt-2">
                            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, (insight.value / insight.maxValue) * 100)}%`,
                                  backgroundColor: insight.color,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// Target View — Financial Planning Targets
// =========================================================================
const TARGET_ICONS: Record<TargetType, typeof Target> = {
  debt_free: CreditCard,
  emergency_fund: Shield,
  retirement: PiggyBank,
  education: GraduationCap,
  home: Home,
  custom: Target,
};

const TARGET_LABELS: Record<TargetType, string> = {
  debt_free: "Bebas Utang",
  emergency_fund: "Dana Darurat",
  retirement: "Pensiun",
  education: "Pendidikan",
  home: "Rumah/KPR",
  custom: "Kustom",
};

function TargetView() {
  const [targets, setTargets] = useState<FinancialTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/targets");
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      setTargets(data.targets as FinancialTarget[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await fetch(`/api/targets?id=${deleteId}`, { method: "DELETE" });
      toast({ title: "Target dihapus" });
      load();
    } catch (err) {
      toast({ title: "Gagal menghapus", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  const totalTargetAmount = targets.reduce((s, t) => s + t.targetAmount, 0);
  const totalCurrentAmount = targets.reduce((s, t) => s + t.currentAmount, 0);
  const overallPercentage = totalTargetAmount > 0 ? Math.round((totalCurrentAmount / totalTargetAmount) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold">Target Finansial</h3>
          <p className="text-xs text-muted-foreground">{targets.length} target aktif</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="rounded-xl">
          <Plus className="size-4" /> Tambah
        </Button>
      </div>

      {/* Overall progress */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-4 text-primary-foreground shadow-lg">
        <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-white/15" />
        <div className="relative">
          <p className="text-xs text-white/80">Total Progres Semua Target</p>
          <p className="mt-1 text-2xl font-bold">{overallPercentage}%</p>
          <p className="text-xs text-white/80">
            {formatRupiah(totalCurrentAmount)} dari {formatRupiah(totalTargetAmount)}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${overallPercentage}%` }} />
          </div>
        </div>
      </div>

      {/* Targets list */}
      {targets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Target className="size-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">Belum ada target</p>
            <p className="text-xs text-muted-foreground">Tetapkan target finansial jangka panjang</p>
            <Button onClick={() => setAddOpen(true)} size="sm" className="mt-1 rounded-xl">
              <Plus className="size-4" /> Buat Target Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {targets.map((t) => (
            <TargetCard key={t.id} target={t} onDelete={() => setDeleteId(t.id)} />
          ))}
        </div>
      )}

      <TargetFormSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => {
          load();
          setAddOpen(false);
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus target ini?</AlertDialogTitle>
            <AlertDialogDescription>Target akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" /> Hapus
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TargetCard({ target, onDelete }: { target: FinancialTarget; onDelete: () => void }) {
  const Icon = TARGET_ICONS[target.type] ?? Target;
  const percentage = target.targetAmount > 0 ? Math.min(100, Math.round((target.currentAmount / target.targetAmount) * 100)) : 0;
  const remaining = target.targetAmount - target.currentAmount;
  const isComplete = target.currentAmount >= target.targetAmount;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="size-11 rounded-xl">
            <AvatarFallback
              className="rounded-xl"
              style={{ backgroundColor: `${target.color}22`, color: target.color }}
            >
              <Icon className="size-5" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold">{target.name}</p>
              <span
                className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                style={{ backgroundColor: `${target.color}22`, color: target.color }}
              >
                {TARGET_LABELS[target.type]}
              </span>
              {isComplete && (
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">
                  ✓ TERCAPAI
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {target.targetDate ? `Target ${formatDateShort(target.targetDate)}` : "Tanpa tanggal target"}
              {target.monthlyContribution ? ` · ${formatRupiahShort(target.monthlyContribution)}/bln` : ""}
            </p>
          </div>
          <button
            onClick={onDelete}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
            aria-label="Hapus"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-bold">{formatRupiah(target.currentAmount)}</span>
            <span className="text-muted-foreground">dari {formatRupiah(target.targetAmount)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn("h-full rounded-full transition-all", isComplete ? "bg-emerald-500" : "")}
              style={{ width: `${percentage}%`, backgroundColor: !isComplete ? target.color : undefined }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className={cn("font-medium", isComplete ? "text-emerald-600" : "text-muted-foreground")}>
              {isComplete ? "Target tercapai!" : `Sisa ${formatRupiah(remaining)}`}
            </span>
            <span className="text-muted-foreground">{percentage}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TargetFormSheet({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<TargetType>("custom");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const [icon, setIcon] = useState("Target");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setName("");
      setType("custom");
      setTargetAmount("");
      setCurrentAmount("");
      setTargetDate("");
      setMonthlyContribution("");
      setColor(COLOR_CHOICES[Math.floor(Math.random() * 8)]);
      setIcon("Target");
    }
  }, [open]);

  const parsedTarget = Number(targetAmount.replace(/[^\d]/g, ""));
  const parsedCurrent = Number(currentAmount.replace(/[^\d]/g, ""));
  const parsedMonthly = Number(monthlyContribution.replace(/[^\d]/g, ""));

  async function handleSubmit() {
    if (!name.trim()) {
      toast({ title: "Nama wajib diisi", variant: "destructive" });
      return;
    }
    if (!parsedTarget || parsedTarget <= 0) {
      toast({ title: "Target jumlah tidak valid", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          targetAmount: parsedTarget,
          currentAmount: parsedCurrent,
          targetDate: targetDate || null,
          monthlyContribution: parsedMonthly || null,
          color,
          icon,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Gagal membuat target");
      }
      toast({ title: "Target ditambahkan", description: name.trim() });
      onSuccess();
    } catch (err) {
      toast({
        title: "Gagal menyimpan",
        description: err instanceof Error ? err.message : "Coba lagi.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const typeOptions: { value: TargetType; label: string }[] = [
    { value: "debt_free", label: "Bebas Utang" },
    { value: "emergency_fund", label: "Dana Darurat" },
    { value: "retirement", label: "Pensiun" },
    { value: "education", label: "Pendidikan" },
    { value: "home", label: "Rumah/KPR" },
    { value: "custom", label: "Kustom" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] p-0 sm:max-w-md sm:mx-auto sm:rounded-t-2xl sm:rounded-b-2xl sm:mb-6 sm:border">
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle>Target Finansial Baru</SheetTitle>
          <SheetDescription className="sr-only">
            Tetapkan target finansial jangka panjang.
          </SheetDescription>
        </SheetHeader>

        <div className="px-5 pb-4 space-y-4 overflow-y-auto thin-scrollbar" style={{ maxHeight: "60vh" }}>
          <div className="space-y-2">
            <Label htmlFor="tgt-name">Nama Target</Label>
            <Input
              id="tgt-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Bebas Utang Kartu Kredit"
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipe Target</Label>
            <div className="grid grid-cols-3 gap-2">
              {typeOptions.map((t) => {
                const Icon = TARGET_ICONS[t.value];
                const active = type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      setType(t.value);
                      // Auto-set icon based on type
                      const iconMap: Record<TargetType, string> = {
                        debt_free: "CreditCard",
                        emergency_fund: "ShieldCheck",
                        retirement: "PiggyBank",
                        education: "GraduationCap",
                        home: "Home",
                        custom: "Target",
                      };
                      setIcon(iconMap[t.value]);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-2xl py-2.5 text-[11px] font-medium transition-all",
                      active ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-muted-foreground",
                    )}
                  >
                    <Icon className="size-5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tgt-target">Target Jumlah</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-medium text-muted-foreground">Rp</span>
              <Input
                id="tgt-target"
                inputMode="numeric"
                value={parsedTarget ? formatRupiah(parsedTarget) : ""}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^\d]/g, "");
                  setTargetAmount(digits);
                }}
                placeholder="0"
                className="h-14 rounded-2xl pl-11 text-xl font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tgt-current">Saldo Saat Ini (opsional)</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-medium text-muted-foreground">Rp</span>
              <Input
                id="tgt-current"
                inputMode="numeric"
                value={parsedCurrent ? formatRupiah(parsedCurrent) : ""}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^\d]/g, "");
                  setCurrentAmount(digits);
                }}
                placeholder="0"
                className="h-11 rounded-2xl pl-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tgt-date">Target Tanggal (opsional)</Label>
              <Input
                id="tgt-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="h-11 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tgt-monthly">Kontribusi/Bulan</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">Rp</span>
                <Input
                  id="tgt-monthly"
                  inputMode="numeric"
                  value={parsedMonthly ? formatRupiah(parsedMonthly) : ""}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^\d]/g, "");
                    setMonthlyContribution(digits);
                  }}
                  placeholder="0"
                  className="h-11 rounded-2xl pl-9 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Warna</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_CHOICES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-9 rounded-full transition-all hover:scale-110",
                    color === c && "ring-2 ring-offset-2 ring-offset-background ring-foreground/40",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Warna ${c}`}
                />
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="border-t bg-card px-5 py-3">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-12 w-full rounded-2xl font-semibold"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Menyimpan...
              </>
            ) : (
              "Tambah Target"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// =========================================================================
// Backup View — Export/Import JSON
// =========================================================================
function BackupView() {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoreText, setRestoreText] = useState("");
  const [showRestore, setShowRestore] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/backups");
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      setBackups(data.backups as BackupRecord[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreateBackup() {
    setCreating(true);
    try {
      const res = await fetch("/api/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });
      if (!res.ok) throw new Error("Gagal membuat backup");
      const data = await res.json();

      // Trigger download
      const blob = new Blob([JSON.stringify(data.downloadData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.downloadFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Backup dibuat",
        description: `${data.backup.recordCount} record · ${(data.backup.sizeBytes / 1024).toFixed(1)} KB`,
      });
      load();
    } catch (err) {
      toast({
        title: "Gagal membuat backup",
        description: err instanceof Error ? err.message : "Coba lagi.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleRestore() {
    if (!restoreText.trim()) {
      toast({ title: "Tempel data backup dulu", variant: "destructive" });
      return;
    }
    setRestoring(true);
    try {
      const data = JSON.parse(restoreText);
      const res = await fetch("/api/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", data }),
      });
      if (!res.ok) throw new Error("Gagal restore");
      const result = await res.json();
      toast({
        title: "Restore berhasil",
        description: `${JSON.stringify(result.restored)}`,
      });
      setShowRestore(false);
      setRestoreText("");
      // Reload page to refresh all data
      if (typeof window !== "undefined") {
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err) {
      toast({
        title: "Gagal restore",
        description: "Format JSON tidak valid atau data rusak.",
        variant: "destructive",
      });
    } finally {
      setRestoring(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await fetch(`/api/backups?id=${deleteId}`, { method: "DELETE" });
      toast({ title: "Riwayat backup dihapus" });
      load();
    } catch (err) {
      toast({ title: "Gagal menghapus", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRestoreText(text);
      setShowRestore(true);
    };
    reader.readAsText(file);
    e.target.value = ""; // reset
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold">Backup & Restore</h3>
        <p className="text-xs text-muted-foreground">Ekspor/impor data sebagai JSON</p>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={handleCreateBackup} disabled={creating} className="text-left">
          <Card className="border-0 shadow-sm transition-all hover:shadow-md active:scale-[0.98]">
            <CardContent className="flex flex-col items-center gap-2 p-4">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {creating ? <Loader2 className="size-5 animate-spin" /> : <Download className="size-5" />}
              </div>
              <p className="text-sm font-semibold">Buat Backup</p>
              <p className="text-[11px] text-center text-muted-foreground">Ekspor semua data ke JSON</p>
            </CardContent>
          </Card>
        </button>

        <label className="text-left cursor-pointer">
          <Card className="border-0 shadow-sm transition-all hover:shadow-md active:scale-[0.98]">
            <CardContent className="flex flex-col items-center gap-2 p-4">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <Upload className="size-5" />
              </div>
              <p className="text-sm font-semibold">Restore dari File</p>
              <p className="text-[11px] text-center text-muted-foreground">Impor backup JSON</p>
              <input
                type="file"
                accept="application/json,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </CardContent>
          </Card>
        </label>
      </div>

      {/* Restore text area */}
      {showRestore && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Konfirmasi Restore</p>
              <button
                onClick={() => {
                  setShowRestore(false);
                  setRestoreText("");
                }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>
            <Textarea
              value={restoreText.slice(0, 500) + (restoreText.length > 500 ? "..." : "")}
              readOnly
              className="min-h-[100px] resize-none rounded-2xl font-mono text-[10px]"
            />
            <p className="text-[11px] text-rose-500">
              ⚠️ Peringatan: Restore akan menghapus semua data saat ini dan menggantinya dengan data backup.
            </p>
            <Button
              onClick={handleRestore}
              disabled={restoring}
              className="w-full h-11 rounded-2xl bg-amber-500 hover:bg-amber-600"
            >
              {restoring ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Merestore...
                </>
              ) : (
                "Restore Sekarang"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Backup history */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-sm font-semibold">Riwayat Backup</h4>
          <span className="text-xs text-muted-foreground">{backups.length} backup</span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : backups.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <FileText className="size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">Belum ada backup</p>
              <p className="text-xs text-muted-foreground">Klik "Buat Backup" untuk membuat pertama</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <ul className="divide-y">
                {backups.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{b.filename}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(b.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                        {b.note ? ` · ${b.note}` : ""}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {b.recordCount} record · {(b.sizeBytes / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => setDeleteId(b.id)}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Hapus"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus riwayat backup?</AlertDialogTitle>
            <AlertDialogDescription>
              Hanya menghapus catatan riwayat, tidak menghapus file backup yang sudah diunduh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =========================================================================
// Scan View — Receipt Scanner (mock OCR)
// =========================================================================
function ScanView() {
  const [scans, setScans] = useState<ReceiptScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/receipts/scan");
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      setScans(data.scans as ReceiptScan[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleScan() {
    setScanning(true);
    try {
      const filename = `struk-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}.jpg`;
      const res = await fetch("/api/receipts/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      if (!res.ok) throw new Error("Gagal scan");
      const data = await res.json();
      setLastResult(data);
      toast({
        title: "Struk dipindai",
        description: `${data.detected.merchant} · ${formatRupiah(data.detected.totalAmount)}`,
      });
      load();
    } catch (err) {
      toast({
        title: "Gagal scan",
        description: err instanceof Error ? err.message : "Coba lagi.",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  }

  async function handleConfirmScan(scanId: string) {
    try {
      const res = await fetch("/api/receipts/scan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: scanId, status: "confirmed" }),
      });
      if (!res.ok) throw new Error("Gagal konfirmasi");
      toast({ title: "Scan dikonfirmasi", description: "Transaksi dapat dibuat manual dari hasil scan." });
      load();
      setLastResult(null);
    } catch (err) {
      toast({ title: "Gagal konfirmasi", variant: "destructive" });
    }
  }

  async function handleRejectScan(scanId: string) {
    try {
      const res = await fetch("/api/receipts/scan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: scanId, status: "rejected" }),
      });
      if (!res.ok) throw new Error("Gagal menolak");
      toast({ title: "Scan ditolak" });
      load();
      setLastResult(null);
    } catch (err) {
      toast({ title: "Gagal", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold">Scan Struk</h3>
        <p className="text-xs text-muted-foreground">Pindai struk untuk otomatis catat transaksi</p>
      </div>

      {/* Scan button */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 to-purple-500 p-5 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-white/15" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white/85">Pindai Struk Baru</p>
            <ScanLine className="size-5 text-white/80" />
          </div>
          <p className="mt-1 text-2xl font-bold">OCR Otomatis</p>
          <p className="mt-0.5 text-xs text-white/80">
            Deteksi merchant, total, & kategori otomatis
          </p>
          <Button
            onClick={handleScan}
            disabled={scanning}
            className="mt-4 w-full h-12 rounded-2xl bg-white text-violet-600 hover:bg-white/90 font-semibold shadow-sm"
          >
            {scanning ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Memindai...
              </>
            ) : (
              <>
                <Camera className="size-4" /> Mulai Scan
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Last scan result */}
      {lastResult && (
        <Card className="border-0 shadow-sm ring-2 ring-violet-300">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Hasil Scan Terbaru</p>
              <button
                onClick={() => setLastResult(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
              <div
                className="flex size-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${lastResult.detected.merchantColor}22`, color: lastResult.detected.merchantColor }}
              >
                <CategoryIcon name={lastResult.detected.merchantIcon} className="size-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">{lastResult.detected.merchant}</p>
                <p className="text-xs text-muted-foreground">
                  {lastResult.detected.categoryName} · {formatDateShort(lastResult.detected.date)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{formatRupiah(lastResult.detected.totalAmount)}</p>
                <p className="text-[10px] text-muted-foreground">
                  Confidence {Math.round(lastResult.detected.confidence * 100)}%
                </p>
              </div>
            </div>

            {/* Detected items */}
            {lastResult.detected.items.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Item Terdeteksi:</p>
                <ul className="space-y-1">
                  {lastResult.detected.items.map((item: any, idx: number) => (
                    <li key={idx} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{item.name} × {item.qty}</span>
                      <span className="font-medium">{formatRupiah(item.price)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRejectScan(lastResult.scan.id)}
                className="h-10 rounded-xl text-xs"
              >
                <X className="size-4" /> Tolak
              </Button>
              <Button
                size="sm"
                onClick={() => handleConfirmScan(lastResult.scan.id)}
                className="h-10 rounded-xl text-xs bg-violet-500 hover:bg-violet-600"
              >
                <Check className="size-4" /> Konfirmasi
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan history */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-sm font-semibold">Riwayat Scan</h4>
          <span className="text-xs text-muted-foreground">{scans.length} scan</span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : scans.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <ScanLine className="size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">Belum ada scan</p>
              <p className="text-xs text-muted-foreground">Klik "Mulai Scan" untuk memindai struk pertama</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <ul className="divide-y">
                {scans.slice(0, 10).map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <div
                      className={cn(
                        "flex size-9 items-center justify-center rounded-xl",
                        s.status === "confirmed"
                          ? "bg-emerald-100 text-emerald-600"
                          : s.status === "rejected"
                            ? "bg-rose-100 text-rose-500"
                            : "bg-amber-100 text-amber-600",
                      )}
                    >
                      {s.status === "confirmed" ? (
                        <Check className="size-4" />
                      ) : s.status === "rejected" ? (
                        <X className="size-4" />
                      ) : (
                        <ScanLine className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{s.merchant ?? "Tidak terdeteksi"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {s.totalAmount ? ` · ${formatRupiah(s.totalAmount)}` : ""}
                      </p>
                    </div>
                    {s.status === "pending" && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleRejectScan(s.id)}
                          className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-rose-50 hover:text-rose-500"
                          aria-label="Tolak"
                        >
                          <X className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleConfirmScan(s.id)}
                          className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-emerald-50 hover:text-emerald-600"
                          aria-label="Konfirmasi"
                        >
                          <Check className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Info card */}
      <Card className="border-0 shadow-sm bg-blue-50/50">
        <CardContent className="flex items-start gap-2 p-3.5">
          <AlertTriangle className="size-4 shrink-0 mt-0.5 text-blue-500" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Catatan:</strong> Scan struk menggunakan simulasi OCR untuk demo.
            Pada produksi, integrasikan dengan Google Vision API, AWS Textract, atau Tesseract.js untuk OCR nyata.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
