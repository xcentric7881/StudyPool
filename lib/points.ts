export function targetForStudent(defaultTarget: number, cohort: string | null, overrides: Array<{ cohort: string; targetPoints: number }>): number {
  if (!cohort) return defaultTarget;
  return overrides.find((x) => x.cohort === cohort)?.targetPoints ?? defaultTarget;
}
