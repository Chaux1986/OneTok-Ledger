import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST() {
  try {
    await destroySession();

    const cookieStore = await cookies();
    cookieStore.delete("session");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
