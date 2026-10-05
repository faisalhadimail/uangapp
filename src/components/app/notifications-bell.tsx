"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Calendar,
  CreditCard,
  Target,
  MessageCircle,
  Info,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationType } from "./types";

interface NotificationsBellProps {
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

export function NotificationsBell({ onAction }: NotificationsBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=30");
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      setNotifications(data.notifications as AppNotification[]);
      setUnreadCount(data.unreadCount as number);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Auto-refresh every 60 seconds when bell is closed
  useEffect(() => {
    if (open) return;
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [open, loadNotifications]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/notifications/generate", { method: "POST" });
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      if (data.generated > 0) {
        toast({
          title: `${data.generated} notifikasi baru`,
          description: "Periksa daftar untuk detail.",
        });
      } else {
        toast({
          title: "Tidak ada notifikasi baru",
          description: "Semua kondisi sudah diperiksa.",
        });
      }
      loadNotifications();
    } catch (err) {
      toast({
        title: "Gagal memuat notifikasi",
        description: err instanceof Error ? err.message : "Coba lagi nanti.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMarkAllRead() {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      toast({ title: "Semua notifikasi ditandai dibaca" });
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  }

  function handleAction(notif: AppNotification) {
    if (!notif.readAt) handleMarkRead(notif.id);
    if (notif.actionUrl) {
      onAction?.(notif.actionUrl);
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative rounded-lg p-2 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
          aria-label="Notifikasi"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[340px] p-0 sm:w-[380px]"
        sideOffset={8}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            <p className="text-sm font-semibold">Notifikasi</p>
            {unreadCount > 0 && (
              <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadCount} baru
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground disabled:opacity-50"
              aria-label="Periksa notifikasi baru"
              title="Periksa notifikasi baru"
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
                aria-label="Tandai semua dibaca"
                title="Tandai semua dibaca"
              >
                <CheckCheck className="size-4" />
              </button>
            )}
          </div>
        </div>

        <div className="thin-scrollbar max-h-[420px] overflow-y-auto">
          {loading ? (
            <div className="space-y-2 p-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <BellOff className="size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">Tidak ada notifikasi</p>
              <p className="text-xs text-muted-foreground">
                Klik ikon refresh untuk periksa kondisi terbaru.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => {
                const Icon = NOTIF_ICONS[n.type] ?? Info;
                const color = n.color || NOTIF_COLORS[n.type];
                const isUnread = !n.readAt;
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "group relative flex gap-3 px-4 py-3 transition-colors hover:bg-secondary/50",
                      isUnread && "bg-primary/5",
                    )}
                  >
                    {isUnread && (
                      <span className="absolute left-1.5 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary" />
                    )}
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${color}22`, color }}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-semibold leading-snug">{n.title}</p>
                        <button
                          onClick={() => handleDelete(n.id)}
                          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
                          aria-label="Hapus"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                        {n.message}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground/70">
                          {formatRelativeTime(n.createdAt)}
                        </span>
                        {isUnread && (
                          <button
                            onClick={() => handleMarkRead(n.id)}
                            className="flex items-center gap-0.5 text-[10px] font-medium text-primary hover:underline"
                          >
                            <Check className="size-3" /> Tandai dibaca
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="border-t p-2">
            <button
              onClick={() => {
                onAction?.("more:notifications");
                setOpen(false);
              }}
              className="w-full rounded-xl py-2 text-center text-xs font-medium text-primary hover:bg-secondary"
            >
              Lihat semua notifikasi
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
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
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
