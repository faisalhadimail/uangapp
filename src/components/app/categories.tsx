"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Wallet } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import type { Category, CategoryType, Summary } from "./types";
import { CategoryIcon } from "./icon-map";
import { cn } from "@/lib/utils";

interface CategoriesProps {
  categories: Category[];
  loading: boolean;
  summary: Summary | null;
  monthKey: string;
  onAddCategory: (type: CategoryType) => void;
}

export function Categories({
  categories,
  loading,
  summary,
  monthKey: _monthKey,
  onAddCategory,
}: CategoriesProps) {
  const [activeType, setActiveType] = useState<CategoryType>("expense");

  // Build a quick lookup of total amount per category for current month
  const amountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    if (!summary) return map;
    const list = activeType === "expense" ? summary.expenseByCategory : summary.incomeByCategory;
    for (const c of list) map.set(c.categoryId, c.amount);
    return map;
  }, [summary, activeType]);

  const filtered = useMemo(
    () => categories.filter((c) => c.type === activeType),
    [categories, activeType],
  );

  const totalForType = useMemo(() => {
    if (!summary) return 0;
    return activeType === "expense" ? summary.totalExpense : summary.totalIncome;
  }, [summary, activeType]);

  if (loading) {
    return (
      <div className="space-y-4 pb-4">
        <Skeleton className="h-10 rounded-2xl" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Type selector */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveType(t)}
            className={cn(
              "rounded-xl py-2 text-sm font-medium transition-all",
              activeType === t ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "expense" ? "Pengeluaran" : "Pemasukan"}
          </button>
        ))}
      </div>

      {/* Summary header */}
      <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">
            Total {activeType === "expense" ? "Pengeluaran" : "Pemasukan"} Bulan Ini
          </p>
          <p className="text-xl font-bold text-primary">{formatRupiah(totalForType)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Kategori</p>
          <p className="text-xl font-bold">{filtered.length}</p>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <Wallet className="size-6" />
            </div>
            <p className="text-sm font-medium">Belum ada kategori</p>
            <p className="text-xs text-muted-foreground">
              Buat kategori pertama untuk {activeType === "expense" ? "pengeluaran" : "pemasukan"}.
            </p>
            <Button onClick={() => onAddCategory(activeType)} size="sm" className="mt-1 rounded-xl">
              <Plus className="size-4" /> Tambah Kategori
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <ul className="divide-y">
                {filtered.map((c) => {
                  const amount = amountByCategory.get(c.id) ?? 0;
                  const percentage = totalForType > 0 ? Math.round((amount / totalForType) * 100) : 0;
                  return (
                    <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar className="size-11 rounded-xl">
                        <AvatarFallback
                          className="rounded-xl"
                          style={{ backgroundColor: `${c.color}22`, color: c.color }}
                        >
                          <CategoryIcon name={c.icon} className="size-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {amount > 0 ? `${formatRupiah(amount)} · ${percentage}%` : "Belum ada transaksi"}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Button
            onClick={() => onAddCategory(activeType)}
            variant="outline"
            className="w-full h-12 rounded-2xl border-dashed"
          >
            <Plus className="size-4" /> Tambah Kategori {activeType === "expense" ? "Pengeluaran" : "Pemasukan"}
          </Button>
        </>
      )}
    </div>
  );
}
