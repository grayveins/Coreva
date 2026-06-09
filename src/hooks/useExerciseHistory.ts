/**
 * useExerciseHistory
 *
 * Fetches all historical sets for a single exercise (by name) for the
 * current user, grouped into sessions ordered most-recent first.
 *
 * Used by the in-flow ExerciseHistorySheet - the user taps an exercise
 * name during an active workout and we show their chronological log
 * with an estimated 1RM hero, a metric chart, and per-session sets.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type HistorySet = {
  setNumber: number;
  weight: number;
  reps: number;
  isWarmup: boolean;
};

export type HistorySession = {
  sessionId: string;
  date: string; // ISO
  exerciseId: string;
  notes: string | null;
  sets: HistorySet[];
};

export type ExerciseHistoryStats = {
  /** Best estimated 1RM across all logged sets, in lbs. */
  best1RM: number | null;
  /** Heaviest weight ever logged, in lbs. */
  heaviestWeight: number | null;
  /** Best single-set volume (weight × reps), in lbs. */
  bestSetVolume: number | null;
  /** Total volume across all sets, in lbs. */
  totalVolume: number;
};

/**
 * Brzycki estimated 1RM. Reps capped at 12 because the formula loses
 * accuracy past that. Returns null if the input is unusable.
 */
export function brzycki1RM(weight: number, reps: number): number | null {
  if (!weight || !reps || reps < 1) return null;
  const r = Math.min(reps, 12);
  if (r === 1) return weight;
  return Math.round((weight * 36) / (37 - r));
}

function computeStats(sessions: HistorySession[]): ExerciseHistoryStats {
  let best1RM: number | null = null;
  let heaviestWeight: number | null = null;
  let bestSetVolume: number | null = null;
  let totalVolume = 0;

  for (const session of sessions) {
    for (const set of session.sets) {
      if (set.isWarmup) continue;
      const w = set.weight;
      const r = set.reps;
      if (!w || !r) continue;

      totalVolume += w * r;

      if (heaviestWeight == null || w > heaviestWeight) heaviestWeight = w;
      const v = w * r;
      if (bestSetVolume == null || v > bestSetVolume) bestSetVolume = v;
      const e = brzycki1RM(w, r);
      if (e != null && (best1RM == null || e > best1RM)) best1RM = e;
    }
  }
  return { best1RM, heaviestWeight, bestSetVolume, totalVolume };
}

type Row = {
  weight_lbs: number | null;
  reps: number | null;
  set_number: number | null;
  is_warmup: boolean | null;
  workout_exercises: {
    id: string;
    exercise_name: string;
    notes: string | null;
    session_id: string;
    workout_sessions: {
      id: string;
      user_id: string;
      started_at: string;
    } | null;
  } | null;
};

type State = {
  loading: boolean;
  error: string | null;
  sessions: HistorySession[];
  stats: ExerciseHistoryStats;
};

const EMPTY_STATS: ExerciseHistoryStats = {
  best1RM: null,
  heaviestWeight: null,
  bestSetVolume: null,
  totalVolume: 0,
};

export function useExerciseHistory(
  userId: string | null,
  exerciseName: string | null
): State & { refresh: () => void } {
  const [state, setState] = useState<State>({
    loading: true,
    error: null,
    sessions: [],
    stats: EMPTY_STATS,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!userId || !exerciseName) {
      setState({ loading: false, error: null, sessions: [], stats: EMPTY_STATS });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      // Note: PostgREST refuses ".order()" against deeply nested foreign
      // relationships. Fetch unordered and sort client-side after grouping -
      // the dataset is bounded (one user × one exercise) so this is cheap.
      const { data, error } = await supabase
        .from("workout_sets")
        .select(
          `
          weight_lbs,
          reps,
          set_number,
          is_warmup,
          workout_exercises!inner(
            id,
            exercise_name,
            notes,
            session_id,
            workout_sessions!inner(
              id,
              user_id,
              started_at
            )
          )
        `
        )
        .eq("workout_exercises.exercise_name", exerciseName)
        .eq("workout_exercises.workout_sessions.user_id", userId);

      if (cancelled) return;
      if (error) {
        setState({
          loading: false,
          error: error.message,
          sessions: [],
          stats: EMPTY_STATS,
        });
        return;
      }

      const grouped = new Map<string, HistorySession>();
      for (const row of (data ?? []) as unknown as Row[]) {
        const ex = row.workout_exercises;
        const session = ex?.workout_sessions;
        if (!ex || !session) continue;

        const key = session.id;
        let bucket = grouped.get(key);
        if (!bucket) {
          bucket = {
            sessionId: session.id,
            date: session.started_at,
            exerciseId: ex.id,
            notes: ex.notes,
            sets: [],
          };
          grouped.set(key, bucket);
        }
        bucket.sets.push({
          setNumber: row.set_number ?? bucket.sets.length + 1,
          weight: Number(row.weight_lbs ?? 0),
          reps: Number(row.reps ?? 0),
          isWarmup: !!row.is_warmup,
        });
      }

      // Sort: sessions newest-first, sets within a session by set_number.
      const sessions = Array.from(grouped.values())
        .map((s) => ({
          ...s,
          sets: [...s.sets].sort((a, b) => a.setNumber - b.setNumber),
        }))
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      const stats = computeStats(sessions);

      setState({ loading: false, error: null, sessions, stats });
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, exerciseName, refreshKey]);

  return { ...state, refresh: () => setRefreshKey((k) => k + 1) };
}
