import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  chartOfAccounts,
  invoices,
  bills,
  customers,
  suppliers,
  employees,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, sql, gte, lte } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.tenant.id;
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Get account balances by type
    const accountBalances = await db
      .select({
        accountType: chartOfAccounts.accountType,
        totalBalance: sql<string>`COALESCE(SUM(${chartOfAccounts.currentBalance}), 0)`,
      })
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.tenantId, tenantId),
          eq(chartOfAccounts.isActive, true)
        )
      )
      .groupBy(chartOfAccounts.accountType);

    // Calculate key financial metrics
    const assets = parseFloat(
      accountBalances.find((b) => b.accountType === "asset")?.totalBalance || "0"
    );
    const liabilities = parseFloat(
      accountBalances.find((b) => b.accountType === "liability")?.totalBalance || "0"
    );
    const revenue = parseFloat(
      accountBalances.find((b) => b.accountType === "revenue")?.totalBalance || "0"
    );
    const expenses = parseFloat(
      accountBalances.find((b) => b.accountType === "expense")?.totalBalance || "0"
    );

    // Get invoice stats
    const [invoiceStats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        totalValue: sql<string>`COALESCE(SUM(${invoices.total}), 0)`,
        outstanding: sql<string>`COALESCE(SUM(${invoices.amountDue}), 0)`,
      })
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId));

    // Get overdue invoices
    const [overdueInvoices] = await db
      .select({
        count: sql<number>`COUNT(*)`,
        total: sql<string>`COALESCE(SUM(${invoices.amountDue}), 0)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          eq(invoices.status, "overdue")
        )
      );

    // Get bill stats
    const [billStats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        totalValue: sql<string>`COALESCE(SUM(${bills.total}), 0)`,
        outstanding: sql<string>`COALESCE(SUM(${bills.amountDue}), 0)`,
      })
      .from(bills)
      .where(eq(bills.tenantId, tenantId));

    // Get counts
    const [customerCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(customers)
      .where(eq(customers.tenantId, tenantId));

    const [supplierCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(suppliers)
      .where(eq(suppliers.tenantId, tenantId));

    const [employeeCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(employees)
      .where(
        and(eq(employees.tenantId, tenantId), eq(employees.isActive, true))
      );

    const [accountCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.tenantId, tenantId),
          eq(chartOfAccounts.isActive, true)
        )
      );

    return NextResponse.json({
      financials: {
        totalAssets: assets,
        totalLiabilities: liabilities,
        netAssets: assets - liabilities,
        totalRevenue: Math.abs(revenue),
        totalExpenses: expenses,
        netProfit: Math.abs(revenue) - expenses,
      },
      receivables: {
        totalInvoices: invoiceStats?.total || 0,
        totalValue: parseFloat(invoiceStats?.totalValue || "0"),
        outstanding: parseFloat(invoiceStats?.outstanding || "0"),
        overdueCount: overdueInvoices?.count || 0,
        overdueValue: parseFloat(overdueInvoices?.total || "0"),
      },
      payables: {
        totalBills: billStats?.total || 0,
        totalValue: parseFloat(billStats?.totalValue || "0"),
        outstanding: parseFloat(billStats?.outstanding || "0"),
      },
      counts: {
        customers: customerCount?.count || 0,
        suppliers: supplierCount?.count || 0,
        employees: employeeCount?.count || 0,
        accounts: accountCount?.count || 0,
      },
      period: {
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString(),
      },
      tenant: {
        name: session.tenant.name,
        currency: session.tenant.currency,
        status: session.tenant.status,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
