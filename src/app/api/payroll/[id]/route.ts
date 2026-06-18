import { db } from "@/db";
import { payrollRuns, payslips, employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, id));
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const slips = await db
    .select({
      id: payslips.id,
      employeeId: payslips.employeeId,
      employeeName: employees.firstName,
      employeeLastName: employees.lastName,
      employeeNumber: employees.employeeNumber,
      grossPay: payslips.grossPay,
      basePay: payslips.basePay,
      overtime: payslips.overtime,
      allowances: payslips.allowances,
      deductions: payslips.deductions,
      ircTax: payslips.ircTax,
      nasfundEmployee: payslips.nasfundEmployee,
      nasfundEmployer: payslips.nasfundEmployer,
      nambawanEmployee: payslips.nambawanEmployee,
      nambawanEmployer: payslips.nambawanEmployer,
      netPay: payslips.netPay,
    })
    .from(payslips)
    .leftJoin(employees, eq(payslips.employeeId, employees.id))
    .where(eq(payslips.payrollRunId, id));

  return NextResponse.json({ ...run, payslips: slips });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const [row] = await db
    .update(payrollRuns)
    .set({ status: body.status })
    .where(eq(payrollRuns.id, id))
    .returning();
  return NextResponse.json(row);
}
