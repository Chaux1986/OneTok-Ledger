import { db } from "@/db";
import { payrollRuns, payslips, employees } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { calculatePayslip } from "@/lib/png-tax";

export async function GET() {
  const data = await db.select().from(payrollRuns).orderBy(desc(payrollRuns.createdAt));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Create payroll run
  const [run] = await db
    .insert(payrollRuns)
    .values({
      payPeriodStart: body.payPeriodStart,
      payPeriodEnd: body.payPeriodEnd,
      payDate: body.payDate,
      status: "draft",
    })
    .returning();

  // Get all active employees
  const activeEmployees = await db
    .select()
    .from(employees)
    .where(eq(employees.isActive, true));

  let totalGross = 0,
    totalTax = 0,
    totalNasfund = 0,
    totalNambawan = 0,
    totalNet = 0;

  // Generate payslips for each employee
  for (const emp of activeEmployees) {
    const superFund = emp.nambawanSuperNumber ? "nambawan" : "nasfund";
    const calc = calculatePayslip({
      baseSalary: parseFloat(emp.baseSalary),
      salaryFrequency: emp.salaryFrequency,
      superFund,
    });

    await db.insert(payslips).values({
      payrollRunId: run.id,
      employeeId: emp.id,
      grossPay: calc.grossPay.toFixed(2),
      basePay: calc.basePay.toFixed(2),
      overtime: calc.overtime.toFixed(2),
      allowances: calc.allowances.toFixed(2),
      ircTax: calc.ircTax.toFixed(2),
      nasfundEmployee: calc.nasfundEmployee.toFixed(2),
      nasfundEmployer: calc.nasfundEmployer.toFixed(2),
      nambawanEmployee: calc.nambawanEmployee.toFixed(2),
      nambawanEmployer: calc.nambawanEmployer.toFixed(2),
      netPay: calc.netPay.toFixed(2),
    });

    totalGross += calc.grossPay;
    totalTax += calc.ircTax;
    totalNasfund += calc.nasfundEmployee;
    totalNambawan += calc.nambawanEmployee;
    totalNet += calc.netPay;
  }

  // Update payroll run totals
  const [updated] = await db
    .update(payrollRuns)
    .set({
      totalGross: totalGross.toFixed(2),
      totalTax: totalTax.toFixed(2),
      totalNasfund: totalNasfund.toFixed(2),
      totalNambawan: totalNambawan.toFixed(2),
      totalNet: totalNet.toFixed(2),
    })
    .where(eq(payrollRuns.id, run.id))
    .returning();

  return NextResponse.json(updated, { status: 201 });
}
