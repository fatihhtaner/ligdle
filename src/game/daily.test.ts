import { describe, expect, it } from "vitest";
import { dailyAnswer } from "./daily";
import { PLAYERS } from "./players";
import { dailyPool } from "./rules";

const pool = dailyPool(PLAYERS);
const answer = (y: number, m: number, d: number) => PLAYERS[pool[dailyAnswer(pool.length, new Date(y, m - 1, d))]].name;

describe("günlük cevaplar", () => {
  it("günlük listedeki herkes veride var", () => {
    expect(pool).toHaveLength(500);
    expect(new Set(pool).size).toBe(pool.length);
  });

  // Veri yeniden kurulunca geçmiş günlerin cevabı değişirse arşiv ve oyuncuların sonuçları bozulur
  it("geçmiş günlerin cevabı sabit", () => {
    expect([answer(2026, 10, 29), answer(2026, 10, 30), answer(2026, 10, 31), answer(2026, 11, 1)]).toMatchInlineSnapshot(`
      [
        "Ceyhun Gülselam",
        "Cenk Tosun",
        "Abdülkerim Bardakçı",
        "Radamel Falcao",
      ]
    `);
  });
});
