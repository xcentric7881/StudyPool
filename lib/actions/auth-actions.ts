"use server";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { createLoginSession, logout } from "@/lib/auth";
import { normalizeEmail } from "@/lib/security";

const CODE_MINUTES = 10;
const LOGIN_PATH = "/login";
const genericMessage = "If this address is approved, a verification code has been sent.";
function codeDigest(email: string, code: string) {
  const secret = process.env.AUTH_CODE_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_CODE_SECRET must be configured with at least 32 characters");
  return createHmac("sha256", secret).update(email + ":" + code).digest("hex");
}
function errorUrl(message: string, email = "") {
  return LOGIN_PATH + "?error=" + encodeURIComponent(message) + (email ? "&email=" + encodeURIComponent(email) : "");
}
async function sendCode(email: string, code: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.LOGIN_EMAIL_FROM;
  if (!key || !from) throw new Error("Email delivery is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: [email], subject: "Your StudyPool sign-in code",
      text: "Your StudyPool sign-in code is " + code + ". It expires in 10 minutes. If you did not request it, ignore this email."
    }),
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Email provider rejected the verification message");
}

export async function requestEmailCodeAction(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") || ""));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) redirect(errorUrl("Enter a valid email address."));
  // Deliberately return identical UI for unapproved and approved addresses.
  const roster = await db.rosterPerson.findUnique({ where: { email } });
  if (roster?.active) {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60_000);
    const latest = await db.emailLoginCode.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
    const sent = await db.emailLoginCode.count({ where: { email, createdAt: { gte: hourAgo } } });
    if (sent < 5 && (!latest || latest.createdAt.getTime() <= now.getTime() - 60_000)) {
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      const record = await db.emailLoginCode.create({
        data: { email, codeHash: codeDigest(email, code), expiresAt: new Date(now.getTime() + CODE_MINUTES * 60_000) }
      });
      try {
        await sendCode(email, code);
      } catch (err) {
        await db.emailLoginCode.delete({ where: { id: record.id } });
        console.error("StudyPool email delivery failed", err instanceof Error ? err.message : "unknown");
        redirect(errorUrl("Email is temporarily unavailable. Please try again later.", email));
      }
    }
  }
  redirect(LOGIN_PATH + "?sent=1&email=" + encodeURIComponent(email));
}

export async function verifyEmailCodeAction(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") || ""));
  const code = String(formData.get("code") || "").trim();
  if (!/^\d{6}$/.test(code)) redirect(errorUrl("Enter the six-digit code.", email));
  const roster = await db.rosterPerson.findUnique({ where: { email } });
  if (!roster?.active) redirect(errorUrl("Invalid or expired code.", email));

  // Increment attempts atomically so concurrent requests cannot bypass the five-try limit.
  const latest = await db.emailLoginCode.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
  if (!latest || latest.consumedAt || latest.expiresAt <= new Date() || latest.attempts >= 5) {
    redirect(errorUrl("Invalid or expired code. Request a new one.", email));
  }
  const increment = await db.emailLoginCode.updateMany({
    where: { id: latest.id, consumedAt: null, attempts: { lt: 5 }, expiresAt: { gt: new Date() } },
    data: { attempts: { increment: 1 } }
  });
  if (!increment.count) redirect(errorUrl("Invalid or expired code.", email));
  const actual = Buffer.from(codeDigest(email, code), "hex");
  const expected = Buffer.from(latest.codeHash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    redirect(errorUrl("Invalid or expired code.", email));
  }
  const redeemed = await db.emailLoginCode.updateMany({
    where: { id: latest.id, consumedAt: null },
    data: { consumedAt: new Date() }
  });
  if (!redeemed.count) redirect(errorUrl("Code has already been used.", email));
  const user = await db.user.upsert({
    where: { email },
    create: { email, name: roster.name, role: roster.role, rosterPersonId: roster.id },
    update: { name: roster.name, role: roster.role }
  });
  await createLoginSession(user.id);
  await audit(user.id, "EMAIL_CODE_LOGIN", "User", user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}
