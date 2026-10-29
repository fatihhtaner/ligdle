// Tarayıcı depolaması gizli pencerede ya da engellendiğinde hata verebilir; oyun onsuz da çalışır.
export const store = {
  get<T>(key: string): T | null {
    try { return JSON.parse(localStorage.getItem(key) ?? "null") as T | null; } catch { return null; }
  },
  set(key: string, value: unknown) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* yoksay */ }
  },
};

export const dailyKey = (dateKey: string) => `ligdle:daily:${dateKey}`;
