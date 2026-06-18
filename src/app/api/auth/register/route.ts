import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tenants, users } from "@/db/schema";
import { hashPassword, createSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { cookies } from "next/headers";

const registerSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  industry: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    // Check if email already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Create slug from company name
    const slug = data.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if slug exists
    const [existingTenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    const finalSlug = existingTenant
      ? `${slug}-${Date.now().toString(36)}`
      : slug;

    // Create tenant
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: data.companyName,
        slug: finalSlug,
        industry: data.industry,
        status: "trial",
        subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
      })
      .returning();

    // Create owner user
    const passwordHash = await hashPassword(data.password);
    const [user] = await db
      .insert(users)
      .values({
        tenantId: tenant.id,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: "owner",
        isActive: true,
      })
      .returning();

    // Create session
    const token = await createSession(
      user.id,
      tenant.id,
      user.email,
      user.role,
      request.headers.get("x-forwarded-for") || undefined,
      request.headers.get("user-agent") || undefined
    );

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
