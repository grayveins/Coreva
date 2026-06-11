/**
 * Coach program-builder domain types.
 *
 * These mirror the DB contract for `coaching_programs → program_phases →
 * phase_workouts` (see supabase/migrations/20260509_baseline.sql). A
 * ProgramDraft is the in-memory, pre-persist representation a coach edits in
 * the dashboard; `persistProgram` writes it to those three tables and
 * (optionally) `scheduled_workouts`.
 *
 * The `exercises` field on a workout serializes 1:1 into the
 * `phase_workouts.exercises` JSONB array, whose contract is:
 *   [{ exercise_id, exercise_name, sets, reps, rir, rest_seconds, notes,
 *      order, superset_group }]
 */

/** Phase goals allowed by the `valid_phase_goal` CHECK constraint. */
export type PhaseGoal =
  | "accumulation"
  | "intensification"
  | "deload"
  | "peaking"
  | "hypertrophy"
  | "strength"
  | "power"
  | "endurance"
  | "general";

/** Program statuses allowed by the `valid_program_status` CHECK constraint. */
export type ProgramStatus = "active" | "completed" | "draft" | "paused";

/** One prescribed exercise within a workout. Serializes into phase_workouts.exercises. */
export type WorkoutExerciseSpec = {
  /** 1-based display order within the workout. */
  order: number;
  /** Library id when known; omitted for free-text coach entries. */
  exercise_id?: string;
  /** Display name — always present, this is what the client sees. */
  exercise_name: string;
  sets: number;
  /** Reps as text so ranges ("6-8") and "AMRAP" survive. */
  reps: string;
  /** Reps-in-reserve target (0 = to failure). */
  rir: number;
  rest_seconds?: number;
  /** Same letter = supersetted together. */
  superset_group?: string;
  notes?: string;
};

/** A single workout-day template within a phase (repeated by scheduling). */
export type WorkoutDraft = {
  /** Distinguishes day templates within a phase (1..N). */
  day_number: number;
  name: string;
  exercises: WorkoutExerciseSpec[];
  duration_minutes?: number;
  notes?: string;
};

/** A training block (mesocycle) within a program. */
export type PhaseDraft = {
  name: string;
  description?: string;
  /** 1-based ordering of phases within the program. */
  phase_number: number;
  duration_weeks: number;
  goal?: PhaseGoal;
  workouts: WorkoutDraft[];
};

/** The full editable program a coach assigns to a client. */
export type ProgramDraft = {
  name: string;
  description?: string;
  status: ProgramStatus;
  /** YYYY-MM-DD. */
  start_date?: string;
  phases: PhaseDraft[];
};

/** A single materialized calendar slot for `scheduled_workouts`. */
export type ScheduledSlot = {
  /** YYYY-MM-DD. */
  scheduled_date: string;
  /** Which workout (by day_number) lands on this date. */
  day_number: number;
};

/** Result returned after a program is persisted. */
export type PersistedProgram = {
  programId: string;
  phaseIds: string[];
  /** Maps a phase_workout day_number → its inserted row id (first phase). */
  workoutIdByDayNumber: Record<number, string>;
  scheduledCount: number;
};
