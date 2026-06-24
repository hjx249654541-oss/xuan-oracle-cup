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
      locked: false
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
      locked: true
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
      locked: true
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
      locked: true
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
      locked: true
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
      locked: true
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
    id: "2026-06-30-r32-dal",
    date: "2026-06-30",
    localTime: "12:00",
    group: "32强",
    phase: "淘汰赛",
    home: "待定球队",
    away: "待定球队",
    venue: "Dallas Stadium",
    city: "达拉斯",
    country: "美国",
    source: "Dallas FIFA World Cup 26 host city schedule",
    lastUpdated: "2026-06-23"
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
  "纽约/新泽西": -4
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
