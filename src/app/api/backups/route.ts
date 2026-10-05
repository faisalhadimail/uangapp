import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/backups
 * Returns all backup records, most recent first.
 */
export async function GET() {
  try {
    const backups = await db.backupRecord.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ backups });
  } catch (error) {
    console.error("GET /api/backups error:", error);
    return NextResponse.json({ error: "Gagal memuat riwayat backup" }, { status: 500 });
  }
}

/**
 * POST /api/backups
 * Body: { action: "create" | "restore", note? } for create
 *       { action: "restore", data: {...} } for restore
 *
 * Create: exports all data as JSON, saves a BackupRecord, returns download URL.
 * Restore: takes JSON data and restores to database (replaces existing).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, note, data } = body ?? {};

    if (action === "create") {
      // Export all data
      const exportData = await exportAllData();
      const jsonStr = JSON.stringify(exportData, null, 2);
      const sizeBytes = new Blob([jsonStr]).size;
      const recordCount =
        exportData.accounts.length +
        exportData.categories.length +
        exportData.transactions.length +
        exportData.budgets.length +
        exportData.savings.length +
        exportData.bills.length +
        exportData.debts.length +
        exportData.members.length;

      const now = new Date();
      const filename = `keuangan-keluarga-backup-${now.toISOString().slice(0, 19).replace(/[T:]/g, "-")}.json`;

      const backup = await db.backupRecord.create({
        data: {
          createdAt: now.toISOString(),
          filename,
          sizeBytes,
          recordCount,
          trigger: "manual",
          note: typeof note === "string" ? note : null,
        },
      });

      return NextResponse.json({
        backup,
        downloadData: exportData,
        downloadJson: jsonStr,
        downloadFilename: filename,
      });
    }

    if (action === "restore") {
      if (!data || typeof data !== "object") {
        return NextResponse.json({ error: "Data backup tidak valid" }, { status: 400 });
      }
      // Restore is destructive — clear existing data then re-insert.
      // Note: This is a simplified restore for demo purposes.
      const result = await restoreAllData(data);
      return NextResponse.json({
        success: true,
        restored: result,
      });
    }

    return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/backups error:", error);
    return NextResponse.json({ error: "Gagal memproses backup" }, { status: 500 });
  }
}

/**
 * DELETE /api/backups?id=ID
 * Removes a backup record (does not affect actual data).
 */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }
    await db.backupRecord.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/backups error:", error);
    return NextResponse.json({ error: "Gagal menghapus backup" }, { status: 500 });
  }
}

async function exportAllData() {
  const [
    accounts,
    categories,
    transactions,
    budgets,
    savings,
    bills,
    paidBills,
    debts,
    members,
    notifications,
    whatsappTemplates,
    whatsappRecipients,
    scheduledReports,
    financialTargets,
  ] = await Promise.all([
    db.account.findMany(),
    db.category.findMany(),
    db.transaction.findMany(),
    db.budget.findMany(),
    db.saving.findMany(),
    db.bill.findMany(),
    db.paidBill.findMany(),
    db.debt.findMany(),
    db.familyMember.findMany(),
    db.notification.findMany(),
    db.whatsAppTemplate.findMany(),
    db.whatsAppRecipient.findMany(),
    db.scheduledReport.findMany(),
    db.financialTarget.findMany(),
  ]);

  return {
    version: "5.0",
    exportedAt: new Date().toISOString(),
    accounts,
    categories,
    transactions: transactions.map((t) => ({
      ...t,
      // Strip relation fields
      category: undefined,
      account: undefined,
      toAccount: undefined,
      member: undefined,
    })),
    budgets,
    savings,
    bills,
    paidBills,
    debts,
    members,
    notifications,
    whatsappTemplates,
    whatsappRecipients,
    scheduledReports,
    financialTargets,
  };
}

