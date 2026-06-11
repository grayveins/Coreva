import {
  buildEveryOtherDaySchedule,
  buildWeeklySchedule,
  nextWeekdayOnOrAfter,
} from "../scheduling";

describe("buildEveryOtherDaySchedule", () => {
  it("lands sessions on day 0, 2, 4, … from the start date", () => {
    const slots = buildEveryOtherDaySchedule("2026-06-01", 4, [1]);
    expect(slots.map((s) => s.scheduled_date)).toEqual([
      "2026-06-01",
      "2026-06-03",
      "2026-06-05",
      "2026-06-07",
    ]);
  });

  it("repeats a single workout day_number", () => {
    const slots = buildEveryOtherDaySchedule("2026-06-01", 3, [1]);
    expect(slots.every((s) => s.day_number === 1)).toBe(true);
  });

  it("rotates through multiple workout day_numbers", () => {
    const slots = buildEveryOtherDaySchedule("2026-06-01", 5, [1, 2]);
    expect(slots.map((s) => s.day_number)).toEqual([1, 2, 1, 2, 1]);
  });

  it("crosses month boundaries correctly", () => {
    const slots = buildEveryOtherDaySchedule("2026-06-29", 3, [1]);
    expect(slots.map((s) => s.scheduled_date)).toEqual([
      "2026-06-29",
      "2026-07-01",
      "2026-07-03",
    ]);
  });

  it("returns [] for degenerate input", () => {
    expect(buildEveryOtherDaySchedule("2026-06-01", 0, [1])).toEqual([]);
    expect(buildEveryOtherDaySchedule("2026-06-01", 4, [])).toEqual([]);
  });
});

describe("buildWeeklySchedule", () => {
  it("places PPL on Mon/Wed/Fri for 2 weeks, in chronological order", () => {
    // 2026-06-01 is a Monday.
    const slots = buildWeeklySchedule("2026-06-01", 2, [
      { weekday: 1, day_number: 1 }, // Mon → workout 1
      { weekday: 3, day_number: 2 }, // Wed → workout 2
      { weekday: 5, day_number: 3 }, // Fri → workout 3
    ]);
    expect(slots.map((s) => s.scheduled_date)).toEqual([
      "2026-06-01",
      "2026-06-03",
      "2026-06-05",
      "2026-06-08",
      "2026-06-10",
      "2026-06-12",
    ]);
    expect(slots.map((s) => s.day_number)).toEqual([1, 2, 3, 1, 2, 3]);
  });

  it("handles a start date mid-week (first occurrence is forward-looking)", () => {
    // 2026-06-03 is a Wednesday; a Monday assignment should land on the 8th.
    const slots = buildWeeklySchedule("2026-06-03", 1, [{ weekday: 1, day_number: 1 }]);
    expect(slots[0].scheduled_date).toBe("2026-06-08");
  });

  it("returns [] for degenerate input", () => {
    expect(buildWeeklySchedule("2026-06-01", 0, [{ weekday: 1, day_number: 1 }])).toEqual([]);
    expect(buildWeeklySchedule("2026-06-01", 2, [])).toEqual([]);
  });
});

describe("nextWeekdayOnOrAfter", () => {
  it("returns the same day when it already matches", () => {
    // 2026-06-01 is a Monday (getDay() === 1).
    expect(nextWeekdayOnOrAfter(new Date(2026, 5, 1), 1)).toBe("2026-06-01");
  });

  it("returns the next matching weekday otherwise", () => {
    // From Monday the 1st, next Friday (5) is the 5th.
    expect(nextWeekdayOnOrAfter(new Date(2026, 5, 1), 5)).toBe("2026-06-05");
  });
});
