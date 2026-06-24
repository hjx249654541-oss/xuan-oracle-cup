import { describe, expect, it } from "vitest";
import { createDemoMarketSnapshot } from "./marketData";

describe("createDemoMarketSnapshot", () => {
  it("creates sourced market data without betting links", () => {
    const snapshot = createDemoMarketSnapshot("2026-06-23-por-uzb", "2026-06-24T12:00:00.000Z");

    expect(snapshot.matchId).toBe("2026-06-23-por-uzb");
    expect(snapshot.provider).toBe("demo-market-data");
    expect(snapshot.sourceName).toBe("玄球 Oracle 数据演示源");
    expect(snapshot.sourceUrl).toBe("");
    expect(JSON.stringify(snapshot)).not.toMatch(/bet|下注|投注/i);
  });
});
