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
        return json(
          {
            error: "pro-required",
            message: "今日免费次数已用完，开通赛事数据 Pro 后可继续查看实时数据、赔率变化和市场热度。"
          },
          402
        );
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
  const parsed = (value ?? "").split(",").filter((item): item is MethodId => allowed.has(item as MethodId));
  return parsed.length > 0 ? parsed.slice(0, 3) : ["ai", "qimen", "tarot"];
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

export default worker;
