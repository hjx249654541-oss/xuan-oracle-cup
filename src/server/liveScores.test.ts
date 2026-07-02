import { describe, expect, it } from "vitest";
import { seedMatches } from "./seed";
import { refreshMatchesFromEspn } from "./liveScores";

describe("refreshMatchesFromEspn", () => {
  it("merges completed ESPN scoreboard results into seeded matches", async () => {
    const fetcher = async () =>
      new Response(
        JSON.stringify({
          events: [
            {
              id: "760458",
              competitions: [
                {
                  status: { type: { completed: true, shortDetail: "FT" } },
                  competitors: [
                    { homeAway: "home", score: "0", team: { displayName: "England" } },
                    { homeAway: "away", score: "0", team: { displayName: "Ghana" } }
                  ]
                }
              ]
            },
            {
              id: "760460",
              competitions: [
                {
                  status: { type: { completed: true, shortDetail: "FT" } },
                  competitors: [
                    { homeAway: "home", score: "0", team: { displayName: "Panama" } },
                    { homeAway: "away", score: "1", team: { displayName: "Croatia" } }
                  ]
                }
              ]
            }
          ]
        })
      );

    const matches = await refreshMatchesFromEspn(seedMatches(), fetcher);
    const england = matches.find((match) => match.id === "2026-06-23-eng-gha");
    const panama = matches.find((match) => match.id === "2026-06-23-pan-cro");

    expect(england?.result).toMatchObject({ home: 0, away: 0, status: "finished" });
    expect(panama?.result).toMatchObject({ home: 0, away: 1, status: "finished" });
    expect(england?.sourceAudit.source_name).toContain("ESPN scoreboard");
  });

  it("merges in-progress scores without treating scheduled 0-0 games as live", async () => {
    const fetcher = async () =>
      new Response(
        JSON.stringify({
          events: [
            {
              id: "760471",
              competitions: [
                {
                  status: { type: { completed: false, state: "in", shortDetail: "58'" } },
                  competitors: [
                    { homeAway: "home", score: "2", team: { displayName: "Japan" } },
                    { homeAway: "away", score: "1", team: { displayName: "Sweden" } }
                  ]
                }
              ]
            },
            {
              id: "760462",
              competitions: [
                {
                  status: { type: { completed: false, state: "pre", shortDetail: "Scheduled" } },
                  competitors: [
                    { homeAway: "home", score: "0", team: { displayName: "Morocco" } },
                    { homeAway: "away", score: "0", team: { displayName: "Haiti" } }
                  ]
                }
              ]
            }
          ]
        })
      );

    const matches = await refreshMatchesFromEspn(seedMatches(), fetcher);
    const japan = matches.find((match) => match.id === "2026-06-25-jpn-swe");
    const morocco = matches.find((match) => match.id === "2026-06-24-mar-hai");

    expect(japan?.result).toMatchObject({ home: 2, away: 1, status: "live", minute: "58'" });
    expect(japan?.result?.source).toContain("ESPN live scoreboard");
    expect(morocco?.result).toBeUndefined();
  });

  it("falls back to seeded matches when ESPN is too slow", async () => {
    const fetcher = () => new Promise<Response>(() => {});
    const startedAt = Date.now();

    const matches = await refreshMatchesFromEspn(seedMatches(), fetcher);

    expect(Date.now() - startedAt).toBeLessThan(1600);
    expect(matches.find((match) => match.id === "2026-06-24-mar-hai")?.result).toBeUndefined();
  });

  it("adds ESPN fixtures that are not in the seeded schedule", async () => {
    const fetcher = async (input: string) => {
      if (!input.includes("20260704")) {
        return new Response(JSON.stringify({ events: [] }));
      }

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
    };

    const matches = await refreshMatchesFromEspn(seedMatches(), fetcher, new Date("2026-07-01T00:00:00.000Z"));
    const added = matches.find((match) => match.id === "espn-760777");

    expect(added).toMatchObject({
      id: "espn-760777",
      date: "2026-07-04",
      localTime: "14:00",
      group: "ESPN赛程",
      phase: "淘汰赛",
      home: "法国",
      away: "挪威",
      venue: "Lincoln Financial Field",
      city: "费城",
      country: "美国",
      lastUpdated: "2026-07-01"
    });
    expect(added?.result).toBeUndefined();
    expect(added?.sourceAudit.provider).toBe("espn-scoreboard");
  });

  it("localizes ESPN placeholder winners for future knockout fixtures", async () => {
    const fetcher = async () =>
      new Response(
        JSON.stringify({
          events: [
            {
              id: "760503",
              date: "2026-07-04T21:00Z",
              competitions: [
                {
                  venue: { fullName: "MetLife Stadium", address: { city: "East Rutherford, New Jersey" } },
                  status: { type: { completed: false, state: "pre", shortDetail: "Scheduled" } },
                  competitors: [
                    { homeAway: "home", score: "0", team: { displayName: "Paraguay" } },
                    { homeAway: "away", score: "0", team: { displayName: "Round of 32 5 Winner" } }
                  ]
                }
              ]
            }
          ]
        })
      );

    const matches = await refreshMatchesFromEspn(seedMatches(), fetcher, new Date("2026-07-01T00:00:00.000Z"));
    const added = matches.find((match) => match.id === "espn-760503");

    expect(added?.home).toBe("巴拉圭");
    expect(added?.away).toBe("32强第5场胜者");
  });

  it("does not append stale ESPN fixtures outside the rolling update window", async () => {
    const fetcher = async () =>
      new Response(
        JSON.stringify({
          events: [
            {
              id: "760111",
              date: "2026-06-20T18:00Z",
              competitions: [
                {
                  venue: { fullName: "Old Stadium", address: { city: "Houston, Texas" } },
                  status: { type: { completed: true, state: "post", shortDetail: "FT" } },
                  competitors: [
                    { homeAway: "home", score: "1", team: { displayName: "France" } },
                    { homeAway: "away", score: "0", team: { displayName: "Norway" } }
                  ]
                }
              ]
            }
          ]
        })
      );

    const matches = await refreshMatchesFromEspn(seedMatches(), fetcher, new Date("2026-07-01T00:00:00.000Z"));

    expect(matches.find((match) => match.id === "espn-760111")).toBeUndefined();
  });

  it("only requests the rolling ESPN update window", async () => {
    const requestedDates: string[] = [];
    const fetcher = async (input: string) => {
      const date = new URL(input).searchParams.get("dates");
      if (date) {
        requestedDates.push(date);
      }
      return new Response(JSON.stringify({ events: [] }));
    };

    await refreshMatchesFromEspn(seedMatches(), fetcher, new Date("2026-07-02T00:00:00.000Z"));

    expect(requestedDates).toContain("20260702");
    expect(requestedDates).toContain("20260716");
    expect(requestedDates).not.toContain("20260623");
    expect(requestedDates.length).toBeLessThanOrEqual(18);
  });
});
