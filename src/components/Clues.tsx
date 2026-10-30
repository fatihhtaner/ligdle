import { clues, rangeText } from "../game/rules";
import type { Player } from "../game/types";

/** "Bildiklerin" kartı: tahminlerin renk ve oklarından gizli oyuncu hakkında kesinleşenler. */
export function Clues({ players, answer, guesses }: { players: Player[]; answer: number; guesses: number[] }) {
  const c = clues(guesses.map(i => players[i]), players[answer]);
  const num = (key: keyof typeof c.range) => {
    const text = rangeText(key, c.range[key]);
    return [text, c.range[key][0] === c.range[key][1]] as const;
  };
  const items: [label: string, text: string | null | undefined, exact: boolean | undefined][] = [
    ["Pozisyon", c.pos?.text, c.pos?.exact],
    ["Uyruk", c.nat?.text, c.nat?.exact],
    ["Kulüpler", c.clubs.length ? c.clubs.join(", ") : null, false],
    ["Doğum yılı", ...num("born")],
    ["Dönem", ...num("era")],
    ["Şampiyonluk", ...num("titles")],
    ["Milli maç", ...num("caps")],
    ["Durum", c.active === null ? null : c.active ? "Aktif" : "Emekli", true],
  ];
  const found = items.filter(([, t, exact]) => t && exact).length;

  return (
    <section className="clues" aria-labelledby="clues-title">
      <div className="card-id" aria-hidden="true">
        <span className="silhouette">?</span>
        <span className="found">{found}/8</span>
      </div>
      <div className="clue-body">
        <h2 id="clues-title">Bildiklerin</h2>
        <ul>
          {items.map(([label, text, exact]) => (
            <li key={label} className={text ? (exact ? "hit" : "near") : ""}>
              <span>{label}</span>
              <strong>{text ?? "?"}</strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
