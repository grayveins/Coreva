import {
  engineOutputToProgramDraft,
  createEmptyProgramDraft,
  validateProgramDraft,
  prescriptionToSpec,
  dayPlanToWorkout,
  totalWorkingSets,
} from "../programDraft";
import type { ProgramDraft } from "../types";
import type {
  GeneratorOutput,
  WeekPlan,
  DayPlan,
  ExercisePrescription,
} from "../../workout/generator/types";

// ── Fixtures ────────────────────────────────────────────────────────────────

function presc(over: Partial<ExercisePrescription> = {}): ExercisePrescription {
  return {
    exerciseId: "bench_press",
    name: "Bench Press",
    muscleGroup: "chest" as ExercisePrescription["muscleGroup"],
    sets: 3,
    reps: "8-10",
    rirTarget: 2,
    restSeconds: 120,
    ...over,
  };
}

function trainingDay(dayNumber: number, name: string): DayPlan {
  return {
    dayNumber,
    name,
    isRestDay: false,
    exercises: [presc(), presc({ exerciseId: "row", name: "Barbell Row", muscleGroup: "back" as ExercisePrescription["muscleGroup"] })],
    estimatedDurationMinutes: 55,
  };
}

function restDay(dayNumber: number): DayPlan {
  return { dayNumber, name: "Rest", isRestDay: true };
}

function week(over: Partial<WeekPlan> = {}): WeekPlan {
  return {
    weekNumber: 1,
    phase: "accumulation",
    days: [trainingDay(1, "Upper A"), restDay(2), trainingDay(3, "Lower A")],
    volumeMultiplier: 1,
    intensityMultiplier: 1,
    ...over,
  };
}

function engineOutput(): GeneratorOutput {
  const w = week();
  return {
    metadata: {
      seed: 42,
      generatedAt: "2026-05-29T00:00:00.000Z",
      planType: "4_week_mesocycle",
      split: "upper_lower_4x",
      engineVersion: "1.0.0",
    },
    mesocycle: { week1: w, week2: w, week3: w, week4: { ...w, phase: "deload" } },
    volumeSummary: { byMuscle: {} as never, totalSets: 0, totalExercises: 0 },
    safetyFlags: [],
    substitutions: {},
    programRationale: "Balanced upper/lower hypertrophy block.",
  };
}

// ── prescriptionToSpec ────────────────────────────────────────────────────────

describe("prescriptionToSpec", () => {
  it("maps engine fields to the DB exercise contract", () => {
    const spec = prescriptionToSpec(
      presc({ techniqueNotes: "Pause at chest", supersetGroup: "A" }),
      1,
    );
    expect(spec).toMatchObject({
      order: 1,
      exercise_id: "bench_press",
      exercise_name: "Bench Press",
      sets: 3,
      reps: "8-10",
      rir: 2,
      rest_seconds: 120,
      superset_group: "A",
      notes: "Pause at chest",
    });
  });

  it("falls back to a default rest when omitted", () => {
    const spec = prescriptionToSpec(presc({ restSeconds: undefined as never }), 2);
    expect(spec.rest_seconds).toBe(120);
  });
});

// ── dayPlanToWorkout ──────────────────────────────────────────────────────────

describe("dayPlanToWorkout", () => {
  it("returns null for rest days", () => {
    expect(dayPlanToWorkout(restDay(2))).toBeNull();
  });

  it("builds a workout with 1-based exercise order", () => {
    const w = dayPlanToWorkout(trainingDay(1, "Upper A"));
    expect(w).not.toBeNull();
    expect(w!.name).toBe("Upper A");
    expect(w!.exercises.map((e) => e.order)).toEqual([1, 2]);
  });
});

// ── engineOutputToProgramDraft ────────────────────────────────────────────────

describe("engineOutputToProgramDraft", () => {
  it("creates a single phase from week 1's training days, dropping rest days", () => {
    const draft = engineOutputToProgramDraft(engineOutput());
    expect(draft.phases).toHaveLength(1);
    expect(draft.phases[0].workouts).toHaveLength(2); // rest day filtered out
    expect(draft.phases[0].workouts.map((w) => w.name)).toEqual(["Upper A", "Lower A"]);
  });

  it("derives duration from the number of mesocycle weeks", () => {
    const draft = engineOutputToProgramDraft(engineOutput());
    expect(draft.phases[0].duration_weeks).toBe(4);
  });

  it("respects name/status/startDate overrides and defaults to draft", () => {
    const def = engineOutputToProgramDraft(engineOutput());
    expect(def.status).toBe("draft");

    const draft = engineOutputToProgramDraft(engineOutput(), {
      name: "Sam — Hypertrophy Block 1",
      status: "active",
      startDate: "2026-06-01",
    });
    expect(draft.name).toBe("Sam — Hypertrophy Block 1");
    expect(draft.status).toBe("active");
    expect(draft.start_date).toBe("2026-06-01");
  });

  it("produces a draft that passes validation", () => {
    expect(validateProgramDraft(engineOutputToProgramDraft(engineOutput()))).toEqual([]);
  });
});

// ── validateProgramDraft ──────────────────────────────────────────────────────

describe("validateProgramDraft", () => {
  it("flags an empty manual draft (no workouts)", () => {
    const draft = createEmptyProgramDraft("New Program");
    const errors = validateProgramDraft(draft);
    expect(errors.some((e) => /at least one workout/i.test(e))).toBe(true);
  });

  it("flags duplicate day numbers within a phase", () => {
    const draft: ProgramDraft = {
      name: "P",
      status: "draft",
      phases: [
        {
          name: "Phase 1",
          phase_number: 1,
          duration_weeks: 4,
          workouts: [
            { day_number: 1, name: "A", exercises: [{ order: 1, exercise_name: "Squat", sets: 3, reps: "5", rir: 2 }] },
            { day_number: 1, name: "B", exercises: [{ order: 1, exercise_name: "Bench", sets: 3, reps: "5", rir: 2 }] },
          ],
        },
      ],
    };
    expect(validateProgramDraft(draft).some((e) => /day number 1/.test(e))).toBe(true);
  });

  it("flags exercises with no name or zero sets", () => {
    const draft: ProgramDraft = {
      name: "P",
      status: "draft",
      phases: [
        {
          name: "Phase 1",
          phase_number: 1,
          duration_weeks: 4,
          workouts: [
            { day_number: 1, name: "A", exercises: [{ order: 1, exercise_name: "", sets: 0, reps: "", rir: 2 }] },
          ],
        },
      ],
    };
    const errors = validateProgramDraft(draft);
    expect(errors.some((e) => /needs a name/i.test(e))).toBe(true);
    expect(errors.some((e) => /sets must be/i.test(e))).toBe(true);
    expect(errors.some((e) => /reps required/i.test(e))).toBe(true);
  });
});

// ── totalWorkingSets ──────────────────────────────────────────────────────────

describe("totalWorkingSets", () => {
  it("sums sets across all workouts", () => {
    // 2 workouts × 2 exercises × 3 sets = 12
    expect(totalWorkingSets(engineOutputToProgramDraft(engineOutput()))).toBe(12);
  });
});
