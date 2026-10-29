import { useMemo, useRef, useState } from "react";
import { NATIONS, norm, POS_LABEL } from "../game/rules";
import type { Player } from "../game/types";

interface Props {
  players: Player[];
  /** Zaten tahmin edilmiş oyuncular öneri listesinde çıkmaz. */
  exclude: number[];
  disabled: boolean;
  onGuess: (index: number) => void;
}

export function SearchBox({ players, exclude, disabled, onGuess }: Props) {
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return [];
    return players
      .map((p, i) => ({ p, i }))
      .filter(({ p, i }) => !exclude.includes(i) && norm(p.name).split(/\s+/).concat(norm(p.name)).some(w => w.startsWith(q)))
      .sort((x, y) => y.p.fame - x.p.fame) // aynı harflerle başlayanlardan önce tanınanlar
      .slice(0, 8);
  }, [query, players, exclude]);

  const pick = (k: number) => {
    const m = matches[k];
    if (!m) return;
    onGuess(m.i);
    setQuery("");
    setSel(0);
    inputRef.current?.focus();
  };

  const move = (step: number) => {
    const next = (sel + step + matches.length) % matches.length;
    setSel(next);
    listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
  };

  const showList = open && matches.length > 0;

  return (
    <form className="search" autoComplete="off" onSubmit={e => { e.preventDefault(); pick(sel); }}>
      <input
        ref={inputRef}
        type="text"
        placeholder="Ör. Alex de Souza"
        aria-label="Futbolcu adı"
        role="combobox"
        aria-expanded={showList}
        aria-controls="suggest"
        value={query}
        disabled={disabled}
        onChange={e => { setQuery(e.target.value); setSel(0); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={e => {
          if (!matches.length) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); move(e.key === "ArrowDown" ? 1 : -1); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      <button className="go" type="submit" disabled={disabled || !matches.length}>Tahmin</button>
      {showList && (
        <ul className="suggest" id="suggest" role="listbox" ref={listRef}>
          {matches.map(({ p }, k) => (
            <li
              key={p.name}
              role="option"
              aria-selected={k === sel}
              // mousedown, input'un blur'undan önce gelir; liste kapanmadan seçim yapılır
              onMouseDown={e => { e.preventDefault(); pick(k); }}
            >
              <span>{p.name}</span><small>{NATIONS[p.nat][0]} {POS_LABEL[p.pos]}</small>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
