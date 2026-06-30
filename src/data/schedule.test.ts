import { describe, expect, it } from "vitest";
import { formatChinaKickoff, formatLocalKickoff, getChinaKickoffDate, worldCupMatches } from "./schedule";

describe("schedule display time zones", () => {
  it("groups Morocco vs Haiti under the China match date while preserving venue local time", () => {
    const match = worldCupMatches.find((item) => item.id === "2026-06-24-mar-hai");

    expect(match).toBeDefined();
    expect(getChinaKickoffDate(match!)).toBe("2026-06-25");
    expect(formatChinaKickoff(match!)).toBe("06/25 06:00");
    expect(formatLocalKickoff(match!)).toBe("06/24 18:00");
  });

  it("contains the real June 30 round of 32 fixtures instead of placeholders", () => {
    const localJune30 = worldCupMatches.filter((item) => item.date === "2026-06-30");

    expect(localJune30.map((item) => `${item.home} vs ${item.away}`)).toEqual([
      "科特迪瓦 vs 挪威",
      "法国 vs 瑞典",
      "墨西哥 vs 厄瓜多尔"
    ]);
    expect(localJune30.every((item) => item.home !== "待定球队" && item.away !== "待定球队")).toBe(true);
    expect(localJune30.every((item) => item.phase === "淘汰赛")).toBe(true);
  });
});
