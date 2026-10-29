import type { Comparison, Player, Position, Verdict } from "./types";

export const POS_LABEL: Record<Position, string> = {
  "Kaleci": "Kaleci", "Stoper": "Stoper", "Sol bek": "Sol bek", "Sağ bek": "Sağ bek",
  "Merkez OS": "Merkez orta saha", "Ofansif OS": "Ofansif orta saha", "Kanat": "Kanat", "Santrfor": "Santrfor",
};

export const POS_GROUP: Record<Position, string> = {
  "Kaleci": "Kaleci", "Stoper": "Defans", "Sol bek": "Defans", "Sağ bek": "Defans",
  "Merkez OS": "Orta saha", "Ofansif OS": "Orta saha", "Kanat": "Hücum", "Santrfor": "Hücum",
};

// Sarı = aynı bölge. Türkiye kendi başına bir bölge, böylece Türk oyuncular yabancı Avrupalılara sarı yakmaz.
export const NATIONS: Record<string, [flag: string, region: string]> = {
  "Türkiye": ["🇹🇷", "Türkiye"], "Romanya": ["🇷🇴", "Balkanlar / Doğu Avrupa"], "Brezilya": ["🇧🇷", "Güney Amerika"], "Arjantin": ["🇦🇷", "Güney Amerika"],
  "Uruguay": ["🇺🇾", "Güney Amerika"], "Belçika": ["🇧🇪", "Batı Avrupa"], "Bosna-Hersek": ["🇧🇦", "Balkanlar / Doğu Avrupa"], "Portekiz": ["🇵🇹", "Batı Avrupa"],
  "Hollanda": ["🇳🇱", "Batı Avrupa"], "Fildişi Sahili": ["🇨🇮", "Afrika"], "Almanya": ["🇩🇪", "Batı Avrupa"], "Nijerya": ["🇳🇬", "Afrika"],
};

export const CAPS = ["0", "1–20", "21–50", "51–100", "100+"];

export const HEADS = ["Futbolcu", "Pozisyon", "Uyruk", "Türk kulüpleri", "Doğum yılı", "Dönem", "Şampiyonluk", "Milli maç", "Durum"];

/** Tahmin satırındaki özellik kutularının sırası (paylaşım metni de bu sırayı kullanır). */
export const TILE_KEYS = ["pos", "nat", "clubs", "born", "era", "titles", "caps", "active"] as const;

/** Cevap tahminden yüksekse ↑, düşükse ↓. */
export function arrowOf(guess: number, answer: number): "↑" | "↓" | "" {
  return answer > guess ? "↑" : answer < guess ? "↓" : "";
}

export function compare(g: Player, a: Player): Comparison {
  const shared = g.clubs.filter(c => a.clubs.includes(c));
  const sameClubs = shared.length === g.clubs.length && shared.length === a.clubs.length;
  const near = (hit: boolean, close: boolean): Verdict => hit ? "hit" : close ? "near" : "miss";
  return {
    pos: near(g.pos === a.pos, POS_GROUP[g.pos] === POS_GROUP[a.pos]),
    nat: near(g.nat === a.nat, NATIONS[g.nat][1] === NATIONS[a.nat][1]),
    clubs: near(sameClubs, shared.length > 0),
    shared,
    born: near(g.born === a.born, Math.abs(g.born - a.born) <= 3),
    era: near(g.era === a.era, Math.abs(g.era - a.era) === 10),
    titles: near(g.titles === a.titles, Math.abs(g.titles - a.titles) <= 1),
    caps: near(g.caps === a.caps, Math.abs(g.caps - a.caps) === 1),
    active: g.active === a.active ? "hit" : "miss",
  };
}

/** Türkçe harflere duyarsız arama: "sukur" → "Şükür", "ilhan" → "İlhan". */
export const norm = (s: string) =>
  s.toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFD").replace(/[̀-ͯ]/g, "");
