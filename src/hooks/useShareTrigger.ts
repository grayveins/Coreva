/**
 * useShareTrigger Hook
 * Smart share trigger system that prompts users to share at high-emotion moments.
 * Respects fatigue rules so prompts feel organic, not spammy.
 */

import { useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ShareTriggerEvent =
  | "first_workout"
  | "pr_hit"
  | "rank_up"
  | "streak_7"
  | "streak_30"
  | "monthly_recap"
  | "sr_milestone";

export type ShareTrigger = {
  shouldShow: boolean;
  title: string;
  subtitle: string;
  ctaText: string;
  event: ShareTriggerEvent;
};

// ─── Storage keys ────────────────────────────────────────────────────────────

const KEY_LAST_PROMPT = "@share_trigger_last_prompt";
const KEY_DISMISSED_PREFIX = "@share_trigger_dismissed_";
const KEY_SHOWN_PREFIX = "@share_trigger_shown_";

// ─── Constants ───────────────────────────────────────────────────────────────

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const MAX_DISMISSALS = 3;

// ─── Contextual copy per event ───────────────────────────────────────────────

const EVENT_COPY: Record<
  ShareTriggerEvent,
  { title: string; subtitle: string; ctaText: string }
> = {
  first_workout: {
    title: "You did it!",
    subtitle: "Share your first ADPT workout",
    ctaText: "Share",
  },
  pr_hit: {
    title: "New record!",
    subtitle: "Tell your gym crew",
    ctaText: "Share PR",
  },
  rank_up: {
    title: "Level up!",
    subtitle: "You just ranked up \u2014 share the news",
    ctaText: "Share",
  },
  streak_7: {
    title: "7 days strong",
    subtitle: "Share your consistency",
    ctaText: "Share Streak",
  },
  streak_30: {
    title: "30-day streak!",
    subtitle: "An incredible milestone \u2014 let people know",
    ctaText: "Share Streak",
  },
  monthly_recap: {
    title: "Month in review",
    subtitle: "Share your progress recap",
    ctaText: "Share Recap",
  },
  sr_milestone: {
    title: "Strength score milestone",
    subtitle: "Your score just hit a new tier",
    ctaText: "Share Score",
  },
};

// Events that bypass the 24-hour cooldown (rare / one-time)
const ALWAYS_SHOW_EVENTS: ShareTriggerEvent[] = [
  "first_workout",
  "streak_30",
];

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useShareTrigger() {
  // Track whether we've already shown a prompt this session (in-memory)
  const sessionShownRef = useRef(false);

  /**
   * Check whether a share prompt should display for a given event.
   * Returns a ShareTrigger with `shouldShow: false` if suppressed.
   */
  const checkShareTrigger = useCallback(
    async (
      event: ShareTriggerEvent,
      _metadata?: Record<string, unknown>
    ): Promise<ShareTrigger> => {
      const copy = EVENT_COPY[event];
      const noShow: ShareTrigger = { shouldShow: false, ...copy, event };

      try {
        // Rule 1: Only one prompt per session
        if (sessionShownRef.current) return noShow;

        // Rule 2: Check per-event dismissal count
        const dismissedRaw = await AsyncStorage.getItem(
          `${KEY_DISMISSED_PREFIX}${event}`
        );
        const dismissedCount = dismissedRaw ? parseInt(dismissedRaw, 10) : 0;
        if (dismissedCount >= MAX_DISMISSALS) return noShow;

        // Rule 3: first_workout should only fire once ever
        if (event === "first_workout") {
          const alreadyShown = await AsyncStorage.getItem(
            `${KEY_SHOWN_PREFIX}${event}`
          );
          if (alreadyShown) return noShow;
        }

        // Rule 4: 24-hour cooldown (skip for rare events)
        if (!ALWAYS_SHOW_EVENTS.includes(event)) {
          const lastPromptRaw = await AsyncStorage.getItem(KEY_LAST_PROMPT);
          if (lastPromptRaw) {
            const elapsed = Date.now() - parseInt(lastPromptRaw, 10);
            if (elapsed < TWENTY_FOUR_HOURS) return noShow;
          }
        }

        // All rules passed - mark session shown
        sessionShownRef.current = true;

        // Persist last-prompt timestamp and mark this event as shown
        await AsyncStorage.setItem(KEY_LAST_PROMPT, String(Date.now()));
        await AsyncStorage.setItem(`${KEY_SHOWN_PREFIX}${event}`, "1");

        return { shouldShow: true, ...copy, event };
      } catch {
        // AsyncStorage failure - fail open (don't show)
        return noShow;
      }
    },
    []
  );

  /**
   * Call when the user dismisses a share prompt.
   * Increments the per-event dismissal counter.
   */
  const dismissShareTrigger = useCallback(
    async (event: ShareTriggerEvent) => {
      try {
        const key = `${KEY_DISMISSED_PREFIX}${event}`;
        const raw = await AsyncStorage.getItem(key);
        const count = raw ? parseInt(raw, 10) : 0;
        await AsyncStorage.setItem(key, String(count + 1));
      } catch {
        // Best-effort
      }
    },
    []
  );

  /**
   * Reset session flag - call at app foreground if needed.
   */
  const resetSession = useCallback(() => {
    sessionShownRef.current = false;
  }, []);

  return {
    checkShareTrigger,
    dismissShareTrigger,
    resetSession,
  };
}

export default useShareTrigger;
