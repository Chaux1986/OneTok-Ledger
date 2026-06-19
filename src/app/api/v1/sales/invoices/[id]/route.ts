import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, invoiceLines, customers, chartOfAccounts } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const [invoice] = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        date: invoices.date,
        dueDate: invoices.dueDate,
        status: invoices.status,
        reference: invoices.reference,
        subtotal: invoices.subtotal,
        taxTotal: invoices.taxTotal,
        total: invoices.total,
        amountPaid: invoices.amountPaid,
        amountDue: invoices.amountDue,
        notes: invoices.notes,
        terms: invoices.terms,
        customerId: invoices.customerId,
        customerName: customers.name,
        customerCode: customers.code,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, session.tenant.id)))
      .limit(1);

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const lines = await db
      .select({
        id: invoiceLines.id,
        description: invoiceLines.description,
        quantity: invoiceLines.quantity,
        unitPrice: invoiceLines.unitPrice,
        taxRate: invoiceLines.taxRate,
        taxAmount: invoiceLines.taxAmount,
        lineTotal: invoiceLines.lineTotal,
        accountName: chartOfAccounts.name,
      })
      .from(invoiceLines)
      .leftJoin(chartOfAccounts, eq(invoiceLines.accountId, chartOfAccounts.id))
      .where(eq(invoiceLines.invoiceId, id));

    return NextResponse.json({ invoice: { ...invoice, lines } });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json({ error: "Failed to fetch invoice" }, { status: 500 });
  }
}
