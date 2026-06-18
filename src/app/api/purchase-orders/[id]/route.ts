import { db } from "@/db";
import { purchaseOrders, purchaseOrderLines, inventoryItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const lines = await db
    .select({
      id: purchaseOrderLines.id,
      inventoryItemId: purchaseOrderLines.inventoryItemId,
      itemName: inventoryItems.name,
      itemSku: inventoryItems.sku,
      quantity: purchaseOrderLines.quantity,
      unitPrice: purchaseOrderLines.unitPrice,
      amount: purchaseOrderLines.amount,
      receivedQuantity: purchaseOrderLines.receivedQuantity,
    })
    .from(purchaseOrderLines)
    .leftJoin(inventoryItems, eq(purchaseOrderLines.inventoryItemId, inventoryItems.id))
    .where(eq(purchaseOrderLines.purchaseOrderId, id));

  return NextResponse.json({ ...po, lines });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const updateData: Record<string, unknown> = { status: body.status };
  if (body.status === "approved") {
    updateData.approvedBy = body.approvedBy || "System";
    updateData.approvedAt = new Date();
  }

  const [row] = await db
    .update(purchaseOrders)
    .set(updateData)
    .where(eq(purchaseOrders.id, id))
    .returning();
  return NextResponse.json(row);
}
