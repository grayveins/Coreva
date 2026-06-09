/**
 * Habits - coach-assigned daily/weekly habits the client checks off on Home.
 *
 * Surface mirrors `coachTasks.ts`: thin async helpers that return typed rows
 * the screen can render directly. State stays in the component; we don't
 * cache here.
 */

import { supabase } from "@/lib/supabase";

export type HabitFrequency = "daily" | "weekly";

export type HabitAssignment = {
  id: string;
  coach_id: string;
  client_id: string;
  name: string;
  description: string | null;
  frequency: HabitFrequency;
  target_value: number | null;
  unit: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type HabitLog = {
  id: string;
  assignment_id: string;
  client_id: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  value: number | null;
  created_at: string;
};

/** Fetch all currently-active habits assigned to this client. */
export async function fetchActiveHabits(clientId: string): Promise<HabitAssignment[]> {
  const { data, error } = await supabase
    .from("habit_assignments")
    .select("*")
    .eq("client_id", clientId)
    .eq("active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as HabitAssignment[];
}

/**
 * Fetch logs for a date range across the given assignments. Used to
 * compute today's checkbox state + the rolling streak/week stats.
 */
export async function fetchHabitLogs(args: {
  clientId: string;
  assignmentIds: string[];
  /** YYYY-MM-DD inclusive. */
  fromDate: string;
  /** YYYY-MM-DD inclusive. */
  toDate: string;
}): Promise<HabitLog[]> {
  if (args.assignmentIds.length === 0) return [];
  const { data, error } = await supabase
    .from("habit_logs")
    .select("*")
    .eq("client_id", args.clientId)
    .in("assignment_id", args.assignmentIds)
    .gte("date", args.fromDate)
    .lte("date", args.toDate);
  if (error) throw error;
  return (data ?? []) as HabitLog[];
}

/**
 * Idempotent toggle. The unique (assignment_id, date) constraint means we
 * upsert: insert if missing, update completed/value on conflict.
 */
export async function setHabitLog(args: {
  clientId: string;
  assignmentId: string;
  date: string;
  completed: boolean;
  value?: number | null;
}): Promise<void> {
  const { error } = await supabase
    .from("habit_logs")
    .upsert(
      {
        client_id: args.clientId,
        assignment_id: args.assignmentId,
        date: args.date,
        completed: args.completed,
        value: args.value ?? null,
      } as never,
      { onConflict: "assignment_id,date" }
    );
  if (error) throw error;
}

/**
 * Local "today" in YYYY-MM-DD. Date arithmetic stays in the local timezone
 * so calendar boundaries match what the client sees on their phone.
 */
export function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Walks back from today counting consecutive completed days for one assignment. */
export function computeCurrentStreak(
  logs: HabitLog[],
  assignmentId: string,
  today: string
): number {
  const completedSet = new Set(
    logs
      .filter((l) => l.assignment_id === assignmentId && l.completed)
      .map((l) => l.date)
  );

  // Walk back from today; stop on first miss.
  let streak = 0;
  const cursor = new Date(today + "T00:00:00");
  // 365-day safety cap - we don't have logs older than the page fetched
  // anyway, but bound the loop just in case.
  for (let i = 0; i < 365; i++) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${d}`;
    if (completedSet.has(key)) {
      streak += 1;
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Count of completed days in the trailing 7 days (rolling-week metric). */
export function computeWeeklyCompleted(
  logs: HabitLog[],
  assignmentId: string
): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  return logs.filter(
    (l) =>
      l.assignment_id === assignmentId &&
      l.completed &&
      new Date(l.date + "T00:00:00") >= cutoff
  ).length;
}
