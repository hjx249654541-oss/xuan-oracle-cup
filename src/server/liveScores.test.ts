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
});
