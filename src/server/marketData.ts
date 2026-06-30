import type { MarketSnapshotDTO } from "./types";
import type { MatchDTO } from "./types";

type Fetcher = (input: string) => Promise<Response>;

type OddsApiIoEvent = {
  id?: number | string;
  home?: string;
  away?: string;
  date?: string;
  status?: string;
};

type OddsApiIoEventOdds = OddsApiIoEvent & {
  bookmakers?: Record<
    string,
    Array<{
      name?: string;
      updatedAt?: string;
      odds?: Array<{
        home?: string;
        draw?: string;
        away?: string;
        hdp?: number | string;
        over?: string;
        under?: string;
      }>;
    }>
  >;
};

type OddsApiEvent = {
  home_team?: string;
  away_team?: string;
  commence_time?: string;
  bookmakers?: Array<{
    title?: string;
    last_update?: string;
    markets?: Array<{
      key?: string;
      outcomes?: Array<{
        name?: string;
        price?: number;
        point?: number;
      }>;
    }>;
  }>;
};

const oddsApiSportKey = "soccer_fifa_world_cup";
const sourceUrl = "https://the-odds-api.com/";
const oddsApiIoSourceUrl = "https://odds-api.io/";
const oddsApiIoBookmakers = ["Bet365", "Unibet"];
const teamAliases: Record<string, string[]> = {
  葡萄牙: ["Portugal"],
  乌兹别克斯坦: ["Uzbekistan"],
  英格兰: ["England"],
  加纳: ["Ghana"],
  巴拿马: ["Panama"],
  克罗地亚: ["Croatia"],
  哥伦比亚: ["Colombia"],
  刚果民主共和国: ["Congo DR", "Congo", "DR Congo"],
  摩洛哥: ["Morocco"],
  海地: ["Haiti"],
  美国: ["United States", "USA"],
  土耳其: ["Turkey", "Türkiye"],
  日本: ["Japan"],
  瑞典: ["Sweden"],
  约旦: ["Jordan"],
  阿根廷: ["Argentina"],
  南非: ["South Africa"],
  加拿大: ["Canada"],
  巴西: ["Brazil"],
  德国: ["Germany"],
  巴拉圭: ["Paraguay"],
  荷兰: ["Netherlands"],
  科特迪瓦: ["Ivory Coast", "Cote d'Ivoire"],
  挪威: ["Norway"],
  法国: ["France"],
  墨西哥: ["Mexico"],
  厄瓜多尔: ["Ecuador"],
  比利时: ["Belgium"],
  塞内加尔: ["Senegal"],
  波黑: ["Bosnia-Herzegovina", "Bosnia and Herzegovina"],
  西班牙: ["Spain"],
  奥地利: ["Austria"],
  瑞士: ["Switzerland"],
  阿尔及利亚: ["Algeria"],
  澳大利亚: ["Australia"],
  埃及: ["Egypt"],
  佛得角: ["Cape Verde"]
};

export async function fetchOddsApiIoMarketSnapshot(
  match: MatchDTO,
  apiKey: string,
  nowIso: string,
  fetcher: Fetcher = fetch
): Promise<MarketSnapshotDTO | undefined> {
  if (!apiKey) {
    return undefined;
  }

  const event = await findOddsApiIoEvent(match, apiKey, fetcher);
  if (!event?.id) {
    return undefined;
  }

  const oddsUrl = new URL("https://api.odds-api.io/v3/odds");
  oddsUrl.searchParams.set("apiKey", apiKey);
  oddsUrl.searchParams.set("eventId", event.id.toString());
  oddsUrl.searchParams.set("bookmakers", oddsApiIoBookmakers.join(","));

  const response = await fetcher(oddsUrl.toString());
  if (!response.ok) {
    return undefined;
  }

  const eventOdds = (await response.json()) as OddsApiIoEventOdds;
  const selected = selectOddsApiIoBookmaker(eventOdds.bookmakers);
  if (!selected?.moneyline) {
    return undefined;
  }

  return {
    matchId: match.id,
    home: selected.moneyline.home ?? "待定",
    draw: selected.moneyline.draw ?? "待定",
    away: selected.moneyline.away ?? "待定",
    totalLine: selected.totals?.hdp?.toString() ?? "待定",
    over: selected.totals?.over ?? "待定",
    under: selected.totals?.under ?? "待定",
    provider: "odds-api-io",
    sourceName: `Odds-API.io · ${selected.bookmaker}`,
    sourceUrl: oddsApiIoSourceUrl,
    fetchedAt: latestIso([selected.moneylineUpdatedAt, selected.totalsUpdatedAt]) ?? nowIso,
    locked: false
  };
}

export function createDemoMarketSnapshot(matchId: string, nowIso: string): MarketSnapshotDTO {
  const seed = shortHash(`${matchId}:${nowIso.slice(0, 10)}`);
  const home = seed % 2 === 0 ? "-150" : "+135";
  const draw = "+285";
  const away = seed % 2 === 0 ? "+390" : "+175";

  return {
    matchId,
    home,
    draw,
    away,
    totalLine: seed % 3 === 0 ? "3.5" : "2.5",
    over: seed % 2 === 0 ? "+105" : "-110",
    under: seed % 2 === 0 ? "-125" : "-105",
    provider: "demo-market-data",
    sourceName: "玄球 Oracle 数据演示源",
    sourceUrl: "",
    fetchedAt: nowIso,
    locked: false
  };
}

