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
  MessageCircle,
  Send,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  Clock,
  Users,
  FileText,
  Bell,
  Check,
  ChevronRight,
  Sparkles,
  Phone,
  Edit3,
  Power,
  AlertCircle,
} from "lucide-react";
import { formatRupiah, monthLabel, currentMonthKey } from "@/lib/format";
import {
  TEMPLATE_VARIABLES,
  formatPhoneDisplay,
} from "@/lib/whatsapp";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type {
  WhatsAppTemplate,
  WhatsAppRecipient,
  ScheduledReport,
  RecipientRole,
  ScheduleFrequency,
} from "./types";

type SubView = "hub" | "templates" | "recipients" | "schedules" | "preview";

interface WhatsAppHubProps {
  onRefresh?: () => void;
}

export function WhatsAppHub({ onRefresh }: WhatsAppHubProps) {
  const [view, setView] = useState<SubView>("hub");

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [recipients, setRecipients] = useState<WhatsAppRecipient[]>([]);
  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);
  const [preview, setPreview] = useState<string>("");
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [sending, setSending] = useState(false);

  const [addTemplateOpen, setAddTemplateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<WhatsAppTemplate | null>(null);
  const [addRecipientOpen, setAddRecipientOpen] = useState(false);
  const [addScheduleOpen, setAddScheduleOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<{ type: "template" | "recipient" | "schedule"; id: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { toast } = useToast();

  // ---- Loaders -----------------------------------------------------------
  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/templates");
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      setTemplates(data.templates as WhatsAppTemplate[]);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadRecipients = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/recipients");
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      setRecipients(data.recipients as WhatsAppRecipient[]);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadSchedules = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/scheduled");
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      setSchedules(data.schedules as ScheduledReport[]);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const res = await fetch("/api/whatsapp/preview");
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      setPreview(data.preview as string);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadTemplates(), loadRecipients(), loadSchedules(), loadPreview()]);
  }, [loadTemplates, loadRecipients, loadSchedules, loadPreview]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ---- Handlers ----------------------------------------------------------
  async function handleQuickSend() {
    setSending(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Gagal mengirim");
      const data = await res.json();
      // Open first URL in new tab
      if (data.urls && data.urls.length > 0) {
        window.open(data.urls[0].url, "_blank", "noopener,noreferrer");
      }
      toast({
        title: "Laporan dikirim ke WhatsApp",
        description: `${data.urls?.length ?? 0} penerima · ${data.messageLength ?? 0} karakter`,
      });
      onRefresh?.();
    } catch (err) {
      toast({
        title: "Gagal mengirim",
        description: err instanceof Error ? err.message : "Coba lagi nanti.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  async function handleTriggerSchedule(scheduleId: string) {
    setSending(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId }),
      });
      if (!res.ok) throw new Error("Gagal mengirim");
      const data = await res.json();
      if (data.urls && data.urls.length > 0) {
        // Open the first URL; user can come back to send to others if multiple
        window.open(data.urls[0].url, "_blank", "noopener,noreferrer");
      }
      toast({
        title: "Laporan terjadwal dikirim",
        description: `${data.recipientCount ?? 0} penerima · jadwal berikutnya diperbarui`,
      });
      loadSchedules();
      onRefresh?.();
    } catch (err) {
      toast({
        title: "Gagal mengirim",
        description: err instanceof Error ? err.message : "Coba lagi nanti.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  async function handleToggleSchedule(id: string, currentActive: boolean) {
    try {
      const res = await fetch("/api/whatsapp/scheduled", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentActive }),
      });
      if (!res.ok) throw new Error("Gagal");
      toast({
        title: !currentActive ? "Jadwal diaktifkan" : "Jadwal dinonaktifkan",
      });
      loadSchedules();
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
      const endpoint =
        deleteId.type === "template"
          ? "/api/whatsapp/templates"
          : deleteId.type === "recipient"
            ? "/api/whatsapp/recipients"
            : "/api/whatsapp/scheduled";
      const res = await fetch(`${endpoint}?id=${deleteId.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast({ title: "Berhasil dihapus" });
      if (deleteId.type === "template") loadTemplates();
      else if (deleteId.type === "recipient") loadRecipients();
      else loadSchedules();
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

  // ---- Render ------------------------------------------------------------
  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-lg font-bold">
            <MessageCircle className="size-5 text-[#25D366]" /> WhatsApp
          </h2>
          <p className="text-sm text-muted-foreground">Bagikan & jadwalkan laporan</p>
        </div>
      </div>

      {view === "hub" && (
        <WhatsAppHubHome
          preview={preview}
          loadingPreview={loadingPreview}
          templateCount={templates.length}
          recipientCount={recipients.filter((r) => r.isActive).length}
          scheduleCount={schedules.filter((s) => s.isActive).length}
          dueCount={schedules.filter((s) => s.isActive && (s as ScheduledReport & { isDue?: boolean }).isDue).length}
          onSend={handleQuickSend}
          sending={sending}
          onNavigate={setView}
          onEditTemplate={(t) => {
            setEditTemplate(t);
            setAddTemplateOpen(true);
          }}
        />
      )}

      {view === "templates" && (
        <TemplatesList
          templates={templates}
          onAdd={() => {
            setEditTemplate(null);
            setAddTemplateOpen(true);
          }}
          onEdit={(t) => {
            setEditTemplate(t);
            setAddTemplateOpen(true);
          }}
          onDelete={(id) => setDeleteId({ type: "template", id })}
          onPreview={(id) => {
            // Set as default then reload preview
            (async () => {
              try {
                // Update preview by fetching with templateId
                setLoadingPreview(true);
                const res = await fetch(`/api/whatsapp/preview?templateId=${id}`);
                if (res.ok) {
                  const data = await res.json();
                  setPreview(data.preview);
                }
              } catch (err) {
                console.error(err);
              } finally {
                setLoadingPreview(false);
                setView("preview");
              }
            })();
          }}
        />
      )}

      {view === "recipients" && (
        <RecipientsList
          recipients={recipients}
          onAdd={() => setAddRecipientOpen(true)}
          onToggleActive={(r) => {
            (async () => {
              try {
                const res = await fetch("/api/whatsapp/recipients", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: r.id, isActive: !r.isActive }),
                });
                if (!res.ok) throw new Error("Gagal");
                toast({ title: !r.isActive ? "Penerima diaktifkan" : "Penerima dinonaktifkan" });
                loadRecipients();
              } catch (err) {
                toast({
                  title: "Gagal memperbarui",
                  description: err instanceof Error ? err.message : "Coba lagi.",
                  variant: "destructive",
                });
              }
            })();
          }}
          onDelete={(id) => setDeleteId({ type: "recipient", id })}
        />
      )}

      {view === "schedules" && (
        <SchedulesList
          schedules={schedules}
          recipients={recipients}
          templates={templates}
          onAdd={() => setAddScheduleOpen(true)}
          onToggle={handleToggleSchedule}
          onTrigger={handleTriggerSchedule}
          sending={sending}
          onDelete={(id) => setDeleteId({ type: "schedule", id })}
        />
      )}

      {view === "preview" && (
        <PreviewView
          preview={preview}
          loading={loadingPreview}
          templates={templates}
          onTemplateChange={async (templateId) => {
            setLoadingPreview(true);
            try {
              const res = await fetch(`/api/whatsapp/preview${templateId ? `?templateId=${templateId}` : ""}`);
              if (res.ok) {
                const data = await res.json();
                setPreview(data.preview);
              }
            } finally {
              setLoadingPreview(false);
            }
          }}
          onSend={handleQuickSend}
          sending={sending}
        />
      )}

      {/* Sheets */}
      <TemplateFormSheet
        open={addTemplateOpen}
        onOpenChange={(o) => {
          setAddTemplateOpen(o);
          if (!o) setEditTemplate(null);
        }}
        editTemplate={editTemplate}
        onSuccess={() => {
          loadTemplates();
          setAddTemplateOpen(false);
          setEditTemplate(null);
        }}
      />
      <RecipientFormSheet
        open={addRecipientOpen}
        onOpenChange={setAddRecipientOpen}
        onSuccess={() => {
          loadRecipients();
          setAddRecipientOpen(false);
        }}
      />
      <ScheduleFormSheet
        open={addScheduleOpen}
        onOpenChange={setAddScheduleOpen}
        templates={templates}
        recipients={recipients}
        onSuccess={() => {
          loadSchedules();
          setAddScheduleOpen(false);
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus item ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan.
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

// =========================================================================
// Sub-view: Hub Home
// =========================================================================
function WhatsAppHubHome({
  preview,
  loadingPreview,
  templateCount,
  recipientCount,
  scheduleCount,
  dueCount,
  onSend,
  sending,
  onNavigate,
  onEditTemplate,
}: {
  preview: string;
  loadingPreview: boolean;
  templateCount: number;
  recipientCount: number;
  scheduleCount: number;
  dueCount: number;
  onSend: () => void;
  sending: boolean;
  onNavigate: (v: SubView) => void;
  onEditTemplate: (t: WhatsAppTemplate) => void;
}) {
  const stats = [
    { label: "Template", value: templateCount, icon: FileText, color: "#0ea5e9", view: "templates" as const },
    { label: "Penerima", value: recipientCount, icon: Users, color: "#10b981", view: "recipients" as const },
    { label: "Jadwal", value: scheduleCount, icon: Calendar, color: "#8b5cf6", view: "schedules" as const },
  ];

  return (
    <div className="space-y-4">
      {/* Hero: Quick send */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#25D366] via-[#20c558] to-[#16a349] p-5 text-white shadow-lg shadow-[#25D366]/30">
        <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-white/15" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 size-32 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white/85">Kirim Laporan Sekarang</p>
            <MessageCircle className="size-5 text-white/80" />
          </div>
          <p className="mt-1 text-2xl font-bold tracking-tight">Bagikan Ringkasan</p>
          <p className="mt-0.5 text-xs text-white/80">
            Laporan {monthLabel(currentMonthKey())} siap dikirim
          </p>

          <Button
            onClick={onSend}
            disabled={sending}
            className="mt-4 w-full h-12 rounded-2xl bg-white text-[#16a349] hover:bg-white/90 font-semibold shadow-sm"
          >
            {sending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Menyiapkan...
              </>
            ) : (
              <>
                <Send className="size-4" /> Buka WhatsApp
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2.5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.label} onClick={() => onNavigate(s.view)} className="text-left">
              <Card className="border-0 shadow-sm transition-all hover:shadow-md active:scale-[0.98]">
                <CardContent className="p-3">
                  <div
                    className="flex size-9 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${s.color}22`, color: s.color }}
                  >
                    <Icon className="size-5" />
                  </div>
                  <p className="mt-2 text-xl font-bold">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {/* Due schedules alert */}
      {dueCount > 0 && (
        <Card className="border-0 shadow-sm bg-amber-50">
          <CardContent className="flex items-center gap-3 p-3.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100">
              <Bell className="size-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-700">
                {dueCount} laporan terjadwal menunggu
              </p>
              <p className="text-xs text-amber-600">
                Sudah waktunya kirim — buka Jadwal untuk kirim manual
              </p>
            </div>
            <ChevronRight className="size-4 text-amber-600" />
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Preview Pesan</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onNavigate("preview")} className="text-xs text-primary">
            Edit <ChevronRight className="size-3.5" />
          </Button>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            {loadingPreview ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ) : (
              <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-foreground">
                {preview || "Belum ada template aktif."}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2.5">
        <button onClick={() => onNavigate("templates")}>
          <Card className="border-0 shadow-sm transition-all hover:shadow-md">
            <CardContent className="flex items-center gap-3 p-3.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                <FileText className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Template</p>
                <p className="text-[11px] text-muted-foreground">Kelola pesan</p>
              </div>
            </CardContent>
          </Card>
        </button>
        <button onClick={() => onNavigate("schedules")}>
          <Card className="border-0 shadow-sm transition-all hover:shadow-md">
            <CardContent className="flex items-center gap-3 p-3.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <Calendar className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Jadwal</p>
                <p className="text-[11px] text-muted-foreground">Kirim otomatis</p>
              </div>
            </CardContent>
          </Card>
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// Sub-view: Templates List
// =========================================================================
function TemplatesList({
  templates,
  onAdd,
  onEdit,
  onDelete,
  onPreview,
}: {
  templates: WhatsAppTemplate[];
  onAdd: () => void;
  onEdit: (t: WhatsAppTemplate) => void;
  onDelete: (id: string) => void;
  onPreview: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold">Template Pesan</h3>
          <p className="text-xs text-muted-foreground">{templates.length} template</p>
        </div>
        <Button size="sm" onClick={onAdd} className="rounded-xl">
          <Plus className="size-4" /> Tambah
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <FileText className="mx-auto size-10 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-medium">Belum ada template</p>
            <p className="text-xs text-muted-foreground">Buat template pertama Anda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {templates.map((t) => (
            <Card key={t.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{t.name}</p>
                      {t.isDefault && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t.reportType === "monthly" ? "Bulanan" : t.reportType === "weekly" ? "Mingguan" : "Kustom"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => onPreview(t.id)}
                      className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
                      aria-label="Preview"
                    >
                      <Sparkles className="size-4" />
                    </button>
                    <button
                      onClick={() => onEdit(t)}
                      className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
                      aria-label="Edit"
                    >
                      <Edit3 className="size-4" />
                    </button>
                    <button
                      onClick={() => onDelete(t.id)}
                      className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Hapus"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                <pre className="mt-2 line-clamp-3 whitespace-pre-wrap break-words font-sans text-[11px] leading-relaxed text-muted-foreground">
                  {t.body}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// Sub-view: Recipients List
// =========================================================================
function RecipientsList({
  recipients,
  onAdd,
  onToggleActive,
  onDelete,
}: {
  recipients: WhatsAppRecipient[];
  onAdd: () => void;
  onToggleActive: (r: WhatsAppRecipient) => void;
  onDelete: (id: string) => void;
}) {
  const roleLabels: Record<RecipientRole, string> = {
    spouse: "Pasangan",
    self: "Diri Sendiri",
    family: "Keluarga",
    other: "Lainnya",
  };
  const roleColors: Record<RecipientRole, string> = {
    spouse: "#ec4899",
    self: "#0ea5e9",
    family: "#10b981",
    other: "#94a3b8",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold">Penerima</h3>
          <p className="text-xs text-muted-foreground">{recipients.length} kontak</p>
        </div>
        <Button size="sm" onClick={onAdd} className="rounded-xl">
          <Plus className="size-4" /> Tambah
        </Button>
      </div>

      {recipients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Users className="mx-auto size-10 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-medium">Belum ada penerima</p>
            <p className="text-xs text-muted-foreground">Tambahkan kontak pasangan/keluarga</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <ul className="divide-y">
              {recipients.map((r) => {
                const color = roleColors[r.role];
                return (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar className="size-10 rounded-xl">
                      <AvatarFallback
                        className="rounded-xl"
                        style={{ backgroundColor: `${color}22`, color }}
                      >
                        {r.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold">{r.name}</p>
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                          style={{ backgroundColor: `${color}22`, color }}
                        >
                          {roleLabels[r.role]}
                        </span>
                        {!r.isActive && (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                            Nonaktif
                          </span>
                        )}
                      </div>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="size-3" /> {formatPhoneDisplay(r.phone)}
                      </p>
                    </div>
                    <button
                      onClick={() => onToggleActive(r)}
                      className={cn(
                        "shrink-0 rounded-lg p-1.5 transition-all",
                        r.isActive
                          ? "text-emerald-500 hover:bg-emerald-50"
                          : "text-muted-foreground hover:bg-secondary",
                      )}
                      aria-label="Toggle aktif"
                    >
                      <Power className="size-4" />
                    </button>
                    <button
                      onClick={() => onDelete(r.id)}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Hapus"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// =========================================================================
// Sub-view: Schedules List
// =========================================================================
function SchedulesList({
  schedules,
  recipients,
  templates,
  onAdd,
  onToggle,
  onTrigger,
  sending,
  onDelete,
}: {
  schedules: ScheduledReport[];
  recipients: WhatsAppRecipient[];
  templates: WhatsAppTemplate[];
  onAdd: () => void;
  onToggle: (id: string, currentActive: boolean) => void;
  onTrigger: (id: string) => void;
  sending: boolean;
  onDelete: (id: string) => void;
}) {
  const dayLabels = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  function formatSchedule(s: ScheduledReport): string {
    if (s.frequency === "monthly") {
      return `Tgl ${s.dayOfWeek} setiap bulan`;
    }
    return `Setiap ${dayLabels[s.dayOfWeek]}`;
  }

  function formatTime(h: number, m: number): string {
    const period = h < 12 ? "pagi" : h < 15 ? "siang" : h < 18 ? "sore" : "malam";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  }

  function getRecipientNames(s: ScheduledReport): string {
    if (s.recipientIds.length === 0) return "Tidak ada penerima";
    const names = s.recipientIds
      .map((id) => recipients.find((r) => r.id === id)?.name ?? "?")
      .slice(0, 2);
    const more = s.recipientIds.length > 2 ? ` +${s.recipientIds.length - 2}` : "";
    return names.join(", ") + more;
  }

  function getNextRunLabel(s: ScheduledReport): string {
    try {
      const next = new Date(s.nextRunAt);
      const now = new Date();
      const diffMs = next.getTime() - now.getTime();
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      const diffDays = Math.round(diffHours / 24);

      if (diffMs <= 0) return "Sudah jatuh tempo";
      if (diffHours < 24) return `Dalam ~${diffHours} jam`;
      return `Dalam ~${diffDays} hari`;
    } catch {
      return s.nextRunAt;
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold">Jadwal Otomatis</h3>
          <p className="text-xs text-muted-foreground">
            {schedules.filter((s) => s.isActive).length} aktif · {schedules.filter((s) => (s as ScheduledReport & { isDue?: boolean }).isDue).length} menunggu
          </p>
        </div>
        <Button size="sm" onClick={onAdd} className="rounded-xl">
          <Plus className="size-4" /> Tambah
        </Button>
      </div>

      {schedules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Calendar className="mx-auto size-10 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-medium">Belum ada jadwal</p>
            <p className="text-xs text-muted-foreground">Atur pengiriman laporan otomatis</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {schedules.map((s) => {
            const isDue = (s as ScheduledReport & { isDue?: boolean }).isDue;
            return (
              <Card key={s.id} className={cn("border-0 shadow-sm", !s.isActive && "opacity-70", isDue && "ring-2 ring-amber-300")}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold">{s.name}</p>
                        {isDue && (
                          <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">
                            <Bell className="size-2.5" /> Jatuh tempo
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" /> {formatSchedule(s)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" /> {formatTime(s.hour, s.minute)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onToggle(s.id, s.isActive)}
                      className={cn(
                        "shrink-0 rounded-lg p-1.5 transition-all",
                        s.isActive
                          ? "text-emerald-500 hover:bg-emerald-50"
                          : "text-muted-foreground hover:bg-secondary",
                      )}
                      aria-label="Toggle aktif"
                    >
                      <Power className="size-4" />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-[11px]">
                    <Users className="size-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{getRecipientNames(s)}</span>
                  </div>

                  {s.template && (
                    <div className="mt-1 flex items-center gap-2 text-[11px]">
                      <FileText className="size-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{s.template.name}</span>
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between">
                    <span className={cn("text-[11px] font-medium", isDue ? "text-amber-600" : "text-muted-foreground")}>
                      {getNextRunLabel(s)}
                    </span>
                    {s.isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onTrigger(s.id)}
                        disabled={sending}
                        className="h-8 rounded-xl text-xs"
                      >
                        <Send className="size-3" /> Kirim Sekarang
                      </Button>
                    )}
                  </div>

                  <button
                    onClick={() => onDelete(s.id)}
                    className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3" /> Hapus jadwal
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="border-0 shadow-sm bg-blue-50/50">
        <CardContent className="flex items-start gap-2 p-3.5">
          <AlertCircle className="size-4 shrink-0 mt-0.5 text-blue-500" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Catatan:</strong> Karena ini PWA, pengiriman otomatis
            terjadi saat aplikasi dibuka. Pastikan buka aplikasi tepat waktu untuk pengiriman terjadwal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// =========================================================================
// Sub-view: Preview
// =========================================================================
function PreviewView({
  preview,
  loading,
  templates,
  onTemplateChange,
  onSend,
  sending,
}: {
  preview: string;
  loading: boolean;
  templates: WhatsAppTemplate[];
  onTemplateChange: (id: string) => void;
  onSend: () => void;
  sending: boolean;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-bold">Preview Pesan</h3>
        <p className="text-xs text-muted-foreground">Lihat hasil substitusi variabel</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-select">Pilih Template</Label>
        <Select
          value={selectedTemplate}
          onValueChange={(v) => {
            setSelectedTemplate(v);
            onTemplateChange(v);
          }}
        >
          <SelectTrigger className="h-11 rounded-2xl">
            <SelectValue placeholder="Default" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
                {t.isDefault && " (default)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          {loading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-foreground">
              {preview || "Belum ada preview."}
            </pre>
          )}
        </CardContent>
      </Card>

      <Button onClick={onSend} disabled={sending} className="w-full h-12 rounded-2xl bg-[#25D366] text-white hover:bg-[#1ebe5d]">
        {sending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Menyiapkan...
          </>
        ) : (
          <>
            <Send className="size-4" /> Buka WhatsApp
          </>
        )}
      </Button>

      {/* Variables reference */}
      <Card className="border-0 shadow-sm bg-secondary/50">
        <CardContent className="p-4">
          <p className="mb-2 text-xs font-semibold">Variabel yang Tersedia</p>
          <div className="space-y-1">
            {TEMPLATE_VARIABLES.map((v) => (
              <div key={v.name} className="flex items-start justify-between gap-2 text-[11px]">
                <code className="rounded bg-background px-1.5 py-0.5 font-mono text-primary">{`{{${v.name}}}`}</code>
                <span className="text-right text-muted-foreground">{v.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =========================================================================
// Sheet: Template Form (add/edit)
// =========================================================================
function TemplateFormSheet({
  open,
  onOpenChange,
  editTemplate,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editTemplate: WhatsAppTemplate | null;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [reportType, setReportType] = useState<"monthly" | "weekly" | "custom">("monthly");
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      if (editTemplate) {
        setName(editTemplate.name);
        setBody(editTemplate.body);
        setReportType(editTemplate.reportType);
        setIsDefault(editTemplate.isDefault);
      } else {
        setName("");
        setBody("");
        setReportType("monthly");
        setIsDefault(false);
      }
    }
  }, [open, editTemplate]);

  function insertVariable(varName: string) {
    setBody((prev) => `${prev}{{${varName}}}`);
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast({ title: "Nama wajib diisi", variant: "destructive" });
      return;
    }
    if (!body.trim()) {
      toast({ title: "Isi pesan wajib diisi", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const url = "/api/whatsapp/templates";
      const method = editTemplate ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editTemplate ? { id: editTemplate.id } : {}),
          name: name.trim(),
          body,
          reportType,
          isDefault,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Gagal menyimpan");
      }
      toast({
        title: editTemplate ? "Template diperbarui" : "Template ditambahkan",
        description: name.trim(),
      });
      onSuccess();
    } catch (err) {
      toast({
        title: "Gagal menyimpan",
        description: err instanceof Error ? err.message : "Coba lagi.",
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
          <SheetTitle>{editTemplate ? "Edit Template" : "Template Baru"}</SheetTitle>
          <SheetDescription className="sr-only">
            Buat atau edit template pesan WhatsApp dengan variabel.
          </SheetDescription>
        </SheetHeader>

        <div className="px-5 pb-4 space-y-4 overflow-y-auto thin-scrollbar" style={{ maxHeight: "60vh" }}>
          <div className="space-y-2">
            <Label htmlFor="tpl-name">Nama Template</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Laporan Bulanan"
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tpl-type">Tipe</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as typeof reportType)}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Bulanan</SelectItem>
                  <SelectItem value="weekly">Mingguan</SelectItem>
                  <SelectItem value="custom">Kustom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default</Label>
              <button
                type="button"
                onClick={() => setIsDefault(!isDefault)}
                className={cn(
                  "flex h-11 w-full items-center justify-between rounded-2xl px-4 text-sm",
                  isDefault ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground",
                )}
              >
                <span>{isDefault ? "Aktif" : "Nonaktif"}</span>
                <div className={cn("flex size-6 items-center rounded-full p-0.5 transition-all", isDefault ? "bg-primary" : "bg-muted")}>
                  <div className={cn("size-5 rounded-full bg-white transition-all", isDefault ? "translate-x-0" : "-translate-x-0")} />
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tpl-body">Isi Pesan</Label>
            <Textarea
              id="tpl-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tulis pesan di sini. Gunakan {{variabel}} untuk substitusi."
              className="min-h-[160px] resize-none rounded-2xl font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              {body.length} karakter · WhatsApp batas ~65.000 karakter
            </p>
          </div>

          {/* Variable inserter */}
          <div className="space-y-2">
            <Label>Sisipkan Variabel</Label>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_VARIABLES.slice(0, 8).map((v) => (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => insertVariable(v.name)}
                  className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-mono text-primary hover:bg-accent"
                  title={v.label}
                >
                  {`{{${v.name}}}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="border-t bg-card px-5 py-3">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-12 w-full rounded-2xl font-semibold"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Menyimpan...
              </>
            ) : editTemplate ? (
              "Simpan Perubahan"
            ) : (
              "Tambah Template"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// =========================================================================
// Sheet: Recipient Form
// =========================================================================
function RecipientFormSheet({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<RecipientRole>("spouse");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setName("");
      setPhone("");
      setRole("spouse");
    }
  }, [open]);

  async function handleSubmit() {
    if (!name.trim()) {
      toast({ title: "Nama wajib diisi", variant: "destructive" });
      return;
    }
    if (!phone.trim()) {
      toast({ title: "Nomor telepon wajib diisi", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/whatsapp/recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), role }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Gagal menyimpan");
      }
      toast({ title: "Penerima ditambahkan", description: name.trim() });
      onSuccess();
    } catch (err) {
      toast({
        title: "Gagal menyimpan",
        description: err instanceof Error ? err.message : "Coba lagi.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const roleOptions: { value: RecipientRole; label: string }[] = [
    { value: "spouse", label: "Pasangan" },
    { value: "self", label: "Diri Sendiri" },
    { value: "family", label: "Keluarga" },
    { value: "other", label: "Lainnya" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] p-0 sm:max-w-md sm:mx-auto sm:rounded-t-2xl sm:rounded-b-2xl sm:mb-6 sm:border">
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle>Tambah Penerima</SheetTitle>
          <SheetDescription className="sr-only">
            Tambahkan kontak penerima laporan WhatsApp.
          </SheetDescription>
        </SheetHeader>

        <div className="px-5 pb-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rec-name">Nama</Label>
            <Input
              id="rec-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Istri (Dewi)"
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rec-phone">Nomor Telepon</Label>
            <Input
              id="rec-phone"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="6281234567890 atau 081234567890"
              className="h-11 rounded-2xl"
            />
            <p className="text-[11px] text-muted-foreground">
              Format: kode negara + nomor (62 untuk Indonesia)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Peran</Label>
            <div className="grid grid-cols-4 gap-2">
              {roleOptions.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={cn(
                    "rounded-2xl py-2 text-xs font-medium transition-all",
                    role === r.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="border-t bg-card px-5 py-3">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-12 w-full rounded-2xl font-semibold"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Menyimpan...
              </>
            ) : (
              "Tambah Penerima"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// =========================================================================
// Sheet: Schedule Form
// =========================================================================
function ScheduleFormSheet({
  open,
  onOpenChange,
  templates,
  recipients,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  templates: WhatsAppTemplate[];
  recipients: WhatsAppRecipient[];
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<ScheduleFrequency>("monthly");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [templateId, setTemplateId] = useState<string>("");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setName("");
      setFrequency("monthly");
      setDayOfMonth(1);
      setDayOfWeek(1);
      setHour(8);
      setMinute(0);
      setTemplateId(templates.find((t) => t.isDefault)?.id ?? "");
      setSelectedRecipients([]);
    }
  }, [open, templates]);

  function toggleRecipient(id: string) {
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast({ title: "Nama jadwal wajib diisi", variant: "destructive" });
      return;
    }
    if (selectedRecipients.length === 0) {
      toast({ title: "Pilih minimal satu penerima", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/whatsapp/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          frequency,
          dayOfWeek: frequency === "monthly" ? dayOfMonth : dayOfWeek,
          hour,
          minute,
          templateId: templateId || null,
          recipientIds: selectedRecipients,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Gagal membuat jadwal");
      }
      toast({ title: "Jadwal dibuat", description: name.trim() });
      onSuccess();
    } catch (err) {
      toast({
        title: "Gagal menyimpan",
        description: err instanceof Error ? err.message : "Coba lagi.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const activeRecipients = recipients.filter((r) => r.isActive);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] p-0 sm:max-w-md sm:mx-auto sm:rounded-t-2xl sm:rounded-b-2xl sm:mb-6 sm:border">
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle>Jadwal Baru</SheetTitle>
          <SheetDescription className="sr-only">
            Atur jadwal pengiriman laporan otomatis.
          </SheetDescription>
        </SheetHeader>

        <div className="px-5 pb-4 space-y-4 overflow-y-auto thin-scrollbar" style={{ maxHeight: "60vh" }}>
          <div className="space-y-2">
            <Label htmlFor="sch-name">Nama Jadwal</Label>
            <Input
              id="sch-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Laporan Bulanan Otomatis"
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Frekuensi</Label>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
              <button
                type="button"
                onClick={() => setFrequency("monthly")}
                className={cn(
                  "rounded-xl py-2 text-sm font-medium transition-all",
                  frequency === "monthly" ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
              >
                Bulanan
              </button>
              <button
                type="button"
                onClick={() => setFrequency("weekly")}
                className={cn(
                  "rounded-xl py-2 text-sm font-medium transition-all",
                  frequency === "weekly" ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
              >
                Mingguan
              </button>
            </div>
          </div>

          {frequency === "monthly" ? (
            <div className="space-y-2">
              <Label htmlFor="sch-day">Tanggal setiap bulan</Label>
              <Select value={String(dayOfMonth)} onValueChange={(v) => setDayOfMonth(Number(v))}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      Tanggal {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Hari dalam minggu</Label>
              <div className="grid grid-cols-7 gap-1">
                {dayNames.map((d, idx) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDayOfWeek(idx)}
                    className={cn(
                      "aspect-square rounded-xl text-xs font-medium transition-all",
                      dayOfWeek === idx
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sch-hour">Jam</Label>
              <Select value={String(hour)} onValueChange={(v) => setHour(Number(v))}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {String(h).padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sch-min">Menit</Label>
              <Select value={String(minute)} onValueChange={(v) => setMinute(Number(v))}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 15, 30, 45].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {String(m).padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sch-tpl">Template (opsional)</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="Default (otomatis)" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.isDefault && " (default)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Penerima ({selectedRecipients.length} dipilih)</Label>
            {activeRecipients.length === 0 ? (
              <p className="rounded-2xl bg-secondary p-3 text-xs text-muted-foreground">
                Belum ada penerima aktif. Tambahkan dulu di tab Penerima.
              </p>
            ) : (
              <div className="space-y-1.5">
                {activeRecipients.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleRecipient(r.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all",
                      selectedRecipients.includes(r.id)
                        ? "bg-primary/10 ring-1 ring-primary/30"
                        : "bg-secondary hover:bg-accent",
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-all",
                        selectedRecipients.includes(r.id)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30",
                      )}
                    >
                      {selectedRecipients.includes(r.id) && <Check className="size-3" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="text-[11px] text-muted-foreground">{formatPhoneDisplay(r.phone)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="border-t bg-card px-5 py-3">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-12 w-full rounded-2xl font-semibold"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Menyimpan...
              </>
            ) : (
              "Buat Jadwal"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
