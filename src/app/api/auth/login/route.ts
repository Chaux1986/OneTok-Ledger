import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, tenants } from "@/db/schema";
import { verifyPassword, createSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { cookies } from "next/headers";

const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = loginSchema.parse(body);

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, data.email), eq(users.isActive, true)))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(data.password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Get tenant
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);

    if (!tenant || tenant.status === "cancelled") {
      return NextResponse.json(
        { error: "Account suspended" },
        { status: 403 }
      );
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

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
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
