"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import { Plus, Trash2, Loader2, Target, Pencil, AlertTriangle } from "lucide-react";
import { formatRupiah, formatRupiahShort, monthLabel } from "@/lib/format";
import { CategoryIcon } from "./icon-map";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { BudgetWithSpent, Category } from "./types";

interface BudgetsProps {
  budgets: BudgetWithSpent[];
  loading: boolean;
  monthKey: string;
  categories: Category[];
  onRefresh: () => void;
}

export function Budgets({ budgets, loading, monthKey, categories, onRefresh }: BudgetsProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editBudget, setEditBudget] = useState<BudgetWithSpent | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  // Expense categories not yet budgeted
  const availableCategories = useMemo(
    () =>
      categories.filter(
        (c) => c.type === "expense" && !budgets.some((b) => b.categoryId === c.id),
      ),
    [categories, budgets],
  );

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallPercentage = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
  const overBudgetCount = budgets.filter((b) => b.spent > b.amount).length;

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/budgets?id=${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast({ title: "Anggaran dihapus" });
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
        <Skeleton className="h-20 rounded-2xl" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h2 className="text-lg font-bold">Anggaran</h2>
        <p className="text-sm text-muted-foreground">Batas pengeluaran bulan {monthLabel(monthKey)}</p>
      </div>

      {/* Overall progress hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-5 text-white shadow-lg shadow-violet-500/20">
        <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-white/10" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white/80">Total Anggaran vs Realisasi</p>
            <Target className="size-5 text-white/80" />
          </div>
          <p className="mt-1 text-3xl font-bold tracking-tight">{formatRupiah(totalSpent)}</p>
          <p className="mt-0.5 text-xs text-white/80">
            dari {formatRupiah(totalBudget)} · sisa {formatRupiah(totalRemaining)}
          </p>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-[11px] text-white/80">
              <span>Terpakai {overallPercentage}%</span>
              <span>{overallPercentage}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${overallPercentage}%` }}
              />
            </div>
            {overBudgetCount > 0 && (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-white/15 px-2 py-1 text-[11px] font-medium backdrop-blur-sm">
                <AlertTriangle className="size-3" />
                <span>{overBudgetCount} kategori melebihi batas</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick add CTA */}
      <Button
        onClick={() => setAddOpen(true)}
        variant="outline"
        className="w-full h-12 rounded-2xl border-dashed"
        disabled={availableCategories.length === 0}
      >
        <Plus className="size-4" />
        {availableCategories.length === 0
          ? "Semua kategori sudah dianggarkan"
          : "Tambah Anggaran Kategori"}
      </Button>

      {/* Budget list */}
      {budgets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <Target className="size-6" />
            </div>
            <p className="text-sm font-medium">Belum ada anggaran</p>
            <p className="text-xs text-muted-foreground">
              Tetapkan batas pengeluaran per kategori untuk mengontrol pengeluaran.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {budgets.map((b) => (
            <BudgetCard
              key={b.id}
              budget={b}
              onEdit={() => setEditBudget(b)}
              onDelete={() => setDeleteId(b.id)}
            />
          ))}
        </div>
      )}

      {/* Add / edit sheet */}
      <BudgetFormSheet
        open={addOpen || editBudget !== null}
        onOpenChange={(o) => {
          if (!o) {
            setAddOpen(false);
            setEditBudget(null);
          }
        }}
        categories={availableCategories.length > 0 || editBudget ? categories.filter((c) => c.type === "expense") : []}
        editBudget={editBudget}
        onSuccess={() => {
          onRefresh();
          setAddOpen(false);
          setEditBudget(null);
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus anggaran ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Anggaran untuk kategori ini akan dihapus. Transaksi yang sudah dicatat tidak terpengaruh.
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

function BudgetCard({
  budget,
  onEdit,
  onDelete,
}: {
  budget: BudgetWithSpent;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { amount, spent, remaining, percentage, category } = budget;
  const isOver = spent > amount;
  const isWarning = !isOver && percentage >= 80;

  const barColor = isOver ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500";
  const statusText = isOver
    ? `Terlampaui ${formatRupiahShort(spent - amount)}`
    : `Sisa ${formatRupiah(remaining)}`;
  const statusColor = isOver ? "text-rose-500" : isWarning ? "text-amber-600" : "text-emerald-600";

  return (
    <Card className="group border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 rounded-xl">
            <AvatarFallback
              className="rounded-xl"
              style={{ backgroundColor: `${category.color}22`, color: category.color }}
            >
              <CategoryIcon name={category.icon} className="size-5" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{category.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatRupiah(spent)} dari {formatRupiah(amount)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={onEdit}
              className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
              aria-label="Ubah anggaran"
            >
              <Pencil className="size-4" />
            </button>
            <button
              onClick={onDelete}
              className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
              aria-label="Hapus anggaran"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className={statusColor}>{statusText}</span>
            <span className="font-medium text-muted-foreground">{percentage}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn("h-full rounded-full transition-all", barColor)}
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BudgetFormSheet({
  open,
  onOpenChange,
  categories,
  editBudget,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  editBudget: BudgetWithSpent | null;
  onSuccess: () => void;
}) {
  const [categoryId, setCategoryId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      if (editBudget) {
        setCategoryId(editBudget.categoryId);
        setAmount(String(editBudget.amount));
      } else {
        setCategoryId(categories[0]?.id ?? "");
        setAmount("");
      }
    }
  }, [open, editBudget, categories]);

  const parsedAmount = Number(amount.replace(/[^\d]/g, ""));
  const formattedAmount = parsedAmount ? formatRupiah(parsedAmount) : "";

  async function handleSubmit() {
    if (!categoryId) {
      toast({ title: "Kategori wajib dipilih", variant: "destructive" });
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      toast({ title: "Jumlah tidak valid", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, amount: parsedAmount }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Gagal menyimpan anggaran");
      }
      toast({
        title: editBudget ? "Anggaran diperbarui" : "Anggaran ditambahkan",
        description: formattedAmount,
      });
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

  // When editing, hide the category selector
  const visibleCategories = editBudget
    ? categories
    : categories.filter((c) => true); // already filtered by parent

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] p-0 sm:max-w-md sm:mx-auto sm:rounded-t-2xl sm:rounded-b-2xl sm:mb-6 sm:border">
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle>{editBudget ? "Ubah Anggaran" : "Tambah Anggaran"}</SheetTitle>
          <SheetDescription className="sr-only">
            Tetapkan batas pengeluaran bulanan untuk kategori.
          </SheetDescription>
        </SheetHeader>

        <div className="px-5 pb-4 space-y-5">
          {!editBudget && (
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {visibleCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="budget-amount">Batas Bulanan</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-medium text-muted-foreground">
                Rp
              </span>
              <Input
                id="budget-amount"
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
              <p className="text-xs text-muted-foreground">
                Setara {formatRupiahShort(parsedAmount)} per bulan
              </p>
            )}
          </div>
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
            ) : editBudget ? (
              "Simpan Perubahan"
            ) : (
              "Tambah Anggaran"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
