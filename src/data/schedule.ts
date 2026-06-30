export type MatchPhase = "小组赛" | "淘汰赛";
export type MatchStatus = "finished" | "live" | "upcoming";

export type MatchResult = {
  home: number;
  away: number;
  status: MatchStatus;
  minute?: string;
  source: string;
};

export type OddsSnapshot = {
  home: string;
  draw: string;
  away: string;
  totalLine: string;
  over: string;
  under: string;
  bookmaker: string;
  updatedAt: string;
  locked: boolean;
  provider?: string;
  sourceUrl?: string;
};

export type WorldCupMatch = {
  id: string;
  date: string;
  localTime: string;
  group: string;
  phase: MatchPhase;
  home: string;
  away: string;
  venue: string;
  city: string;
  country: string;
  source: string;
  lastUpdated: string;
  result?: MatchResult;
  odds?: OddsSnapshot;
};

export const worldCupMatches: WorldCupMatch[] = [
  {
    id: "2026-06-23-por-uzb",
    date: "2026-06-23",
    localTime: "12:00",
    group: "K组",
    phase: "小组赛",
    home: "葡萄牙",
    away: "乌兹别克斯坦",
    venue: "Houston Stadium",
    city: "休斯敦",
    country: "美国",
    source: "FIFA / ESPN / FOX, 2026-06-23",
    lastUpdated: "2026-06-24",
    result: {
      home: 5,
      away: 0,
      status: "finished",
      source: "ESPN / CBS Sports / Guardian, 2026-06-23"
    },
    odds: {
      home: "-650",
      draw: "+750",
      away: "+2000",
      totalLine: "3.5",
      over: "+120",
      under: "-148",
      bookmaker: "Oddschecker / Action Network snapshot",
      updatedAt: "赛前快照 2026-06-23",
      locked: false,
      provider: "manual-snapshot"
    }
  },
  {
    id: "2026-06-23-eng-gha",
    date: "2026-06-23",
    localTime: "16:00",
    group: "L组",
    phase: "小组赛",
    home: "英格兰",
    away: "加纳",
    venue: "Boston Stadium",
    city: "波士顿",
    country: "美国",
    source: "FIFA / ESPN / FOX, 2026-06-23",
    lastUpdated: "2026-06-23",
    odds: {
      home: "-210",
      draw: "+340",
      away: "+650",
      totalLine: "2.5",
      over: "-105",
      under: "-115",
      bookmaker: "盘口模块演示",
      updatedAt: "待接实时源",
      locked: true,
      provider: "demo-market-data"
    }
  },
  {
    id: "2026-06-23-pan-cro",
    date: "2026-06-23",
    localTime: "19:00",
    group: "L组",
    phase: "小组赛",
    home: "巴拿马",
    away: "克罗地亚",
    venue: "Toronto Stadium",
    city: "多伦多",
    country: "加拿大",
    source: "FIFA / ESPN / FOX, 2026-06-23",
    lastUpdated: "2026-06-23",
    odds: {
      home: "+700",
      draw: "+380",
      away: "-240",
      totalLine: "2.5",
      over: "+100",
      under: "-120",
      bookmaker: "盘口模块演示",
      updatedAt: "待接实时源",
      locked: true,
      provider: "demo-market-data"
    }
  },
  {
    id: "2026-06-23-col-cod",
    date: "2026-06-23",
    localTime: "20:00",
    group: "K组",
    phase: "小组赛",
    home: "哥伦比亚",
    away: "刚果民主共和国",
    venue: "Guadalajara Stadium",
    city: "瓜达拉哈拉",
    country: "墨西哥",
    source: "FIFA / ESPN / FOX, 2026-06-23",
    lastUpdated: "2026-06-23",
    odds: {
      home: "-155",
      draw: "+295",
      away: "+430",
      totalLine: "2.5",
      over: "+105",
      under: "-125",
      bookmaker: "盘口模块演示",
      updatedAt: "待接实时源",
      locked: true,
      provider: "demo-market-data"
    }
  },
  {
    id: "2026-06-24-mar-hai",
    date: "2026-06-24",
    localTime: "18:00",
    group: "小组赛",
    phase: "小组赛",
    home: "摩洛哥",
    away: "海地",
    venue: "Atlanta Stadium",
    city: "亚特兰大",
    country: "美国",
    source: "Atlanta FIFA World Cup 26 host city schedule",
    lastUpdated: "2026-06-23",
    odds: {
      home: "-380",
      draw: "+470",
      away: "+980",
      totalLine: "2.5",
      over: "-130",
      under: "+110",
      bookmaker: "盘口模块演示",
      updatedAt: "待接实时源",
      locked: true,
      provider: "demo-market-data"
    }
  },
  {
    id: "2026-06-25-usa-tur",
    date: "2026-06-25",
    localTime: "19:00",
    group: "D组",
    phase: "小组赛",
    home: "美国",
    away: "土耳其",
    venue: "Los Angeles Stadium",
    city: "洛杉矶",
    country: "美国",
    source: "FOX / FIFA, 2026-06-23",
    lastUpdated: "2026-06-23",
    odds: {
      home: "+155",
      draw: "+240",
      away: "+175",
      totalLine: "2.5",
      over: "+100",
      under: "-120",
      bookmaker: "盘口模块演示",
      updatedAt: "待接实时源",
      locked: true,
      provider: "demo-market-data"
    }
  },
  {
    id: "2026-06-25-jpn-swe",
    date: "2026-06-25",
    localTime: "18:00",
    group: "小组赛",
    phase: "小组赛",
    home: "日本",
    away: "瑞典",
    venue: "Dallas Stadium",
    city: "达拉斯",
    country: "美国",
    source: "Dallas FIFA World Cup 26 host city schedule",
    lastUpdated: "2026-06-23"
  },
  {
    id: "2026-06-27-eng-pan",
    date: "2026-06-27",
    localTime: "19:00",
    group: "L组",
    phase: "小组赛",
    home: "英格兰",
    away: "巴拿马",
    venue: "New York New Jersey Stadium",
    city: "纽约/新泽西",
    country: "美国",
    source: "talkSPORT / FIFA, 2026-06-23",
    lastUpdated: "2026-06-23"
  },
  {
    id: "2026-06-27-jor-arg",
    date: "2026-06-27",
    localTime: "21:00",
    group: "小组赛",
    phase: "小组赛",
    home: "约旦",
    away: "阿根廷",
    venue: "Dallas Stadium",
    city: "达拉斯",
    country: "美国",
    source: "Dallas FIFA World Cup 26 host city schedule",
    lastUpdated: "2026-06-23"
  },
  {
    id: "2026-06-28-r32-rsa-can",
    date: "2026-06-28",
    localTime: "12:00",
    group: "32强",
    phase: "淘汰赛",
    home: "南非",
    away: "加拿大",
    venue: "SoFi Stadium",
    city: "英格尔伍德",
    country: "美国",
    source: "ESPN scoreboard API / FIFA World Cup 2026 · gameId 760486",
    lastUpdated: "2026-06-30"
  },
  {
    id: "2026-06-29-r32-bra-jpn",
    date: "2026-06-29",
    localTime: "12:00",
    group: "32强",
    phase: "淘汰赛",
    home: "巴西",
    away: "日本",
    venue: "NRG Stadium",
    city: "休斯敦",
    country: "美国",
    source: "ESPN scoreboard API / FIFA World Cup 2026 · gameId 760487",
    lastUpdated: "2026-06-30"
  },
  {
    id: "2026-06-29-r32-ger-par",
    date: "2026-06-29",
    localTime: "16:30",
    group: "32强",
    phase: "淘汰赛",
    home: "德国",
    away: "巴拉圭",
    venue: "Gillette Stadium",
    city: "福克斯伯勒",
    country: "美国",
    source: "ESPN scoreboard API / FIFA World Cup 2026 · gameId 760489",
    lastUpdated: "2026-06-30"
  },
  {
    id: "2026-06-29-r32-ned-mar",
    date: "2026-06-29",
    localTime: "19:00",
    group: "32强",
    phase: "淘汰赛",
    home: "荷兰",
    away: "摩洛哥",
    venue: "Estadio BBVA",
    city: "瓜达卢佩",
    country: "墨西哥",
    source: "ESPN scoreboard API / FIFA World Cup 2026 · gameId 760488",
    lastUpdated: "2026-06-30"
  },
  {
    id: "2026-06-30-r32-civ-nor",
    date: "2026-06-30",
    localTime: "12:00",
    group: "32强",
    phase: "淘汰赛",
    home: "科特迪瓦",
    away: "挪威",
    venue: "AT&T Stadium",
    city: "阿灵顿",
    country: "美国",
    source: "ESPN scoreboard API / FIFA World Cup 2026 · gameId 760490",
    lastUpdated: "2026-06-30"
  },
  {
    id: "2026-06-30-r32-fra-swe",
    date: "2026-06-30",
    localTime: "17:00",
    group: "32强",
    phase: "淘汰赛",
    home: "法国",
    away: "瑞典",
    venue: "MetLife Stadium",
    city: "东卢瑟福",
    country: "美国",
    source: "ESPN scoreboard API / FIFA World Cup 2026 · gameId 760492",
    lastUpdated: "2026-06-30"
  },
  {
    id: "2026-06-30-r32-mex-ecu",
    date: "2026-06-30",
    localTime: "19:00",
    group: "32强",
    phase: "淘汰赛",
    home: "墨西哥",
    away: "厄瓜多尔",
    venue: "Estadio Banorte",
    city: "墨西哥城",
    country: "墨西哥",
    source: "ESPN scoreboard API / FIFA World Cup 2026 · gameId 760491",
    lastUpdated: "2026-06-30"
  },
  {
    id: "2026-07-01-r32-eng-cod",
    date: "2026-07-01",
    localTime: "12:00",
    group: "32强",
    phase: "淘汰赛",
    home: "英格兰",
    away: "刚果民主共和国",
    venue: "Mercedes-Benz Stadium",
    city: "亚特兰大",
    country: "美国",
    source: "ESPN scoreboard API / FIFA World Cup 2026 · gameId 760495",
    lastUpdated: "2026-06-30"
  },
  {
    id: "2026-07-01-r32-bel-sen",
    date: "2026-07-01",
    localTime: "13:00",
    group: "32强",
    phase: "淘汰赛",
    home: "比利时",
    away: "塞内加尔",
    venue: "Lumen Field",
    city: "西雅图",
    country: "美国",
    source: "ESPN scoreboard API / FIFA World Cup 2026 · gameId 760493",
    lastUpdated: "2026-06-30"
  },
  {
    id: "2026-07-01-r32-usa-bih",
    date: "2026-07-01",
    localTime: "17:00",
    group: "32强",
    phase: "淘汰赛",
    home: "美国",
    away: "波黑",
    venue: "Levi's Stadium",
    city: "圣克拉拉",
    country: "美国",
    source: "ESPN scoreboard API / FIFA World Cup 2026 · gameId 760494",
    lastUpdated: "2026-06-30"
  },
  {
    id: "2026-07-02-r32-esp-aut",
    date: "2026-07-02",
    localTime: "12:00",
    group: "32强",
    phase: "淘汰赛",
    home: "西班牙",
    away: "奥地利",
    venue: "SoFi Stadium",
    city: "英格尔伍德",
    country: "美国",
    source: "ESPN scoreboard API / FIFA World Cup 2026 · gameId 760497",
    lastUpdated: "2026-06-30"
  },
  {
    id: "2026-07-02-r32-por-cro",
    date: "2026-07-02",
    localTime: "19:00",
    group: "32强",
    phase: "淘汰赛",
    home: "葡萄牙",
    away: "克罗地亚",
    venue: "BMO Field",
    city: "多伦多",
    country: "加拿大",
    source: "ESPN scoreboard API / FIFA World Cup 2026 · gameId 760496",
    lastUpdated: "2026-06-30"
  },
  {
    id: "2026-07-02-r32-sui-alg",
    date: "2026-07-02",
    localTime: "20:00",
    group: "32强",
    phase: "淘汰赛",
    home: "瑞士",
    away: "阿尔及利亚",
    venue: "BC Place",
    city: "温哥华",
    country: "加拿大",
    source: "ESPN scoreboard API / FIFA World Cup 2026 · gameId 760498",
    lastUpdated: "2026-06-30"
  },
  {
    id: "2026-07-03-r32-aus-egy",
    date: "2026-07-03",
    localTime: "13:00",
    group: "32强",
    phase: "淘汰赛",
    home: "澳大利亚",
    away: "埃及",
    venue: "AT&T Stadium",
    city: "阿灵顿",
    country: "美国",
    source: "ESPN scoreboard API / FIFA World Cup 2026 · gameId 760499",
    lastUpdated: "2026-06-30"
  },
  {
    id: "2026-07-03-r32-arg-cpv",
    date: "2026-07-03",
    localTime: "18:00",
    group: "32强",
    phase: "淘汰赛",
    home: "阿根廷",
    away: "佛得角",
    venue: "Hard Rock Stadium",
    city: "迈阿密花园",
    country: "美国",
    source: "ESPN scoreboard API / FIFA World Cup 2026 · gameId 760500",
    lastUpdated: "2026-06-30"
  },
  {
    id: "2026-07-03-r32-col-gha",
    date: "2026-07-03",
    localTime: "20:30",
    group: "32强",
    phase: "淘汰赛",
    home: "哥伦比亚",
    away: "加纳",
    venue: "GEHA Field at Arrowhead Stadium",
    city: "堪萨斯城",
    country: "美国",
    source: "ESPN scoreboard API / FIFA World Cup 2026 · gameId 760501",
    lastUpdated: "2026-06-30"
  }
];

