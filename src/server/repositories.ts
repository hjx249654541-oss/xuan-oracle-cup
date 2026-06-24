import { seedMatches } from "./seed";
import type { MatchDTO } from "./types";

const matches = seedMatches();
const usage = new Map<string, number>();

export function listMatches(): MatchDTO[] {
  return matches;
}

export function findMatch(matchId: string): MatchDTO | undefined {
  return matches.find((match) => match.id === matchId);
}

export function getUsage(visitorId: string, usageDate: string) {
  return usage.get(`${visitorId}:${usageDate}`) ?? 0;
}

export function incrementUsage(visitorId: string, usageDate: string) {
  const key = `${visitorId}:${usageDate}`;
  usage.set(key, (usage.get(key) ?? 0) + 1);
}

export function hasActiveEntitlement(visitorId: string, nowIso: string) {
  return visitorId.startsWith("pro-") && nowIso.length > 0;
}
