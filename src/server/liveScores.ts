import type { MatchDTO } from "./types";

type ScoreboardFetcher = (input: string, init?: RequestInit) => Promise<Response>;

type EspnEvent = {
  id?: string;
  date?: string;
  competitions?: Array<{
    venue?: {
      fullName?: string;
      address?: {
        city?: string;
      };
    };
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
const rollingPastDays = 3;
const rollingFutureDays = 14;

export function clearLiveScoreCacheForTests() {
  liveScoreCache.clear();
}

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
  阿根廷: ["Argentina", "ARG"],
  南非: ["South Africa", "RSA"],
  加拿大: ["Canada", "CAN"],
  巴西: ["Brazil", "BRA"],
  德国: ["Germany", "GER"],
  巴拉圭: ["Paraguay", "PAR"],
  荷兰: ["Netherlands", "NED"],
  科特迪瓦: ["Ivory Coast", "Côte d'Ivoire", "CIV"],
  挪威: ["Norway", "NOR"],
  法国: ["France", "FRA"],
  墨西哥: ["Mexico", "MEX"],
  厄瓜多尔: ["Ecuador", "ECU"],
  比利时: ["Belgium", "BEL"],
  塞内加尔: ["Senegal", "SEN"],
  波黑: ["Bosnia-Herzegovina", "Bosnia and Herzegovina", "BIH"],
  西班牙: ["Spain", "ESP"],
  奥地利: ["Austria", "AUT"],
  瑞士: ["Switzerland", "SUI"],
  阿尔及利亚: ["Algeria", "ALG"],
  澳大利亚: ["Australia", "AUS"],
  埃及: ["Egypt", "EGY"],
  佛得角: ["Cape Verde", "CPV"]
};

const englishToChineseTeam: Record<string, string> = {
  southafrica: "南非",
  canada: "加拿大",
  brazil: "巴西",
  germany: "德国",
  paraguay: "巴拉圭",
  netherlands: "荷兰",
  ivorycoast: "科特迪瓦",
  cotedivoire: "科特迪瓦",
  norway: "挪威",
  france: "法国",
  mexico: "墨西哥",
  ecuador: "厄瓜多尔",
  england: "英格兰",
  congodr: "刚果民主共和国",
  belgium: "比利时",
  senegal: "塞内加尔",
  unitedstates: "美国",
  usa: "美国",
  bosniaherzegovina: "波黑",
  bosniaandherzegovina: "波黑",
  spain: "西班牙",
  austria: "奥地利",
  portugal: "葡萄牙",
  croatia: "克罗地亚",
  switzerland: "瑞士",
  algeria: "阿尔及利亚",
  australia: "澳大利亚",
  egypt: "埃及",
  argentina: "阿根廷",
  capeverde: "佛得角",
  colombia: "哥伦比亚",
  ghana: "加纳",
  panama: "巴拿马",
  uzbekistan: "乌兹别克斯坦",
  turkey: "土耳其",
  turkiye: "土耳其",
  jordan: "约旦",
  qatar: "卡塔尔",
  scotland: "苏格兰",
  czechia: "捷克",
  southkorea: "韩国",
  japan: "日本",
  sweden: "瑞典",
  morocco: "摩洛哥",
  haiti: "海地"
};

const venueCityProfiles: Record<string, { city: string; country: string; utcOffset: number }> = {
  inglewoodcalifornia: { city: "英格尔伍德", country: "美国", utcOffset: -7 },
  houstontexas: { city: "休斯敦", country: "美国", utcOffset: -5 },
  foxboroughmassachusetts: { city: "福克斯伯勒", country: "美国", utcOffset: -4 },
  guadalupe: { city: "瓜达卢佩", country: "墨西哥", utcOffset: -6 },
  arlingtontexas: { city: "阿灵顿", country: "美国", utcOffset: -5 },
  eastrutherfordnewjersey: { city: "东卢瑟福", country: "美国", utcOffset: -4 },
  mexicocity: { city: "墨西哥城", country: "墨西哥", utcOffset: -6 },
  atlantageorgia: { city: "亚特兰大", country: "美国", utcOffset: -4 },
  seattlewashington: { city: "西雅图", country: "美国", utcOffset: -7 },
  santaclaracalifornia: { city: "圣克拉拉", country: "美国", utcOffset: -7 },
  toronto: { city: "多伦多", country: "加拿大", utcOffset: -4 },
  vancouver: { city: "温哥华", country: "加拿大", utcOffset: -7 },
  miamigardensflorida: { city: "迈阿密花园", country: "美国", utcOffset: -4 },
  kansascitymissouri: { city: "堪萨斯城", country: "美国", utcOffset: -5 },
  philadelphiapennsylvania: { city: "费城", country: "美国", utcOffset: -4 }
};

export async function refreshMatchesFromEspn(matches: MatchDTO[], fetcher: ScoreboardFetcher = fetch, now = new Date()): Promise<MatchDTO[]> {
  const byDate = buildRefreshDates(matches, now);
  const events = (await Promise.all(byDate.map((date) => fetchCachedEspnDate(date, fetcher)))).flat();

  const refreshedMatches = matches.map((match) => {
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

  const knownIds = new Set(refreshedMatches.map((match) => match.id));
  const additionWindow = buildRollingWindow(now);
  const additions = events
    .filter((event) => eventIsInsideWindow(event, additionWindow))
    .filter((event) => !refreshedMatches.some((match) => eventMatches(event, match)))
    .map((event) => espnEventToMatch(event, now))
    .filter((match): match is MatchDTO => Boolean(match) && !knownIds.has(match.id));

  return [...refreshedMatches, ...additions].sort(compareMatches);
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

function buildRefreshDates(matches: MatchDTO[], now: Date) {
  const dates = new Set(matches.map((match) => match.date));
  const window = buildRollingWindow(now);
  for (let time = window.start; time <= window.end; time += 24 * 60 * 60 * 1000) {
    dates.add(new Date(time).toISOString().slice(0, 10));
  }
  return Array.from(dates).sort();
}

function buildRollingWindow(now: Date) {
  const dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return {
    start: dayStart - rollingPastDays * 24 * 60 * 60 * 1000,
    end: dayStart + (rollingFutureDays + 1) * 24 * 60 * 60 * 1000 - 1
  };
}

function eventIsInsideWindow(event: EspnEvent, window: { start: number; end: number }) {
  const time = event.date ? new Date(event.date).getTime() : Number.NaN;
  return Number.isFinite(time) && time >= window.start && time <= window.end;
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

function espnEventToMatch(event: EspnEvent, now: Date): MatchDTO | undefined {
  const competition = event.competitions?.[0];
  const home = competition?.competitors?.find((competitor) => competitor.homeAway === "home");
  const away = competition?.competitors?.find((competitor) => competitor.homeAway === "away");
  if (!event.id || !event.date || !home?.team?.displayName || !away?.team?.displayName) {
    return undefined;
  }

  const kickoff = new Date(event.date);
  if (!Number.isFinite(kickoff.getTime())) {
    return undefined;
  }

  const cityProfile = resolveVenueCity(competition?.venue?.address?.city);
  const local = formatVenueLocal(kickoff, cityProfile.utcOffset);
  const homeName = translateTeam(home.team.displayName);
  const awayName = translateTeam(away.team.displayName);
  const sourceAudit = {
    source_name: "ESPN scoreboard API",
    source_url: `https://www.espn.com/soccer/match/_/gameId/${event.id}`,
    provider: "espn-scoreboard",
    fetched_at: now.toISOString(),
    market_type: "schedule-result",
    match_id: `espn-${event.id}`,
    raw_snapshot_hash: shortHash(JSON.stringify(event))
  };

  const match: MatchDTO = {
    id: `espn-${event.id}`,
    date: local.date,
    localTime: local.time,
    group: "ESPN赛程",
    phase: "淘汰赛",
    home: homeName,
    away: awayName,
    venue: competition?.venue?.fullName ?? "ESPN Venue",
    city: cityProfile.city,
    country: cityProfile.country,
    lastUpdated: now.toISOString().slice(0, 10),
    sourceAudit
  };

  const statusType = competition?.status?.type;
  if (statusType && statusType.state !== "pre") {
    const homeScore = Number(home.score);
    const awayScore = Number(away.score);
    if (Number.isFinite(homeScore) && Number.isFinite(awayScore)) {
      match.result = {
        home: homeScore,
        away: awayScore,
        status: statusType.completed ? "finished" : "live",
        minute: statusType.shortDetail ?? statusType.detail,
        source: `${statusType.completed ? "ESPN scoreboard API" : "ESPN live scoreboard"} · gameId ${event.id}`
      };
      match.sourceAudit = { ...sourceAudit, market_type: "score-result" };
    }
  }

  return match;
}

function teamMatches(team: string, competitor: EspnEvent["competitions"][number]["competitors"][number] | undefined) {
  const aliases = teamAliases[team] ?? [team];
  const values = [competitor?.team?.displayName, competitor?.team?.shortDisplayName, competitor?.team?.abbreviation].filter(Boolean).map(normalizeTeam);
  return aliases.map(normalizeTeam).some((alias) => values.includes(alias));
}

function normalizeTeam(value: string | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function translateTeam(value: string) {
  const placeholder = translatePlaceholderTeam(value);
  if (placeholder) {
    return placeholder;
  }
  return englishToChineseTeam[normalizeTeam(value)] ?? value;
}

function translatePlaceholderTeam(value: string) {
  const roundOf32 = value.match(/^Round of 32 (\d+) Winner$/i);
  if (roundOf32) {
    return `32强第${roundOf32[1]}场胜者`;
  }
  const roundOf16 = value.match(/^Round of 16 (\d+) Winner$/i);
  if (roundOf16) {
    return `16强第${roundOf16[1]}场胜者`;
  }
  const quarterfinal = value.match(/^Quarterfinal (\d+) Winner$/i);
  if (quarterfinal) {
    return `1/4决赛第${quarterfinal[1]}场胜者`;
  }
  const semifinal = value.match(/^Semifinal (\d+) Winner$/i);
  if (semifinal) {
    return `半决赛第${semifinal[1]}场胜者`;
  }
  return undefined;
}

function resolveVenueCity(value: string | undefined) {
  return venueCityProfiles[normalizeTeam(value)] ?? { city: value?.split(",")[0] ?? "待定城市", country: "待定", utcOffset: -5 };
}

function formatVenueLocal(kickoff: Date, utcOffset: number) {
  const local = new Date(kickoff.getTime() + utcOffset * 60 * 60 * 1000);
  return {
    date: local.toISOString().slice(0, 10),
    time: local.toISOString().slice(11, 16)
  };
}

function compareMatches(left: MatchDTO, right: MatchDTO) {
  return `${left.date}T${left.localTime}`.localeCompare(`${right.date}T${right.localTime}`);
}

function shortHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(16).padStart(8, "0").slice(0, 8);
}
