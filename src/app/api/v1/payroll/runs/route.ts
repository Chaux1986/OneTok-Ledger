import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  payrollRuns,
  payslips,
  employees,
  journals,
  journalLines,
  chartOfAccounts,
  auditLogs,
  events,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { generateCode } from "@/lib/utils";
import { calculatePayslip } from "@/lib/png-tax";

const payrollRunSchema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
  payDate: z.string(),
  employeeIds: z.array(z.string().uuid()).min(1, "Select at least one employee"),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const runs = await db
      .select()
      .from(payrollRuns)
      .where(eq(payrollRuns.tenantId, session.tenant.id))
      .orderBy(desc(payrollRuns.createdAt))
      .limit(50);

    return NextResponse.json({ payrollRuns: runs });
  } catch (error) {
    console.error("Error fetching payroll runs:", error);
    return NextResponse.json({ error: "Failed to fetch payroll runs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["owner", "admin", "payroll_officer"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = payrollRunSchema.parse(body);
    const tenantId = session.tenant.id;

    // Load selected employees
    const selectedEmployees = await db
      .select()
      .from(employees)
      .where(and(eq(employees.tenantId, tenantId), eq(employees.isActive, true)));

    const employeesToRun = selectedEmployees.filter((e) => data.employeeIds.includes(e.id));
    if (employeesToRun.length === 0) {
      return NextResponse.json({ error: "No matching active employees found" }, { status: 400 });
    }

    // Calculate payslips
    const calcs = employeesToRun.map((emp) => {
      const result = calculatePayslip({
        baseSalary: parseFloat(emp.baseSalary || "0"),
        salaryFrequency: emp.salaryType || "fortnightly",
        superFund: (emp.superFund as "nasfund" | "nambawan" | null) || null,
      });
      return { employee: emp, calc: result };
    });

    const totalGross = calcs.reduce((s, c) => s + c.calc.grossPay, 0);
    const totalTax = calcs.reduce((s, c) => s + c.calc.ircTax, 0);
    const totalSuper = calcs.reduce((s, c) => s + c.calc.nasfundEmployer + c.calc.nambawanEmployer, 0);
    const totalSuperEmployee = calcs.reduce((s, c) => s + c.calc.nasfundEmployee + c.calc.nambawanEmployee, 0);
    const totalDeductions = calcs.reduce((s, c) => s + c.calc.totalDeductions, 0);
    const totalNet = calcs.reduce((s, c) => s + c.calc.netPay, 0);

    // Generate payroll number
    const existing = await db
      .select({ payrollNumber: payrollRuns.payrollNumber })
      .from(payrollRuns)
      .where(eq(payrollRuns.tenantId, tenantId))
      .orderBy(desc(payrollRuns.createdAt))
      .limit(1);

    const lastNum = existing.length > 0 ? parseInt(existing[0].payrollNumber.replace("PAY", "")) || 0 : 0;
    const payrollNumber = generateCode("PAY", lastNum + 1);

    // Create payroll run
    const [run] = await db
      .insert(payrollRuns)
      .values({
        tenantId,
        payrollNumber,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        payDate: data.payDate,
        status: "approved",
        totalGross: totalGross.toFixed(2),
        totalTax: totalTax.toFixed(2),
        totalSuper: totalSuper.toFixed(2),
        totalDeductions: totalDeductions.toFixed(2),
        totalNet: totalNet.toFixed(2),
        employeeCount: calcs.length,
        approvedBy: session.user.id,
        approvedAt: new Date(),
        processedBy: session.user.id,
        processedAt: new Date(),
        createdBy: session.user.id,
      })
      .returning();

    // Create payslips
    await db.insert(payslips).values(
      calcs.map(({ employee, calc }) => ({
        payrollRunId: run.id,
        employeeId: employee.id,
        grossPay: calc.grossPay.toFixed(2),
        basePay: calc.basePay.toFixed(2),
        overtime: calc.overtime.toFixed(2),
        allowances: calc.allowances.toFixed(2),
        bonuses: "0",
        salaryTax: calc.ircTax.toFixed(2),
        superannuation: (calc.nasfundEmployee + calc.nambawanEmployee).toFixed(2),
        otherDeductions: "0",
        netPay: calc.netPay.toFixed(2),
      }))
    );

    // Auto-post journal: DR Salaries & Wages expense, DR Super expense (employer)
    //                      CR SWT Payable, CR Super Payable, CR Bank/Net Pay Payable
    const accountCodes = ["6110", "6140", "2220", "2300", "1100"];
    const accounts = await db
      .select()
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.tenantId, tenantId)));

    const findAccount = (code: string) => accounts.find((a) => a.code === code);
    const salariesExpense = findAccount("6110"); // Salaries & Wages
    const superExpense = findAccount("6140"); // Superannuation - Employer Contributions
    const swtPayable = findAccount("2220"); // Salary & Wages Tax Payable
    const superPayable = findAccount("2300"); // Superannuation Payable
    const bankAccount = findAccount("1100"); // Cash at Bank - BSP

    let journalId: string | null = null;

    if (salariesExpense && swtPayable && bankAccount) {
      const lastJournal = await db
        .select({ journalNumber: journals.journalNumber })
        .from(journals)
        .where(eq(journals.tenantId, tenantId))
        .orderBy(desc(journals.createdAt))
        .limit(1);

      const lastJNum = lastJournal.length > 0 ? parseInt(lastJournal[0].journalNumber.replace("JNL", "")) || 0 : 0;
      const journalNumber = generateCode("JNL", lastJNum + 1);

      const totalEmployerSuper = totalSuper;
      const totalDebits = totalGross + totalEmployerSuper;

      const [journal] = await db
        .insert(journals)
        .values({
          tenantId,
          journalNumber,
          date: data.payDate,
          description: `Payroll ${payrollNumber} - ${calcs.length} employee(s)`,
          reference: payrollNumber,
          status: "posted",
          totalDebit: totalDebits.toFixed(2),
          totalCredit: totalDebits.toFixed(2),
          createdBy: session.user.id,
          postedBy: session.user.id,
          postedAt: new Date(),
        })
        .returning();

      journalId = journal.id;

      const jLines: Array<{ journalId: string; accountId: string; description: string; debit: string; credit: string; sortOrder: number }> = [];

      // DR Salaries & Wages expense (gross pay)
      jLines.push({
        journalId: journal.id,
        accountId: salariesExpense.id,
        description: `Gross salaries - ${payrollNumber}`,
        debit: totalGross.toFixed(2),
        credit: "0",
        sortOrder: 0,
      });

      // DR Superannuation expense (employer contribution)
      if (superExpense && totalEmployerSuper > 0) {
        jLines.push({
          journalId: journal.id,
          accountId: superExpense.id,
          description: `Employer super contributions - ${payrollNumber}`,
          debit: totalEmployerSuper.toFixed(2),
          credit: "0",
          sortOrder: 1,
        });
      }

      // CR SWT Payable
      if (totalTax > 0) {
        jLines.push({
          journalId: journal.id,
          accountId: swtPayable.id,
          description: `SWT withheld - ${payrollNumber}`,
          debit: "0",
          credit: totalTax.toFixed(2),
          sortOrder: 2,
        });
      }

      // CR Super Payable (employee + employer combined liability until paid to fund)
      if (superPayable && totalSuperEmployee + totalEmployerSuper > 0) {
        jLines.push({
          journalId: journal.id,
          accountId: superPayable.id,
          description: `Super payable (employee + employer) - ${payrollNumber}`,
          debit: "0",
          credit: (totalSuperEmployee + totalEmployerSuper).toFixed(2),
          sortOrder: 3,
        });
      }

      // CR Bank (net pay disbursed)
      jLines.push({
        journalId: journal.id,
        accountId: bankAccount.id,
        description: `Net pay disbursed - ${payrollNumber}`,
        debit: "0",
        credit: totalNet.toFixed(2),
        sortOrder: 4,
      });

      await db.insert(journalLines).values(jLines);

      await db.update(payrollRuns).set({ journalId: journal.id }).where(eq(payrollRuns.id, run.id));
    }

    await db.insert(auditLogs).values({
      tenantId,
      userId: session.user.id,
      action: "CREATE",
      entityType: "payroll_run",
      entityId: run.id,
      newValues: { ...run, journalId },
    });

    await db.insert(events).values({
      tenantId,
      aggregateId: run.id,
      aggregateType: "payroll_run",
      eventType: "payroll_processed",
      eventData: { payrollNumber, totalGross, totalNet, employeeCount: calcs.length },
      version: 1,
      userId: session.user.id,
    });

    return NextResponse.json({ payrollRun: { ...run, journalId } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("Error processing payroll run:", error);
    return NextResponse.json({ error: "Failed to process payroll run" }, { status: 500 });
  }
}