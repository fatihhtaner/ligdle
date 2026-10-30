#!/usr/bin/env python3
"""Oyun verisini kurar: data/candidates.csv'nin ilk N oyuncusu için 8 kutuyu hesaplar.

Kaynaklar: İngilizce Wikipedia futbolcu bilgi kutusu (mevki, kulüpler, yıllar, lig maçı, milli takım),
Wikidata (doğum yılı, uyruk, yedek olarak kulüpler) ve şampiyonlar listesi. Kurallar kural belgesindedir.

Çıktılar:
  src/game/players.json      oyunun okuduğu veri
  data/players_review.csv    elle kontrol listesi (her alanın değeri ve kuşkulu alanlar)
Elle düzeltmeler data/overrides.csv dosyasına yazılır ve her kurulumda en son uygulanır.

Ham indirmeler data/raw/build/ altında önbelleğe alınır; --fresh ile yeniden çekilir.
Çalıştırma:  python3 scripts/build_players.py [--top 1000]
"""
import csv
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
CACHE = RAW / "build"
CANDIDATES = ROOT / "data" / "candidates.csv"
OVERRIDES = ROOT / "data" / "overrides.csv"
LEGENDS = ROOT / "data" / "legends.csv"
DROP = ROOT / "data" / "drop.csv"
OUT = ROOT / "src" / "game" / "players.json"
REVIEW = ROOT / "data" / "players_review.csv"

USER_AGENT = "LigdleDataBot/0.1 (https://github.com/fatihhtaner/ligdle)"
FRESH = "--fresh" in sys.argv
TOP = int(sys.argv[sys.argv.index("--top") + 1]) if "--top" in sys.argv else 1000
# Şampiyonluklar en son tamamlanan sezona kadar sayılır (sezon, bittiği yılla anılır: 2025–26 → 2026).
LAST_SEASON = 2026
# Dönemi 1980'ler ve öncesi olan oyuncular yalnızca data/legends.csv listesindeyse alınır: eski oyuncuların
# Wikipedia okunması (teknik direktörlük, yorumculuk, ölüm haberi) bugünkü tanınırlığını göstermiyor.
OLD_ERA = 1980
CURRENT_YEAR = time.localtime().tm_year


# --- indirme -------------------------------------------------------------------------------------

def get_json(url, params=None, data=None):
    if params:
        url += "?" + urllib.parse.urlencode(params)
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, data=data, headers={
                "User-Agent": USER_AGENT, "Accept": "application/sparql-results+json, application/json"})
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.load(r)
        except Exception as e:
            wait = 4 * (attempt + 1)
            print(f"  istek hatası ({e}); {wait} sn sonra yeniden", file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError(url)


def sparql(query):
    data = urllib.parse.urlencode({"query": query}).encode()
    return get_json("https://query.wikidata.org/sparql", data=data)["results"]["bindings"]


def cached(name, fn):
    path = CACHE / f"{name}.json"
    if path.exists() and not FRESH:
        return json.loads(path.read_text())
    out = fn()
    CACHE.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out, ensure_ascii=False))
    return out


def chunks(xs, n):
    xs = list(xs)
    for i in range(0, len(xs), n):
        yield xs[i:i + n]


def wd_id(uri):
    return uri.rsplit("/", 1)[1]


def fetch_enwiki_titles(qids):
    out = {}
    for batch in chunks(qids, 300):
        rows = sparql(f"""SELECT ?p ?title WHERE {{
          VALUES ?p {{ {" ".join("wd:" + q for q in batch)} }}
          ?a schema:about ?p ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?title . }}""")
        out.update({wd_id(b["p"]["value"]): b["title"]["value"] for b in rows})
        time.sleep(1)
    return out


