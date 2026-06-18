import { db } from "@/db";
import {
  suppliers,
  invoices,
  bankAccounts,
  employees,
  inventoryItems,
  purchaseOrders,
  leaveRequests,
  approvalWorkflows,
  payrollRuns,
} from "@/db/schema";
import { eq, sql, count } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const [supplierCount] = await db
    .select({ count: count() })
    .from(suppliers)
    .where(eq(suppliers.isActive, true));

  const [employeeCount] = await db
    .select({ count: count() })
    .from(employees)
    .where(eq(employees.isActive, true));

  const [inventoryCount] = await db
    .select({ count: count() })
    .from(inventoryItems)
    .where(eq(inventoryItems.isActive, true));

  const invoiceStats = await db
    .select({
      status: invoices.status,
      count: count(),
      total: sql<string>`COALESCE(SUM(${invoices.totalAmount}::numeric), 0)`,
    })
    .from(invoices)
    .groupBy(invoices.status);

  const [bankTotal] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${bankAccounts.currentBalance}::numeric), 0)`,
      count: count(),
    })
    .from(bankAccounts)
    .where(eq(bankAccounts.isActive, true));

  const [poStats] = await db
    .select({
      count: count(),
      total: sql<string>`COALESCE(SUM(${purchaseOrders.totalAmount}::numeric), 0)`,
    })
    .from(purchaseOrders);

  const [pendingLeave] = await db
    .select({ count: count() })
    .from(leaveRequests)
    .where(eq(leaveRequests.status, "pending"));

  const [pendingApprovals] = await db
    .select({ count: count() })
    .from(approvalWorkflows)
    .where(eq(approvalWorkflows.status, "pending"));

  const lowStockItems = await db
    .select()
    .from(inventoryItems)
    .where(
      sql`${inventoryItems.quantityOnHand} <= ${inventoryItems.reorderLevel} AND ${inventoryItems.isActive} = true`
    );

  const recentPayroll = await db
    .select()
    .from(payrollRuns)
    .orderBy(sql`${payrollRuns.createdAt} DESC`)
    .limit(1);

  return NextResponse.json({
    suppliers: supplierCount.count,
    employees: employeeCount.count,
    inventory: inventoryCount.count,
    invoices: invoiceStats,
    bankAccounts: {
      count: bankTotal.count,
      totalBalance: bankTotal.total,
    },
    purchaseOrders: {
      count: poStats.count,
      totalValue: poStats.total,
    },
    pendingLeave: pendingLeave.count,
    pendingApprovals: pendingApprovals.count,
    lowStockItems,
    lastPayroll: recentPayroll[0] || null,
  });
}
