import { afterEach, describe, expect, it, vi } from "vitest";
import { clearLiveScoreCacheForTests } from "./liveScores";
import worker from "./worker";

describe("worker API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearLiveScoreCacheForTests();
  });

  it("returns matches with source metadata", async () => {
    const response = await worker.fetch(new Request("https://example.com/api/matches"));
    const body = (await response.json()) as { matches: Array<{ id: string; sourceAudit: { source_name: string } }> };

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(body.matches.length).toBeGreaterThan(0);
    expect(body.matches[0].sourceAudit.source_name.length).toBeGreaterThan(0);
  });

  it("handles CORS preflight for mirrored frontend API calls", async () => {
    const response = await worker.fetch(
      new Request("https://example.com/api/matches/2026-06-23-por-uzb/odds", {
        method: "OPTIONS",
        headers: {
          origin: "https://hjx249654541-oss.github.io",
          "access-control-request-method": "GET",
          "access-control-request-headers": "x-visitor-id"
        }
      })
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-headers")).toContain("x-visitor-id");
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

  it("allows two free market-data views per match and then locks the third view", async () => {
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
    const third = await worker.fetch(
      new Request("https://example.com/api/matches/2026-06-23-por-uzb/odds", {
        headers: { "x-visitor-id": "visitor-a" }
      })
    );
    const otherMatch = await worker.fetch(
      new Request("https://example.com/api/matches/2026-06-23-eng-gha/odds", {
        headers: { "x-visitor-id": "visitor-a" }
      })
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(402);
    expect(otherMatch.status).toBe(200);
    expect(await third.json()).toEqual({
      error: "pro-required",
      message: "本场免费查看次数已用完，开通赛事数据 Pro 后可继续查看实时数据、赔率变化和市场热度。"
    });
  });

  it("uses Odds-API.io as a second live market source when configured", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input.includes("api.odds-api.io/v3/events")) {
          return new Response(
            JSON.stringify([
              {
                id: 9912,
                home: "Portugal",
                away: "Uzbekistan",
                date: "2026-06-23T16:00:00Z",
                status: "pending"
              }
            ])
          );
        }
        return new Response(
          JSON.stringify({
            id: 9912,
            bookmakers: {
              Bet365: [
                { name: "ML", updatedAt: "2026-06-23T15:55:00Z", odds: [{ home: "1.62", draw: "3.80", away: "5.20" }] },
                { name: "Totals", updatedAt: "2026-06-23T15:56:00Z", odds: [{ hdp: 2.5, over: "1.91", under: "1.91" }] }
              ]
            }
          })
        );
      })
    );

    const response = await worker.fetch(
      new Request("https://example.com/api/matches/2026-06-23-por-uzb/odds", {
        headers: { "x-visitor-id": "visitor-b" }
      }),
      {
        ODDS_API_IO_KEY: "odds-api-io-key"
      }
    );
    const body = (await response.json()) as { market: { provider: string; sourceName: string; home: string } };

    expect(response.status).toBe(200);
    expect(body.market).toMatchObject({
      provider: "odds-api-io",
      sourceName: "Odds-API.io · Bet365",
      home: "1.62"
    });
  });

  it("serves odds fallback for ESPN-discovered fixtures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        return new Response(
          JSON.stringify({
            events: [
              {
                id: "760777",
                date: "2026-07-04T18:00Z",
                competitions: [
                  {
                    venue: { fullName: "Lincoln Financial Field", address: { city: "Philadelphia, Pennsylvania" } },
                    status: { type: { completed: false, state: "pre", shortDetail: "Scheduled" } },
                    competitors: [
                      { homeAway: "home", score: "0", team: { displayName: "France" } },
                      { homeAway: "away", score: "0", team: { displayName: "Norway" } }
                    ]
                  }
                ]
              }
            ]
          })
        );
      })
    );

    const response = await worker.fetch(
      new Request("https://example.com/api/matches/espn-760777/odds", {
        headers: { "x-visitor-id": "visitor-dynamic" }
      })
    );
    const body = (await response.json()) as { market?: { matchId: string; provider: string } };

    expect(response.status).toBe(200);
    expect(body.market).toMatchObject({ matchId: "espn-760777", provider: "demo-market-data" });
  });

  it("returns deterministic predictions", async () => {
    const left = await worker.fetch(new Request("https://example.com/api/predictions/2026-06-23-por-uzb?methods=ai,qimen,tarot"));
    const right = await worker.fetch(new Request("https://example.com/api/predictions/2026-06-23-por-uzb?methods=ai,qimen,tarot"));

    expect(await left.json()).toEqual(await right.json());
  });

  it("serves html assets without browser or CDN caching", async () => {
    const response = await worker.fetch(new Request("https://example.com/"), {
      ASSETS: {
        fetch: async () => new Response("<!doctype html>", { headers: { "content-type": "text/html" } })
      }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, no-cache, must-revalidate, max-age=0");
    expect(await response.text()).toContain("<!doctype html>");
  });

  it("serves html asset headers for preflight-style HEAD requests", async () => {
    const response = await worker.fetch(new Request("https://example.com/", { method: "HEAD" }), {
      ASSETS: {
        fetch: async () => new Response(null, { headers: { "content-type": "text/html" } })
      }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, no-cache, must-revalidate, max-age=0");
  });

  it("keeps normal cache headers for fingerprinted static assets", async () => {
    const response = await worker.fetch(new Request("https://example.com/assets/index.js"), {
      ASSETS: {
        fetch: async () => new Response("console.log('ok')", { headers: { "content-type": "application/javascript", "cache-control": "public, max-age=31536000" } })
      }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000");
    expect(await response.text()).toContain("ok");
  });
});
