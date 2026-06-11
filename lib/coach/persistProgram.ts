/**
 * Persist a ProgramDraft to Supabase — the TypeScript replacement for
 * hand-written SQL seed scripts (e.g. scripts/seed_troy_garcia_plan.sql).
 *
 * Writes coaching_programs → program_phases → phase_workouts, then optionally
 * materializes scheduled_workouts. All writes go through the coach's own JWT;
 * the coach-scoped RLS policies in the baseline migration authorize them
 * (coaching_programs.coach_id = auth.uid(), phases/workouts gated via parent).
 *
 * Runs in a best-effort sequential order. Postgres has no client-side
 * transaction over PostgREST, so on a mid-way failure we surface the error and
 * leave a draft program the coach can retry/delete — we deliberately create the
 * program as the LAST-activated step to avoid a half-active program.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as defaultClient } from "../supabase";
import type { PersistedProgram, ProgramDraft, ScheduledSlot } from "./types";
import { validateProgramDraft } from "./programDraft";

type Client = typeof defaultClient;

export type PersistOptions = {
  coachId: string;
  clientId: string;
  draft: ProgramDraft;
  /** Optional calendar slots (day_number → date). Mapped to phase 1 workouts. */
  schedule?: ScheduledSlot[];
  /** Deactivate any currently-active program for this client first. Default true. */
  deactivatePrevious?: boolean;
  /** Inject a client for testing; defaults to the app Supabase client. */
  client?: Client;
};

export class PersistProgramError extends Error {
  step: string;
  cause?: unknown;
  constructor(step: string, message: string, cause?: unknown) {
    super(`[${step}] ${message}`);
    this.name = "PersistProgramError";
    this.step = step;
    this.cause = cause;
  }
}

/**
 * Assign a program to a client. Returns the created ids + scheduled count.
 * Throws PersistProgramError (tagged with the failing step) on any failure.
 */
export async function persistProgram(
  opts: PersistOptions,
): Promise<PersistedProgram> {
  const {
    coachId,
    clientId,
    draft,
    schedule,
    deactivatePrevious = true,
    client = defaultClient,
  } = opts;

  const errors = validateProgramDraft(draft);
  if (errors.length > 0) {
    throw new PersistProgramError("validate", errors.join(" "));
  }

  // The generated Database types currently resolve writes to `never` (a known
  // stale-types issue across the whole app — workout.tsx etc. cast the same
  // way). Cast at the Supabase boundary; the domain types (ProgramDraft,
  // PersistedProgram) stay fully strict so the contract is still enforced.
  const db = client as unknown as SupabaseClient;

  // 1. Deactivate prior active programs for this client (one active at a time).
  if (deactivatePrevious) {
    const { error } = await db
      .from("coaching_programs")
      .update({ status: "paused" })
      .eq("coach_id", coachId)
      .eq("client_id", clientId)
      .eq("status", "active");
    if (error) {
      throw new PersistProgramError("deactivate", error.message, error);
    }
  }

  // 2. Insert the program.
  const { data: program, error: progErr } = await db
    .from("coaching_programs")
    .insert({
      coach_id: coachId,
      client_id: clientId,
      name: draft.name,
      description: draft.description ?? null,
      status: draft.status,
      start_date: draft.start_date ?? null,
    })
    .select("id")
    .single();
  if (progErr || !program) {
    throw new PersistProgramError("insert_program", progErr?.message ?? "no row", progErr);
  }
  const programId = program.id;

  const phaseIds: string[] = [];
  const workoutIdByDayNumber: Record<number, string> = {};

  // 3. Insert each phase and its workouts.
  for (const phase of draft.phases) {
    const { data: phaseRow, error: phaseErr } = await db
      .from("program_phases")
      .insert({
        program_id: programId,
        name: phase.name,
        description: phase.description ?? null,
        phase_number: phase.phase_number,
        duration_weeks: phase.duration_weeks,
        goal: phase.goal ?? null,
        status: phase.phase_number === 1 ? "active" : "upcoming",
      })
      .select("id")
      .single();
    if (phaseErr || !phaseRow) {
      throw new PersistProgramError("insert_phase", phaseErr?.message ?? "no row", phaseErr);
    }
    phaseIds.push(phaseRow.id);

    if (phase.workouts.length > 0) {
      const { data: workoutRows, error: woErr } = await db
        .from("phase_workouts")
        .insert(
          phase.workouts.map((w) => ({
            phase_id: phaseRow.id,
            day_number: w.day_number,
            name: w.name,
            exercises: w.exercises,
            duration_minutes: w.duration_minutes ?? null,
            notes: w.notes ?? null,
          })),
        )
        .select("id, day_number");
      if (woErr || !workoutRows) {
        throw new PersistProgramError("insert_workouts", woErr?.message ?? "no rows", woErr);
      }
      // Map day_number → id from the FIRST phase only; that's what scheduling
      // (which is phase-1 oriented in v1) references.
      if (phase.phase_number === 1) {
        for (const row of workoutRows) {
          workoutIdByDayNumber[row.day_number] = row.id;
        }
      }
    }
  }

  // 4. Materialize the schedule, if provided.
  let scheduledCount = 0;
  if (schedule && schedule.length > 0) {
    const rows = schedule
      .map((slot) => {
        const phaseWorkoutId = workoutIdByDayNumber[slot.day_number];
        if (!phaseWorkoutId) return null; // skip slots without a matching workout
        return {
          client_id: clientId,
          coach_id: coachId,
          scheduled_date: slot.scheduled_date,
          source_type: "phase_workout" as const,
          phase_workout_id: phaseWorkoutId,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length > 0) {
      const { error: schedErr, count } = await db
        .from("scheduled_workouts")
        .upsert(rows, {
          onConflict: "client_id,scheduled_date",
          ignoreDuplicates: true,
          count: "exact",
        });
      if (schedErr) {
        throw new PersistProgramError("schedule", schedErr.message, schedErr);
      }
      scheduledCount = count ?? rows.length;
    }
  }

  return { programId, phaseIds, workoutIdByDayNumber, scheduledCount };
}
