import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { SESSION_COOKIE, SESSION_DAYS } from "@/lib/constants";
import { hashToken, randomToken } from "@/lib/security";

export async function createLoginSession(userId: string): Promise<void> {
  const token = randomToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.authSession.create({ data: { tokenHash, userId, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt
  });
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

export async function currentUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { rosterPerson: true } } }
  });
  if (!session || session.expiresAt <= new Date() || !session.user.rosterPerson.active) return null;
  return session.user;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: UserRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}
