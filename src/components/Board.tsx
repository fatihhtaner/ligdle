import type { ReactNode } from "react";
import { arrowOf, CAPS, compare, HEADS, NATIONS, POS_GROUP, POS_LABEL } from "../game/rules";
import type { Player } from "../game/types";

/** ms between tiles flipping open; the win box waits for the last one */
export const TILE_STEP = 320;

function Tile({ cls, delay, children }: { cls: string; delay: number; children: ReactNode }) {
  return <div className={`tile ${cls}`} style={{ animationDelay: `${delay * TILE_STEP}ms` }}>{children}</div>;
}

function Arrow({ guess, answer }: { guess: number; answer: number }) {
  const s = arrowOf(guess, answer);
  return s ? <span className="arrow" aria-label={s === "↑" ? "daha yüksek" : "daha düşük"}>{s}</span> : null;
}

function Row({ guess: g, answer: a, fresh }: { guess: Player; answer: Player; fresh: boolean }) {
  const c = compare(g, a);
  return (
    <div className={`row${fresh ? " new" : ""}`}>
      <Tile cls="name" delay={0}>{g.name}</Tile>
      <Tile cls={c.pos} delay={1}>{POS_LABEL[g.pos]}<span className="sub">{POS_GROUP[g.pos]}</span></Tile>
      <Tile cls={c.nat} delay={2}><span className="flag">{NATIONS[g.nat][0]}</span>{g.nat}</Tile>
      <Tile cls={c.clubs} delay={3}>
        {g.clubs.map(cl => <span key={cl} className={`club${c.shared.includes(cl) ? " shared" : ""}`}>{cl}</span>)}
      </Tile>
      <Tile cls={c.born} delay={4}>{g.born}<Arrow guess={g.born} answer={a.born} /></Tile>
      <Tile cls={c.era} delay={5}>{g.era}'ler<Arrow guess={g.era} answer={a.era} /></Tile>
      <Tile cls={c.titles} delay={6}>{g.titles}<Arrow guess={g.titles} answer={a.titles} /></Tile>
      <Tile cls={c.caps} delay={7}>{CAPS[g.caps]}<Arrow guess={g.caps} answer={a.caps} /></Tile>
      <Tile cls={c.active} delay={8}>{g.active ? "Aktif" : "Emekli"}</Tile>
    </div>
  );
}

interface Props {
  players: Player[];
  answer: number;
  guesses: number[];
  /** Bu oturumda az önce yapılan tahmin; yalnızca onun kutuları dönerek açılır. */
  fresh: number;
}

export function Board({ players, answer, guesses, fresh }: Props) {
  return (
    <div className="board">
      <div className="grid">
        {HEADS.map(h => <div key={h} className="head">{h}</div>)}
        {guesses.length === 0 && (
          <div className="empty">Henüz tahmin yok. Aklına gelen ilk futbolcuyu yaz, kutuların renklerine göre yaklaş.</div>
        )}
        {[...guesses].reverse().map(i => (
          <Row key={i} guess={players[i]} answer={players[answer]} fresh={i === fresh} />
        ))}
      </div>
    </div>
  );
}
