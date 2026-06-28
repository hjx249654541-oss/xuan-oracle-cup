import { seedMatches } from "./seed";
import type { MatchDTO } from "./types";

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
};

type D1Binding = {
  prepare(sql: string): D1PreparedStatement;
};

export type Repository = {
  listMatches(): MatchDTO[];
  findMatch(matchId: string): MatchDTO | undefined;
  getUsage(visitorId: string, usageDate: string): Promise<number>;
  incrementUsage(visitorId: string, usageDate: string): Promise<void>;
  hasActiveEntitlement(visitorId: string, nowIso: string): Promise<boolean>;
};

const seededMatches = seedMatches();
const memoryUsage = new Map<string, number>();

export function createRepository(db?: D1Binding): Repository {
  return {
    listMatches: () => seededMatches,
    findMatch: (matchId) => seededMatches.find((match) => match.id === matchId),
    getUsage: async (visitorId, usageDate) => {
      if (db) {
        const row = await db
          .prepare("SELECT market_views FROM daily_usage WHERE visitor_id = ? AND usage_date = ?")
          .bind(visitorId, usageDate)
          .first<{ market_views: number }>();
        return row?.market_views ?? 0;
      }
      return memoryUsage.get(`${visitorId}:${usageDate}`) ?? 0;
    },
    incrementUsage: async (visitorId, usageDate) => {
      if (db) {
        await db
          .prepare(
            "INSERT INTO daily_usage (visitor_id, usage_date, market_views) VALUES (?, ?, 1) ON CONFLICT(visitor_id, usage_date) DO UPDATE SET market_views = market_views + 1"
          )
          .bind(visitorId, usageDate)
          .run();
        return;
      }
      const key = `${visitorId}:${usageDate}`;
      memoryUsage.set(key, (memoryUsage.get(key) ?? 0) + 1);
    },
    hasActiveEntitlement: async (visitorId, nowIso) => {
      if (db) {
        const row = await db
          .prepare("SELECT visitor_id FROM entitlements WHERE visitor_id = ? AND expires_at > ?")
          .bind(visitorId, nowIso)
          .first<{ visitor_id: string }>();
        return Boolean(row);
      }
      return visitorId.startsWith("pro-") && nowIso.length > 0;
    }
  };
}
