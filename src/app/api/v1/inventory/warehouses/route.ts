import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { warehouses } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { generateCode } from "@/lib/utils";

const warehouseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const list = await db
      .select()
      .from(warehouses)
      .where(eq(warehouses.tenantId, session.tenant.id))
      .orderBy(asc(warehouses.name));

    return NextResponse.json({ warehouses: list });
  } catch (error) {
    console.error("Error fetching warehouses:", error);
    return NextResponse.json({ error: "Failed to fetch warehouses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["owner", "admin", "inventory_manager"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = warehouseSchema.parse(body);
    const tenantId = session.tenant.id;

    const existing = await db
      .select({ code: warehouses.code })
      .from(warehouses)
      .where(eq(warehouses.tenantId, tenantId));

    const maxNumber = existing.reduce((max, w) => {
      const num = parseInt(w.code.replace("WH", "")) || 0;
      return num > max ? num : max;
    }, 0);

    const code = generateCode("WH", maxNumber + 1, 3);

    const [warehouse] = await db
      .insert(warehouses)
      .values({
        tenantId,
        code,
        name: data.name,
        address: data.address,
      })
      .returning();

    return NextResponse.json({ warehouse }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("Error creating warehouse:", error);
    return NextResponse.json({ error: "Failed to create warehouse" }, { status: 500 });
  }
}