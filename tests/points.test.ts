import { describe, expect, it } from "vitest";
import { targetForStudent } from "../lib/points";

describe("points targets", () => {
  it("uses cohort override when present", () => {
    expect(targetForStudent(100, "2026", [{ cohort: "2026", targetPoints: 80 }])).toBe(80);
  });

  it("falls back to the academic-year default", () => {
    expect(targetForStudent(100, "2025", [{ cohort: "2026", targetPoints: 80 }])).toBe(100);
  });
});
