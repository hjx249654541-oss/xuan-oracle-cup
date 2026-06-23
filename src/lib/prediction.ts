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
  signalSummary: string;
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

const tarotCards = ["愚者", "魔术师", "女祭司", "皇后", "皇帝", "教皇", "恋人", "战车", "力量", "隐者", "命运之轮", "正义", "倒吊人", "死神", "节制", "恶魔", "高塔", "星星", "月亮", "太阳", "审判", "世界"];
const tarotPositions = ["球队气势", "比赛转折", "最终落点"];
const liurenStates = ["大安", "留连", "速喜", "赤口", "小吉", "空亡"];
const astroPlanets = ["太阳", "月亮", "水星", "金星", "火星", "木星", "土星", "天王星", "海王星", "冥王星"];
const astroSigns = ["白羊", "金牛", "双子", "巨蟹", "狮子", "处女", "天秤", "天蝎", "射手", "摩羯", "水瓶", "双鱼"];
const astroHouses = ["一宫", "二宫", "三宫", "四宫", "五宫", "六宫", "七宫", "八宫", "九宫", "十宫", "十一宫", "十二宫"];
const qimenDoors = ["开门临乾", "休门入坎", "生门落艮", "景门照离", "伤门震动", "杜门守局"];
const oracleLots = ["上签", "中上签", "中签", "小吉签", "守成签", "变局签"];
const trigrams = ["乾", "兑", "离", "震", "巽", "坎", "艮", "坤"];
const qimenStars = ["天蓬", "天任", "天冲", "天辅", "天英", "天芮", "天柱", "天心", "天禽"];
const qimenPalaces = ["坎一宫", "坤二宫", "震三宫", "巽四宫", "中五宫", "乾六宫", "兑七宫", "艮八宫", "离九宫"];
const oraclePoems = ["先缓后急，临门见喜", "守中得势，一球定局", "动中有阻，慎防反转", "云开见月，后手得分", "强攻不宜，借势而成", "有惊无险，守势成局"];

