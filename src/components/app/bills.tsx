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
  Receipt,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Calendar,
  Zap,
  Wifi,
  Droplets,
  Home,
  Car,
  CreditCard,
  Tv,
  Music,
  HeartPulse,
  ShieldPlus,
  Receipt as ReceiptIcon,
} from "lucide-react";
import { formatRupiah, formatRupiahShort, monthLabel } from "@/lib/format";
import { CategoryIcon } from "./icon-map";
import { COLOR_CHOICES, ICON_CHOICES } from "./icon-map";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { BillWithStatus, BillRecurrence } from "./types";

interface BillsProps {
  bills: BillWithStatus[];
  loading: boolean;
  monthKey: string;
  onRefresh: () => void;
}

export function Bills({ bills, loading, monthKey, onRefresh }: BillsProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const paidBills = bills.filter((b) => b.isPaid);
  const unpaidBills = bills.filter((b) => !b.isPaid);
  const overdueBills = bills.filter((b) => b.isOverdue);

  const totalPaid = paidBills.reduce((s, b) => s + b.amount, 0);
  const totalUnpaid = unpaidBills.reduce((s, b) => s + b.amount, 0);

  const togglePaid = useCallback(
    async (bill: BillWithStatus) => {
      try {
        const res = await fetch("/api/bills", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: bill.id,
            markPaid: !bill.isPaid,
            month: monthKey,
          }),
        });
        if (!res.ok) throw new Error("Gagal memperbarui status");
        toast({
          title: bill.isPaid ? "Tagihan dibatalkan" : "Tagihan ditandai lunas",
          description: bill.name,
        });
        onRefresh();
      } catch (err) {
        toast({
          title: "Gagal memperbarui",
          description: err instanceof Error ? err.message : "Coba lagi nanti.",
          variant: "destructive",
        });
      }
    },
    [monthKey, onRefresh, toast],
  );

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/bills?id=${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast({ title: "Tagihan dihapus" });
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
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Tagihan</h2>
          <p className="text-sm text-muted-foreground">{monthLabel(monthKey)}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)} className="text-primary">
          <Plus className="size-4" /> Tambah
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="size-5 text-emerald-500" />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Lunas</span>
            </div>
            <p className="mt-2 text-base font-bold text-emerald-600">{formatRupiah(totalPaid)}</p>
            <p className="text-[11px] text-muted-foreground">{paidBills.length} tagihan</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <Receipt className="size-5 text-rose-500" />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Belum Bayar</span>
            </div>
            <p className="mt-2 text-base font-bold text-rose-600">{formatRupiah(totalUnpaid)}</p>
            <p className="text-[11px] text-muted-foreground">{unpaidBills.length} tagihan</p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue alert */}
      {overdueBills.length > 0 && (
        <Card className="border-0 shadow-sm bg-rose-50">
          <CardContent className="flex items-start gap-3 p-3.5">
            <AlertTriangle className="size-5 shrink-0 text-rose-500" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-700">
                {overdueBills.length} tagihan jatuh tempo
              </p>
              <p className="text-xs text-rose-600">
                Total {formatRupiah(overdueBills.reduce((s, b) => s + b.amount, 0))} · segera lakukan pembayaran
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bills list */}
      {bills.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <Receipt className="size-6" />
            </div>
            <p className="text-sm font-medium">Belum ada tagihan</p>
            <p className="text-xs text-muted-foreground">
              Catat cicilan, langganan, dan tagihan berulang untuk pengingat pembayaran.
            </p>
            <Button onClick={() => setAddOpen(true)} size="sm" className="mt-1 rounded-xl">
              <Plus className="size-4" /> Tambah Tagihan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Unpaid section */}
          {unpaidBills.length > 0 && (
            <div className="space-y-2">
              <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Belum Dibayar · {unpaidBills.length}
              </p>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                  <ul className="divide-y">
                    {unpaidBills.map((b) => (
                      <BillRow
                        key={b.id}
                        bill={b}
                        onTogglePaid={() => togglePaid(b)}
                        onDelete={() => setDeleteId(b.id)}
                      />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Paid section */}
          {paidBills.length > 0 && (
            <div className="space-y-2">
              <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Sudah Dibayar · {paidBills.length}
              </p>
              <Card className="border-0 shadow-sm opacity-75">
                <CardContent className="p-0">
                  <ul className="divide-y">
                    {paidBills.map((b) => (
                      <BillRow
                        key={b.id}
                        bill={b}
                        onTogglePaid={() => togglePaid(b)}
                        onDelete={() => setDeleteId(b.id)}
                      />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Add sheet */}
      <BillFormSheet
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
            <AlertDialogTitle>Hapus tagihan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tagihan akan dihapus permanen beserta riwayat pembayarannya.
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

function BillRow({
  bill,
  onTogglePaid,
  onDelete,
}: {
  bill: BillWithStatus;
  onTogglePaid: () => void;
  onDelete: () => void;
}) {
  const recurrenceLabel = bill.recurrence === "monthly" ? "Bulanan" : bill.recurrence === "weekly" ? "Mingguan" : "Sekali";

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <button
        onClick={onTogglePaid}
        className="shrink-0"
        aria-label={bill.isPaid ? "Tandai belum bayar" : "Tandai lunas"}
      >
        {bill.isPaid ? (
          <CheckCircle2 className="size-6 text-emerald-500" />
        ) : bill.isOverdue ? (
          <Circle className="size-6 text-rose-500" />
        ) : (
          <Circle className="size-6 text-muted-foreground/40" />
        )}
      </button>
      <Avatar className="size-10 rounded-xl">
        <AvatarFallback
          className="rounded-xl"
          style={{ backgroundColor: `${bill.color}22`, color: bill.color }}
        >
          <CategoryIcon name={bill.icon} className="size-5" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", bill.isPaid && "line-through text-muted-foreground")}>
          {bill.name}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="size-3" /> Tgl {bill.dueDay}
          </span>
          <span>·</span>
          <span>{recurrenceLabel}</span>
          {bill.isOverdue && (
            <>
              <span>·</span>
              <span className="font-medium text-rose-500">Terlambat</span>
            </>
          )}
        </div>
      </div>
      <p className={cn("shrink-0 text-sm font-bold", bill.isPaid ? "text-muted-foreground" : "text-foreground")}>
        {formatRupiah(bill.amount)}
      </p>
      <button
        onClick={onDelete}
        className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
        aria-label="Hapus tagihan"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

function BillFormSheet({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState<string>("1");
  const [recurrence, setRecurrence] = useState<BillRecurrence>("monthly");
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const [icon, setIcon] = useState("Receipt");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setName("");
      setAmount("");
      setDueDay("1");
      setRecurrence("monthly");
      setColor(COLOR_CHOICES[Math.floor(Math.random() * 8)]);
      setIcon("Receipt");
    }
  }, [open]);

  const parsedAmount = Number(amount.replace(/[^\d]/g, ""));
  const formattedAmount = parsedAmount ? formatRupiah(parsedAmount) : "";

  async function handleSubmit() {
    if (!name.trim()) {
      toast({ title: "Nama tagihan wajib diisi", variant: "destructive" });
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      toast({ title: "Jumlah tidak valid", variant: "destructive" });
      return;
    }
    const dayNum = Number(dueDay);
    if (!dayNum || dayNum < 1 || dayNum > 31) {
      toast({ title: "Tanggal jatuh tempo harus 1-31", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          amount: parsedAmount,
          dueDay: dayNum,
          recurrence,
          color,
          icon,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Gagal membuat tagihan");
      }
      toast({ title: "Tagihan ditambahkan", description: name.trim() });
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
          <SheetTitle>Tambah Tagihan</SheetTitle>
          <SheetDescription className="sr-only">Catat tagihan berulang atau cicilan.</SheetDescription>
        </SheetHeader>

        <div className="px-5 pb-4 space-y-5 overflow-y-auto thin-scrollbar" style={{ maxHeight: "60vh" }}>
          {/* Preview */}
          <div className="flex items-center justify-center py-2">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-3xl shadow-sm"
              style={{ backgroundColor: `${color}22`, color }}
            >
              <CategoryIcon name={icon} className="size-8" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bill-name">Nama Tagihan</Label>
            <Input
              id="bill-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Listrik PLN"
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bill-amount">Jumlah</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-medium text-muted-foreground">Rp</span>
              <Input
                id="bill-amount"
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="bill-day">Jatuh Tempo</Label>
              <Select value={dueDay} onValueChange={setDueDay}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => (
                    <SelectItem key={d} value={d}>
                      Tanggal {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bill-rec">Periode</Label>
              <Select value={recurrence} onValueChange={(v) => setRecurrence(v as BillRecurrence)}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Bulanan</SelectItem>
                  <SelectItem value="weekly">Mingguan</SelectItem>
                  <SelectItem value="once">Sekali</SelectItem>
                </SelectContent>
              </Select>
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

          <div className="space-y-2">
            <Label>Ikon</Label>
            <div className="grid grid-cols-6 gap-2">
              {ICON_CHOICES.filter((ic) =>
                ["Receipt", "Zap", "Wifi", "Droplets", "Home", "Car", "CreditCard", "Tv", "Music", "HeartPulse", "ShieldPlus", "Wallet"].includes(ic.name),
              ).map((ic) => (
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
              "Simpan Tagihan"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
