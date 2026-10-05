"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trash2,
  Loader2,
  CheckCheck,
  Calendar,
  CreditCard,
  Target,
  MessageCircle,
  Info,
  RefreshCw,
  Bell,
  BellOff,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationType } from "./types";

interface NotificationsPageProps {
  onAction?: (actionUrl: string | null) => void;
}

const NOTIF_ICONS: Record<NotificationType, typeof Bell> = {
  bill_due: Calendar,
  debt_overdue: CreditCard,
  budget_over: Target,
  schedule_due: MessageCircle,
  info: Info,
};

const NOTIF_COLORS: Record<NotificationType, string> = {
  bill_due: "#f59e0b",
  debt_overdue: "#ef4444",
  budget_over: "#8b5cf6",
  schedule_due: "#25D366",
  info: "#0ea5e9",
};

const TYPE_LABELS: Record<NotificationType, string> = {
  bill_due: "Tagihan",
  debt_overdue: "Utang/Piutang",
  budget_over: "Anggaran",
  schedule_due: "WhatsApp",
  info: "Info",
};

export function NotificationsPage({ onAction }: NotificationsPageProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | NotificationType>("all");
  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=100");
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      setNotifications(data.notifications as AppNotification[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = filter === "all"
    ? notifications
    : notifications.filter((n) => n.type === filter);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/notifications/generate", { method: "POST" });
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      toast({
        title: data.generated > 0 ? `${data.generated} notifikasi baru` : "Tidak ada notifikasi baru",
      });
      load();
    } catch (err) {
      toast({
        title: "Gagal memeriksa",
        description: err instanceof Error ? err.message : "Coba lagi.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleMarkAllRead() {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      toast({ title: "Semua ditandai dibaca" });
      load();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleClearRead() {
    setClearing(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAll: true }),
      });
      toast({ title: "Notifikasi dibaca dibersihkan" });
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setClearing(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAction(n: AppNotification) {
    if (!n.readAt) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      });
      load();
    }
    onAction?.(n.actionUrl);
  }

  const filterOptions: { value: "all" | NotificationType; label: string }[] = [
    { value: "all", label: "Semua" },
    { value: "bill_due", label: "Tagihan" },
    { value: "debt_overdue", label: "Utang" },
    { value: "budget_over", label: "Anggaran" },
    { value: "schedule_due", label: "WhatsApp" },
  ];

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-lg font-bold">
            <Bell className="size-5 text-primary" /> Notifikasi
          </h2>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} belum dibaca` : "Semua dibaca"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-xl"
        >
          {generating ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Memeriksa...
            </>
          ) : (
            <>
              <RefreshCw className="size-4" /> Periksa
            </>
          )}
        </Button>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
          className="h-10 rounded-xl text-xs"
        >
          <CheckCheck className="size-4" /> Tandai Semua Dibaca
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearRead}
          disabled={clearing}
          className="h-10 rounded-xl text-xs text-muted-foreground"
        >
          {clearing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}{" "}
          Bersihkan Dibaca
        </Button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {filterOptions.map((f) => {
          const count = f.value === "all"
            ? notifications.length
            : notifications.filter((n) => n.type === f.value).length;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
                filter === f.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <BellOff className="size-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">Tidak ada notifikasi</p>
            <p className="text-xs text-muted-foreground">
              Klik "Periksa" untuk scan kondisi terbaru.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((n) => {
            const Icon = NOTIF_ICONS[n.type] ?? Info;
            const color = n.color || NOTIF_COLORS[n.type];
            const isUnread = !n.readAt;
            const isHigh = n.priority === "high";
            return (
              <Card
                key={n.id}
                className={cn(
                  "border-0 shadow-sm transition-all hover:shadow-md",
                  isUnread && "ring-1 ring-primary/30",
                  isHigh && isUnread && "ring-2 ring-destructive/40",
                )}
              >
                <CardContent className="p-3.5">
                  <div className="flex gap-3">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${color}22`, color }}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {isHigh && isUnread && (
                              <AlertTriangle className="size-3 shrink-0 text-destructive" />
                            )}
                            <p className="text-sm font-semibold leading-snug">{n.title}</p>
                          </div>
                          <span
                            className="mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                            style={{ backgroundColor: `${color}22`, color }}
                          >
                            {TYPE_LABELS[n.type]}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDelete(n.id)}
                          className="shrink-0 rounded-lg p-1 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Hapus"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {n.message}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground/70">
                          {formatRelativeTime(n.createdAt)}
                        </span>
                        {n.actionUrl && (
                          <button
                            onClick={() => handleAction(n)}
                            className="text-[11px] font-medium text-primary hover:underline"
                          >
                            Lihat detail →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const now = new Date();
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
