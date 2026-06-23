import { NextRequest, NextResponse } from "next/server";
import {
  assets,
  employees,
  chartOfAccounts,
  journals,
  journalLines,
  auditLogs,
} from "@/db/schema";
import { db } from "@/db";
import { getSession } from "@/lib/auth";
import { eq, asc, and, desc } from "drizzle-orm";
import { z } from "zod";
import { generateCode } from "@/lib/utils";

const assetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.string(),
  purchasePrice: z.string(),
  depreciationMethod: z.string().optional(),
  usefulLife: z.number().min(1, "Useful life (months) is required"),
  salvageValue: z.string().optional(),
  assetAccountId: z.string().uuid().optional(),
  depreciationAccountId: z.string().uuid().optional(),
  accumulatedDepreciationAccountId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const list = await db
      .select({
        id: assets.id,
        assetNumber: assets.assetNumber,
        name: assets.name,
        category: assets.category,
        location: assets.location,
        purchaseDate: assets.purchaseDate,
        purchasePrice: assets.purchasePrice,
        currentValue: assets.currentValue,
        accumulatedDepreciation: assets.accumulatedDepreciation,
        depreciationMethod: assets.depreciationMethod,
        usefulLife: assets.usefulLife,
        salvageValue: assets.salvageValue,
        status: assets.status,
        assetAccountId: assets.assetAccountId,
        depreciationAccountId: assets.depreciationAccountId,
        accumulatedDepreciationAccountId: assets.accumulatedDepreciationAccountId,
        assignedTo: assets.assignedTo,
        assignedEmployeeName: employees.firstName,
        assignedEmployeeLastName: employees.lastName,
      })
      .from(assets)
      .leftJoin(employees, eq(assets.assignedTo, employees.id))
      .where(eq(assets.tenantId, session.tenant.id))
      .orderBy(asc(assets.assetNumber));

    return NextResponse.json({ assets: list });
  } catch (error) {
    console.error("Error fetching assets:", error);
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
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
    const data = assetSchema.parse(body);
    const tenantId = session.tenant.id;

    const existing = await db
      .select({ assetNumber: assets.assetNumber })
      .from(assets)
      .where(eq(assets.tenantId, tenantId));

    const maxNumber = existing.reduce((max, a) => {
      const num = parseInt(a.assetNumber.replace("AST", "")) || 0;
      return num > max ? num : max;
    }, 0);

    const assetNumber = generateCode("AST", maxNumber + 1);
    const purchasePrice = parseFloat(data.purchasePrice);

    const [asset] = await db
      .insert(assets)
      .values({
        tenantId,
        assetNumber,
        name: data.name,
        description: data.description,
        category: data.category,
        location: data.location,
        serialNumber: data.serialNumber,
        purchaseDate: data.purchaseDate,
        purchasePrice: purchasePrice.toFixed(2),
        currentValue: purchasePrice.toFixed(2),
        accumulatedDepreciation: "0",
        depreciationMethod: data.depreciationMethod || "straight_line",
        usefulLife: data.usefulLife,
        salvageValue: data.salvageValue || "0",
        status: "active",
        assetAccountId: data.assetAccountId || null,
        depreciationAccountId: data.depreciationAccountId || null,
        accumulatedDepreciationAccountId: data.accumulatedDepreciationAccountId || null,
        assignedTo: data.assignedTo || null,
      })
      .returning();

    let openingJournalId: string | null = null;

    // Post the asset's cost into the GL immediately — the same fix applied
    // to inventory opening stock. Recording an asset without recording its
    // value leaves the asset account with nothing to depreciate against,
    // and the asset's cost simply never appears anywhere in the ledger.
    if (purchasePrice > 0.01 && data.assetAccountId) {
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
            date: data.purchaseDate,
            description: `Opening asset value - ${assetNumber} ${data.name}`,
            reference: assetNumber,
            status: "posted",
            totalDebit: purchasePrice.toFixed(2),
            totalCredit: purchasePrice.toFixed(2),
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
            description: `Opening asset value - ${assetNumber}`,
            debit: purchasePrice.toFixed(2),
            credit: "0",
            sortOrder: 0,
          },
          {
            journalId: journal.id,
            accountId: openingEquityAccount.id,
            description: `Opening balance offset - ${assetNumber}`,
            debit: "0",
            credit: purchasePrice.toFixed(2),
            sortOrder: 1,
          },
        ]);
      }
    }

    await db.insert(auditLogs).values({
      tenantId,
      userId: session.user.id,
      action: "CREATE",
      entityType: "asset",
      entityId: asset.id,
      newValues: { ...asset, openingJournalId },
    });

    return NextResponse.json({ asset, openingJournalId }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("Error creating asset:", error);
    return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
  }
}