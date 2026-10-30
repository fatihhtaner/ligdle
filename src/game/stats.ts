import { store } from "./storage";

const KEY = "ligdle:stats";

/** Günlük oyunda kazanılan günler: "2026-10-30" → tahmin sayısı */
type Wins = Record<string, number>;

export const BUCKETS = ["1", "2", "3", "4", "5", "6–9", "10+"];
const bucketOf = (n: number) => n <= 5 ? n - 1 : n <= 9 ? 5 : 6;

export function recordWin(dateKey: string, guesses: number) {
  const wins = store.get<Wins>(KEY) ?? {};
  if (!(dateKey in wins)) store.set(KEY, { ...wins, [dateKey]: guesses });
}

const dayIndex = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(new Date(y, m - 1, d).getTime() / 864e5);
};

export interface Stats { played: number; streak: number; best: number; average: number; dist: number[]; last: number }

/** Seri: bugün ya da dün biten, gün atlamadan kazanılmış günler. */
export function readStats(todayKey: string): Stats {
  const wins = store.get<Wins>(KEY) ?? {};
  const days = Object.keys(wins).map(dayIndex).sort((a, b) => a - b);
  let best = 0, run = 0;
  days.forEach((d, i) => { run = i > 0 && d === days[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run); });
  const today = dayIndex(todayKey);
  const lastDay = days[days.length - 1];
  const streak = lastDay === today || lastDay === today - 1 ? run : 0;
  const counts = Object.values(wins);
  const dist = BUCKETS.map(() => 0);
  counts.forEach(n => dist[bucketOf(n)]++);
  return {
    played: counts.length, streak, best, dist,
    average: counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0,
    last: todayKey in wins ? bucketOf(wins[todayKey]) : -1,
  };
}