def fetch_intros(titles, lang="en"):
    """Makalelerin giriş bölümü (bilgi kutusu burada)."""
    out = {}
    for i, batch in enumerate(chunks(sorted(titles), 40)):
        if i % 5 == 0:
            print(f"  bilgi kutusu {i * 40}/{len(titles)}", file=sys.stderr)
        res = get_json(f"https://{lang}.wikipedia.org/w/api.php", {
            "action": "query", "prop": "revisions", "rvprop": "content", "rvslots": "main", "rvsection": 0,
            "redirects": 1, "format": "json", "formatversion": 2, "titles": "|".join(batch)})
        q = res["query"]
        back = {r["to"]: r["from"] for r in q.get("redirects", [])}
        for page in q["pages"]:
            text = page.get("revisions", [{}])[0].get("slots", {}).get("main", {}).get("content", "")
            out[back.get(page["title"], page["title"])] = text
        time.sleep(0.5)
    return out


def resolve_links(titles, lang="en"):
    """Wikipedia bağlantı hedefi → Wikidata QID (yönlendirmeler izlenir)."""
    out = {}
    for batch in chunks(sorted(titles), 50):
        res = get_json(f"https://{lang}.wikipedia.org/w/api.php", {
            "action": "query", "prop": "pageprops", "ppprop": "wikibase_item", "redirects": 1,
            "format": "json", "formatversion": 2, "titles": "|".join(batch)})
        q = res["query"]
        norm = {n["to"]: n["from"] for n in q.get("normalized", [])}
        redir = {r["to"]: r["from"] for r in q.get("redirects", [])}
        for page in q["pages"]:
            item = page.get("pageprops", {}).get("wikibase_item")
            t = page["title"]
            for _ in range(3):  # hedef → yönlendirme → normalleştirme zincirini geri sar
                t = redir.get(t, norm.get(t, t))
            out[t] = item
            out[page["title"]] = item
        time.sleep(0.3)
    return out


def fetch_tr_labels(qids):
    out = {}
    for batch in chunks(sorted(qids), 300):
        rows = sparql(f"""SELECT ?x ?tr ?en WHERE {{
          VALUES ?x {{ {" ".join("wd:" + q for q in batch)} }}
          OPTIONAL {{ ?x rdfs:label ?tr FILTER(LANG(?tr) = "tr") }}
          OPTIONAL {{ ?x rdfs:label ?en FILTER(LANG(?en) = "en") }} }}""")
        for b in rows:
            out[wd_id(b["x"]["value"])] = (b.get("tr") or b.get("en") or {}).get("value")
        time.sleep(1)
    return out


NATION_NAMES = {  # Wikidata adı → oyundaki ad (kural belgesindeki bölge tablosu)
    "Bosna Hersek": "Bosna-Hersek", "Demokratik Kongo Cumhuriyeti": "Kongo DC", "Kongo Demokratik Cumhuriyeti": "Kongo DC",
    "Hollanda Krallığı": "Hollanda", "Amerika Birleşik Devletleri": "ABD", "Beyaz Rusya": "Belarus",
    "Birleşik Krallık": "İngiltere", "Cabo Verde": "Yeşil Burun Adaları", "Çek Cumhuriyeti": "Çekya",
    "Makedonya": "Kuzey Makedonya", "Kuzey Kıbrıs Türk Cumhuriyeti": "Kuzey Kıbrıs", "Güney Kore": "Güney Kore", "Kore Cumhuriyeti": "Güney Kore",
}


# FIFA üyesi olmayan bölge takımları ve olimpiyat / genç takımları uyruk sayılmaz.
NOT_SENIOR = re.compile(r"olimpi|ümit|genç|yaş|galiçya|bask|katalonya", re.I)


def nation_name(label):
    """'İngiltere millî futbol takımı' → 'İngiltere'"""
    n = re.sub(r"\s+(millî|milli|ulusal)\s+futbol\s+takımı$", "", label.strip(), flags=re.I)
    return NATION_NAMES.get(n, n)


# --- bilgi kutusu ayrıştırma ---------------------------------------------------------------------

