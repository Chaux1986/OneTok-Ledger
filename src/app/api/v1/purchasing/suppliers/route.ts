import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { suppliers, auditLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { generateCode } from "@/lib/utils";

const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  tradingName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  taxNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  paymentTermDays: z.number().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supplierList = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.tenantId, session.tenant.id))
      .orderBy(asc(suppliers.name));

    return NextResponse.json({ suppliers: supplierList });
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["owner", "admin", "accountant"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = supplierSchema.parse(body);

    const existingSuppliers = await db
      .select({ code: suppliers.code })
      .from(suppliers)
      .where(eq(suppliers.tenantId, session.tenant.id));

    const maxNumber = existingSuppliers.reduce((max, s) => {
      const num = parseInt(s.code.replace("SUP", "")) || 0;
      return num > max ? num : max;
    }, 0);

    const code = generateCode("SUP", maxNumber + 1);

    const [supplier] = await db
      .insert(suppliers)
      .values({
        tenantId: session.tenant.id,
        code,
        name: data.name,
        tradingName: data.tradingName,
        email: data.email || null,
        phone: data.phone,
        mobile: data.mobile,
        taxNumber: data.taxNumber,
        bankName: data.bankName,
        bankAccount: data.bankAccount,
        paymentTermDays: data.paymentTermDays || 30,
        address: data.address,
        notes: data.notes,
      })
      .returning();

    await db.insert(auditLogs).values({
      tenantId: session.tenant.id,
      userId: session.user.id,
      action: "CREATE",
      entityType: "supplier",
      entityId: supplier.id,
      newValues: supplier,
    });

    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("Error creating supplier:", error);
    return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 });
  }
}