import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bankTransactions, bankAccounts } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const transactionSchema = z.object({
  bankAccountId: z.string().uuid(),
  transactionDate: z.string(),
  description: z.string().min(1),
  reference: z.string().optional(),
  debit: z.string().optional(),
  credit: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const bankAccountId = searchParams.get("bankAccountId");
    const status = searchParams.get("status");

    const tenantId = session.tenant.id;

    const conditions = [eq(bankTransactions.tenantId, tenantId)];
    if (bankAccountId) conditions.push(eq(bankTransactions.bankAccountId, bankAccountId));
    if (status) conditions.push(eq(bankTransactions.status, status as "unreconciled" | "matched" | "reconciled"));

    const transactions = await db
      .select()
      .from(bankTransactions)
      .where(and(...conditions))
      .orderBy(desc(bankTransactions.transactionDate));

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Error fetching bank transactions:", error);
    return NextResponse.json({ error: "Failed to fetch bank transactions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["owner", "admin", "accountant"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = transactionSchema.parse(body);
    const tenantId = session.tenant.id;

    // Verify the bank account belongs to this tenant
    const [bankAccount] = await db
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, data.bankAccountId), eq(bankAccounts.tenantId, tenantId)))
      .limit(1);

    if (!bankAccount) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }

    const debit = parseFloat(data.debit || "0");
    const credit = parseFloat(data.credit || "0");

    if (debit === 0 && credit === 0) {
      return NextResponse.json({ error: "Enter either a debit or credit amount" }, { status: 400 });
    }

    const [transaction] = await db
      .insert(bankTransactions)
      .values({
        tenantId,
        bankAccountId: data.bankAccountId,
        transactionDate: data.transactionDate,
        description: data.description,
        reference: data.reference,
        debit: debit.toFixed(2),
        credit: credit.toFixed(2),
        status: "unreconciled",
        createdBy: session.user.id,
      })
      .returning();

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("Error creating bank transaction:", error);
    return NextResponse.json({ error: "Failed to create bank transaction" }, { status: 500 });
  }
}