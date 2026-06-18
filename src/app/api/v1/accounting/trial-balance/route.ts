import { NextResponse } from "next/server";
import { db } from "@/db";
import { chartOfAccounts, journalLines, journals } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.tenant.id;

    // Get all active accounts with their posted journal line totals
    const rows = await db
      .select({
        id: chartOfAccounts.id,
        code: chartOfAccounts.code,
        name: chartOfAccounts.name,
        accountType: chartOfAccounts.accountType,
        accountSubtype: chartOfAccounts.accountSubtype,
        openingBalance: chartOfAccounts.openingBalance,
        totalDebit: sql<string>`COALESCE(SUM(CASE WHEN ${journals.status} = 'posted' THEN CAST(${journalLines.debit} AS NUMERIC) ELSE 0 END), 0)`,
        totalCredit: sql<string>`COALESCE(SUM(CASE WHEN ${journals.status} = 'posted' THEN CAST(${journalLines.credit} AS NUMERIC) ELSE 0 END), 0)`,
      })
      .from(chartOfAccounts)
      .leftJoin(
        journalLines,
        eq(journalLines.accountId, chartOfAccounts.id)
      )
      .leftJoin(
        journals,
        and(
          eq(journals.id, journalLines.journalId),
          eq(journals.tenantId, tenantId)
        )
      )
      .where(
        and(
          eq(chartOfAccounts.tenantId, tenantId),
          eq(chartOfAccounts.isActive, true)
        )
      )
      .groupBy(
        chartOfAccounts.id,
        chartOfAccounts.code,
        chartOfAccounts.name,
        chartOfAccounts.accountType,
        chartOfAccounts.accountSubtype,
        chartOfAccounts.openingBalance
      )
      .orderBy(chartOfAccounts.code);

    // Calculate net balance per account type
    // Assets & Expenses: debit-normal (debit increases balance)
    // Liabilities, Equity, Revenue: credit-normal (credit increases balance)
    const debitNormal = ["asset", "expense"];

    const accounts = rows
      .map((row) => {
        const opening = parseFloat(row.openingBalance || "0");
        const debit = parseFloat(row.totalDebit);
        const credit = parseFloat(row.totalCredit);
        const isDebitNormal = debitNormal.includes(row.accountType);

        // Net movement from journals
        const netMovement = debit - credit;

        // Final balance
        const balance = isDebitNormal
          ? opening + netMovement
          : opening - netMovement;

        return {
          ...row,
          totalDebit: debit,
          totalCredit: credit,
          balance,
          // For trial balance display: show balance in debit or credit column
          trialDebit: isDebitNormal && balance > 0 ? balance : 0,
          trialCredit: !isDebitNormal && balance > 0 ? Math.abs(balance) : 0,
        };
      })
      .filter((a) => a.totalDebit > 0 || a.totalCredit > 0 || a.balance !== 0);

    // Totals
    const totalDebit = accounts.reduce((s, a) => s + a.trialDebit, 0);
    const totalCredit = accounts.reduce((s, a) => s + a.trialCredit, 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    // Group by type for summary
    const summary = {
      assets: accounts.filter((a) => a.accountType === "asset").reduce((s, a) => s + a.balance, 0),
      liabilities: accounts.filter((a) => a.accountType === "liability").reduce((s, a) => s + a.balance, 0),
      equity: accounts.filter((a) => a.accountType === "equity").reduce((s, a) => s + a.balance, 0),
      revenue: accounts.filter((a) => a.accountType === "revenue").reduce((s, a) => s + a.balance, 0),
      expenses: accounts.filter((a) => a.accountType === "expense").reduce((s, a) => s + a.balance, 0),
    };

    return NextResponse.json({
      accounts,
      totalDebit,
      totalCredit,
      isBalanced,
      summary,
      generatedAt: new Date().toISOString(),
      tenant: {
        name: session.tenant.name,
        currency: session.tenant.currency,
      },
    });
  } catch (error) {
    console.error("Trial balance error:", error);
    return NextResponse.json(
      { error: "Failed to generate trial balance" },
      { status: 500 }
    );
  }
}