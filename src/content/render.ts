// Statik sayfalardaki <!--render:ad--> yerlerini derleme sırasında dolduran HTML parçaları.
// Arşiv günlük değiştiği için site her gece yeniden derlenir (.github/workflows/deploy.yml).
import { dailyAnswer, dayNumber } from "../game/daily";
import { PLAYERS } from "../game/players";
import { answerPool, CAPS, decade, NATIONS, POS_GROUP, POS_LABEL } from "../game/rules";
import { ARTICLES } from "./articles";
import champions from "./champions.json";

interface Season {
  season: string; winner: string; second: string; third: string | null;
  scorers: { name: string; nat: string; club: string }[]; goals: number | null;
}
const SEASONS = champions as Season[];

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const nat = (n: string) => `${NATIONS[n]?.[0] ?? ""} ${esc(n)}`.trim();

/** Türkiye saatiyle bugün: derleme sunucusu UTC'de çalışır, oyuncular Türkiye'de. */
function istanbulToday() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Istanbul", year: "numeric", month: "numeric", day: "numeric",
  }).formatToParts(new Date()).map(p => [p.type, p.value]));
  return new Date(+parts.year, +parts.month - 1, +parts.day);
}

/** Bugünden önceki günlük oyuncular, yeniden eskiye. Bugünün cevabı gizli kalır. */
function archive() {
  const pool = answerPool(PLAYERS, "daily");
  const today = istanbulToday();
  const days = Array.from({ length: Math.max(0, dayNumber(today)) }, (_, i) =>
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1 - i));
  if (!days.length) return `<p class="empty">İlk bulmacanın cevabı yarın burada olacak.</p>`;
  const fmt = new Intl.DateTimeFormat("tr", { day: "numeric", month: "long", year: "numeric", weekday: "long" });
  return `<ol class="archive">${days.map(d => {
    const p = PLAYERS[pool[dailyAnswer(pool.length, d)]];
    return `<li>
  <div class="day"><strong>#${dayNumber(d) + 1}</strong><span>${fmt.format(d)}</span></div>
  <div class="who"><h3>${esc(p.name)}</h3><p>${esc(POS_LABEL[p.pos])} · ${nat(p.nat)} · ${p.born} doğumlu</p></div>
  <dl>
    <div><dt>Kulüpler</dt><dd>${p.clubs.map(esc).join(", ")}</dd></div>
    <div><dt>Dönem</dt><dd>${decade(p.era)}</dd></div>
    <div><dt>Şampiyonluk</dt><dd>${p.titles}</dd></div>
    <div><dt>Milli maç</dt><dd>${CAPS[p.caps]}</dd></div>
  </dl>
</li>`;
  }).join("\n")}</ol>`;
}

function articles(root: string) {
  return `<ul class="cards">${ARTICLES.map(([slug, title, description]) =>
    `<li><a href="${root}rehber/${slug}/"><strong>${esc(title)}</strong><span>${esc(description)}</span></a></li>`).join("")}</ul>`;
}

function championsTable() {
  return `<div class="table-wrap"><table class="data">
<thead><tr><th>Sezon</th><th>Şampiyon</th><th>İkinci</th><th>Üçüncü</th></tr></thead>
<tbody>${[...SEASONS].reverse().map(s =>
    `<tr><td>${s.season}</td><td><strong>${esc(s.winner)}</strong></td><td>${esc(s.second)}</td><td>${s.third ? esc(s.third) : "–"}</td></tr>`).join("")}</tbody>
</table></div>`;
}

/** Kulüp başına şampiyonluk sayısı, sezonlar ve art arda en uzun seri. */
function clubTitles() {
  const by = new Map<string, string[]>();
  SEASONS.forEach(s => by.set(s.winner, [...(by.get(s.winner) ?? []), s.season]));
  const streak = (club: string) => {
    let best = 0, run = 0;
    for (const s of SEASONS) { run = s.winner === club ? run + 1 : 0; best = Math.max(best, run); }
    return best;
  };
  return `<div class="table-wrap"><table class="data">
<thead><tr><th>Kulüp</th><th>Şampiyonluk</th><th>En uzun seri</th><th>Sezonlar</th></tr></thead>
<tbody>${[...by].sort((a, b) => b[1].length - a[1].length).map(([club, seasons]) =>
    `<tr><td><strong>${esc(club)}</strong></td><td class="num">${seasons.length}</td><td class="num">${streak(club)}</td><td class="small">${seasons.join(", ")}</td></tr>`).join("")}</tbody>
</table></div>`;
}

