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
});
