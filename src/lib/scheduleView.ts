import { getChinaKickoffDate, worldCupMatches, type WorldCupMatch } from "../data/schedule";

export function getDefaultScheduleDate(matches: WorldCupMatch[], todayKey: string) {
  const dates = Array.from(new Set(matches.map(getChinaKickoffDate))).sort();
  return dates.find((date) => date === todayKey) ?? dates.find((date) => date > todayKey) ?? dates.at(-1) ?? todayKey;
}

export function getDefaultSelectedMatchId(matches: WorldCupMatch[], dateKey: string) {
  return matches.find((match) => getChinaKickoffDate(match) === dateKey)?.id ?? matches[0]?.id ?? worldCupMatches[0].id;
}

export function getScheduleDateWindow(dates: string[], activeDate: string, size = 4) {
  if (dates.length <= size) {
    return dates;
  }
  const activeIndex = Math.max(dates.indexOf(activeDate), 0);
  const start = Math.max(activeIndex - 1, 0);
  return dates.slice(start, start + size);
}

export function getChinaTodayDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
