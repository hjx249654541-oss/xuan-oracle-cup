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
