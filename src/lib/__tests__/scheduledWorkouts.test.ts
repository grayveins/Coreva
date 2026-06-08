import {
  collectUpcomingFromSchedule,
  isoDate,
  type ScheduledMap,
  type WorkoutLite,
} from "../scheduledWorkouts";

const FROM = new Date(2026, 5, 8); // Mon Jun 8 2026, local midnight

const fullBody: WorkoutLite = {
  id: "w1",
  day_number: 1,
  name: "Full Body",
  exercises: [],
};

/** Build a ScheduledMap from {offsetDays → source} entries relative to FROM. */
function mapOf(entries: { offset: number; source: "phase_workout" | "rest"; wid?: string }[]): ScheduledMap {
  const m: ScheduledMap = new Map();
  for (const e of entries) {
    const d = new Date(FROM.getFullYear(), FROM.getMonth(), FROM.getDate() + e.offset);
    const iso = isoDate(d);
    m.set(iso, {
      id: `s-${e.offset}`,
      scheduled_date: iso,
      source_type: e.source,
      phase_workout_id: e.source === "phase_workout" ? (e.wid ?? "w1") : null,
    } as any);
  }
  return m;
}

const byId = new Map<string, WorkoutLite>([["w1", fullBody]]);

describe("collectUpcomingFromSchedule", () => {
  test("returns every-other-day sessions in chronological order", () => {
    const scheduledByDate = mapOf([
      { offset: 0, source: "phase_workout" },
      { offset: 2, source: "phase_workout" },
      { offset: 4, source: "phase_workout" },
    ]);
    const out = collectUpcomingFromSchedule({ from: FROM, days: 14, scheduledByDate, workoutsById: byId });
    expect(out.map((s) => s.iso)).toEqual(["2026-06-08", "2026-06-10", "2026-06-12"]);
    expect(out.every((s) => s.workout.name === "Full Body")).toBe(true);
  });

  test("skips rest days and unscheduled dates", () => {
    const scheduledByDate = mapOf([
      { offset: 0, source: "phase_workout" },
      { offset: 1, source: "rest" },
      { offset: 3, source: "phase_workout" },
    ]);
    const out = collectUpcomingFromSchedule({ from: FROM, days: 14, scheduledByDate, workoutsById: byId });
    expect(out.map((s) => s.iso)).toEqual(["2026-06-08", "2026-06-11"]);
  });

  test("respects the max cap", () => {
    const scheduledByDate = mapOf(
      Array.from({ length: 10 }, (_, i) => ({ offset: i * 2, source: "phase_workout" as const })),
    );
    const out = collectUpcomingFromSchedule({ from: FROM, days: 60, scheduledByDate, workoutsById: byId, max: 3 });
    expect(out).toHaveLength(3);
  });

  test("drops rows whose phase_workout is missing from the index", () => {
    const scheduledByDate = mapOf([{ offset: 0, source: "phase_workout", wid: "ghost" }]);
    const out = collectUpcomingFromSchedule({ from: FROM, days: 14, scheduledByDate, workoutsById: byId });
    expect(out).toHaveLength(0);
  });

  test("empty when no scheduled rows", () => {
    const out = collectUpcomingFromSchedule({ from: FROM, days: 14, scheduledByDate: new Map(), workoutsById: byId });
    expect(out).toHaveLength(0);
  });
});
