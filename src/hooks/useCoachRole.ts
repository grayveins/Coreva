/**
 * useCoachRole - is the signed-in user a coach?
 *
 * A coach is anyone with a row in the `coaches` table. We check that table
 * directly (not `profiles.role`) because it's authoritative: the
 * handle_coach_role trigger only flows role→coaches, not the reverse, so a
 * coaches row created by a seed/admin won't have flipped profiles.role. The
 * coach's id is their auth uid, which is also `coaches.id` and the `coach_id`
 * foreign key everywhere. Returns loading until resolved so guards don't flash.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type CoachRoleState = {
  loading: boolean;
  isCoach: boolean;
  /** auth uid === coaches.id; null until known. */
  coachId: string | null;
};

export function useCoachRole(): CoachRoleState {
  const [state, setState] = useState<CoachRoleState>({
    loading: true,
    isCoach: false,
    coachId: null,
  });

  const resolve = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setState({ loading: false, isCoach: false, coachId: null });
      return;
    }
    const { data, error } = await supabase
      .from("coaches")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    const isCoach = !error && !!data;
    setState({ loading: false, isCoach, coachId: isCoach ? user.id : null });
  }, []);

  useEffect(() => {
    let alive = true;
    resolve().catch(() => {
      if (alive) setState({ loading: false, isCoach: false, coachId: null });
    });
    return () => {
      alive = false;
    };
  }, [resolve]);

  return state;
}
