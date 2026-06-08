/**
 * Compute the started_at / ended_at pair for a workout session, honoring
 * an optional backfill date for sessions that the user attributes to an
 * earlier calendar day (e.g. logging Monday's workout from Tuesday).
 *
 * Behavior:
 * - No sessionDate, or future / today / malformed → live timestamps
 *   (started_at = startTime, ended_at = startTime + capped duration).
 * - sessionDate strictly before today → started_at is noon of that day,
 *   ended_at is started_at + the capped duration of the session.
 *
 * Duration is capped so a session left open for hours/days (the draft
 * persists in AsyncStorage and rehydrates) can never save a multi-day
 * length. When the caller knows when the last set was logged
 * (`lastActivityAt`), we end the session a short grace period after that
 * instead of at `now` — giving accurate durations for abandoned sessions.
 * A hard ceiling (`MAX_SESSION_MS`) is the final backstop.
 *
 * Pure function — accepts `now` so we can test it deterministically.
 */

/** Hard ceiling for a single session. Real workouts rarely exceed this;
 *  anything longer is almost certainly a session left running. */
export const MAX_SESSION_MS = 4 * 60 * 60 * 1000; // 4 hours

/** Grace window kept after the last logged set when ending an otherwise
 *  abandoned session (covers the final set's rest + cooldown). */
export const ACTIVITY_GRACE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Realistic elapsed duration for a session, in ms. Prefers the real
 * activity window (start → last logged set + grace) when available, then
 * applies the hard ceiling. Never negative.
 */
export function cappedSessionDurationMs(args: {
  startTime: number;
  now: number;
  lastActivityAt?: number | null;
}): number {
  const { startTime, now, lastActivityAt } = args;
  const rawElapsed = Math.max(0, now - startTime);
  let effective = rawElapsed;
  if (lastActivityAt != null && lastActivityAt > startTime) {
    effective = Math.min(rawElapsed, lastActivityAt - startTime + ACTIVITY_GRACE_MS);
  }
  return Math.min(effective, MAX_SESSION_MS);
}

export function computeSessionTimestamps(args: {
  startTime: number;
  now: Date;
  sessionDate?: string | null;
  /** Wallclock ms of the most recently completed set, if any. Lets an
   *  abandoned session end shortly after real activity stopped rather
   *  than at `now`. */
  lastActivityAt?: number | null;
}): { startedAt: Date; endedAt: Date; backfilled: boolean } {
  const { startTime, now, sessionDate, lastActivityAt } = args;
  const durationMs = cappedSessionDurationMs({
    startTime,
    now: now.getTime(),
    lastActivityAt,
  });
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  if (sessionDate) {
    const parsed = new Date(`${sessionDate}T00:00:00`);
    if (isNaN(parsed.getTime())) {
      console.warn(
        `[sessionDate] ignoring malformed value: ${JSON.stringify(sessionDate)}`
      );
    } else if (parsed.getTime() < todayMidnight.getTime()) {
      const startedAt = new Date(parsed);
      startedAt.setHours(12, 0, 0, 0);
      const endedAt = new Date(startedAt.getTime() + durationMs);
      return { startedAt, endedAt, backfilled: true };
    }
    // Future or today: fall through to live timestamps.
  }

  const startedAt = new Date(startTime);
  const endedAt = new Date(startTime + durationMs);
  return { startedAt, endedAt, backfilled: false };
}
