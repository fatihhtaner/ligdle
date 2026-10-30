import { describe, expect, it } from "vitest";
import { dailyAnswer, dailyOrder, dayNumber } from "./daily";
import { PLAYERS } from "./players";
import { answerPool, arrowOf, clues, compare, decade, explain, NATIONS, norm, rangeText } from "./rules";
import type { Player } from "./types";

const p = (over: Partial<Player>): Player => ({
  name: "Test", pos: "Santrfor", nat: "Türkiye", born: 1990, clubs: ["Galatasaray"],
  titles: 2, caps: 2, active: false, era: 2010, fame: 5, ...over,
});

describe("compare", () => {
  it("aynı oyuncu her kutuda yeşil", () => {
    const c = compare(p({}), p({}));
    expect([c.pos, c.nat, c.clubs, c.born, c.era, c.titles, c.caps, c.active]).toEqual(Array(8).fill("hit"));
  });

  it("aynı mevki grubu sarı, farklı grup kırmızı", () => {
    expect(compare(p({ pos: "Kanat" }), p({ pos: "Santrfor" })).pos).toBe("near");
    expect(compare(p({ pos: "Stoper" }), p({ pos: "Santrfor" })).pos).toBe("miss");
  });

  it("Türk oyuncu yabancı Avrupalıya sarı yakmaz, aynı bölge sarı", () => {
    expect(compare(p({ nat: "Türkiye" }), p({ nat: "Hollanda" })).nat).toBe("miss");
    expect(compare(p({ nat: "Belçika" }), p({ nat: "Hollanda" })).nat).toBe("near");
  });

  it("ortak kulüp sarı ve ortak kulüpleri döndürür; aynı liste yeşil", () => {
    const c = compare(p({ clubs: ["Galatasaray", "Bursaspor"] }), p({ clubs: ["Galatasaray"] }));
    expect(c.clubs).toBe("near");
    expect(c.shared).toEqual(["Galatasaray"]);
    expect(compare(p({ clubs: ["A", "B"] }), p({ clubs: ["B", "A"] })).clubs).toBe("hit");
    expect(compare(p({ clubs: ["A"] }), p({ clubs: ["B"] })).clubs).toBe("miss");
  });

  it("sayısal eşikler: doğum ±3, dönem komşu on yıl, şampiyonluk ±1, milli maç komşu aralık", () => {
    expect(compare(p({ born: 1990 }), p({ born: 1993 })).born).toBe("near");
    expect(compare(p({ born: 1990 }), p({ born: 1994 })).born).toBe("miss");
    expect(compare(p({ era: 2000 }), p({ era: 2010 })).era).toBe("near");
    expect(compare(p({ era: 1990 }), p({ era: 2010 })).era).toBe("miss");
    expect(compare(p({ titles: 3 }), p({ titles: 4 })).titles).toBe("near");
    expect(compare(p({ caps: 1 }), p({ caps: 3 })).caps).toBe("miss");
  });

  it("durum kutusunda sarı yok", () => {
    expect(compare(p({ active: true }), p({ active: false })).active).toBe("miss");
  });
});

describe("arrowOf", () => {
  it("cevap yüksekse ↑, düşükse ↓, eşitse boş", () => {
    expect(arrowOf(1990, 1995)).toBe("↑");
    expect(arrowOf(1990, 1985)).toBe("↓");
    expect(arrowOf(1990, 1990)).toBe("");
  });
});

describe("norm", () => {
  it("Türkçe harflere duyarsız arar", () => {
    expect(norm("Şükür")).toBe("sukur");
    expect(norm("İlhan")).toBe("ilhan");
    expect(norm("IŞIK")).toBe("isik");
  });
});

describe("günlük oyuncu", () => {
  it("sıralama herkeste aynı ve her oyuncu bir kez geçer", () => {
    const order = dailyOrder(PLAYERS.length);
    expect(order).toEqual(dailyOrder(PLAYERS.length));
    expect([...order].sort((a, b) => a - b)).toEqual(PLAYERS.map((_, i) => i));
  });

  it("ilk gün 1 numaralı bulmaca", () => {
    expect(dayNumber(new Date(2026, 9, 29, 15))).toBe(0);
    expect(dailyAnswer(PLAYERS.length, new Date(2026, 9, 29))).toBe(dailyOrder(PLAYERS.length)[0]);
  });
});

