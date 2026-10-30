import DAILY from "./daily.json";
import type { Comparison, Level, Player, Position, Verdict } from "./types";

export const POS_LABEL: Record<Position, string> = {
  "Kaleci": "Kaleci", "Stoper": "Stoper", "Sol bek": "Sol bek", "Sağ bek": "Sağ bek",
  "Defansif OS": "Defansif orta saha", "Merkez OS": "Merkez orta saha", "Ofansif OS": "Ofansif orta saha", "Kanat": "Kanat", "Santrfor": "Santrfor",
};

export const POS_GROUP: Record<Position, string> = {
  "Kaleci": "Kaleci", "Stoper": "Defans", "Sol bek": "Defans", "Sağ bek": "Defans",
  "Defansif OS": "Orta saha", "Merkez OS": "Orta saha", "Ofansif OS": "Orta saha", "Kanat": "Hücum", "Santrfor": "Hücum",
};

// Kural belgesindeki bölge tablosu. Sarı = aynı bölge; Türkiye kendi başına bir bölge, böylece Türk oyuncular
// yabancı Avrupalılara sarı yakmaz. Kod: bayrak için ISO kodu ("GB-ENG" gibi alt bölgeler dahil); bugün var
// olmayan ülkelerde (Yugoslavya, Doğu Almanya) boş.
const REGIONS: Record<string, [code: string, region: string]> = {
  // Türkiye
  "Türkiye": ["TR", "Türkiye"],
  // Batı Avrupa
  "İngiltere": ["GB-ENG", "Batı Avrupa"], "İskoçya": ["GB-SCT", "Batı Avrupa"], "Galler": ["GB-WLS", "Batı Avrupa"], "Kuzey İrlanda": ["GB-NIR", "Batı Avrupa"], "İrlanda": ["IE", "Batı Avrupa"], "Fransa": ["FR", "Batı Avrupa"], "Belçika": ["BE", "Batı Avrupa"], "Hollanda": ["NL", "Batı Avrupa"], "Lüksemburg": ["LU", "Batı Avrupa"], "Almanya": ["DE", "Batı Avrupa"], "Doğu Almanya": ["", "Batı Avrupa"], "Avusturya": ["AT", "Batı Avrupa"], "İsviçre": ["CH", "Batı Avrupa"], "İspanya": ["ES", "Batı Avrupa"], "Portekiz": ["PT", "Batı Avrupa"], "İtalya": ["IT", "Batı Avrupa"],
  // Kuzey Avrupa
  "İsveç": ["SE", "Kuzey Avrupa"], "Norveç": ["NO", "Kuzey Avrupa"], "Danimarka": ["DK", "Kuzey Avrupa"], "Finlandiya": ["FI", "Kuzey Avrupa"], "İzlanda": ["IS", "Kuzey Avrupa"],
  // Balkanlar / Doğu Avrupa
  "Yunanistan": ["GR", "Balkanlar / Doğu Avrupa"], "Kıbrıs": ["CY", "Balkanlar / Doğu Avrupa"], "Kuzey Kıbrıs": ["", "Balkanlar / Doğu Avrupa"], "Bulgaristan": ["BG", "Balkanlar / Doğu Avrupa"], "Romanya": ["RO", "Balkanlar / Doğu Avrupa"], "Sırbistan": ["RS", "Balkanlar / Doğu Avrupa"], "Yugoslavya": ["", "Balkanlar / Doğu Avrupa"], "Sırbistan-Karadağ": ["", "Balkanlar / Doğu Avrupa"], "Hırvatistan": ["HR", "Balkanlar / Doğu Avrupa"], "Bosna-Hersek": ["BA", "Balkanlar / Doğu Avrupa"], "Karadağ": ["ME", "Balkanlar / Doğu Avrupa"], "Kuzey Makedonya": ["MK", "Balkanlar / Doğu Avrupa"], "Arnavutluk": ["AL", "Balkanlar / Doğu Avrupa"], "Kosova": ["XK", "Balkanlar / Doğu Avrupa"], "Slovenya": ["SI", "Balkanlar / Doğu Avrupa"], "Macaristan": ["HU", "Balkanlar / Doğu Avrupa"], "Çekya": ["CZ", "Balkanlar / Doğu Avrupa"], "Çekoslovakya": ["", "Balkanlar / Doğu Avrupa"], "Slovakya": ["SK", "Balkanlar / Doğu Avrupa"], "Polonya": ["PL", "Balkanlar / Doğu Avrupa"], "Ukrayna": ["UA", "Balkanlar / Doğu Avrupa"], "Rusya": ["RU", "Balkanlar / Doğu Avrupa"], "Sovyetler Birliği": ["", "Balkanlar / Doğu Avrupa"], "Belarus": ["BY", "Balkanlar / Doğu Avrupa"], "Moldova": ["MD", "Balkanlar / Doğu Avrupa"], "Litvanya": ["LT", "Balkanlar / Doğu Avrupa"], "Letonya": ["LV", "Balkanlar / Doğu Avrupa"], "Estonya": ["EE", "Balkanlar / Doğu Avrupa"],
  // Kafkasya / Orta Asya
  "Gürcistan": ["GE", "Kafkasya / Orta Asya"], "Azerbaycan": ["AZ", "Kafkasya / Orta Asya"], "Ermenistan": ["AM", "Kafkasya / Orta Asya"], "Kazakistan": ["KZ", "Kafkasya / Orta Asya"], "Özbekistan": ["UZ", "Kafkasya / Orta Asya"], "Türkmenistan": ["TM", "Kafkasya / Orta Asya"], "Kırgızistan": ["KG", "Kafkasya / Orta Asya"], "Tacikistan": ["TJ", "Kafkasya / Orta Asya"],
  // Orta Doğu
  "İran": ["IR", "Orta Doğu"], "Irak": ["IQ", "Orta Doğu"], "Suriye": ["SY", "Orta Doğu"], "Ürdün": ["JO", "Orta Doğu"], "Lübnan": ["LB", "Orta Doğu"], "İsrail": ["IL", "Orta Doğu"], "Filistin": ["PS", "Orta Doğu"], "Suudi Arabistan": ["SA", "Orta Doğu"], "Katar": ["QA", "Orta Doğu"], "Birleşik Arap Emirlikleri": ["AE", "Orta Doğu"], "Kuveyt": ["KW", "Orta Doğu"], "Bahreyn": ["BH", "Orta Doğu"], "Umman": ["OM", "Orta Doğu"],
  // Asya / Okyanusya
  "Japonya": ["JP", "Asya / Okyanusya"], "Güney Kore": ["KR", "Asya / Okyanusya"], "Çin": ["CN", "Asya / Okyanusya"], "Avustralya": ["AU", "Asya / Okyanusya"], "Yeni Zelanda": ["NZ", "Asya / Okyanusya"], "Endonezya": ["ID", "Asya / Okyanusya"], "Tayland": ["TH", "Asya / Okyanusya"],
  // Kuzey Afrika
  "Mısır": ["EG", "Kuzey Afrika"], "Libya": ["LY", "Kuzey Afrika"], "Tunus": ["TN", "Kuzey Afrika"], "Cezayir": ["DZ", "Kuzey Afrika"], "Fas": ["MA", "Kuzey Afrika"],
  // Sahra Altı Afrika
  "Senegal": ["SN", "Sahra Altı Afrika"], "Mali": ["ML", "Sahra Altı Afrika"], "Gine": ["GN", "Sahra Altı Afrika"], "Gine-Bissau": ["GW", "Sahra Altı Afrika"], "Fildişi Sahili": ["CI", "Sahra Altı Afrika"], "Gana": ["GH", "Sahra Altı Afrika"], "Nijerya": ["NG", "Sahra Altı Afrika"], "Kamerun": ["CM", "Sahra Altı Afrika"], "Gabon": ["GA", "Sahra Altı Afrika"], "Kongo DC": ["CD", "Sahra Altı Afrika"], "Kongo": ["CG", "Sahra Altı Afrika"], "Zambiya": ["ZM", "Sahra Altı Afrika"], "Güney Afrika": ["ZA", "Sahra Altı Afrika"], "Togo": ["TG", "Sahra Altı Afrika"], "Çad": ["TD", "Sahra Altı Afrika"], "Yeşil Burun Adaları": ["CV", "Sahra Altı Afrika"], "Gambiya": ["GM", "Sahra Altı Afrika"], "Uganda": ["UG", "Sahra Altı Afrika"], "Benin": ["BJ", "Sahra Altı Afrika"], "Burkina Faso": ["BF", "Sahra Altı Afrika"], "Ekvator Ginesi": ["GQ", "Sahra Altı Afrika"], "Angola": ["AO", "Sahra Altı Afrika"], "Zimbabve": ["ZW", "Sahra Altı Afrika"], "Kenya": ["KE", "Sahra Altı Afrika"], "Tanzanya": ["TZ", "Sahra Altı Afrika"], "Sierra Leone": ["SL", "Sahra Altı Afrika"], "Liberya": ["LR", "Sahra Altı Afrika"], "Komorlar": ["KM", "Sahra Altı Afrika"], "Mozambik": ["MZ", "Sahra Altı Afrika"], "Nijer": ["NE", "Sahra Altı Afrika"], "Orta Afrika Cumhuriyeti": ["CF", "Sahra Altı Afrika"], "Burundi": ["BI", "Sahra Altı Afrika"], "Ruanda": ["RW", "Sahra Altı Afrika"], "Etiyopya": ["ET", "Sahra Altı Afrika"], "Moritanya": ["MR", "Sahra Altı Afrika"], "Madagaskar": ["MG", "Sahra Altı Afrika"], "Sudan": ["SD", "Sahra Altı Afrika"],
  // Kuzey / Orta Amerika
  "ABD": ["US", "Kuzey / Orta Amerika"], "Kanada": ["CA", "Kuzey / Orta Amerika"], "Meksika": ["MX", "Kuzey / Orta Amerika"], "Kosta Rika": ["CR", "Kuzey / Orta Amerika"], "Jamaika": ["JM", "Kuzey / Orta Amerika"], "Honduras": ["HN", "Kuzey / Orta Amerika"], "Panama": ["PA", "Kuzey / Orta Amerika"], "Trinidad ve Tobago": ["TT", "Kuzey / Orta Amerika"], "Surinam": ["SR", "Kuzey / Orta Amerika"], "Curaçao": ["CW", "Kuzey / Orta Amerika"], "Martinik": ["MQ", "Kuzey / Orta Amerika"], "Haiti": ["HT", "Kuzey / Orta Amerika"], "El Salvador": ["SV", "Kuzey / Orta Amerika"], "Guatemala": ["GT", "Kuzey / Orta Amerika"],
  // Güney Amerika
  "Brezilya": ["BR", "Güney Amerika"], "Arjantin": ["AR", "Güney Amerika"], "Uruguay": ["UY", "Güney Amerika"], "Şili": ["CL", "Güney Amerika"], "Kolombiya": ["CO", "Güney Amerika"], "Paraguay": ["PY", "Güney Amerika"], "Peru": ["PE", "Güney Amerika"], "Ekvador": ["EC", "Güney Amerika"], "Venezuela": ["VE", "Güney Amerika"], "Bolivya": ["BO", "Güney Amerika"],
};

