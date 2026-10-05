"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  Trash2,
  Loader2,
  Inbox,
} from "lucide-react";
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
import { formatRupiah, formatDateLong } from "@/lib/format";
import type { Transaction, TransactionType } from "./types";
import { CategoryIcon } from "./icon-map";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TransactionsProps {
  transactions: Transaction[];
  loading: boolean;
  monthKey: string;
  onAddTransaction: () => void;
  onRefresh: () => void;
}

type FilterType = "all" | TransactionType;

const FILTERS: { value: FilterType; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "income", label: "Masuk" },
  { value: "expense", label: "Keluar" },
  { value: "transfer", label: "Transfer" },
];

export function Transactions({
  transactions,
  loading,
  monthKey,
  onAddTransaction,
  onRefresh,
}: TransactionsProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const filtered = useMemo(
    () => (filter === "all" ? transactions : transactions.filter((t) => t.type === filter)),
    [transactions, filter],
  );

  // Group by date (YYYY-MM-DD)
  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date)!.push(t);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  // Per-day totals
  const dailyTotals = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const [date, txns] of grouped) {
      const totals = { income: 0, expense: 0 };
      for (const t of txns) {
        if (t.type === "income") totals.income += t.amount;
        else if (t.type === "expense") totals.expense += t.amount;
      }
      map.set(date, totals);
    }
    return map;
  }, [grouped]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/transactions?id=${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast({ title: "Transaksi dihapus" });
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
    return <TransactionsSkeleton />;
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all",
              filter === f.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <Inbox className="size-6" />
            </div>
            <p className="text-sm font-medium">Belum ada transaksi</p>
            <p className="text-xs text-muted-foreground">Catat transaksi pertama Anda bulan ini.</p>
            <Button onClick={onAddTransaction} size="sm" className="mt-1 rounded-xl">
              <Plus className="size-4" /> Tambah Transaksi
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, txns]) => {
            const totals = dailyTotals.get(date)!;
            return (
              <div key={date} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {formatDateLong(date)}
                  </h3>
                  <div className="text-[11px] font-medium">
                    {totals.income > 0 && (
                      <span className="text-emerald-600">+{formatRupiah(totals.income)}</span>
                    )}
                    {totals.income > 0 && totals.expense > 0 && (
                      <span className="mx-1 text-muted-foreground">·</span>
                    )}
                    {totals.expense > 0 && (
                      <span className="text-rose-500">-{formatRupiah(totals.expense)}</span>
                    )}
                  </div>
                </div>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-0">
                    <ul className="divide-y">
                      {txns.map((t) => (
                        <TransactionListItem
                          key={t.id}
                          transaction={t}
                          onDelete={() => setDeleteId(t.id)}
                        />
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus transaksi ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Transaksi akan dihapus secara permanen.
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

      {/* Sticky FAB */}
      <Button
        onClick={onAddTransaction}
        className="fixed bottom-24 right-4 z-30 size-14 rounded-full shadow-lg sm:right-[calc(50%-9rem)]"
        size="icon"
        aria-label="Tambah transaksi"
      >
        <Plus className="size-6" />
      </Button>
    </div>
  );
}

function TransactionListItem({
  transaction: t,
  onDelete,
}: {
  transaction: Transaction;
  onDelete: () => void;
}) {
  const isIn = t.type === "income";
  const isTransfer = t.type === "transfer";
  const sign = isIn ? "+" : isTransfer ? "" : "-";
  const color = isIn ? "text-emerald-600" : isTransfer ? "text-sky-600" : "text-rose-500";

  const iconName = t.category?.icon ?? "Plus";
  const iconColor = t.category?.color ?? "#0ea5e9";

  return (
    <li className="group flex items-center gap-3 px-4 py-3">
      <Avatar className="size-10 rounded-xl">
        <AvatarFallback className="rounded-xl" style={{ backgroundColor: `${iconColor}22`, color: iconColor }}>
          <CategoryIcon name={iconName} className="size-5" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{t.description}</p>
        <p className="truncate text-xs text-muted-foreground">
          {t.category?.name ?? "Transfer"} · {t.account.name}
          {isTransfer && t.toAccount ? ` → ${t.toAccount.name}` : ""}
          {t.member && <span className="ml-1">· oleh {t.member.name}</span>}
        </p>
      </div>
      <p className={cn("shrink-0 text-sm font-bold", color)}>
        {sign}
        {formatRupiah(t.amount)}
      </p>
      <button
        onClick={onDelete}
        className="ml-1 shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        aria-label="Hapus transaksi"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

function TransactionsSkeleton() {
  return (
    <div className="space-y-4 pb-4">
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