const cityUtcOffsets: Record<string, number> = {
  休斯敦: -5,
  波士顿: -4,
  多伦多: -4,
  瓜达拉哈拉: -6,
  亚特兰大: -4,
  洛杉矶: -7,
  达拉斯: -5,
  "纽约/新泽西": -4,
  英格尔伍德: -7,
  福克斯伯勒: -4,
  瓜达卢佩: -6,
  阿灵顿: -5,
  东卢瑟福: -4,
  墨西哥城: -6,
  西雅图: -7,
  圣克拉拉: -7,
  温哥华: -7,
  迈阿密花园: -4,
  堪萨斯城: -5
};

export function formatLocalKickoff(match: WorldCupMatch) {
  const [year, month, day] = match.date.split("-");
  return `${month}/${day} ${match.localTime}`;
}

export function getChinaKickoffDate(match: WorldCupMatch) {
  return formatChinaParts(match).date;
}

export function formatChinaKickoff(match: WorldCupMatch) {
  const { month, day, time } = formatChinaParts(match);
  return `${month}/${day} ${time}`;
}

function formatChinaParts(match: WorldCupMatch) {
  const instant = getVenueInstant(match);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    month: values.month,
    day: values.day,
    time: `${values.hour}:${values.minute}`
  };
}

function getVenueInstant(match: WorldCupMatch) {
  const [year, month, day] = match.date.split("-").map(Number);
  const [hour, minute] = match.localTime.split(":").map(Number);
  const utcOffset = cityUtcOffsets[match.city] ?? -5;
  return new Date(Date.UTC(year, month - 1, day, hour - utcOffset, minute));
}
