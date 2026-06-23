import type { WorldCupMatch } from "../data/schedule";

export type MethodId = "tarot" | "liuren" | "astro" | "meihua" | "qimen" | "oracle";

export type PredictionMethod = {
  id: MethodId;
  name: string;
  shortName: string;
  subtitle: string;
};

export type MethodReading = {
  methodId: MethodId;
  title: string;
  leaning: string;
  scoreHint: string;
  confidence: number;
  explanation: string;
  basis: string;
  calculationKey: string;
  processTitle: string;
  processSteps: Array<{
    label: string;
    value: string;
    note: string;
  }>;
};

export type PredictionSummary = {
  winner: string;
  winnerSide: "home" | "away" | "draw";
  score: string;
  confidence: number;
  upsetIndex: number;
  consensus: string;
  readings: MethodReading[];
};

export const predictionMethods: PredictionMethod[] = [
  {
    id: "tarot",
    name: "塔罗牌",
    shortName: "塔罗",
    subtitle: "三牌牌阵 · 趋势与转折"
  },
  {
    id: "liuren",
    name: "小六壬",
    shortName: "六壬",
    subtitle: "三传占事 · 速断吉凶"
  },
  {
    id: "astro",
    name: "占星骰子",
    shortName: "星骰",
    subtitle: "星象能量 · 随机启示"
  },
  {
    id: "meihua",
    name: "梅花易数",
    shortName: "梅花",
    subtitle: "时空起卦 · 动静生克"
  },
  {
    id: "qimen",
    name: "奇门遁甲",
    shortName: "奇门",
    subtitle: "九宫排盘 · 攻守方位"
  },
  {
    id: "oracle",
    name: "签文抽签",
    shortName: "签文",
    subtitle: "上中下签 · 赛前启示"
  }
];

const tarotCards = ["战车", "星币国王", "权杖六", "月亮", "节制", "高塔"];
const tarotPositions = ["球队气势", "比赛转折", "最终落点"];
const liurenStates = ["大安", "留连", "速喜", "赤口", "小吉", "空亡"];
const astroSigns = ["火星入狮子", "木星合天顶", "月亮冲土星", "金星入射手", "水星拱太阳", "海王落十二宫"];
const astroPlanets = ["太阳", "月亮", "火星", "木星", "土星", "水星"];
const astroHouses = ["一宫", "三宫", "五宫", "七宫", "十宫", "十一宫"];
const meihuaHexagrams = ["雷火丰", "风火家人", "山泽损", "水天需", "地风升", "泽雷随"];
const qimenDoors = ["开门临乾", "休门入坎", "生门落艮", "景门照离", "伤门震动", "杜门守局"];
const oracleLots = ["上签", "中上签", "中签", "小吉签", "守成签", "变局签"];

export function buildPrediction(match: WorldCupMatch, enabledMethods: MethodId[]): PredictionSummary {
  const selected = (enabledMethods.length > 0 ? enabledMethods : predictionMethods.map((method) => method.id)).slice(0, 3);
  const base = stableHash(`${match.id}:${selected.join("|")}`);
  const homePower = 38 + (stableHash(`${match.home}:${match.date}`) % 55);
  const awayPower = 38 + (stableHash(`${match.away}:${match.venue}`) % 55);
  const methodBias = selected.reduce((total, method) => total + (stableHash(`${method}:${match.id}`) % 15) - 7, 0);
  const delta = homePower - awayPower + methodBias;
  const winnerSide = Math.abs(delta) < 8 ? "draw" : delta > 0 ? "home" : "away";
  const winner = winnerSide === "draw" ? "平局" : winnerSide === "home" ? `${match.home} 胜` : `${match.away} 胜`;
  const homeGoals = clamp(1 + Math.floor((homePower + base) % 3) + (winnerSide === "home" ? 1 : 0), 0, 5);
  const awayGoals = clamp(1 + Math.floor((awayPower + base / 3) % 3) + (winnerSide === "away" ? 1 : 0), 0, 5);
  const normalizedScore = normalizeScore(homeGoals, awayGoals, winnerSide);
  const readings = selected.map((methodId, index) => buildReading(methodId, match, winner, normalizedScore, base + index * 17));
  const confidence = clamp(Math.round(readings.reduce((sum, item) => sum + item.confidence, 0) / readings.length), 45, 91);
  const upsetIndex = clamp(100 - confidence + Math.abs(delta) + (base % 16), 12, 88);
  const consensus =
    readings.length === 1
      ? `${readings[0].title}单法指向：${winner}`
      : `${readings.length}法共识：${winnerSide === "draw" ? "僵持成局" : winner}`;

  return {
    winner,
    winnerSide,
    score: `${normalizedScore.home} : ${normalizedScore.away}`,
    confidence,
    upsetIndex,
    consensus,
    readings
  };
}

