import {
  computeSessionTimestamps,
  cappedSessionDurationMs,
  MAX_SESSION_MS,
  ACTIVITY_GRACE_MS,
} from "../sessionDate";

const NOW = new Date("2026-05-05T15:00:00").getTime();
const FIVE_MIN_AGO = NOW - 5 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const args = (overrides: Partial<Parameters<typeof computeSessionTimestamps>[0]> = {}) => ({
  startTime: FIVE_MIN_AGO,
  now: new Date(NOW),
  ...overrides,
});

describe("computeSessionTimestamps", () => {
  test("no sessionDate → live timestamps, not backfilled", () => {
    const r = computeSessionTimestamps(args());
    expect(r.backfilled).toBe(false);
    expect(r.startedAt.getTime()).toBe(FIVE_MIN_AGO);
    expect(r.endedAt.getTime()).toBe(NOW);
  });

  test("today's date → live timestamps (no backfill)", () => {
    const r = computeSessionTimestamps(args({ sessionDate: "2026-05-05" }));
    expect(r.backfilled).toBe(false);
    expect(r.startedAt.getTime()).toBe(FIVE_MIN_AGO);
  });

  test("future date → live timestamps (no backfill)", () => {
    const r = computeSessionTimestamps(args({ sessionDate: "2026-05-10" }));
    expect(r.backfilled).toBe(false);
    expect(r.startedAt.getTime()).toBe(FIVE_MIN_AGO);
  });

  test("past date → started_at is noon of that day, ended_at preserves elapsed", () => {
    const r = computeSessionTimestamps(args({ sessionDate: "2026-05-04" }));
    expect(r.backfilled).toBe(true);
    expect(r.startedAt.getFullYear()).toBe(2026);
    expect(r.startedAt.getMonth()).toBe(4); // May
    expect(r.startedAt.getDate()).toBe(4);
    expect(r.startedAt.getHours()).toBe(12);
    expect(r.startedAt.getMinutes()).toBe(0);
    // ended_at = startedAt + 5 min
    expect(r.endedAt.getTime() - r.startedAt.getTime()).toBe(5 * 60 * 1000);
  });

  test("malformed sessionDate → warns and falls back to live timestamps", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const r = computeSessionTimestamps(args({ sessionDate: "not-a-date" }));
    expect(r.backfilled).toBe(false);
    expect(r.startedAt.getTime()).toBe(FIVE_MIN_AGO);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("malformed"));
    warn.mockRestore();
  });

  test("clock skew (now < startTime) doesn't produce negative elapsed", () => {
    const r = computeSessionTimestamps({
      startTime: NOW + 1000,
      now: new Date(NOW),
      sessionDate: "2026-05-04",
    });
    expect(r.backfilled).toBe(true);
    expect(r.endedAt.getTime()).toBeGreaterThanOrEqual(r.startedAt.getTime());
  });

  test("session left open for days caps to MAX_SESSION_MS (live)", () => {
    const threeDaysAgo = NOW - 3 * 24 * HOUR;
    const r = computeSessionTimestamps({ startTime: threeDaysAgo, now: new Date(NOW) });
    expect(r.backfilled).toBe(false);
    expect(r.endedAt.getTime() - r.startedAt.getTime()).toBe(MAX_SESSION_MS);
  });

  test("session left open for days caps to MAX_SESSION_MS (backfill)", () => {
    const threeDaysAgo = NOW - 3 * 24 * HOUR;
    const r = computeSessionTimestamps({
      startTime: threeDaysAgo,
      now: new Date(NOW),
      sessionDate: "2026-05-04",
    });
    expect(r.backfilled).toBe(true);
    expect(r.endedAt.getTime() - r.startedAt.getTime()).toBe(MAX_SESSION_MS);
  });

  test("lastActivityAt ends the session shortly after the final set", () => {
    // Started 3 days ago, last set logged 50 min in, then left open.
    const start = NOW - 3 * 24 * HOUR;
    const lastSet = start + 50 * 60 * 1000;
    const r = computeSessionTimestamps({
      startTime: start,
      now: new Date(NOW),
      lastActivityAt: lastSet,
    });
    expect(r.endedAt.getTime() - r.startedAt.getTime()).toBe(
      50 * 60 * 1000 + ACTIVITY_GRACE_MS
    );
  });
});

describe("cappedSessionDurationMs", () => {
  test("short session is uncapped", () => {
    expect(cappedSessionDurationMs({ startTime: 0, now: 30 * 60 * 1000 })).toBe(
      30 * 60 * 1000
    );
  });

  test("hard ceiling applies without activity data", () => {
    expect(cappedSessionDurationMs({ startTime: 0, now: 10 * HOUR })).toBe(
      MAX_SESSION_MS
    );
  });

  test("activity window beats raw elapsed", () => {
    expect(
      cappedSessionDurationMs({ startTime: 0, now: 10 * HOUR, lastActivityAt: 40 * 60 * 1000 })
    ).toBe(40 * 60 * 1000 + ACTIVITY_GRACE_MS);
  });

  test("never negative on clock skew", () => {
    expect(cappedSessionDurationMs({ startTime: 1000, now: 0 })).toBe(0);
  });
});
