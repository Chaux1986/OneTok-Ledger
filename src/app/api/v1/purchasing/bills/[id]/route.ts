import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bills, billLines, suppliers, chartOfAccounts } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const [bill] = await db
      .select({
        id: bills.id,
        billNumber: bills.billNumber,
        supplierInvoiceNumber: bills.supplierInvoiceNumber,
        date: bills.date,
        dueDate: bills.dueDate,
        status: bills.status,
        subtotal: bills.subtotal,
        taxTotal: bills.taxTotal,
        total: bills.total,
        amountPaid: bills.amountPaid,
        amountDue: bills.amountDue,
        notes: bills.notes,
        supplierId: bills.supplierId,
        supplierName: suppliers.name,
        supplierCode: suppliers.code,
      })
      .from(bills)
      .leftJoin(suppliers, eq(bills.supplierId, suppliers.id))
      .where(and(eq(bills.id, id), eq(bills.tenantId, session.tenant.id)))
      .limit(1);

    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });

    const lines = await db
      .select({
        id: billLines.id,
        description: billLines.description,
        quantity: billLines.quantity,
        unitPrice: billLines.unitPrice,
        taxRate: billLines.taxRate,
        taxAmount: billLines.taxAmount,
        lineTotal: billLines.lineTotal,
        accountName: chartOfAccounts.name,
      })
      .from(billLines)
      .leftJoin(chartOfAccounts, eq(billLines.accountId, chartOfAccounts.id))
      .where(eq(billLines.billId, id));

    return NextResponse.json({ bill: { ...bill, lines } });
  } catch (error) {
    console.error("Error fetching bill:", error);
    return NextResponse.json({ error: "Failed to fetch bill" }, { status: 500 });
  }
}
