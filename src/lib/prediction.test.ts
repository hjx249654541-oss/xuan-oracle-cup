import { describe, expect, it } from "vitest";
import { worldCupMatches } from "../data/schedule";
import { buildPrediction, predictionMethods, type MethodId } from "./prediction";

describe("buildPrediction", () => {
  it("returns stable predictions for the same match and methods", () => {
    const match = worldCupMatches[0];
    const methods: MethodId[] = ["tarot", "liuren", "astro"];

    expect(buildPrediction(match, methods)).toEqual(buildPrediction(match, methods));
  });

  it("filters readings to the enabled methods", () => {
    const match = worldCupMatches[1];
    const prediction = buildPrediction(match, ["tarot"]);

    expect(prediction.readings).toHaveLength(1);
    expect(prediction.readings[0].methodId).toBe("tarot");
  });

  it("offers the expanded divination method set", () => {
    expect(predictionMethods.map((method) => method.id)).toEqual([
      "tarot",
      "liuren",
      "astro",
      "meihua",
      "qimen",
      "oracle"
    ]);
  });

  it("uses no more than three enabled methods", () => {
    const match = worldCupMatches[2];
    const methods: MethodId[] = ["tarot", "liuren", "astro", "meihua"];
    const prediction = buildPrediction(match, methods);

    expect(prediction.readings.map((reading) => reading.methodId)).toEqual(["tarot", "liuren", "astro"]);
  });

  it("includes openable process steps for every selected method", () => {
    const match = worldCupMatches[0];
    const prediction = buildPrediction(match, ["tarot", "liuren", "astro"]);

    for (const reading of prediction.readings) {
      expect(reading.basis).toContain(match.home);
      expect(reading.basis).toContain(match.away);
      expect(reading.basis).toContain(match.date);
      expect(reading.calculationKey).toMatch(/^[0-9a-f]{8}$/);
      expect(reading.processTitle.length).toBeGreaterThan(0);
      expect(reading.processSteps.length).toBeGreaterThanOrEqual(3);
      expect(reading.processSteps.every((step) => step.label.length > 0 && step.value.length > 0)).toBe(true);
    }
  });
});