/** "TR" → 🇹🇷, "GB-ENG" → 🏴󠁧󠁢󠁥󠁮󠁧󠁿 */
function flag(code: string) {
  if (!code) return "🏳️";
  if (code.includes("-")) {
    const tag = code.toLowerCase().replace("-", "");
    return "🏴" + [...tag].map(c => String.fromCodePoint(0xe0000 + c.charCodeAt(0))).join("") + "\u{e007f}";
  }
  return [...code].map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join("");
}

export const NATIONS: Record<string, [flag: string, region: string]> = Object.fromEntries(
  Object.entries(REGIONS).map(([name, [code, region]]) => [name, [flag(code), region]]),
);

export const CAPS = ["0", "1–20", "21–50", "51–100", "100+"];

export const HEADS = ["Futbolcu", "Pozisyon", "Uyruk", "Kulüpler", "Doğum yılı", "Dönem", "Şampiyonluk", "Milli maç", "Durum"];

/** Tahmin satırındaki özellik kutularının sırası (paylaşım metni de bu sırayı kullanır). */
export const TILE_KEYS = ["pos", "nat", "clubs", "born", "era", "titles", "caps", "active"] as const;

/** Cevap tahminden yüksekse ↑, düşükse ↓. */
export function arrowOf(guess: number, answer: number): "↑" | "↓" | "" {
  return answer > guess ? "↑" : answer < guess ? "↓" : "";
}

