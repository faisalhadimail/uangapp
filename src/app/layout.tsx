import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Catatan Keuangan Keluarga — Tahap 5",
  description: "Aplikasi keuangan keluarga lengkap dengan analisis keuangan cerdas, target finansial, backup/restore, scan struk OCR, multi-anggota dengan hak akses, notifikasi cerdas, anggaran, tabungan, tagihan, utang, dan integrasi WhatsApp.",
  keywords: ["keuangan keluarga", "pencatat pengeluaran", "anggaran", "tabungan", "tagihan", "utang", "whatsapp", "multi-anggota", "notifikasi", "analisis keuangan", "scan struk", "backup", "indonesia"],
  authors: [{ name: "Family Finance" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Catatan Keuangan Keluarga",
    description: "Catat pemasukan, pengeluaran, dan transfer antar rekening keluarga.",
    siteName: "Catatan Keuangan Keluarga",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
