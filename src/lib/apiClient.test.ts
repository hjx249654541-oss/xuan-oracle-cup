import { describe, expect, it } from "vitest";
import { loadMarketData, loadMatches } from "./apiClient";

describe("apiClient", () => {
  it("loads matches from the backend", async () => {
    const fetcher = async () =>
      new Response(JSON.stringify({ matches: [{ id: "m1", sourceAudit: { source_name: "FIFA" } }] })) as Response;

    const matches = await loadMatches(fetcher);
    expect(matches[0].id).toBe("m1");
  });

  it("surfaces Pro lock messages for market data", async () => {
    const fetcher = async () =>
      new Response(JSON.stringify({ error: "pro-required", message: "今日免费次数已用完" }), { status: 402 }) as Response;

    await expect(loadMarketData("m1", "visitor-a", fetcher)).rejects.toThrow("今日免费次数已用完");
  });
});
