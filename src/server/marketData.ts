import type { MarketSnapshotDTO } from "./types";
import type { MatchDTO } from "./types";

type Fetcher = (input: string) => Promise<Response>;

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
  阿根廷: ["Argentina"]
};

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

function teamMatches(team: string, value: string | undefined) {
  const aliases = teamAliases[team] ?? [team];
  const normalized = normalizeName(value);
  return aliases.map(normalizeName).some((alias) => alias === normalized);
}

function normalizeName(value: string | undefined) {
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
