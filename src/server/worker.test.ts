import { describe, expect, it } from "vitest";
import worker from "./worker";

describe("worker API", () => {
  it("returns matches with source metadata", async () => {
    const response = await worker.fetch(new Request("https://example.com/api/matches"));
    const body = (await response.json()) as { matches: Array<{ id: string; sourceAudit: { source_name: string } }> };

    expect(response.status).toBe(200);
    expect(body.matches.length).toBeGreaterThan(0);
    expect(body.matches[0].sourceAudit.source_name.length).toBeGreaterThan(0);
  });

  it("serves matches from edge cache when available", async () => {
    const cachedMatch = {
      id: "cached-match",
      date: "2026-06-27",
      localTime: "12:00",
      group: "缓存",
      phase: "小组赛",
      home: "缓存主队",
      away: "缓存客队",
      venue: "Cache Stadium",
      city: "缓存城",
      country: "缓存国",
      lastUpdated: "2026-06-27",
      sourceAudit: { source_name: "edge-cache" }
    };
    const response = await worker.fetch(new Request("https://example.com/api/matches"), {
      MARKET_CACHE: {
        get: async () => JSON.stringify([cachedMatch]),
        put: async () => undefined
      }
    });
    const body = (await response.json()) as { matches: Array<{ id: string; sourceAudit: { source_name: string } }> };

    expect(response.status).toBe(200);
    expect(body.matches).toEqual([cachedMatch]);
  });

  it("returns one free market-data view and then locks the second view", async () => {
    const first = await worker.fetch(
      new Request("https://example.com/api/matches/2026-06-23-por-uzb/odds", {
        headers: { "x-visitor-id": "visitor-a" }
      })
    );
    const second = await worker.fetch(
      new Request("https://example.com/api/matches/2026-06-23-por-uzb/odds", {
        headers: { "x-visitor-id": "visitor-a" }
      })
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(402);
    expect(await second.json()).toEqual({
      error: "pro-required",
      message: "今日免费次数已用完，开通赛事数据 Pro 后可继续查看实时数据、赔率变化和市场热度。"
    });
  });

  it("returns deterministic predictions", async () => {
    const left = await worker.fetch(new Request("https://example.com/api/predictions/2026-06-23-por-uzb?methods=ai,qimen,tarot"));
    const right = await worker.fetch(new Request("https://example.com/api/predictions/2026-06-23-por-uzb?methods=ai,qimen,tarot"));

    expect(await left.json()).toEqual(await right.json());
  });

  it("delegates non-api requests to static assets when available", async () => {
    const response = await worker.fetch(new Request("https://example.com/"), {
      ASSETS: {
        fetch: async () => new Response("<!doctype html>", { headers: { "content-type": "text/html" } })
      }
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("<!doctype html>");
  });
});
