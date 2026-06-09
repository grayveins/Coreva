/**
 * Today's steps + active energy - reads `daily_activity` from Supabase.
 * Companion to `useTodayNutrition`. Fed by `useHealthKit` foreground sync.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type DailyActivityRow = {
  steps: number | null;
  active_energy_kcal: number | null;
  source: string;
  last_synced_at: string;
};

function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useTodayActivity(userId: string | null): {
  data: DailyActivityRow | null;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<DailyActivityRow | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchOnce = useCallback(async () => {
    if (!userId) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const { data: row, error } = await supabase
        .from("daily_activity")
        .select("steps, active_energy_kcal, source, last_synced_at")
        .eq("client_id", userId)
        .eq("date", todayLocalISO())
        .order("last_synced_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.warn("[useTodayActivity] fetch failed", error.message);
        setData(null);
      } else {
        setData((row as DailyActivityRow | null) ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchOnce();
  }, [fetchOnce]);

  return { data, loading, refresh: fetchOnce };
}
