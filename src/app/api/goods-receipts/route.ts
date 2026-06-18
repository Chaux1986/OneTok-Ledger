import { db } from "@/db";
import {
  goodsReceipts,
  goodsReceiptLines,
  purchaseOrders,
  purchaseOrderLines,
  inventoryItems,
} from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { generateNumber } from "@/lib/utils";
import { sql } from "drizzle-orm";

export async function GET() {
  const data = await db
    .select({
      id: goodsReceipts.id,
      grNumber: goodsReceipts.grNumber,
      purchaseOrderId: goodsReceipts.purchaseOrderId,
      poNumber: purchaseOrders.poNumber,
      receivedDate: goodsReceipts.receivedDate,
      status: goodsReceipts.status,
      receivedBy: goodsReceipts.receivedBy,
      notes: goodsReceipts.notes,
      createdAt: goodsReceipts.createdAt,
    })
    .from(goodsReceipts)
    .leftJoin(purchaseOrders, eq(goodsReceipts.purchaseOrderId, purchaseOrders.id))
    .orderBy(desc(goodsReceipts.createdAt));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const lines = body.lines || [];

  const [gr] = await db
    .insert(goodsReceipts)
    .values({
      grNumber: body.grNumber || generateNumber("GR"),
      purchaseOrderId: body.purchaseOrderId,
      receivedDate: body.receivedDate,
      status: body.status || "pending",
      receivedBy: body.receivedBy || null,
      notes: body.notes || null,
    })
    .returning();

  if (lines.length > 0) {
    await db.insert(goodsReceiptLines).values(
      lines.map(
        (l: {
          purchaseOrderLineId: string;
          quantityReceived: number;
          quantityAccepted: number;
          quantityRejected: number;
        }) => ({
          goodsReceiptId: gr.id,
          purchaseOrderLineId: l.purchaseOrderLineId,
          quantityReceived: l.quantityReceived,
          quantityAccepted: l.quantityAccepted || l.quantityReceived,
          quantityRejected: l.quantityRejected || 0,
        })
      )
    );

    // Update PO line received quantities and inventory
    for (const l of lines) {
      await db
        .update(purchaseOrderLines)
        .set({
          receivedQuantity: sql`${purchaseOrderLines.receivedQuantity} + ${l.quantityAccepted || l.quantityReceived}`,
        })
        .where(eq(purchaseOrderLines.id, l.purchaseOrderLineId));

      // Get the PO line to find inventory item
      const [poLine] = await db
        .select()
        .from(purchaseOrderLines)
        .where(eq(purchaseOrderLines.id, l.purchaseOrderLineId));

      if (poLine) {
        await db
          .update(inventoryItems)
          .set({
            quantityOnHand: sql`${inventoryItems.quantityOnHand} + ${l.quantityAccepted || l.quantityReceived}`,
            updatedAt: new Date(),
          })
          .where(eq(inventoryItems.id, poLine.inventoryItemId));
      }
    }
  }

  return NextResponse.json(gr, { status: 201 });
}
