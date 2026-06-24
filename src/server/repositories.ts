import { seedMatches } from "./seed";
import type { MatchDTO } from "./types";

type D1Binding = unknown;

export type Repository = {
  listMatches(): MatchDTO[];
  findMatch(matchId: string): MatchDTO | undefined;
  getUsage(visitorId: string, usageDate: string): number;
  incrementUsage(visitorId: string, usageDate: string): void;
  hasActiveEntitlement(visitorId: string, nowIso: string): boolean;
};

const seededMatches = seedMatches();
const memoryUsage = new Map<string, number>();

export function createRepository(_db?: D1Binding): Repository {
  return {
    listMatches: () => seededMatches,
    findMatch: (matchId) => seededMatches.find((match) => match.id === matchId),
    getUsage: (visitorId, usageDate) => memoryUsage.get(`${visitorId}:${usageDate}`) ?? 0,
    incrementUsage: (visitorId, usageDate) => {
      const key = `${visitorId}:${usageDate}`;
      memoryUsage.set(key, (memoryUsage.get(key) ?? 0) + 1);
    },
    hasActiveEntitlement: (visitorId, nowIso) => visitorId.startsWith("pro-") && nowIso.length > 0
  };
}
