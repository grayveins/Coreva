/**
 * Build and validate ProgramDrafts.
 *
 * Two ways a coach produces a draft:
 *  1. Engine-assisted — `engineOutputToProgramDraft` turns a GeneratorOutput
 *     (the 4-week mesocycle our workout engine emits) into an editable draft.
 *  2. Manual — `createEmptyProgramDraft` / `addWorkout` for from-scratch builds.
 *
 * Either way the coach edits the draft, `validateProgramDraft` gates it, and
 * `persistProgram` writes it. This module is pure (no Supabase, no RN) so it is
 * unit-testable in plain node.
 */

import type {
  GeneratorOutput,
  DayPlan,
  ExercisePrescription,
} from "../workout/generator/types";
import type {
  PhaseDraft,
  PhaseGoal,
  ProgramDraft,
  WorkoutDraft,
  WorkoutExerciseSpec,
} from "./types";

/** Default rest, in seconds, when a prescription omits one. */
const DEFAULT_REST_SECONDS = 120;

/** Map an engine prescription → the DB-shaped exercise spec. */
export function prescriptionToSpec(
  p: ExercisePrescription,
  order: number,
): WorkoutExerciseSpec {
  return {
    order,
    exercise_id: p.exerciseId || undefined,
    exercise_name: p.name,
    sets: p.sets,
    reps: p.reps,
    rir: p.rirTarget,
    rest_seconds: p.restSeconds ?? DEFAULT_REST_SECONDS,
    superset_group: p.supersetGroup,
    notes: p.techniqueNotes ?? p.tempoNotes,
  };
}

/** Map an engine training day → a workout-day template. Rest days return null. */
export function dayPlanToWorkout(day: DayPlan): WorkoutDraft | null {
  if (day.isRestDay || !day.exercises || day.exercises.length === 0) return null;
  return {
    day_number: day.dayNumber,
    name: day.name,
    exercises: day.exercises.map((p, i) => prescriptionToSpec(p, i + 1)),
    duration_minutes: day.estimatedDurationMinutes,
    notes: day.coachNotes,
  };
}

/** Engine phase label → DB phase goal (constrained set). */
function mapEnginePhaseGoal(phase: string | undefined): PhaseGoal {
  switch (phase) {
    case "accumulation":
      return "accumulation";
    case "intensification":
      return "intensification";
    case "peak":
      return "peaking";
    case "deload":
      return "deload";
    default:
      return "hypertrophy";
  }
}

export type EngineDraftOptions = {
  /** Program name; defaults to the engine's split label. */
  name?: string;
  description?: string;
  /** YYYY-MM-DD. */
  startDate?: string;
  /** Persist immediately as active, or leave as an editable draft. */
  status?: ProgramDraft["status"];
};

/**
 * Convert a GeneratorOutput into a single-phase ProgramDraft.
 *
 * Design: the DB stores *day templates* that scheduling repeats, not one row
 * per calendar week (mirrors how the existing SQL seed works — one Full Body
 * template scheduled every other day). So we take the distinct training days
 * from week 1 as the phase's workouts; week-to-week progression is expressed
 * later through scheduling + in-session progression, not duplicated rows.
 */
export function engineOutputToProgramDraft(
  output: GeneratorOutput,
  opts: EngineDraftOptions = {},
): ProgramDraft {
  const week1 = output.mesocycle.week1;
  const workouts = week1.days
    .map(dayPlanToWorkout)
    .filter((w): w is WorkoutDraft => w !== null);

  const totalWeeks =
    Object.keys(output.mesocycle).length || 4; // week1..week4

  const phase: PhaseDraft = {
    name: "Phase 1",
    description: output.programRationale,
    phase_number: 1,
    duration_weeks: totalWeeks,
    goal: mapEnginePhaseGoal(week1.phase),
    workouts,
  };

  return {
    name: opts.name ?? `${output.metadata.split} Program`,
    description: opts.description,
    status: opts.status ?? "draft",
    start_date: opts.startDate,
    phases: [phase],
  };
}

/** A blank single-phase draft for manual building. */
export function createEmptyProgramDraft(name: string): ProgramDraft {
  return {
    name,
    status: "draft",
    phases: [
      {
        name: "Phase 1",
        phase_number: 1,
        duration_weeks: 4,
        goal: "general",
        workouts: [],
      },
    ],
  };
}

/**
 * Validate a draft against the DB CHECK constraints and basic sanity.
 * Returns a list of human-readable errors (empty = valid).
 */
export function validateProgramDraft(draft: ProgramDraft): string[] {
  const errors: string[] = [];

  if (!draft.name?.trim()) errors.push("Program needs a name.");
  if (!draft.phases || draft.phases.length === 0) {
    errors.push("Program needs at least one phase.");
  }

  draft.phases?.forEach((phase, pi) => {
    const label = `Phase ${pi + 1}`;
    if (!phase.name?.trim()) errors.push(`${label} needs a name.`);
    if (phase.duration_weeks < 1) {
      errors.push(`${label} duration must be at least 1 week.`);
    }
    if (!phase.workouts || phase.workouts.length === 0) {
      errors.push(`${label} needs at least one workout.`);
    }

    // day_number must be unique within a phase (it's the template key).
    const seen = new Set<number>();
    phase.workouts?.forEach((w, wi) => {
      const wLabel = `${label} · workout ${wi + 1}`;
      if (!w.name?.trim()) errors.push(`${wLabel} needs a name.`);
      if (seen.has(w.day_number)) {
        errors.push(`${label} has two workouts with day number ${w.day_number}.`);
      }
      seen.add(w.day_number);
      if (!w.exercises || w.exercises.length === 0) {
        errors.push(`${wLabel} has no exercises.`);
      }
      w.exercises?.forEach((ex, ei) => {
        if (!ex.exercise_name?.trim()) {
          errors.push(`${wLabel} · exercise ${ei + 1} needs a name.`);
        }
        if (ex.sets < 1) {
          errors.push(`${wLabel} · ${ex.exercise_name || `exercise ${ei + 1}`}: sets must be ≥ 1.`);
        }
        if (!ex.reps?.toString().trim()) {
          errors.push(`${wLabel} · ${ex.exercise_name || `exercise ${ei + 1}`}: reps required.`);
        }
      });
    });
  });

  return errors;
}

/** Total prescribed working sets across the whole program (a quick volume read). */
export function totalWorkingSets(draft: ProgramDraft): number {
  return draft.phases.reduce(
    (sum, phase) =>
      sum +
      phase.workouts.reduce(
        (ws, w) => ws + w.exercises.reduce((es, e) => es + e.sets, 0),
        0,
      ),
    0,
  );
}
