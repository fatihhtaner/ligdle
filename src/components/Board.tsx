import { useState, type ReactNode } from "react";
import { arrowOf, CAPS, compare, decade, explain, HEADS, NATIONS, POS_GROUP, POS_LABEL, TILE_KEYS } from "../game/rules";
import type { Player } from "../game/types";

/** ms between tiles flipping open; the win box waits for the last one */
export const TILE_STEP = 320;

type Key = (typeof TILE_KEYS)[number];
interface Tip { row: number; key: Key }

function Tile({ cls, delay, active, onTap, children }: {
  cls: string; delay: number; active?: boolean; onTap?: () => void; children: ReactNode;
}) {
  const style = { animationDelay: `${delay * TILE_STEP}ms` };
  if (!onTap) return <div className={`tile ${cls}`} style={style}>{children}</div>;
  return (
    <button type="button" className={`tile ${cls}${active ? " picked" : ""}`} style={style} onClick={onTap}
      aria-pressed={active}>
      {children}
    </button>
  );
}

function Arrow({ guess, answer }: { guess: number; answer: number }) {
  const s = arrowOf(guess, answer);
  return s ? <span className="arrow" aria-label={s === "↑" ? "daha yüksek" : "daha düşük"}>{s}</span> : null;
}

function Row({ guess: g, answer: a, n, fresh, tip, onTip }: {
  guess: Player; answer: Player; n: number; fresh: boolean; tip: Key | null; onTip: (k: Key) => void;
}) {
  const c = compare(g, a);
  const t = (k: Key) => ({ active: tip === k, onTap: () => onTip(k) });
  return (
    <div className={`row${fresh ? " new" : ""}`}>
      <Tile cls="name" delay={0}><span className="nth">{n}. tahmin</span>{g.name}</Tile>
      <Tile cls={c.pos} delay={1} {...t("pos")}>{POS_LABEL[g.pos]}<span className="sub">{POS_GROUP[g.pos]}</span></Tile>
      <Tile cls={c.nat} delay={2} {...t("nat")}><span className="flag">{NATIONS[g.nat][0]}</span>{g.nat}</Tile>
      <Tile cls={c.clubs} delay={3} {...t("clubs")}>
        {g.clubs.map(cl => <span key={cl} className={`club${c.shared.includes(cl) ? " shared" : ""}`}>{cl}</span>)}
      </Tile>
      <Tile cls={c.born} delay={4} {...t("born")}>{g.born}<Arrow guess={g.born} answer={a.born} /></Tile>
      <Tile cls={c.era} delay={5} {...t("era")}>{decade(g.era)}<Arrow guess={g.era} answer={a.era} /></Tile>
      <Tile cls={c.titles} delay={6} {...t("titles")}>{g.titles}<Arrow guess={g.titles} answer={a.titles} /></Tile>
      <Tile cls={c.caps} delay={7} {...t("caps")}>{CAPS[g.caps]}<Arrow guess={g.caps} answer={a.caps} /></Tile>
      <Tile cls={c.active} delay={8} {...t("active")}>{g.active ? "Aktif" : "Emekli"}</Tile>
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
  // Dokunulan kutunun açıklaması tablonun üstünde tek satırda gösterilir: tablo yatay kaydığı için
  // kutunun yanında açılan bir baloncuk kenarlarda kesilirdi.
  const [tip, setTip] = useState<Tip | null>(null);
  const shown = tip && guesses.includes(tip.row) ? tip : null;
  const label = shown && HEADS[TILE_KEYS.indexOf(shown.key) + 1];

  if (guesses.length === 0) return null;
  return (
    <div className="board-wrap">
      <p className={`why${shown ? " on" : ""}`} aria-live="polite">
        {shown
          ? <><strong>{players[shown.row].name} · {label}:</strong> {explain(shown.key, players[shown.row], players[answer])}</>
          : "Bir kutuya dokun, neden o renkte yandığını gör."}
      </p>
      <div className="board">
        <div className="grid">
          {HEADS.map(h => <div key={h} className="head">{h}</div>)}
          {[...guesses].reverse().map((i, k) => (
            <Row key={i} guess={players[i]} answer={players[answer]} n={guesses.length - k} fresh={i === fresh}
              tip={shown?.row === i ? shown.key : null}
              onTip={key => setTip(shown?.row === i && shown.key === key ? null : { row: i, key })} />
          ))}
        </div>
      </div>
    </div>
  );
}
