import { db } from "@/db";
import { leaveRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const [row] = await db
    .update(leaveRequests)
    .set({
      status: body.status,
      approvedBy: body.approvedBy || null,
    })
    .where(eq(leaveRequests.id, id))
    .returning();
  return NextResponse.json(row);
}
