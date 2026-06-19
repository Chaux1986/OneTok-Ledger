import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  invoices,
  customers,
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
  bankAccountCode: z.string().default("1100"), // which bank account was credited
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

    // Load invoice
    const [invoice] = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        total: invoices.total,
        amountPaid: invoices.amountPaid,
        amountDue: invoices.amountDue,
        status: invoices.status,
        customerId: invoices.customerId,
      })
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
      .limit(1);

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (invoice.status === "paid" || invoice.status === "void") {
      return NextResponse.json({ error: `Invoice is already ${invoice.status}` }, { status: 400 });
    }

    const currentPaid = parseFloat(invoice.amountPaid || "0");
    const currentDue = parseFloat(invoice.amountDue || "0");

    if (paymentAmount > currentDue + 0.01) {
      return NextResponse.json(
        { error: `Payment K${paymentAmount} exceeds amount due K${currentDue.toFixed(2)}` },
        { status: 400 }
      );
    }

    const newAmountPaid = currentPaid + paymentAmount;
    const newAmountDue = Math.max(0, currentDue - paymentAmount);
    const newStatus = newAmountDue < 0.01 ? "paid" : "partial";

    // Update invoice
    await db
      .update(invoices)
      .set({
        amountPaid: newAmountPaid.toFixed(2),
        amountDue: newAmountDue.toFixed(2),
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id));

    // Post journal: DR Bank, CR Trade Debtors
    const accounts = await db
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.tenantId, tenantId));

    const bankAccount = accounts.find((a) => a.code === data.bankAccountCode);
    const arAccount = accounts.find((a) => a.code === "1210"); // Trade Debtors

    if (bankAccount && arAccount) {
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
          description: `Receipt - ${invoice.invoiceNumber}`,
          reference: data.reference || invoice.invoiceNumber,
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
          accountId: bankAccount.id,
          description: `Payment received - ${invoice.invoiceNumber}`,
          debit: paymentAmount.toFixed(2),
          credit: "0",
          sortOrder: 0,
        },
        {
          journalId: journal.id,
          accountId: arAccount.id,
          description: `Trade debtors cleared - ${invoice.invoiceNumber}`,
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
      entityType: "invoice",
      entityId: id,
      newValues: { amount: paymentAmount, paymentDate: data.paymentDate, newStatus },
    });

    await db.insert(events).values({
      tenantId,
      aggregateId: id,
      aggregateType: "invoice",
      eventType: "invoice_paid",
      eventData: { invoiceNumber: invoice.invoiceNumber, amount: paymentAmount, newStatus },
      version: 1,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      invoice: {
        id,
        invoiceNumber: invoice.invoiceNumber,
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