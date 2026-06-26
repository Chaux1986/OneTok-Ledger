import { NextRequest, NextResponse } from "next/server";
import {
  quotes,
  quoteLines,
  invoices,
  invoiceLines,
  journals,
  journalLines,
  chartOfAccounts,
  auditLogs,
  events,
} from "@/db/schema";
import { db } from "@/db";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { generateCode } from "@/lib/utils";

// Scans every journal number for the tenant and returns the highest numeric
// value found after the "JNL" prefix. This is deliberately NOT based on
// "most recent by created_at" — that approach breaks the moment any journal
// with a non-standard number (e.g. a manual correction like
// "JNL000013-REV") happens to be the most recently created row, since a
// failed/odd parse on that one row can silently reset the sequence back
// toward 1 and collide with an existing number.
async function getNextJournalNumber(tenantId: string) {
  const all = await db
    .select({ journalNumber: journals.journalNumber })
    .from(journals)
    .where(eq(journals.tenantId, tenantId));

  const maxNum = all.reduce((max, j) => {
    const match = j.journalNumber.match(/^JNL(\d+)/);
    const num = match ? parseInt(match[1], 10) : 0;
    return num > max ? num : max;
  }, 0);

  return generateCode("JNL", maxNum + 1);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["owner", "admin", "accountant", "sales_rep"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const tenantId = session.tenant.id;

    const [quote] = await db
      .select()
      .from(quotes)
      .where(and(eq(quotes.id, id), eq(quotes.tenantId, tenantId)))
      .limit(1);

    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    if (quote.status === "converted") {
      return NextResponse.json({ error: "Quote has already been converted to an invoice" }, { status: 400 });
    }
    if (quote.status === "declined" || quote.status === "expired") {
      return NextResponse.json({ error: `Cannot convert a ${quote.status} quote` }, { status: 400 });
    }

    const lines = await db.select().from(quoteLines).where(eq(quoteLines.quoteId, id));
    if (lines.length === 0) {
      return NextResponse.json({ error: "Quote has no line items" }, { status: 400 });
    }

    const missingAccount = lines.some((l) => !l.accountId);
    if (missingAccount) {
      return NextResponse.json(
        { error: "Every quote line must have a revenue account selected before converting to an invoice" },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const allInvoiceNumbers = await db
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId));

    const lastInvNum = allInvoiceNumbers.reduce((max, inv) => {
      const match = inv.invoiceNumber.match(/^INV(\d+)/);
      const num = match ? parseInt(match[1], 10) : 0;
      return num > max ? num : max;
    }, 0);
    const invoiceNumber = generateCode("INV", lastInvNum + 1);

    const subtotal = parseFloat(quote.subtotal || "0");
    const taxTotal = parseFloat(quote.taxTotal || "0");
    const total = parseFloat(quote.total || "0");

    const [invoice] = await db
      .insert(invoices)
      .values({
        tenantId,
        invoiceNumber,
        customerId: quote.customerId,
        date: today,
        dueDate: dueDate.toISOString().split("T")[0],
        status: "sent",
        reference: quote.reference || quote.quoteNumber,
        notes: quote.notes,
        terms: quote.terms,
        subtotal: subtotal.toFixed(2),
        taxTotal: taxTotal.toFixed(2),
        total: total.toFixed(2),
        amountPaid: "0",
        amountDue: total.toFixed(2),
        createdBy: session.user.id,
      })
      .returning();

    await db.insert(invoiceLines).values(
      lines.map((line, i) => ({
        invoiceId: invoice.id,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: line.discount,
        taxRate: line.taxRate,
        taxAmount: line.taxAmount,
        lineTotal: line.lineTotal,
        accountId: line.accountId,
        sortOrder: i,
      }))
    );

    const [arAccount] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.tenantId, tenantId), eq(chartOfAccounts.code, "1210")))
      .limit(1);
    const [gstAccount] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.tenantId, tenantId), eq(chartOfAccounts.code, "2210")))
      .limit(1);

    if (arAccount) {
      const journalNumber = await getNextJournalNumber(tenantId);

      const [journal] = await db
        .insert(journals)
        .values({
          tenantId,
          journalNumber,
          date: today,
          description: `Invoice ${invoiceNumber} (converted from ${quote.quoteNumber})`,
          reference: invoiceNumber,
          status: "posted",
          totalDebit: total.toFixed(2),
          totalCredit: total.toFixed(2),
          createdBy: session.user.id,
          postedBy: session.user.id,
          postedAt: new Date(),
        })
        .returning();

      const jLines = [
        {
          journalId: journal.id,
          accountId: arAccount.id,
          description: `Invoice ${invoiceNumber} - ${quote.quoteNumber}`,
          debit: total.toFixed(2),
          credit: "0",
          sortOrder: 0,
        },
      ];

      let sortIdx = 1;
      for (const line of lines) {
        const lineSubtotal = parseFloat(line.quantity || "1") * parseFloat(line.unitPrice || "0");
        jLines.push({
          journalId: journal.id,
          accountId: line.accountId!,
          description: line.description,
          debit: "0",
          credit: lineSubtotal.toFixed(2),
          sortOrder: sortIdx++,
        });
      }

      if (taxTotal > 0 && gstAccount) {
        jLines.push({
          journalId: journal.id,
          accountId: gstAccount.id,
          description: `GST on ${invoiceNumber}`,
          debit: "0",
          credit: taxTotal.toFixed(2),
          sortOrder: sortIdx,
        });
      }

      await db.insert(journalLines).values(jLines);
      await db.update(invoices).set({ journalId: journal.id }).where(eq(invoices.id, invoice.id));
    }

    await db
      .update(quotes)
      .set({ status: "converted", convertedInvoiceId: invoice.id, convertedAt: new Date(), updatedAt: new Date() })
      .where(eq(quotes.id, id));

    await db.insert(auditLogs).values({
      tenantId,
      userId: session.user.id,
      action: "CONVERT",
      entityType: "quote",
      entityId: id,
      newValues: { convertedInvoiceId: invoice.id, invoiceNumber },
    });

    await db.insert(events).values({
      tenantId,
      aggregateId: id,
      aggregateType: "quote",
      eventType: "invoice_created",
      eventData: { quoteNumber: quote.quoteNumber, invoiceNumber, total },
      version: 1,
      userId: session.user.id,
    });

    return NextResponse.json({ invoice, quoteNumber: quote.quoteNumber }, { status: 201 });
  } catch (error) {
    console.error("Error converting quote:", error);
    return NextResponse.json({ error: "Failed to convert quote to invoice" }, { status: 500 });
  }
}