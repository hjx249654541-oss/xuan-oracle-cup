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
});
