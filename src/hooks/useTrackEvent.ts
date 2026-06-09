/**
 * useTrackEvent Hook
 *
 * Fire-and-forget event tracking for user behavior analytics.
 * Events are logged to the user_events table in Supabase and
 * never block the UI.
 */

import { useCallback, useRef, useEffect } from "react";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";
import { supabase } from "@/lib/supabase";

export type TrackableEvent =
  | "app_open"
  | "workout_started"
  | "workout_completed"
  | "exercise_skipped"
  | "session_duration"
  | "screen_view";

/**
 * Sends a single event row to user_events.
 * Intentionally not awaited by callers - fire and forget.
 */
async function sendEvent(
  userId: string,
  event: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    await supabase.from("user_events").insert({
      user_id: userId,
      event,
      metadata,
    });
  } catch (err) {
    // Silently swallow - tracking should never crash the app
    if (__DEV__) {
      console.warn("[useTrackEvent] failed to send event:", event, err);
    }
  }
}

export function useTrackEvent(userId: string | null) {
  const appOpenedAt = useRef<number>(Date.now());

  /**
   * Generic track function - call from anywhere in the app.
   */
  const track = useCallback(
    (event: string, metadata?: Record<string, unknown>) => {
      if (!userId) return;
      // Fire and forget - no await
      sendEvent(userId, event, metadata);
    },
    [userId]
  );

  /**
   * Track app_open on mount and session_duration when app backgrounds.
   */
  useEffect(() => {
    if (!userId) return;

    // Track app open
    sendEvent(userId, "app_open");
    appOpenedAt.current = Date.now();

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        const durationSeconds = Math.round(
          (Date.now() - appOpenedAt.current) / 1000
        );
        sendEvent(userId, "session_duration", { durationSeconds });
      }
      if (nextState === "active") {
        // Reset timer on re-foreground
        appOpenedAt.current = Date.now();
        sendEvent(userId, "app_open");
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [userId]);

  return { track };
}

export default useTrackEvent;
