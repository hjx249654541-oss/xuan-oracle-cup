import { buildAccuracy } from "../lib/accuracy";
import { buildPrediction, predictionMethods, type MethodId } from "../lib/prediction";
import { resolveAccess, usageDateFromIso } from "./access";
import { refreshMatchesFromEspn } from "./liveScores";
import { createDemoMarketSnapshot, fetchOddsApiIoMarketSnapshot, fetchTheOddsApiMarketSnapshot } from "./marketData";
import { createRepository } from "./repositories";
import type { MarketSnapshotDTO, MatchDTO } from "./types";

type Env = {
  DB?: unknown;
  THE_ODDS_API_KEY?: string;
  ODDS_API_IO_KEY?: string;
  MARKET_CACHE?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  };
  ASSETS?: {
    fetch(request: Request): Promise<Response>;
  };
};

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const matchCacheKey = "scoreboard:matches:v3";
const matchCacheTtlSeconds = 30;
const edgeCacheSeconds = 30;
const marketCacheTtlSeconds = 300;
const freeViewsPerMatch = 2;

const worker = {
  async fetch(request: Request, env?: Env): Promise<Response> {
    const repository = createRepository(env?.DB);
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/matches") {
      return cachedJson(request, url, async () => ({ matches: await listMatchesWithLiveScores(repository, env) }));
    }

    const oddsMatch = url.pathname.match(/^\/api\/matches\/([^/]+)\/odds$/);
    if (request.method === "GET" && oddsMatch) {
      const matchId = oddsMatch[1];
      const match = await findMatch(repository, matchId, env);
      if (!match) {
        return json({ error: "not-found" }, 404);
      }

      const visitorId = request.headers.get("x-visitor-id") || "anonymous";
      const usageVisitorId = `${visitorId}:match:${matchId}`;
      const nowIso = new Date().toISOString();
      const usageDate = usageDateFromIso(nowIso);
      const decision = resolveAccess({
        currentViews: await repository.getUsage(usageVisitorId, usageDate),
        hasActiveEntitlement: await repository.hasActiveEntitlement(visitorId, nowIso),
        nowIso,
        freeViewLimit: freeViewsPerMatch
      });

      if (!decision.allowed) {
        return json(
          {
            error: "pro-required",
            message: "本场免费查看次数已用完，开通赛事数据 Pro 后可继续查看实时数据、赔率变化和市场热度。"
          },
          402
        );
      }

      if (decision.shouldIncrementUsage) {
        await repository.incrementUsage(usageVisitorId, usageDate);
      }

      const market = await resolveMarketSnapshot(match, nowIso, env);
      return json({
        access: decision.reason,
        market,
        disclaimer: "本站仅提供体育赛事数据、赔率变化展示与娱乐分析，不提供下注、代投、返奖、奖金池或博彩服务，不构成投注、投资或财务建议。请遵守所在地法律法规。"
      });
    }

    const predictionMatch = url.pathname.match(/^\/api\/predictions\/([^/]+)$/);
    if (request.method === "GET" && predictionMatch) {
      const match = await findMatch(repository, predictionMatch[1], env);
      if (!match) {
        return json({ error: "not-found" }, 404);
      }
      const methods = parseMethods(url.searchParams.get("methods"));
      return json({ prediction: buildPrediction(match, methods) });
    }

    if (request.method === "GET" && url.pathname === "/api/accuracy") {
      return cachedJson(request, url, async () => {
        const matches = await listMatchesWithLiveScores(repository, env);
        return { accuracy: buildAccuracy(matches) };
      });
    }

    if (env?.ASSETS && request.method === "GET" && !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    return json({ error: "not-found" }, 404);
  }
};

async function listMatchesWithLiveScores(repository: ReturnType<typeof createRepository>, env?: Env) {
  const cached = await env?.MARKET_CACHE?.get(matchCacheKey).catch(() => null);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // Ignore malformed edge cache and rebuild below.
    }
  }

  const matches = await refreshMatchesFromEspn(repository.listMatches());
  await env?.MARKET_CACHE?.put(matchCacheKey, JSON.stringify(matches), { expirationTtl: matchCacheTtlSeconds }).catch(() => undefined);
  return matches;
}

async function findMatch(repository: ReturnType<typeof createRepository>, matchId: string, env?: Env) {
  const seeded = repository.findMatch(matchId);
  if (seeded) {
    return seeded;
  }
  const liveMatches = await listMatchesWithLiveScores(repository, env);
  return liveMatches.find((match) => match.id === matchId);
}

async function resolveMarketSnapshot(match: MatchDTO, nowIso: string, env?: Env): Promise<MarketSnapshotDTO> {
  const cacheKey = `market:${match.id}:multi-source:v1`;
  const cached = await env?.MARKET_CACHE?.get(cacheKey).catch(() => null);
  if (cached) {
    try {
      return JSON.parse(cached) as MarketSnapshotDTO;
    } catch {
      // Ignore malformed market cache and rebuild below.
    }
  }

  const liveMarket = env?.THE_ODDS_API_KEY
    ? await fetchTheOddsApiMarketSnapshot(match, env.THE_ODDS_API_KEY, nowIso).catch(() => undefined)
    : undefined;
  if (liveMarket) {
    await env?.MARKET_CACHE?.put(cacheKey, JSON.stringify(liveMarket), { expirationTtl: marketCacheTtlSeconds }).catch(() => undefined);
    return liveMarket;
  }

  const oddsApiIoMarket = env?.ODDS_API_IO_KEY
    ? await fetchOddsApiIoMarketSnapshot(match, env.ODDS_API_IO_KEY, nowIso).catch(() => undefined)
    : undefined;
  if (oddsApiIoMarket) {
    await env?.MARKET_CACHE?.put(cacheKey, JSON.stringify(oddsApiIoMarket), { expirationTtl: marketCacheTtlSeconds }).catch(() => undefined);
    return oddsApiIoMarket;
  }

  return match.odds ?? createDemoMarketSnapshot(match.id, nowIso);
}

async function cachedJson(request: Request, url: URL, buildBody: () => Promise<unknown>) {
  const edgeCache = typeof caches !== "undefined" ? caches.default : null;
  const cacheKey = new Request(`${url.origin}${url.pathname}`, request);
  const cached = await edgeCache?.match(cacheKey);
  if (cached) {
    return cached;
  }

  const response = json(await buildBody(), 200, {
    "cache-control": `public, max-age=${edgeCacheSeconds}`
  });
  await edgeCache?.put(cacheKey, response.clone()).catch(() => undefined);
  return response;
}

function parseMethods(value: string | null): MethodId[] {
  const allowed = new Set(predictionMethods.map((method) => method.id));
  const parsed = (value ?? "").split(",").filter((item): item is MethodId => allowed.has(item as MethodId));
  return parsed.length > 0 ? parsed.slice(0, 3) : ["ai", "qimen", "tarot"];
}

function json(body: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...jsonHeaders, ...headers } });
}

export default worker;
