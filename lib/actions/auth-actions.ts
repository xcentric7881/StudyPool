"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { createLoginSession, logout } from "@/lib/auth";

const DEMO_EMAILS = new Set([
  "admin@studypool.test",
  "staff@studypool.test",
  "student1@studypool.test",
  "student2@studypool.test"
]);

export async function demoLoginAction(formData: FormData) {
  if (process.env.PROTOTYPE_MODE !== "true") redirect("/login?error=Demo+login+is+disabled.");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!DEMO_EMAILS.has(email)) redirect("/login?error=That+demo+account+is+not+available.");
  const user = await db.user.findUnique({ where: { email }, include: { rosterPerson: true } });
  if (!user?.rosterPerson.active) redirect("/login?error=That+demo+account+is+inactive.");
  await createLoginSession(user.id);
  await audit(user.id, "DEMO_LOGIN", "User", user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}
