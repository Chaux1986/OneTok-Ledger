import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const data = await db.select().from(inventoryItems).orderBy(desc(inventoryItems.createdAt));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const [row] = await db
    .insert(inventoryItems)
    .values({
      sku: body.sku,
      name: body.name,
      description: body.description || null,
      category: body.category || null,
      unit: body.unit || "each",
      unitCost: body.unitCost || "0",
      quantityOnHand: body.quantityOnHand || 0,
      reorderLevel: body.reorderLevel || 10,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
