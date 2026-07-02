import { describe, expect, it } from "vitest";
import { getChinaTodayDateKey, getDefaultScheduleDate, getDefaultSelectedMatchId } from "./scheduleView";
import type { WorldCupMatch } from "../data/schedule";

const baseMatch: WorldCupMatch = {
  id: "base",
  date: "2026-06-30",
  localTime: "12:00",
  group: "32强",
  phase: "淘汰赛",
  home: "科特迪瓦",
  away: "挪威",
  venue: "AT&T Stadium",
  city: "阿灵顿",
  country: "美国",
  source: "test",
  lastUpdated: "2026-07-02"
};

describe("schedule view defaults", () => {
  it("selects today's China match date when it exists", () => {
    const matches: WorldCupMatch[] = [
      baseMatch,
      { ...baseMatch, id: "today", date: "2026-07-01", localTime: "17:00", home: "美国", away: "波黑", city: "圣克拉拉" }
    ];

    expect(getDefaultScheduleDate(matches, "2026-07-02")).toBe("2026-07-02");
    expect(getDefaultSelectedMatchId(matches, "2026-07-02")).toBe("today");
  });

  it("selects the next available date when today has no match", () => {
    const matches: WorldCupMatch[] = [
      baseMatch,
      { ...baseMatch, id: "future", date: "2026-07-03", localTime: "13:00", home: "澳大利亚", away: "埃及" }
    ];

    expect(getDefaultScheduleDate(matches, "2026-07-02")).toBe("2026-07-04");
    expect(getDefaultSelectedMatchId(matches, "2026-07-04")).toBe("future");
  });

  it("uses China time for today's schedule key", () => {
    expect(getChinaTodayDateKey(new Date("2026-07-01T18:30:00.000Z"))).toBe("2026-07-02");
  });
});
