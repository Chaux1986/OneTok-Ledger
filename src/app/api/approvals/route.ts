import { db } from "@/db";
import { approvalWorkflows } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const data = await db
    .select()
    .from(approvalWorkflows)
    .orderBy(desc(approvalWorkflows.createdAt));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const [row] = await db
    .insert(approvalWorkflows)
    .values({
      entityType: body.entityType,
      entityId: body.entityId,
      stepNumber: body.stepNumber || 1,
      approverName: body.approverName,
      status: "pending",
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
