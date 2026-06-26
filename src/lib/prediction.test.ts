import { describe, expect, it } from "vitest";
import { worldCupMatches } from "../data/schedule";
import { buildAccuracy } from "./accuracy";
import { buildPrediction, getMethodAuditTrail, predictionMethods, type MethodId } from "./prediction";

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
      "oracle",
      "ai"
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

  it("exposes numeric divination signals that explain the winner and score", () => {
    const match = worldCupMatches[0];
    const prediction = buildPrediction(match, ["tarot", "liuren", "astro"]);

    for (const reading of prediction.readings) {
      expect(reading.processSteps.map((step) => step.label)).toEqual(
        expect.arrayContaining(["原始取数", "实力校准", "基线三势", "盘面修正", "主队势能", "客队势能", "平局牵引", "比分落点"])
      );
      expect(reading.processSteps.find((step) => step.label === "实力校准")?.value).toContain(match.home);
      expect(reading.processSteps.find((step) => step.label === "基线三势")?.value).toMatch(/^主\d+ · 客\d+ · 和\d+$/);
      expect(reading.processSteps.find((step) => step.label === "盘面修正")?.value).toMatch(/^主[+-]?\d+ · 客[+-]?\d+ · 和[+-]?\d+$/);
      expect(reading.processSteps.find((step) => step.label === "主队势能")?.value).toMatch(/^\d+$/);
      expect(reading.processSteps.find((step) => step.label === "客队势能")?.value).toMatch(/^\d+$/);
      expect(reading.processSteps.find((step) => step.label === "比分落点")?.value).toMatch(/^\d+-\d+$/);
    }
  });

  it("keeps each method score aligned with its own score landing", () => {
    const match = worldCupMatches[0];
    const prediction = buildPrediction(match, ["tarot", "liuren", "astro"]);

    for (const reading of prediction.readings) {
      expect(reading.scoreHint).toBe(reading.processSteps.find((step) => step.label === "比分落点")?.value);
    }
    expect(Number.isInteger(prediction.upsetIndex)).toBe(true);
    expect(prediction.totalGoals).toMatch(/^\d+ 球$/);
    expect([match.home, match.away]).toContain(prediction.kickoffTeam);
  });

  it("uses method-specific divination mechanics in every reading", () => {
    const match = worldCupMatches[0];
    const expectations: Record<MethodId, string[]> = {
      tarot: ["洗牌种子", "牌阵抽取"],
      liuren: ["月日时起课", "三宫落点"],
      astro: ["三骰结果", "星骰加权"],
      meihua: ["年月日时", "本互变卦"],
      qimen: ["局数排宫", "门星宫"],
      oracle: ["签号", "签诗"],
      ai: ["模型类型", "实力评级"]
    };

    for (const methodId of predictionMethods.map((method) => method.id)) {
      const reading = buildPrediction(match, [methodId]).readings[0];
      const labels = reading.processSteps.map((step) => step.label);
      for (const expectedLabel of expectations[methodId]) {
        expect(labels).toContain(expectedLabel);
      }
    }
  });

  it("shows professional simulation details for each divination system", () => {
    const match = worldCupMatches[0];
    const expectedLabels: Record<MethodId, string[]> = {
      tarot: ["78张牌库", "正逆位", "元素权重"],
      liuren: ["报时起课", "吉凶分层", "六神判词"],
      astro: ["庙旺弱陷", "三骰合参", "宫位主题"],
      meihua: ["体用定位", "互卦", "变卦"],
      qimen: ["阴阳遁", "值符值使", "八神"],
      oracle: ["签诗卦象", "签意权重", "解签方向"],
      ai: ["近五场形态", "盘口倾向", "平局阈值"]
    };

    for (const methodId of predictionMethods.map((method) => method.id)) {
      const reading = buildPrediction(match, [methodId]).readings[0];
      const labels = reading.processSteps.map((step) => step.label);
      for (const label of expectedLabels[methodId]) {
        expect(labels).toContain(label);
      }
    }
  });

  it("uses real astronomy and lunisolar calendar data as calculation inputs", () => {
    const match = worldCupMatches[0];
    const astro = buildPrediction(match, ["astro"]).readings[0];
    const liuren = buildPrediction(match, ["liuren"]).readings[0];
    const meihua = buildPrediction(match, ["meihua"]).readings[0];
    const qimen = buildPrediction(match, ["qimen"]).readings[0];

    expect(astro.processSteps.map((step) => step.label)).toEqual(
      expect.arrayContaining(["赛时星历", "太阳黄经", "月亮黄经", "主要相位"])
    );
    expect(astro.processSteps.find((step) => step.label === "太阳黄经")?.value).toMatch(/^\d+\.\d+° · .+座$/);
    expect(astro.processSteps.find((step) => step.label === "月亮黄经")?.value).toMatch(/^\d+\.\d+° · .+座$/);

    for (const reading of [liuren, meihua, qimen]) {
      expect(reading.processSteps.map((step) => step.label)).toEqual(expect.arrayContaining(["农历日期", "干支四柱"]));
      expect(reading.processSteps.find((step) => step.label === "农历日期")?.value).toContain("农历");
      expect(reading.processSteps.find((step) => step.label === "干支四柱")?.value).toMatch(/年.*月.*日.*时/);
    }
  });

  it("uses complete I Ching and Qimen chart structures for the professional layer", () => {
    const match = worldCupMatches[0];
    const meihua = buildPrediction(match, ["meihua"]).readings[0];
    const qimen = buildPrediction(match, ["qimen"]).readings[0];

    expect(meihua.processSteps.map((step) => step.label)).toEqual(
      expect.arrayContaining(["周易64卦", "卦序卦名", "卦辞象意", "体用五行", "生克关系"])
    );
    expect(meihua.processSteps.find((step) => step.label === "卦序卦名")?.value).toMatch(/^第\d+卦/);

    expect(qimen.processSteps.map((step) => step.label)).toEqual(
      expect.arrayContaining(["拆补法定局", "旬首符首", "天盘地盘", "三奇六仪"])
    );
    expect(qimen.processSteps.find((step) => step.label === "拆补法定局")?.value).toMatch(/遁\d局/);
    expect(qimen.processSteps.find((step) => step.label === "三奇六仪")?.value).toContain("地盘");
  });

  it("calculates cumulative post-match accuracy for every method", () => {
    const accuracy = buildAccuracy(worldCupMatches);

    expect(accuracy).toHaveLength(predictionMethods.length);
    expect(accuracy[0].played).toBeGreaterThanOrEqual(1);
    for (const item of accuracy) {
      expect(item.winnerRate).toBeGreaterThanOrEqual(0);
      expect(item.scoreRate).toBeGreaterThanOrEqual(0);
      expect(item.totalGoalsRate).toBeGreaterThanOrEqual(0);
    }
  });

  it("exposes an audit trail proving methods use deterministic professional inputs", () => {
    const auditTrail = getMethodAuditTrail(["tarot", "liuren", "astro", "qimen", "ai"]);

    expect(auditTrail).toHaveLength(5);
    expect(auditTrail.map((item) => item.methodId)).toEqual(["tarot", "liuren", "astro", "qimen", "ai"]);
    expect(auditTrail.find((item) => item.methodId === "astro")?.engine).toContain("astronomy-engine");
    expect(auditTrail.find((item) => item.methodId === "qimen")?.engine).toContain("qimen-dunjia");
    expect(auditTrail.find((item) => item.methodId === "liuren")?.engine).toContain("solarlunar");
    for (const item of auditTrail) {
      expect(item.determinism).toContain("固定");
      expect(item.inputs.length).toBeGreaterThanOrEqual(3);
    }
  });
});