export function buildPrediction(match: WorldCupMatch, enabledMethods: MethodId[]): PredictionSummary {
  const selected = (enabledMethods.length > 0 ? enabledMethods : predictionMethods.map((method) => method.id)).slice(0, 3);
  const base = stableHash(`${match.id}:${selected.join("|")}`);
  const readings = selected.map((methodId, index) => buildReading(methodId, match, base + index * 97));
  const homeTotal = readings.reduce((sum, item) => sum + item.homeSignal, 0);
  const awayTotal = readings.reduce((sum, item) => sum + item.awaySignal, 0);
  const drawTotal = readings.reduce((sum, item) => sum + item.drawSignal, 0);
  const delta = homeTotal - awayTotal;
  const winnerSide = drawTotal >= Math.max(homeTotal, awayTotal) - readings.length * 5 ? "draw" : delta >= 0 ? "home" : "away";
  const winner = winnerSide === "draw" ? "平局" : winnerSide === "home" ? `${match.home} 胜` : `${match.away} 胜`;
  const homeGoals = Math.round(readings.reduce((sum, item) => sum + item.homeGoals, 0) / readings.length);
  const awayGoals = Math.round(readings.reduce((sum, item) => sum + item.awayGoals, 0) / readings.length);
  const normalizedScore = normalizeScore(homeGoals, awayGoals, winnerSide);
  const confidence = clamp(Math.round(readings.reduce((sum, item) => sum + item.confidence, 0) / readings.length), 45, 91);
  const upsetIndex = Math.round(clamp(100 - confidence + Math.abs(delta) / readings.length + (base % 16), 12, 88));
  const consensus =
    readings.length === 1
      ? `${readings[0].title}单法指向：${readings[0].leaning}`
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

type InternalReading = MethodReading & {
  homeSignal: number;
  awaySignal: number;
  drawSignal: number;
  homeGoals: number;
  awayGoals: number;
};

function buildReading(methodId: MethodId, match: WorldCupMatch, seed: number): InternalReading {
  const basis = `${match.date} ${match.localTime} · ${match.home} vs ${match.away} · ${match.city}/${match.venue}`;
  const methodSeed = stableHash(`${methodId}:${match.id}:${match.date}:${match.localTime}:${match.venue}:${seed}`);
  const calculationKey = methodSeed.toString(16).padStart(8, "0").slice(0, 8);
  const homeBase = 42 + (stableHash(`${methodId}:home:${match.home}:${match.date}`) % 43);
  const awayBase = 42 + (stableHash(`${methodId}:away:${match.away}:${match.localTime}`) % 43);
  const drawBase = 24 + (stableHash(`${methodId}:draw:${match.group}:${match.venue}`) % 37);
  const cast = castMethod(methodId, match, methodSeed);
  const homeSignal = clamp(homeBase + cast.tilt.home, 12, 99);
  const awaySignal = clamp(awayBase + cast.tilt.away, 12, 99);
  const drawSignal = clamp(drawBase + cast.tilt.draw, 8, 99);
  const winnerSide = drawSignal >= Math.max(homeSignal, awaySignal) - 5 ? "draw" : homeSignal >= awaySignal ? "home" : "away";
  const winner = winnerSide === "draw" ? "平局" : winnerSide === "home" ? `${match.home} 胜` : `${match.away} 胜`;
  const rawHomeGoals = clamp(Math.floor(homeSignal / 35) + (methodSeed % 2), 0, 5);
  const rawAwayGoals = clamp(Math.floor(awaySignal / 35) + ((methodSeed >> 3) % 2), 0, 5);
  const score = normalizeScore(rawHomeGoals, rawAwayGoals, winnerSide);
  const confidence = clamp(54 + Math.round(Math.abs(homeSignal - awaySignal) / 2) + (winnerSide === "draw" ? Math.round(drawSignal / 7) : 0), 50, 92);
  const numericSteps = [
    { label: "原始取数", value: calculationKey, note: `由比赛 id、开球时间、场馆与${getMethodName(methodId)}共同生成，保证同一场同一法结果稳定。` },
    { label: "主队势能", value: `${homeSignal}`, note: `${match.home} 的队名、日期和本法象意加权。` },
    { label: "客队势能", value: `${awaySignal}`, note: `${match.away} 的队名、时间和本法象意加权。` },
    { label: "平局牵引", value: `${drawSignal}`, note: `用小组/阶段与场馆气口判断是否容易僵持。` },
    { label: "比分落点", value: `${score.home}-${score.away}`, note: `把三项势能换算成进球区间，再按胜平负校正。` }
  ];

  if (methodId === "tarot") {
    const card = cast.titleToken;
    const spread = cast.tokens;
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
      signalSummary: `主${homeSignal} · 客${awaySignal} · 和${drawSignal}`,
      processSteps: [
        ...numericSteps,
        ...cast.steps,
        ...tarotPositions.map((position, index) => ({
          label: position,
          value: spread[index],
          note: index === 0 ? "看开场气势和控球主动权" : index === 1 ? "看比赛中段的变量与犯错点" : "合并前两牌，落到胜负与比分"
        }))
      ],
      homeSignal,
      awaySignal,
      drawSignal,
      homeGoals: score.home,
      awayGoals: score.away
    };
  }

  if (methodId === "liuren") {
    const state = cast.titleToken;
    const [hourState, teamState] = cast.tokens;
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
      signalSummary: `主${homeSignal} · 客${awaySignal} · 和${drawSignal}`,
      processSteps: [
        ...numericSteps,
        ...cast.steps,
        { label: "开球时辰", value: hourState, note: `以 ${match.localTime} 起局，定比赛初始气口` },
        { label: "队名取数", value: teamState, note: "用两队名称字数取辅助宫位" },
        { label: "落宫断事", value: state, note: "合时辰与队名，判断先手、阻滞和终局" }
      ],
      homeSignal,
      awaySignal,
      drawSignal,
      homeGoals: score.home,
      awayGoals: score.away
    };
  }

  if (methodId === "astro") {
    const [planet, sign, house] = cast.tokens;
    const signText = `${planet}入${sign}`;
    return {
      methodId,
      title: `占星骰子 · ${signText}`,
      leaning: winner,
      scoreHint: `${score.home}-${score.away}`,
      confidence,
      explanation: `${signText}显示边路与定位球能量较强，比赛容易出现一次突然变速，比分不宜看得过大。`,
      basis,
      calculationKey,
      processTitle: "三骰定位",
      signalSummary: `主${homeSignal} · 客${awaySignal} · 和${drawSignal}`,
      processSteps: [
        ...numericSteps,
        ...cast.steps,
        { label: "行星骰", value: planet, note: "判断比赛的主导能量" },
        { label: "星座骰", value: sign, note: "判断节奏性格和爆发点" },
        { label: "宫位骰", value: house, note: "判断影响落在进攻、对抗还是临场调整" }
      ],
      homeSignal,
      awaySignal,
      drawSignal,
      homeGoals: score.home,
      awayGoals: score.away
    };
  }

  if (methodId === "meihua") {
    const hexagram = cast.titleToken;
    const movingLine = Number(cast.tokens[2]);
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
      signalSummary: `主${homeSignal} · 客${awaySignal} · 和${drawSignal}`,
      processSteps: [
        ...numericSteps,
        ...cast.steps,
        { label: "上卦", value: hexagram.slice(0, 1), note: "取比赛日期与主队名定外势" },
        { label: "下卦", value: hexagram.slice(1, 2), note: "取开球时间与客队名定内势" },
        { label: "动爻", value: `${movingLine}爻动`, note: "动爻指向比赛最可能改变走势的阶段" }
      ],
      homeSignal,
      awaySignal,
      drawSignal,
      homeGoals: score.home,
      awayGoals: score.away
    };
  }

  if (methodId === "qimen") {
    const [door, star, palace] = cast.tokens;
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
      signalSummary: `主${homeSignal} · 客${awaySignal} · 和${drawSignal}`,
      processSteps: [
        ...numericSteps,
        ...cast.steps,
        { label: "值使门", value: door, note: "判断比赛打开局面的方式" },
        { label: "值符星", value: star, note: "判断核心球员和临场执行力" },
        { label: "落宫", value: palace, note: "判断优势更偏向进攻、守势或转换" }
      ],
      homeSignal,
      awaySignal,
      drawSignal,
      homeGoals: score.home,
      awayGoals: score.away
    };
  }

  if (methodId === "oracle") {
    const lot = cast.titleToken;
    const poem = cast.tokens[1];
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
      signalSummary: `主${homeSignal} · 客${awaySignal} · 和${drawSignal}`,
      processSteps: [
        ...numericSteps,
        ...cast.steps,
        { label: "签等", value: lot, note: "判断整体吉凶强弱" },
        { label: "签语", value: poem, note: "提取比赛过程的关键词" },
        { label: "解签", value: winner, note: "把签语映射到胜平负和比分倾向" }
      ],
      homeSignal,
      awaySignal,
      drawSignal,
      homeGoals: score.home,
      awayGoals: score.away
    };
  }

  throw new Error(`Unsupported prediction method: ${methodId}`);
}