export function compare(g: Player, a: Player): Comparison {
  const shared = g.clubs.filter(c => a.clubs.includes(c));
  const sameClubs = shared.length === g.clubs.length && shared.length === a.clubs.length;
  const near = (hit: boolean, close: boolean): Verdict => hit ? "hit" : close ? "near" : "miss";
  return {
    pos: near(g.pos === a.pos, POS_GROUP[g.pos] === POS_GROUP[a.pos]),
    nat: near(g.nat === a.nat, NATIONS[g.nat][1] === NATIONS[a.nat][1]),
    clubs: near(sameClubs, shared.length > 0),
    shared,
    born: near(g.born === a.born, Math.abs(g.born - a.born) <= 3),
    era: near(g.era === a.era, Math.abs(g.era - a.era) === 10),
    titles: near(g.titles === a.titles, Math.abs(g.titles - a.titles) <= 1),
    caps: near(g.caps === a.caps, Math.abs(g.caps - a.caps) === 1),
    active: g.active === a.active ? "hit" : "miss",
  };
}

/** 1990 → "1990'lar", 2000 → "2000'ler" (on yılın son sesine göre ek) */
export function decade(year: number) {
  const last = year % 100 === 0 ? (year % 1000 === 0 ? "bin" : "yüz") : ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"][(year % 100) / 10];
  return `${year}'${/[aıou][^aeıioöuü]*$/.test(last) ? "lar" : "ler"}`;
}

