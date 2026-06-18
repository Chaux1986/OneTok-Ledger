import { NextResponse } from "next/server";
import { db } from "@/db";
import { journalEntries } from "@/db/schema/journal";
import { eq } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const data = await db.query.journalEntries.findFirst({
    where: eq(journalEntries.id, params.id),
    with: { lines: true },
  });

  return NextResponse.json(data);
}