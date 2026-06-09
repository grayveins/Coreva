/**
 * useReverseTrial
 *
 * Gives new users full Pro access for 7 days after account creation,
 * without requiring payment. After the trial expires, features lock
 * and the user sees what they're losing - driving conversion.
 *
 * This is a "reverse trial" (give value first, then take it away)
 * as opposed to a traditional trial (ask for card upfront).
 */

import { useCallback, useEffect, useState } from "react";
import { differenceInDays } from "date-fns";
import { supabase } from "@/lib/supabase";

const TRIAL_DURATION_DAYS = 7;

export function useReverseTrial() {
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [loading, setLoading] = useState(true);

  const checkTrial = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.created_at) {
        setIsTrialActive(false);
        return;
      }

      const createdAt = new Date(user.created_at);
      const now = new Date();
      const daysSinceCreation = differenceInDays(now, createdAt);
      const remaining = Math.max(TRIAL_DURATION_DAYS - daysSinceCreation, 0);

      setIsTrialActive(remaining > 0);
      setDaysRemaining(remaining);
    } catch {
      setIsTrialActive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkTrial();
  }, [checkTrial]);

  return {
    isTrialActive,
    daysRemaining,
    trialDuration: TRIAL_DURATION_DAYS,
    loading,
  };
}
