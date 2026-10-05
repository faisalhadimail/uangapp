import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { todayISO } from "@/lib/format";
import { hashPassword } from "@/lib/auth";

/**
 * POST /api/seed
 *
 * Seeds the database with realistic Indonesian family finance sample data:
 *   - 4 accounts (Bank BCA, Bank Mandiri, GoPay, Dompet Tunai)
 *   - 7 income categories, 11 expense categories
 *   - ~30 transactions across the current and previous month
 *
 * Idempotent: if there are already transactions, it returns a "already_seeded" message
 * without duplicating.
 */
export async function POST() {
  try {
    // Skip seeding for tables that already have data (idempotent)
    const hasTransactions = (await db.transaction.count()) > 0;
    const hasBudgets = (await db.budget.count()) > 0;
    const hasSavings = (await db.saving.count()) > 0;
    const hasBills = (await db.bill.count()) > 0;
    const hasDebts = (await db.debt.count()) > 0;
    const hasTemplates = (await db.whatsAppTemplate.count()) > 0;
    const hasRecipients = (await db.whatsAppRecipient.count()) > 0;
    const hasSchedules = (await db.scheduledReport.count()) > 0;
    const hasMembers = (await db.familyMember.count()) > 0;
    const hasTargets = (await db.financialTarget.count()) > 0;
    const hasUsers = (await db.user.count()) > 0;

    if (
      hasTransactions &&
      hasBudgets &&
      hasSavings &&
      hasBills &&
      hasDebts &&
      hasTemplates &&
      hasRecipients &&
      hasSchedules &&
      hasMembers &&
      hasTargets &&
      hasUsers
    ) {
      return NextResponse.json({
        seeded: false,
        message: "Database sudah lengkap (Tahap 1 + 2 + 3 + 4 + 5 + Auth). Seed dilewati.",
      });
    }

    // --- Auth: Create default user (always check, early) -------------------
    if (!hasUsers) {
      await db.user.create({
        data: {
          email: "admin@keluarga.id",
          name: "Admin Keluarga",
          passwordHash: hashPassword("admin123"),
        },
      });
    }

    // --- Accounts (create if missing) -------------------------------------
    let bca, mandiri, gopay, cash;
    if (hasTransactions) {
      // Load existing accounts
      const accs = await db.account.findMany();
      bca = accs.find((a) => a.name === "Bank BCA") ?? accs[0];
      mandiri = accs.find((a) => a.name === "Bank Mandiri") ?? accs[1];
      gopay = accs.find((a) => a.name === "GoPay") ?? accs[2];
      cash = accs.find((a) => a.name === "Dompet Tunai") ?? accs[3];
    } else {
      [bca, mandiri, gopay, cash] = await Promise.all([
        db.account.create({ data: { name: "Bank BCA", type: "bank", initialBalance: 5_000_000 } }),
        db.account.create({ data: { name: "Bank Mandiri", type: "bank", initialBalance: 12_000_000 } }),
        db.account.create({ data: { name: "GoPay", type: "ewallet", initialBalance: 250_000 } }),
        db.account.create({ data: { name: "Dompet Tunai", type: "cash", initialBalance: 500_000 } }),
      ]);
    }

    // --- Categories (create if missing) ----------------------------------
    let incomeCategories: Awaited<ReturnType<typeof db.category.create>>[] = [];
    let expenseCategories: Awaited<ReturnType<typeof db.category.create>>[] = [];

    if (hasTransactions) {
      const existingCats = await db.category.findMany();
      incomeCategories = existingCats.filter((c) => c.type === "income");
      expenseCategories = existingCats.filter((c) => c.type === "expense");
    } else {
      const incomeCats = [
        { name: "Gaji", color: "#10b981", icon: "Wallet" },
        { name: "Bonus", color: "#14b8a6", icon: "Gift" },
        { name: "Uang Saku", color: "#22c55e", icon: "Coins" },
        { name: "Freelance", color: "#0ea5e9", icon: "Laptop" },
        { name: "Investasi", color: "#06b6d4", icon: "TrendingUp" },
        { name: "Penjualan", color: "#84cc16", icon: "ShoppingBag" },
        { name: "Lainnya", color: "#94a3b8", icon: "Plus" },
      ];

      const expenseCats = [
        { name: "Makan & Minum", color: "#f97316", icon: "UtensilsCrossed" },
        { name: "Belanja Bulanan", color: "#eab308", icon: "ShoppingCart" },
        { name: "Transportasi", color: "#3b82f6", icon: "Car" },
        { name: "Listrik & Air", color: "#facc15", icon: "Zap" },
        { name: "Internet & HP", color: "#06b6d4", icon: "Wifi" },
        { name: "Sekolah Anak", color: "#8b5cf6", icon: "GraduationCap" },
        { name: "Kesehatan", color: "#ec4899", icon: "HeartPulse" },
        { name: "Hiburan", color: "#a855f7", icon: "Tv" },
        { name: "Donasi", color: "#10b981", icon: "HandHeart" },
        { name: "Cicilan", color: "#ef4444", icon: "CreditCard" },
        { name: "Lainnya", color: "#94a3b8", icon: "Receipt" },
      ];

      incomeCategories = await Promise.all(
        incomeCats.map((c) => db.category.create({ data: { ...c, type: "income" } })),
      );
      expenseCategories = await Promise.all(
        expenseCats.map((c) => db.category.create({ data: { ...c, type: "expense" } })),
      );
    }

    const catByName = (name: string, type: "income" | "expense") =>
      (type === "income" ? incomeCategories : expenseCategories).find((c) => c.name === name)!;

    // --- Date helpers ------------------------------------------------------
    const todayDate = new Date();
    const isoOf = (day: number, monthOffset = 0) => {
      const d = new Date(todayDate.getFullYear(), todayDate.getMonth() - monthOffset, day);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };

    // --- Transactions (only if not yet seeded) ---------------------------
    if (!hasTransactions) {
      // ...txnDefs remain defined here
      const txnDefs: Array<{
        type: "income" | "expense" | "transfer";
        amount: number;
        desc: string;
        catName?: string;
        day: number;
        monthOffset?: number;
        accId: string;
        toAccId?: string;
      }> = [
        // Monthly salary (current month)
        { type: "income", amount: 12_500_000, desc: "Gaji bulanan", catName: "Gaji", day: 1, accId: bca.id },
        { type: "income", amount: 8_000_000, desc: "Gaji istri", catName: "Gaji", day: 1, accId: mandiri.id },
        { type: "income", amount: 1_500_000, desc: "Proyek desain logo", catName: "Freelance", day: 5, accId: gopay.id },
        { type: "income", amount: 350_000, desc: "Jual kue lebaran", catName: "Penjualan", day: 8, accId: cash.id },
        { type: "income", amount: 250_000, desc: "Dividen reksadana", catName: "Investasi", day: 10, accId: mandiri.id },

        // Regular expenses
        { type: "expense", amount: 1_850_000, desc: "Belanja bulanan Indomaret", catName: "Belanja Bulanan", day: 2, accId: bca.id },
        { type: "expense", amount: 25_000, desc: "Sarapan bubur ayam", catName: "Makan & Minum", day: 2, accId: cash.id },
        { type: "expense", amount: 18_000, desc: "Ojek online ke kantor", catName: "Transportasi", day: 3, accId: gopay.id },
        { type: "expense", amount: 45_000, desc: "Makan siang warteg", catName: "Makan & Minum", day: 3, accId: cash.id },
        { type: "expense", amount: 425_000, desc: "Tagihan listrik PLN", catName: "Listrik & Air", day: 4, accId: bca.id },
        { type: "expense", amount: 350_000, desc: "Paket internet IndiHome", catName: "Internet & HP", day: 4, accId: bca.id },
        { type: "expense", amount: 150_000, desc: "Pulsa & paket data", catName: "Internet & HP", day: 5, accId: gopay.id },
        { type: "expense", amount: 750_000, desc: "SPP bulanan SD", catName: "Sekolah Anak", day: 6, accId: mandiri.id },
        { type: "expense", amount: 320_000, desc: "Vitamin & obat", catName: "Kesehatan", day: 7, accId: cash.id },
        { type: "expense", amount: 32_000, desc: "Kopi siang", catName: "Makan & Minum", day: 7, accId: gopay.id },
        { type: "expense", amount: 200_000, desc: "Bensin motor seminggu", catName: "Transportasi", day: 9, accId: cash.id },
        { type: "expense", amount: 250_000, desc: "Infaq masjid", catName: "Donasi", day: 10, accId: bca.id },
        { type: "expense", amount: 175_000, desc: "Tiket bioskop keluarga", catName: "Hiburan", day: 11, accId: gopay.id },
        { type: "expense", amount: 95_000, desc: "Makan malam ayam geprek", catName: "Makan & Minum", day: 12, accId: cash.id },
        { type: "expense", amount: 2_450_000, desc: "Cicilan KPR", catName: "Cicilan", day: 14, accId: bca.id },
        { type: "expense", amount: 680_000, desc: "Cicilan motor", catName: "Cicilan", day: 14, accId: mandiri.id },
        { type: "expense", amount: 38_000, desc: "Pulsa & paket data", catName: "Internet & HP", day: 15, accId: gopay.id },

        // Transfers
        { type: "transfer", amount: 1_000_000, desc: "Tarik tunai ATM", day: 6, accId: bca.id, toAccId: cash.id },
        { type: "transfer", amount: 300_000, desc: "Top up GoPay", day: 8, accId: bca.id, toAccId: gopay.id },

        // Most recent day (today)
        { type: "expense", amount: 22_000, desc: "Sarapan nasi uduk", catName: "Makan & Minum", day: todayDate.getDate(), accId: cash.id },
        { type: "expense", amount: 15_000, desc: "GoPay ke kantor", catName: "Transportasi", day: todayDate.getDate(), accId: gopay.id },
        { type: "expense", amount: 38_000, desc: "Makan siang", catName: "Makan & Minum", day: todayDate.getDate(), accId: cash.id },

        // Previous month expenses (for trend comparison)
        { type: "income", amount: 12_500_000, desc: "Gaji bulan lalu", catName: "Gaji", day: 1, monthOffset: 1, accId: bca.id },
        { type: "income", amount: 8_000_000, desc: "Gaji istri bulan lalu", catName: "Gaji", day: 1, monthOffset: 1, accId: mandiri.id },
        { type: "expense", amount: 1_920_000, desc: "Belanja bulan lalu", catName: "Belanja Bulanan", day: 3, monthOffset: 1, accId: bca.id },
        { type: "expense", amount: 410_000, desc: "Listrik bulan lalu", catName: "Listrik & Air", day: 4, monthOffset: 1, accId: bca.id },
        { type: "expense", amount: 350_000, desc: "Internet bulan lalu", catName: "Internet & HP", day: 4, monthOffset: 1, accId: bca.id },
        { type: "expense", amount: 2_450_000, desc: "Cicilan KPR bulan lalu", catName: "Cicilan", day: 14, monthOffset: 1, accId: bca.id },
        { type: "expense", amount: 720_000, desc: "Cicilan motor bulan lalu", catName: "Cicilan", day: 14, monthOffset: 1, accId: mandiri.id },
      ];

      for (const t of txnDefs) {
        const date = t.monthOffset ? isoOf(t.day, t.monthOffset) : isoOf(t.day);
        // Avoid future dates in current month
        const d = new Date(date);
        if (d > todayDate) continue;

        await db.transaction.create({
          data: {
            type: t.type,
            amount: t.amount,
            description: t.desc,
            date,
            categoryId: t.catName ? catByName(t.catName, t.type as "income" | "expense").id : null,
            accountId: t.accId,
            toAccountId: t.toAccId ?? null,
          },
        });
      }
    }

    const counts = {
      accounts: await db.account.count(),
      categories: await db.category.count(),
      transactions: await db.transaction.count(),
      budgets: await db.budget.count(),
      savings: await db.saving.count(),
      bills: await db.bill.count(),
      debts: await db.debt.count(),
      templates: await db.whatsAppTemplate.count(),
      recipients: await db.whatsAppRecipient.count(),
      schedules: await db.scheduledReport.count(),
      members: await db.familyMember.count(),
      notifications: await db.notification.count(),
    };

    // --- Tahap 2: Budgets (per expense category) ---------------------------
    if (!hasBudgets) {
      const budgetDefs: Array<{ catName: string; amount: number }> = [
        { catName: "Makan & Minum", amount: 1_500_000 },
        { catName: "Belanja Bulanan", amount: 2_000_000 },
        { catName: "Transportasi", amount: 800_000 },
        { catName: "Listrik & Air", amount: 500_000 },
        { catName: "Internet & HP", amount: 500_000 },
        { catName: "Hiburan", amount: 400_000 },
        { catName: "Sekolah Anak", amount: 1_000_000 },
        { catName: "Kesehatan", amount: 500_000 },
      ];
      for (const b of budgetDefs) {
        const cat = catByName(b.catName, "expense");
        await db.budget.create({ data: { categoryId: cat.id, amount: b.amount } });
      }
    }

    // --- Tahap 2: Savings (targets + dana darurat) ------------------------
    if (!hasSavings) {
      const inMonths = (n: number) => {
        const d = new Date();
        d.setMonth(d.getMonth() + n);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      };
      const savingDefs = [
        { name: "Dana Darurat", type: "emergency" as const, target: 30_000_000, current: 12_500_000, targetDate: null, color: "#ef4444", icon: "ShieldCheck" },
        { name: "Liburan Akhir Tahun", type: "goal" as const, target: 15_000_000, current: 4_200_000, targetDate: inMonths(3), color: "#0ea5e9", icon: "Plane" },
        { name: "DP Mobil", type: "goal" as const, target: 50_000_000, current: 18_750_000, targetDate: inMonths(12), color: "#8b5cf6", icon: "Car" },
        { name: "Biaya Pendidikan Anak", type: "goal" as const, target: 25_000_000, current: 9_800_000, targetDate: inMonths(6), color: "#10b981", icon: "GraduationCap" },
        { name: "Renovasi Dapur", type: "goal" as const, target: 8_000_000, current: 2_500_000, targetDate: inMonths(4), color: "#f97316", icon: "Home" },
      ];
      for (const s of savingDefs) {
        await db.saving.create({
          data: {
            name: s.name,
            type: s.type,
            targetAmount: s.target,
            currentAmount: s.current,
            targetDate: s.targetDate,
            color: s.color,
            icon: s.icon,
          },
        });
      }
    }

    // --- Tahap 2: Bills (cicilan, langganan, utilitas) --------------------
    if (!hasBills) {
      const billDefs = [
        { name: "Cicilan KPR", amount: 2_450_000, dueDay: 14, color: "#ef4444", icon: "Home" },
        { name: "Cicilan Motor", amount: 680_000, dueDay: 14, color: "#ef4444", icon: "Car" },
        { name: "Listrik PLN", amount: 425_000, dueDay: 10, color: "#facc15", icon: "Zap" },
        { name: "Internet IndiHome", amount: 350_000, dueDay: 5, color: "#06b6d4", icon: "Wifi" },
        { name: "PDAM Air", amount: 180_000, dueDay: 8, color: "#0ea5e9", icon: "Droplets" },
        { name: "Netflix", amount: 65_000, dueDay: 20, color: "#a855f7", icon: "Tv" },
        { name: "Spotify Family", amount: 90_000, dueDay: 22, color: "#22c55e", icon: "Music" },
        { name: "Asuransi Kesehatan", amount: 450_000, dueDay: 25, color: "#ec4899", icon: "HeartPulse" },
        { name: "BPJS Kesehatan", amount: 150_000, dueDay: 28, color: "#3b82f6", icon: "ShieldPlus" },
      ];
      const currentMonth = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}`;
      for (const b of billDefs) {
        const bill = await db.bill.create({
          data: {
            name: b.name,
            amount: b.amount,
            dueDay: b.dueDay,
            recurrence: "monthly",
            color: b.color,
            icon: b.icon,
          },
        });
        // Mark bills with dueDay before today as paid (for current month)
        if (b.dueDay < todayDate.getDate()) {
          await db.paidBill.create({
            data: { billId: bill.id, month: currentMonth },
          });
        }
      }
    }

    // --- Tahap 2: Debts & Receivables -------------------------------------
    if (!hasDebts) {
      const inMonths = (n: number) => {
        const d = new Date();
        d.setMonth(d.getMonth() + n);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      };
      const debtDefs = [
        // Debts (kita yang berhutang)
        { type: "debt" as const, person: "Bank BCA (Kartu Kredit)", amount: 3_500_000, desc: "Tagihan kartu kredit bulan lalu", dueDate: inMonths(0) },
        { type: "debt" as const, person: "Budi (Teman Kantor)", amount: 500_000, desc: "Pinjaman untuk acara kantor", dueDate: inMonths(1) },
        { type: "debt" as const, person: "Ibu Sari", amount: 1_200_000, desc: "Utang arisan", dueDate: inMonths(2) },
        { type: "debt" as const, person: "Toko Elektronik Jaya", amount: 2_000_000, desc: "Cicilan kulkas (sisa 2x)", dueDate: todayISO(), isPaid: false },

        // Receivables (orang lain berhutang ke kita)
        { type: "receivable" as const, person: "Andi (Adik)", amount: 1_500_000, desc: "Bantu ongkos pindah", dueDate: inMonths(1) },
        { type: "receivable" as const, person: "Sinta (Mertua)", amount: 2_000_000, desc: "Beli obat bulan lalu", dueDate: inMonths(0) },
        { type: "receivable" as const, person: "Pak Joko (Tetangga)", amount: 250_000, desc: "Beli pulsa", dueDate: null, isPaid: true, paidDate: todayISO() },
      ];
      for (const d of debtDefs) {
        await db.debt.create({
          data: {
            type: d.type,
            personName: d.person,
            amount: d.amount,
            description: d.desc,
            dueDate: d.dueDate,
            isPaid: "isPaid" in d ? d.isPaid : false,
            paidDate: "paidDate" in d ? d.paidDate ?? null : null,
          },
        });
      }
    }

    // --- Tahap 3: WhatsApp Templates -------------------------------------
    if (!hasTemplates) {
      const templates = [
        {
          name: "Laporan Bulanan Lengkap",
          body: `*Laporan Keuangan {{nama_keluarga}}*

*Bulan:* {{bulan}}

*Ringkasan:*
• Saldo: {{saldo}}
• Pemasukan: {{pemasukan}}
• Pengeluaran: {{pengeluaran}}
• Arus Kas: {{arus_kas}}

*Pengeluaran Terbesar:*
{{top_kategori}}

*Status:*
• Tagihan belum dibayar: {{tagihan_belum}}
• Utang aktif: {{utang}}
• Piutang aktif: {{piutang}}
• Tabungan terkumpul: {{tabungan}}

_Dikirim otomatis dari Catatan Keuangan Keluarga_`,
          reportType: "monthly",
          isDefault: true,
        },
        {
          name: "Update Mingguan Singkat",
          body: `*Update Mingguan {{nama_keluarga}}*

Per {{bulan}}:
• Saldo: {{saldo}}
• Pemasukan: {{pemasukan}}
• Pengeluaran: {{pengeluaran}}
• Arus Kas: {{arus_kas}}

Top pengeluaran:
{{top_kategori}}

_Dari Catatan Keuangan Keluarga_`,
          reportType: "weekly",
          isDefault: false,
        },
        {
          name: "Pengingat Tagihan",
          body: `*Pengingat Tagihan {{nama_keluarga}}*

Bulan: {{bulan}}

Saat ini ada:
{{tagihan_belum}}

Saldo tersedia: {{saldo}}

_Segera lakukan pembayaran ya!_`,
          reportType: "custom",
          isDefault: false,
        },
      ];
      for (const t of templates) {
        await db.whatsAppTemplate.create({ data: t });
      }
    }

    // --- Tahap 3: WhatsApp Recipients ------------------------------------
    let recipientIds: string[] = [];
    if (!hasRecipients) {
      const recipients = [
        { name: "Istri (Dewi)", phone: "6281234567890", role: "spouse" },
        { name: "Diri Sendiri", phone: "6281298765432", role: "self" },
        { name: "Bunda (Ibu)", phone: "6281112223334", role: "family" },
      ];
      const created = await Promise.all(
        recipients.map((r) => db.whatsAppRecipient.create({ data: r })),
      );
      recipientIds = created.map((r) => r.id);
    } else {
      const existing = await db.whatsAppRecipient.findMany({ take: 3 });
      recipientIds = existing.map((r) => r.id);
    }

    // --- Tahap 3: Scheduled Reports -------------------------------------
    if (!hasSchedules) {
      const defaultTemplate = await db.whatsAppTemplate.findFirst({ where: { isDefault: true } });
      const weeklyTemplate = await db.whatsAppTemplate.findFirst({ where: { reportType: "weekly" } });

      const { computeNextRun } = await import("@/lib/whatsapp");

      // Monthly report: every 1st of month at 8:00
      await db.scheduledReport.create({
        data: {
          name: "Laporan Bulanan Otomatis",
          frequency: "monthly",
          dayOfWeek: 1,
          hour: 8,
          minute: 0,
          nextRunAt: computeNextRun("monthly", 1, 8, 0),
          isActive: true,
          templateId: defaultTemplate?.id ?? null,
          recipientIds: recipientIds.join("|"),
        },
      });

      // Weekly update: every Monday at 19:00
      await db.scheduledReport.create({
        data: {
          name: "Update Mingguan Senin Malam",
          frequency: "weekly",
          dayOfWeek: 1, // Monday
          hour: 19,
          minute: 0,
          nextRunAt: computeNextRun("weekly", 1, 19, 0),
          isActive: true,
          templateId: weeklyTemplate?.id ?? null,
          recipientIds: recipientIds.slice(0, 2).join("|"),
        },
      });

      // Inactive example
      await db.scheduledReport.create({
        data: {
          name: "Pengingat Tagihan (nonaktif)",
          frequency: "monthly",
          dayOfWeek: 25,
          hour: 9,
          minute: 0,
          nextRunAt: computeNextRun("monthly", 25, 9, 0),
          isActive: false,
          templateId: null,
          recipientIds: recipientIds[0] ?? "",
        },
      });
    }

    // --- Tahap 4: Family Members ------------------------------------------
    let memberIds: { admin: string; spouse: string; child: string } = { admin: "", spouse: "", child: "" };
    if (!hasMembers) {
      const members = [
        { name: "Budi (Suami)", role: "admin", color: "#0ea5e9", avatar: "B", isCurrentUser: true },
        { name: "Dewi (Istri)", role: "admin", color: "#ec4899", avatar: "D", isCurrentUser: false },
        { name: "Rara (Anak)", role: "viewer", color: "#f59e0b", avatar: "R", isCurrentUser: false },
      ];
      const created = await Promise.all(
        members.map((m) => db.familyMember.create({ data: m })),
      );
      memberIds = {
        admin: created[0].id,
        spouse: created[1].id,
        child: created[2].id,
      };

      // Assign member attribution to existing transactions (alternating)
      const allTxns = await db.transaction.findMany({ select: { id: true } });
      for (let i = 0; i < allTxns.length; i++) {
        const memberId = i % 2 === 0 ? memberIds.admin : memberIds.spouse;
        await db.transaction.update({
          where: { id: allTxns[i].id },
          data: { memberId },
        });
      }

      // Generate initial notifications
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/notifications/generate`, {
          method: "POST",
        });
      } catch (e) {
        console.error("Failed to generate notifications during seed:", e);
      }
    } else {
      const existing = await db.familyMember.findMany();
      const admin = existing.find((m) => m.role === "admin");
      const spouse = existing.filter((m) => m.role === "admin")[1] ?? existing[1];
      const child = existing.find((m) => m.role === "viewer") ?? existing[2];
      memberIds = {
        admin: admin?.id ?? "",
        spouse: spouse?.id ?? "",
        child: child?.id ?? "",
      };
    }

    // --- Tahap 5: Financial Targets ---------------------------------------
    if (!hasTargets) {
      const inMonths = (n: number) => {
        const d = new Date();
        d.setMonth(d.getMonth() + n);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      };
      const targets = [
        {
          name: "Bebas Utang Kartu Kredit",
          type: "debt_free" as const,
          targetAmount: 3_500_000,
          currentAmount: 0,
          targetDate: inMonths(3),
          monthlyContribution: 1_200_000,
          color: "#ef4444",
          icon: "CreditCard",
        },
        {
          name: "Dana Darurat 6 Bulan",
          type: "emergency_fund" as const,
          targetAmount: 30_000_000,
          currentAmount: 12_500_000,
          targetDate: inMonths(18),
          monthlyContribution: 1_000_000,
          color: "#f59e0b",
          icon: "ShieldCheck",
        },
        {
          name: "Dana Pendidikan Anak SMP",
          type: "education" as const,
          targetAmount: 50_000_000,
          currentAmount: 9_800_000,
          targetDate: inMonths(36),
          monthlyContribution: 1_200_000,
          color: "#8b5cf6",
          icon: "GraduationCap",
        },
        {
          name: "Dana Pensiun Dini",
          type: "retirement" as const,
          targetAmount: 500_000_000,
          currentAmount: 47_750_000,
          targetDate: inMonths(180),
          monthlyContribution: 3_000_000,
          color: "#10b981",
          icon: "PiggyBank",
        },
      ];
      for (const t of targets) {
        await db.financialTarget.create({ data: t });
      }
    }

    return NextResponse.json({
      seeded: true,
      message: "Data contoh berhasil dimuat (Tahap 1 + 2 + 3 + 4 + 5 + Auth).",
      counts,
    });
  } catch (error) {
    console.error("POST /api/seed error:", error);
    return NextResponse.json({ error: "Gagal memuat data contoh" }, { status: 500 });
  }
}
