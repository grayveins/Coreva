/**
 * Schedule-aware "what's the client doing today?" resolution.
 *
 * Reads from `scheduled_workouts` first (date-keyed coach assignments).
 * Falls back to the legacy day_number lookup when no scheduled row exists,
 * so existing programs that haven't been re-scheduled keep working
 * without any coach action.
 *
 * Wiring lives at `app/(app)/(tabs)/index.tsx` and `workout.tsx`.
 */

import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

export type ScheduledRow =
  Database["public"]["Tables"]["scheduled_workouts"]["Row"];

/** Subset of phase_workouts the resolver needs. The screens already have
 * fuller objects in state; this is the contract. */
export type WorkoutLite = {
  id: string;
  day_number: number;
  name: string;
  exercises: unknown;
};

export type ScheduledMap = Map<string, ScheduledRow>;

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function fetchScheduledMap(
  userId: string,
  fromDate: Date,
  toDate: Date,
): Promise<ScheduledMap> {
  // The mobile `supabase` singleton isn't typed with <Database> yet
  // (Sprint A part 2 - pending PR), so .from() returns `never`. Cast
  // the result rather than wiring Database here, keeping this PR
  // scoped to the schedule read-switch.
  const { data } = await supabase
    .from("scheduled_workouts" as never)
    .select("*")
    .eq("client_id" as never, userId as never)
    .gte("scheduled_date" as never, isoDate(fromDate) as never)
    .lte("scheduled_date" as never, isoDate(toDate) as never);
  const rows = (data ?? []) as unknown as ScheduledRow[];
  const map: ScheduledMap = new Map();
  for (const row of rows) map.set(row.scheduled_date, row);
  return map;
}

export type ResolvedDay =
  /** Coach explicitly marked this date a rest day. UI hides the workout
   *  card and shows a rest pill instead. */
  | { kind: "rest" }
  /** Coach assigned a specific phase_workout to this date. The workout
   *  may belong to a different phase than the active one. */
  | { kind: "scheduled"; workout: WorkoutLite }
  /** No scheduled row for this date. Use day_number-based lookup against
   *  the currently active phase, matching pre-Schedule-v0 behavior. */
  | { kind: "fallback"; workout: WorkoutLite | null };

/** A future (or today) coach-scheduled training day, resolved to its workout. */
export type UpcomingSession = { iso: string; date: Date; workout: WorkoutLite };

/** Add whole days to a date without TZ drift (local midnight arithmetic). */
function addLocalDays(from: Date, n: number): Date {
  return new Date(from.getFullYear(), from.getMonth(), from.getDate() + n);
}

/**
 * Walk a date window and collect the coach's actually-scheduled training days
 * (skipping rest days and dates with no assignment). This reflects the real
 * cadence - every-other-day, 3x/week, whatever the coach set - instead of
 * mapping phase_workouts onto weekdays by `day_number`.
 *
 * Returns up to `max` sessions in chronological order. Empty when the client
 * has no `scheduled_workouts` in the window (caller falls back to the legacy
 * weekly phase_workouts list).
 */
export function collectUpcomingFromSchedule(args: {
  from: Date;
  days: number;
  scheduledByDate: ScheduledMap;
  workoutsById: Map<string, WorkoutLite>;
  max?: number;
}): UpcomingSession[] {
  const { from, days, scheduledByDate, workoutsById, max = 7 } = args;
  const out: UpcomingSession[] = [];
  for (let i = 0; i < days && out.length < max; i++) {
    const date = addLocalDays(from, i);
    const row = scheduledByDate.get(isoDate(date));
    if (!row || row.source_type === "rest") continue;
    if (row.source_type === "phase_workout" && row.phase_workout_id) {
      const workout = workoutsById.get(row.phase_workout_id);
      if (workout) out.push({ iso: isoDate(date), date, workout });
    }
  }
  return out;
}

export function resolveDay(args: {
  date: Date;
  scheduledByDate: ScheduledMap;
  /** All phase_workouts across all phases of the active program, keyed
   *  by id. Lets a coach schedule a workout from a different phase. */
  workoutsById: Map<string, WorkoutLite>;
  /** day_number-based fallback list - typically the active phase only. */
  activePhaseWorkouts: WorkoutLite[];
}): ResolvedDay {
  const key = isoDate(args.date);
  const scheduled = args.scheduledByDate.get(key);
  if (scheduled) {
    if (scheduled.source_type === "rest") return { kind: "rest" };
    if (
      scheduled.source_type === "phase_workout" &&
      scheduled.phase_workout_id
    ) {
      const w = args.workoutsById.get(scheduled.phase_workout_id);
      if (w) return { kind: "scheduled", workout: w };
    }
  }
  // 1=Mon..7=Sun (JS getDay 0=Sun → 7).
  const dow = args.date.getDay() || 7;
  const found =
    args.activePhaseWorkouts.find((w) => w.day_number === dow) ?? null;
  return { kind: "fallback", workout: found };
}
