import { NextRequest, NextResponse } from "next/server";
import {
  assets,
  journals,
  journalLines,
  events,
  auditLogs,
} from "@/db/schema";
import { db } from "@/db";
import { getSession } from "@/lib/auth";
import { eq, and, desc, gte, lt } from "drizzle-orm";
import { z } from "zod";
import { generateCode } from "@/lib/utils";

const depreciationRunSchema = z.object({
  periodDate: z.string(),
  assetIds: z.array(z.string().uuid()).min(1, "Select at least one asset"),
});

function monthlyDepreciation(asset: { purchasePrice: string; salvageValue: string | null; usefulLife: number | null; accumulatedDepreciation: string | null }) {
  const cost = parseFloat(asset.purchasePrice || "0");
  const salvage = parseFloat(asset.salvageValue || "0");
  const lifeMonths = asset.usefulLife || 0;
  const accumulated = parseFloat(asset.accumulatedDepreciation || "0");

  if (lifeMonths <= 0) return { amount: 0, fullyDepreciated: false };

  const depreciableBase = Math.max(cost - salvage, 0);
  const monthlyAmount = depreciableBase / lifeMonths;

  const remaining = depreciableBase - accumulated;
  const amount = Math.min(monthlyAmount, Math.max(remaining, 0));

  return { amount: Math.round(amount * 100) / 100, fullyDepreciated: remaining <= 0.01 };
}