def template_body(text, name_re=r"infobox\s+football\s+biography"):
    m = re.search(r"\{\{\s*" + name_re, text, re.I)
    if not m:
        return None
    depth, i = 0, m.start()
    while i < len(text):
        if text.startswith("{{", i):
            depth += 1
            i += 2
        elif text.startswith("}}", i):
            depth -= 1
            i += 2
            if depth == 0:
                return text[m.end():i - 2]
        else:
            i += 1
    return None


def params(body):
    """Şablon parametreleri; [[...]] ve {{...}} içindeki | işaretleri bölmez."""
    out, depth, cur = {}, 0, ""
    parts = []
    i = 0
    while i < len(body):
        two = body[i:i + 2]
        if two in ("{{", "[["):
            depth += 1
            cur += two
            i += 2
            continue
        if two in ("}}", "]]"):
            depth -= 1
            cur += two
            i += 2
            continue
        if body[i] == "|" and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += body[i]
        i += 1
    parts.append(cur)
    for p in parts:
        if "=" in p:
            k, v = p.split("=", 1)
            out[k.strip().lower().replace("_", "")] = re.sub(r"<!--.*?-->", "", v, flags=re.S).strip()
    return out


LINK = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]")


def links(s):
    """[(hedef, görünen metin)]"""
    return [(m.group(1).strip(), (m.group(2) or m.group(1)).strip()) for m in LINK.finditer(s)]


def plain(s):
    s = re.sub(r"<ref[^>]*/>|<ref.*?</ref>", "", s, flags=re.S)
    s = LINK.sub(lambda m: m.group(2) or m.group(1), s)
    s = re.sub(r"\{\{[^{}]*\}\}", "", s)
    s = re.sub(r"<[^>]+>|'''?", "", s)
    return s.strip()


def number(s):
    m = re.search(r"\d+", plain(s or "").replace(",", ""))
    return int(m.group()) if m else None


def years(s):
    """'2004–2012' → (2004, 2012); '2019–' → (2019, None); '2012' → (2012, 2012)."""
    s = plain(s or "")
    ys = re.findall(r"(1[89]\d\d|20\d\d)", s)
    if not ys:
        return None
    start = int(ys[0])
    if len(ys) > 1:
        return start, int(ys[1])
    return (start, None) if re.search(r"[–-]\s*$", s) else (start, start)


RESERVE = re.compile(r"(\s(II|B|U\d\d|Reserves?|Next Gen|A2)$)|reserves|under-\d\d|youth|academy|altyapı| u\d\d\b", re.I)


EN_KEYS = {"club": "clubs{}", "years": "years{}", "apps": "caps{}", "team": "nationalteam{}", "caps": "nationalcaps{}"}
TR_KEYS = {"club": "kulüp{}", "years": "kulüpyıl{}", "apps": "maç{}", "team": "millitakım{}", "caps": "millimaç{}"}


def spells_from_infobox(p, keys=EN_KEYS):
    """Büyükler kariyeri: [{target, text, start, end, apps, loan}]"""
    out = []
    for n in range(1, 60):
        club = p.get(keys["club"].format(n))
        if club is None:
            continue
        ls = links(club)
        if not ls:
            continue
        target, text = ls[0]
        y = years(p.get(keys["years"].format(n), ""))
        apps_raw = plain(p.get(keys["apps"].format(n), ""))
        apps = number(apps_raw) if apps_raw else None
        out.append({"target": target, "text": plain(text), "start": y[0] if y else None,
                    "end": y[1] if y else None, "open": bool(y and y[1] is None),
                    "apps": apps, "loan": "→" in club or "loan" in club.lower()})
    return out


