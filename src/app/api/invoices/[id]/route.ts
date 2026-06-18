import { db } from "@/db";
import { invoices, invoiceLines } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, id));
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, id));
  return NextResponse.json({ ...inv, lines });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const [row] = await db
    .update(invoices)
    .set({
      status: body.status,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, id))
    .returning();
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(invoices).where(eq(invoices.id, id));
  return NextResponse.json({ success: true });
}
