/**
 * useReadinessScore Hook
 *
 * Calculates a daily readiness score (0-100) from available health data
 * and recent training history. Designed as an abstraction layer that can
 * integrate with HealthKit/Health Connect when a custom dev client is used,
 * but always returns a usable score from workout history alone.
 *
 * Data sources (prioritized):
 * 1. Sleep duration (most impactful signal)
 * 2. Resting heart rate (relative to baseline)
 * 3. HRV (relative to baseline)
 * 4. Recent training load (from Supabase workout_sessions)
 */

import { useState, useEffect, useCallback } from "react";
import { subDays, parseISO, startOfDay, isWithinInterval } from "date-fns";
import { supabase } from "@/lib/supabase";

// =============================================================================
// TYPES
// =============================================================================

export type ReadinessLevel = "low" | "moderate" | "good" | "peak";

export type ReadinessFactor = {
  name: string;
  impact: number;
  detail: string;
};

export type ReadinessData = {
  score: number;
  level: ReadinessLevel;
  color: string;
  icon: string;
  label: string;
  suggestion: string;
  factors: ReadinessFactor[];
  loading: boolean;
};

type HealthData = {
  sleepHours: number | null;
  restingHeartRate: number | null;
  restingHeartRateBaseline: number | null;
  hrv: number | null;
  hrvBaseline: number | null;
};

/**
 * Abstracted health data provider interface.
 * Implementations can read from HealthKit, Health Connect, or any wearable SDK.
 * When no provider is available, the hook falls back to training history only.
 */
export type HealthDataProvider = {
  isAvailable: () => Promise<boolean>;
  requestPermissions: () => Promise<boolean>;
  getLastNightSleep: () => Promise<number | null>;
  getRestingHeartRate: () => Promise<{ current: number | null; baseline: number | null }>;
  getHRV: () => Promise<{ current: number | null; baseline: number | null }>;
};

// =============================================================================
// SCORING CONSTANTS
// =============================================================================

const BASE_SCORE = 70;

const LEVEL_THRESHOLDS: Record<ReadinessLevel, { min: number; max: number }> = {
  low: { min: 0, max: 30 },
  moderate: { min: 31, max: 55 },
  good: { min: 56, max: 75 },
  peak: { min: 76, max: 100 },
};

const LEVEL_CONFIG: Record<ReadinessLevel, {
  label: string;
  icon: string;
  suggestion: string;
  colorKey: "error" | "warning" | "primary" | "gold";
}> = {
  low: {
    label: "Low Readiness",
    icon: "battery-charging-outline",
    suggestion: "Consider a lighter session or active recovery today",
    colorKey: "error",
  },
  moderate: {
    label: "Moderate Readiness",
    icon: "battery-half-outline",
    suggestion: "Reduce volume ~20% and focus on technique",
    colorKey: "warning",
  },
  good: {
    label: "Good Readiness",
    icon: "battery-full-outline",
    suggestion: "Train as planned - you're ready to go",
    colorKey: "primary",
  },
  peak: {
    label: "Peak Readiness",
    icon: "flash-outline",
    suggestion: "Push harder today - add volume or intensity",
    colorKey: "gold",
  },
};

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

function getSleepAdjustment(hours: number): { impact: number; detail: string } {
  if (hours < 5) return { impact: -25, detail: `${hours.toFixed(1)}h sleep - severely under-recovered` };
  if (hours < 6) return { impact: -15, detail: `${hours.toFixed(1)}h sleep - below minimum` };
  if (hours < 7) return { impact: -5, detail: `${hours.toFixed(1)}h sleep - slightly low` };
  if (hours <= 8) return { impact: 5, detail: `${hours.toFixed(1)}h sleep - optimal range` };
  if (hours <= 9) return { impact: 10, detail: `${hours.toFixed(1)}h sleep - excellent recovery` };
  return { impact: 5, detail: `${hours.toFixed(1)}h sleep - extended rest` };
}

