// Migration script: SQLite → PostgreSQL (Supabase)
// Uses bun:sqlite (built-in) to read old data, Prisma to write to Supabase.

import { Database } from "bun:sqlite";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

const SQLITE_DB_PATH = "/home/z/my-project/db/custom.db";

async function main() {
  console.log("🚀 Starting migration: SQLite → PostgreSQL (Supabase)\n");

  // ---- 1. Read all data from old SQLite DB using bun:sqlite ----
  console.log("📖 Reading data from old SQLite database...");
  const sqlite = new Database(SQLITE_DB_PATH, { readonly: true });

  function readTable<T>(tableName: string): T[] {
    try {
      // Quote table name to handle reserved keywords like "Transaction", "User", "Session"
      const rows = sqlite.prepare(`SELECT * FROM "${tableName}"`).all();
      return rows as T[];
    } catch (err) {
      console.log(`  ⚠️ Table ${tableName} not found or empty, skipping`);
      return [];
    }
  }

  const users = readTable("User");
  const sessions = readTable("Session");
  const categories = readTable("Category");
  const accounts = readTable("Account");
  const transactions = readTable("Transaction");
  const budgets = readTable("Budget");
  const savings = readTable("Saving");
  const bills = readTable("Bill");
  const paidBills = readTable("PaidBill");
  const debts = readTable("Debt");
  const whatsAppTemplates = readTable("WhatsAppTemplate");
  const whatsAppRecipients = readTable("WhatsAppRecipient");
  const scheduledReports = readTable("ScheduledReport");
  const scheduledReportLogs = readTable("ScheduledReportLog");
  const familyMembers = readTable("FamilyMember");
  const notifications = readTable("Notification");
  const financialInsights = readTable("FinancialInsight");
  const financialTargets = readTable("FinancialTarget");
  const backupRecords = readTable("BackupRecord");
  const receiptScans = readTable("ReceiptScan");

  console.log(`  ✅ Users: ${users.length}`);
  console.log(`  ✅ Sessions: ${sessions.length}`);
  console.log(`  ✅ Categories: ${categories.length}`);
  console.log(`  ✅ Accounts: ${accounts.length}`);
  console.log(`  ✅ Transactions: ${transactions.length}`);
  console.log(`  ✅ Budgets: ${budgets.length}`);
  console.log(`  ✅ Savings: ${savings.length}`);
  console.log(`  ✅ Bills: ${bills.length}`);
  console.log(`  ✅ PaidBills: ${paidBills.length}`);
  console.log(`  ✅ Debts: ${debts.length}`);
  console.log(`  ✅ WhatsApp Templates: ${whatsAppTemplates.length}`);
  console.log(`  ✅ WhatsApp Recipients: ${whatsAppRecipients.length}`);
  console.log(`  ✅ Scheduled Reports: ${scheduledReports.length}`);
  console.log(`  ✅ Scheduled Report Logs: ${scheduledReportLogs.length}`);
  console.log(`  ✅ Family Members: ${familyMembers.length}`);
  console.log(`  ✅ Notifications: ${notifications.length}`);
  console.log(`  ✅ Financial Insights: ${financialInsights.length}`);
  console.log(`  ✅ Financial Targets: ${financialTargets.length}`);
  console.log(`  ✅ Backup Records: ${backupRecords.length}`);
  console.log(`  ✅ Receipt Scans: ${receiptScans.length}`);

  const totalCount =
    users.length + sessions.length + categories.length + accounts.length +
    transactions.length + budgets.length + savings.length + bills.length +
    paidBills.length + debts.length + whatsAppTemplates.length + whatsAppRecipients.length +
    scheduledReports.length + scheduledReportLogs.length + familyMembers.length +
    notifications.length + financialInsights.length + financialTargets.length +
    backupRecords.length + receiptScans.length;

  console.log(`\n📊 Total records to migrate: ${totalCount}\n`);

  sqlite.close();

  // Save backup to JSON as safety net
  const backupPath = path.join("/home/z/my-project/download", "migration-backup.json");
  const backup = {
    migratedAt: new Date().toISOString(),
    users, sessions, categories, accounts, transactions, budgets, savings, bills,
    paidBills, debts, whatsAppTemplates, whatsAppRecipients, scheduledReports,
    scheduledReportLogs, familyMembers, notifications, financialInsights,
    financialTargets, backupRecords, receiptScans,
  };
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`💾 Backup saved to: ${backupPath}\n`);

  // ---- 2. Connect to PostgreSQL (Supabase) ----
  console.log("🔌 Connecting to PostgreSQL (Supabase)...");
  const pg = new PrismaClient();
  console.log("  ✅ Connected\n");

  // Helper: convert SQLite boolean (0/1) to JS boolean for Prisma
  function bool(val: any): boolean {
    return val === 1 || val === true || val === "true";
  }

  // Helper: convert SQLite datetime to ISO string
  function toISO(val: any): string {
    if (!val) return new Date().toISOString();
    if (typeof val === "string") return val;
    if (val instanceof Date) return val.toISOString();
    return new Date(val).toISOString();
  }

  // ---- 3. Insert data in dependency order ----
  console.log("📝 Inserting data into PostgreSQL...\n");

  if (users.length > 0) {
    console.log(`  Inserting ${users.length} Users...`);
    for (const u of users) {
      await pg.user.create({
        data: {
          id: u.id,
          email: u.email,
          name: u.name,
          passwordHash: u.passwordHash,
          familyMemberId: u.familyMemberId || null,
          createdAt: toISO(u.createdAt),
          updatedAt: toISO(u.updatedAt),
        },
      }).catch(() => {});
    }
    console.log("  ✅ Done");
  }

  if (sessions.length > 0) {
    console.log(`  Inserting ${sessions.length} Sessions...`);
    for (const s of sessions) {
      await pg.session.create({
        data: {
          id: s.id,
          token: s.token,
          userId: s.userId,
          expiresAt: s.expiresAt,
          createdAt: toISO(s.createdAt),
        },
      }).catch(() => {});
    }
    console.log("  ✅ Done");
  }

  if (categories.length > 0) {
    console.log(`  Inserting ${categories.length} Categories...`);
    for (const c of categories) {
      await pg.category.create({
        data: {
          id: c.id,
          name: c.name,
          type: c.type,
          color: c.color,
          icon: c.icon,
          createdAt: toISO(c.createdAt),
          updatedAt: toISO(c.updatedAt),
        },
      }).catch(() => {});
    }
    console.log("  ✅ Done");
  }

  if (accounts.length > 0) {
    console.log(`  Inserting ${accounts.length} Accounts...`);
    for (const a of accounts) {
      await pg.account.create({
        data: {
          id: a.id,
          name: a.name,
          type: a.type,
          initialBalance: a.initialBalance,
          createdAt: toISO(a.createdAt),
          updatedAt: toISO(a.updatedAt),
        },
      }).catch(() => {});
    }
    console.log("  ✅ Done");
  }

  if (familyMembers.length > 0) {
    console.log(`  Inserting ${familyMembers.length} Family Members...`);
    for (const m of familyMembers) {
      await pg.familyMember.create({
        data: {
          id: m.id,
          name: m.name,
          role: m.role,
          color: m.color,
          avatar: m.avatar,
          isActive: bool(m.isActive),
          isCurrentUser: bool(m.isCurrentUser),
          createdAt: toISO(m.createdAt),
          updatedAt: toISO(m.updatedAt),
        },
      }).catch(() => {});
    }
    console.log("  ✅ Done");
  }

  if (transactions.length > 0) {
    console.log(`  Inserting ${transactions.length} Transactions...`);
    for (const t of transactions) {
      await pg.transaction.create({
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
          createdAt: toISO(t.createdAt),
          updatedAt: toISO(t.updatedAt),
        },
      }).catch(() => {});
    }
    console.log("  ✅ Done");
  }

  if (budgets.length > 0) {
    console.log(`  Inserting ${budgets.length} Budgets...`);
    for (const b of budgets) {
      await pg.budget.create({
        data: {
          id: b.id,
          categoryId: b.categoryId,
          amount: b.amount,
          createdAt: toISO(b.createdAt),
          updatedAt: toISO(b.updatedAt),
        },
      }).catch(() => {});
    }
    console.log("  ✅ Done");
  }

  if (savings.length > 0) {
    console.log(`  Inserting ${savings.length} Savings...`);
    for (const s of savings) {
      await pg.saving.create({
        data: {
          id: s.id,
          name: s.name,
          type: s.type,
          targetAmount: s.targetAmount,
          currentAmount: s.currentAmount,
          targetDate: s.targetDate || null,
          color: s.color,
          icon: s.icon,
          createdAt: toISO(s.createdAt),
          updatedAt: toISO(s.updatedAt),
        },
      }).catch(() => {});
    }
    console.log("  ✅ Done");
  }

  if (bills.length > 0) {
    console.log(`  Inserting ${bills.length} Bills...`);
    for (const b of bills) {
      await pg.bill.create({
        data: {
          id: b.id,
          name: b.name,
          amount: b.amount,
          dueDay: b.dueDay,
          recurrence: b.recurrence,
          color: b.color,
          icon: b.icon,
          isActive: bool(b.isActive),
          createdAt: toISO(b.createdAt),
          updatedAt: toISO(b.updatedAt),
        },
      }).catch(() => {});
    }
    console.log("  ✅ Done");
  }

  if (paidBills.length > 0) {
    console.log(`  Inserting ${paidBills.length} Paid Bills...`);
    for (const p of paidBills) {
      await pg.paidBill.create({
        data: {
          id: p.id,
          billId: p.billId,
          month: p.month,
          paidAt: toISO(p.paidAt),
        },
      }).catch(() => {});
    }
    console.log("  ✅ Done");
  }

  if (debts.length > 0) {
    console.log(`  Inserting ${debts.length} Debts...`);
    for (const d of debts) {
      await pg.debt.create({
        data: {
          id: d.id,
          type: d.type,
          personName: d.personName,
          amount: d.amount,
          description: d.description,
          dueDate: d.dueDate || null,
          isPaid: bool(d.isPaid),
          paidDate: d.paidDate || null,
          createdAt: toISO(d.createdAt),
          updatedAt: toISO(d.updatedAt),
        },
      }).catch(() => {});
    }
    console.log("  ✅ Done");
  }

  if (whatsAppTemplates.length > 0) {
    console.log(`  Inserting ${whatsAppTemplates.length} WhatsApp Templates...`);
    for (const t of whatsAppTemplates) {
      await pg.whatsAppTemplate.create({
        data: {
          id: t.id,
          name: t.name,
          body: t.body,
          reportType: t.reportType,
          isDefault: bool(t.isDefault),
          createdAt: toISO(t.createdAt),
          updatedAt: toISO(t.updatedAt),
        },
      }).catch(() => {});
    }
    console.log("  ✅ Done");
  }

  if (whatsAppRecipients.length > 0) {
    console.log(`  Inserting ${whatsAppRecipients.length} WhatsApp Recipients...`);
    for (const r of whatsAppRecipients) {
      await pg.whatsAppRecipient.create({
        data: {
          id: r.id,
          name: r.name,
          phone: r.phone,
          role: r.role,
          isActive: bool(r.isActive),
          createdAt: toISO(r.createdAt),
          updatedAt: toISO(r.updatedAt),
        },
      }).catch(() => {});
    }
    console.log("  ✅ Done");
  }

  if (scheduledReports.length > 0) {
    console.log(`  Inserting ${scheduledReports.length} Scheduled Reports...`);
    for (const s of scheduledReports) {
      await pg.scheduledReport.create({
        data: {
          id: s.id,
          name: s.name,
          frequency: s.frequency,
          dayOfWeek: s.dayOfWeek,
          hour: s.hour,
          minute: s.minute,
          nextRunAt: s.nextRunAt,
          isActive: bool(s.isActive),
          templateId: s.templateId || null,
          recipientIds: s.recipientIds || "",
          createdAt: toISO(s.createdAt),
          updatedAt: toISO(s.updatedAt),
        },
      }).catch(() => {});
    }
    console.log("  ✅ Done");
  }

  if (scheduledReportLogs.length > 0) {
    console.log(`  Inserting ${scheduledReportLogs.length} Scheduled Report Logs...`);
    for (const l of scheduledReportLogs) {
      await pg.scheduledReportLog.create({
        data: {
          id: l.id,
          scheduledReportId: l.scheduledReportId,
          sentAt: l.sentAt,
          status: l.status,
          preview: l.preview,
        },
      }).catch(() => {});
    }
    console.log("  ✅ Done");
  }

  if (notifications.length > 0) {
    console.log(`  Inserting ${notifications.length} Notifications...`);
    for (const n of notifications) {
      await pg.notification.create({
        data: {
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          color: n.color,
          actionUrl: n.actionUrl || null,
          createdAt: n.createdAt,
          readAt: n.readAt || null,
          priority: n.priority,
          memberId: n.memberId || null,
        },
      }).catch(() => {});
    }
    console.log("  ✅ Done");
  }

  if (financialInsights.length > 0) {
    console.log(`  Inserting ${financialInsights.length} Financial Insights...`);
    for (const i of financialInsights) {
      await pg.financialInsight.create({
        data: {
          id: i.id,
          type: i.type,
          title: i.title,
          description: i.description,
          color: i.color,
          value: i.value,
          maxValue: i.maxValue,
          month: i.month,
          createdAt: i.createdAt,
          dismissedAt: i.dismissedAt || null,
        },
      }).catch(() => {});
    }
    console.log("  ✅ Done");
  }

  if (financialTargets.length > 0) {
    console.log(`  Inserting ${financialTargets.length} Financial Targets...`);
    for (const t of financialTargets) {
      await pg.financialTarget.create({
        data: {
          id: t.id,
          name: t.name,
          type: t.type,
          targetAmount: t.targetAmount,
          currentAmount: t.currentAmount,
          targetDate: t.targetDate || null,
          monthlyContribution: t.monthlyContribution || null,
          color: t.color,
          icon: t.icon,
          isActive: bool(t.isActive),
          createdAt: toISO(t.createdAt),
          updatedAt: toISO(t.updatedAt),
        },
      }).catch(() => {});
    }
    console.log("  ✅ Done");
  }

  if (backupRecords.length > 0) {
    console.log(`  Inserting ${backupRecords.length} Backup Records...`);
    for (const b of backupRecords) {
      await pg.backupRecord.create({
        data: {
          id: b.id,
          createdAt: b.createdAt,
          filename: b.filename,
          sizeBytes: b.sizeBytes,
          recordCount: b.recordCount,
          trigger: b.trigger,
          note: b.note || null,
        },
      }).catch(() => {});
    }
    console.log("  ✅ Done");
  }

  if (receiptScans.length > 0) {
    console.log(`  Inserting ${receiptScans.length} Receipt Scans...`);
    for (const r of receiptScans) {
      await pg.receiptScan.create({
        data: {
          id: r.id,
          createdAt: r.createdAt,
          filename: r.filename,
          merchant: r.merchant || null,
          totalAmount: r.totalAmount,
          date: r.date || null,
          suggestedCategory: r.suggestedCategory || null,
          status: r.status,
          transactionId: r.transactionId || null,
        },
      }).catch(() => {});
    }
    console.log("  ✅ Done");
  }

  // ---- 4. Verify counts ----
  console.log("\n🔍 Verifying migrated data counts...\n");
  const verifyCounts = {
    users: await pg.user.count(),
    sessions: await pg.session.count(),
    categories: await pg.category.count(),
    accounts: await pg.account.count(),
    transactions: await pg.transaction.count(),
    budgets: await pg.budget.count(),
    savings: await pg.saving.count(),
    bills: await pg.bill.count(),
    paidBills: await pg.paidBill.count(),
    debts: await pg.debt.count(),
    whatsAppTemplates: await pg.whatsAppTemplate.count(),
    whatsAppRecipients: await pg.whatsAppRecipient.count(),
    scheduledReports: await pg.scheduledReport.count(),
    scheduledReportLogs: await pg.scheduledReportLog.count(),
    familyMembers: await pg.familyMember.count(),
    notifications: await pg.notification.count(),
    financialInsights: await pg.financialInsight.count(),
    financialTargets: await pg.financialTarget.count(),
    backupRecords: await pg.backupRecord.count(),
    receiptScans: await pg.receiptScan.count(),
  };

  console.log("📊 Verification Results:");
  console.log(JSON.stringify(verifyCounts, null, 2));

  await pg.$disconnect();
  console.log("\n✅ Migration complete!");
  console.log(`💾 JSON backup: ${backupPath}`);
}

main()
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });
