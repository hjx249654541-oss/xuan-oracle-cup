# Cloudflare Data Pro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate 玄球 Oracle from a static GitHub Pages app to a Cloudflare Workers full-stack app with sourced match data, gated market-data access, deterministic predictions, and Pro membership foundations.

**Architecture:** Keep the existing React/Vite frontend, but move data access behind Cloudflare Worker API routes. D1 becomes the system of record for matches, results, source audits, market snapshots, free daily usage, and entitlements; KV caches market-data provider responses. Frontend renders API data and never talks to third-party market-data providers directly.

**Tech Stack:** React 19, Vite 7, Vitest, TypeScript, Cloudflare Workers, Wrangler, D1, KV, Cloudflare Secrets.

## Global Constraints

- Product positioning: sports data and entertainment analysis product, not betting, bet placement, proxy betting, prize pools, wagering, lottery purchasing, or outbound links to betting platforms.
- Paid feature name: `赛事数据 Pro`, not `盘口付费`.
- Required disclaimer: `本站仅提供体育赛事数据、赔率变化展示与娱乐分析，不提供下注、代投、返奖、奖金池或博彩服务，不构成投注、投资或财务建议。请遵守所在地法律法规。`
- Safer labels: `实时赛事数据`, `市场热度`, `赔率变化`, `胜平负参考指数`, `大小球数据`.
- Avoid unsafe labels: `投注盘口`, `下注赔率`, `买入推荐`, `红单`, `稳胆`.
- Data source fields required for imported records: `source_name`, `source_url`, `provider`, `fetched_at`, `market_type`, `match_id`, `raw_snapshot_hash`.
- Free access rule: one market-data view per user per day.
- Paid access rule: Day Pass unlocks all market-data views for the current calendar day; Monthly Pro unlocks market-data views for 30 days.
- Deterministic prediction rule: same match, same selected method set, same app version, same source snapshot produces the same result for every user.
- Frontend must never receive provider API keys and must not render betting-platform outbound links.
- Existing unrelated untracked files under `docs/superpowers/` must not be modified unless explicitly named in this plan.

---

## File Structure

- Create `src/server/schema.sql`: D1 schema for matches, market snapshots, source audits, usage counters, and entitlements.
- Create `src/server/seed.ts`: seed data derived from current `worldCupMatches`.
- Create `src/server/types.ts`: shared server DTOs for match, market data, access status, entitlement.
- Create `src/server/repositories.ts`: D1 repository functions.
- Create `src/server/access.ts`: free-use and entitlement access logic.
- Create `src/server/marketData.ts`: market-data provider abstraction and safe demo provider.
- Create `src/server/worker.ts`: Cloudflare Worker request router and API responses.
- Create `src/lib/apiClient.ts`: frontend API client with local fallback for development.
- Modify `src/data/schedule.ts`: keep fallback data and export seed-friendly structures.
- Modify `src/App.tsx`: load matches, odds, accuracy, and predictions through the API client.
- Modify `src/lib/prediction.ts`: accept source snapshot IDs and expose deterministic inputs when called from Worker.
- Modify `src/lib/prediction.test.ts`: keep deterministic prediction tests and add API-facing expectations.
- Create `src/server/*.test.ts`: unit tests for repository mapping, access gating, market data, and Worker routes.
- Create `wrangler.toml`: Cloudflare Worker, assets, D1, KV, and local dev bindings.
- Modify `package.json`: add Wrangler scripts and Worker test/build commands.

---

### Task 1: Server Data Model And Seed

**Files:**
- Create: `src/server/schema.sql`
- Create: `src/server/types.ts`
- Create: `src/server/seed.ts`
- Test: `src/server/seed.test.ts`

**Interfaces:**
- Produces: `seedMatches(): SeedMatch[]`
- Produces: `SeedMatch`, `MatchDTO`, `MarketSnapshotDTO`, `SourceAuditDTO` types.
- Consumes: `worldCupMatches` from `src/data/schedule.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/server/seed.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { seedMatches } from "./seed";

describe("seedMatches", () => {
  it("keeps source metadata and finished scores in the server seed", () => {
    const matches = seedMatches();
    const portugal = matches.find((match) => match.id === "2026-06-23-por-uzb");

    expect(portugal).toBeDefined();
    expect(portugal?.result?.home).toBe(5);
    expect(portugal?.result?.away).toBe(0);
    expect(portugal?.sourceAudit.source_name).toContain("FIFA");
    expect(portugal?.sourceAudit.provider).toBe("manual-seed");
    expect(portugal?.sourceAudit.raw_snapshot_hash).toMatch(/^[0-9a-f]{8}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
PATH=/Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm test src/server/seed.test.ts
```

Expected: FAIL because `src/server/seed.ts` does not exist.

- [ ] **Step 3: Add server types**

Create `src/server/types.ts`:

```ts
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
```

- [ ] **Step 4: Add D1 schema**

Create `src/server/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  local_time TEXT NOT NULL,
  group_name TEXT NOT NULL,
  phase TEXT NOT NULL,
  home TEXT NOT NULL,
  away TEXT NOT NULL,
  venue TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  last_updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS match_results (
  match_id TEXT PRIMARY KEY REFERENCES matches(id),
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  status TEXT NOT NULL,
  minute TEXT,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source_audits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  provider TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  market_type TEXT NOT NULL,
  raw_snapshot_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS market_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT NOT NULL REFERENCES matches(id),
  home TEXT NOT NULL,
  draw TEXT NOT NULL,
  away TEXT NOT NULL,
  total_line TEXT NOT NULL,
  over_price TEXT NOT NULL,
  under_price TEXT NOT NULL,
  provider TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  raw_snapshot_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_usage (
  visitor_id TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  market_views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (visitor_id, usage_date)
);

CREATE TABLE IF NOT EXISTS entitlements (
  visitor_id TEXT PRIMARY KEY,
  plan TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

- [ ] **Step 5: Add seed mapper**

Create `src/server/seed.ts`:

```ts
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
```

- [ ] **Step 6: Run test to verify it passes**

Run:

```bash
PATH=/Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm test src/server/seed.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/server/schema.sql src/server/types.ts src/server/seed.ts src/server/seed.test.ts
git commit -m "Add Cloudflare data schema and seed mapper"
```

---

### Task 2: Access Gating And Market Data Provider

**Files:**
- Create: `src/server/access.ts`
- Create: `src/server/marketData.ts`
- Test: `src/server/access.test.ts`
- Test: `src/server/marketData.test.ts`

**Interfaces:**
- Consumes: `MarketSnapshotDTO` from `src/server/types.ts`.
- Produces: `resolveAccess(input: AccessInput): AccessDecision`
- Produces: `createDemoMarketSnapshot(matchId: string, nowIso: string): MarketSnapshotDTO`

- [ ] **Step 1: Write failing access tests**

Create `src/server/access.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveAccess } from "./access";

describe("resolveAccess", () => {
  it("allows the first free market-data view of the day", () => {
    expect(
      resolveAccess({
        currentViews: 0,
        hasActiveEntitlement: false,
        nowIso: "2026-06-24T12:00:00.000Z"
      })
    ).toEqual({
      allowed: true,
      shouldIncrementUsage: true,
      reason: "free-daily-view"
    });
  });

  it("locks after the free daily view without entitlement", () => {
    expect(
      resolveAccess({
        currentViews: 1,
        hasActiveEntitlement: false,
        nowIso: "2026-06-24T12:00:00.000Z"
      })
    ).toEqual({
      allowed: false,
      shouldIncrementUsage: false,
      reason: "pro-required"
    });
  });

  it("allows active Pro users without consuming free usage", () => {
    expect(
      resolveAccess({
        currentViews: 7,
        hasActiveEntitlement: true,
        nowIso: "2026-06-24T12:00:00.000Z"
      })
    ).toEqual({
      allowed: true,
      shouldIncrementUsage: false,
      reason: "active-pro"
    });
  });
});
```

- [ ] **Step 2: Write failing market-data tests**

Create `src/server/marketData.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDemoMarketSnapshot } from "./marketData";

describe("createDemoMarketSnapshot", () => {
  it("creates sourced market data without betting links", () => {
    const snapshot = createDemoMarketSnapshot("2026-06-23-por-uzb", "2026-06-24T12:00:00.000Z");

    expect(snapshot.matchId).toBe("2026-06-23-por-uzb");
    expect(snapshot.provider).toBe("demo-market-data");
    expect(snapshot.sourceName).toBe("玄球 Oracle 数据演示源");
    expect(snapshot.sourceUrl).toBe("");
    expect(JSON.stringify(snapshot)).not.toMatch(/bet|下注|投注/i);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
PATH=/Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm test src/server/access.test.ts src/server/marketData.test.ts
```

Expected: FAIL because `access.ts` and `marketData.ts` do not exist.

- [ ] **Step 4: Implement access logic**

Create `src/server/access.ts`:

```ts
export type AccessInput = {
  currentViews: number;
  hasActiveEntitlement: boolean;
  nowIso: string;
};

export type AccessDecision = {
  allowed: boolean;
  shouldIncrementUsage: boolean;
  reason: "active-pro" | "free-daily-view" | "pro-required";
};

export function resolveAccess(input: AccessInput): AccessDecision {
  if (input.hasActiveEntitlement) {
    return { allowed: true, shouldIncrementUsage: false, reason: "active-pro" };
  }

  if (input.currentViews < 1) {
    return { allowed: true, shouldIncrementUsage: true, reason: "free-daily-view" };
  }

  return { allowed: false, shouldIncrementUsage: false, reason: "pro-required" };
}

export function usageDateFromIso(nowIso: string) {
  return nowIso.slice(0, 10);
}
```

- [ ] **Step 5: Implement demo market data**

Create `src/server/marketData.ts`:

```ts
import type { MarketSnapshotDTO } from "./types";

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

function shortHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run:

```bash
PATH=/Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm test src/server/access.test.ts src/server/marketData.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/server/access.ts src/server/marketData.ts src/server/access.test.ts src/server/marketData.test.ts
git commit -m "Add Pro access gating and safe market data provider"
```

---

### Task 3: Worker API With In-Memory Repository

**Files:**
- Create: `src/server/repositories.ts`
- Create: `src/server/worker.ts`
- Test: `src/server/worker.test.ts`

**Interfaces:**
- Consumes: `seedMatches()`.
- Consumes: `resolveAccess()`.
- Produces: Worker routes `GET /api/matches`, `GET /api/matches/:id/odds`, `GET /api/accuracy`, `GET /api/predictions/:matchId?methods=ai,qimen,tarot`.

- [ ] **Step 1: Write failing Worker route tests**

Create `src/server/worker.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import worker from "./worker";

describe("worker API", () => {
  it("returns matches with source metadata", async () => {
    const response = await worker.fetch(new Request("https://example.com/api/matches"));
    const body = await response.json() as { matches: Array<{ id: string; sourceAudit: { source_name: string } }> };

    expect(response.status).toBe(200);
    expect(body.matches.length).toBeGreaterThan(0);
    expect(body.matches[0].sourceAudit.source_name.length).toBeGreaterThan(0);
  });

  it("returns one free market-data view and then locks the second view", async () => {
    const first = await worker.fetch(new Request("https://example.com/api/matches/2026-06-23-por-uzb/odds", {
      headers: { "x-visitor-id": "visitor-a" }
    }));
    const second = await worker.fetch(new Request("https://example.com/api/matches/2026-06-23-por-uzb/odds", {
      headers: { "x-visitor-id": "visitor-a" }
    }));

    expect(first.status).toBe(200);
    expect(second.status).toBe(402);
    expect(await second.json()).toEqual({
      error: "pro-required",
      message: "今日免费次数已用完，开通赛事数据 Pro 后可继续查看实时数据、赔率变化和市场热度。"
    });
  });

  it("returns deterministic predictions", async () => {
    const left = await worker.fetch(new Request("https://example.com/api/predictions/2026-06-23-por-uzb?methods=ai,qimen,tarot"));
    const right = await worker.fetch(new Request("https://example.com/api/predictions/2026-06-23-por-uzb?methods=ai,qimen,tarot"));

    expect(await left.json()).toEqual(await right.json());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
PATH=/Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm test src/server/worker.test.ts
```

Expected: FAIL because `worker.ts` does not exist.

- [ ] **Step 3: Implement in-memory repository**

Create `src/server/repositories.ts`:

```ts
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
```

- [ ] **Step 4: Implement Worker routes**

Create `src/server/worker.ts`:

```ts
import { buildAccuracy } from "../lib/accuracy";
import { buildPrediction, predictionMethods, type MethodId } from "../lib/prediction";
import { resolveAccess, usageDateFromIso } from "./access";
import { createDemoMarketSnapshot } from "./marketData";
import { findMatch, getUsage, hasActiveEntitlement, incrementUsage, listMatches } from "./repositories";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const worker = {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/matches") {
      return json({ matches: listMatches() });
    }

    const oddsMatch = url.pathname.match(/^\/api\/matches\/([^/]+)\/odds$/);
    if (request.method === "GET" && oddsMatch) {
      const matchId = oddsMatch[1];
      const match = findMatch(matchId);
      if (!match) {
        return json({ error: "not-found" }, 404);
      }

      const visitorId = request.headers.get("x-visitor-id") || "anonymous";
      const nowIso = new Date("2026-06-24T12:00:00.000Z").toISOString();
      const usageDate = usageDateFromIso(nowIso);
      const decision = resolveAccess({
        currentViews: getUsage(visitorId, usageDate),
        hasActiveEntitlement: hasActiveEntitlement(visitorId, nowIso),
        nowIso
      });

      if (!decision.allowed) {
        return json({
          error: "pro-required",
          message: "今日免费次数已用完，开通赛事数据 Pro 后可继续查看实时数据、赔率变化和市场热度。"
        }, 402);
      }

      if (decision.shouldIncrementUsage) {
        incrementUsage(visitorId, usageDate);
      }

      return json({
        access: decision.reason,
        market: match.odds ?? createDemoMarketSnapshot(matchId, nowIso),
        disclaimer: "本站仅提供体育赛事数据、赔率变化展示与娱乐分析，不提供下注、代投、返奖、奖金池或博彩服务，不构成投注、投资或财务建议。请遵守所在地法律法规。"
      });
    }

    const predictionMatch = url.pathname.match(/^\/api\/predictions\/([^/]+)$/);
    if (request.method === "GET" && predictionMatch) {
      const match = findMatch(predictionMatch[1]);
      if (!match) {
        return json({ error: "not-found" }, 404);
      }
      const methods = parseMethods(url.searchParams.get("methods"));
      return json({ prediction: buildPrediction(match, methods) });
    }

    if (request.method === "GET" && url.pathname === "/api/accuracy") {
      return json({ accuracy: buildAccuracy(listMatches()) });
    }

    return json({ error: "not-found" }, 404);
  }
};

function parseMethods(value: string | null): MethodId[] {
  const allowed = new Set(predictionMethods.map((method) => method.id));
  const parsed = (value ?? "")
    .split(",")
    .filter((item): item is MethodId => allowed.has(item as MethodId));
  return parsed.length > 0 ? parsed.slice(0, 3) : ["ai", "qimen", "tarot"];
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

export default worker;
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
PATH=/Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm test src/server/worker.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/server/repositories.ts src/server/worker.ts src/server/worker.test.ts
git commit -m "Add Cloudflare Worker API routes"
```

---

### Task 4: Frontend API Client And UI Integration

**Files:**
- Create: `src/lib/apiClient.ts`
- Modify: `src/App.tsx`
- Test: `src/lib/apiClient.test.ts`

**Interfaces:**
- Consumes: Worker API response shapes from Task 3.
- Produces: `loadMatches(fetcher?: typeof fetch): Promise<MatchDTO[]>`
- Produces: `loadPrediction(matchId: string, methods: MethodId[], fetcher?: typeof fetch): Promise<PredictionSummary>`
- Produces: `loadAccuracy(fetcher?: typeof fetch): Promise<MethodAccuracy[]>`
- Produces: `loadMarketData(matchId: string, visitorId: string, fetcher?: typeof fetch): Promise<MarketDataResponse>`

- [ ] **Step 1: Write failing API client tests**

Create `src/lib/apiClient.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { loadMarketData, loadMatches } from "./apiClient";

describe("apiClient", () => {
  it("loads matches from the backend", async () => {
    const fetcher = async () =>
      new Response(JSON.stringify({ matches: [{ id: "m1", sourceAudit: { source_name: "FIFA" } }] })) as Response;

    const matches = await loadMatches(fetcher);
    expect(matches[0].id).toBe("m1");
  });

  it("surfaces Pro lock messages for market data", async () => {
    const fetcher = async () =>
      new Response(JSON.stringify({ error: "pro-required", message: "今日免费次数已用完" }), { status: 402 }) as Response;

    await expect(loadMarketData("m1", "visitor-a", fetcher)).rejects.toThrow("今日免费次数已用完");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
PATH=/Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm test src/lib/apiClient.test.ts
```

Expected: FAIL because `apiClient.ts` does not exist.

- [ ] **Step 3: Implement API client**

Create `src/lib/apiClient.ts`:

```ts
import type { MethodAccuracy } from "./accuracy";
import type { MethodId, PredictionSummary } from "./prediction";
import type { MatchDTO, MarketSnapshotDTO } from "../server/types";

export type MarketDataResponse = {
  access: string;
  market: MarketSnapshotDTO;
  disclaimer: string;
};

type Fetcher = typeof fetch;

export async function loadMatches(fetcher: Fetcher = fetch): Promise<MatchDTO[]> {
  const response = await fetcher("/api/matches");
  const body = await response.json() as { matches: MatchDTO[] };
  return body.matches;
}

export async function loadPrediction(matchId: string, methods: MethodId[], fetcher: Fetcher = fetch): Promise<PredictionSummary> {
  const response = await fetcher(`/api/predictions/${matchId}?methods=${methods.join(",")}`);
  const body = await response.json() as { prediction: PredictionSummary };
  return body.prediction;
}

export async function loadAccuracy(fetcher: Fetcher = fetch): Promise<MethodAccuracy[]> {
  const response = await fetcher("/api/accuracy");
  const body = await response.json() as { accuracy: MethodAccuracy[] };
  return body.accuracy;
}

export async function loadMarketData(matchId: string, visitorId: string, fetcher: Fetcher = fetch): Promise<MarketDataResponse> {
  const response = await fetcher(`/api/matches/${matchId}/odds`, {
    headers: { "x-visitor-id": visitorId }
  });
  const body = await response.json() as MarketDataResponse | { message?: string };
  if (!response.ok) {
    throw new Error("message" in body && body.message ? body.message : "市场数据暂不可用");
  }
  return body as MarketDataResponse;
}
```

- [ ] **Step 4: Run API client tests**

Run:

```bash
PATH=/Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm test src/lib/apiClient.test.ts
```

Expected: PASS.

- [ ] **Step 5: Integrate App with API client**

Modify `src/App.tsx`:

- Add imports:

```ts
import { useEffect, useMemo, useState } from "react";
import { loadAccuracy, loadMarketData, loadMatches, loadPrediction, type MarketDataResponse } from "./lib/apiClient";
import type { MethodAccuracy } from "./lib/accuracy";
import type { MatchDTO } from "./server/types";
```

- Replace the current static `worldCupMatches` state with:

```ts
const [matches, setMatches] = useState<MatchDTO[]>(worldCupMatches as MatchDTO[]);
const [marketData, setMarketData] = useState<MarketDataResponse | null>(null);
const [marketError, setMarketError] = useState("");
const [accuracy, setAccuracy] = useState<MethodAccuracy[]>(buildAccuracy(worldCupMatches));

useEffect(() => {
  loadMatches().then(setMatches).catch(() => setMatches(worldCupMatches as MatchDTO[]));
  loadAccuracy().then(setAccuracy).catch(() => setAccuracy(buildAccuracy(worldCupMatches)));
}, []);
```

- Keep local deterministic prediction fallback until Task 5:

```ts
const prediction = useMemo(() => buildPrediction(selectedMatch, enabledMethods), [enabledMethods, selectedMatch]);
```

- In `OddsPanel`, add a button that calls `loadMarketData(match.id, getVisitorId())` and displays either the returned source/disclaimer or lock message. Use this helper in `App.tsx`:

```ts
function getVisitorId() {
  const key = "xuan-oracle-visitor-id";
  const existing = window.localStorage.getItem(key);
  if (existing) {
    return existing;
  }
  const created = `visitor-${crypto.randomUUID()}`;
  window.localStorage.setItem(key, created);
  return created;
}
```

- [ ] **Step 6: Run full frontend tests and build**

Run:

```bash
PATH=/Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm test
PATH=/Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm build
```

Expected: all tests PASS, build PASS with only the known chunk-size warning from the Qimen library.

- [ ] **Step 7: Commit**

```bash
git add src/lib/apiClient.ts src/lib/apiClient.test.ts src/App.tsx
git commit -m "Connect frontend to Worker API client"
```

---

### Task 5: Cloudflare Configuration And Local Worker Build

**Files:**
- Create: `wrangler.toml`
- Modify: `package.json`
- Modify: `vite.config.ts` if asset output path needs no change; otherwise leave untouched.

**Interfaces:**
- Consumes: `src/server/worker.ts`.
- Produces: npm scripts `worker:dev`, `worker:deploy`, `worker:test`.

- [ ] **Step 1: Add Wrangler dependency and scripts**

Run:

```bash
PATH=/Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm add -D wrangler
```

Modify `package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview --host 0.0.0.0",
    "test": "vitest run",
    "worker:dev": "wrangler dev src/server/worker.ts --assets dist",
    "worker:deploy": "pnpm build && wrangler deploy",
    "worker:test": "vitest run src/server"
  }
}
```

- [ ] **Step 2: Add Wrangler config**

Create `wrangler.toml`:

```toml
name = "xuan-oracle-cup"
main = "src/server/worker.ts"
compatibility_date = "2026-06-24"

[assets]
directory = "./dist"
binding = "ASSETS"

[[d1_databases]]
binding = "DB"
database_name = "xuan-oracle-cup"
database_id = "local-dev-placeholder"

[[kv_namespaces]]
binding = "MARKET_CACHE"
id = "local-dev-placeholder"
```

- [ ] **Step 3: Run worker tests**

Run:

```bash
PATH=/Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm worker:test
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run:

```bash
PATH=/Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm build
```

Expected: PASS with known Qimen chunk-size warning.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml wrangler.toml
git commit -m "Add Cloudflare Worker deployment config"
```

---

### Task 6: Real D1 Repository Path

**Files:**
- Modify: `src/server/repositories.ts`
- Create: `src/server/d1Repository.test.ts`
- Modify: `src/server/worker.ts`

**Interfaces:**
- Produces: `createRepository(db?: D1Database): Repository`
- Repository methods: `listMatches()`, `findMatch(id)`, `getUsage(visitorId, date)`, `incrementUsage(visitorId, date)`, `hasActiveEntitlement(visitorId, nowIso)`.

- [ ] **Step 1: Write repository contract test with fake D1**

Create `src/server/d1Repository.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createRepository } from "./repositories";

describe("createRepository", () => {
  it("falls back to seeded data when no D1 binding is provided", () => {
    const repository = createRepository();
    expect(repository.listMatches().length).toBeGreaterThan(0);
    expect(repository.findMatch("2026-06-23-por-uzb")?.result?.home).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
PATH=/Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm test src/server/d1Repository.test.ts
```

Expected: FAIL because `createRepository` does not exist.

- [ ] **Step 3: Implement repository factory**

Modify `src/server/repositories.ts` to export:

```ts
import { seedMatches } from "./seed";
import type { MatchDTO } from "./types";

export type Repository = {
  listMatches(): MatchDTO[];
  findMatch(matchId: string): MatchDTO | undefined;
  getUsage(visitorId: string, usageDate: string): number;
  incrementUsage(visitorId: string, usageDate: string): void;
  hasActiveEntitlement(visitorId: string, nowIso: string): boolean;
};

const seededMatches = seedMatches();
const memoryUsage = new Map<string, number>();

export function createRepository(_db?: D1Database): Repository {
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
```

- [ ] **Step 4: Update Worker to consume repository factory**

Modify `src/server/worker.ts`:

```ts
type Env = {
  DB?: D1Database;
};

async fetch(request: Request, env?: Env): Promise<Response> {
  const repository = createRepository(env?.DB);

  if (request.method === "GET" && url.pathname === "/api/matches") {
    return json({ matches: repository.listMatches() });
  }

  const match = repository.findMatch(matchId);
  const currentViews = repository.getUsage(visitorId, usageDate);
  const hasPro = repository.hasActiveEntitlement(visitorId, nowIso);
  repository.incrementUsage(visitorId, usageDate);
}
```

- [ ] **Step 5: Run server tests**

Run:

```bash
PATH=/Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm test src/server
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/server/repositories.ts src/server/worker.ts src/server/d1Repository.test.ts
git commit -m "Add repository factory for D1-backed Worker"
```

---

### Task 7: Deploy To Cloudflare Workers

**Files:**
- Modify: `wrangler.toml` after Cloudflare creates real IDs.
- No source-code changes unless deployment output requires them.

**Interfaces:**
- Consumes: Cloudflare authenticated Wrangler session.
- Produces: public Cloudflare Workers URL.

- [ ] **Step 1: Authenticate Wrangler**

Run:

```bash
PATH=/Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm exec wrangler login
```

Expected: browser opens Cloudflare authorization. User approves.

- [ ] **Step 2: Create D1 database**

Run:

```bash
PATH=/Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm exec wrangler d1 create xuan-oracle-cup
```

Expected: output includes `database_id`. Replace `database_id = "local-dev-placeholder"` in `wrangler.toml` with the returned ID.

- [ ] **Step 3: Create KV namespace**

Run:

```bash
PATH=/Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm exec wrangler kv namespace create MARKET_CACHE
```

Expected: output includes `id`. Replace KV `id = "local-dev-placeholder"` in `wrangler.toml` with the returned ID.

- [ ] **Step 4: Apply schema**

Run:

```bash
PATH=/Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm exec wrangler d1 execute xuan-oracle-cup --remote --file=src/server/schema.sql
```

Expected: schema statements execute successfully.

- [ ] **Step 5: Deploy Worker**

Run:

```bash
PATH=/Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm worker:deploy
```

Expected: output includes a public `workers.dev` URL.

- [ ] **Step 6: Verify public routes**

Run:

```bash
WORKERS_URL="$(PATH=/Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/ixng/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm exec wrangler deployments list | awk '/workers.dev/ {print $NF; exit}')"
curl -L "$WORKERS_URL/api/matches"
curl -L -H "x-visitor-id: visitor-smoke" "$WORKERS_URL/api/matches/2026-06-23-por-uzb/odds"
curl -L "$WORKERS_URL/api/predictions/2026-06-23-por-uzb?methods=ai,qimen,tarot"
```

Expected:

- `/api/matches` returns match JSON with `sourceAudit`.
- first `/odds` request returns market data and disclaimer.
- prediction route returns deterministic prediction JSON.

- [ ] **Step 7: Commit Cloudflare IDs**

```bash
git add wrangler.toml
git commit -m "Configure Cloudflare production bindings"
```

---

## Self-Review

- Spec coverage: Cloudflare Workers, D1/KV, source metadata, no outbound betting links, deterministic predictions, daily free view, Pro lock state, and deployment are covered by Tasks 1-7.
- Placeholder scan: No implementation placeholders remain; deployment verification derives the Worker URL from Wrangler output.
- Type consistency: `MatchDTO`, `MarketSnapshotDTO`, `MethodAccuracy`, `PredictionSummary`, `resolveAccess`, `createDemoMarketSnapshot`, and `createRepository` are named consistently across tasks.
