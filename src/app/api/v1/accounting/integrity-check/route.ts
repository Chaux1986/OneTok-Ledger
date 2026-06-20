import { NextResponse } from "next/server";
import { db } from "@/db";
import { journals, journalLines } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

interface JournalIssue {
  type: "unbalanced" | "header_mismatch" | "no_lines";
  message: string;
}

interface JournalCheckResult {
  id: string;
  journalNumber: string;
  date: string;
  description: string | null;
  status: string;
  storedTotalDebit: number;
  storedTotalCredit: number;
  actualLineDebit: number;
  actualLineCredit: number;
  lineCount: number;
  issues: JournalIssue[];
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenant.id;

    // Sum debit/credit per journal directly from journal_lines (the ground truth)
    const lineSums = await db
      .select({
        journalId: journalLines.journalId,
        lineDebit: sql<string>`COALESCE(SUM(CAST(${journalLines.debit} AS NUMERIC)), 0)`,
        lineCredit: sql<string>`COALESCE(SUM(CAST(${journalLines.credit} AS NUMERIC)), 0)`,
        lineCount: sql<number>`COUNT(*)`,
      })
      .from(journalLines)
      .groupBy(journalLines.journalId);

    const sumsByJournal = new Map(
      lineSums.map((s) => [
        s.journalId,
        { debit: parseFloat(s.lineDebit), credit: parseFloat(s.lineCredit), count: s.lineCount },
      ])
    );

    // All journals for this tenant (check every status — drafts can still have data issues)
    const allJournals = await db
      .select()
      .from(journals)
      .where(eq(journals.tenantId, tenantId));

    const results: JournalCheckResult[] = [];

    for (const j of allJournals) {
      const sums = sumsByJournal.get(j.id) || { debit: 0, credit: 0, count: 0 };
      const storedDebit = parseFloat(j.totalDebit || "0");
      const storedCredit = parseFloat(j.totalCredit || "0");
      const issues: JournalIssue[] = [];

      if (sums.count === 0) {
        issues.push({
          type: "no_lines",
          message: "Journal header exists but has no line items at all.",
        });
      } else {
        const diff = Math.abs(sums.debit - sums.credit);
        if (diff > 0.01) {
          issues.push({
            type: "unbalanced",
            message: `Lines do not balance: debit ${sums.debit.toFixed(2)} vs credit ${sums.credit.toFixed(2)} (diff ${diff.toFixed(2)}).`,
          });
        }

        const headerDebitDiff = Math.abs(storedDebit - sums.debit);
        const headerCreditDiff = Math.abs(storedCredit - sums.credit);
        if (headerDebitDiff > 0.01 || headerCreditDiff > 0.01) {
          issues.push({
            type: "header_mismatch",
            message: `Header totals (${storedDebit.toFixed(2)}/${storedCredit.toFixed(2)}) don't match actual line sums (${sums.debit.toFixed(2)}/${sums.credit.toFixed(2)}).`,
          });
        }
      }

      if (issues.length > 0) {
        results.push({
          id: j.id,
          journalNumber: j.journalNumber,
          date: j.date,
          description: j.description,
          status: j.status || "draft",
          storedTotalDebit: storedDebit,
          storedTotalCredit: storedCredit,
          actualLineDebit: sums.debit,
          actualLineCredit: sums.credit,
          lineCount: sums.count,
          issues,
        });
      }
    }

    // Overall aggregate check (same logic as trial balance, as a cross-check)
    const totalActualDebit = Array.from(sumsByJournal.values()).reduce((s, v) => s + v.debit, 0);
    const totalActualCredit = Array.from(sumsByJournal.values()).reduce((s, v) => s + v.credit, 0);

    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      totalJournals: allJournals.length,
      journalsWithIssues: results.length,
      isHealthy: results.length === 0,
      overallLedgerDebit: totalActualDebit,
      overallLedgerCredit: totalActualCredit,
      overallBalanced: Math.abs(totalActualDebit - totalActualCredit) < 0.01,
      problems: results.sort((a, b) => (a.date < b.date ? 1 : -1)),
    });
  } catch (error) {
    console.error("Integrity check error:", error);
    return NextResponse.json({ error: "Failed to run integrity check" }, { status: 500 });
  }
}