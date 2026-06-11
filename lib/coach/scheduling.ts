/**
 * Generate `scheduled_workouts` calendar slots from a schedule spec.
 *
 * Pure date math (date-fns), no Supabase — unit-testable. The persistence
 * layer maps each slot's `day_number` to a real `phase_workout_id` and writes
 * the rows. Dates are emitted as local-time YYYY-MM-DD strings to match the
 * `scheduled_workouts.scheduled_date` DATE column and the existing seed logic.
 */

import { addDays, format } from "date-fns";
import type { ScheduledSlot } from "./types";

/** Parse a YYYY-MM-DD string into a local-time Date (no TZ drift). */
function parseLocalISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d);
}

/** Format a Date as a local YYYY-MM-DD string. */
function toLocalISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Every-other-day schedule (the contest-prep pattern from the SQL seed).
 *
 * Rotates through the provided workout day_numbers. With a single workout it
 * repeats that workout; with several it cycles them (session 0 → first, 1 →
 * second, …). Lands on day 0, 2, 4, … relative to `startISO`.
 */
export function buildEveryOtherDaySchedule(
  startISO: string,
  totalSessions: number,
  workoutDayNumbers: number[],
): ScheduledSlot[] {
  if (workoutDayNumbers.length === 0 || totalSessions < 1) return [];
  const start = parseLocalISODate(startISO);
  const slots: ScheduledSlot[] = [];
  for (let i = 0; i < totalSessions; i++) {
    slots.push({
      scheduled_date: toLocalISODate(addDays(start, i * 2)),
      day_number: workoutDayNumbers[i % workoutDayNumbers.length],
    });
  }
  return slots;
}

/** Maps a weekday (0=Sun … 6=Sat) to the workout day_number trained that day. */
export type WeekdayAssignment = { weekday: number; day_number: number };

/**
 * Fixed weekly split (e.g. "PPL on Mon/Wed/Fri"). Repeats the weekday
 * assignments for `weeks` calendar weeks starting from `startISO`.
 */
export function buildWeeklySchedule(
  startISO: string,
  weeks: number,
  assignments: WeekdayAssignment[],
): ScheduledSlot[] {
  if (assignments.length === 0 || weeks < 1) return [];
  const start = parseLocalISODate(startISO);
  const startWeekday = start.getDay();
  const slots: ScheduledSlot[] = [];

  for (let w = 0; w < weeks; w++) {
    for (const { weekday, day_number } of assignments) {
      // Days from `start` to the first occurrence of `weekday`, then + whole weeks.
      const offsetToWeekday = (weekday - startWeekday + 7) % 7;
      const dayOffset = w * 7 + offsetToWeekday;
      slots.push({
        scheduled_date: toLocalISODate(addDays(start, dayOffset)),
        day_number,
      });
    }
  }

  // Sort chronologically; assignments within a week may be out of weekday order.
  slots.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  return slots;
}

/**
 * Next occurrence of a target weekday on or after today, as YYYY-MM-DD.
 * Mirrors the seed's "next Monday" math. `targetWeekday` 0=Sun … 6=Sat.
 */
export function nextWeekdayOnOrAfter(from: Date, targetWeekday: number): string {
  const offset = (targetWeekday - from.getDay() + 7) % 7;
  return toLocalISODate(addDays(from, offset));
}
