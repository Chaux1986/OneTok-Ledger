import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bills, billLines, suppliers, journals, journalLines, chartOfAccounts, auditLogs, events } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { generateCode } from "@/lib/utils";

const billLineSchema = z.object({
  description: z.string().min(1),
  quantity: z.string().optional(),
  unitPrice: z.string(),
  taxRate: z.string().optional(),
  accountId: z.string().uuid().optional(),
  sortOrder: z.number().optional(),
});

const billSchema = z.object({
  supplierId: z.string().uuid(),
  supplierInvoiceNumber: z.string().optional(),
  date: z.string(),
  dueDate: z.string(),
  status: z.enum(["draft", "approved"]).optional(),
  notes: z.string().optional(),
  lines: z.array(billLineSchema).min(1),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const billList = await db
      .select({
        id: bills.id,
        billNumber: bills.billNumber,
        supplierInvoiceNumber: bills.supplierInvoiceNumber,
        date: bills.date,
        dueDate: bills.dueDate,
        status: bills.status,
        total: bills.total,
        amountPaid: bills.amountPaid,
        amountDue: bills.amountDue,
        supplierName: suppliers.name,
        supplierCode: suppliers.code,
      })
      .from(bills)
      .leftJoin(suppliers, eq(bills.supplierId, suppliers.id))
      .where(eq(bills.tenantId, session.tenant.id))
      .orderBy(desc(bills.createdAt))
      .limit(100);

    return NextResponse.json({ bills: billList });
  } catch (error) {
    console.error("Error fetching bills:", error);
    return NextResponse.json({ error: "Failed to fetch bills" }, { status: 500 });
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
    const data = billSchema.parse(body);
    if (data.status === "approved") {
  const missingAccount = data.lines.some((l) => !l.accountId);
  if (missingAccount) {
    return NextResponse.json(
      { error: "Every line must have an expense account selected before the bill can be approved and posted to the ledger." },
      { status: 400 }
    );
  }
}

    // Calculate totals
    let subtotal = 0;
    let taxTotal = 0;
    const lineCalcs = data.lines.map((line) => {
      const qty = parseFloat(line.quantity || "1");
      const price = parseFloat(line.unitPrice || "0");
      const taxRate = parseFloat(line.taxRate || "0");
      const lineSubtotal = qty * price;
      const taxAmount = lineSubtotal * (taxRate / 100);
      subtotal += lineSubtotal;
      taxTotal += taxAmount;
      return { lineSubtotal, taxAmount, lineTotal: lineSubtotal + taxAmount };
    });
    const total = subtotal + taxTotal;

    // Generate bill number
    const existing = await db
      .select({ billNumber: bills.billNumber })
      .from(bills)
      .where(eq(bills.tenantId, session.tenant.id))
      .orderBy(desc(bills.createdAt))
      .limit(1);

    const lastNum = existing.length > 0
      ? parseInt(existing[0].billNumber.replace("BILL", "")) || 0
      : 0;
    const billNumber = generateCode("BILL", lastNum + 1);

    // Create bill
    const [bill] = await db
      .insert(bills)
      .values({
        tenantId: session.tenant.id,
        billNumber,
        supplierId: data.supplierId,
        supplierInvoiceNumber: data.supplierInvoiceNumber,
        date: data.date,
        dueDate: data.dueDate,
        status: data.status || "draft",
        notes: data.notes,
        subtotal: subtotal.toFixed(2),
        taxTotal: taxTotal.toFixed(2),
        total: total.toFixed(2),
        amountPaid: "0",
        amountDue: total.toFixed(2),
        createdBy: session.user.id,
      })
      .returning();

    // Create bill lines
    await db.insert(billLines).values(
      data.lines.map((line, i) => ({
        billId: bill.id,
        description: line.description,
        quantity: line.quantity || "1",
        unitPrice: line.unitPrice,
        taxRate: line.taxRate || "0",
        taxAmount: lineCalcs[i].taxAmount.toFixed(2),
        lineTotal: lineCalcs[i].lineTotal.toFixed(2),
        accountId: line.accountId || null,
        sortOrder: line.sortOrder ?? i,
      }))
    );

    // Auto-post journal for approved bills
    if (data.status === "approved") {
      const [apAccount] = await db
        .select()
        .from(chartOfAccounts)
        .where(and(eq(chartOfAccounts.tenantId, session.tenant.id), eq(chartOfAccounts.code, "2110")))
        .limit(1);

      const [gstInputAccount] = await db
        .select()
        .from(chartOfAccounts)
        .where(and(eq(chartOfAccounts.tenantId, session.tenant.id), eq(chartOfAccounts.code, "1420")))
        .limit(1);

      if (apAccount) {
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
            description: `Bill ${billNumber}`,
            reference: billNumber,
            status: "posted",
            totalDebit: total.toFixed(2),
            totalCredit: total.toFixed(2),
            createdBy: session.user.id,
            postedBy: session.user.id,
            postedAt: new Date(),
          })
          .returning();

        const jLines: Array<{
          journalId: string;
          accountId: string;
          description: string;
          debit: string;
          credit: string;
          sortOrder: number;
        }> = [];

        // DR Expense/Asset accounts (subtotal per line)
        let sortIdx = 0;
        for (const line of data.lines) {
          if (line.accountId) {
            const lineSubtotal = parseFloat(line.quantity || "1") * parseFloat(line.unitPrice || "0");
            jLines.push({
              journalId: journal.id,
              accountId: line.accountId,
              description: line.description,
              debit: lineSubtotal.toFixed(2),
              credit: "0",
              sortOrder: sortIdx++,
            });
          }
        }

        // DR GST Input Tax Credit if any
        if (taxTotal > 0 && gstInputAccount) {
          jLines.push({
            journalId: journal.id,
            accountId: gstInputAccount.id,
            description: `GST on ${billNumber}`,
            debit: taxTotal.toFixed(2),
            credit: "0",
            sortOrder: sortIdx++,
          });
        }

        // CR Trade Creditors (full bill amount)
        jLines.push({
          journalId: journal.id,
          accountId: apAccount.id,
          description: `Bill ${billNumber} - ${data.supplierInvoiceNumber || ""}`,
          debit: "0",
          credit: total.toFixed(2),
          sortOrder: sortIdx,
        });

        await db.insert(journalLines).values(jLines);

        await db.update(bills)
          .set({ journalId: journal.id })
          .where(eq(bills.id, bill.id));
      }
    }

    await db.insert(auditLogs).values({
      tenantId: session.tenant.id,
      userId: session.user.id,
      action: "CREATE",
      entityType: "bill",
      entityId: bill.id,
      newValues: bill,
    });

    await db.insert(events).values({
      tenantId: session.tenant.id,
      aggregateId: bill.id,
      aggregateType: "bill",
      eventType: "bill_created",
      eventData: { billNumber, total, supplierId: data.supplierId },
      version: 1,
      userId: session.user.id,
    });

    return NextResponse.json({ bill }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("Error creating bill:", error);
    return NextResponse.json({ error: "Failed to create bill" }, { status: 500 });
  }
}