type MethodCast = {
  titleToken: string;
  tokens: string[];
  tilt: {
    home: number;
    away: number;
    draw: number;
  };
  steps: MethodReading["processSteps"];
};

function castMethod(methodId: MethodId, match: WorldCupMatch, seed: number): MethodCast {
  const dateParts = getDateParts(match);
  const timeIndex = getTimeBranchIndex(match.localTime);

  if (methodId === "tarot") {
    const start = seed % tarotCards.length;
    const spread = [0, 1, 2].map((index) => tarotCards[(start + index * 7) % tarotCards.length]);
    const cardValues = spread.map((card) => tarotCards.indexOf(card) + 1);
    return {
      titleToken: spread[2],
      tokens: spread,
      tilt: {
        home: (cardValues[0] % 13) - 4,
        away: (cardValues[1] % 13) - 4,
        draw: (cardValues[2] % 9) - 2
      },
      steps: [
        { label: "洗牌种子", value: `${seed % 100000}`, note: "以比赛信息固定洗牌，避免刷新页面导致结果乱跳。" },
        { label: "牌阵抽取", value: spread.join(" / "), note: "三张牌分别进入气势、转折、落点位置，并参与胜平负加权。" }
      ]
    };
  }

  if (methodId === "liuren") {
    const monthIndex = (dateParts.month - 1) % liurenStates.length;
    const dayIndex = (monthIndex + dateParts.day - 1) % liurenStates.length;
    const hourIndex = (dayIndex + timeIndex) % liurenStates.length;
    const states = [liurenStates[monthIndex], liurenStates[dayIndex], liurenStates[hourIndex]];
    return {
      titleToken: states[2],
      tokens: [states[1], states[0]],
      tilt: {
        home: scoreLiurenState(states[0]) - 3,
        away: scoreLiurenState(states[1]) - 3,
        draw: scoreLiurenState(states[2]) - 2
      },
      steps: [
        { label: "月日时起课", value: `${dateParts.month}月 -> ${dateParts.day}日 -> ${getTimeBranchName(match.localTime)}`, note: "按小六壬常见顺推法，从月份起大安，日上再推时辰。" },
        { label: "三宫落点", value: states.join(" / "), note: "月宫看主队外势，日宫看客队来势，时宫看终局气口。" }
      ]
    };
  }

  if (methodId === "astro") {
    const planet = astroPlanets[indexFromSeed(seed, 0, astroPlanets.length)];
    const sign = astroSigns[indexFromSeed(seed, 4, astroSigns.length)];
    const house = astroHouses[indexFromSeed(seed, 8, astroHouses.length)];
    const planetPower = astroPlanets.indexOf(planet) + 1;
    const signPower = astroSigns.indexOf(sign) + 1;
    const housePower = astroHouses.indexOf(house) + 1;
    return {
      titleToken: `${planet}入${sign}`,
      tokens: [planet, sign, house],
      tilt: {
        home: (planetPower % 10) - 2,
        away: (signPower % 10) - 3,
        draw: (housePower % 8) - 1
      },
      steps: [
        { label: "三骰结果", value: `${planet} / ${sign} / ${house}`, note: "三颗骰子分别对应能量来源、表现方式和落入领域。" },
        { label: "星骰加权", value: `${planetPower}-${signPower}-${housePower}`, note: "行星偏主动力，星座偏对抗形态，宫位偏比赛场景。" }
      ]
    };
  }

  if (methodId === "meihua") {
    const upperIndex = (dateParts.year + dateParts.month + dateParts.day) % trigrams.length;
    const lowerIndex = (dateParts.month + dateParts.day + dateParts.hour) % trigrams.length;
    const movingLine = ((dateParts.year + dateParts.month + dateParts.day + dateParts.hour) % 6) + 1;
    const hexagram = `${trigrams[upperIndex]}${trigrams[lowerIndex]}`;
    const changed = `${trigrams[(upperIndex + movingLine) % trigrams.length]}${trigrams[(lowerIndex + movingLine) % trigrams.length]}`;
    return {
      titleToken: hexagram,
      tokens: [trigrams[upperIndex], trigrams[lowerIndex], `${movingLine}`, changed],
      tilt: {
        home: upperIndex + movingLine - 2,
        away: lowerIndex + Math.ceil(movingLine / 2) - 2,
        draw: movingLine % 2 === 0 ? 6 : -1
      },
      steps: [
        { label: "年月日时", value: `${dateParts.year}+${dateParts.month}+${dateParts.day}+${dateParts.hour}`, note: "用开球时空起数，上卦取年月日，下卦加入时数。" },
        { label: "本互变卦", value: `${hexagram} -> ${changed}`, note: `第 ${movingLine} 爻动，变卦用于修正比分落点。` }
      ]
    };
  }

  if (methodId === "qimen") {
    const dayOfYear = getDayOfYear(match.date);
    const ju = ((dayOfYear + dateParts.hour) % 9) + 1;
    const door = qimenDoors[(ju + timeIndex) % qimenDoors.length];
    const star = qimenStars[(ju + match.home.length) % qimenStars.length];
    const palace = qimenPalaces[(ju + match.away.length) % qimenPalaces.length];
    return {
      titleToken: door,
      tokens: [door, star, palace],
      tilt: {
        home: ju + qimenDoors.indexOf(door) - 2,
        away: qimenStars.indexOf(star) - 2,
        draw: palace.includes("中") || palace.includes("坤") ? 5 : -1
      },
      steps: [
        { label: "局数排宫", value: `第${ju}局 · ${getTimeBranchName(match.localTime)}`, note: "以年内日序和开球时辰排简化九宫局。" },
        { label: "门星宫", value: `${door} / ${star} / ${palace}`, note: "门看进攻打开方式，星看执行者，宫看优势落点。" }
      ]
    };
  }

  const lotNumber = (seed % 64) + 1;
  const lot = oracleLots[lotNumber % oracleLots.length];
  const poem = oraclePoems[lotNumber % oraclePoems.length];
  return {
    titleToken: lot,
    tokens: [`第${lotNumber}签`, poem],
    tilt: {
      home: (lotNumber % 12) - 3,
      away: ((lotNumber >> 1) % 12) - 3,
      draw: lot.includes("守") || poem.includes("守") ? 7 : (lotNumber % 6) - 2
    },
    steps: [
      { label: "签号", value: `第${lotNumber}签`, note: "以比赛、球队、开球时间合成签号，固定同场同法的抽签结果。" },
      { label: "签诗", value: poem, note: "签诗关键词参与胜负、平局和比分修正。" }
    ]
  };
}

