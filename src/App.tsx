import { useEffect, useRef, useState } from "react";
import { Board, TILE_STEP } from "./components/Board";
import { HowTo } from "./components/HowTo";
import { SearchBox } from "./components/SearchBox";
import { WinBox } from "./components/WinBox";
import { dailyAnswer, dateKey, dayNumber, untilMidnight } from "./game/daily";
import { PLAYERS } from "./game/players";
import { answerPool } from "./game/rules";
import { shareText } from "./game/share";
import { readStats, recordWin } from "./game/stats";
import { dailyKey, store } from "./game/storage";
import type { GameState, Level } from "./game/types";

const BASE = import.meta.env.BASE_URL;
const LEVEL_KEY = "ligdle:level";
const DAILY_POOL = answerPool(PLAYERS, "daily");

function savedLevel(): Level {
  return store.get<Level>(LEVEL_KEY) === "hard" ? "hard" : "normal";
}

function dailyGame(): GameState {
  const answer = DAILY_POOL[dailyAnswer(DAILY_POOL.length)];
  const guesses = store.get<{ guesses: number[] }>(dailyKey(dateKey()))?.guesses ?? [];
  return { mode: "daily", level: savedLevel(), answer, guesses, won: guesses.includes(answer), revealed: false };
}

function freeGame(previous: number, level: Level): GameState {
  const pool = answerPool(PLAYERS, level);
  let answer;
  do { answer = pool[Math.floor(Math.random() * pool.length)]; } while (pool.length > 1 && answer === previous);
  return { mode: "free", level, answer, guesses: [], won: false, revealed: false };
}

export default function App() {
  const [game, setGame] = useState<GameState>(dailyGame);
  /** Az önce tahmin edilen oyuncu: yalnızca onun satırı animasyonla açılır. */
  const [fresh, setFresh] = useState(-1);
  /** Kazanan satırın kutuları açılırken arama kutusu yerinde kalır, kazanma kutusu sonra gelir. */
  const [revealing, setRevealing] = useState(false);
  const [lateWin, setLateWin] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [help, setHelp] = useState(false);
  const winTimer = useRef<number>(undefined);
  const shownDay = useRef(dateKey());

  const reset = (next: GameState) => {
    clearTimeout(winTimer.current);
    setRevealing(false);
    setLateWin(false);
    setFresh(-1);
    setGame(next);
  };

  // Saniyelik saat: geri sayım ve gece yarısı yeni günlük oyuncu
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNow(d);
      if (dateKey(d) !== shownDay.current) {
        shownDay.current = dateKey(d);
        setGame(g => g.mode === "daily" ? dailyGame() : g);
      }
    }, 1000);
    return () => { clearInterval(id); clearTimeout(winTimer.current); };
  }, []);

  const setLevel = (level: Level) => {
    if (level === game.level) return;
    store.set(LEVEL_KEY, level);
    reset(freeGame(game.answer, level));
  };

  const guess = (i: number) => {
    if (game.won || game.revealed || game.guesses.includes(i)) return;
    const next = { ...game, guesses: [...game.guesses, i], won: i === game.answer };
    if (next.mode === "daily") {
      store.set(dailyKey(dateKey()), { guesses: next.guesses });
      if (next.won) recordWin(dateKey(), next.guesses.length);
    }
    setGame(next);
    setFresh(i);
    if (next.won) {
      setRevealing(true);
      setLateWin(true);
      winTimer.current = window.setTimeout(() => setRevealing(false), 8 * TILE_STEP + 700);
    }
  };

  const day = dayNumber(now);
  const done = game.won || game.revealed;
  const showWin = done && !revealing;
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayName = dayNumber(yesterday) >= 0 ? PLAYERS[DAILY_POOL[dailyAnswer(DAILY_POOL.length, yesterday)]].name : undefined;

  return (
    <div className="wrap">
      <div className="pitch" aria-hidden="true" />
      <header>
        <div>
          <h1>
            <img className="logo-light" src={`${BASE}img/logo-light.png`} alt="Ligdle" width={960} height={317} />
            <img className="logo-dark" src={`${BASE}img/logo-dark.png`} alt="Ligdle" width={960} height={317} />
          </h1>
          <p className="tagline">Türk futbolundan günün oyuncusunu bul. Her tahmin seni cevaba biraz daha yaklaştırır.</p>
        </div>
        <div className="meta">
          {game.mode === "daily" ? "Günün oyuncusu" : game.level === "hard" ? "Serbest · Zor" : "Serbest oyun"}
          <strong>{game.mode === "daily" ? `#${day + 1}` : "∞"}</strong>
          {game.guesses.length} tahmin
        </div>
      </header>

      <div className="bar">
        <div className="modes" data-mode={game.mode} role="group" aria-label="Oyun modu">
          <button aria-pressed={game.mode === "daily"} onClick={() => game.mode !== "daily" && reset(dailyGame())}>Günlük</button>
          <button aria-pressed={game.mode === "free"} onClick={() => game.mode !== "free" && reset(freeGame(game.answer, game.level))}>Serbest</button>
        </div>
        <div className="right">
          {game.mode === "free" && <>
            <div className="modes small" data-mode={game.level === "hard" ? "free" : "daily"} role="group" aria-label="Zorluk">
              <button aria-pressed={game.level === "normal"} onClick={() => setLevel("normal")}>Normal</button>
              <button aria-pressed={game.level === "hard"} onClick={() => setLevel("hard")}>Zor</button>
            </div>
            <button className="ghost" onClick={() => { reset({ ...game, revealed: true }); }}>Cevabı göster</button>
            <button className="ghost" onClick={() => reset(freeGame(game.answer, game.level))}>Yeni oyuncu</button>
          </>}
          {game.guesses.length > 0 && (
            <button className="ghost" aria-expanded={help} onClick={() => setHelp(h => !h)}>Nasıl oynanır</button>
          )}
        </div>
      </div>

      {showWin && (
        <WinBox
          key={`${game.mode}-${game.answer}`}
          won={game.won}
          answerName={PLAYERS[game.answer].name}
          guessCount={game.guesses.length}
          daily={game.mode === "daily"}
          late={lateWin}
          clock={untilMidnight(now)}
          stats={game.mode === "daily" ? readStats(dateKey(now)) : undefined}
          yesterday={yesterdayName}
          shareText={() => shareText(game, PLAYERS, day)}
          onAgain={() => reset(freeGame(game.answer, game.level))}
        />
      )}

      {!showWin && <SearchBox players={PLAYERS} exclude={game.guesses} disabled={revealing} onGuess={guess} />}

      <div className="legend">
        <span><i style={{ background: "var(--hit)" }} />Doğru</span>
        <span><i style={{ background: "var(--near)" }} />Yakın: aynı mevki grubu, aynı bölge, ortak kulüp, ±3 yıl</span>
        <span><i style={{ background: "var(--miss)" }} />Yanlış</span>
        <span>↑ ↓ cevap daha yüksek / düşük</span>
      </div>

      {(game.guesses.length === 0 || help) && (
        <HowTo onClose={game.guesses.length > 0 ? () => setHelp(false) : undefined} />
      )}

      <Board players={PLAYERS} answer={game.answer} guesses={game.guesses} fresh={fresh} />

    </div>
  );
}
