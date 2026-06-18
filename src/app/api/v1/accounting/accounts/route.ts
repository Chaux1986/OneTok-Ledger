import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chartOfAccounts, events, auditLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";

const accountSchema = z.object({
  code: z.string().min(1, "Account code is required"),
  name: z.string().min(1, "Account name is required"),
  description: z.string().optional(),
  accountType: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  accountSubtype: z
    .enum([
      "current_asset",
      "fixed_asset",
      "current_liability",
      "long_term_liability",
      "equity",
      "operating_revenue",
      "other_revenue",
      "operating_expense",
      "other_expense",
      "cost_of_sales",
    ])
    .optional(),
  parentId: z.string().uuid().optional(),
  taxCode: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  openingBalance: z.string().optional(),
});

// GET - List accounts
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await db
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.tenantId, session.tenant.id))
      .orderBy(asc(chartOfAccounts.code));

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

// POST - Create account
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    if (!["owner", "admin", "accountant"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = accountSchema.parse(body);

    // Check if account code already exists
    const [existing] = await db
      .select()
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.tenantId, session.tenant.id),
          eq(chartOfAccounts.code, data.code)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Account code already exists" },
        { status: 400 }
      );
    }

    // Create account
    const [account] = await db
      .insert(chartOfAccounts)
      .values({
        tenantId: session.tenant.id,
        code: data.code,
        name: data.name,
        description: data.description,
        accountType: data.accountType,
        accountSubtype: data.accountSubtype,
        parentId: data.parentId,
        taxCode: data.taxCode,
        bankAccountNumber: data.bankAccountNumber,
        openingBalance: data.openingBalance || "0",
        currentBalance: data.openingBalance || "0",
      })
      .returning();

    // Create event for event sourcing
    await db.insert(events).values({
      tenantId: session.tenant.id,
      aggregateId: account.id,
      aggregateType: "chart_of_accounts",
      eventType: "account_created",
      eventData: {
        code: account.code,
        name: account.name,
        accountType: account.accountType,
        openingBalance: account.openingBalance,
      },
      version: 1,
      userId: session.user.id,
    });

    // Create audit log
    await db.insert(auditLogs).values({
      tenantId: session.tenant.id,
      userId: session.user.id,
      action: "CREATE",
      entityType: "chart_of_accounts",
      entityId: account.id,
      newValues: account,
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating account:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
