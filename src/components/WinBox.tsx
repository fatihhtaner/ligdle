import { useState } from "react";

interface Props {
  won: boolean;
  answerName: string;
  guessCount: number;
  daily: boolean;
  /** Son kutu açıldıktan sonra yumuşakça belirsin mi (yeni kazanılmış oyun) */
  late: boolean;
  clock: string;
  shareText: () => string;
  onAgain: () => void;
}

export function WinBox({ won, answerName, guessCount, daily, late, clock, shareText, onAgain }: Props) {
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
      <div>
        <h2>{won ? "Buldun!" : "Cevap buydu"}</h2>
        <p><strong>{answerName}</strong>{won && `, ${guessCount} tahminde.`}</p>
      </div>
      <div className="actions">
        {won && <button onClick={copy}>{copyLabel}</button>}
        {daily
          ? <span className="clock">Yeni oyuncu {clock} sonra</span>
          : <button onClick={onAgain}>Yeni oyuncu</button>}
      </div>
    </div>
  );
}
