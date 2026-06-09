/**
 * Today's nutrition intake - reads `daily_nutrition` from Supabase.
 *
 * The Supabase row is fed by `useHealthKit` (foreground sync). This hook
 * is the read side: it stays in sync with whichever row HealthKit (or
 * future sources) wrote for today, regardless of which app the user
 * actually logged in (MFP, Cronometer, manual Health entry, etc.).
 *
 * Mirrors the cache + refetch pattern of `useClientMacros` so callers can
 * use both side-by-side without ergonomic friction.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type DailyNutritionRow = {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
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

export function useTodayNutrition(userId: string | null): {
  data: DailyNutritionRow | null;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<DailyNutritionRow | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchOnce = useCallback(async () => {
    if (!userId) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      // Pick the most-recently-synced row across all sources for today.
      // Today there's only one source (`healthkit`); future sources will
      // tie-break by `last_synced_at DESC`.
      const { data: row, error } = await supabase
        .from("daily_nutrition")
        .select("calories, protein_g, carbs_g, fat_g, source, last_synced_at")
        .eq("client_id", userId)
        .eq("date", todayLocalISO())
        .order("last_synced_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.warn("[useTodayNutrition] fetch failed", error.message);
        setData(null);
      } else {
        setData((row as DailyNutritionRow | null) ?? null);
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
