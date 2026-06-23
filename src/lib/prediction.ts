import * as Astronomy from "astronomy-engine";
import { chartToObject, generateChartByDatetime } from "qimen-dunjia";
import solarLunar from "solarlunar";
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

const majorArcana = ["愚者", "魔术师", "女祭司", "皇后", "皇帝", "教皇", "恋人", "战车", "力量", "隐者", "命运之轮", "正义", "倒吊人", "死神", "节制", "恶魔", "高塔", "星星", "月亮", "太阳", "审判", "世界"];
const minorRanks = ["Ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "侍从", "骑士", "王后", "国王"];
const minorSuits = [
  { name: "权杖", element: "火", attack: 4, defense: 1, draw: 0 },
  { name: "圣杯", element: "水", attack: 1, defense: 2, draw: 3 },
  { name: "宝剑", element: "风", attack: 3, defense: 0, draw: 1 },
  { name: "星币", element: "土", attack: 1, defense: 4, draw: 2 }
];
const tarotDeck = [
  ...majorArcana.map((name, index) => ({ name, arcana: "大阿尔卡那", element: "灵", power: index + 1, attack: index % 3, defense: index % 4, draw: index % 5 })),
  ...minorSuits.flatMap((suit) =>
    minorRanks.map((rank, index) => ({
      name: `${suit.name}${rank}`,
      arcana: "小阿尔卡那",
      element: suit.element,
      power: index + 1,
      attack: suit.attack + (index % 3),
      defense: suit.defense + (index % 3),
      draw: suit.draw + (index % 2)
    }))
  )
];
const tarotCards = tarotDeck.map((card) => card.name);
const tarotPositions = ["球队气势", "比赛转折", "最终落点"];
const liurenStates = ["大安", "留连", "速喜", "赤口", "小吉", "空亡"];
const liurenJudgements: Record<string, { level: string; text: string; home: number; away: number; draw: number }> = {
  大安: { level: "吉", text: "稳守有根，利主不利躁进", home: 8, away: 3, draw: 4 },
  留连: { level: "滞", text: "事多缠绕，节奏拖慢", home: 2, away: 2, draw: 8 },
  速喜: { level: "吉", text: "喜信速至，利先手进球", home: 9, away: 5, draw: 1 },
  赤口: { level: "凶", text: "口舌争执，犯规冲突增多", home: 2, away: 6, draw: 2 },
  小吉: { level: "小吉", text: "小利渐进，利后程调整", home: 6, away: 6, draw: 3 },
  空亡: { level: "空", text: "有势无形，临门易空", home: 1, away: 1, draw: 7 }
};
const astroPlanets = ["太阳", "月亮", "水星", "金星", "火星", "木星", "土星", "天王星", "海王星", "冥王星"];
const astroSigns = ["白羊", "金牛", "双子", "巨蟹", "狮子", "处女", "天秤", "天蝎", "射手", "摩羯", "水瓶", "双鱼"];
const astroHouses = ["一宫", "二宫", "三宫", "四宫", "五宫", "六宫", "七宫", "八宫", "九宫", "十宫", "十一宫", "十二宫"];
const planetDignities: Record<string, string> = {
  太阳: "旺于狮子，主核心与名望",
  月亮: "旺于巨蟹，主情绪与节奏",
  水星: "旺于双子/处女，主传导与判断",
  金星: "旺于金牛/天秤，主配合与稳定",
  火星: "旺于白羊，主冲击与对抗",
  木星: "旺于射手，主扩张与机会",
  土星: "旺于摩羯，主防线与纪律",
  天王星: "主突变与冷门",
  海王星: "主迷雾与误判",
  冥王星: "主压迫与逆转"
};
const houseThemes = ["自我状态", "资源消耗", "传导沟通", "主场根基", "创造射门", "执行细节", "对手关系", "危险区域", "远程推进", "名望结果", "团队协作", "隐患失误"];
const qimenDoors = ["休门", "生门", "伤门", "杜门", "景门", "死门", "惊门", "开门"];
const oracleLots = ["上签", "中上签", "中签", "小吉签", "守成签", "变局签"];
const trigrams = ["乾", "兑", "离", "震", "巽", "坎", "艮", "坤"];
const trigramLines: Record<string, number[]> = {
  乾: [1, 1, 1],
  兑: [1, 1, 0],
  离: [1, 0, 1],
  震: [1, 0, 0],
  巽: [0, 1, 1],
  坎: [0, 1, 0],
  艮: [0, 0, 1],
  坤: [0, 0, 0]
};
const trigramElements: Record<string, string> = {
  乾: "金",
  兑: "金",
  离: "火",
  震: "木",
  巽: "木",
  坎: "水",
  艮: "土",
  坤: "土"
};
const elementGenerates: Record<string, string> = {
  木: "火",
  火: "土",
  土: "金",
  金: "水",
  水: "木"
};
const elementControls: Record<string, string> = {
  木: "土",
  土: "水",
  水: "火",
  火: "金",
  金: "木"
};
const kingWenHexagrams = [
  "乾为天", "坤为地", "水雷屯", "山水蒙", "水天需", "天水讼", "地水师", "水地比",
  "风天小畜", "天泽履", "地天泰", "天地否", "天火同人", "火天大有", "地山谦", "雷地豫",
  "泽雷随", "山风蛊", "地泽临", "风地观", "火雷噬嗑", "山火贲", "山地剥", "地雷复",
  "天雷无妄", "山天大畜", "山雷颐", "泽风大过", "坎为水", "离为火", "泽山咸", "雷风恒",
  "天山遁", "雷天大壮", "火地晋", "地火明夷", "风火家人", "火泽睽", "水山蹇", "雷水解",
  "山泽损", "风雷益", "泽天夬", "天风姤", "泽地萃", "地风升", "泽水困", "水风井",
  "泽火革", "火风鼎", "震为雷", "艮为山", "风山渐", "雷泽归妹", "雷火丰", "火山旅",
  "巽为风", "兑为泽", "风水涣", "水泽节", "风泽中孚", "雷山小过", "水火既济", "火水未济"
];
const hexagramImages = ["进取", "承载", "初难", "启蒙", "等待", "争执", "组织", "亲比"];
const qimenStars = ["天蓬", "天任", "天冲", "天辅", "天英", "天芮", "天柱", "天心", "天禽"];
const qimenPalaces = ["坎一宫", "坤二宫", "震三宫", "巽四宫", "中五宫", "乾六宫", "兑七宫", "艮八宫", "离九宫"];
const qimenGods = ["值符", "腾蛇", "太阴", "六合", "白虎", "玄武", "九地", "九天"];
const oraclePoems = ["先缓后急，临门见喜", "守中得势，一球定局", "动中有阻，慎防反转", "云开见月，后手得分", "强攻不宜，借势而成", "有惊无险，守势成局"];
const oracleImages = ["乾金进取", "坤土守成", "震雷突发", "巽风渗透", "坎水险阻", "离火明朗", "艮山止步", "兑泽喜悦"];
const westernSigns = ["白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座", "水瓶座", "双鱼座"];
const cityUtcOffsets: Record<string, number> = {
  休斯敦: -5,
  波士顿: -4,
  多伦多: -4,
  瓜达拉哈拉: -6,
  亚特兰大: -4,
  洛杉矶: -7,
  达拉斯: -5,
  "纽约/新泽西": -4
};
const astronomyBodies = [
  ["太阳", Astronomy.Body.Sun],
  ["月亮", Astronomy.Body.Moon],
  ["水星", Astronomy.Body.Mercury],
  ["金星", Astronomy.Body.Venus],
  ["火星", Astronomy.Body.Mars],
  ["木星", Astronomy.Body.Jupiter],
  ["土星", Astronomy.Body.Saturn]
] as const;
const teamPowerRatings: Record<string, number> = {
  阿根廷: 94,
  法国: 93,
  英格兰: 91,
  葡萄牙: 90,
  西班牙: 89,
  巴西: 89,
  荷兰: 87,
  克罗地亚: 84,
  哥伦比亚: 82,
  美国: 78,
  摩洛哥: 78,
  日本: 77,
  瑞典: 76,
  土耳其: 75,
  加纳: 73,
  乌兹别克斯坦: 68,
  巴拿马: 64,
  海地: 58,
  约旦: 58,
  刚果民主共和国: 67,
  待定球队: 70
};

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
  const astroContext = getAstroContext(match);
  const lunisolarContext = getLunisolarContext(match);
  const calculationKey = methodSeed.toString(16).padStart(8, "0").slice(0, 8);
  const baseline = buildMatchBaseline(match);
  const cast = castMethod(methodId, match, methodSeed, astroContext, lunisolarContext);
  const homeSignal = clamp(Math.round(baseline.home + cast.tilt.home), 12, 99);
  const awaySignal = clamp(Math.round(baseline.away + cast.tilt.away), 12, 99);
  const drawSignal = clamp(Math.round(baseline.draw + cast.tilt.draw), 8, 99);
  const winnerSide = drawSignal >= Math.max(homeSignal, awaySignal) - 5 ? "draw" : homeSignal >= awaySignal ? "home" : "away";
  const winner = winnerSide === "draw" ? "平局" : winnerSide === "home" ? `${match.home} 胜` : `${match.away} 胜`;
  const rawHomeGoals = estimateGoals(homeSignal, awaySignal, drawSignal, "home", methodSeed);
  const rawAwayGoals = estimateGoals(awaySignal, homeSignal, drawSignal, "away", methodSeed);
  const score = normalizeScore(rawHomeGoals, rawAwayGoals, winnerSide);
  const confidence = clamp(54 + Math.round(Math.abs(homeSignal - awaySignal) / 2) + (winnerSide === "draw" ? Math.round(drawSignal / 7) : 0), 50, 92);
  const numericSteps = [
    { label: "原始取数", value: calculationKey, note: `由比赛 id、开球时间、场馆与${getMethodName(methodId)}共同生成，保证同一场同一法结果稳定。` },
    { label: "实力校准", value: `${match.home}${baseline.homeRating} / ${match.away}${baseline.awayRating}`, note: "先用球队强弱、是否东道主/近似主场、阶段属性建立现实底盘，避免强弱队被随机等权处理。" },
    { label: "基线三势", value: `主${Math.round(baseline.home)} · 客${Math.round(baseline.away)} · 和${Math.round(baseline.draw)}`, note: baseline.note },
    { label: "盘面修正", value: `主${signed(cast.tilt.home)} · 客${signed(cast.tilt.away)} · 和${signed(cast.tilt.draw)}`, note: "每一种玄学方法独立给出修正量；最终胜负由现实底盘与盘面修正共同决定。" },
    { label: "主队势能", value: `${homeSignal}`, note: `${match.home} 的现实强弱、开球时空和本法象意合参。` },
    { label: "客队势能", value: `${awaySignal}`, note: `${match.away} 的现实强弱、开球时空和本法象意合参。` },
    { label: "平局牵引", value: `${drawSignal}`, note: `用强弱差、阶段属性、场馆气口和本法阻滞象判断是否容易僵持。` },
    { label: "比分落点", value: `${score.home}-${score.away}`, note: `由进攻势能、平局牵引和胜平负落点换算成比分。` }
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
    const [upperTrigram, lowerTrigram] = cast.tokens;
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
        { label: "上卦", value: upperTrigram, note: "取比赛日期与主队名定外势" },
        { label: "下卦", value: lowerTrigram, note: "取开球时间与客队名定内势" },
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

type MatchBaseline = {
  home: number;
  away: number;
  draw: number;
  homeRating: number;
  awayRating: number;
  note: string;
};

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

type AstroContext = {
  instant: Date;
  timeBasis: string;
  sun: EclipticPoint;
  moon: EclipticPoint;
  mercury: EclipticPoint;
  venus: EclipticPoint;
  mars: EclipticPoint;
  jupiter: EclipticPoint;
  saturn: EclipticPoint;
  majorAspect: string;
};

type EclipticPoint = {
  body: string;
  longitude: number;
  sign: string;
  degreeInSign: number;
};

type LunisolarContext = {
  lunarLabel: string;
  pillars: string;
  lunarYear: number;
  lunarMonth: number;
  lunarDay: number;
  hourBranch: string;
  hourPillar: string;
  term: string;
};

function buildMatchBaseline(match: WorldCupMatch): MatchBaseline {
  const homeRating = getTeamPower(match.home);
  const awayRating = getTeamPower(match.away);
  const hostBonus = getHostBonus(match);
  const ratingDelta = homeRating - awayRating + hostBonus;
  const phaseDrawLift = match.phase === "小组赛" ? 4 : -5;
  const closeMatchLift = Math.max(0, 8 - Math.abs(ratingDelta) * 0.25);
  const home = clamp(52 + ratingDelta * 0.58, 20, 92);
  const away = clamp(52 - ratingDelta * 0.58, 20, 92);
  const draw = clamp(30 + phaseDrawLift + closeMatchLift - Math.abs(ratingDelta) * 0.16, 10, 58);

  return {
    home,
    away,
    draw,
    homeRating,
    awayRating,
    note:
      hostBonus > 0
        ? `现实底盘：${match.home}获得近似主场修正，强弱差 ${Math.round(ratingDelta)}。`
        : `现实底盘：按球队强弱差 ${Math.round(ratingDelta)}、${match.phase}和中立场地校准。`
  };
}

function getTeamPower(team: string) {
  return teamPowerRatings[team] ?? 70;
}

function getHostBonus(match: WorldCupMatch) {
  if ((match.home === "美国" || match.away === "美国") && match.country === "美国") {
    return match.home === "美国" ? 5 : -5;
  }
  if ((match.home === "加拿大" || match.away === "加拿大") && match.country === "加拿大") {
    return match.home === "加拿大" ? 5 : -5;
  }
  if ((match.home === "墨西哥" || match.away === "墨西哥") && match.country === "墨西哥") {
    return match.home === "墨西哥" ? 5 : -5;
  }
  return 0;
}

function estimateGoals(ownSignal: number, opponentSignal: number, drawSignal: number, side: "home" | "away", seed: number) {
  const attackShare = ownSignal / Math.max(1, ownSignal + opponentSignal);
  const matchTempo = clamp((ownSignal + opponentSignal - drawSignal * 0.55) / 48, 1.35, 4.4);
  const fortuneNibble = side === "home" ? seed % 2 : (seed >> 3) % 2;
  return clamp(Math.round(attackShare * matchTempo + fortuneNibble - (drawSignal > 50 ? 0.25 : 0)), 0, 5);
}

function scoreTarotCard(card: (typeof tarotDeck)[number] & { reversed: boolean }) {
  const arcanaWeight = card.arcana === "大阿尔卡那" ? 4 : 1;
  const suitWeight = card.element === "火" ? 4 : card.element === "土" ? 2 : card.element === "水" ? -1 : 3;
  const raw = arcanaWeight + suitWeight + (card.power % 10) - 4;
  return card.reversed ? -Math.round(raw * 0.8) : raw;
}

function scoreQimenDoor(door: string) {
  const scores: Record<string, number> = {
    开门: 9,
    生门: 8,
    景门: 6,
    休门: 3,
    杜门: -2,
    伤门: -3,
    惊门: -4,
    死门: -7
  };
  return scores[door] ?? 0;
}

function scoreQimenStar(star: string) {
  const scores: Record<string, number> = {
    天心: 8,
    天任: 6,
    天辅: 5,
    天英: 4,
    天冲: 2,
    天禽: 1,
    天蓬: -1,
    天柱: -4,
    天芮: -6
  };
  return scores[star] ?? 0;
}

function scoreQimenGod(god: string) {
  const scores: Record<string, number> = {
    九天: 6,
    值符: 5,
    六合: 4,
    太阴: 2,
    九地: 1,
    腾蛇: -3,
    玄武: -4,
    白虎: -5
  };
  return scores[god] ?? 0;
}

function signed(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function castMethod(methodId: MethodId, match: WorldCupMatch, seed: number, astroContext: AstroContext, lunisolarContext: LunisolarContext): MethodCast {
  const dateParts = getDateParts(match);
  const timeIndex = getTimeBranchIndex(match.localTime);

  if (methodId === "tarot") {
    const deck = shuffleDeck(tarotDeck, seed);
    const drawn = deck.slice(0, 3).map((card, index) => ({
      ...card,
      reversed: indexFromSeed(seed, index * 5, 2) === 1
    }));
    const spread = drawn.map((card) => `${card.name}${card.reversed ? "逆位" : "正位"}`);
    const cardValues = drawn.map(scoreTarotCard);
    return {
      titleToken: spread[2],
      tokens: spread,
      tilt: {
        home: cardValues[0] + drawn[0].attack - drawn[0].defense,
        away: cardValues[1] + drawn[1].defense - drawn[1].attack,
        draw: drawn[2].draw + (drawn[2].reversed ? 7 : -2) + (Math.abs(cardValues[0] - cardValues[1]) <= 3 ? 5 : 0)
      },
      steps: [
        { label: "78张牌库", value: "22张大阿尔卡那 + 56张小阿尔卡那", note: "使用完整塔罗结构，大小牌都会进入洗牌池。" },
        { label: "洗牌种子", value: `${seed % 100000}`, note: "以比赛信息固定洗牌，避免刷新页面导致结果乱跳。" },
        { label: "牌阵抽取", value: spread.join(" / "), note: "三张牌分别进入气势、转折、落点位置，并参与胜平负加权。" },
        { label: "正逆位", value: drawn.map((card) => `${card.name}:${card.reversed ? "逆" : "正"}`).join(" / "), note: "逆位会削弱对应方势能，并提高不稳定或平局牵引。" },
        { label: "元素权重", value: drawn.map((card) => `${card.element}${card.power}`).join(" / "), note: "火偏进攻，土偏防守，水偏僵持，风偏转换。" }
      ]
    };
  }

  if (methodId === "liuren") {
    const monthIndex = (lunisolarContext.lunarMonth - 1) % liurenStates.length;
    const dayIndex = (monthIndex + lunisolarContext.lunarDay - 1) % liurenStates.length;
    const hourIndex = (dayIndex + timeIndex) % liurenStates.length;
    const states = [liurenStates[monthIndex], liurenStates[dayIndex], liurenStates[hourIndex]];
    const finalJudgement = liurenJudgements[states[2]];
    return {
      titleToken: states[2],
      tokens: [states[2], `${states[0]} / ${states[1]}`],
      tilt: {
        home: liurenJudgements[states[0]].home + liurenJudgements[states[2]].home - 9,
        away: liurenJudgements[states[1]].away + liurenJudgements[states[2]].away - 9,
        draw: finalJudgement.draw + (states.includes("留连") ? 5 : 0) + (states.includes("空亡") ? 4 : 0) - 4
      },
      steps: [
        { label: "农历日期", value: lunisolarContext.lunarLabel, note: "由 solarlunar 将公历比赛日换算为农历日期。" },
        { label: "干支四柱", value: lunisolarContext.pillars, note: "年、月、日来自历法库，时柱按开球时辰补入。" },
        { label: "报时起课", value: "大安起月，月上起日，日上起时", note: "按常见小六壬报时起课法顺推六位。" },
        { label: "月日时起课", value: `${lunisolarContext.lunarMonth}月 -> ${lunisolarContext.lunarDay}日 -> ${lunisolarContext.hourBranch}`, note: "按农历月日和开球时辰，从月份起大安，日上再推时辰。" },
        { label: "三宫落点", value: states.join(" / "), note: "月宫看主队外势，日宫看客队来势，时宫看终局气口。" },
        { label: "吉凶分层", value: `${finalJudgement.level} · ${finalJudgement.text}`, note: "大安、速喜、小吉偏吉；留连、赤口、空亡偏阻滞。" },
        { label: "六神判词", value: Object.entries(liurenJudgements).map(([name, item]) => `${name}:${item.level}`).join(" / "), note: "用六神性质修正主客势能和平局牵引。" }
      ]
    };
  }

  if (methodId === "astro") {
    const planetPoint = [astroContext.sun, astroContext.moon, astroContext.mercury, astroContext.venus, astroContext.mars, astroContext.jupiter, astroContext.saturn][indexFromSeed(seed, 0, 7)];
    const planet = planetPoint.body;
    const sign = planetPoint.sign;
    const house = astroHouses[Math.floor(astroContext.moon.longitude / 30) % astroHouses.length];
    const planetPower = astroPlanets.indexOf(planet) + 1;
    const signPower = astroSigns.indexOf(sign) + 1;
    const housePower = astroHouses.indexOf(house) + 1;
    const aspectPressure = astroContext.majorAspect.includes("冲相") || astroContext.majorAspect.includes("刑相") ? 5 : 0;
    const fireAirBoost = ["白羊座", "狮子座", "射手座", "双子座", "天秤座", "水瓶座"].includes(sign) ? 4 : 0;
    const earthWaterDrag = ["金牛座", "巨蟹座", "处女座", "摩羯座", "双鱼座"].includes(sign) ? 4 : 0;
    return {
      titleToken: `${planet}入${sign}`,
      tokens: [planet, sign, house],
      tilt: {
        home: planetPower + fireAirBoost - 7 + (housePower === 1 || housePower === 10 ? 4 : 0),
        away: signPower - 7 + (housePower === 7 || housePower === 8 ? 5 : 0),
        draw: earthWaterDrag + aspectPressure + (housePower === 4 || housePower === 12 ? 4 : 0) - 3
      },
      steps: [
        { label: "赛时星历", value: astroContext.timeBasis, note: "由 Astronomy Engine 按比赛当地时间折算 UTC 后计算地心黄道坐标。" },
        { label: "太阳黄经", value: formatEclipticPoint(astroContext.sun), note: "太阳位置用于判断比赛大势与整体节奏。" },
        { label: "月亮黄经", value: formatEclipticPoint(astroContext.moon), note: "月亮位置用于判断临场波动和情绪节奏。" },
        { label: "主要相位", value: astroContext.majorAspect, note: "取赛时最接近的主要相位，修正爆冷与对抗强度。" },
        { label: "三骰结果", value: `${planet} / ${sign} / ${house}`, note: "三颗骰子分别对应能量来源、表现方式和落入领域。" },
        { label: "星骰加权", value: `${planetPower}-${signPower}-${housePower}`, note: "行星偏主动力，星座偏对抗形态，宫位偏比赛场景。" },
        { label: "庙旺弱陷", value: planetDignities[planet], note: "用行星传统强弱象意决定主动性或保守性。" },
        { label: "三骰合参", value: `${planet}主能量，${sign}主表现，${house}主落点`, note: "三骰不单独断，组合后再进入比分模型。" },
        { label: "宫位主题", value: houseThemes[housePower - 1], note: "宫位主题用于判断优势落在射门、协作、防守或隐患。" }
      ]
    };
  }

  if (methodId === "meihua") {
    const upperIndex = (lunisolarContext.lunarYear + lunisolarContext.lunarMonth + lunisolarContext.lunarDay) % trigrams.length;
    const lowerIndex = (lunisolarContext.lunarMonth + lunisolarContext.lunarDay + dateParts.hour) % trigrams.length;
    const movingLine = ((lunisolarContext.lunarYear + lunisolarContext.lunarMonth + lunisolarContext.lunarDay + dateParts.hour) % 6) + 1;
    const hexagram = `${trigrams[upperIndex]}${trigrams[lowerIndex]}`;
    const changed = `${trigrams[(upperIndex + movingLine) % trigrams.length]}${trigrams[(lowerIndex + movingLine) % trigrams.length]}`;
    const mutual = buildMutualHexagram(trigrams[upperIndex], trigrams[lowerIndex]);
    const bodyUse = movingLine <= 3 ? "上卦为体，下卦为用" : "下卦为体，上卦为用";
    const primaryHexagram = resolveHexagram(hexagram);
    const changedHexagram = resolveHexagram(changed);
    const bodyTrigram = movingLine <= 3 ? trigrams[upperIndex] : trigrams[lowerIndex];
    const useTrigram = movingLine <= 3 ? trigrams[lowerIndex] : trigrams[upperIndex];
    const bodyElement = trigramElements[bodyTrigram];
    const useElement = trigramElements[useTrigram];
    const relation = getElementRelation(bodyElement, useElement);
    return {
      titleToken: primaryHexagram.name,
      tokens: [trigrams[upperIndex], trigrams[lowerIndex], `${movingLine}`, changed],
      tilt: {
        home: upperIndex + movingLine + (relation.includes("用生体") ? 9 : relation.includes("体克用") ? 7 : relation.includes("体用同气") ? 2 : -4),
        away: lowerIndex + Math.ceil(movingLine / 2) + (relation.includes("用克体") ? 9 : relation.includes("体生用") ? 5 : relation.includes("体用同气") ? 2 : -3),
        draw: movingLine % 2 === 0 ? 8 : -2 + (relation.includes("同气") ? 7 : 0)
      },
      steps: [
        { label: "农历日期", value: lunisolarContext.lunarLabel, note: "梅花起卦改用农历年月日作为时空底数。" },
        { label: "干支四柱", value: lunisolarContext.pillars, note: "用于标记起卦时空，不再只取公历日期。" },
        { label: "年月日时", value: `${lunisolarContext.lunarYear}+${lunisolarContext.lunarMonth}+${lunisolarContext.lunarDay}+${dateParts.hour}`, note: "用农历年月日时起数，上卦取年月日，下卦加入时数。" },
        { label: "周易64卦", value: "文王卦序 1-64", note: "以完整 64 卦目录定位本卦、互卦与变卦。" },
        { label: "卦序卦名", value: `第${primaryHexagram.number}卦 ${primaryHexagram.name}`, note: `变卦为第${changedHexagram.number}卦 ${changedHexagram.name}。` },
        { label: "卦辞象意", value: primaryHexagram.image, note: "这里使用自写短象意，不搬运长篇经典译文。" },
        { label: "体用五行", value: `体:${bodyTrigram}${bodyElement} / 用:${useTrigram}${useElement}`, note: bodyUse },
        { label: "生克关系", value: relation, note: "体用生克用于修正主客势能。" },
        { label: "本互变卦", value: `${hexagram} -> ${mutual} -> ${changed}`, note: `第 ${movingLine} 爻动，互卦看过程，变卦看结果。` },
        { label: "体用定位", value: bodyUse, note: "体为自身根基，用为对手与外部变化。" },
        { label: "互卦", value: mutual, note: "取二三四爻、三四五爻组成互卦，观察比赛中段走势。" },
        { label: "变卦", value: changed, note: "动爻变化后的卦象用于修正终局比分。" }
      ]
    };
  }

  if (methodId === "qimen") {
    const chart = getQimenChart(match);
    const door = normalizeQimenName(chart.valueDoor);
    const star = normalizeQimenName(chart.valueStar);
    const palace = chart.valueStarPalace;
    const god = chart.godLayer.find((item) => item) ?? "值符";
    const doorScore = scoreQimenDoor(door);
    const starScore = scoreQimenStar(star);
    const godScore = scoreQimenGod(god);
    return {
      titleToken: door,
      tokens: [door, star, palace, god, chart.yinYang, `${chart.ju}`],
      tilt: {
        home: chart.ju + doorScore + (chart.yinYang === "陽" ? 3 : -1) + (palace.includes("乾") || palace.includes("离") ? 3 : 0),
        away: starScore + godScore + (chart.yinYang === "陰" ? 3 : -1) + (palace.includes("坎") || palace.includes("兑") ? 3 : 0),
        draw: palace.includes("中") || palace.includes("坤") || god === "六合" ? 10 : door === "杜门" || door === "死门" ? 7 : -2
      },
      steps: [
        { label: "农历日期", value: lunisolarContext.lunarLabel, note: "奇门局数使用节气/干支语境，当前以历法库农历信息作底座。" },
        { label: "干支四柱", value: lunisolarContext.pillars, note: "年、月、日干支来自历法库，时柱由日干和开球时辰推得。" },
        { label: "拆补法定局", value: `${chart.jieqi}${chart.sanyuan} · ${chart.yinYang}遁${chart.ju}局`, note: "由 qimen-dunjia 库按日期时间自动判节气、三元、阴阳遁与局数。" },
        { label: "旬首符首", value: `${chart.xunHead} / ${chart.fuHead}`, note: "旬首定位甲遁，符首决定值符值使起点。" },
        { label: "阴阳遁", value: `${chart.yinYang}遁${chart.ju}局`, note: "使用外部奇门排盘库的拆补法定局结果。" },
        { label: "局数排宫", value: `第${chart.ju}局 · ${chart.hourPillar}`, note: "以四柱和局数生成九宫盘。" },
        { label: "门星宫", value: `${door} / ${star} / ${palace}`, note: "门看进攻打开方式，星看执行者，宫看优势落点。" },
        { label: "值符值使", value: `${star}为值符，${door}为值使`, note: "值符定主线，值使定执行路径。" },
        { label: "天盘地盘", value: `天盘:${chart.heavenPlate.join(" ")} / 地盘:${chart.earthPlate.join(" ")}`, note: "天盘随时辰飞布，地盘为三奇六仪基础层。" },
        { label: "三奇六仪", value: `地盘:${chart.earthPlate.join(" ")}；天盘:${chart.heavenPlate.join(" ")}`, note: "乙丙丁为三奇，戊己庚辛壬癸为六仪。" },
        { label: "八神", value: chart.godLayer.filter(Boolean).join(" / "), note: "八神层用于修正临场变数、犯错和突发性。" }
      ]
    };
  }

  const lotNumber = (seed % 64) + 1;
  const lot = oracleLots[lotNumber % oracleLots.length];
  const poem = oraclePoems[lotNumber % oraclePoems.length];
  const image = oracleImages[lotNumber % oracleImages.length];
  return {
    titleToken: lot,
    tokens: [`第${lotNumber}签`, poem, image],
    tilt: {
      home: (lotNumber % 12) + (poem.includes("喜") || poem.includes("进") ? 5 : 0) - 6,
      away: ((lotNumber >> 1) % 12) + (poem.includes("反") || poem.includes("后") ? 5 : 0) - 6,
      draw: lot.includes("守") || poem.includes("守") || image.includes("坤") ? 10 : (lotNumber % 6) - 2
    },
    steps: [
      { label: "签号", value: `第${lotNumber}签`, note: "以比赛、球队、开球时间合成签号，固定同场同法的抽签结果。" },
      { label: "签诗", value: poem, note: "签诗关键词参与胜负、平局和比分修正。" },
      { label: "签诗卦象", value: image, note: "把签诗转为八卦取象，增强解签结构。" },
      { label: "签意权重", value: `${lot} / ${image}`, note: "签等定强弱，卦象定攻守，签诗定走势。" },
      { label: "解签方向", value: poem.includes("守") ? "守势优先" : poem.includes("急") || poem.includes("进") ? "攻势优先" : "变局优先", note: "将签意落到足球语境的胜平负方向。" }
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

function shuffleDeck<T>(deck: T[], seed: number) {
  const result = [...deck];
  let state = seed;
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = stableHash(`${state}:${index}`);
    const swapIndex = state % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function buildMutualHexagram(upper: string, lower: string) {
  const lines = [...trigramLines[lower], ...trigramLines[upper]];
  const lowerMutual = trigramFromLines(lines.slice(1, 4));
  const upperMutual = trigramFromLines(lines.slice(2, 5));
  return `${upperMutual}${lowerMutual}`;
}

function trigramFromLines(lines: number[]) {
  return Object.entries(trigramLines).find(([, value]) => value.join("") === lines.join(""))?.[0] ?? "乾";
}

function resolveHexagram(pair: string) {
  const lines = pair
    .split("")
    .flatMap((trigram) => trigramLines[trigram] ?? [])
    .join("");
  const binaryIndex = parseInt(lines || "0", 2);
  const number = (binaryIndex % 64) + 1;
  const name = kingWenHexagrams[number - 1];
  return {
    number,
    name,
    image: `${hexagramImages[number % hexagramImages.length]}之象，${name.includes("既济") ? "事有成局" : name.includes("未济") ? "未定待成" : "以动静消长断势"}`
  };
}

function getElementRelation(bodyElement: string, useElement: string) {
  if (bodyElement === useElement) {
    return "体用同气，主客势均，比赛更看临场细节";
  }
  if (elementGenerates[useElement] === bodyElement) {
    return "用生体，外势助我，主队承势";
  }
  if (elementGenerates[bodyElement] === useElement) {
    return "体生用，我去生彼，主队耗力";
  }
  if (elementControls[bodyElement] === useElement) {
    return "体克用，我能制彼，主队有压制力";
  }
  if (elementControls[useElement] === bodyElement) {
    return "用克体，客势压我，防反与失误风险增";
  }
  return "体用关系平缓";
}

type QimenChartInfo = {
  jieqi: string;
  sanyuan: string;
  yinYang: string;
  ju: number;
  xunHead: string;
  fuHead: string;
  valueDoor: string;
  valueStar: string;
  valueStarPalace: string;
  hourPillar: string;
  earthPlate: string[];
  heavenPlate: string[];
  godLayer: string[];
};

function getQimenChart(match: WorldCupMatch): QimenChartInfo {
  const { year, month, day, hour } = getDateParts(match);
  const chart = generateChartByDatetime(`${year}${pad2(month)}${pad2(day)}${pad2(hour)}`);
  const obj = chartToObject(chart) as Record<string, unknown>;
  const stars = arrayValue(obj["九星"]);
  const valueStar = stringValue(obj["值符"], "天禽");
  const valueStarIndex = Math.max(0, stars.indexOf(valueStar));
  return {
    jieqi: stringValue(obj["節氣"], lunisolarFallbackTerm(match)),
    sanyuan: stringValue(obj["三元"], "中元"),
    yinYang: stringValue(obj["陰陽"], "陽"),
    ju: numberValue(obj["局數"], 1),
    xunHead: stringValue(obj["旬首"], "甲子"),
    fuHead: stringValue(obj["符首"], "戊"),
    valueDoor: stringValue(obj["值使"], "开门"),
    valueStar,
    valueStarPalace: qimenPalaces[valueStarIndex] ?? "中五宫",
    hourPillar: stringValue(obj["時柱"], getTimeBranchName(match.localTime)),
    earthPlate: arrayValue(obj["地盤"]),
    heavenPlate: arrayValue(obj["天盤"]),
    godLayer: arrayValue(obj["八神"])
  };
}

function normalizeQimenName(value: string) {
  return value.replace(/門/g, "门");
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item || "")) : [];
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" ? value : Number(value) || fallback;
}

function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

function lunisolarFallbackTerm(match: WorldCupMatch) {
  return getLunisolarContext(match).term || "节气未标注";
}

function getAstroContext(match: WorldCupMatch): AstroContext {
  const instant = getMatchInstant(match);
  const points = Object.fromEntries(astronomyBodies.map(([name, body]) => [name, getEclipticPoint(name, body, instant)])) as Record<string, EclipticPoint>;
  return {
    instant,
    timeBasis: `${instant.toISOString().replace(".000Z", "Z")} · ${match.city}当地${match.localTime}`,
    sun: points["太阳"],
    moon: points["月亮"],
    mercury: points["水星"],
    venus: points["金星"],
    mars: points["火星"],
    jupiter: points["木星"],
    saturn: points["土星"],
    majorAspect: findMajorAspect(Object.values(points))
  };
}

function getEclipticPoint(bodyName: string, body: Astronomy.Body, instant: Date): EclipticPoint {
  const vector = Astronomy.GeoVector(body, instant, true);
  const ecliptic = Astronomy.Ecliptic(vector);
  const longitude = positiveModulo(ecliptic.elon, 360);
  const signIndex = Math.floor(longitude / 30);
  return {
    body: bodyName,
    longitude,
    sign: westernSigns[signIndex],
    degreeInSign: longitude % 30
  };
}

function findMajorAspect(points: EclipticPoint[]) {
  const aspects = [
    { name: "合相", angle: 0 },
    { name: "六合", angle: 60 },
    { name: "刑相", angle: 90 },
    { name: "拱相", angle: 120 },
    { name: "冲相", angle: 180 }
  ];
  let best = { label: "无精确主要相位", orb: 999 };
  for (let left = 0; left < points.length; left += 1) {
    for (let right = left + 1; right < points.length; right += 1) {
      const separation = angularDistance(points[left].longitude, points[right].longitude);
      for (const aspect of aspects) {
        const orb = Math.abs(separation - aspect.angle);
        if (orb < best.orb) {
          best = {
            label: `${points[left].body}${aspect.name}${points[right].body}，容许度${orb.toFixed(1)}°`,
            orb
          };
        }
      }
    }
  }
  return best.label;
}

function angularDistance(left: number, right: number) {
  const diff = Math.abs(positiveModulo(left - right, 360));
  return diff > 180 ? 360 - diff : diff;
}

function formatEclipticPoint(point: EclipticPoint) {
  return `${point.longitude.toFixed(2)}° · ${point.sign}`;
}

function getLunisolarContext(match: WorldCupMatch): LunisolarContext {
  const { year, month, day, hour } = getDateParts(match);
  const lunar = solarLunar.solar2lunar(year, month, day);
  if (lunar === -1) {
    return {
      lunarLabel: `农历未知 · ${match.date}`,
      pillars: `年未知 月未知 日未知 ${getTimeBranchName(match.localTime)}时`,
      lunarYear: year,
      lunarMonth: month,
      lunarDay: day,
      hourBranch: getTimeBranchName(match.localTime),
      hourPillar: getTimeBranchName(match.localTime),
      term: ""
    };
  }
  const dayGanIndex = solarLunar.gan.indexOf(lunar.gzDay.slice(0, 1));
  const hourPillar = solarLunar.getShiChen(hour, Math.max(0, dayGanIndex));
  const hourBranch = `${hourPillar.slice(1)}时`;
  return {
    lunarLabel: `农历${lunar.yearCn}${lunar.monthCn}${lunar.dayCn}${lunar.isLeap ? "闰月" : ""}${lunar.term ? ` · ${lunar.term}` : ""}`,
    pillars: `${lunar.gzYear}年 ${lunar.gzMonth}月 ${lunar.gzDay}日 ${hourPillar}时`,
    lunarYear: lunar.lYear,
    lunarMonth: lunar.lMonth,
    lunarDay: lunar.lDay,
    hourBranch,
    hourPillar,
    term: lunar.term
  };
}

function getMatchInstant(match: WorldCupMatch) {
  const { year, month, day, hour } = getDateParts(match);
  const minute = Number(match.localTime.split(":")[1]);
  const utcOffset = cityUtcOffsets[match.city] ?? -5;
  return new Date(Date.UTC(year, month - 1, day, hour - utcOffset, minute));
}

function indexFromSeed(seed: number, divisorPower: number, length: number) {
  return Math.floor(seed / 2 ** divisorPower) % length;
}

function positiveModulo(value: number, length: number) {
  return ((value % length) + length) % length;
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
