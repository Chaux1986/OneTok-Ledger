import { db } from "@/db";
import { purchaseOrders, purchaseOrderLines, suppliers } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { generateNumber } from "@/lib/utils";

export async function GET() {
  const data = await db
    .select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      supplierId: purchaseOrders.supplierId,
      supplierName: suppliers.name,
      orderDate: purchaseOrders.orderDate,
      expectedDate: purchaseOrders.expectedDate,
      status: purchaseOrders.status,
      subtotal: purchaseOrders.subtotal,
      gstAmount: purchaseOrders.gstAmount,
      totalAmount: purchaseOrders.totalAmount,
      notes: purchaseOrders.notes,
      approvedBy: purchaseOrders.approvedBy,
      createdAt: purchaseOrders.createdAt,
    })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .orderBy(desc(purchaseOrders.createdAt));
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
  const gst = subtotal * 0.1;
  const total = subtotal + gst;

  const [po] = await db
    .insert(purchaseOrders)
    .values({
      poNumber: body.poNumber || generateNumber("PO"),
      supplierId: body.supplierId,
      orderDate: body.orderDate,
      expectedDate: body.expectedDate || null,
      status: body.status || "draft",
      subtotal: subtotal.toFixed(2),
      gstAmount: gst.toFixed(2),
      totalAmount: total.toFixed(2),
      notes: body.notes || null,
    })
    .returning();

  if (lines.length > 0) {
    await db.insert(purchaseOrderLines).values(
      lines.map(
        (l: {
          inventoryItemId: string;
          quantity: number;
          unitPrice: number;
        }) => ({
          purchaseOrderId: po.id,
          inventoryItemId: l.inventoryItemId,
          quantity: l.quantity,
          unitPrice: l.unitPrice.toString(),
          amount: (l.quantity * l.unitPrice).toFixed(2),
        })
      )
    );
  }

  return NextResponse.json(po, { status: 201 });
}
