"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Tag,
  Wallet,
  PiggyBank,
  Receipt,
  HandCoins,
  Settings,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  MessageCircle,
  Bell,
  Users,
  Sparkles,
} from "lucide-react";
import { formatRupiah } from "@/lib/format";
import type { Summary } from "./types";

export type MoreView =
  | "whatsapp"
  | "family"
  | "notifications"
  | "tahap5"
  | "savings"
  | "bills"
  | "debts"
  | "categories"
  | "accounts"
  | "settings";

interface MoreMenuProps {
  summary: Summary | null;
  unreadNotifications?: number;
  memberCount?: number;
  onNavigate: (view: MoreView) => void;
}

export function MoreMenu({ summary, unreadNotifications = 0, memberCount = 0, onNavigate }: MoreMenuProps) {
  const menus: Array<{
    view: MoreView;
    label: string;
    description: string;
    icon: typeof Wallet;
    color: string;
    badge?: string;
    badgeColor?: string;
    featured?: boolean;
  }> = [
    {
      view: "whatsapp",
      label: "WhatsApp",
      description: "Bagikan & jadwalkan laporan",
      icon: MessageCircle,
      color: "#25D366",
      featured: true,
    },
    {
      view: "tahap5",
      label: "Fitur Lanjutan",
      description: "Analisis, target, backup & scan struk",
      icon: Sparkles,
      color: "#8b5cf6",
      featured: true,
    },
    {
      view: "notifications",
      label: "Notifikasi",
      description: unreadNotifications > 0 ? `${unreadNotifications} belum dibaca` : "Pengingat & peringatan",
      icon: Bell,
      color: "#ef4444",
      badge: unreadNotifications > 0 ? String(unreadNotifications) : undefined,
      badgeColor: "#ef4444",
    },
    {
      view: "family",
      label: "Keluarga",
      description: memberCount > 0 ? `${memberCount} anggota terdaftar` : "Kelola anggota & peran",
      icon: Users,
      color: "#8b5cf6",
    },
    {
      view: "savings",
      label: "Tabungan",
      description: summary
        ? `${formatRupiah(summary.totalSavings ?? 0)} terkumpul`
        : "Target & dana darurat",
      icon: PiggyBank,
      color: "#10b981",
    },
    {
      view: "bills",
      label: "Tagihan",
      description: summary
        ? `${summary.unpaidBillsCount ?? 0} belum dibayar`
        : "Cicilan & pengingat",
      icon: Receipt,
      color: "#0ea5e9",
      badge:
        summary && summary.unpaidBillsCount && summary.unpaidBillsCount > 0
          ? String(summary.unpaidBillsCount)
          : undefined,
      badgeColor: "#ef4444",
    },
    {
      view: "debts",
      label: "Utang & Piutang",
      description: summary
        ? `${formatRupiah((summary.totalDebt ?? 0) + (summary.totalReceivable ?? 0))} aktif`
        : "Kewajiban & pembayaran",
      icon: HandCoins,
      color: "#f97316",
    },
    {
      view: "categories",
      label: "Kategori",
      description: "Kelola kategori transaksi",
      icon: Tag,
      color: "#8b5cf6",
    },
    {
      view: "accounts",
      label: "Rekening",
      description: "Bank, tunai, e-wallet",
      icon: Wallet,
      color: "#06b6d4",
    },
    {
      view: "settings",
      label: "Pengaturan",
      description: "Profil, keamanan, backup",
      icon: Settings,
      color: "#64748b",
    },
  ];

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h2 className="text-lg font-bold">Lainnya</h2>
        <p className="text-sm text-muted-foreground">Akses cepat semua fitur</p>
      </div>

      {/* Quick stats */}
      {summary && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-secondary p-3">
            <ShieldCheck className="size-4 text-emerald-500" />
            <p className="mt-1 text-[10px] text-muted-foreground">Tabungan</p>
            <p className="text-xs font-bold">{formatRupiah(summary.totalSavings ?? 0)}</p>
          </div>
          <div className="rounded-2xl bg-secondary p-3">
            <Receipt className="size-4 text-rose-500" />
            <p className="mt-1 text-[10px] text-muted-foreground">Tagihan Aktif</p>
            <p className="text-xs font-bold">{summary.unpaidBillsCount ?? 0}</p>
          </div>
          <div className="rounded-2xl bg-secondary p-3">
            <AlertTriangle className="size-4 text-amber-500" />
            <p className="mt-1 text-[10px] text-muted-foreground">Utang</p>
            <p className="text-xs font-bold">{formatRupiah(summary.totalDebt ?? 0)}</p>
          </div>
        </div>
      )}

      {/* Featured WhatsApp card */}
      {menus.filter((m) => m.featured).map((m) => {
        const Icon = m.icon;
        return (
          <button key={m.view} onClick={() => onNavigate(m.view)} className="block w-full text-left">
            <Card className="border-0 shadow-md transition-all hover:shadow-lg active:scale-[0.98] overflow-hidden">
              <div
                className="flex items-center gap-3 p-4 text-white"
                style={{
                  background: `linear-gradient(135deg, ${m.color}, ${m.color}dd)`,
                }}
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Icon className="size-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{m.label}</p>
                  <p className="text-xs text-white/85">{m.description}</p>
                </div>
                <ChevronRight className="size-5 text-white/80" />
              </div>
            </Card>
          </button>
        );
      })}

      {/* Menu grid */}
      <div className="grid grid-cols-2 gap-3">
        {menus.filter((m) => !m.featured).map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.view}
              onClick={() => onNavigate(m.view)}
              className="group text-left"
            >
              <Card className="border-0 shadow-sm transition-all group-hover:shadow-md group-active:scale-[0.98]">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex size-11 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: `${m.color}22`, color: m.color }}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      {m.badge && (
                        <span
                          className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ backgroundColor: m.badgeColor ?? "#ef4444" }}
                        >
                          {m.badge}
                        </span>
                      )}
                      <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-semibold">{m.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{m.description}</p>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {/* About card */}
      <Card className="border-0 shadow-sm bg-secondary/50">
        <CardContent className="space-y-2 p-4 text-xs text-muted-foreground">
          <p className="text-sm font-medium text-foreground">Tentang Aplikasi</p>
          <p>
            <strong>Catatan Keuangan Keluarga</strong> — versi Tahap 5. Aplikasi keuangan keluarga
            lengkap dengan analisis keuangan cerdas (skor kesehatan & insight otomatis), perencanaan
            target finansial, backup/restore JSON, scan struk (OCR), multi-anggota dengan peran &
            hak akses, notifikasi cerdas, serta integrasi WhatsApp.
          </p>
          <p className="pt-1">Versi 5.0 · Tahap 5 — Versi Final</p>
        </CardContent>
      </Card>
    </div>
  );
}