function getRHRAdjustment(current: number, baseline: number): { impact: number; detail: string } {
  const pctDiff = ((current - baseline) / baseline) * 100;
  if (pctDiff > 10) return { impact: -15, detail: `RHR ${current}bpm - ${Math.round(pctDiff)}% above baseline` };
  if (pctDiff > 5) return { impact: -8, detail: `RHR ${current}bpm - slightly elevated` };
  if (pctDiff < -5) return { impact: 5, detail: `RHR ${current}bpm - below baseline (good)` };
  return { impact: 0, detail: `RHR ${current}bpm - normal range` };
}

function getHRVAdjustment(current: number, baseline: number): { impact: number; detail: string } {
  const pctDiff = ((current - baseline) / baseline) * 100;
  if (pctDiff < -20) return { impact: -15, detail: `HRV ${current}ms - significantly suppressed` };
  if (pctDiff < -10) return { impact: -8, detail: `HRV ${current}ms - below baseline` };
  if (pctDiff > 10) return { impact: 8, detail: `HRV ${current}ms - above baseline (recovered)` };
  return { impact: 0, detail: `HRV ${current}ms - normal range` };
}

function getTrainingLoadAdjustment(
  recentWorkouts: Date[],
): { impact: number; detail: string } {
  const now = new Date();
  const yesterday = subDays(startOfDay(now), 1);
  const twoDaysAgo = subDays(startOfDay(now), 2);

  const workedOutYesterday = recentWorkouts.some((d) =>
    isWithinInterval(d, { start: yesterday, end: startOfDay(now) })
  );
  const workedOutTwoDaysAgo = recentWorkouts.some((d) =>
    isWithinInterval(d, { start: twoDaysAgo, end: yesterday })
  );

  if (workedOutYesterday && workedOutTwoDaysAgo) {
    return { impact: -10, detail: "Trained 2 days in a row - accumulated fatigue" };
  }
  if (workedOutYesterday) {
    return { impact: -5, detail: "Trained yesterday - mild fatigue" };
  }

  // Check how many rest days
  const lastWorkout = recentWorkouts.length > 0
    ? recentWorkouts.reduce((latest, d) => (d > latest ? d : latest))
    : null;

  if (!lastWorkout) {
    return { impact: 10, detail: "No recent workouts - fully rested" };
  }

  const daysSinceLastWorkout = Math.floor(
    (now.getTime() - lastWorkout.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastWorkout >= 2) {
    return { impact: 10, detail: `${daysSinceLastWorkout} rest days - well recovered` };
  }

  return { impact: 5, detail: "1 rest day - good recovery" };
}

function getReadinessLevel(score: number): ReadinessLevel {
  if (score <= LEVEL_THRESHOLDS.low.max) return "low";
  if (score <= LEVEL_THRESHOLDS.moderate.max) return "moderate";
  if (score <= LEVEL_THRESHOLDS.good.max) return "good";
  return "peak";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// =============================================================================
// COLOR MAPPING (theme-aware)
// Uses color keys that map to the theme's semantic colors.
// The component layer resolves these via useTheme().
// =============================================================================

const LEVEL_COLORS: Record<ReadinessLevel, string> = {
  low: "#F87171",     // error red / intensity
  moderate: "#FBBF24", // warning yellow
  good: "#3B82F6",    // primary teal
  peak: "#FFD700",    // gold
};

// =============================================================================
// HOOK
// =============================================================================

type UseReadinessScoreOptions = {
  healthProvider?: HealthDataProvider | null;
};

export function useReadinessScore(
  userId: string | null,
  options: UseReadinessScoreOptions = {},
): ReadinessData {
  const { healthProvider = null } = options;

  const [readiness, setReadiness] = useState<ReadinessData>({
    score: BASE_SCORE,
    level: "good",
    color: LEVEL_COLORS.good,
    icon: LEVEL_CONFIG.good.icon,
    label: LEVEL_CONFIG.good.label,
    suggestion: LEVEL_CONFIG.good.suggestion,
    factors: [],
    loading: true,
  });

  const calculate = useCallback(async () => {
    if (!userId) {
      setReadiness((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      // --- Fetch recent workouts from Supabase ---
      const sevenDaysAgo = subDays(new Date(), 7);
      const { data: sessions } = await supabase
        .from("workout_sessions")
        .select("started_at")
        .eq("user_id", userId)
        .gte("started_at", sevenDaysAgo.toISOString())
        .order("started_at", { ascending: false });

      const recentWorkouts = (sessions || []).map((s) => parseISO(s.started_at));

      // --- Try to get health data from provider ---
      let healthData: HealthData = {
        sleepHours: null,
        restingHeartRate: null,
        restingHeartRateBaseline: null,
        hrv: null,
        hrvBaseline: null,
      };

      if (healthProvider) {
        try {
          const available = await healthProvider.isAvailable();
          if (available) {
            const [sleep, rhr, hrv] = await Promise.all([
              healthProvider.getLastNightSleep(),
              healthProvider.getRestingHeartRate(),
              healthProvider.getHRV(),
            ]);
            healthData = {
              sleepHours: sleep,
              restingHeartRate: rhr.current,
              restingHeartRateBaseline: rhr.baseline,
              hrv: hrv.current,
              hrvBaseline: hrv.baseline,
            };
          }
        } catch (err) {
          console.warn("Health data provider error:", err);
        }
      }

      // --- Calculate score ---
      let score = BASE_SCORE;
      const factors: ReadinessFactor[] = [];

      // Sleep adjustment
      if (healthData.sleepHours !== null) {
        const { impact, detail } = getSleepAdjustment(healthData.sleepHours);
        score += impact;
        factors.push({ name: "Sleep", impact, detail });
      }

      // RHR adjustment
      if (
        healthData.restingHeartRate !== null &&
        healthData.restingHeartRateBaseline !== null
      ) {
        const { impact, detail } = getRHRAdjustment(
          healthData.restingHeartRate,
          healthData.restingHeartRateBaseline,
        );
        score += impact;
        factors.push({ name: "Resting Heart Rate", impact, detail });
      }

      // HRV adjustment
      if (healthData.hrv !== null && healthData.hrvBaseline !== null) {
        const { impact, detail } = getHRVAdjustment(
          healthData.hrv,
          healthData.hrvBaseline,
        );
        score += impact;
        factors.push({ name: "Heart Rate Variability", impact, detail });
      }

      // Training load (always available from Supabase)
      const { impact: loadImpact, detail: loadDetail } =
        getTrainingLoadAdjustment(recentWorkouts);
      score += loadImpact;
      factors.push({ name: "Training Load", impact: loadImpact, detail: loadDetail });

      // Clamp
      score = clamp(Math.round(score), 0, 100);

      // Derive level and config
      const level = getReadinessLevel(score);
      const config = LEVEL_CONFIG[level];

      setReadiness({
        score,
        level,
        color: LEVEL_COLORS[level],
        icon: config.icon,
        label: config.label,
        suggestion: config.suggestion,
        factors,
        loading: false,
      });
    } catch (err) {
      console.error("Readiness score calculation error:", err);
      // Return neutral score on error
      setReadiness({
        score: BASE_SCORE,
        level: "good",
        color: LEVEL_COLORS.good,
        icon: LEVEL_CONFIG.good.icon,
        label: LEVEL_CONFIG.good.label,
        suggestion: LEVEL_CONFIG.good.suggestion,
        factors: [{ name: "Error", impact: 0, detail: "Could not calculate - using default" }],
        loading: false,
      });
    }
  }, [userId, healthProvider]);

  useEffect(() => {
    calculate();
  }, [calculate]);

  return readiness;
}

export default useReadinessScore;