def national_from_infobox(p, keys=EN_KEYS):
    out = []
    for n in range(1, 30):
        team = p.get(keys["team"].format(n))
        if not team:
            continue
        ls = links(team)
        caps = number(p.get(keys["caps"].format(n), ""))
        fb = re.fullmatch(r"\{\{\s*fb\s*\|\s*([A-Z]{3})\s*\}\}", team.strip())
        if fb:  # Türkçe kutularda A milli takım çoğu zaman {{fb|TUR}} şablonuyla yazılır
            out.append({"target": None, "text": "", "code": fb.group(1), "caps": caps})
        elif ls:
            out.append({"target": ls[0][0], "text": plain(ls[0][1]), "caps": caps})
    return out


# --- kurallar --------------------------------------------------------------------------------------

POSITIONS = [  # (anahtar kelime, mevki) — sıra önemli: özelden genele
    ("goalkeeper", "Kaleci"), ("left-back", "Sol bek"), ("left back", "Sol bek"), ("left wing-back", "Sol bek"),
    ("right-back", "Sağ bek"), ("right back", "Sağ bek"), ("right wing-back", "Sağ bek"),
    ("centre-back", "Stoper"), ("center-back", "Stoper"), ("centre back", "Stoper"), ("sweeper", "Stoper"),
    ("libero", "Stoper"), ("centre-half", "Stoper"), ("center half", "Stoper"), ("stopper", "Stoper"),
    ("defensive midfield", "Defansif OS"), ("holding midfield", "Defansif OS"),
    ("attacking midfield", "Ofansif OS"), ("playmaker", "Ofansif OS"), ("inside forward", "Ofansif OS"), ("inside left", "Ofansif OS"),
    ("inside right", "Ofansif OS"),
    ("second striker", "Santrfor"), ("winger", "Kanat"), ("wide midfield", "Kanat"), ("outside forward", "Kanat"),
    ("wing", "Kanat"), ("central midfield", "Merkez OS"), ("box-to-box", "Merkez OS"), ("wing half", "Merkez OS"),
    ("half-back", "Merkez OS"), ("midfield", "Merkez OS"), ("striker", "Santrfor"), ("centre-forward", "Santrfor"),
    ("center forward", "Santrfor"), ("centre forward", "Santrfor"), ("forward", "Santrfor"),
    ("sol açık", "Kanat"), ("sağ açık", "Kanat"), ("sol bek", "Sol bek"), ("sağ bek", "Sağ bek"),
    ("kaleci", "Kaleci"), ("stoper", "Stoper"), ("libero", "Stoper"), ("ön libero", "Defansif OS"),
    ("defansif orta", "Defansif OS"), ("ofansif orta", "Ofansif OS"), ("kanat", "Kanat"), ("santrfor", "Santrfor"),
    ("forvet", "Santrfor"), ("orta saha", "Merkez OS"), ("defans", "Stoper"), ("bek", "Bek?"),
    ("full-back", "Bek?"), ("fullback", "Bek?"), ("wing-back", "Bek?"), ("defender", "Stoper"),
]
WD_POSITIONS = {"kaleci": "Kaleci", "savunma": "Stoper", "stoper": "Stoper", "bek": "Bek?", "sol bek": "Sol bek",
                "sağ bek": "Sağ bek", "defansif orta saha": "Defansif OS", "orta saha": "Merkez OS",
                "ofansif orta saha": "Ofansif OS", "kanat": "Kanat", "forvet": "Santrfor", "santrfor": "Santrfor"}


def position(infobox_pos, wd_pos):
    s = plain(infobox_pos or "").lower()
    if s:
        first = re.split(r",|/|\band\b|\bor\b|<br", s)[0]
        for text in (first, s):
            for key, pos in POSITIONS:
                if key in text:
                    return pos
    for w in (wd_pos or "").split(" / "):
        if w.strip() in WD_POSITIONS:
            return WD_POSITIONS[w.strip()]
    return None


