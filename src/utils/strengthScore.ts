/**
 * Strength Score Calculator (placeholder)
 *
 * Calculates a 0-999 score based on estimated 1RMs relative to bodyweight.
 * Uses Wilks-inspired multipliers adjusted for a simple 0-999 scale.
 *
 * This is a placeholder implementation - will be replaced with a proper
 * algorithm once the Strength Score feature is fully built.
 */

type BestLifts = Record<string, { weight?: number; reps?: number; unit?: string } | null>;
type OnboardingForm = {
  weightKg?: number;
  sex?: string;
  bestLifts?: BestLifts;
  experienceLevel?: string;
};

// Brzycki formula for estimated 1RM
function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  if (reps > 12) return weight * (1 + reps / 30); // rough estimate for high reps
  return Math.round(weight * (36 / (37 - reps)));
}

// Bodyweight multiplier benchmarks (intermediate male ~1.0x BW bench, 1.5x squat, 2x DL, 0.7x OHP)
// Adjusted for gender. These map to roughly a "500" score for an intermediate lifter.
const BENCHMARKS = {
  male: { bench: 1.0, squat: 1.5, deadlift: 2.0, ohp: 0.7 },
  female: { bench: 0.6, squat: 1.0, deadlift: 1.5, ohp: 0.45 },
  other: { bench: 0.8, squat: 1.25, deadlift: 1.75, ohp: 0.575 },
};

type LiftKey = "bench" | "squat" | "deadlift" | "ohp";
const LIFT_WEIGHTS: Record<LiftKey, number> = {
  bench: 0.25,
  squat: 0.30,
  deadlift: 0.30,
  ohp: 0.15,
};

/**
 * Calculate a strength score from onboarding form data.
 * Returns a score 0-999. If no lift data, estimates from experience level.
 */
export function calculateStrengthScore(form: OnboardingForm): number {
  const bodyweight = form.weightKg ?? 75; // default 75kg
  const sex = form.sex ?? "other";
  const benchmarks = BENCHMARKS[sex];
  const lifts = form.bestLifts;

  // If user entered any lifts, calculate from those
  if (lifts && hasAnyLift(lifts)) {
    let totalScore = 0;
    let totalWeight = 0;

    for (const key of Object.keys(LIFT_WEIGHTS) as LiftKey[]) {
      const entry = lifts[key];
      if (entry?.weight && entry.weight > 0) {
        const reps = entry.reps ?? 1;
        const e1rm = estimate1RM(entry.weight, reps);
        const ratio = e1rm / bodyweight;
        const benchmark = benchmarks[key];
        // Score this lift: ratio/benchmark gives 1.0 for intermediate
        // Map 1.0 → 500, scale linearly, cap at ~999
        const liftScore = Math.min((ratio / benchmark) * 500, 999);
        totalScore += liftScore * LIFT_WEIGHTS[key];
        totalWeight += LIFT_WEIGHTS[key];
      }
    }

    if (totalWeight > 0) {
      // Normalize to the lifts we have data for
      return Math.round(Math.min(totalScore / totalWeight, 999));
    }
  }

  // Fallback: estimate from experience level
  const experienceScores: Record<string, number> = {
    none: 50,
    beginner: 150,
    intermediate: 350,
    advanced: 550,
  };

  return experienceScores[form.experienceLevel ?? "beginner"] ?? 150;
}

function hasAnyLift(lifts: BestLifts): boolean {
  return Object.values(lifts).some(
    (entry) => entry && typeof entry.weight === "number" && entry.weight > 0
  );
}
