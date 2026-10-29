export type Position =
  | "Kaleci"
  | "Stoper"
  | "Sol bek"
  | "Sağ bek"
  | "Defansif OS"
  | "Merkez OS"
  | "Ofansif OS"
  | "Kanat"
  | "Santrfor";

export interface Player {
  name: string;
  pos: Position;
  nat: string;
  born: number;
  /** Türkiye'de resmi lig maçına çıktığı kulüpler; Türkiye'de oynamamış milli oyuncuda yabancı kulüpler */
  clubs: string[];
  /** Süper Lig şampiyonluğu sayısı */
  titles: number;
  /** Milli maç aralığı, CAPS dizisindeki sıra (0-4) */
  caps: number;
  active: boolean;
  /** Dönem: on yılın ilk yılı (1990 = 1990'lar) */
  era: number;
  /** Bilinirlik puanı (1-5): hangi modda cevap olabileceğini belirler */
  fame: number;
}

export type Verdict = "hit" | "near" | "miss";

export interface Comparison {
  pos: Verdict;
  nat: Verdict;
  clubs: Verdict;
  shared: string[];
  born: Verdict;
  era: Verdict;
  titles: Verdict;
  caps: Verdict;
  active: Verdict;
}

export type Mode = "daily" | "free";
/** Serbest modun zorluğu */
export type Level = "normal" | "hard";

export interface GameState {
  mode: Mode;
  level: Level;
  /** PLAYERS içindeki sıra */
  answer: number;
  guesses: number[];
  won: boolean;
  revealed: boolean;
}
