import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  bills,
  journals,
  journalLines,
  chartOfAccounts,
  auditLogs,
  events,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { generateCode } from "@/lib/utils";

const paymentSchema = z.object({
  amount: z.string().min(1),
  paymentDate: z.string(),
  paymentMethod: z.enum(["bank_transfer", "cash", "cheque", "mobile_money"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
  bankAccountCode: z.string().default("1100"),
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
    const data = paymentSchema.parse(body);
    const tenantId = session.tenant.id;
    const paymentAmount = parseFloat(data.amount);

    // Load bill
    const [bill] = await db
      .select({
        id: bills.id,
        billNumber: bills.billNumber,
        total: bills.total,
        amountPaid: bills.amountPaid,
        amountDue: bills.amountDue,
        status: bills.status,
      })
      .from(bills)
      .where(and(eq(bills.id, id), eq(bills.tenantId, tenantId)))
      .limit(1);

    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    if (bill.status === "paid" || bill.status === "void") {
      return NextResponse.json({ error: `Bill is already ${bill.status}` }, { status: 400 });
    }

    const currentPaid = parseFloat(bill.amountPaid || "0");
    const currentDue = parseFloat(bill.amountDue || "0");

    if (paymentAmount > currentDue + 0.01) {
      return NextResponse.json(
        { error: `Payment K${paymentAmount} exceeds amount due K${currentDue.toFixed(2)}` },
        { status: 400 }
      );
    }

    const newAmountPaid = currentPaid + paymentAmount;
    const newAmountDue = Math.max(0, currentDue - paymentAmount);
    const newStatus = newAmountDue < 0.01 ? "paid" : "partial";

    // Update bill
    await db
      .update(bills)
      .set({
        amountPaid: newAmountPaid.toFixed(2),
        amountDue: newAmountDue.toFixed(2),
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(bills.id, id));

    // Post journal: DR Trade Creditors, CR Bank
    const accounts = await db
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.tenantId, tenantId));

    const bankAccount = accounts.find((a) => a.code === data.bankAccountCode);
    const apAccount = accounts.find((a) => a.code === "2110"); // Trade Creditors

    if (bankAccount && apAccount) {
      const lastJournal = await db
        .select({ journalNumber: journals.journalNumber })
        .from(journals)
        .where(eq(journals.tenantId, tenantId))
        .orderBy(desc(journals.createdAt))
        .limit(1);

      const lastJNum = lastJournal.length > 0
        ? parseInt(lastJournal[0].journalNumber.replace("JNL", "")) || 0
        : 0;
      const journalNumber = generateCode("JNL", lastJNum + 1);

      const [journal] = await db
        .insert(journals)
        .values({
          tenantId,
          journalNumber,
          date: data.paymentDate,
          description: `Payment - ${bill.billNumber}`,
          reference: data.reference || bill.billNumber,
          status: "posted",
          totalDebit: paymentAmount.toFixed(2),
          totalCredit: paymentAmount.toFixed(2),
          createdBy: session.user.id,
          postedBy: session.user.id,
          postedAt: new Date(),
        })
        .returning();

      await db.insert(journalLines).values([
        {
          journalId: journal.id,
          accountId: apAccount.id,
          description: `Trade creditors cleared - ${bill.billNumber}`,
          debit: paymentAmount.toFixed(2),
          credit: "0",
          sortOrder: 0,
        },
        {
          journalId: journal.id,
          accountId: bankAccount.id,
          description: `Payment to supplier - ${bill.billNumber}`,
          debit: "0",
          credit: paymentAmount.toFixed(2),
          sortOrder: 1,
        },
      ]);
    }

    await db.insert(auditLogs).values({
      tenantId,
      userId: session.user.id,
      action: "PAYMENT",
      entityType: "bill",
      entityId: id,
      newValues: { amount: paymentAmount, paymentDate: data.paymentDate, newStatus },
    });

    await db.insert(events).values({
      tenantId,
      aggregateId: id,
      aggregateType: "bill",
      eventType: "bill_paid",
      eventData: { billNumber: bill.billNumber, amount: paymentAmount, newStatus },
      version: 1,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      bill: {
        id,
        billNumber: bill.billNumber,
        amountPaid: newAmountPaid.toFixed(2),
        amountDue: newAmountDue.toFixed(2),
        status: newStatus,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("Error recording payment:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}