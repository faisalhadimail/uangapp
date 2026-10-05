"use client";

import { useState, useEffect } from "react";
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
  Plus,
  Trash2,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  User,
  Calendar,
  HandCoins,
  AlertTriangle,
} from "lucide-react";
import { formatRupiah, formatDateShort, todayISO } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Debt, DebtType } from "./types";

interface DebtsProps {
  debts: Debt[];
  loading: boolean;
  onRefresh: () => void;
}

export function Debts({ debts, loading, onRefresh }: DebtsProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid">("unpaid");
  const [typeFilter, setTypeFilter] = useState<"all" | DebtType>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  // Apply filters
  const filtered = debts.filter((d) => {
    if (filter === "unpaid" && d.isPaid) return false;
    if (filter === "paid" && !d.isPaid) return false;
    if (typeFilter !== "all" && d.type !== typeFilter) return false;
    return true;
  });

  // Sort: unpaid first, then due date asc
  const sorted = [...filtered].sort((a, b) => {
    if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
    if (a.dueDate && b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  const totalDebt = debts
    .filter((d) => d.type === "debt" && !d.isPaid)
    .reduce((s, d) => s + d.amount, 0);
  const totalReceivable = debts
    .filter((d) => d.type === "receivable" && !d.isPaid)
    .reduce((s, d) => s + d.amount, 0);

  async function togglePaid(debt: Debt) {
    try {
      const res = await fetch("/api/debts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: debt.id, isPaid: !debt.isPaid }),
      });
      if (!res.ok) throw new Error("Gagal memperbarui status");
      toast({
        title: debt.isPaid ? "Dibatalkan lunas" : "Ditandai lunas",
        description: `${debt.personName} · ${formatRupiah(debt.amount)}`,
      });
      onRefresh();
    } catch (err) {
      toast({
        title: "Gagal memperbarui",
        description: err instanceof Error ? err.message : "Coba lagi nanti.",
        variant: "destructive",
      });
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/debts?id=${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast({ title: "Catatan dihapus" });
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
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-9 rounded-full" />
          <Skeleton className="h-9 rounded-full" />
        </div>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Utang & Piutang</h2>
          <p className="text-sm text-muted-foreground">Kewajiban dan pembayaran</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)} className="text-primary">
          <Plus className="size-4" /> Tambah
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 to-red-500 p-4 text-white shadow-lg shadow-rose-500/20">
          <div className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center gap-1.5">
              <ArrowDownLeft className="size-4" />
              <p className="text-xs font-medium text-white/80">Utang Belum Lunas</p>
            </div>
            <p className="mt-1.5 text-xl font-bold">{formatRupiah(totalDebt)}</p>
            <p className="mt-0.5 text-[11px] text-white/80">
              {debts.filter((d) => d.type === "debt" && !d.isPaid).length} catatan
            </p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 p-4 text-white shadow-lg shadow-emerald-500/20">
          <div className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="size-4" />
              <p className="text-xs font-medium text-white/80">Piutang Belum Diterima</p>
            </div>
            <p className="mt-1.5 text-xl font-bold">{formatRupiah(totalReceivable)}</p>
            <p className="mt-0.5 text-[11px] text-white/80">
              {debts.filter((d) => d.type === "receivable" && !d.isPaid).length} catatan
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          {(["all", "unpaid", "paid"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all",
                filter === f
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "all" ? "Semua" : f === "unpaid" ? "Belum Lunas" : "Lunas"}
            </button>
          ))}
          <button
            onClick={() => setTypeFilter(typeFilter === "debt" ? "all" : "debt")}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all",
              typeFilter === "debt"
                ? "bg-rose-500 text-white"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            Utang
          </button>
          <button
            onClick={() => setTypeFilter(typeFilter === "receivable" ? "all" : "receivable")}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all",
              typeFilter === "receivable"
                ? "bg-emerald-500 text-white"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            Piutang
          </button>
        </div>
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <HandCoins className="size-6" />
            </div>
            <p className="text-sm font-medium">Tidak ada catatan</p>
            <p className="text-xs text-muted-foreground">
              {filter === "all" ? "Catat utang atau piutang pertama Anda." : "Tidak ada catatan dengan filter ini."}
            </p>
            <Button onClick={() => setAddOpen(true)} size="sm" className="mt-1 rounded-xl">
              <Plus className="size-4" /> Tambah Catatan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((d) => (
            <DebtCard
              key={d.id}
              debt={d}
              onTogglePaid={() => togglePaid(d)}
              onDelete={() => setDeleteId(d.id)}
            />
          ))}
        </div>
      )}

      <DebtFormSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => {
          onRefresh();
          setAddOpen(false);
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus catatan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Catatan utang/piutang akan dihapus permanen.
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

function DebtCard({
  debt,
  onTogglePaid,
  onDelete,
}: {
  debt: Debt;
  onTogglePaid: () => void;
  onDelete: () => void;
}) {
  const isDebt = debt.type === "debt";
  const today = todayISO();
  const isOverdue = !debt.isPaid && debt.dueDate !== null && debt.dueDate < today;
  const accent = isDebt ? "rose" : "emerald";
  const bgColor = isDebt ? "#ef4444" : "#10b981";

  return (
    <Card className={cn("border-0 shadow-sm", debt.isPaid && "opacity-70")}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={onTogglePaid}
            className="shrink-0 mt-0.5"
            aria-label={debt.isPaid ? "Tandai belum lunas" : "Tandai lunas"}
          >
            {debt.isPaid ? (
              <CheckCircle2 className="size-6 text-emerald-500" />
            ) : (
              <Circle className={cn("size-6", isOverdue ? "text-rose-500" : "text-muted-foreground/40")} />
            )}
          </button>
          <Avatar className="size-10 rounded-xl">
            <AvatarFallback
              className="rounded-xl"
              style={{ backgroundColor: `${bgColor}22`, color: bgColor }}
            >
              <User className="size-5" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={cn("truncate text-sm font-semibold", debt.isPaid && "line-through text-muted-foreground")}>
                  {debt.personName}
                </p>
                <p className="truncate text-xs text-muted-foreground">{debt.description}</p>
              </div>
              <div className="text-right">
                <p className={cn("text-sm font-bold", debt.isPaid && "text-muted-foreground")}>
                  {formatRupiah(debt.amount)}
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-medium",
                  isDebt ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700",
                )}
              >
                {isDebt ? "Utang" : "Piutang"}
              </span>
              {debt.dueDate && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="size-3" />
                  Jatuh tempo {formatDateShort(debt.dueDate)}
                </span>
              )}
              {isOverdue && (
                <span className="flex items-center gap-1 font-medium text-rose-500">
                  <AlertTriangle className="size-3" /> Terlambat
                </span>
              )}
              {debt.isPaid && debt.paidDate && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="size-3" /> Lunas {formatDateShort(debt.paidDate)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onDelete}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
            aria-label="Hapus catatan"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function DebtFormSheet({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}) {
  const [type, setType] = useState<DebtType>("debt");
  const [personName, setPersonName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setType("debt");
      setPersonName("");
      setAmount("");
      setDescription("");
      setDueDate("");
    }
  }, [open]);

  const parsedAmount = Number(amount.replace(/[^\d]/g, ""));
  const formattedAmount = parsedAmount ? formatRupiah(parsedAmount) : "";

  async function handleSubmit() {
    if (!personName.trim()) {
      toast({ title: "Nama pihak wajib diisi", variant: "destructive" });
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      toast({ title: "Jumlah tidak valid", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "Keterangan wajib diisi", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          personName: personName.trim(),
          amount: parsedAmount,
          description: description.trim(),
          dueDate: dueDate || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Gagal membuat catatan");
      }
      toast({
        title: type === "debt" ? "Utang dicatat" : "Piutang dicatat",
        description: `${personName.trim()} · ${formatRupiah(parsedAmount)}`,
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] p-0 sm:max-w-md sm:mx-auto sm:rounded-t-2xl sm:rounded-b-2xl sm:mb-6 sm:border">
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle>Tambah Utang / Piutang</SheetTitle>
          <SheetDescription className="sr-only">Catat kewajiban atau piutang.</SheetDescription>
        </SheetHeader>

        <div className="px-5 pb-4 space-y-5 overflow-y-auto thin-scrollbar" style={{ maxHeight: "60vh" }}>
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
            <button
              type="button"
              onClick={() => setType("debt")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium transition-all",
                type === "debt" ? "bg-background shadow-sm text-rose-600" : "text-muted-foreground",
              )}
            >
              <ArrowDownLeft className="size-4" /> Utang
            </button>
            <button
              type="button"
              onClick={() => setType("receivable")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium transition-all",
                type === "receivable" ? "bg-background shadow-sm text-emerald-600" : "text-muted-foreground",
              )}
            >
              <ArrowUpRight className="size-4" /> Piutang
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="debt-person">Nama Pihak</Label>
            <Input
              id="debt-person"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder={type === "debt" ? "Contoh: Budi (Teman Kantor)" : "Contoh: Andi (Adik)"}
              className="h-11 rounded-2xl"
            />
            <p className="text-[11px] text-muted-foreground">
              {type === "debt" ? "Pihak yang kita berhutang kepadanya." : "Pihak yang berhutang kepada kita."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="debt-amount">Jumlah</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-medium text-muted-foreground">Rp</span>
              <Input
                id="debt-amount"
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="debt-desc">Keterangan</Label>
            <Textarea
              id="debt-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Pinjaman untuk acara kantor"
              className="min-h-[64px] resize-none rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="debt-date">Jatuh Tempo (opsional)</Label>
            <Input
              id="debt-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-11 rounded-2xl"
            />
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
            ) : type === "debt" ? (
              "Simpan Utang"
            ) : (
              "Simpan Piutang"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
