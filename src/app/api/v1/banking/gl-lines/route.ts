import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { journalLines, journals, bankTransactions } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, notInArray, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const chartAccountId = searchParams.get("chartAccountId");

    if (!chartAccountId) {
      return NextResponse.json({ error: "chartAccountId is required" }, { status: 400 });
    }

    const tenantId = session.tenant.id;

    // Find journal line IDs that are already matched to a bank transaction
    const matchedLineIds = await db
      .select({ id: bankTransactions.matchedJournalLineId })
      .from(bankTransactions)
      .where(and(eq(bankTransactions.tenantId, tenantId), sql`${bankTransactions.matchedJournalLineId} IS NOT NULL`));

    const excludeIds = matchedLineIds.map((m) => m.id).filter((id): id is string => id !== null);

    const lines = await db
      .select({
        id: journalLines.id,
        description: journalLines.description,
        debit: journalLines.debit,
        credit: journalLines.credit,
        journalId: journalLines.journalId,
        journalNumber: journals.journalNumber,
        journalDate: journals.date,
        journalDescription: journals.description,
      })
      .from(journalLines)
      .innerJoin(journals, eq(journals.id, journalLines.journalId))
      .where(
        and(
          eq(journalLines.accountId, chartAccountId),
          eq(journals.tenantId, tenantId),
          eq(journals.status, "posted"),
          excludeIds.length > 0 ? notInArray(journalLines.id, excludeIds) : undefined
        )
      )
      .orderBy(journals.date);

    return NextResponse.json({ lines });
  } catch (error) {
    console.error("Error fetching unreconciled GL lines:", error);
    return NextResponse.json({ error: "Failed to fetch GL lines" }, { status: 500 });
  }
}