SUFFIXES = [" Spor Kulübü", " Futbol Kulübü", " Kulübü", " S.K.", " SK", " JK", " J.K.", " FK", " F.K.", " A.Ş.",
            " FC", " F.C.", " SFK", " Futbol", " (futbol)", " (football)"]
CLUB_NAMES = {  # kural belgesi: tek ve güncel ad
    "İstanbul Başakşehir": "Başakşehir", "İstanbul Büyükşehir Belediyespor": "Başakşehir",
    "Medipol Başakşehir": "Başakşehir", "MKE Ankaragücü": "Ankaragücü", "Fatih Karagümrük": "Karagümrük",
    "Gaziantep FK": "Gaziantep FK", "Kasımpaşa": "Kasımpaşa", "Çaykur Rizespor": "Rizespor",
    "Atiker Konyaspor": "Konyaspor", "Torku Konyaspor": "Konyaspor", "Mersin İdmanyurdu": "Mersin İdman Yurdu",
}


def club_name(label):
    n = label.strip()
    for _ in range(2):
        for s in SUFFIXES:
            if n.endswith(s):
                n = n[: -len(s)].strip()
    return CLUB_NAMES.get(n, n)


def caps_range(n):
    if not n:
        return 0
    return 1 if n <= 20 else 2 if n <= 50 else 3 if n <= 100 else 4


def season_ends(start, end):
    """Bir kulüp döneminin kapsadığı sezonlar (bitiş yılıyla). Yaz transferi varsayımı: 2004–2012 → 2005…2012."""
    if start is None:
        return []
    end = end or CURRENT_YEAR
    if end <= start:
        return [start]
    return list(range(start + 1, end + 1))


def champions():
    text = (CACHE / "champions_page.txt").read_text() if (CACHE / "champions_page.txt").exists() else None
    if text is None or FRESH:
        res = get_json("https://en.wikipedia.org/w/api.php", {
            "action": "query", "prop": "revisions", "rvprop": "content", "rvslots": "main",
            "format": "json", "formatversion": 2, "titles": "List of Turkish football champions"})
        text = res["query"]["pages"][0]["revisions"][0]["slots"]["main"]["content"]
        CACHE.mkdir(parents=True, exist_ok=True)
        (CACHE / "champions_page.txt").write_text(text)
    table = text[text.index("===Süper Lig (1959–present)==="):]
    table = table[:table.index("|}")]
    out = {}
    for row in table.split("|-")[1:]:
        cells = [c for c in row.split("\n") if c.startswith("|")]
        season = re.search(r"\|(\d{4})(?:–(\d{2,4}))?\]\]", cells[0])
        y1, y2 = season.group(1), season.group(2)
        end = int(y1) if not y2 else int(y1[:2] + y2[-2:]) if len(y2) == 2 else int(y2)
        out[end] = links(cells[1])[0][0]
    return out


# --- ana akış --------------------------------------------------------------------------------------

