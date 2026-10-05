import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/database/clear
 * Body: { confirm: true, keepUsers?: boolean }
 *
 * Deletes ALL data from the database (except users if keepUsers=true).
 * This is a destructive operation — requires explicit confirm: true.
 *
 * Returns: { success: true, deleted: { table: count } }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { confirm, keepUsers } = body ?? {};

    if (!confirm) {
      return NextResponse.json(
        { error: "Konfirmasi diperlukan. Kirim { confirm: true } untuk menghapus." },
        { status: 400 },
      );
    }

    // Delete in dependency order (respecting foreign keys)
    const deleted: Record<string, number> = {};

    deleted.receiptScans = await db.receiptScan.deleteMany();
    deleted.backupRecords = await db.backupRecord.deleteMany();
    deleted.financialTargets = await db.financialTarget.deleteMany();
    deleted.financialInsights = await db.financialInsight.deleteMany();
    deleted.notifications = await db.notification.deleteMany();
    deleted.scheduledReportLogs = await db.scheduledReportLog.deleteMany();
    deleted.scheduledReports = await db.scheduledReport.deleteMany();
    deleted.whatsAppRecipients = await db.whatsAppRecipient.deleteMany();
    deleted.whatsAppTemplates = await db.whatsAppTemplate.deleteMany();
    deleted.debts = await db.debt.deleteMany();
    deleted.paidBills = await db.paidBill.deleteMany();
    deleted.bills = await db.bill.deleteMany();
    deleted.savings = await db.saving.deleteMany();
    deleted.budgets = await db.budget.deleteMany();
    deleted.transactions = await db.transaction.deleteMany();
    deleted.familyMembers = await db.familyMember.deleteMany();
    deleted.accounts = await db.account.deleteMany();
    deleted.categories = await db.category.deleteMany();
    deleted.sessions = await db.session.deleteMany();

    if (!keepUsers) {
      deleted.users = await db.user.deleteMany();
    }

    const totalDeleted = Object.values(deleted).reduce((s, n) => s + (typeof n === "number" ? n : 0), 0);

    return NextResponse.json({
      success: true,
      message: "Database berhasil dikosongkan",
      deleted,
      totalDeleted,
    });
  } catch (error) {
    console.error("POST /api/database/clear error:", error);
    return NextResponse.json({ error: "Gagal mengosongkan database" }, { status: 500 });
  }
}
