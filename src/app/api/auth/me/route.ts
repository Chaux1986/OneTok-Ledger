import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { user, tenant } = session;

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        currency: tenant.currency,
        subscriptionPlan: tenant.subscriptionPlan,
      },
    });
  } catch (error) {
    console.error("Session error:", error);
    return NextResponse.json({ error: "Session error" }, { status: 500 });
  }
}
