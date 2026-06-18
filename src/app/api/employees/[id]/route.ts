import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [emp] = await db.select().from(employees).where(eq(employees.id, id));
  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(emp);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const [row] = await db
    .update(employees)
    .set({
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
      isActive: body.isActive ?? true,
      updatedAt: new Date(),
    })
    .where(eq(employees.id, id))
    .returning();
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(employees).where(eq(employees.id, id));
  return NextResponse.json({ success: true });
}
