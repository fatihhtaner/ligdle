const START = new Date(2026, 9, 29); // 1 numaralı bulmacanın günü
const SEED = 20261029;

function rng(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Günlük cevap sırası: oyuncu indekslerinin sabit tohumla karıştırılmış hali. Herkeste aynı. */
export function dailyOrder(count: number): number[] {
  const r = rng(SEED), a = Array.from({ length: count }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function today(now = new Date()) { return new Date(now.getFullYear(), now.getMonth(), now.getDate()); }
/** 0 = ilk bulmaca günü */
export function dayNumber(now = new Date()) { return Math.round((today(now).getTime() - START.getTime()) / 864e5); }
export function dateKey(now = new Date()) { const d = today(now); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }

export function dailyAnswer(count: number, now = new Date()) {
  const order = dailyOrder(count), n = dayNumber(now);
  return order[((n % order.length) + order.length) % order.length];
}

export function untilMidnight(now = new Date()) {
  const ms = today(now).getTime() + 864e5 - now.getTime();
  const h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3);
  return [h, m, s].map(x => String(x).padStart(2, "0")).join(":");
}
