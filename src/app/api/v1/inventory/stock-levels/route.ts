import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  stockLevels,
  products,
  warehouses,
  chartOfAccounts,
  journals,
  journalLines,
  events,
  auditLogs,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { generateCode } from "@/lib/utils";

const adjustmentSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  newQuantity: z.string(),
  reason: z.string().min(1, "Reason is required"),
  date: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenant.id;

    const levels = await db
      .select({
        id: stockLevels.id,
        productId: stockLevels.productId,
        warehouseId: stockLevels.warehouseId,
        quantity: stockLevels.quantity,
        reservedQuantity: stockLevels.reservedQuantity,
        updatedAt: stockLevels.updatedAt,
        productSku: products.sku,
        productName: products.name,
        productUnit: products.unit,
        costPrice: products.costPrice,
        warehouseCode: warehouses.code,
        warehouseName: warehouses.name,
      })
      .from(stockLevels)
      .innerJoin(products, eq(products.id, stockLevels.productId))
      .innerJoin(warehouses, eq(warehouses.id, stockLevels.warehouseId))
      .where(eq(products.tenantId, tenantId))
      .orderBy(products.name);

    return NextResponse.json({ stockLevels: levels });
  } catch (error) {
    console.error("Error fetching stock levels:", error);
    return NextResponse.json({ error: "Failed to fetch stock levels" }, { status: 500 });
  }
}

// POST - Adjust stock quantity (and post the value difference to the GL)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["owner", "admin", "inventory_manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = adjustmentSchema.parse(body);
    const tenantId = session.tenant.id;

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, data.productId), eq(products.tenantId, tenantId)))
      .limit(1);

    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const [existingLevel] = await db
      .select()
      .from(stockLevels)
      .where(and(eq(stockLevels.productId, data.productId), eq(stockLevels.warehouseId, data.warehouseId)))
      .limit(1);

    const oldQty = parseFloat(existingLevel?.quantity || "0");
    const newQty = parseFloat(data.newQuantity);
    const qtyDiff = newQty - oldQty;
    const costPrice = parseFloat(product.costPrice || "0");
    const valueDiff = qtyDiff * costPrice;

    // Upsert stock level
    if (existingLevel) {
      await db
        .update(stockLevels)
        .set({ quantity: newQty.toString(), updatedAt: new Date() })
        .where(eq(stockLevels.id, existingLevel.id));
    } else {
      await db.insert(stockLevels).values({
        productId: data.productId,
        warehouseId: data.warehouseId,
        quantity: newQty.toString(),
        reservedQuantity: "0",
      });
    }

    let journalId: string | null = null;

    // Post to GL if there's a value change and the product has inventory/COGS accounts wired
    if (Math.abs(valueDiff) > 0.01) {
      const inventoryAccountId = product.assetAccountId;
      const cogsAccount = inventoryAccountId
        ? null
        : (await db.select().from(chartOfAccounts).where(and(eq(chartOfAccounts.tenantId, tenantId), eq(chartOfAccounts.code, "5100"))).limit(1))[0];

      const stockAccount = inventoryAccountId
        ? (await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.id, inventoryAccountId)).limit(1))[0]
        : (await db.select().from(chartOfAccounts).where(and(eq(chartOfAccounts.tenantId, tenantId), eq(chartOfAccounts.code, "1310"))).limit(1))[0];

      const adjustmentExpenseAccount = (
        await db.select().from(chartOfAccounts).where(and(eq(chartOfAccounts.tenantId, tenantId), eq(chartOfAccounts.code, "5100"))).limit(1)
      )[0];

      if (stockAccount && adjustmentExpenseAccount) {
        const lastJournal = await db
          .select({ journalNumber: journals.journalNumber })
          .from(journals)
          .where(eq(journals.tenantId, tenantId))
          .orderBy(desc(journals.createdAt))
          .limit(1);

        const lastJNum = lastJournal.length > 0 ? parseInt(lastJournal[0].journalNumber.replace("JNL", "")) || 0 : 0;
        const journalNumber = generateCode("JNL", lastJNum + 1);
        const absValue = Math.abs(valueDiff);

        const [journal] = await db
          .insert(journals)
          .values({
            tenantId,
            journalNumber,
            date: data.date,
            description: `Stock adjustment - ${product.name} (${data.reason})`,
            reference: product.sku,
            status: "posted",
            totalDebit: absValue.toFixed(2),
            totalCredit: absValue.toFixed(2),
            createdBy: session.user.id,
            postedBy: session.user.id,
            postedAt: new Date(),
          })
          .returning();

        journalId = journal.id;

        // Stock increase: DR Inventory, CR Cost of Goods Sold (reversing an expense / write-up)
        // Stock decrease: DR Cost of Goods Sold, CR Inventory (write-off)
        const lines = qtyDiff > 0
          ? [
              { accountId: stockAccount.id, debit: absValue.toFixed(2), credit: "0", description: `Stock increase - ${product.name}` },
              { accountId: adjustmentExpenseAccount.id, debit: "0", credit: absValue.toFixed(2), description: `Stock adjustment offset - ${data.reason}` },
            ]
          : [
              { accountId: adjustmentExpenseAccount.id, debit: absValue.toFixed(2), credit: "0", description: `Stock write-off - ${data.reason}` },
              { accountId: stockAccount.id, debit: "0", credit: absValue.toFixed(2), description: `Stock decrease - ${product.name}` },
            ];

        await db.insert(journalLines).values(
          lines.map((l, i) => ({ journalId: journal.id, sortOrder: i, ...l }))
        );
      }
    }

    await db.insert(events).values({
      tenantId,
      aggregateId: data.productId,
      aggregateType: "product",
      eventType: "stock_adjusted",
      eventData: { sku: product.sku, oldQty, newQty, qtyDiff, valueDiff, reason: data.reason },
      version: 1,
      userId: session.user.id,
    });

    await db.insert(auditLogs).values({
      tenantId,
      userId: session.user.id,
      action: "ADJUST",
      entityType: "stock_level",
      entityId: data.productId,
      newValues: { oldQty, newQty, reason: data.reason, journalId },
    });

    return NextResponse.json({
      success: true,
      oldQuantity: oldQty,
      newQuantity: newQty,
      valueDifference: valueDiff.toFixed(2),
      journalId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("Error adjusting stock:", error);
    return NextResponse.json({ error: "Failed to adjust stock" }, { status: 500 });
  }
}