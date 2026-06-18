import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, auditLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { generateCode } from "@/lib/utils";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  tradingName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  taxNumber: z.string().optional(),
  creditLimit: z.string().optional(),
  paymentTermDays: z.number().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  notes: z.string().optional(),
});

// GET - List customers
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerList = await db
      .select()
      .from(customers)
      .where(eq(customers.tenantId, session.tenant.id))
      .orderBy(asc(customers.name));

    return NextResponse.json({ customers: customerList });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

// POST - Create customer
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = customerSchema.parse(body);

    // Generate customer code
    const existingCustomers = await db
      .select({ code: customers.code })
      .from(customers)
      .where(eq(customers.tenantId, session.tenant.id));

    const maxNumber = existingCustomers.reduce((max, c) => {
      const num = parseInt(c.code.replace("CUS", "")) || 0;
      return num > max ? num : max;
    }, 0);

    const code = generateCode("CUS", maxNumber + 1);

    // Create customer
    const [customer] = await db
      .insert(customers)
      .values({
        tenantId: session.tenant.id,
        code,
        name: data.name,
        tradingName: data.tradingName,
        email: data.email || null,
        phone: data.phone,
        mobile: data.mobile,
        taxNumber: data.taxNumber,
        creditLimit: data.creditLimit || "0",
        paymentTermDays: data.paymentTermDays || 30,
        billingAddress: data.billingAddress,
        shippingAddress: data.shippingAddress,
        notes: data.notes,
      })
      .returning();

    // Create audit log
    await db.insert(auditLogs).values({
      tenantId: session.tenant.id,
      userId: session.user.id,
      action: "CREATE",
      entityType: "customer",
      entityId: customer.id,
      newValues: customer,
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}
