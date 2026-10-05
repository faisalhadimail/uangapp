"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Landmark, Banknote, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatRupiah } from "@/lib/format";
import type { AccountType } from "./types";
import { cn } from "@/lib/utils";

interface AddAccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const ACCOUNT_TYPES: { value: AccountType; label: string; icon: typeof Landmark }[] = [
  { value: "bank", label: "Bank", icon: Landmark },
  { value: "cash", label: "Tunai", icon: Banknote },
  { value: "ewallet", label: "E-Wallet", icon: Smartphone },
];

export function AddAccountSheet({ open, onOpenChange, onSuccess }: AddAccountSheetProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [initialBalance, setInitialBalance] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setName("");
      setType("bank");
      setInitialBalance("");
    }
  }, [open]);

  const parsedBalance = Number(initialBalance.replace(/[^\d]/g, ""));
  const formattedBalance = parsedBalance ? formatRupiah(parsedBalance) : "";

  async function handleSubmit() {
    if (!name.trim()) {
      toast({ title: "Nama rekening wajib diisi", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          initialBalance: parsedBalance,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Gagal membuat rekening");
      }
      toast({ title: "Rekening ditambahkan", description: name.trim() });
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
          <SheetTitle>Tambah Rekening</SheetTitle>
          <SheetDescription className="sr-only">Catat bank, dompet tunai, atau e-wallet.</SheetDescription>
        </SheetHeader>

        <div className="px-5 pb-4 space-y-5">
          {/* Type chips */}
          <div className="grid grid-cols-3 gap-2">
            {ACCOUNT_TYPES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl py-3 text-xs font-medium transition-all",
                  type === value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" />
                {label}
              </button>
            ))}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="acc-name">Nama Rekening</Label>
            <Input
              id="acc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === "bank" ? "Contoh: Bank BCA" : type === "cash" ? "Contoh: Dompet Tunai" : "Contoh: GoPay"}
              className="h-11 rounded-2xl"
            />
          </div>

          {/* Initial balance */}
          <div className="space-y-2">
            <Label htmlFor="acc-balance">Saldo Awal</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-medium text-muted-foreground">
                Rp
              </span>
              <Input
                id="acc-balance"
                inputMode="numeric"
                value={formattedBalance}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^\d]/g, "");
                  setInitialBalance(digits);
                }}
                placeholder="0"
                className="h-11 rounded-2xl pl-11 text-base font-semibold"
              />
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
              "Simpan Rekening"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
