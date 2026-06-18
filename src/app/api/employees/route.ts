import { db } from "@/db";
import { employees } from "@/db/schema";
import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { generateNumber } from "@/lib/utils";

export async function GET() {
  const data = await db.select().from(employees).orderBy(desc(employees.createdAt));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const [row] = await db
    .insert(employees)
    .values({
      employeeNumber: body.employeeNumber || generateNumber("EMP"),
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email || null,
      phone: body.phone || null,
      dateOfBirth: body.dateOfBirth || null,
      hireDate: body.hireDate,
      department: body.department || null,
      position: body.position || null,
      baseSalary: body.baseSalary,
      salaryFrequency: body.salaryFrequency || "fortnightly",
      taxFileNumber: body.taxFileNumber || null,
      nasfundNumber: body.nasfundNumber || null,
      nambawanSuperNumber: body.nambawanSuperNumber || null,
      bankAccountName: body.bankAccountName || null,
      bankAccountNumber: body.bankAccountNumber || null,
      bankName: body.bankName || null,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