def main():
    # Eski dönem ve çıkarılan oyuncuların yerini aday listesinin devamı doldursun diye fazlası okunur.
    pool = TOP * 7 // 5
    rows = list(csv.DictReader(CANDIDATES.open(encoding="utf-8")))[:pool]
    qids = [r["qid"] for r in rows]
    legends = {r["qid"] for r in csv.DictReader(LEGENDS.open(encoding="utf-8"))}
    drop = {r["qid"] for r in csv.DictReader(DROP.open(encoding="utf-8"))}

    print("Wikipedia başlıkları…", file=sys.stderr)
    wiki_titles = cached(f"enwiki_titles_{pool}", lambda: fetch_enwiki_titles(qids))
    print("Bilgi kutuları…", file=sys.stderr)
    intros = cached(f"intros_{pool}", lambda: fetch_intros(wiki_titles.values()))
    boxes = {}
    for q, t in wiki_titles.items():
        body = template_body(intros.get(t, ""))
        if body:
            boxes[q] = params(body)
    tr_titles = json.loads((RAW / "trwiki.json").read_text())
    if (RAW / "trwiki_abroad.json").exists():
        tr_titles |= json.loads((RAW / "trwiki_abroad.json").read_text())
    missing = {q: tr_titles[q] for q in qids if q not in boxes and q in tr_titles}
    tr_intros = cached(f"tr_intros_{pool}", lambda: fetch_intros(missing.values(), "tr"))
    tr_boxes = {}
    for q, t in missing.items():
        body = template_body(tr_intros.get(t, ""), r"futbolcu\s+bilgi\s+kutusu")
        if body:
            tr_boxes[q] = params(body)
    print(f"  {len(boxes)}/{len(rows)} oyuncunun İngilizce, {len(tr_boxes)} oyuncunun Türkçe bilgi kutusu var",
          file=sys.stderr)

    spells = {q: spells_from_infobox(b) for q, b in boxes.items()}
    spells |= {q: spells_from_infobox(b, TR_KEYS) for q, b in tr_boxes.items()}
    nats = {q: national_from_infobox(b) for q, b in boxes.items()}
    nats |= {q: national_from_infobox(b, TR_KEYS) for q, b in tr_boxes.items()}
    champ = champions()
    targets = {s["target"] for q, sp in spells.items() if q in boxes for s in sp}
    targets |= {n["target"] for q, ns in nats.items() if q in boxes for n in ns if n["target"]}
    targets |= set(champ.values())
    print("Bağlantılar Wikidata'ya…", file=sys.stderr)
    link_q = cached(f"links_{pool}", lambda: resolve_links(targets))
    tr_targets = {s["target"] for q, sp in spells.items() if q in tr_boxes for s in sp}
    tr_targets |= {n["target"] for q, ns in nats.items() if q in tr_boxes for n in ns if n["target"]}
    tr_link_q = cached(f"tr_links_{pool}", lambda: resolve_links(tr_targets, "tr"))
    team_q = ({link_q.get(n["target"]) for q, ns in nats.items() if q in boxes for n in ns}
              | {tr_link_q.get(n["target"]) for q, ns in nats.items() if q in tr_boxes for n in ns}) - {None}
    team_label = cached(f"team_labels_{pool}", lambda: fetch_tr_labels(team_q))

    turkish = {c["qid"]: c["name"] for c in json.loads((RAW / "clubs.json").read_text())
               if not RESERVE.search(c["name"]) and not re.search(r"kadın|plaj|millî", c["name"], re.I)}
    champ_q = {end: link_q.get(t) for end, t in champ.items()}
    print(f"  {len(champ_q)} sezon şampiyonu ({min(champ_q)}–{max(champ_q)})", file=sys.stderr)

    overrides = {}
    if OVERRIDES.exists():
        for o in csv.DictReader(OVERRIDES.open(encoding="utf-8")):
            overrides.setdefault(o["qid"], {})[o["alan"]] = o["deger"]

    players, review, skipped = [], [], Counter()
    for r in rows:
        if len(players) == TOP:
            break
        q, flags = r["qid"], []
        if q in drop:
            skipped["çıkarılan (data/drop.csv)"] += 1
            continue
        box = boxes.get(q) or tr_boxes.get(q)
        lq = tr_link_q if q in tr_boxes else link_q
        abroad = r["giris"] != "Türk kulübü"

        # Kulüpler: Türk kulübünde en az bir lig maçı; yurt dışı milli oyuncuda bütün büyükler kariyeri.
        sp = []
        if box:
            for s in spells[q]:
                cq = lq.get(s["target"])
                if s["apps"] == 0 or RESERVE.search(s["text"]) or RESERVE.search(s["target"]):
                    continue
                if cq in turkish:
                    sp.append({**s, "q": cq, "name": club_name(turkish[cq])})
                elif abroad:
                    sp.append({**s, "q": cq, "name": club_name(s["text"]), "foreign": True})
            # Wikidata'da Türk kulübü eksik ama bilgi kutusunda var: aslında Türkiye'de oynamış
            if abroad and any(not s.get("foreign") for s in sp):
                sp = [s for s in sp if not s.get("foreign")]
                flags.append("Türkiye'de oynamış (Wikidata eksik)")
        if not sp:  # bilgi kutusu yok ya da Türk kulübü bulunamadı: Wikidata dönemleri
            for part in filter(None, r["kulupler"].split("; ")):
                m = re.match(r"(.+) \((\d{4}|\?)–(\d{4})?\)$", part)
                if m:
                    st = int(m.group(2)) if m.group(2) != "?" else None
                    sp.append({"q": None, "name": club_name(m.group(1)), "start": st,
                               "end": int(m.group(3)) if m.group(3) else None, "open": not m.group(3), "apps": None})
            flags.append("kulüpler Wikidata'dan" if box else "bilgi kutusu yok")
        if q in tr_boxes:
            flags.append("Türkçe bilgi kutusu")
        clubs = list(dict.fromkeys(s["name"] for s in sp))
        if not clubs:
            flags.append("kulüp yok")

        # Mevki
        pos = position((box.get("position") or box.get("pozisyon")) if box else None, r["pozisyon"])
        if pos == "Bek?":
            pos = "Sağ bek"
            flags.append("bek tarafı belirsiz")
        if not pos:
            pos = "Merkez OS"
            flags.append("mevki yok")

        # Uyruk ve milli maç: en çok maça çıktığı A milli takım; yoksa Wikidata
        nat, caps = None, None
        seniors = [n for n in (nats.get(q) or []) if n.get("code") or (
            not RESERVE.search(n["text"]) and not RESERVE.search(n["target"])
            and not re.search(r"olympic|olimpi|\bB\b|A2|amateur|ümit|genç", n["text"] + n["target"], re.I))]
        if seniors:
            best = max(seniors, key=lambda n: n["caps"] or 0)
            label = "Türkiye" if best.get("code") == "TUR" else team_label.get(lq.get(best["target"])) or ""
            nat = nation_name(label) if label and not NOT_SENIOR.search(label) else None
            caps = best["caps"]
        if not nat and r["a_milli_takim"] and not NOT_SENIOR.search(r["a_milli_takim"]):
            nat = nation_name(r["a_milli_takim"])
            caps = int(r["a_milli_mac"]) if r["a_milli_mac"] else None
        if not nat:
            choices = r["uyruk"].split(" / ")
            nat = NATION_NAMES.get(choices[0], choices[0]) if choices[0] else "?"
            if len(choices) > 1:
                flags.append("uyruk belirsiz: " + r["uyruk"])
        if (seniors or r["a_milli_takim"]) and caps is None:
            flags.append("milli maç sayısı yok")

        # Dönem: kulüp kariyerinin (Türkiye'de oynamışsa Türkiye kariyerinin) ortası
        starts = [s["start"] for s in sp if s["start"]]
        ends = [s["end"] or (CURRENT_YEAR if s.get("open") else s["start"]) for s in sp if s["start"]]
        if not starts and r["kariyer_ilk_yil"]:  # dönem yıllarında tarih yoksa aday listesindeki yıllar
            starts, ends = [int(r["kariyer_ilk_yil"])], [int(r["kariyer_son_yil"] or r["kariyer_ilk_yil"])]
        era = (int((min(starts) + max(ends)) / 2) // 10 * 10) if starts else None
        if era is None:
            flags.append("dönem hesaplanamadı")

        # Durum: son kulüp dönemi sürüyor ya da bilgi kutusunda güncel kulüp var. Teknik direktörlerde
        # güncel kulüp çalıştırdığı takımdır; onlar ancak açık bir oyuncu dönemi varsa aktif sayılır.
        cur = plain(box.get("currentclub") or box.get("current_club") or "") if box else ""
        open_spell = bool(box and spells[q] and spells[q][-1]["open"])
        coach = bool(box and (box.get("manageryears1") or box.get("manager_years1")))
        active = not r["olum"] and (open_spell or bool(
            cur and not coach and not re.search(r"retired|free agent|none", cur, re.I)))

        # Şampiyonluk: şampiyon kulüpte olduğu sezonlar (maç sayısı sezon bazında bilinmediği için kontrol gerekir)
        title_seasons = sorted({e for s in sp if s["q"] for e in season_ends(s["start"], s["end"])
                                if e <= LAST_SEASON and champ_q.get(e) == s["q"]})
        titles = len(title_seasons)
        if titles and any(s.get("loan") or (s["start"] and s["end"] == s["start"]) for s in sp
                          if s["q"] in set(champ_q.values())):
            flags.append("şampiyonluk: kiralık ya da yarım sezon var")

        born = int(r["dogum_yili"]) if r["dogum_yili"] else None
        if not born:
            flags.append("doğum yılı yok")
        # Bilinirlik: eleme sonrası sıraya göre (kural belgesi: ilk 150 → 5, 500 → 4, 1000 → 3, 2000 → 2)
        rank = len(players) + 1
        fame = next((f for limit, f in ((150, 5), (500, 4), (1000, 3), (2000, 2)) if rank <= limit), 1)

        player = {"name": r["ad"], "pos": pos, "nat": nat, "born": born or 0, "clubs": clubs, "titles": titles,
                  "caps": caps_range(caps), "active": active, "era": era or 0, "fame": fame}
        for field, value in overrides.get(q, {}).items():  # elle düzeltmeler en son uygulanır
            player[field] = (value.split(";") if field == "clubs" else value == "1" if field == "active"
                             else int(value) if field in ("born", "titles", "caps", "era", "fame") else value)
        if player["era"] and player["era"] <= OLD_ERA and q not in legends:
            skipped[f"{OLD_ERA}'ler ve öncesi, efsane listesinde değil"] += 1
            continue
        players.append(player)
        review.append({
            "sira": rank, "qid": q, "ad": r["ad"], "bilinirlik": fame, "mevki": player["pos"],
            "mevki_kaynak": plain(box.get("position") or box.get("pozisyon") or "") if box else r["pozisyon"], "uyruk": player["nat"],
            "kulupler": "; ".join(player["clubs"]), "dogum": player["born"], "donem": player["era"],
            "sampiyonluk": player["titles"], "sampiyon_sezonlar": " ".join(str(e) if e == 1959 else f"{e - 1}–{e % 100:02d}" for e in title_seasons),
            "milli_mac": caps if caps is not None else "", "aktif": "evet" if player["active"] else "hayır",
            "kontrol": ", ".join(flags), "duzeltildi": ", ".join(overrides.get(q, {})),
            "wikipedia": f"https://en.wikipedia.org/wiki/{urllib.parse.quote(wiki_titles.get(q, '').replace(' ', '_'))}"
                         if q in wiki_titles else "",
        })

    OUT.write_text(json.dumps(players, ensure_ascii=False, separators=(",", ":")))
    with REVIEW.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(review[0]))
        w.writeheader()
        w.writerows(review)
    flagged = Counter(f.split(":")[0] for r in review for f in r["kontrol"].split(", ") if f)
    print(f"Yazıldı: {OUT.relative_to(ROOT)} ({len(players)} oyuncu), {REVIEW.relative_to(ROOT)}", file=sys.stderr)
    for k, n in skipped.items():
        print(f"  alınmadı: {n} {k}", file=sys.stderr)
    for k, n in flagged.most_common():
        print(f"  {n:4d}  {k}", file=sys.stderr)
    print("Uyruklar:", ", ".join(f"{k} {n}" for k, n in Counter(p["nat"] for p in players).most_common()), file=sys.stderr)


if __name__ == "__main__":
    main()