/** Türkçe harflere duyarsız arama: "sukur" → "Şükür", "ilhan" → "İlhan". */
export const norm = (s: string) =>
  s.toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Cevap olabilecek en düşük bilinirlik puanı (kural belgesi: günlük 4–5, normal 3–5, zor herkes) */
const MIN_FAME = { daily: 4, normal: 3, hard: 1 } as const;

/**
 * Günlük cevap olabilecek oyuncuların PLAYERS içindeki sıraları. Liste daily.json'da sabit: veri yeniden kurulup
 * oyuncu eklense ya da sıra değişse de geçmiş günlerin (arşiv) ve bugünün cevabı değişmez.
 */
export function dailyPool(players: Player[]): number[] {
  const at = new Map(players.map((p, i) => [p.name, i]));
  return DAILY.map(name => {
    const i = at.get(name);
    if (i === undefined) throw new Error(`Günlük listedeki oyuncu veride yok: ${name}`);
    return i;
  });
}

/** Verilen modda cevap olabilecek oyuncuların PLAYERS içindeki sıraları */
export function answerPool(players: Player[], level: Level | "daily"): number[] {
  return players.flatMap((p, i) => p.fame >= MIN_FAME[level] ? [i] : []);
}

const more = (guess: number, answer: number, up: string, down: string) => answer > guess ? up : down;

/** Kutuya dokununca çıkan tek cümlelik açıklama: neden bu renk. Cevabı rengin söylediğinden fazla açık etmez. */
export function explain(key: (typeof TILE_KEYS)[number], g: Player, a: Player): string {
  const c = compare(g, a);
  const v = c[key];
  switch (key) {
    case "pos":
      return v === "hit" ? `İkisi de ${POS_LABEL[g.pos].toLocaleLowerCase("tr")}.`
        : v === "near" ? `Mevkiler farklı ama ikisi de ${POS_GROUP[g.pos].toLocaleLowerCase("tr")} grubunda.`
        : `Cevap ${POS_GROUP[g.pos].toLocaleLowerCase("tr")} grubunda değil.`;
    case "nat":
      return v === "hit" ? `İkisi de ${g.nat}.`
        : v === "near" ? `Ülkeler farklı ama aynı bölgede: ${NATIONS[g.nat][1]}.`
        : `Cevap ${NATIONS[g.nat][1]} bölgesinden değil.`;
    case "clubs":
      return v === "hit" ? "Kulüp listeleri tamamen aynı."
        : v === "near" ? `Ortak kulüp: ${c.shared.join(", ")}. Listelerin geri kalanı farklı.`
        : "Hiç ortak kulüpleri yok.";
    case "born":
      return v === "hit" ? "Aynı yıl doğmuşlar."
        : `${v === "near" ? "En fazla 3 yıl" : "3 yıldan fazla"} fark var; cevap daha ${more(g.born, a.born, "genç", "yaşlı")}.`;
    case "era":
      return v === "hit" ? "Kariyerlerinin ortası aynı on yıla denk geliyor."
        : `${v === "near" ? "Komşu on yıl" : "En az iki on yıl fark"}; cevap daha ${more(g.era, a.era, "yakın bir dönemde", "eski bir dönemde")} oynamış.`;
    case "titles":
      return v === "hit" ? "Süper Lig şampiyonluğu sayıları aynı."
        : `${v === "near" ? "En fazla 1" : "1'den fazla"} fark var; cevabın şampiyonluğu daha ${more(g.titles, a.titles, "çok", "az")}.`;
    case "caps":
      return v === "hit" ? `Milli maç sayıları aynı aralıkta (${CAPS[g.caps]}).`
        : `${v === "near" ? "Komşu aralık" : "En az iki aralık fark"}; cevap daha ${more(g.caps, a.caps, "çok", "az")} milli maça çıkmış.`;
    case "active":
      return v === "hit" ? `İkisi de ${g.active ? "hâlâ oynuyor" : "emekli"}.` : `Cevap ${g.active ? "emekli" : "hâlâ oynuyor"}.`;
  }
}

