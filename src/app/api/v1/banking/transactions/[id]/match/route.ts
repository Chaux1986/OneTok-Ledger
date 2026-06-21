import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bankTransactions, journalLines } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const matchSchema = z.object({
  journalLineId: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["owner", "admin", "accountant"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = matchSchema.parse(body);
    const tenantId = session.tenant.id;

    const [transaction] = await db
      .select()
      .from(bankTransactions)
      .where(and(eq(bankTransactions.id, id), eq(bankTransactions.tenantId, tenantId)))
      .limit(1);

    if (!transaction) {
      return NextResponse.json({ error: "Bank transaction not found" }, { status: 404 });
    }
    if (transaction.status === "reconciled") {
      return NextResponse.json({ error: "This transaction is already reconciled" }, { status: 400 });
    }

    const [line] = await db
      .select()
      .from(journalLines)
      .where(eq(journalLines.id, data.journalLineId))
      .limit(1);

    if (!line) {
      return NextResponse.json({ error: "Journal line not found" }, { status: 404 });
    }

    // Sanity check: amounts should match (same side — bank debit matches GL debit, etc.)
    const txDebit = parseFloat(transaction.debit || "0");
    const txCredit = parseFloat(transaction.credit || "0");
    const lineDebit = parseFloat(line.debit || "0");
    const lineCredit = parseFloat(line.credit || "0");

    const debitMatch = Math.abs(txDebit - lineDebit) < 0.01;
    const creditMatch = Math.abs(txCredit - lineCredit) < 0.01;

    if (!debitMatch || !creditMatch) {
      return NextResponse.json(
        {
          error: `Amounts don't match. Bank: Dr ${txDebit.toFixed(2)} / Cr ${txCredit.toFixed(2)} vs GL: Dr ${lineDebit.toFixed(2)} / Cr ${lineCredit.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(bankTransactions)
      .set({ status: "reconciled", matchedJournalLineId: data.journalLineId })
      .where(eq(bankTransactions.id, id))
      .returning();

    return NextResponse.json({ transaction: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("Error matching transaction:", error);
    return NextResponse.json({ error: "Failed to match transaction" }, { status: 500 });
  }
}