import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, warehouses, stockLevels, chartOfAccounts, journals, journalLines } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, asc, and, desc } from "drizzle-orm";
import { z } from "zod";
import { generateCode } from "@/lib/utils";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().optional(),
  costPrice: z.string().optional(),
  sellPrice: z.string().optional(),
  taxRate: z.string().optional(),
  reorderLevel: z.number().optional(),
  reorderQuantity: z.number().optional(),
  incomeAccountId: z.string().uuid().optional(),
  expenseAccountId: z.string().uuid().optional(),
  assetAccountId: z.string().uuid().optional(),
  initialQuantity: z.string().optional(),
  initialWarehouseId: z.string().uuid().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenant.id;

    const productList = await db
      .select()
      .from(products)
      .where(eq(products.tenantId, tenantId))
      .orderBy(asc(products.name));

    const stockByProduct = await db
      .select({
        productId: stockLevels.productId,
        quantity: stockLevels.quantity,
      })
      .from(stockLevels)
      .innerJoin(products, eq(products.id, stockLevels.productId))
      .where(eq(products.tenantId, tenantId));

    const totals = new Map<string, number>();
    for (const s of stockByProduct) {
      totals.set(s.productId, (totals.get(s.productId) || 0) + parseFloat(s.quantity || "0"));
    }

    const withStock = productList.map((p) => ({
      ...p,
      totalQuantity: totals.get(p.id) || 0,
    }));

    return NextResponse.json({ products: withStock });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["owner", "admin", "inventory_manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = productSchema.parse(body);
    const tenantId = session.tenant.id;

    const existing = await db
      .select({ sku: products.sku })
      .from(products)
      .where(eq(products.tenantId, tenantId));

    const maxNumber = existing.reduce((max, p) => {
      const num = parseInt(p.sku.replace("SKU", "")) || 0;
      return num > max ? num : max;
    }, 0);

    const sku = generateCode("SKU", maxNumber + 1);

    const [product] = await db
      .insert(products)
      .values({
        tenantId,
        sku,
        name: data.name,
        description: data.description,
        category: data.category,
        unit: data.unit || "each",
        costPrice: data.costPrice || "0",
        sellPrice: data.sellPrice || "0",
        taxRate: data.taxRate || "0",
        reorderLevel: data.reorderLevel || 0,
        reorderQuantity: data.reorderQuantity || 0,
        incomeAccountId: data.incomeAccountId || null,
        expenseAccountId: data.expenseAccountId || null,
        assetAccountId: data.assetAccountId || null,
      })
      .returning();

    let openingJournalId: string | null = null;

    // Seed initial stock quantity into a warehouse, and — critically — post
    // its value into the GL at the same time. Recording a quantity without
    // recording the matching value is how an inventory asset account ends
    // up with no balance to draw down from, which silently corrupts later
    // adjustments (an account can go negative with nothing to show why).
    if (data.initialQuantity && data.initialWarehouseId && parseFloat(data.initialQuantity) > 0) {
      const [warehouse] = await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.id, data.initialWarehouseId))
        .limit(1);

      if (warehouse) {
        await db.insert(stockLevels).values({
          productId: product.id,
          warehouseId: data.initialWarehouseId,
          quantity: data.initialQuantity,
          reservedQuantity: "0",
        });

        const openingValue = parseFloat(data.initialQuantity) * parseFloat(data.costPrice || "0");

        if (openingValue > 0.01 && data.assetAccountId) {
          const [openingEquityAccount] = await db
            .select()
            .from(chartOfAccounts)
            .where(and(eq(chartOfAccounts.tenantId, tenantId), eq(chartOfAccounts.code, "3500")))
            .limit(1);

          if (openingEquityAccount) {
            const lastJournal = await db
              .select({ journalNumber: journals.journalNumber })
              .from(journals)
              .where(eq(journals.tenantId, tenantId))
              .orderBy(desc(journals.createdAt))
              .limit(1);

            const lastJNum = lastJournal.length > 0
              ? parseInt(lastJournal[0].journalNumber.replace("JNL", "")) || 0
              : 0;
            const journalNumber = generateCode("JNL", lastJNum + 1);

            const [journal] = await db
              .insert(journals)
              .values({
                tenantId,
                journalNumber,
                date: new Date().toISOString().split("T")[0],
                description: `Opening stock value - ${sku} ${product.name}`,
                reference: sku,
                status: "posted",
                totalDebit: openingValue.toFixed(2),
                totalCredit: openingValue.toFixed(2),
                createdBy: session.user.id,
                postedBy: session.user.id,
                postedAt: new Date(),
              })
              .returning();

            openingJournalId = journal.id;

            await db.insert(journalLines).values([
              {
                journalId: journal.id,
                accountId: data.assetAccountId,
                description: `Opening stock - ${data.initialQuantity} ${data.unit || "each"}`,
                debit: openingValue.toFixed(2),
                credit: "0",
                sortOrder: 0,
              },
              {
                journalId: journal.id,
                accountId: openingEquityAccount.id,
                description: `Opening balance offset - ${sku}`,
                debit: "0",
                credit: openingValue.toFixed(2),
                sortOrder: 1,
              },
            ]);
          }
        }
      }
    }

    return NextResponse.json({ product, openingJournalId }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}