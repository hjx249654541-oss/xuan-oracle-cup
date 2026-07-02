import type { MatchDTO, MarketSnapshotDTO } from "../server/types";
import type { MethodAccuracy } from "./accuracy";
import type { MethodId, PredictionSummary } from "./prediction";

export type MarketDataResponse = {
  access: string;
  market: MarketSnapshotDTO;
  disclaimer: string;
};

type Fetcher = typeof fetch;

const workerApiOrigin = "https://xuan-oracle-cup.hjx249654541.workers.dev";
const apiTimeoutMs = 4_000;

function apiUrl(path: string) {
  if (typeof window === "undefined") {
    return path;
  }
  if (window.location.hostname.endsWith("github.io") || window.location.hostname.endsWith("netlify.app")) {
    return `${workerApiOrigin}${path}`;
  }
  return path;
}

async function requestJson<T>(path: string, fetcher: Fetcher, init?: RequestInit): Promise<{ response: Response; body: T }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), apiTimeoutMs);
  try {
    const response = await fetcher(apiUrl(path), { ...init, signal: init?.signal ?? controller.signal });
    const body = (await response.json()) as T;
    return { response, body };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function loadMatches(fetcher: Fetcher = fetch): Promise<MatchDTO[]> {
  const { body } = await requestJson<{ matches: MatchDTO[] }>("/api/matches", fetcher);
  return body.matches;
}

export async function loadPrediction(matchId: string, methods: MethodId[], fetcher: Fetcher = fetch): Promise<PredictionSummary> {
  const { body } = await requestJson<{ prediction: PredictionSummary }>(`/api/predictions/${matchId}?methods=${methods.join(",")}`, fetcher);
  return body.prediction;
}

export async function loadAccuracy(fetcher: Fetcher = fetch): Promise<MethodAccuracy[]> {
  const { body } = await requestJson<{ accuracy: MethodAccuracy[] }>("/api/accuracy", fetcher);
  return body.accuracy;
}

export async function loadMarketData(matchId: string, visitorId: string, fetcher: Fetcher = fetch): Promise<MarketDataResponse> {
  const { response, body } = await requestJson<MarketDataResponse | { message?: string }>(`/api/matches/${matchId}/odds`, fetcher, {
    headers: { "x-visitor-id": visitorId }
  });
  if (!response.ok) {
    throw new Error("message" in body && body.message ? body.message : "市场数据暂不可用");
  }
  return body as MarketDataResponse;
}
