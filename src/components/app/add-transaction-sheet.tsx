"use client";

import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Loader2 } from "lucide-react";
import { formatRupiah, todayISO } from "@/lib/format";
import type { Category, AccountWithBalance, TransactionType, FamilyMember } from "./types";
import { useToast } from "@/hooks/use-toast";

interface AddTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  accounts: AccountWithBalance[];
  members?: FamilyMember[];
  currentMemberId?: string;
  onSuccess?: () => void;
}

const TYPE_TABS: { value: TransactionType; label: string; icon: typeof ArrowUpRight; color: string }[] = [
  { value: "expense", label: "Pengeluaran", icon: ArrowDownLeft, color: "text-rose-500" },
  { value: "income", label: "Pemasukan", icon: ArrowUpRight, color: "text-emerald-500" },
  { value: "transfer", label: "Transfer", icon: ArrowLeftRight, color: "text-sky-500" },
];

export function AddTransactionSheet({
  open,
  onOpenChange,
  categories,
  accounts,
  members = [],
  currentMemberId,
  onSuccess,
}: AddTransactionSheetProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>(todayISO());
  const [categoryId, setCategoryId] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [memberId, setMemberId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Reset form on open
  useEffect(() => {
    if (open) {
      setType("expense");
      setAmount("");
      setDescription("");
      setDate(todayISO());
      setCategoryId("");
      setAccountId(accounts[0]?.id ?? "");
      setToAccountId(accounts[1]?.id ?? "");
      // Tahap 4: default to current user member
      setMemberId(currentMemberId ?? members.find((m) => m.isCurrentUser)?.id ?? "");
    }
  }, [open, accounts, currentMemberId, members]);

  // Filter categories by type
  const visibleCategories = useMemo(
    () => categories.filter((c) => c.type === (type === "income" ? "income" : "expense")),
    [categories, type],
  );

  // Auto-select first category / account when type changes
  useEffect(() => {
    if (type !== "transfer") {
      const first = visibleCategories[0];
      if (first) setCategoryId(first.id);
    }
  }, [visibleCategories, type]);

  const parsedAmount = Number(amount.replace(/[^\d]/g, ""));
  const formattedAmount = parsedAmount ? formatRupiah(parsedAmount) : "";

  async function handleSubmit() {
    if (!parsedAmount || parsedAmount <= 0) {
      toast({ title: "Jumlah tidak valid", description: "Masukkan jumlah lebih dari 0.", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "Keterangan wajib diisi", variant: "destructive" });
      return;
    }
    if (!accountId) {
      toast({ title: "Rekening wajib dipilih", variant: "destructive" });
      return;
    }
    if (type === "transfer" && (!toAccountId || toAccountId === accountId)) {
      toast({ title: "Rekening tujuan tidak valid", variant: "destructive" });
      return;
    }
    if (type !== "transfer" && !categoryId) {
      toast({ title: "Kategori wajib dipilih", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: parsedAmount,
          description: description.trim(),
          date,
          categoryId: type === "transfer" ? null : categoryId,
          accountId,
          toAccountId: type === "transfer" ? toAccountId : null,
          memberId: memberId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Gagal menyimpan transaksi");
      }
      toast({
        title: "Transaksi tersimpan",
        description: `${type === "income" ? "Pemasukan" : type === "expense" ? "Pengeluaran" : "Transfer"} ${formatRupiah(parsedAmount)}`,
      });
      onSuccess?.();
      onOpenChange(false);
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
          <SheetTitle>Tambah Transaksi</SheetTitle>
          <SheetDescription className="sr-only">Catat pemasukan, pengeluaran, atau transfer antar rekening.</SheetDescription>
        </SheetHeader>

        <ScrollArea className="thin-scrollbar max-h-[60vh] px-5 pb-4">
          <div className="space-y-5">
            {/* Type selector */}
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-secondary p-1">
              {TYPE_TABS.map((t) => {
                const Icon = t.icon;
                const active = type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`flex flex-col items-center gap-1 rounded-xl py-2.5 text-xs font-medium transition-all ${
                      active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className={`size-5 ${active ? t.color : ""}`} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Jumlah</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
                  Rp
                </span>
                <Input
                  id="amount"
                  inputMode="numeric"
                  value={formattedAmount}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^\d]/g, "");
                    setAmount(digits);
                  }}
                  placeholder="0"
                  className="h-14 rounded-2xl pl-11 text-2xl font-bold tracking-tight"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Keterangan</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={type === "transfer" ? "Contoh: Tarik tunai ATM" : "Contoh: Belanja bulanan Indomaret"}
                className="min-h-[64px] resize-none rounded-2xl"
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Tanggal</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 rounded-2xl"
              />
            </div>

            {/* Account (from) */}
            <div className="space-y-2">
              <Label>{type === "transfer" ? "Dari Rekening" : "Rekening"}</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Pilih rekening" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} · {formatRupiah(a.balance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* To Account (transfer only) */}
            {type === "transfer" && (
              <div className="space-y-2">
                <Label>Ke Rekening</Label>
                <Select value={toAccountId} onValueChange={setToAccountId}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="Pilih rekening tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((a) => a.id !== accountId)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} · {formatRupiah(a.balance)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Category */}
            {type !== "transfer" && (
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

            {/* Tahap 4: Member selector */}
            {members.length > 0 && (
              <div className="space-y-2">
                <Label>Dicatat oleh (opsional)</Label>
                <Select value={memberId} onValueChange={(v) => setMemberId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="Pilih anggota" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Tidak terkait —</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                        {m.isCurrentUser ? " (Anda)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </ScrollArea>

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
              "Simpan Transaksi"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
