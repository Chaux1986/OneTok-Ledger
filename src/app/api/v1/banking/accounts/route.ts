import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bankAccounts, chartOfAccounts, journals, journalLines } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const bankAccountSchema = z.object({
  chartAccountId: z.string().uuid(),
  bankName: z.string().min(1, "Bank name is required"),
  accountNumber: z.string().optional(),
  accountType: z.enum(["checking", "savings"]).optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenant.id;

    const accounts = await db
      .select({
        id: bankAccounts.id,
        bankName: bankAccounts.bankName,
        accountNumber: bankAccounts.accountNumber,
        accountType: bankAccounts.accountType,
        lastReconciledDate: bankAccounts.lastReconciledDate,
        lastReconciledBalance: bankAccounts.lastReconciledBalance,
        isActive: bankAccounts.isActive,
        chartAccountId: bankAccounts.chartAccountId,
        chartAccountCode: chartOfAccounts.code,
        chartAccountName: chartOfAccounts.name,
        glBalance: chartOfAccounts.currentBalance,
      })
      .from(bankAccounts)
      .leftJoin(chartOfAccounts, eq(bankAccounts.chartAccountId, chartOfAccounts.id))
      .where(eq(bankAccounts.tenantId, tenantId));

    // For each bank account, compute the actual GL balance from journal lines
    // (currentBalance on chartOfAccounts may not always be perfectly in sync,
    // so we calculate from the ledger directly — same approach as trial balance)
    const accountsWithBalance = await Promise.all(
      accounts.map(async (acc) => {
        const [sums] = await db
          .select({
            debit: sql<string>`COALESCE(SUM(CASE WHEN ${journals.status} = 'posted' THEN CAST(${journalLines.debit} AS NUMERIC) ELSE 0 END), 0)`,
            credit: sql<string>`COALESCE(SUM(CASE WHEN ${journals.status} = 'posted' THEN CAST(${journalLines.credit} AS NUMERIC) ELSE 0 END), 0)`,
          })
          .from(journalLines)
          .leftJoin(journals, eq(journals.id, journalLines.journalId))
          .where(eq(journalLines.accountId, acc.chartAccountId));

        const glBalance = parseFloat(sums.debit) - parseFloat(sums.credit);

        return { ...acc, glBalance: glBalance.toFixed(2) };
      })
    );

    return NextResponse.json({ bankAccounts: accountsWithBalance });
  } catch (error) {
    console.error("Error fetching bank accounts:", error);
    return NextResponse.json({ error: "Failed to fetch bank accounts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["owner", "admin", "accountant"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = bankAccountSchema.parse(body);
    const tenantId = session.tenant.id;

    // Verify the chart account exists, belongs to this tenant, and isn't already linked
    const [chartAccount] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.id, data.chartAccountId), eq(chartOfAccounts.tenantId, tenantId)))
      .limit(1);

    if (!chartAccount) {
      return NextResponse.json({ error: "Chart of accounts entry not found" }, { status: 404 });
    }

    const [existing] = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.chartAccountId, data.chartAccountId))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "This GL account is already set up as a bank account" }, { status: 409 });
    }

    const [bankAccount] = await db
      .insert(bankAccounts)
      .values({
        tenantId,
        chartAccountId: data.chartAccountId,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountType: data.accountType || "checking",
      })
      .returning();

    return NextResponse.json({ bankAccount }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("Error creating bank account:", error);
    return NextResponse.json({ error: "Failed to create bank account" }, { status: 500 });
  }
}