function buildReading(methodId: MethodId, match: WorldCupMatch, winner: string, score: { home: number; away: number }, seed: number): MethodReading {
  const confidence = clamp(58 + (seed % 27), 50, 92);
  const basis = `${match.date} ${match.localTime} · ${match.home} vs ${match.away} · ${match.city}/${match.venue}`;
  const calculationKey = seed.toString(16).padStart(8, "0").slice(0, 8);
  const basisStep = {
    label: "本场依据",
    value: calculationKey,
    note: basis
  };

  if (methodId === "tarot") {
    const card = tarotCards[seed % tarotCards.length];
    const spread = tarotPositions.map((position, index) => tarotCards[(seed + index * 2) % tarotCards.length]);
    return {
      methodId,
      title: `塔罗牌 · ${card}`,
      leaning: winner,
      scoreHint: `${score.home}-${score.away}`,
      confidence,
      explanation: `${card}落在攻守转换位，${match.home}与${match.away}的节奏会先紧后开，胜负多由下半场一次推进决定。`,
      basis,
      calculationKey,
      processTitle: "三牌牌阵",
      processSteps: [
        basisStep,
        ...tarotPositions.map((position, index) => ({
          label: position,
          value: spread[index],
          note: index === 0 ? "看开场气势和控球主动权" : index === 1 ? "看比赛中段的变量与犯错点" : "合并前两牌，落到胜负与比分"
        }))
      ]
    };
  }

  if (methodId === "liuren") {
    const state = liurenStates[seed % liurenStates.length];
    const hourState = liurenStates[(seed + match.localTime.charCodeAt(0)) % liurenStates.length];
    const teamState = liurenStates[(seed + match.home.length + match.away.length) % liurenStates.length];
    return {
      methodId,
      title: `小六壬 · ${state}`,
      leaning: winner,
      scoreHint: `${score.home}-${score.away}`,
      confidence,
      explanation: `${state}主临场气口，利于先稳住阵脚的一方。若前二十分钟无失球，卦象会更偏向当前判词。`,
      basis,
      calculationKey,
      processTitle: "小六壬起课",
      processSteps: [
        basisStep,
        { label: "开球时辰", value: hourState, note: `以 ${match.localTime} 起局，定比赛初始气口` },
        { label: "队名取数", value: teamState, note: "用两队名称字数取辅助宫位" },
        { label: "落宫断事", value: state, note: "合时辰与队名，判断先手、阻滞和终局" }
      ]
    };
  }

  if (methodId === "astro") {
    const sign = astroSigns[seed % astroSigns.length];
    const planet = astroPlanets[seed % astroPlanets.length];
    const house = astroHouses[(seed + 2) % astroHouses.length];
    return {
      methodId,
      title: `占星骰子 · ${sign}`,
      leaning: winner,
      scoreHint: `${score.home}-${score.away}`,
      confidence,
      explanation: `${sign}显示边路与定位球能量较强，比赛容易出现一次突然变速，比分不宜看得过大。`,
      basis,
      calculationKey,
      processTitle: "三骰定位",
      processSteps: [
        basisStep,
        { label: "行星骰", value: planet, note: "判断比赛的主导能量" },
        { label: "星座骰", value: sign.replace(/^.*入|合|冲|拱|落/, ""), note: "判断节奏性格和爆发点" },
        { label: "宫位骰", value: house, note: "判断影响落在进攻、对抗还是临场调整" }
      ]
    };
  }

  if (methodId === "meihua") {
    const hexagram = meihuaHexagrams[seed % meihuaHexagrams.length];
    const movingLine = (seed % 6) + 1;
    return {
      methodId,
      title: `梅花易数 · ${hexagram}`,
      leaning: winner,
      scoreHint: `${score.home}-${score.away}`,
      confidence,
      explanation: `${hexagram}以开球时空取象，主队与客队的气势有一段互换，临门一脚更看重节奏是否顺势。`,
      basis,
      calculationKey,
      processTitle: "时空起卦",
      processSteps: [
        basisStep,
        { label: "上卦", value: hexagram.slice(0, 1), note: "取比赛日期与主队名定外势" },
        { label: "下卦", value: hexagram.slice(1, 2), note: "取开球时间与客队名定内势" },
        { label: "动爻", value: `${movingLine}爻动`, note: "动爻指向比赛最可能改变走势的阶段" }
      ]
    };
  }

  if (methodId === "qimen") {
    const door = qimenDoors[seed % qimenDoors.length];
    const star = ["天蓬", "天任", "天冲", "天辅", "天英", "天芮"][seed % 6];
    const palace = ["乾宫", "坎宫", "艮宫", "震宫", "离宫", "兑宫"][(seed + 1) % 6];
    return {
      methodId,
      title: `奇门遁甲 · ${door}`,
      leaning: winner,
      scoreHint: `${score.home}-${score.away}`,
      confidence,
      explanation: `${door}显示攻守方位有偏，先抢到中路主动权的一方更容易把比赛带入自己的局。`,
      basis,
      calculationKey,
      processTitle: "九宫排盘",
      processSteps: [
        basisStep,
        { label: "值使门", value: door, note: "判断比赛打开局面的方式" },
        { label: "值符星", value: star, note: "判断核心球员和临场执行力" },
        { label: "落宫", value: palace, note: "判断优势更偏向进攻、守势或转换" }
      ]
    };
  }

  if (methodId === "oracle") {
    const lot = oracleLots[seed % oracleLots.length];
    const poem = ["先缓后急", "守中得势", "临门见喜", "动中有阻", "一球定局", "慎防反转"][seed % 6];
    return {
      methodId,
      title: `签文抽签 · ${lot}`,
      leaning: winner,
      scoreHint: `${score.home}-${score.away}`,
      confidence,
      explanation: `${lot}落在赛前问局，宜看临场心态与一次关键判罚，若开局顺利则判词会明显增强。`,
      basis,
      calculationKey,
      processTitle: "赛前抽签",
      processSteps: [
        basisStep,
        { label: "签等", value: lot, note: "判断整体吉凶强弱" },
        { label: "签语", value: poem, note: "提取比赛过程的关键词" },
        { label: "解签", value: winner, note: "把签语映射到胜平负和比分倾向" }
      ]
    };
  }

  throw new Error(`Unsupported prediction method: ${methodId}`);
}

function normalizeScore(home: number, away: number, winnerSide: PredictionSummary["winnerSide"]) {
  if (winnerSide === "draw") {
    const draw = Math.max(0, Math.min(3, Math.round((home + away) / 2)));
    return { home: draw, away: draw };
  }

  if (winnerSide === "home" && home <= away) {
    return { home: away + 1, away };
  }

  if (winnerSide === "away" && away <= home) {
    return { home, away: home + 1 };
  }

  return { home, away };
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
