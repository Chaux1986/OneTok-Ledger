import { db } from "@/db";
import { invoices, invoiceLines, suppliers } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { generateNumber } from "@/lib/utils";

export async function GET() {
  const data = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      supplierId: invoices.supplierId,
      supplierName: suppliers.name,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      subtotal: invoices.subtotal,
      gstAmount: invoices.gstAmount,
      totalAmount: invoices.totalAmount,
      status: invoices.status,
      description: invoices.description,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .leftJoin(suppliers, eq(invoices.supplierId, suppliers.id))
    .orderBy(desc(invoices.createdAt));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const lines = body.lines || [];
  const subtotal = lines.reduce(
    (sum: number, l: { quantity: number; unitPrice: number }) =>
      sum + l.quantity * l.unitPrice,
    0
  );
  const gst = subtotal * 0.1; // 10% GST
  const total = subtotal + gst;

  const [inv] = await db
    .insert(invoices)
    .values({
      invoiceNumber: body.invoiceNumber || generateNumber("INV"),
      supplierId: body.supplierId || null,
      issueDate: body.issueDate,
      dueDate: body.dueDate,
      subtotal: subtotal.toFixed(2),
      gstAmount: gst.toFixed(2),
      totalAmount: total.toFixed(2),
      status: body.status || "draft",
      description: body.description || null,
    })
    .returning();

  if (lines.length > 0) {
    await db.insert(invoiceLines).values(
      lines.map((l: { description: string; quantity: number; unitPrice: number }) => ({
        invoiceId: inv.id,
        description: l.description,
        quantity: l.quantity.toString(),
        unitPrice: l.unitPrice.toString(),
        amount: (l.quantity * l.unitPrice).toFixed(2),
      }))
    );
  }

  return NextResponse.json(inv, { status: 201 });
}