async function restoreAllData(data: any) {
  // Clear all data (in dependency order to avoid FK constraint issues)
  await db.notification.deleteMany();
  await db.scheduledReportLog.deleteMany();
  await db.scheduledReport.deleteMany();
  await db.whatsAppRecipient.deleteMany();
  await db.whatsAppTemplate.deleteMany();
  await db.paidBill.deleteMany();
  await db.bill.deleteMany();
  await db.debt.deleteMany();
  await db.saving.deleteMany();
  await db.budget.deleteMany();
  await db.transaction.deleteMany();
  await db.category.deleteMany();
  await db.account.deleteMany();
  await db.familyMember.deleteMany();
  await db.financialTarget.deleteMany();
  await db.backupRecord.deleteMany();

  // Re-insert (in dependency order)
  let counts: Record<string, number> = {};

  if (Array.isArray(data.accounts)) {
    for (const a of data.accounts) {
      await db.account.create({ data: { id: a.id, name: a.name, type: a.type, initialBalance: a.initialBalance, createdAt: a.createdAt, updatedAt: a.updatedAt } });
    }
    counts.accounts = data.accounts.length;
  }

  if (Array.isArray(data.categories)) {
    for (const c of data.categories) {
      await db.category.create({ data: { id: c.id, name: c.name, type: c.type, color: c.color, icon: c.icon, createdAt: c.createdAt, updatedAt: c.updatedAt } });
    }
    counts.categories = data.categories.length;
  }

  if (Array.isArray(data.members)) {
    for (const m of data.members) {
      await db.familyMember.create({ data: { id: m.id, name: m.name, role: m.role, color: m.color, avatar: m.avatar, isActive: m.isActive, isCurrentUser: m.isCurrentUser, createdAt: m.createdAt, updatedAt: m.updatedAt } });
    }
    counts.members = data.members.length;
  }

  if (Array.isArray(data.transactions)) {
    for (const t of data.transactions) {
      try {
        await db.transaction.create({
          data: {
            id: t.id,
            type: t.type,
            amount: t.amount,
            description: t.description,
            date: t.date,
            categoryId: t.categoryId || null,
            accountId: t.accountId,
            toAccountId: t.toAccountId || null,
            memberId: t.memberId || null,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
          },
        });
      } catch (e) {
        // Skip records with invalid FK references
      }
    }
    counts.transactions = data.transactions.length;
  }

  if (Array.isArray(data.budgets)) {
    for (const b of data.budgets) {
      try {
        await db.budget.create({ data: { id: b.id, categoryId: b.categoryId, amount: b.amount, createdAt: b.createdAt, updatedAt: b.updatedAt } });
      } catch (e) {}
    }
    counts.budgets = data.budgets.length;
  }

  if (Array.isArray(data.savings)) {
    for (const s of data.savings) {
      await db.saving.create({ data: { id: s.id, name: s.name, type: s.type, targetAmount: s.targetAmount, currentAmount: s.currentAmount, targetDate: s.targetDate, color: s.color, icon: s.icon, createdAt: s.createdAt, updatedAt: s.updatedAt } });
    }
    counts.savings = data.savings.length;
  }

  if (Array.isArray(data.bills)) {
    for (const b of data.bills) {
      await db.bill.create({ data: { id: b.id, name: b.name, amount: b.amount, dueDay: b.dueDay, recurrence: b.recurrence, color: b.color, icon: b.icon, isActive: b.isActive, createdAt: b.createdAt, updatedAt: b.updatedAt } });
    }
    counts.bills = data.bills.length;
  }

  if (Array.isArray(data.debts)) {
    for (const d of data.debts) {
      await db.debt.create({ data: { id: d.id, type: d.type, personName: d.personName, amount: d.amount, description: d.description, dueDate: d.dueDate, isPaid: d.isPaid, paidDate: d.paidDate, createdAt: d.createdAt, updatedAt: d.updatedAt } });
    }
    counts.debts = data.debts.length;
  }

  if (Array.isArray(data.financialTargets)) {
    for (const t of data.financialTargets) {
      await db.financialTarget.create({ data: { id: t.id, name: t.name, type: t.type, targetAmount: t.targetAmount, currentAmount: t.currentAmount, targetDate: t.targetDate, monthlyContribution: t.monthlyContribution, color: t.color, icon: t.icon, isActive: t.isActive, createdAt: t.createdAt, updatedAt: t.updatedAt } });
    }
    counts.financialTargets = data.financialTargets.length;
  }

  return counts;
}