function monthBounds(dateStr: string) {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { start, end };
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const list = await db
      .select()
      .from(assets)
      .where(and(eq(assets.tenantId, session.tenant.id), eq(assets.status, "active")));

    const preview = list.map((a) => {
      const { amount, fullyDepreciated } = monthlyDepreciation(a);
      return {
        id: a.id,
        assetNumber: a.assetNumber,
        name: a.name,
        purchasePrice: a.purchasePrice,
        accumulatedDepreciation: a.accumulatedDepreciation,
        usefulLife: a.usefulLife,
        monthlyDepreciation: amount,
        fullyDepreciated,
        hasAccounts: !!(a.depreciationAccountId && a.accumulatedDepreciationAccountId),
      };
    });

    return NextResponse.json({ assets: preview });
  } catch (error) {
    console.error("Error previewing depreciation:", error);
    return NextResponse.json({ error: "Failed to preview depreciation" }, { status: 500 });
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
    const data = depreciationRunSchema.parse(body);
    const tenantId = session.tenant.id;

    const selectedAssets = await db
      .select()
      .from(assets)
      .where(and(eq(assets.tenantId, tenantId), eq(assets.status, "active")));

    const assetsToRun = selectedAssets.filter((a) => data.assetIds.includes(a.id));
    if (assetsToRun.length === 0) {
      return NextResponse.json({ error: "No matching active assets found" }, { status: 400 });
    }

    // Guard: don't let an asset be depreciated twice in the same calendar
    // month. Without this, re-running the page (double click, retried
    // request, etc.) silently doubles up the journal — the depreciation
    // amount stays internally balanced on its own, so nothing here ever
    // throws an "unbalanced" error; it just quietly overstates expense and
    // accumulated depreciation until someone notices the numbers don't
    // match the asset register.
    const { start, end } = monthBounds(data.periodDate);
    const alreadyRun = await db
      .select({ aggregateId: events.aggregateId })
      .from(events)
      .where(
        and(
          eq(events.tenantId, tenantId),
          eq(events.eventType, "asset_depreciated"),
          gte(events.occurredAt, start),
          lt(events.occurredAt, end)
        )
      );

    const alreadyRunIds = new Set(alreadyRun.map((e) => e.aggregateId));
    const skippedAlreadyRun = assetsToRun.filter((a) => alreadyRunIds.has(a.id)).map((a) => a.assetNumber);
    const eligibleAssets = assetsToRun.filter((a) => !alreadyRunIds.has(a.id));

    const calcs = eligibleAssets
      .map((asset) => ({ asset, ...monthlyDepreciation(asset) }))
      .filter((c) => c.amount > 0.01 && c.asset.depreciationAccountId && c.asset.accumulatedDepreciationAccountId);

    if (calcs.length === 0) {
      return NextResponse.json(
        {
          error: skippedAlreadyRun.length > 0
            ? `Already depreciated this period: ${skippedAlreadyRun.join(", ")}`
            : "No depreciation to post — assets may be fully depreciated or missing GL account mappings",
        },
        { status: 400 }
      );
    }

    const totalDepreciation = calcs.reduce((s, c) => s + c.amount, 0);

    const lastJournal = await db
      .select({ journalNumber: journals.journalNumber })
      .from(journals)
      .where(eq(journals.tenantId, tenantId))
      .orderBy(desc(journals.createdAt))
      .limit(1);

    const lastJNum = lastJournal.length > 0 ? parseInt(lastJournal[0].journalNumber.replace("JNL", "")) || 0 : 0;
    const journalNumber = generateCode("JNL", lastJNum + 1);

    const [journal] = await db
      .insert(journals)
      .values({
        tenantId,
        journalNumber,
        date: data.periodDate,
        description: `Depreciation run - ${calcs.length} asset(s)`,
        reference: "DEPR",
        status: "posted",
        totalDebit: totalDepreciation.toFixed(2),
        totalCredit: totalDepreciation.toFixed(2),
        createdBy: session.user.id,
        postedBy: session.user.id,
        postedAt: new Date(),
      })
      .returning();

    const expenseTotals = new Map<string, number>();
    const accumTotals = new Map<string, number>();

    for (const c of calcs) {
      const depAccId = c.asset.depreciationAccountId!;
      const accumAccId = c.asset.accumulatedDepreciationAccountId!;
      expenseTotals.set(depAccId, (expenseTotals.get(depAccId) || 0) + c.amount);
      accumTotals.set(accumAccId, (accumTotals.get(accumAccId) || 0) + c.amount);
    }

    const jLines: Array<{ journalId: string; accountId: string; description: string; debit: string; credit: string; sortOrder: number }> = [];
    let sortIdx = 0;

    for (const [accId, amount] of expenseTotals) {
      jLines.push({
        journalId: journal.id,
        accountId: accId,
        description: `Depreciation expense - ${journalNumber}`,
        debit: amount.toFixed(2),
        credit: "0",
        sortOrder: sortIdx++,
      });
    }
    for (const [accId, amount] of accumTotals) {
      jLines.push({
        journalId: journal.id,
        accountId: accId,
        description: `Accumulated depreciation - ${journalNumber}`,
        debit: "0",
        credit: amount.toFixed(2),
        sortOrder: sortIdx++,
      });
    }

    await db.insert(journalLines).values(jLines);

    for (const c of calcs) {
      const newAccumulated = parseFloat(c.asset.accumulatedDepreciation || "0") + c.amount;
      const newCurrentValue = parseFloat(c.asset.purchasePrice || "0") - newAccumulated;

      await db
        .update(assets)
        .set({
          accumulatedDepreciation: newAccumulated.toFixed(2),
          currentValue: Math.max(newCurrentValue, parseFloat(c.asset.salvageValue || "0")).toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(assets.id, c.asset.id));

      await db.insert(events).values({
        tenantId,
        aggregateId: c.asset.id,
        aggregateType: "asset",
        eventType: "asset_depreciated",
        eventData: { assetNumber: c.asset.assetNumber, amount: c.amount, journalNumber, periodDate: data.periodDate },
        version: 1,
        userId: session.user.id,
      });
    }

    await db.insert(auditLogs).values({
      tenantId,
      userId: session.user.id,
      action: "DEPRECIATE",
      entityType: "journal",
      entityId: journal.id,
      newValues: { journalNumber, totalDepreciation, assetCount: calcs.length, skippedAlreadyRun },
    });

    return NextResponse.json({
      journal: { ...journal },
      assetsProcessed: calcs.length,
      totalDepreciation: totalDepreciation.toFixed(2),
      skippedAlreadyRun,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("Error running depreciation:", error);
    return NextResponse.json({ error: "Failed to run depreciation" }, { status: 500 });
  }
}