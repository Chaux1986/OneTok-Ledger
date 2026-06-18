import { db } from "@/db";
import { receipts, suppliers } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { generateNumber } from "@/lib/utils";

export async function GET() {
  const data = await db
    .select({
      id: receipts.id,
      receiptNumber: receipts.receiptNumber,
      invoiceId: receipts.invoiceId,
      supplierId: receipts.supplierId,
      supplierName: suppliers.name,
      receiptDate: receipts.receiptDate,
      amount: receipts.amount,
      description: receipts.description,
      status: receipts.status,
      createdAt: receipts.createdAt,
    })
    .from(receipts)
    .leftJoin(suppliers, eq(receipts.supplierId, suppliers.id))
    .orderBy(desc(receipts.createdAt));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const [row] = await db
    .insert(receipts)
    .values({
      receiptNumber: body.receiptNumber || generateNumber("RCT"),
      invoiceId: body.invoiceId || null,
      supplierId: body.supplierId || null,
      receiptDate: body.receiptDate,
      amount: body.amount,
      description: body.description || null,
      status: body.status || "pending",
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
