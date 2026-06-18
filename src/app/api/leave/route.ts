import { db } from "@/db";
import { leaveRequests, leaveBalances, employees } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const data = await db
    .select({
      id: leaveRequests.id,
      employeeId: leaveRequests.employeeId,
      employeeName: employees.firstName,
      employeeLastName: employees.lastName,
      leaveType: leaveRequests.leaveType,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      days: leaveRequests.days,
      reason: leaveRequests.reason,
      status: leaveRequests.status,
      approvedBy: leaveRequests.approvedBy,
      createdAt: leaveRequests.createdAt,
    })
    .from(leaveRequests)
    .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
    .orderBy(desc(leaveRequests.createdAt));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const [row] = await db
    .insert(leaveRequests)
    .values({
      employeeId: body.employeeId,
      leaveType: body.leaveType,
      startDate: body.startDate,
      endDate: body.endDate,
      days: body.days,
      reason: body.reason || null,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
