import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { quotes, quoteLines, customers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { generateCode } from "@/lib/utils";

const quoteLineSchema = z.object({
  description: z.string().min(1),
  quantity: z.string().optional(),
  unitPrice: z.string(),
  discount: z.string().optional(),
  taxRate: z.string().optional(),
  accountId: z.string().uuid().optional(),
  sortOrder: z.number().optional(),
});

const quoteSchema = z.object({
  customerId: z.string().uuid(),
  date: z.string(),
  expiryDate: z.string(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  status: z.enum(["draft", "sent"]).optional(),
  lines: z.array(quoteLineSchema).min(1),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const quoteList = await db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        date: quotes.date,
        expiryDate: quotes.expiryDate,
        status: quotes.status,
        total: quotes.total,
        convertedInvoiceId: quotes.convertedInvoiceId,
        customerName: customers.name,
        customerCode: customers.code,
      })
      .from(quotes)
      .leftJoin(customers, eq(quotes.customerId, customers.id))
      .where(eq(quotes.tenantId, session.tenant.id))
      .orderBy(desc(quotes.createdAt))
      .limit(100);

    return NextResponse.json({ quotes: quoteList });
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
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
    const data = quoteSchema.parse(body);
    const tenantId = session.tenant.id;

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
      return { lineSubtotal, taxAmount, lineTotal: lineSubtotal + taxAmount };
    });
    const total = subtotal + taxTotal;

    const existing = await db
      .select({ quoteNumber: quotes.quoteNumber })
      .from(quotes)
      .where(eq(quotes.tenantId, tenantId))
      .orderBy(desc(quotes.createdAt))
      .limit(1);

    const lastNum = existing.length > 0
      ? parseInt(existing[0].quoteNumber.replace("QUO", "")) || 0
      : 0;
    const quoteNumber = generateCode("QUO", lastNum + 1);

    const [quote] = await db
      .insert(quotes)
      .values({
        tenantId,
        quoteNumber,
        customerId: data.customerId,
        date: data.date,
        expiryDate: data.expiryDate,
        status: data.status || "draft",
        reference: data.reference,
        notes: data.notes,
        terms: data.terms,
        subtotal: subtotal.toFixed(2),
        taxTotal: taxTotal.toFixed(2),
        total: total.toFixed(2),
        createdBy: session.user.id,
      })
      .returning();

    await db.insert(quoteLines).values(
      data.lines.map((line, i) => ({
        quoteId: quote.id,
        description: line.description,
        quantity: line.quantity || "1",
        unitPrice: line.unitPrice,
        discount: line.discount || "0",
        taxRate: line.taxRate || "0",
        taxAmount: lineCalcs[i].taxAmount.toFixed(2),
        lineTotal: lineCalcs[i].lineTotal.toFixed(2),
        accountId: line.accountId || null,
        sortOrder: line.sortOrder ?? i,
      }))
    );

    return NextResponse.json({ quote }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("Error creating quote:", error);
    return NextResponse.json({ error: "Failed to create quote" }, { status: 500 });
  }
}