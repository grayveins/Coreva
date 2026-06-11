/**
 * useCoachRoster - loads the coach's client roster with adherence signals.
 * Thin hook over fetchCoachRoster (get_coach_roster RPC) with refresh support.
 */

import { useCallback, useEffect, useState } from "react";
import { fetchCoachRoster, type RosterEntry } from "@/lib/coach/roster";

export type CoachRosterState = {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  roster: RosterEntry[];
  refresh: () => Promise<void>;
};

export function useCoachRoster(coachId: string | null): CoachRosterState {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (!coachId) {
        setRoster([]);
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setRoster(await fetchCoachRoster(coachId));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load roster.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [coachId],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { loading, refreshing, error, roster, refresh };
}
