import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, sessions, tenants } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "onetok-ledger-secret-key-change-in-production"
);

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface TokenPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function createToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function createSession(
  userId: string,
  tenantId: string,
  email: string,
  role: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const token = await createToken({ userId, tenantId, email, role });
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await db.insert(sessions).values({
    userId,
    tenantId,
    token,
    ipAddress,
    userAgent,
    expiresAt,
  });

  return token;
}

export async function getSession(): Promise<{
  user: typeof users.$inferSelect;
  tenant: typeof tenants.$inferSelect;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.token, token), eq(sessions.userId, payload.userId)))
    .limit(1);

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!user || !user.isActive) return null;

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, payload.tenantId))
    .limit(1);

  if (!tenant || tenant.status === "cancelled") return null;

  return { user, tenant };
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
    cookieStore.delete("session");
  }
}
