import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/database/stats
 * Returns statistics about the database: table counts, total records, last activity.
 */
export async function GET() {
  try {
    const [
      users,
      sessions,
      categories,
      accounts,
      transactions,
      budgets,
      savings,
      bills,
      paidBills,
      debts,
      whatsAppTemplates,
      whatsAppRecipients,
      scheduledReports,
      scheduledReportLogs,
      familyMembers,
      notifications,
      financialInsights,
      financialTargets,
      backupRecords,
      receiptScans,
    ] = await Promise.all([
      db.user.count(),
      db.session.count(),
      db.category.count(),
      db.account.count(),
      db.transaction.count(),
      db.budget.count(),
      db.saving.count(),
      db.bill.count(),
      db.paidBill.count(),
      db.debt.count(),
      db.whatsAppTemplate.count(),
      db.whatsAppRecipient.count(),
      db.scheduledReport.count(),
      db.scheduledReportLog.count(),
      db.familyMember.count(),
      db.notification.count(),
      db.financialInsight.count(),
      db.financialTarget.count(),
      db.backupRecord.count(),
      db.receiptScan.count(),
    ]);

    const totalRecords =
      users + sessions + categories + accounts + transactions +
      budgets + savings + bills + paidBills + debts +
      whatsAppTemplates + whatsAppRecipients + scheduledReports +
      scheduledReportLogs + familyMembers + notifications +
      financialInsights + financialTargets + backupRecords + receiptScans;

    // Get latest transaction date
    const latestTxn = await db.transaction.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    return NextResponse.json({
      tables: {
        users,
        sessions,
        categories,
        accounts,
        transactions,
        budgets,
        savings,
        bills,
        paidBills,
        debts,
        whatsAppTemplates,
        whatsAppRecipients,
        scheduledReports,
        scheduledReportLogs,
        familyMembers,
        notifications,
        financialInsights,
        financialTargets,
        backupRecords,
        receiptScans,
      },
      totalRecords,
      tableCount: 20,
      lastActivity: latestTxn?.createdAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("GET /api/database/stats error:", error);
    return NextResponse.json({ error: "Gagal memuat statistik database" }, { status: 500 });
  }
}
