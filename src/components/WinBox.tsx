import { useMemo, useState } from "react";
import { CAPS, decade, NATIONS, POS_LABEL } from "../game/rules";
import { BUCKETS, type Stats } from "../game/stats";
import type { Player } from "../game/types";

interface Props {
  won: boolean;
  answer: Player;
  guessCount: number;
  daily: boolean;
  /** Son kutu açıldıktan sonra yumuşakça belirsin mi (yeni kazanılmış oyun) */
  late: boolean;
  clock: string;
  /** Günlük modda: kayıtlı istatistikler ve dünün cevabı */
  stats?: Stats;
  yesterday?: string;
  shareText: () => string;
  onAgain: () => void;
}

const CONFETTI = ["var(--hit)", "var(--near)", "var(--accent-fg)", "#f7f2ea", "var(--miss)"];

/** Kazanınca kısa bir konfeti; yalnızca yeni kazanılmış oyunda ve hareket azaltma açık değilse. */
function Confetti() {
  const bits = useMemo(() => Array.from({ length: 36 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.4, spin: Math.random() * 540 - 270,
    drift: Math.random() * 80 - 40, color: CONFETTI[i % CONFETTI.length], wide: i % 3 === 0,
  })), []);
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i key={i} className={b.wide ? "wide" : ""} style={{
          left: `${b.left}%`, background: b.color, animationDelay: `${b.delay}s`,
          ["--spin" as string]: `${b.spin}deg`, ["--drift" as string]: `${b.drift}px`,
        }} />
      ))}
    </div>
  );
}

/** Cevabın futbol kartı: oyun bitince gizli oyuncunun bütün kutuları tek bakışta. */
function PlayerCard({ p }: { p: Player }) {
  return (
    <div className="pcard">
      <div className="pcard-top">
        <span className="pcard-pos">{POS_LABEL[p.pos]}</span>
        <span className="pcard-flag" title={p.nat}>{NATIONS[p.nat]?.[0]}</span>
      </div>
      <strong className="pcard-name">{p.name}</strong>
      <span className="pcard-clubs">{p.clubs.slice(0, 3).join(" · ")}{p.clubs.length > 3 && ` +${p.clubs.length - 3}`}</span>
      <dl>
        <div><dt>Doğum</dt><dd>{p.born}</dd></div>
        <div><dt>Dönem</dt><dd>{decade(p.era)}</dd></div>
        <div><dt>Şamp.</dt><dd>{p.titles}</dd></div>
        <div><dt>Milli</dt><dd>{CAPS[p.caps]}</dd></div>
      </dl>
    </div>
  );
}

function StatsView({ stats }: { stats: Stats }) {
  const top = Math.max(1, ...stats.dist);
  return (
    <div className="stats">
      <dl>
        <div><dt>Bulunan gün</dt><dd>{stats.played}</dd></div>
        <div><dt>Seri</dt><dd>{stats.streak}</dd></div>
        <div><dt>En uzun seri</dt><dd>{stats.best}</dd></div>
        <div><dt>Ortalama tahmin</dt><dd>{stats.average ? stats.average.toLocaleString("tr", { maximumFractionDigits: 1 }) : "–"}</dd></div>
      </dl>
      <div className="dist" aria-label="Tahmin sayısı dağılımı">
        {BUCKETS.map((b, i) => (
          <div key={b} className={`bar-row${i === stats.last ? " today" : ""}`}>
            <span>{b}</span>
            <i style={{ width: `${Math.max(8, (stats.dist[i] / top) * 100)}%` }}>{stats.dist[i]}</i>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WinBox({ won, answer, guessCount, daily, late, clock, stats, yesterday, shareText, onAgain }: Props) {
  const [copyLabel, setCopyLabel] = useState("Sonucu kopyala");

  const copy = async () => {
    const text = shareText();
    try {
      await navigator.clipboard.writeText(text);
      setCopyLabel("Kopyalandı");
    } catch {
      // Panoya yazma izni yoksa eski yöntem
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); setCopyLabel("Kopyalandı"); } catch { setCopyLabel("Kopyalanamadı"); }
      ta.remove();
    }
  };

  return (
    <div className={`win${late ? " late" : ""}`}>
      {late && won && <Confetti />}
      <div className="win-top">
        <PlayerCard p={answer} />
        <div className="win-text">
          <h2>{won ? "Buldun!" : "Cevap buydu"}</h2>
          <p><strong>{answer.name}</strong>{won && `, ${guessCount} tahminde.`}</p>
        </div>
        <div className="actions">
          {won && <button onClick={copy}>{copyLabel}</button>}
          {daily
            ? <span className="clock">Yeni oyuncu {clock} sonra</span>
            : <button onClick={onAgain}>Yeni oyuncu</button>}
        </div>
      </div>
      {daily && stats && <StatsView stats={stats} />}
      {daily && yesterday && <p className="yesterday">Dünün oyuncusu: <strong>{yesterday}</strong></p>}
    </div>
  );
}