export async function fetchTheOddsApiMarketSnapshot(
  match: MatchDTO,
  apiKey: string,
  nowIso: string,
  fetcher: Fetcher = fetch
): Promise<MarketSnapshotDTO | undefined> {
  if (!apiKey) {
    return undefined;
  }

  const url = new URL(`https://api.the-odds-api.com/v4/sports/${oddsApiSportKey}/odds/`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", "us,uk,eu");
  url.searchParams.set("markets", "h2h,totals");
  url.searchParams.set("oddsFormat", "american");

  const response = await fetcher(url.toString());
  if (!response.ok) {
    return undefined;
  }

  const events = (await response.json()) as OddsApiEvent[];
  const event = events.find((item) => teamMatches(match.home, item.home_team) && teamMatches(match.away, item.away_team));
  const bookmaker = event?.bookmakers?.find((item) => item.markets?.some((market) => market.key === "h2h"));
  if (!event || !bookmaker) {
    return undefined;
  }

  const h2h = bookmaker.markets?.find((market) => market.key === "h2h");
  const totals = bookmaker.markets?.find((market) => market.key === "totals");
  const home = h2h?.outcomes?.find((outcome) => teamMatches(match.home, outcome.name));
  const away = h2h?.outcomes?.find((outcome) => teamMatches(match.away, outcome.name));
  const draw = h2h?.outcomes?.find((outcome) => normalizeName(outcome.name) === "draw");
  const over = totals?.outcomes?.find((outcome) => normalizeName(outcome.name) === "over");
  const under = totals?.outcomes?.find((outcome) => normalizeName(outcome.name) === "under");

  if (!home || !away || !draw) {
    return undefined;
  }

  return {
    matchId: match.id,
    home: formatAmerican(home.price),
    draw: formatAmerican(draw.price),
    away: formatAmerican(away.price),
    totalLine: over?.point?.toString() ?? under?.point?.toString() ?? "待定",
    over: formatAmerican(over?.price),
    under: formatAmerican(under?.price),
    provider: "the-odds-api",
    sourceName: `The Odds API · ${bookmaker.title ?? "bookmaker"}`,
    sourceUrl,
    fetchedAt: bookmaker.last_update ?? nowIso,
    locked: false
  };
}

async function findOddsApiIoEvent(match: MatchDTO, apiKey: string, fetcher: Fetcher) {
  const matchKickoff = getMatchKickoffUtc(match);
  const from = new Date(matchKickoff.getTime() - 36 * 60 * 60 * 1000).toISOString();
  const to = new Date(matchKickoff.getTime() + 36 * 60 * 60 * 1000).toISOString();
  const url = new URL("https://api.odds-api.io/v3/events");
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("sport", "football");
  url.searchParams.set("status", "pending,live");
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("limit", "500");

  const response = await fetcher(url.toString());
  if (!response.ok) {
    return undefined;
  }

  const events = (await response.json()) as OddsApiIoEvent[];
  return events.find((item) => teamMatches(match.home, item.home) && teamMatches(match.away, item.away));
}

function selectOddsApiIoBookmaker(bookmakers: OddsApiIoEventOdds["bookmakers"]) {
  if (!bookmakers) {
    return undefined;
  }

  for (const bookmaker of oddsApiIoBookmakers) {
    const markets = bookmakers[bookmaker];
    const moneylineMarket = markets?.find((market) => normalizeMarketName(market.name) === "ml");
    const totalsMarket = markets?.find((market) => normalizeMarketName(market.name) === "totals");
    const moneyline = moneylineMarket?.odds?.[0];
    if (moneyline?.home && moneyline.draw && moneyline.away) {
      return {
        bookmaker,
        moneyline,
        moneylineUpdatedAt: moneylineMarket.updatedAt,
        totals: totalsMarket?.odds?.find((item) => item.over && item.under),
        totalsUpdatedAt: totalsMarket?.updatedAt
      };
    }
  }

  return undefined;
}

function teamMatches(team: string, value: string | undefined) {
  const aliases = teamAliases[team] ?? [team];
  const normalized = normalizeName(value);
  return aliases.map(normalizeName).some((alias) => alias === normalized);
}

function normalizeName(value: string | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeMarketName(value: string | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function formatAmerican(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "待定";
  }
  return value > 0 ? `+${value}` : `${value}`;
}

function shortHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function getMatchKickoffUtc(match: MatchDTO) {
  const timeZone = match.country === "美国" ? "America/New_York" : "America/Toronto";
  const localIso = `${match.date}T${match.localTime}:00`;
  const asUtc = new Date(`${localIso}Z`);
  const offsetHours = timeZone === "America/New_York" ? 4 : 4;
  return new Date(asUtc.getTime() + offsetHours * 60 * 60 * 1000);
}

function latestIso(values: Array<string | undefined>) {
  const valid = values.filter((value): value is string => Boolean(value));
  if (valid.length === 0) {
    return undefined;
  }
  return valid.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
}
