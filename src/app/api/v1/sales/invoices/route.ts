import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, invoiceLines, customers, journals, journalLines, chartOfAccounts, auditLogs, events } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { generateCode } from "@/lib/utils";

const invoiceLineSchema = z.object({
  description: z.string().min(1),
  quantity: z.string().optional(),
  unitPrice: z.string(),
  discount: z.string().optional(),
  taxRate: z.string().optional(),
  accountId: z.string().uuid().optional(),
  sortOrder: z.number().optional(),
});

const invoiceSchema = z.object({
  customerId: z.string().uuid(),
  date: z.string(),
  dueDate: z.string(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  status: z.enum(["draft", "sent"]).optional(),
  lines: z.array(invoiceLineSchema).min(1),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const invoiceList = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        date: invoices.date,
        dueDate: invoices.dueDate,
        status: invoices.status,
        total: invoices.total,
        amountPaid: invoices.amountPaid,
        amountDue: invoices.amountDue,
        customerName: customers.name,
        customerCode: customers.code,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(eq(invoices.tenantId, session.tenant.id))
      .orderBy(desc(invoices.createdAt))
      .limit(100);

    return NextResponse.json({ invoices: invoiceList });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["owner", "admin", "accountant", "sales_rep"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = invoiceSchema.parse(body);
    if (data.status === "sent") {
  const missingAccount = data.lines.some((l) => !l.accountId);
  if (missingAccount) {
    return NextResponse.json(
      { error: "Every line must have a revenue account selected before the invoice can be sent and posted to the ledger." },
      { status: 400 }
    );
  }
}

    let subtotal = 0;
    let taxTotal = 0;
    const lineCalcs = data.lines.map((line) => {
      const qty = parseFloat(line.quantity || "1");
      const price = parseFloat(line.unitPrice || "0");
      const discount = parseFloat(line.discount || "0");
      const taxRate = parseFloat(line.taxRate || "0");
      const lineSubtotal = qty * price * (1 - discount / 100);
      const taxAmount = lineSubtotal * (taxRate / 100);
      subtotal += lineSubtotal;
      taxTotal += taxAmount;
      return { lineSubtotal, taxAmount, lineTotal: lineSubtotal + taxAmount, taxRate };
    });
    const total = subtotal + taxTotal;

    const existing = await db
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(eq(invoices.tenantId, session.tenant.id))
      .orderBy(desc(invoices.createdAt))
      .limit(1);

    const lastNum = existing.length > 0
      ? parseInt(existing[0].invoiceNumber.replace("INV", "")) || 0
      : 0;
    const invoiceNumber = generateCode("INV", lastNum + 1);

    const [invoice] = await db
      .insert(invoices)
      .values({
        tenantId: session.tenant.id,
        invoiceNumber,
        customerId: data.customerId,
        date: data.date,
        dueDate: data.dueDate,
        status: data.status || "draft",
        reference: data.reference,
        notes: data.notes,
        terms: data.terms,
        subtotal: subtotal.toFixed(2),
        taxTotal: taxTotal.toFixed(2),
        total: total.toFixed(2),
        amountPaid: "0",
        amountDue: total.toFixed(2),
        createdBy: session.user.id,
      })
      .returning();

    await db.insert(invoiceLines).values(
      data.lines.map((line, i) => ({
        invoiceId: invoice.id,
        description: line.description,
        quantity: line.quantity || "1",
        unitPrice: line.unitPrice,
        discount: line.discount || "0",
        taxRate: line.taxRate || "0",
        taxAmount: lineCalcs[i].taxAmount.toFixed(2),
        lineTotal: lineCalcs[i].lineTotal.toFixed(2),
        accountId: line.accountId || null,
        sortOrder: line.sortOrder || i,
      }))
    );

    if (data.status === "sent") {
      const [arAccount] = await db
        .select()
        .from(chartOfAccounts)
        .where(and(eq(chartOfAccounts.tenantId, session.tenant.id), eq(chartOfAccounts.code, "1210")))
        .limit(1);

      const [gstAccount] = await db
        .select()
        .from(chartOfAccounts)
        .where(and(eq(chartOfAccounts.tenantId, session.tenant.id), eq(chartOfAccounts.code, "2210")))
        .limit(1);

      if (arAccount && gstAccount) {
        const lastJournal = await db
          .select({ journalNumber: journals.journalNumber })
          .from(journals)
          .where(eq(journals.tenantId, session.tenant.id))
          .orderBy(desc(journals.createdAt))
          .limit(1);

        const lastJNum = lastJournal.length > 0
          ? parseInt(lastJournal[0].journalNumber.replace("JNL", "")) || 0
          : 0;
        const journalNumber = generateCode("JNL", lastJNum + 1);

        const [journal] = await db
          .insert(journals)
          .values({
            tenantId: session.tenant.id,
            journalNumber,
            date: data.date,
            description: `Invoice ${invoiceNumber}`,
            reference: invoiceNumber,
            status: "posted",
            totalDebit: total.toFixed(2),
            totalCredit: total.toFixed(2),
            createdBy: session.user.id,
            postedBy: session.user.id,
            postedAt: new Date(),
          })
          .returning();

        const jLines = [];

        jLines.push({
          journalId: journal.id,
          accountId: arAccount.id,
          description: `Invoice ${invoiceNumber} - ${data.reference || ""}`,
          debit: total.toFixed(2),
          credit: "0",
          sortOrder: 0,
        });

        let sortIdx = 1;
        for (const line of data.lines) {
          if (line.accountId) {
            const lineSubtotal = parseFloat(line.quantity || "1") * parseFloat(line.unitPrice || "0");
            jLines.push({
              journalId: journal.id,
              accountId: line.accountId,
              description: line.description,
              debit: "0",
              credit: lineSubtotal.toFixed(2),
              sortOrder: sortIdx++,
            });
          }
        }

        if (taxTotal > 0) {
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

        await db.update(invoices)
          .set({ journalId: journal.id })
          .where(eq(invoices.id, invoice.id));
      }
    }

    await db.insert(auditLogs).values({
      tenantId: session.tenant.id,
      userId: session.user.id,
      action: "CREATE",
      entityType: "invoice",
      entityId: invoice.id,
      newValues: invoice,
    });

    await db.insert(events).values({
      tenantId: session.tenant.id,
      aggregateId: invoice.id,
      aggregateType: "invoice",
      eventType: "invoice_created",
      eventData: { invoiceNumber, total, customerId: data.customerId },
      version: 1,
      userId: session.user.id,
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}