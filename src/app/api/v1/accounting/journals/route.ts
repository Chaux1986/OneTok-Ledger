import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  journals,
  journalLines,
  chartOfAccounts,
  events,
  auditLogs,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, desc, sql, and } from "drizzle-orm";
import { z } from "zod";
import { generateCode } from "@/lib/utils";

const journalLineSchema = z.object({
  accountId: z.string().uuid(),
  description: z.string().optional(),
  debit: z.string().optional(),
  credit: z.string().optional(),
  taxCode: z.string().optional(),
});

const journalSchema = z.object({
  date: z.string(),
  description: z.string().optional(),
  reference: z.string().optional(),
  lines: z.array(journalLineSchema).min(2, "At least 2 lines required"),
  post: z.boolean().optional(),
});

// GET - List journals
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = db
      .select()
      .from(journals)
      .where(eq(journals.tenantId, session.tenant.id))
      .orderBy(desc(journals.date), desc(journals.createdAt))
      .limit(limit)
      .offset(offset);

    if (status) {
      query = db
        .select()
        .from(journals)
        .where(
          and(
            eq(journals.tenantId, session.tenant.id),
            eq(journals.status, status as "draft" | "posted" | "reversed" | "void")
          )
        )
        .orderBy(desc(journals.date), desc(journals.createdAt))
        .limit(limit)
        .offset(offset);
    }

    const journalList = await query;

    // Get lines for each journal
    const journalsWithLines = await Promise.all(
      journalList.map(async (journal) => {
        const lines = await db
          .select({
            id: journalLines.id,
            description: journalLines.description,
            debit: journalLines.debit,
            credit: journalLines.credit,
            accountId: journalLines.accountId,
            accountCode: chartOfAccounts.code,
            accountName: chartOfAccounts.name,
          })
          .from(journalLines)
          .leftJoin(
            chartOfAccounts,
            eq(journalLines.accountId, chartOfAccounts.id)
          )
          .where(eq(journalLines.journalId, journal.id));

        return { ...journal, lines };
      })
    );

    return NextResponse.json({ journals: journalsWithLines });
  } catch (error) {
    console.error("Error fetching journals:", error);
    return NextResponse.json(
      { error: "Failed to fetch journals" },
      { status: 500 }
    );
  }
}

// POST - Create journal
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["owner", "admin", "accountant"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = journalSchema.parse(body);

    // Calculate totals
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of data.lines) {
      totalDebit += parseFloat(line.debit || "0");
      totalCredit += parseFloat(line.credit || "0");
    }

    // Validate debits = credits
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        { error: "Journal must balance (debits must equal credits)" },
        { status: 400 }
      );
    }

    // Get next journal number
    const [lastJournal] = await db
      .select({ journalNumber: journals.journalNumber })
      .from(journals)
      .where(eq(journals.tenantId, session.tenant.id))
      .orderBy(desc(journals.createdAt))
      .limit(1);

    const lastNumber = lastJournal
      ? parseInt(lastJournal.journalNumber.replace("JNL", ""))
      : 0;
    const journalNumber = generateCode("JNL", lastNumber + 1);

    // Create journal
    const [journal] = await db
      .insert(journals)
      .values({
        tenantId: session.tenant.id,
        journalNumber,
        date: data.date,
        description: data.description,
        reference: data.reference,
        status: data.post ? "posted" : "draft",
        totalDebit: totalDebit.toString(),
        totalCredit: totalCredit.toString(),
        createdBy: session.user.id,
        postedAt: data.post ? new Date() : null,
        postedBy: data.post ? session.user.id : null,
      })
      .returning();

    // Create journal lines
    const lineInserts = data.lines.map((line, index) => ({
      journalId: journal.id,
      accountId: line.accountId,
      description: line.description,
      debit: line.debit || "0",
      credit: line.credit || "0",
      taxCode: line.taxCode,
      sortOrder: index,
    }));

    await db.insert(journalLines).values(lineInserts);

    // If posted, update account balances
    if (data.post) {
      for (const line of data.lines) {
        const debitAmount = parseFloat(line.debit || "0");
        const creditAmount = parseFloat(line.credit || "0");
        const netChange = debitAmount - creditAmount;

        await db
          .update(chartOfAccounts)
          .set({
            currentBalance: sql`${chartOfAccounts.currentBalance} + ${netChange}`,
            updatedAt: new Date(),
          })
          .where(eq(chartOfAccounts.id, line.accountId));
      }

      // Create event
      await db.insert(events).values({
        tenantId: session.tenant.id,
        aggregateId: journal.id,
        aggregateType: "journal",
        eventType: "journal_posted",
        eventData: {
          journalNumber: journal.journalNumber,
          date: journal.date,
          totalDebit,
          totalCredit,
        },
        version: 1,
        userId: session.user.id,
      });
    }

    // Create audit log
    await db.insert(auditLogs).values({
      tenantId: session.tenant.id,
      userId: session.user.id,
      action: "CREATE",
      entityType: "journal",
      entityId: journal.id,
      newValues: { ...journal, lines: data.lines },
    });

    return NextResponse.json({ journal }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating journal:", error);
    return NextResponse.json(
      { error: "Failed to create journal" },
      { status: 500 }
    );
  }
}
