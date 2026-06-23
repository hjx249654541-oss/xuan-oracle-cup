export type PredictionStage = "beforeResult" | "afterResult";

export function getPrimaryActionLabel(stage: PredictionStage) {
  return stage === "afterResult" ? "换法复核" : "开始测算";
}
