import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tenants, auditLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  tradingName: z.string().optional(),
  businessNumber: z.string().optional(),
  gstNumber: z.string().optional(),
  industry: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  financialYearEnd: z.number().min(1).max(12).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, session.tenant.id))
      .limit(1);

    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error("Error fetching company settings:", error);
    return NextResponse.json({ error: "Failed to fetch company settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["owner", "admin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden — only owners and admins can edit company settings" }, { status: 403 });
    }

    const body = await request.json();
    const data = companySchema.parse(body);
    const tenantId = session.tenant.id;

    const [before] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);

    const [updated] = await db
      .update(tenants)
      .set({
        name: data.name,
        tradingName: data.tradingName || null,
        businessNumber: data.businessNumber || null,
        gstNumber: data.gstNumber || null,
        industry: data.industry || null,
        country: data.country || "PG",
        currency: data.currency || "PGK",
        timezone: data.timezone || "Pacific/Port_Moresby",
        financialYearEnd: data.financialYearEnd || 12,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId))
      .returning();

    await db.insert(auditLogs).values({
      tenantId,
      userId: session.user.id,
      action: "UPDATE",
      entityType: "tenant",
      entityId: tenantId,
      oldValues: before,
      newValues: updated,
    });

    return NextResponse.json({ tenant: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("Error updating company settings:", error);
    return NextResponse.json({ error: "Failed to update company settings" }, { status: 500 });
  }
}