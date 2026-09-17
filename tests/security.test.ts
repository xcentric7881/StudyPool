import { describe, expect, it } from "vitest";
import { hashToken, randomToken } from "../lib/security";

describe("session token helpers", () => {
  it("generates different random tokens", () => {
    expect(randomToken()).not.toBe(randomToken());
  });

  it("stores a one-way token hash rather than the bearer token", () => {
    const token = "example-token";
    const hashed = hashToken(token);
    expect(hashed).not.toBe(token);
    expect(hashed).toHaveLength(64);
  });
});
