import type { MatchDTO, MarketSnapshotDTO } from "../server/types";
import type { MethodAccuracy } from "./accuracy";
import type { MethodId, PredictionSummary } from "./prediction";

export type MarketDataResponse = {
  access: string;
  market: MarketSnapshotDTO;
  disclaimer: string;
};

type Fetcher = typeof fetch;

export async function loadMatches(fetcher: Fetcher = fetch): Promise<MatchDTO[]> {
  const response = await fetcher("/api/matches");
  const body = (await response.json()) as { matches: MatchDTO[] };
  return body.matches;
}

export async function loadPrediction(matchId: string, methods: MethodId[], fetcher: Fetcher = fetch): Promise<PredictionSummary> {
  const response = await fetcher(`/api/predictions/${matchId}?methods=${methods.join(",")}`);
  const body = (await response.json()) as { prediction: PredictionSummary };
  return body.prediction;
}

export async function loadAccuracy(fetcher: Fetcher = fetch): Promise<MethodAccuracy[]> {
  const response = await fetcher("/api/accuracy");
  const body = (await response.json()) as { accuracy: MethodAccuracy[] };
  return body.accuracy;
}

export async function loadMarketData(matchId: string, visitorId: string, fetcher: Fetcher = fetch): Promise<MarketDataResponse> {
  const response = await fetcher(`/api/matches/${matchId}/odds`, {
    headers: { "x-visitor-id": visitorId }
  });
  const body = (await response.json()) as MarketDataResponse | { message?: string };
  if (!response.ok) {
    throw new Error("message" in body && body.message ? body.message : "市场数据暂不可用");
  }
  return body as MarketDataResponse;
}
