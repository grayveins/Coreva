/**
 * Coach roster — the at-a-glance client list for the dashboard.
 *
 * Backed by the `get_coach_roster` security-definer RPC (migration
 * 20260529_coach_roster.sql), which returns each client with adherence signals
 * in one round-trip (no N+1, no profiles-RLS issues).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as defaultClient } from "../supabase";

type Client = typeof defaultClient;

export type RosterEntry = {
  clientId: string;
  status: "active" | "pending" | "paused" | "archived";
  name: string;
  email: string;
  activeProgramName: string | null;
  workoutsThisWeek: number;
  lastWorkoutAt: string | null;
  nextSessionDate: string | null;
  /** Scheduled sessions in the last 7 days the client missed — the red flag. */
  missedLast7: number;
  currentStreak: number;
  pendingCheckIns: number;
};

/** Derived "needs attention" flag used to highlight a roster row. */
export function needsAttention(entry: RosterEntry): boolean {
  return (
    entry.status === "active" &&
    (entry.missedLast7 >= 2 ||
      entry.pendingCheckIns > 0 ||
      (entry.workoutsThisWeek === 0 && entry.currentStreak === 0))
  );
}

/** Fetch the coach's roster. Returns [] when the coach has no clients. */
export async function fetchCoachRoster(
  coachId: string,
  client: Client = defaultClient,
): Promise<RosterEntry[]> {
  // get_coach_roster is defined in migration 20260529_coach_roster.sql but not
  // yet in the committed generated types; cast at the boundary (consistent with
  // how the app treats the currently-stale Database types).
  const { data, error } = await (client as unknown as SupabaseClient).rpc(
    "get_coach_roster",
    { p_coach_id: coachId },
  );
  if (error) throw new Error(`Failed to load roster: ${error.message}`);
  return (data as unknown as RosterEntry[]) ?? [];
}
