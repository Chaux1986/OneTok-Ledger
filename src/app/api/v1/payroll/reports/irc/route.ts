import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payslips, payrollRuns, employees, tenants } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, gte, lte } from "drizzle-orm";

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
        salaryTax: payslips.salaryTax,
        payDate: payrollRuns.payDate,
        payrollNumber: payrollRuns.payrollNumber,
        employeeNumber: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        taxNumber: employees.taxNumber,
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
      taxNumber: string | null;
      grossPay: number;
      salaryTax: number;
      payRuns: Set<string>;
    }>();

    for (const r of rows) {
      const key = r.employeeId;
      if (!byEmployee.has(key)) {
        byEmployee.set(key, {
          employeeNumber: r.employeeNumber,
          name: `${r.firstName} ${r.lastName}`,
          taxNumber: r.taxNumber,
          grossPay: 0,
          salaryTax: 0,
          payRuns: new Set(),
        });
      }
      const entry = byEmployee.get(key)!;
      entry.grossPay += parseFloat(r.grossPay || "0");
      entry.salaryTax += parseFloat(r.salaryTax || "0");
      entry.payRuns.add(r.payrollNumber);
    }

    const employeeRows = Array.from(byEmployee.values())
      .map((e) => ({
        employeeNumber: e.employeeNumber,
        name: e.name,
        taxNumber: e.taxNumber,
        missingTaxNumber: !e.taxNumber,
        grossPay: Math.round(e.grossPay * 100) / 100,
        salaryTax: Math.round(e.salaryTax * 100) / 100,
        payRunCount: e.payRuns.size,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const totalGross = employeeRows.reduce((s, e) => s + e.grossPay, 0);
    const totalTax = employeeRows.reduce((s, e) => s + e.salaryTax, 0);
    const missingTaxNumberCount = employeeRows.filter((e) => e.missingTaxNumber).length;

    return NextResponse.json({
      tenant: {
        name: tenant?.name,
        businessNumber: tenant?.businessNumber,
      },
      period: { startDate, endDate },
      employees: employeeRows,
      totalGross: Math.round(totalGross * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      employeeCount: employeeRows.length,
      missingTaxNumberCount,
    });
  } catch (error) {
    console.error("Error generating IRC report:", error);
    return NextResponse.json({ error: "Failed to generate IRC report" }, { status: 500 });
  }
}