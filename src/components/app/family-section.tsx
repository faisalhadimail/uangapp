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
  UserPlus,
  Trash2,
  Loader2,
  Shield,
  Pencil,
  Users,
  Crown,
  Eye,
  Edit3,
  Check,
  UserCheck,
} from "lucide-react";
import { ROLE_PERMISSIONS } from "./types";
import type { FamilyMember, MemberRole } from "./types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MEMBER_COLORS = [
  "#0ea5e9", "#ec4899", "#f59e0b", "#10b981",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316",
];

interface FamilySectionProps {
  onRefresh?: () => void;
}

export function FamilySection({ onRefresh }: FamilySectionProps) {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editMember, setEditMember] = useState<FamilyMember | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/family/members");
      if (!res.ok) throw new Error("Gagal");
      const data = await res.json();
      setMembers(data.members as FamilyMember[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function handleSetCurrentUser(member: FamilyMember) {
    try {
      const res = await fetch("/api/family/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, isCurrentUser: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Gagal");
      }
      toast({
        title: "Beralih pengguna",
        description: `Sekarang sebagai ${member.name}`,
      });
      loadMembers();
      onRefresh?.();
    } catch (err) {
      toast({
        title: "Gagal beralih",
        description: err instanceof Error ? err.message : "Coba lagi nanti.",
        variant: "destructive",
      });
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/family/members?id=${deleteId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Gagal menghapus");
      }
      toast({ title: "Anggota dihapus" });
      loadMembers();
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

  const adminCount = members.filter((m) => m.role === "admin").length;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Keluarga</h2>
          <p className="text-sm text-muted-foreground">
            {members.length} anggota · {adminCount} admin
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditMember(null); setAddOpen(true); }} className="rounded-xl">
          <UserPlus className="size-4" /> Tambah
        </Button>
      </div>

      {/* Current user card */}
      {!loading && members.find((m) => m.isCurrentUser) && (
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-primary/80 p-4 text-primary-foreground">
            <div className="flex items-center gap-3">
              <Avatar className="size-12 rounded-2xl border-2 border-white/30">
                <AvatarFallback
                  className="rounded-2xl bg-white/20 text-base font-bold text-white"
                >
                  {members.find((m) => m.isCurrentUser)?.avatar || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wide text-white/70">Pengguna Saat Ini</p>
                <p className="text-base font-bold">
                  {members.find((m) => m.isCurrentUser)?.name}
                </p>
                <p className="text-xs text-white/80">
                  {ROLE_PERMISSIONS[members.find((m) => m.isCurrentUser)?.role ?? "viewer"].label}
                </p>
              </div>
              <UserCheck className="size-5 text-white/70" />
            </div>
          </div>
        </Card>
      )}

      {/* Members list */}
      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Users className="size-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">Belum ada anggota</p>
            <p className="text-xs text-muted-foreground">Tambahkan anggota keluarga pertama</p>
            <Button onClick={() => setAddOpen(true)} size="sm" className="mt-1 rounded-xl">
              <UserPlus className="size-4" /> Tambah Anggota
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <ul className="divide-y">
              {members.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  onEdit={() => {
                    setEditMember(m);
                    setAddOpen(true);
                  }}
                  onSetCurrent={() => handleSetCurrentUser(m)}
                  onDelete={() => setDeleteId(m.id)}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Role permissions reference */}
      <Card className="border-0 shadow-sm bg-secondary/50">
        <CardContent className="p-4">
          <p className="mb-3 text-sm font-semibold">Peran & Hak Akses</p>
          <div className="space-y-2.5">
            {(Object.entries(ROLE_PERMISSIONS) as Array<[MemberRole, typeof ROLE_PERMISSIONS.admin]>).map(([role, perms]) => {
              const Icon = role === "admin" ? Crown : role === "editor" ? Edit3 : Eye;
              const color = role === "admin" ? "#f59e0b" : role === "editor" ? "#0ea5e9" : "#94a3b8";
              return (
                <div key={role} className="flex items-start gap-2.5">
                  <div
                    className="flex size-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${color}22`, color }}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold">{perms.label}</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{perms.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit sheet */}
      <MemberFormSheet
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) setEditMember(null);
        }}
        editMember={editMember}
        onSuccess={() => {
          loadMembers();
          setAddOpen(false);
          setEditMember(null);
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus anggota ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Anggota akan dihapus permanen. Transaksi yang dicatat oleh anggota ini tetap ada, namun tidak lagi terkait ke anggota manapun.
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

function MemberRow({
  member,
  onEdit,
  onSetCurrent,
  onDelete,
}: {
  member: FamilyMember;
  onEdit: () => void;
  onSetCurrent: () => void;
  onDelete: () => void;
}) {
  const perms = ROLE_PERMISSIONS[member.role];
  const Icon = member.role === "admin" ? Crown : member.role === "editor" ? Edit3 : Eye;

  return (
    <li className="group flex items-center gap-3 px-4 py-3">
      <Avatar className="size-11 rounded-xl">
        <AvatarFallback
          className="rounded-xl text-sm font-bold"
          style={{ backgroundColor: `${member.color}22`, color: member.color }}
        >
          {member.avatar || member.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold">{member.name}</p>
          {member.isCurrentUser && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
              Anda
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Icon className="size-3" style={{ color: member.color }} />
          <span>{perms.label}</span>
          <span>·</span>
          <span>{member.transactionCount ?? 0} transaksi</span>
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        {!member.isCurrentUser && (
          <button
            onClick={onSetCurrent}
            className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
            aria-label="Jadikan pengguna saat ini"
            title="Beralih ke pengguna ini"
          >
            <UserCheck className="size-4" />
          </button>
        )}
        <button
          onClick={onEdit}
          className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
          aria-label="Edit"
        >
          <Pencil className="size-4" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
          aria-label="Hapus"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </li>
  );
}

function MemberFormSheet({
  open,
  onOpenChange,
  editMember,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editMember: FamilyMember | null;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<MemberRole>("editor");
  const [color, setColor] = useState(MEMBER_COLORS[0]);
  const [avatar, setAvatar] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      if (editMember) {
        setName(editMember.name);
        setRole(editMember.role);
        setColor(editMember.color);
        setAvatar(editMember.avatar);
      } else {
        setName("");
        setRole("editor");
        setColor(MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)]);
        setAvatar("");
      }
    }
  }, [open, editMember]);

  async function handleSubmit() {
    if (!name.trim()) {
      toast({ title: "Nama wajib diisi", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const finalAvatar = avatar.trim() || name.trim().charAt(0).toUpperCase();
      const method = editMember ? "PATCH" : "POST";
      const body = editMember
        ? { id: editMember.id, name: name.trim(), role, color, avatar: finalAvatar }
        : { name: name.trim(), role, color, avatar: finalAvatar };

      const res = await fetch("/api/family/members", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Gagal menyimpan");
      }
      toast({
        title: editMember ? "Anggota diperbarui" : "Anggota ditambahkan",
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

  const roleOptions: { value: MemberRole; label: string; icon: typeof Crown }[] = [
    { value: "admin", label: "Admin", icon: Crown },
    { value: "editor", label: "Editor", icon: Edit3 },
    { value: "viewer", label: "Pengamat", icon: Eye },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] p-0 sm:max-w-md sm:mx-auto sm:rounded-t-2xl sm:rounded-b-2xl sm:mb-6 sm:border">
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle>{editMember ? "Edit Anggota" : "Tambah Anggota"}</SheetTitle>
          <SheetDescription className="sr-only">
            Tambah atau edit anggota keluarga dengan peran dan hak akses.
          </SheetDescription>
        </SheetHeader>

        <div className="px-5 pb-4 space-y-5 overflow-y-auto thin-scrollbar" style={{ maxHeight: "60vh" }}>
          {/* Preview */}
          <div className="flex items-center justify-center py-2">
            <Avatar className="size-20 rounded-3xl">
              <AvatarFallback
                className="rounded-3xl text-2xl font-bold"
                style={{ backgroundColor: `${color}22`, color }}
              >
                {avatar || name.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mem-name">Nama</Label>
            <Input
              id="mem-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Budi (Suami)"
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mem-avatar">Avatar (1 huruf/emoji, opsional)</Label>
            <Input
              id="mem-avatar"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value.slice(0, 2))}
              placeholder={name.charAt(0).toUpperCase() || "?"}
              className="h-11 rounded-2xl text-center text-lg font-bold"
              maxLength={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Peran</Label>
            <div className="grid grid-cols-3 gap-2">
              {roleOptions.map((r) => {
                const Icon = r.icon;
                const active = role === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-2xl py-3 text-xs font-medium transition-all",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-5" />
                    {r.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {ROLE_PERMISSIONS[role].description}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Warna Avatar</Label>
            <div className="flex flex-wrap gap-2">
              {MEMBER_COLORS.map((c) => (
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
            ) : editMember ? (
              "Simpan Perubahan"
            ) : (
              "Tambah Anggota"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
