import { db } from "@/db";
import { bankAccounts } from "@/db/schema";
import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const data = await db.select().from(bankAccounts).orderBy(desc(bankAccounts.createdAt));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const [row] = await db
    .insert(bankAccounts)
    .values({
      accountName: body.accountName,
      accountNumber: body.accountNumber,
      bankName: body.bankName,
      bsbCode: body.bsbCode || null,
      currency: body.currency || "PGK",
      currentBalance: body.currentBalance || "0",
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
