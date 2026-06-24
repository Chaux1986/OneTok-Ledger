import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payslips, payrollRuns, employees, tenants } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, gte, lte } from "drizzle-orm";

const EMPLOYEE_RATE = 0.06;
const EMPLOYER_RATE = 0.084;

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
    }

    const tenantId = session.tenant.id;

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);

    const rows = await db
      .select({
        employeeId: payslips.employeeId,
        grossPay: payslips.grossPay,
        payDate: payrollRuns.payDate,
        payrollNumber: payrollRuns.payrollNumber,
        employeeNumber: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        superFund: employees.superFund,
        superMemberNumber: employees.superMemberNumber,
      })
      .from(payslips)
      .innerJoin(payrollRuns, eq(payrollRuns.id, payslips.payrollRunId))
      .innerJoin(employees, eq(employees.id, payslips.employeeId))
      .where(
        and(
          eq(payrollRuns.tenantId, tenantId),
          gte(payrollRuns.payDate, startDate),
          lte(payrollRuns.payDate, endDate)
        )
      );

    const byEmployee = new Map<string, {
      employeeNumber: string;
      name: string;
      superFund: string | null;
      memberNumber: string | null;
      grossPay: number;
      payRuns: Set<string>;
    }>();

    for (const r of rows) {
      const key = r.employeeId;
      if (!byEmployee.has(key)) {
        byEmployee.set(key, {
          employeeNumber: r.employeeNumber,
          name: `${r.firstName} ${r.lastName}`,
          superFund: r.superFund,
          memberNumber: r.superMemberNumber,
          grossPay: 0,
          payRuns: new Set(),
        });
      }
      const entry = byEmployee.get(key)!;
      entry.grossPay += parseFloat(r.grossPay || "0");
      entry.payRuns.add(r.payrollNumber);
    }

    // Employee and employer contributions are derived from gross pay at the
    // fixed statutory rates (6% / 8.4%) rather than read from a stored
    // employer-contribution column, because payslips only ever stored the
    // combined employee-side amount — the employer split was never
    // persisted per employee, only as a payroll-run-level total.
    const employeeRows = Array.from(byEmployee.values())
      .map((e) => {
        const employeeContribution = Math.round(e.grossPay * EMPLOYEE_RATE * 100) / 100;
        const employerContribution = Math.round(e.grossPay * EMPLOYER_RATE * 100) / 100;
        return {
          employeeNumber: e.employeeNumber,
          name: e.name,
          superFund: e.superFund,
          memberNumber: e.memberNumber,
          missingMemberNumber: !e.memberNumber,
          grossPay: Math.round(e.grossPay * 100) / 100,
          employeeContribution,
          employerContribution,
          totalContribution: Math.round((employeeContribution + employerContribution) * 100) / 100,
          payRunCount: e.payRuns.size,
        };
      })
      .filter((e) => e.superFund) // only employees actually enrolled in a fund
      .sort((a, b) => a.name.localeCompare(b.name));

    const nasfund = employeeRows.filter((e) => e.superFund === "nasfund");
    const nambawan = employeeRows.filter((e) => e.superFund === "nambawan");

    const summarize = (list: typeof employeeRows) => ({
      employees: list,
      totalGross: Math.round(list.reduce((s, e) => s + e.grossPay, 0) * 100) / 100,
      totalEmployee: Math.round(list.reduce((s, e) => s + e.employeeContribution, 0) * 100) / 100,
      totalEmployer: Math.round(list.reduce((s, e) => s + e.employerContribution, 0) * 100) / 100,
      total: Math.round(list.reduce((s, e) => s + e.totalContribution, 0) * 100) / 100,
    });

    return NextResponse.json({
      tenant: { name: tenant?.name, businessNumber: tenant?.businessNumber },
      period: { startDate, endDate },
      nasfund: summarize(nasfund),
      nambawan: summarize(nambawan),
      grandTotal: Math.round((summarize(nasfund).total + summarize(nambawan).total) * 100) / 100,
    });
  } catch (error) {
    console.error("Error generating super report:", error);
    return NextResponse.json({ error: "Failed to generate super report" }, { status: 500 });
  }
}