import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { quotes, quoteLines, customers, chartOfAccounts } from "@/db/schema";
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

    const [quote] = await db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        date: quotes.date,
        expiryDate: quotes.expiryDate,
        status: quotes.status,
        reference: quotes.reference,
        subtotal: quotes.subtotal,
        taxTotal: quotes.taxTotal,
        total: quotes.total,
        notes: quotes.notes,
        terms: quotes.terms,
        customerId: quotes.customerId,
        customerName: customers.name,
        customerCode: customers.code,
        convertedInvoiceId: quotes.convertedInvoiceId,
        convertedAt: quotes.convertedAt,
      })
      .from(quotes)
      .leftJoin(customers, eq(quotes.customerId, customers.id))
      .where(and(eq(quotes.id, id), eq(quotes.tenantId, session.tenant.id)))
      .limit(1);

    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    const lines = await db
      .select({
        id: quoteLines.id,
        description: quoteLines.description,
        quantity: quoteLines.quantity,
        unitPrice: quoteLines.unitPrice,
        taxRate: quoteLines.taxRate,
        taxAmount: quoteLines.taxAmount,
        lineTotal: quoteLines.lineTotal,
        accountId: quoteLines.accountId,
        accountName: chartOfAccounts.name,
      })
      .from(quoteLines)
      .leftJoin(chartOfAccounts, eq(quoteLines.accountId, chartOfAccounts.id))
      .where(eq(quoteLines.quoteId, id));

    return NextResponse.json({ quote: { ...quote, lines } });
  } catch (error) {
    console.error("Error fetching quote:", error);
    return NextResponse.json({ error: "Failed to fetch quote" }, { status: 500 });
  }
}