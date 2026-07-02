import { afterEach, describe, expect, it, vi } from "vitest";
import { loadMarketData, loadMatches } from "./apiClient";

describe("apiClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads matches from the backend", async () => {
    const fetcher = async () =>
      new Response(JSON.stringify({ matches: [{ id: "m1", sourceAudit: { source_name: "FIFA" } }] })) as Response;

    const matches = await loadMatches(fetcher);
    expect(matches[0].id).toBe("m1");
  });

  it("uses the Worker API from GitHub Pages mirrors", async () => {
    vi.stubGlobal("window", { location: { hostname: "hjx249654541-oss.github.io" } });
    let requestedUrl = "";
    const fetcher = async (input: RequestInfo | URL) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ matches: [{ id: "m1" }] })) as Response;
    };

    await loadMatches(fetcher as typeof fetch);

    expect(requestedUrl).toBe("https://xuan-oracle-cup.hjx249654541.workers.dev/api/matches");
  });

  it("surfaces Pro lock messages for market data", async () => {
    const fetcher = async () =>
      new Response(JSON.stringify({ error: "pro-required", message: "今日免费次数已用完" }), { status: 402 }) as Response;

    await expect(loadMarketData("m1", "visitor-a", fetcher)).rejects.toThrow("今日免费次数已用完");
  });
});
