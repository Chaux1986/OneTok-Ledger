import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const [row] = await db
    .update(inventoryItems)
    .set({
      sku: body.sku,
      name: body.name,
      description: body.description || null,
      category: body.category || null,
      unit: body.unit || "each",
      unitCost: body.unitCost || "0",
      quantityOnHand: body.quantityOnHand ?? 0,
      reorderLevel: body.reorderLevel ?? 10,
      isActive: body.isActive ?? true,
      updatedAt: new Date(),
    })
    .where(eq(inventoryItems.id, id))
    .returning();
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  return NextResponse.json({ success: true });
}
