"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { COLOR_CHOICES, ICON_CHOICES, getIcon } from "./icon-map";
import type { CategoryType } from "./types";
import { cn } from "@/lib/utils";

interface AddCategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: CategoryType;
  onSuccess?: () => void;
}

export function AddCategorySheet({
  open,
  onOpenChange,
  defaultType = "expense",
  onSuccess,
}: AddCategorySheetProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>(defaultType);
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const [icon, setIcon] = useState("Wallet");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setName("");
      setType(defaultType);
      setColor(COLOR_CHOICES[Math.floor(Math.random() * 8)]);
      setIcon("Wallet");
    }
  }, [open, defaultType]);

  async function handleSubmit() {
    if (!name.trim()) {
      toast({ title: "Nama kategori wajib diisi", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type, color, icon }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Gagal membuat kategori");
      }
      toast({ title: "Kategori ditambahkan", description: name.trim() });
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

  const IconComp = getIcon(icon);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] p-0 sm:max-w-md sm:mx-auto sm:rounded-t-2xl sm:rounded-b-2xl sm:mb-6 sm:border">
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle>Tambah Kategori</SheetTitle>
          <SheetDescription className="sr-only">Buat kategori baru untuk pemasukan atau pengeluaran.</SheetDescription>
        </SheetHeader>

        <div className="px-5 pb-4 space-y-5 overflow-y-auto thin-scrollbar" style={{ maxHeight: "60vh" }}>
          {/* Preview */}
          <div className="flex items-center justify-center py-3">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-3xl shadow-sm"
              style={{ backgroundColor: `${color}22`, color }}
            >
              <IconComp className="size-10" />
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="cat-name">Nama Kategori</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Makan & Minum"
              className="h-11 rounded-2xl"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Tipe</Label>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "rounded-xl py-2 text-sm font-medium transition-all",
                    type === t ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t === "expense" ? "Pengeluaran" : "Pemasukan"}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
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

          {/* Icon */}
          <div className="space-y-2">
            <Label>Ikon</Label>
            <div className="grid grid-cols-6 gap-2">
              {ICON_CHOICES.map((ic) => {
                const Icon = getIcon(ic.name);
                return (
                  <button
                    key={ic.name}
                    type="button"
                    onClick={() => setIcon(ic.name)}
                    title={ic.label}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-xl transition-all hover:bg-accent",
                      icon === ic.name ? "bg-accent text-accent-foreground ring-1 ring-primary/40" : "bg-secondary text-muted-foreground",
                    )}
                  >
                    <Icon className="size-5" />
                  </button>
                );
              })}
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
              "Simpan Kategori"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
