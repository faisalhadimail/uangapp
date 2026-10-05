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
  Plus,
  Trash2,
  Loader2,
  PiggyBank,
  ShieldCheck,
  ArrowDownToLine,
  ArrowUpFromLine,
  Target,
  Calendar,
} from "lucide-react";
import {
  formatRupiah,
  formatRupiahShort,
  formatDateShort,
  parseDate,
} from "@/lib/format";
import { COLOR_CHOICES, ICON_CHOICES, CategoryIcon } from "./icon-map";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Saving, SavingType } from "./types";

interface SavingsProps {
  savings: Saving[];
  loading: boolean;
  onRefresh: () => void;
}

export function Savings({ savings, loading, onRefresh }: SavingsProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [manageSaving, setManageSaving] = useState<Saving | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const totalCurrent = savings.reduce((s, sv) => s + sv.currentAmount, 0);
  const totalTarget = savings.reduce((s, sv) => s + sv.targetAmount, 0);
  const totalPercentage = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;
  const emergencyFund = savings.find((s) => s.type === "emergency");
  const goalCount = savings.filter((s) => s.type === "goal").length;

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/savings?id=${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast({ title: "Tabungan dihapus" });
      onRefresh();
    } catch (err) {
      toast({
        title: "Gagal menghapus",
        description: err instanceof Error ? err.message : "Coba lagi nanti.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 pb-4">
        <Skeleton className="h-32 rounded-3xl" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Tabungan</h2>
          <p className="text-sm text-muted-foreground">
            {goalCount} target · {emergencyFund ? "1 dana darurat" : "tanpa dana darurat"}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)} className="text-primary">
          <Plus className="size-4" /> Tambah
        </Button>
      </div>

      {/* Hero: Total savings */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-5 text-white shadow-lg shadow-emerald-500/20">
        <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-white/10" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white/80">Total Tabungan Terkumpul</p>
            <PiggyBank className="size-5 text-white/80" />
          </div>
          <p className="mt-1 text-3xl font-bold tracking-tight">{formatRupiah(totalCurrent)}</p>
          <p className="mt-0.5 text-xs text-white/80">
            dari target {formatRupiah(totalTarget)} · {totalPercentage}% tercapai
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${Math.min(100, totalPercentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* List */}
      {savings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <PiggyBank className="size-6" />
            </div>
            <p className="text-sm font-medium">Belum ada tabungan</p>
            <p className="text-xs text-muted-foreground">
              Tetapkan target tabungan atau dana darurat untuk masa depan.
            </p>
            <Button onClick={() => setAddOpen(true)} size="sm" className="mt-1 rounded-xl">
              <Plus className="size-4" /> Buat Tabungan Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {savings.map((s) => (
            <SavingCard
              key={s.id}
              saving={s}
              onManage={() => setManageSaving(s)}
              onDelete={() => setDeleteId(s.id)}
            />
          ))}
        </div>
      )}

      {/* Add sheet */}
      <SavingFormSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => {
          onRefresh();
          setAddOpen(false);
        }}
      />

      {/* Manage (add funds / withdraw) sheet */}
      <ManageSavingSheet
        open={manageSaving !== null}
        saving={manageSaving}
        onOpenChange={(o) => !o && setManageSaving(null)}
        onSuccess={() => {
          onRefresh();
          setManageSaving(null);
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus tabungan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Catatan tabungan akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
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

function SavingCard({
  saving,
  onManage,
  onDelete,
}: {
  saving: Saving;
  onManage: () => void;
  onDelete: () => void;
}) {
  const percentage =
    saving.targetAmount > 0
      ? Math.min(100, Math.round((saving.currentAmount / saving.targetAmount) * 100))
      : 0;
  const remaining = saving.targetAmount - saving.currentAmount;
  const isComplete = saving.currentAmount >= saving.targetAmount;
  const isEmergency = saving.type === "emergency";

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-11 rounded-xl">
            <AvatarFallback
              className="rounded-xl"
              style={{ backgroundColor: `${saving.color}22`, color: saving.color }}
            >
              <CategoryIcon name={saving.icon} className="size-5" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold">{saving.name}</p>
              {isEmergency && (
                <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-rose-600">
                  Darurat
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {saving.targetDate
                ? `Target ${formatDateShort(saving.targetDate)}`
                : `${formatRupiahShort(saving.targetAmount)} target`}
            </p>
          </div>
          <button
            onClick={onDelete}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
            aria-label="Hapus tabungan"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-bold">{formatRupiah(saving.currentAmount)}</span>
            <span className="text-muted-foreground">dari {formatRupiah(saving.targetAmount)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isComplete ? "bg-emerald-500" : "bg-primary",
              )}
              style={{ width: `${percentage}%`, backgroundColor: !isComplete ? saving.color : undefined }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className={cn("font-medium", isComplete ? "text-emerald-600" : "text-muted-foreground")}>
              {isComplete ? "Target tercapai!" : `Sisa ${formatRupiah(remaining)}`}
            </span>
            <span className="text-muted-foreground">{percentage}%</span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            onClick={onManage}
            variant="outline"
            size="sm"
            className="h-9 rounded-xl text-xs"
          >
            <ArrowDownToLine className="size-3.5" /> Tambah Dana
          </Button>
          <Button
            onClick={onManage}
            variant="ghost"
            size="sm"
            className="h-9 rounded-xl text-xs text-muted-foreground"
          >
            <ArrowUpFromLine className="size-3.5" /> Tarik
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SavingFormSheet({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<SavingType>("goal");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const [icon, setIcon] = useState("PiggyBank");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setName("");
      setType("goal");
      setTargetAmount("");
      setCurrentAmount("");
      setTargetDate("");
      setColor(COLOR_CHOICES[Math.floor(Math.random() * 8)]);
      setIcon("PiggyBank");
    }
  }, [open]);

  const parsedTarget = Number(targetAmount.replace(/[^\d]/g, ""));
  const parsedCurrent = Number(currentAmount.replace(/[^\d]/g, ""));

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
      const res = await fetch("/api/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          targetAmount: parsedTarget,
          currentAmount: parsedCurrent,
          targetDate: targetDate || null,
          color,
          icon,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Gagal membuat tabungan");
      }
      toast({ title: "Tabungan ditambahkan", description: name.trim() });
      onSuccess();
    } catch (err) {
      toast({
        title: "Gagal menyimpan",
        description: err instanceof Error ? err.message : "Coba lagi nanti.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] p-0 sm:max-w-md sm:mx-auto sm:rounded-t-2xl sm:rounded-b-2xl sm:mb-6 sm:border">
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle>Buat Tabungan Baru</SheetTitle>
          <SheetDescription className="sr-only">
            Tetapkan target tabungan atau dana darurat.
          </SheetDescription>
        </SheetHeader>

        <div className="px-5 pb-4 space-y-5 overflow-y-auto thin-scrollbar" style={{ maxHeight: "60vh" }}>
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
            <button
              type="button"
              onClick={() => {
                setType("goal");
                setIcon("PiggyBank");
              }}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium transition-all",
                type === "goal" ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              <Target className="size-4" /> Target
            </button>
            <button
              type="button"
              onClick={() => {
                setType("emergency");
                setIcon("ShieldCheck");
                setColor("#ef4444");
              }}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium transition-all",
                type === "emergency" ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              <ShieldCheck className="size-4" /> Dana Darurat
            </button>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="sav-name">Nama Tabungan</Label>
            <Input
              id="sav-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === "emergency" ? "Contoh: Dana Darurat Keluarga" : "Contoh: Liburan Akhir Tahun"}
              className="h-11 rounded-2xl"
            />
          </div>

          {/* Target amount */}
          <div className="space-y-2">
            <Label htmlFor="sav-target">Target Jumlah</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-medium text-muted-foreground">Rp</span>
              <Input
                id="sav-target"
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

          {/* Current amount (optional) */}
          <div className="space-y-2">
            <Label htmlFor="sav-current">Saldo Awal (opsional)</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-medium text-muted-foreground">Rp</span>
              <Input
                id="sav-current"
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

          {/* Target date (optional) */}
          {type === "goal" && (
            <div className="space-y-2">
              <Label htmlFor="sav-date">Target Tanggal (opsional)</Label>
              <Input
                id="sav-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="h-11 rounded-2xl"
              />
            </div>
          )}

          {/* Color & Icon (only for goal type) */}
          {type === "goal" && (
            <>
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

              <div className="space-y-2">
                <Label>Ikon</Label>
                <div className="grid grid-cols-6 gap-2">
                  {ICON_CHOICES.filter((ic) => ["PiggyBank", "Target", "Plane", "Car", "GraduationCap", "Home", "ShieldCheck", "Coins", "Gift", "TrendingUp", "HeartPulse", "Briefcase"].includes(ic.name)).map((ic) => (
                    <button
                      key={ic.name}
                      type="button"
                      onClick={() => setIcon(ic.name)}
                      title={ic.label}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-xl transition-all",
                        icon === ic.name
                          ? "bg-accent text-accent-foreground ring-1 ring-primary/40"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      <CategoryIcon name={ic.name} className="size-5" />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <SheetFooter className="border-t bg-card px-5 py-3">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-12 w-full rounded-2xl text-base font-semibold"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Menyimpan...
              </>
            ) : (
              "Simpan Tabungan"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ManageSavingSheet({
  open,
  saving,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  saving: Saving | null;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) setAmount("");
  }, [open]);

  const parsedAmount = Number(amount.replace(/[^\d]/g, ""));
  const formattedAmount = parsedAmount ? formatRupiah(parsedAmount) : "";

  const addFunds = useCallback(async () => {
    if (!saving || !parsedAmount || parsedAmount <= 0) return;
    setSubmitting(true);
    try {
      const newCurrent = saving.currentAmount + parsedAmount;
      const res = await fetch("/api/savings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: saving.id, currentAmount: newCurrent }),
      });
      if (!res.ok) throw new Error("Gagal menambah dana");
      toast({ title: "Dana ditambahkan", description: formatRupiah(parsedAmount) });
      onSuccess();
    } catch (err) {
      toast({
        title: "Gagal menyimpan",
        description: err instanceof Error ? err.message : "Coba lagi nanti.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }, [saving, parsedAmount, onSuccess, toast]);

  const withdrawFunds = useCallback(async () => {
    if (!saving || !parsedAmount || parsedAmount <= 0) return;
    if (parsedAmount > saving.currentAmount) {
      toast({
        title: "Jumlah melebihi saldo",
        description: `Saldo tabungan hanya ${formatRupiah(saving.currentAmount)}`,
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const newCurrent = saving.currentAmount - parsedAmount;
      const res = await fetch("/api/savings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: saving.id, currentAmount: newCurrent }),
      });
      if (!res.ok) throw new Error("Gagal menarik dana");
      toast({ title: "Dana ditarik", description: formatRupiah(parsedAmount) });
      onSuccess();
    } catch (err) {
      toast({
        title: "Gagal menyimpan",
        description: err instanceof Error ? err.message : "Coba lagi nanti.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }, [saving, parsedAmount, onSuccess, toast]);

  if (!saving) return null;
  const newBalanceAdd = saving.currentAmount + parsedAmount;
  const newBalanceWithdraw = saving.currentAmount - parsedAmount;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] p-0 sm:max-w-md sm:mx-auto sm:rounded-t-2xl sm:rounded-b-2xl sm:mb-6 sm:border">
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle>{saving.name}</SheetTitle>
          <SheetDescription className="sr-only">Tambah atau tarik dana tabungan.</SheetDescription>
        </SheetHeader>

        <div className="px-5 pb-4 space-y-5">
          {/* Current balance */}
          <div className="rounded-2xl bg-secondary p-4 text-center">
            <p className="text-xs text-muted-foreground">Saldo Saat Ini</p>
            <p className="text-2xl font-bold">{formatRupiah(saving.currentAmount)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              dari target {formatRupiah(saving.targetAmount)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sav-manage-amount">Jumlah</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-medium text-muted-foreground">Rp</span>
              <Input
                id="sav-manage-amount"
                inputMode="numeric"
                value={formattedAmount}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^\d]/g, "");
                  setAmount(digits);
                }}
                placeholder="0"
                className="h-14 rounded-2xl pl-11 text-xl font-bold"
              />
            </div>
            {parsedAmount > 0 && (
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg bg-emerald-50 px-2 py-1 text-center text-emerald-700">
                  + Dana: {formatRupiah(newBalanceAdd)}
                </div>
                <div className="rounded-lg bg-rose-50 px-2 py-1 text-center text-rose-700">
                  − Tarik: {formatRupiah(Math.max(0, newBalanceWithdraw))}
                </div>
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="border-t bg-card px-5 py-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={withdrawFunds}
              disabled={submitting || !parsedAmount}
              variant="outline"
              className="h-12 rounded-2xl font-semibold"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <ArrowUpFromLine className="size-4" /> Tarik Dana
                </>
              )}
            </Button>
            <Button
              onClick={addFunds}
              disabled={submitting || !parsedAmount}
              className="h-12 rounded-2xl font-semibold"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <ArrowDownToLine className="size-4" /> Tambah Dana
                </>
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
