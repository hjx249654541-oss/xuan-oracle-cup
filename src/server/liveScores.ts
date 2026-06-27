import type { MatchDTO } from "./types";

type ScoreboardFetcher = (input: string, init?: RequestInit) => Promise<Response>;

type EspnEvent = {
  id?: string;
  competitions?: Array<{
    status?: {
      type?: {
        completed?: boolean;
        state?: string;
        detail?: string;
        shortDetail?: string;
      };
    };
    competitors?: Array<{
      homeAway?: "home" | "away";
      score?: string;
      team?: {
        displayName?: string;
        shortDisplayName?: string;
        abbreviation?: string;
      };
    }>;
  }>;
};

type EventCacheEntry = {
  expiresAt: number;
  promise: Promise<EspnEvent[]>;
};

const liveScoreCache = new Map<string, EventCacheEntry>();
const liveScoreCacheTtlMs = 30_000;
const liveScoreFetchTimeoutMs = 1_200;

const teamAliases: Record<string, string[]> = {
  葡萄牙: ["Portugal", "POR"],
  乌兹别克斯坦: ["Uzbekistan", "UZB"],
  英格兰: ["England", "ENG"],
  加纳: ["Ghana", "GHA"],
  巴拿马: ["Panama", "PAN"],
  克罗地亚: ["Croatia", "CRO"],
  哥伦比亚: ["Colombia", "COL"],
  刚果民主共和国: ["Congo DR", "Congo", "COD"],
  摩洛哥: ["Morocco", "MAR"],
  海地: ["Haiti", "HAI"],
  美国: ["United States", "USA", "USMNT"],
  土耳其: ["Türkiye", "Turkey", "TUR"],
  日本: ["Japan", "JPN"],
  瑞典: ["Sweden", "SWE"],
  约旦: ["Jordan", "JOR"],
  阿根廷: ["Argentina", "ARG"]
};

export async function refreshMatchesFromEspn(matches: MatchDTO[], fetcher: ScoreboardFetcher = fetch): Promise<MatchDTO[]> {
  const byDate = Array.from(new Set(matches.map((match) => match.date)));
  const events = (await Promise.all(byDate.map((date) => fetchCachedEspnDate(date, fetcher)))).flat();

  return matches.map((match) => {
    const event = events.find((candidate) => eventMatches(candidate, match));
    const competition = event?.competitions?.[0];
    const statusType = competition?.status?.type;
    if (!event || !statusType || statusType.state === "pre") {
      return match;
    }

    const home = competition.competitors?.find((competitor) => competitor.homeAway === "home");
    const away = competition.competitors?.find((competitor) => competitor.homeAway === "away");
    const homeScore = Number(home?.score);
    const awayScore = Number(away?.score);
    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) {
      return match;
    }

    return {
      ...match,
      lastUpdated: new Date().toISOString().slice(0, 10),
      result: {
        home: homeScore,
        away: awayScore,
        status: statusType.completed ? "finished" : "live",
        minute: statusType.shortDetail ?? statusType.detail,
        source: `${statusType.completed ? "ESPN scoreboard API" : "ESPN live scoreboard"} · gameId ${event.id ?? "unknown"}`
      },
      sourceAudit: {
        source_name: `${match.sourceAudit.source_name} / ESPN scoreboard`,
        source_url: event.id ? `https://www.espn.com/soccer/match/_/gameId/${event.id}` : match.sourceAudit.source_url,
        provider: "espn-scoreboard",
        fetched_at: new Date().toISOString(),
        market_type: "score-result",
        match_id: match.id,
        raw_snapshot_hash: shortHash(JSON.stringify(event))
      }
    };
  });
}

function fetchCachedEspnDate(date: string, fetcher: ScoreboardFetcher) {
  if (fetcher !== fetch) {
    return fetchEspnDate(date, fetcher);
  }

  const now = Date.now();
  const cached = liveScoreCache.get(date);
  if (cached && cached.expiresAt > now) {
    return cached.promise;
  }

  const promise = fetchEspnDate(date, fetcher);
  liveScoreCache.set(date, { expiresAt: now + liveScoreCacheTtlMs, promise });
  return promise;
}

async function fetchEspnDate(date: string, fetcher: ScoreboardFetcher) {
  const compact = date.replaceAll("-", "");
  try {
    const response = await fetchWithTimeout(
      fetcher,
      `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${compact}`,
      liveScoreFetchTimeoutMs
    );
    if (!response.ok) {
      return [];
    }
    const body = (await response.json()) as { events?: EspnEvent[] };
    return body.events ?? [];
  } catch {
    return [];
  }
}

async function fetchWithTimeout(fetcher: ScoreboardFetcher, url: string, timeoutMs: number) {
  const timeoutResponse = new Promise<Response>((resolve) => {
    setTimeout(() => resolve(new Response(null, { status: 504 })), timeoutMs);
  });
  return Promise.race([fetcher(url), timeoutResponse]);
}

function eventMatches(event: EspnEvent, match: MatchDTO) {
  const competition = event.competitions?.[0];
  const home = competition?.competitors?.find((competitor) => competitor.homeAway === "home");
  const away = competition?.competitors?.find((competitor) => competitor.homeAway === "away");
  return teamMatches(match.home, home) && teamMatches(match.away, away);
}

function teamMatches(team: string, competitor: EspnEvent["competitions"][number]["competitors"][number] | undefined) {
  const aliases = teamAliases[team] ?? [team];
  const values = [competitor?.team?.displayName, competitor?.team?.shortDisplayName, competitor?.team?.abbreviation].filter(Boolean).map(normalizeTeam);
  return aliases.map(normalizeTeam).some((alias) => values.includes(alias));
}

function normalizeTeam(value: string | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function shortHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(16).padStart(8, "0").slice(0, 8);
}
