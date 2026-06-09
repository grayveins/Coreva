/**
 * useStreak - consistency streak.
 *
 * A day counts only when every required habit is logged AND the scheduled
 * workout (if any) is completed. Rest days waive the workout requirement;
 * habits still apply. Source of truth is the `fn_compute_streak` SQL
 * function; this hook reads the cached `user_streaks` row and triggers a
 * server-side recompute on mount via `refresh_my_streak`.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type TodayStatus =
  | "pending"   // today still has unmet requirements but isn't over
  | "complete"  // every required item is done today
  | "rest"      // today is a rest day, habit requirements (if any) are met
  | "unmet"     // historical/legacy: today already failed
  | "none";     // no requirements at all (no habits, no schedule)

export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  /** Most recent date that counted toward the streak. */
  lastCompletedDate: string | null;
  streakFreezeAvailable: boolean;
  todayStatus: TodayStatus;
};

const EMPTY: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastCompletedDate: null,
  streakFreezeAvailable: true,
  todayStatus: "none",
};

export function useStreak(userId: string | null) {
  const [streak, setStreak] = useState<StreakData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const readCache = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("user_streaks")
      .select(
        "current_streak, longest_streak, last_workout_date, streak_freeze_available, today_status"
      )
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code !== "PGRST116") console.error("Error fetching streak:", error);
      setStreak(EMPTY);
      return;
    }

    setStreak({
      currentStreak: data.current_streak ?? 0,
      longestStreak: data.longest_streak ?? 0,
      lastCompletedDate: data.last_workout_date,
      streakFreezeAvailable: data.streak_freeze_available ?? true,
      todayStatus: (data.today_status ?? "none") as TodayStatus,
    });
  }, [userId]);

  const refreshStreak = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      // Server walks backward from today (in user-local TZ) and refreshes
      // the cache. Cheap because it short-circuits at the first unmet day.
      const { error } = await supabase.rpc("refresh_my_streak");
      if (error) console.error("refresh_my_streak failed:", error);
      await readCache();
    } finally {
      setLoading(false);
    }
  }, [userId, readCache]);

  useEffect(() => {
    void refreshStreak();
  }, [refreshStreak]);

  return {
    ...streak,
    loading,
    refreshStreak,
    /** Alive = today has been satisfied (complete or rest). */
    todayDone: streak.todayStatus === "complete" || streak.todayStatus === "rest",
    /** Streak is at risk if today is still pending and the day is more than half over. */
    isStreakAtRisk:
      streak.currentStreak > 0 && streak.todayStatus === "pending",
  };
}

export default useStreak;
