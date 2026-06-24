import type { WorldCupMatch } from "../data/schedule";
import { buildPrediction, predictionMethods, type MethodId } from "./prediction";

export type MethodAccuracy = {
  methodId: MethodId;
  name: string;
  played: number;
  winnerHits: number;
  scoreHits: number;
  totalGoalsHits: number;
  winnerRate: number;
  scoreRate: number;
  totalGoalsRate: number;
};

export function buildAccuracy(matches: WorldCupMatch[]): MethodAccuracy[] {
  const finished = matches.filter((match) => match.result?.status === "finished");

  return predictionMethods.map((method) => {
    let winnerHits = 0;
    let scoreHits = 0;
    let totalGoalsHits = 0;

    for (const match of finished) {
      const result = match.result;
      if (!result) {
        continue;
      }
      const prediction = buildPrediction(match, [method.id]);
      const actualWinner = result.home === result.away ? "draw" : result.home > result.away ? "home" : "away";
      const predictedScore = prediction.score.replace(/\s/g, "");
      const actualScore = `${result.home}:${result.away}`;
      const predictedTotal = Number(prediction.totalGoals.match(/\d+/)?.[0] ?? 0);
      const actualTotal = result.home + result.away;

      if (prediction.winnerSide === actualWinner) {
        winnerHits += 1;
      }
      if (predictedScore === actualScore) {
        scoreHits += 1;
      }
      if (predictedTotal === actualTotal) {
        totalGoalsHits += 1;
      }
    }

    return {
      methodId: method.id,
      name: method.shortName,
      played: finished.length,
      winnerHits,
      scoreHits,
      totalGoalsHits,
      winnerRate: rate(winnerHits, finished.length),
      scoreRate: rate(scoreHits, finished.length),
      totalGoalsRate: rate(totalGoalsHits, finished.length)
    };
  });
}

function rate(hit: number, total: number) {
  return total === 0 ? 0 : Math.round((hit / total) * 100);
}
