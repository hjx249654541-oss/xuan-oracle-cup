export type MatchPhase = "小组赛" | "淘汰赛";

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
    lastUpdated: "2026-06-23"
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
    lastUpdated: "2026-06-23"
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
    lastUpdated: "2026-06-23"
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
    lastUpdated: "2026-06-23"
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
    lastUpdated: "2026-06-23"
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
    lastUpdated: "2026-06-23"
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

export function formatLocalKickoff(match: WorldCupMatch) {
  const [year, month, day] = match.date.split("-");
  return `${month}/${day} ${match.localTime}`;
}