describe("veri", () => {
  it("her oyuncunun uyruğu bölge tablosunda var", () => {
    for (const pl of PLAYERS) expect(NATIONS[pl.nat], pl.name).toBeDefined();
  });
});

describe("cevap havuzu", () => {
  it("günlük 4–5, normal 3–5, zor herkes", () => {
    const ps = [1, 2, 3, 4, 5].map(fame => p({ fame }));
    expect(answerPool(ps, "daily")).toEqual([3, 4]);
    expect(answerPool(ps, "normal")).toEqual([2, 3, 4]);
    expect(answerPool(ps, "hard")).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("decade", () => {
  it("on yılın ekini sese göre seçer", () => {
    expect([1950, 1960, 1990, 2000, 2010, 2020].map(decade))
      .toEqual(["1950'ler", "1960'lar", "1990'lar", "2000'ler", "2010'lar", "2020'ler"]);
  });
});

describe("explain", () => {
  it("rengin nedenini söyler, cevabı açık etmez", () => {
    expect(explain("clubs", p({ clubs: ["Galatasaray", "Bursaspor"] }), p({ clubs: ["Galatasaray", "Fenerbahçe"] })))
      .toBe("Ortak kulüp: Galatasaray. Listelerin geri kalanı farklı.");
    expect(explain("born", p({ born: 1990 }), p({ born: 1992 }))).toBe("En fazla 3 yıl fark var; cevap daha genç.");
    expect(explain("nat", p({ nat: "Belçika" }), p({ nat: "Hollanda" }))).toBe("Ülkeler farklı ama aynı bölgede: Batı Avrupa.");
    expect(explain("active", p({ active: true }), p({ active: false }))).toBe("Cevap emekli.");
  });
});

describe("clues", () => {
  const a = p({ name: "A", born: 1990, era: 2010, titles: 3, caps: 2, nat: "Brezilya", pos: "Kanat", clubs: ["Galatasaray", "Bursaspor"] });
  it("oklar ve renklerden aralık çıkarır", () => {
    const c = clues([p({ name: "B", born: 1985, era: 2000, titles: 0, caps: 0, nat: "Arjantin", pos: "Santrfor", clubs: ["Galatasaray"] })], a);
    expect(rangeText("born", c.range.born)).toBe("1989 ve sonrası");
    expect(rangeText("era", c.range.era)).toBe("2010'lar");
    expect(rangeText("titles", c.range.titles)).toBe("en az 2");
    expect(rangeText("caps", c.range.caps)).toBe("21+");
    expect(c.pos).toEqual({ exact: false, text: "Hücum grubu" });
    expect(c.nat?.exact).toBe(false);
    expect(c.clubs).toEqual(["Galatasaray"]);
  });
  it("Türk tahmin kırmızıysa cevap yabancı", () => {
    expect(clues([p({ name: "B", nat: "Türkiye" })], a).nat).toEqual({ exact: false, text: "Yabancı" });
  });
  it("iki taraftan sıkıştırır", () => {
    const c = clues([p({ name: "B", born: 1988 }), p({ name: "C", born: 1992 })], a);
    expect(rangeText("born", c.range.born)).toBe("1989–1991");
  });
  it("cevap aralığın içinde kalır", () => {
    const pool = [1975, 1983, 1990, 1994, 2001].map((born, i) => p({ name: `x${i}`, born, era: born + 20 - (born % 10), titles: i, caps: i % 5 }));
    for (const ans of pool) {
      const c = clues(pool.filter(g => g !== ans), ans);
      for (const k of ["born", "era", "titles", "caps"] as const) {
        expect(ans[k]).toBeGreaterThanOrEqual(c.range[k][0]);
        expect(ans[k]).toBeLessThanOrEqual(c.range[k][1]);
      }
    }
  });
});
