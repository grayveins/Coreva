/**
 * Integration test for the headline "generate with engine" feature: run the
 * real workout engine and confirm its output maps to a valid, assignable
 * ProgramDraft. If the engine ever pulls an RN-only import or its output shape
 * drifts from the DB contract, this fails loudly.
 */

import { generateProgram } from "../../workout/engine/generator";
import type { GeneratorInput } from "../../workout/generator/types";
import { engineOutputToProgramDraft, validateProgramDraft, totalWorkingSets } from "../programDraft";

function input(over: Partial<GeneratorInput> = {}): GeneratorInput {
  return {
    userId: "test-client",
    experienceLevel: "intermediate",
    fitnessGoal: "hypertrophy",
    daysPerWeek: 4,
    sessionDurationMinutes: 60,
    availableEquipment: [
      "barbell",
      "dumbbells",
      "cables",
      "machines",
      "bench",
      "squat_rack",
      "pull_up_bar",
    ],
    splitPreference: "auto",
    seed: 12345,
    ...over,
  };
}

describe("engine → ProgramDraft integration", () => {
  it("generates an assignable, valid draft from engine output", () => {
    const out = generateProgram(input(), { generateRationale: true });
    const draft = engineOutputToProgramDraft(out, { name: "Engine Test Program" });

    expect(validateProgramDraft(draft)).toEqual([]);
    expect(draft.phases).toHaveLength(1);
    expect(draft.phases[0].workouts.length).toBeGreaterThan(0);
    expect(totalWorkingSets(draft)).toBeGreaterThan(0);

    // Every exercise the engine produced must carry the fields the DB needs.
    for (const w of draft.phases[0].workouts) {
      expect(w.name.length).toBeGreaterThan(0);
      for (const ex of w.exercises) {
        expect(ex.exercise_name.length).toBeGreaterThan(0);
        expect(ex.sets).toBeGreaterThan(0);
        expect(String(ex.reps).length).toBeGreaterThan(0);
      }
    }
  });

  it("is deterministic for a fixed seed (same program twice)", () => {
    const a = engineOutputToProgramDraft(generateProgram(input({ seed: 999 })));
    const b = engineOutputToProgramDraft(generateProgram(input({ seed: 999 })));
    const names = (d: typeof a) => d.phases[0].workouts.flatMap((w) => w.exercises.map((e) => e.exercise_name));
    expect(names(a)).toEqual(names(b));
  });

  it("respects days-per-week (more training days for a 5-day split)", () => {
    const d3 = engineOutputToProgramDraft(generateProgram(input({ daysPerWeek: 3, splitPreference: "full_body" })));
    const d5 = engineOutputToProgramDraft(generateProgram(input({ daysPerWeek: 5, splitPreference: "push_pull_legs" })));
    expect(d5.phases[0].workouts.length).toBeGreaterThanOrEqual(d3.phases[0].workouts.length);
  });
});