function getMethodName(methodId: MethodId) {
  return predictionMethods.find((method) => method.id === methodId)?.name ?? methodId;
}

function getDateParts(match: WorldCupMatch) {
  const [year, month, day] = match.date.split("-").map(Number);
  const hour = Number(match.localTime.split(":")[0]);
  return { year, month, day, hour };
}

function getTimeBranchIndex(localTime: string) {
  const hour = Number(localTime.split(":")[0]);
  return Math.floor(((hour + 1) % 24) / 2);
}

function getTimeBranchName(localTime: string) {
  return ["子时", "丑时", "寅时", "卯时", "辰时", "巳时", "午时", "未时", "申时", "酉时", "戌时", "亥时"][getTimeBranchIndex(localTime)];
}

function getDayOfYear(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const start = Date.UTC(year, 0, 0);
  const current = Date.UTC(year, month - 1, day);
  return Math.floor((current - start) / 86400000);
}

function scoreLiurenState(state: string) {
  const scores: Record<string, number> = {
    大安: 8,
    留连: 3,
    速喜: 9,
    赤口: 2,
    小吉: 7,
    空亡: 1
  };
  return scores[state] ?? 4;
}

function indexFromSeed(seed: number, divisorPower: number, length: number) {
  return Math.floor(seed / 2 ** divisorPower) % length;
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
