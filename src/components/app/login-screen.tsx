"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, Mail, Lock, User, Loader2, Eye, EyeOff, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LoginScreenProps {
  onSuccess: (user: { id: string; email: string; name: string; familyMemberId: string | null }) => void;
}

type Mode = "login" | "register";

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Pre-fill demo credentials for convenience
  useEffect(() => {
    setEmail("admin@keluarga.id");
    setPassword("admin123");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast({ title: "Lengkapi email dan password", variant: "destructive" });
      return;
    }
    if (mode === "register" && !name.trim()) {
      toast({ title: "Nama wajib diisi", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email: email.trim().toLowerCase(), password }
          : { email: email.trim().toLowerCase(), password, name: name.trim() };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Gagal");
      }

      const data = await res.json();
      toast({
        title: mode === "login" ? "Berhasil login" : "Akun dibuat",
        description: `Selamat datang, ${data.user.name}!`,
      });
      onSuccess(data.user);
    } catch (err) {
      toast({
        title: mode === "login" ? "Gagal login" : "Gagal daftar",
        description: err instanceof Error ? err.message : "Coba lagi nanti.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-20 size-64 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 size-64 rounded-full bg-cyan-200/40 blur-3xl" />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Logo & Title */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-xl shadow-emerald-500/30">
            <Wallet className="size-10" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Catatan Keuangan Keluarga
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola keuangan keluarga dengan mudah
          </p>
        </div>

        {/* Login/Register Card */}
        <Card className="w-full max-w-sm border-0 shadow-xl shadow-emerald-500/5">
          <CardContent className="p-6">
            {/* Mode tabs */}
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={cn(
                  "rounded-xl py-2 text-sm font-medium transition-all",
                  mode === "login" ? "bg-background shadow-sm text-primary" : "text-muted-foreground",
                )}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={cn(
                  "rounded-xl py-2 text-sm font-medium transition-all",
                  mode === "register" ? "bg-background shadow-sm text-primary" : "text-muted-foreground",
                )}
              >
                Daftar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name (register only) */}
              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nama</Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama Anda"
                      className="h-12 rounded-2xl pl-10"
                      autoComplete="name"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@keluarga.id"
                    className="h-12 rounded-2xl pl-10"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 rounded-2xl pl-10 pr-10"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-2xl text-base font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Memproses...
                  </>
                ) : mode === "login" ? (
                  "Masuk"
                ) : (
                  "Daftar Sekarang"
                )}
              </Button>
            </form>

            {/* Demo credentials hint */}
            {mode === "login" && (
              <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-xs">
                <p className="flex items-center gap-1.5 font-medium text-emerald-700">
                  <Sparkles className="size-3.5" />
                  Akun Demo
                </p>
                <p className="mt-1 text-emerald-600">
                  Email: <code className="font-mono">admin@keluarga.id</code>
                </p>
                <p className="text-emerald-600">
                  Password: <code className="font-mono">admin123</code>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features preview */}
        <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span>📊 Analisis Keuangan</span>
          <span>💬 WhatsApp</span>
          <span>👥 Multi-Anggota</span>
          <span>🔔 Notifikasi</span>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Sesi login tersimpan selama 7 hari
        </p>
      </div>
    </div>
  );
}
