import { describe, expect, it } from "vitest";
import { seedMatches } from "./seed";
import { createDemoMarketSnapshot, fetchOddsApiIoMarketSnapshot, fetchTheOddsApiMarketSnapshot } from "./marketData";

describe("createDemoMarketSnapshot", () => {
  it("creates sourced market data without betting links", () => {
    const snapshot = createDemoMarketSnapshot("2026-06-23-por-uzb", "2026-06-24T12:00:00.000Z");

    expect(snapshot.matchId).toBe("2026-06-23-por-uzb");
    expect(snapshot.provider).toBe("demo-market-data");
    expect(snapshot.sourceName).toBe("玄球 Oracle 数据演示源");
    expect(snapshot.sourceUrl).toBe("");
    expect(JSON.stringify(snapshot)).not.toMatch(/bet|下注|投注/i);
  });

  it("maps The Odds API h2h and totals markets into a sourced snapshot", async () => {
    const match = seedMatches().find((item) => item.id === "2026-06-27-eng-pan");
    const fetcher = async () =>
      new Response(
        JSON.stringify([
          {
            home_team: "England",
            away_team: "Panama",
            commence_time: "2026-06-27T23:00:00Z",
            bookmakers: [
              {
                title: "DraftKings",
                last_update: "2026-06-28T00:00:00Z",
                markets: [
                  {
                    key: "h2h",
                    outcomes: [
                      { name: "England", price: -250 },
                      { name: "Draw", price: 330 },
                      { name: "Panama", price: 700 }
                    ]
                  },
                  {
                    key: "totals",
                    outcomes: [
                      { name: "Over", point: 2.5, price: -110 },
                      { name: "Under", point: 2.5, price: -105 }
                    ]
                  }
                ]
              }
            ]
          }
        ])
      );

    const snapshot = await fetchTheOddsApiMarketSnapshot(match!, "api-key", "2026-06-28T00:01:00.000Z", fetcher);

    expect(snapshot).toMatchObject({
      matchId: "2026-06-27-eng-pan",
      home: "-250",
      draw: "+330",
      away: "+700",
      totalLine: "2.5",
      over: "-110",
      under: "-105",
      provider: "the-odds-api",
      sourceName: "The Odds API · DraftKings",
      sourceUrl: "https://the-odds-api.com/",
      fetchedAt: "2026-06-28T00:00:00Z",
      locked: false
    });
  });

  it("maps Odds-API.io events and odds into a sourced snapshot", async () => {
    const match = seedMatches().find((item) => item.id === "2026-06-24-mar-hai");
    const requestedUrls: string[] = [];
    const fetcher = async (input: string) => {
      requestedUrls.push(input);
      if (input.includes("/events?")) {
        return new Response(
          JSON.stringify([
            {
              id: 9912,
              home: "Morocco",
              away: "Haiti",
              date: "2026-06-24T22:00:00Z",
              status: "pending",
              sport: { name: "Football", slug: "football" },
              league: { name: "World Cup", slug: "world-cup" }
            }
          ])
        );
      }
      return new Response(
        JSON.stringify({
          id: 9912,
          home: "Morocco",
          away: "Haiti",
          date: "2026-06-24T22:00:00Z",
          status: "pending",
          bookmakers: {
            Bet365: [
              {
                name: "ML",
                updatedAt: "2026-06-24T21:58:00Z",
                odds: [{ home: "1.44", draw: "4.50", away: "7.25" }]
              },
              {
                name: "Totals",
                updatedAt: "2026-06-24T21:59:00Z",
                odds: [{ hdp: 2.5, over: "1.92", under: "1.88" }]
              }
            ]
          }
        })
      );
    };

    const snapshot = await fetchOddsApiIoMarketSnapshot(match!, "api-key", "2026-06-24T22:01:00.000Z", fetcher);

    expect(snapshot).toMatchObject({
      matchId: "2026-06-24-mar-hai",
      home: "1.44",
      draw: "4.50",
      away: "7.25",
      totalLine: "2.5",
      over: "1.92",
      under: "1.88",
      provider: "odds-api-io",
      sourceName: "Odds-API.io · Bet365",
      sourceUrl: "https://odds-api.io/",
      fetchedAt: "2026-06-24T21:59:00Z",
      locked: false
    });
    expect(requestedUrls[0]).toContain("/events?");
    expect(requestedUrls[1]).toContain("/odds?");
  });
});
