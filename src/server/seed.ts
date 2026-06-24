import { worldCupMatches } from "../data/schedule";
import type { MarketSnapshotDTO, SeedMatch, SourceAuditDTO } from "./types";

export function seedMatches(): SeedMatch[] {
  return worldCupMatches.map((match) => {
    const sourceAudit: SourceAuditDTO = {
      source_name: match.source,
      source_url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026",
      provider: "manual-seed",
      fetched_at: `${match.lastUpdated}T00:00:00.000Z`,
      market_type: "schedule-result",
      match_id: match.id,
      raw_snapshot_hash: shortHash(JSON.stringify(match))
    };

    const odds: MarketSnapshotDTO | undefined = match.odds
      ? {
          matchId: match.id,
          home: match.odds.home,
          draw: match.odds.draw,
          away: match.odds.away,
          totalLine: match.odds.totalLine,
          over: match.odds.over,
          under: match.odds.under,
          provider: "manual-seed",
          sourceName: match.odds.bookmaker,
          sourceUrl: "",
          fetchedAt: match.odds.updatedAt,
          locked: match.odds.locked
        }
      : undefined;

    return {
      ...match,
      odds,
      sourceAudit
    };
  });
}

function shortHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(16).padStart(8, "0").slice(0, 8);
}
