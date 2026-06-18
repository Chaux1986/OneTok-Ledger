import { NextResponse } from "next/server";
import { db } from "@/db";
import { journalEntries, journalLines } from "@/db/schema/journal";
import { eq } from "drizzle-orm";
import { validateJournal } from "@/lib/accounting/validate-journal";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const entryId = params.id;

  const entry = await db.query.journalEntries.findFirst({
    where: eq(journalEntries.id, entryId),
    with: { lines: true },
  });

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (entry.status === "posted") {
    return NextResponse.json({ error: "Already posted" }, { status: 409 });
  }

  validateJournal(entry.lines);

  await db
    .update(journalEntries)
    .set({
      status: "posted",
      postedAt: new Date(),
    })
    .where(eq(journalEntries.id, entryId));

  return NextResponse.json({
    success: true,
    message: "Journal posted successfully",
  });
}