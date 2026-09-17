import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { APP_TIMEZONE } from "@/lib/constants";
export function localDateTimeToUtc(value: string): Date { return fromZonedTime(value, APP_TIMEZONE); }
export function formatDateTime(date: Date): string { return formatInTimeZone(date, APP_TIMEZONE, "EEE d MMM yyyy, HH:mm"); }
export function formatDate(date: Date): string { return formatInTimeZone(date, APP_TIMEZONE, "d MMM yyyy"); }
export function localDateKey(date: Date): string { return formatInTimeZone(date, APP_TIMEZONE, "yyyy-MM-dd"); }
export function calendarDayDifference(a: Date, b: Date): number { const aa = new Date(`${localDateKey(a)}T00:00:00Z`).getTime(); const bb = new Date(`${localDateKey(b)}T00:00:00Z`).getTime(); return Math.round((aa - bb) / 86_400_000); }
