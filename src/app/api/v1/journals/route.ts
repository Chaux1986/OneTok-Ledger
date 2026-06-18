import { NextResponse } from "next/server";
import { db } from "@/db";
import { journalEntries, journalLines } from "@/db/schema/journal";

export async function POST(req: Request) {
  const body = await req.json();

  const entry = await db
    .insert(journalEntries)
    .values({
      tenantId: body.tenantId,
      reference: body.reference,
      description: body.description,
      status: "draft",
      createdBy: body.userId,
    })
    .returning();

  const entryId = entry[0].id;

  const lines = body.lines.map((l: any) => ({
    journalEntryId: entryId,
    accountId: l.accountId,
    debit: l.debit ?? 0,
    credit: l.credit ?? 0,
    description: l.description,
  }));

  await db.insert(journalLines).values(lines);

  return NextResponse.json({
    success: true,
    journalId: entryId,
  });
}