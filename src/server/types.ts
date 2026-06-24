import type { MatchPhase, MatchStatus } from "../data/schedule";

export type SourceAuditDTO = {
  source_name: string;
  source_url: string;
  provider: string;
  fetched_at: string;
  market_type: string;
  match_id: string;
  raw_snapshot_hash: string;
};

export type MatchResultDTO = {
  home: number;
  away: number;
  status: MatchStatus;
  minute?: string;
  source: string;
};

export type MarketSnapshotDTO = {
  matchId: string;
  home: string;
  draw: string;
  away: string;
  totalLine: string;
  over: string;
  under: string;
  provider: string;
  sourceName: string;
  sourceUrl: string;
  fetchedAt: string;
  locked: boolean;
};

export type MatchDTO = {
  id: string;
  date: string;
  localTime: string;
  group: string;
  phase: MatchPhase;
  home: string;
  away: string;
  venue: string;
  city: string;
  country: string;
  lastUpdated: string;
  result?: MatchResultDTO;
  odds?: MarketSnapshotDTO;
  sourceAudit: SourceAuditDTO;
};

export type SeedMatch = MatchDTO;