function scorersTable() {
  return `<div class="table-wrap"><table class="data">
<thead><tr><th>Sezon</th><th>Gol kralı</th><th>Kulüp</th><th>Gol</th></tr></thead>
<tbody>${[...SEASONS].reverse().map(s =>
    `<tr><td>${s.season}</td><td>${s.scorers.map(x => `<strong>${esc(x.name)}</strong>`).join("<br>")}</td><td>${s.scorers.map(x => esc(x.club)).join("<br>")}</td><td class="num">${s.goals ?? "–"}</td></tr>`).join("")}</tbody>
</table></div>`;
}

/** Birden fazla gol krallığı olan oyuncular. */
function scorerLeaders() {
  const by = new Map<string, string[]>();
  SEASONS.forEach(s => s.scorers.forEach(x => by.set(x.name, [...(by.get(x.name) ?? []), s.season])));
  const rows = [...by].filter(([, s]) => s.length > 1).sort((a, b) => b[1].length - a[1].length);
  return `<div class="table-wrap"><table class="data">
<thead><tr><th>Oyuncu</th><th>Gol krallığı</th><th>Sezonlar</th></tr></thead>
<tbody>${rows.map(([name, s]) =>
    `<tr><td><strong>${esc(name)}</strong></td><td class="num">${s.length}</td><td class="small">${s.join(", ")}</td></tr>`).join("")}</tbody>
</table></div>`;
}

/** Yabancı oyuncular bölge ve ülkeye göre; her ülkeden en tanınan üç isim (veri seti bilinirliğe göre sıralı). */
function nations() {
  const by = new Map<string, string[]>();
  PLAYERS.filter(p => p.nat !== "Türkiye").forEach(p => by.set(p.nat, [...(by.get(p.nat) ?? []), p.name]));
  const regions = new Map<string, [string, string[]][]>();
  [...by].sort((a, b) => b[1].length - a[1].length).forEach(([n, names]) => {
    const r = NATIONS[n]?.[1] ?? "Diğer";
    regions.set(r, [...(regions.get(r) ?? []), [n, names]]);
  });
  const total = (list: [string, string[]][]) => list.reduce((t, [, names]) => t + names.length, 0);
  return [...regions].sort((a, b) => total(b[1]) - total(a[1])).map(([region, list]) =>
    `<h3>${esc(region)} <small>${total(list)} oyuncu</small></h3>
<div class="table-wrap"><table class="data">
<thead><tr><th>Ülke</th><th>Oyuncu</th><th>Öne çıkanlar</th></tr></thead>
<tbody>${list.map(([n, names]) =>
      `<tr><td>${nat(n)}</td><td class="num">${names.length}</td><td class="small">${names.slice(0, 3).map(esc).join(", ")}</td></tr>`).join("")}</tbody>
</table></div>`).join("\n");
}

/** Yazılarda geçen sayılar: metin elle yazıldığı için tablo değişince güncel kalsın diye buradan gelir. */
function figures(): Record<string, string | number> {
  const foreign = PLAYERS.filter(p => p.nat !== "Türkiye");
  const titles = (club: string) => SEASONS.filter(s => s.winner === club).length;
  return {
    seasons: SEASONS.length, lastSeason: SEASONS.at(-1)!.season, lastChampion: SEASONS.at(-1)!.winner,
    gs: titles("Galatasaray"), fb: titles("Fenerbahçe"), bjk: titles("Beşiktaş"), ts: titles("Trabzonspor"),
    champions: new Set(SEASONS.map(s => s.winner)).size,
    players: PLAYERS.length, foreign: foreign.length, countries: new Set(foreign.map(p => p.nat)).size,
    positions: Object.keys(POS_GROUP).length,
  };
}

export function render(html: string, root: string) {
  const parts: Record<string, () => string> = {
    archive, articles: () => articles(root), champions: championsTable, "club-titles": clubTitles,
    scorers: scorersTable, "scorer-leaders": scorerLeaders, nations,
  };
  const f = figures();
  return html
    .replace(/<!--render:([\w-]+)-->/g, (m, name) => parts[name]?.() ?? m)
    .replace(/\{\{(\w+)\}\}/g, (m, key) => String(f[key] ?? m));
}
