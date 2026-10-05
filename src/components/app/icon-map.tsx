"use client";

import {
  Wallet,
  Gift,
  Coins,
  Laptop,
  TrendingUp,
  ShoppingBag,
  Plus,
  UtensilsCrossed,
  ShoppingCart,
  Car,
  Zap,
  Wifi,
  GraduationCap,
  HeartPulse,
  Tv,
  HandHeart,
  CreditCard,
  Receipt,
  Briefcase,
  PiggyBank,
  Landmark,
  Smartphone,
  Banknote,
  HelpCircle,
  ShieldCheck,
  Plane,
  Droplets,
  Music,
  ShieldPlus,
  Home,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Wallet,
  Gift,
  Coins,
  Laptop,
  TrendingUp,
  ShoppingBag,
  Plus,
  UtensilsCrossed,
  ShoppingCart,
  Car,
  Zap,
  Wifi,
  GraduationCap,
  HeartPulse,
  Tv,
  HandHeart,
  CreditCard,
  Receipt,
  Briefcase,
  PiggyBank,
  Landmark,
  Smartphone,
  Banknote,
  HelpCircle,
  ShieldCheck,
  Plane,
  Droplets,
  Music,
  ShieldPlus,
  Home,
};

export function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Wallet;
}

/**
 * Render-safe icon component: takes a name and props and renders the matching
 * Lucide icon. Use this inside other components instead of `const Icon = getIcon(...)`
 * to satisfy the `react-hooks/static-components` lint rule.
 */
export function CategoryIcon({ name, ...props }: { name: string } & React.ComponentProps<LucideIcon>) {
  const Icon = ICON_MAP[name] ?? Wallet;
  return <Icon {...props} />;
}

export const ICON_CHOICES: { name: string; label: string }[] = [
  { name: "Wallet", label: "Dompet" },
  { name: "Gift", label: "Hadiah" },
  { name: "Coins", label: "Koin" },
  { name: "Laptop", label: "Laptop" },
  { name: "TrendingUp", label: "Investasi" },
  { name: "ShoppingBag", label: "Belanja" },
  { name: "Plus", label: "Lainnya" },
  { name: "UtensilsCrossed", label: "Makan" },
  { name: "ShoppingCart", label: "Keranjang" },
  { name: "Car", label: "Mobil" },
  { name: "Zap", label: "Listrik" },
  { name: "Wifi", label: "Internet" },
  { name: "GraduationCap", label: "Sekolah" },
  { name: "HeartPulse", label: "Kesehatan" },
  { name: "Tv", label: "Hiburan" },
  { name: "HandHeart", label: "Donasi" },
  { name: "CreditCard", label: "Kartu" },
  { name: "Receipt", label: "Struk" },
  { name: "Briefcase", label: "Kerja" },
  { name: "PiggyBank", label: "Celengan" },
  { name: "Landmark", label: "Bank" },
  { name: "Smartphone", label: "HP" },
  { name: "Banknote", label: "Tunai" },
  { name: "ShieldCheck", label: "Dana Darurat" },
  { name: "Plane", label: "Liburan" },
  { name: "Droplets", label: "Air" },
  { name: "Music", label: "Musik" },
  { name: "ShieldPlus", label: "Asuransi" },
  { name: "Home", label: "Rumah" },
];

export const COLOR_CHOICES = [
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#84cc16", // lime
  "#22c55e", // green
  "#eab308", // yellow
  "#f97316", // orange
  "#ef4444", // red
  "#ec4899", // pink
  "#a855f7", // purple
  "#8b5cf6", // violet
  "#64748b", // slate
];
