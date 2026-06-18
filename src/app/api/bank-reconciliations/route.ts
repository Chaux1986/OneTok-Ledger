import { db } from "@/db";
import { bankReconciliations, bankAccounts, bankTransactions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const data = await db
    .select({
      id: bankReconciliations.id,
      bankAccountId: bankReconciliations.bankAccountId,
      accountName: bankAccounts.accountName,
      transactionId: bankReconciliations.transactionId,
      invoiceId: bankReconciliations.invoiceId,
      receiptId: bankReconciliations.receiptId,
      reconciledAmount: bankReconciliations.reconciledAmount,
      status: bankReconciliations.status,
      reconciledAt: bankReconciliations.reconciledAt,
      notes: bankReconciliations.notes,
      createdAt: bankReconciliations.createdAt,
    })
    .from(bankReconciliations)
    .leftJoin(bankAccounts, eq(bankReconciliations.bankAccountId, bankAccounts.id))
    .orderBy(desc(bankReconciliations.createdAt));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const [row] = await db
    .insert(bankReconciliations)
    .values({
      bankAccountId: body.bankAccountId,
      transactionId: body.transactionId || null,
      invoiceId: body.invoiceId || null,
      receiptId: body.receiptId || null,
      reconciledAmount: body.reconciledAmount,
      status: body.status || "pending",
      notes: body.notes || null,
      reconciledAt: body.status === "matched" ? new Date() : null,
    })
    .returning();

  // Mark transaction as reconciled
  if (body.transactionId && body.status === "matched") {
    await db
      .update(bankTransactions)
      .set({ isReconciled: true })
      .where(eq(bankTransactions.id, body.transactionId));
  }

  return NextResponse.json(row, { status: 201 });
}
