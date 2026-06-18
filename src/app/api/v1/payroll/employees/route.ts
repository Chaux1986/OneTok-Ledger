import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { employees, auditLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";
import { generateCode } from "@/lib/utils";

const employeeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  nationalId: z.string().optional(),
  taxNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  startDate: z.string(),
  position: z.string().optional(),
  department: z.string().optional(),
  employmentType: z.string().optional(),
  salaryType: z.string().optional(),
  baseSalary: z.string().optional(),
  hourlyRate: z.string().optional(),
  bankName: z.string().optional(),
  bankBsb: z.string().optional(),
  bankAccount: z.string().optional(),
  superFund: z.string().optional(),
  superMemberNumber: z.string().optional(),
});

// GET - List employees
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["owner", "admin", "payroll_officer"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const employeeList = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, session.tenant.id),
          eq(employees.isActive, true)
        )
      )
      .orderBy(asc(employees.lastName), asc(employees.firstName));

    return NextResponse.json({ employees: employeeList });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

// POST - Create employee
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["owner", "admin", "payroll_officer"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = employeeSchema.parse(body);

    // Generate employee number
    const existingEmployees = await db
      .select({ employeeNumber: employees.employeeNumber })
      .from(employees)
      .where(eq(employees.tenantId, session.tenant.id));

    const maxNumber = existingEmployees.reduce((max, e) => {
      const num = parseInt(e.employeeNumber.replace("EMP", "")) || 0;
      return num > max ? num : max;
    }, 0);

    const employeeNumber = generateCode("EMP", maxNumber + 1);

    // Create employee
    const [employee] = await db
      .insert(employees)
      .values({
        tenantId: session.tenant.id,
        employeeNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        nationalId: data.nationalId,
        taxNumber: data.taxNumber,
        email: data.email || null,
        phone: data.phone,
        mobile: data.mobile,
        address: data.address,
        emergencyContact: data.emergencyContact,
        startDate: data.startDate,
        position: data.position,
        department: data.department,
        employmentType: data.employmentType || "full_time",
        salaryType: data.salaryType || "salary",
        baseSalary: data.baseSalary || "0",
        hourlyRate: data.hourlyRate || "0",
        bankName: data.bankName,
        bankBsb: data.bankBsb,
        bankAccount: data.bankAccount,
        superFund: data.superFund,
        superMemberNumber: data.superMemberNumber,
      })
      .returning();

    // Create audit log
    await db.insert(auditLogs).values({
      tenantId: session.tenant.id,
      userId: session.user.id,
      action: "CREATE",
      entityType: "employee",
      entityId: employee.id,
      newValues: { ...employee, bankAccount: "***" }, // Mask sensitive data
    });

    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