/** Sayısal kutularda yeşil, sarı ve kırmızının anlamı: sarı = fark 1 adım ile `near` arasında. */
const STEPS = { born: [1, 3], era: [10, 10], titles: [1, 1], caps: [1, 1] } as const;
type NumKey = keyof typeof STEPS;

export interface Clues {
  pos: { exact: boolean; text: string } | null;
  nat: { exact: boolean; text: string } | null;
  clubs: string[];
  /** Cevabın olabileceği en küçük ve en büyük değer (bilinmiyorsa sonsuz) */
  range: Record<NumKey, [lo: number, hi: number]>;
  active: boolean | null;
}

/** Şimdiye kadarki tahminlerin renk ve oklarından cevap hakkında kesin olarak bilinenler. */
export function clues(guessed: Player[], a: Player): Clues {
  const out: Clues = {
    pos: null, nat: null, clubs: [], active: null,
    range: { born: [-Infinity, Infinity], era: [-Infinity, Infinity], titles: [-Infinity, Infinity], caps: [-Infinity, Infinity] },
  };
  for (const g of guessed) {
    const c = compare(g, a);
    if (c.pos === "hit") out.pos = { exact: true, text: POS_LABEL[g.pos] };
    else if (c.pos === "near" && !out.pos) out.pos = { exact: false, text: `${POS_GROUP[g.pos]} grubu` };
    if (c.nat === "hit") out.nat = { exact: true, text: `${NATIONS[g.nat][0]} ${g.nat}`.trim() };
    else if (c.nat === "near" && !out.nat?.exact) out.nat = { exact: false, text: NATIONS[g.nat][1] };
    // Türkiye tek başına bir bölge: Türk tahmin kırmızıysa cevap yabancıdır
    else if (c.nat === "miss" && g.nat === "Türkiye" && !out.nat) out.nat = { exact: false, text: "Yabancı" };
    out.clubs = c.clubs === "hit" ? [...g.clubs] : [...new Set([...out.clubs, ...c.shared])];
    out.active = c.active === "hit" ? g.active : !g.active;
    for (const key of Object.keys(STEPS) as NumKey[]) {
      const [step, near] = STEPS[key], v = g[key], r = out.range[key];
      const up = a[key] > v, verdict = c[key];
      // Tahmine uzaklık: yeşil 0, sarı [step, near], kırmızı near'dan fazla
      const [dLo, dHi] = verdict === "hit" ? [0, 0] : verdict === "near" ? [step, near] : [near + step, Infinity];
      const lo = up ? v + dLo : v - dHi, hi = up ? v + dHi : v - dLo;
      out.range[key] = [Math.max(r[0], lo), Math.min(r[1], hi)];
    }
  }
  return out;
}

const CAP_EDGES = [[0, 0], [1, 20], [21, 50], [51, 100], [101, Infinity]];

/** Clues aralığını kısa metne çevirir: "1988–1991", "1990 ve sonrası", "en az 2". Hiçbir şey bilinmiyorsa null. */
export function rangeText(key: NumKey, [lo, hi]: [number, number]): string | null {
  if (lo === -Infinity && hi === Infinity) return null;
  if (key === "caps") {
    const a = lo === -Infinity ? 0 : CAP_EDGES[lo][0], b = hi === Infinity ? Infinity : CAP_EDGES[hi][1];
    return lo === hi ? CAPS[lo] : b === Infinity ? `${a}+` : a === 0 ? `en fazla ${b}` : `${a}–${b}`;
  }
  const fmt = key === "era" ? decade : String;
  if (lo === hi) return fmt(lo);
  if (key === "titles") return hi === Infinity ? `en az ${lo}` : lo <= 0 || lo === -Infinity ? `en fazla ${hi}` : `${lo}–${hi}`;
  if (hi === Infinity) return `${fmt(lo)} ve sonrası`;
  if (lo === -Infinity) return `${fmt(hi)} ve öncesi`;
  return key === "era" ? `${fmt(lo)}–${fmt(hi)}` : `${lo}–${hi}`;
}
