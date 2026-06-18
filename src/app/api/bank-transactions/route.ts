import { db } from "@/db";
import { bankTransactions, bankAccounts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const data = await db
    .select({
      id: bankTransactions.id,
      bankAccountId: bankTransactions.bankAccountId,
      accountName: bankAccounts.accountName,
      transactionDate: bankTransactions.transactionDate,
      description: bankTransactions.description,
      debit: bankTransactions.debit,
      credit: bankTransactions.credit,
      balance: bankTransactions.balance,
      reference: bankTransactions.reference,
      isReconciled: bankTransactions.isReconciled,
      createdAt: bankTransactions.createdAt,
    })
    .from(bankTransactions)
    .leftJoin(bankAccounts, eq(bankTransactions.bankAccountId, bankAccounts.id))
    .orderBy(desc(bankTransactions.transactionDate));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const [row] = await db
    .insert(bankTransactions)
    .values({
      bankAccountId: body.bankAccountId,
      transactionDate: body.transactionDate,
      description: body.description,
      debit: body.debit || "0",
      credit: body.credit || "0",
      balance: body.balance || null,
      reference: body.reference || null,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
