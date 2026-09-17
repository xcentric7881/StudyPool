import { createHash, randomBytes } from "crypto";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
