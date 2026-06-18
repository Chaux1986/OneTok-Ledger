import { db } from "@/db";
import { approvalWorkflows } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const [row] = await db
    .update(approvalWorkflows)
    .set({
      status: body.status,
      comments: body.comments || null,
      decidedAt: new Date(),
    })
    .where(eq(approvalWorkflows.id, id))
    .returning();
  return NextResponse.json(row);
}
