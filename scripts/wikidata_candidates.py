#!/usr/bin/env python3
"""Ligdle aday listesi: Wikidata'dan 1959'dan sonra Türk kulüplerinde oynamış futbolcuları çeker.

Çıktı: data/candidates.csv (Türkçe Wikipedia okunmasına göre sıralı, elle gözden geçirmek için).
Ham sorgu sonuçları data/raw/ altında önbelleğe alınır; --fresh ile yeniden çekilir.
data/exclude.csv içindeki oyuncular listeye hiç girmez.

Yalnızca standart kütüphane kullanır:  python3 scripts/wikidata_candidates.py
"""
import csv
import json
import sys
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "candidates.csv"
EXCLUDE = ROOT / "data" / "exclude.csv"

ENDPOINT = "https://query.wikidata.org/sparql"
USER_AGENT = "LigdleDataBot/0.1 (https://github.com/fatihhtaner/ligdle)"
FRESH = "--fresh" in sys.argv

FOOTBALL_CLUB = "Q476028"
NATIONAL_TEAM = "Q6979593"
FOOTBALLER = "Q937857"
MALE = "Q6581097"
TURKEY = "Q43"
CURRENT_YEAR = time.localtime().tm_year
FIRST_SEASON = 1959  # Milli Lig'in ilk sezonu


def sparql(query, retries=4):
    data = urllib.parse.urlencode({"query": query}).encode()
    for attempt in range(retries):
        req = urllib.request.Request(ENDPOINT, data=data, headers={
            "Accept": "application/sparql-results+json", "User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.load(r)["results"]["bindings"]
        except Exception as e:  # zaman aşımı veya 429: biraz bekleyip yeniden dene
            wait = 5 * (attempt + 1)
            print(f"  sorgu hatası ({e}); {wait} sn sonra yeniden", file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError("Wikidata sorgusu başarısız")


def cached(name, fn):
    path = RAW / f"{name}.json"
    if path.exists() and not FRESH:
        return json.loads(path.read_text())
    rows = fn()
    RAW.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rows, ensure_ascii=False))
    return rows


def qid(b, k):
    return b[k]["value"].rsplit("/", 1)[1] if k in b else None


def val(b, k):
    return b[k]["value"] if k in b else None


def year(b, k):
    v = val(b, k)
    return int(v[:4]) if v and v[:4].isdigit() else None


def chunks(xs, n):
    for i in range(0, len(xs), n):
        yield xs[i:i + n]


def values(ids):
    return " ".join(f"wd:{i}" for i in ids)


def fetch_clubs():
    rows = sparql(f"""SELECT DISTINCT ?club ?tr ?en WHERE {{
      ?club wdt:P31/wdt:P279* wd:{FOOTBALL_CLUB} ; wdt:P17 wd:{TURKEY} .
      OPTIONAL {{ ?club rdfs:label ?tr FILTER(LANG(?tr) = "tr") }}
      OPTIONAL {{ ?club rdfs:label ?en FILTER(LANG(?en) = "en") }}
    }}""")
    return [{"qid": qid(b, "club"), "name": val(b, "tr") or val(b, "en") or qid(b, "club")} for b in rows]


def fetch_spells(club_ids):
    out = []
    for i, batch in enumerate(chunks(club_ids, 40)):
        print(f"  kulüp grubu {i + 1}", file=sys.stderr)
        rows = sparql(f"""SELECT ?p ?club ?start ?end ?apps WHERE {{
          VALUES ?club {{ {values(batch)} }}
          ?p p:P54 ?st . ?st ps:P54 ?club .
          ?p wdt:P106 wd:{FOOTBALLER} ; wdt:P21 wd:{MALE} .
          OPTIONAL {{ ?st pq:P580 ?start }} OPTIONAL {{ ?st pq:P582 ?end }} OPTIONAL {{ ?st pq:P1350 ?apps }}
        }}""")
        out += [{"p": qid(b, "p"), "club": qid(b, "club"), "start": year(b, "start"),
                 "end": year(b, "end"), "apps": val(b, "apps")} for b in rows]
        time.sleep(1)
    return out


def fetch_people(ids):
    out = []
    for i, batch in enumerate(chunks(ids, 150)):
        print(f"  oyuncu grubu {i + 1}/{(len(ids) + 149) // 150}", file=sys.stderr)
        rows = sparql(f"""SELECT ?p ?tr ?en ?links ?born ?died ?sport ?cit ?pos WHERE {{
          VALUES ?p {{ {values(batch)} }}
          ?p wikibase:sitelinks ?links .
          OPTIONAL {{ ?p rdfs:label ?tr FILTER(LANG(?tr) = "tr") }}
          OPTIONAL {{ ?p rdfs:label ?en FILTER(LANG(?en) = "en") }}
          OPTIONAL {{ ?p wdt:P569 ?born }} OPTIONAL {{ ?p wdt:P570 ?died }}
          OPTIONAL {{ ?p wdt:P1532 ?sport }} OPTIONAL {{ ?p wdt:P27 ?cit }} OPTIONAL {{ ?p wdt:P413 ?pos }}
        }}""")
        out += [{k: (qid(b, k) if k in ("p", "sport", "cit", "pos") else val(b, k))
                 for k in ("p", "tr", "en", "links", "born", "died", "sport", "cit", "pos")} for b in rows]
        time.sleep(1)
    return out


def fetch_national(ids):
    """A milli takım üyelikleri (gençlik takımları dahil; ayıklama aşağıda)."""
    # Tür filtresi tek sorguda zaman aşımına uğruyor: önce tüm takımlar, sonra hangileri milli takım.
    out = []
    for i, batch in enumerate(chunks(ids, 100)):
        print(f"  takım grubu {i + 1}/{(len(ids) + 99) // 100}", file=sys.stderr)
        rows = sparql(f"""SELECT ?p ?team ?apps WHERE {{
          VALUES ?p {{ {values(batch)} }}
          ?p p:P54 ?st . ?st ps:P54 ?team .
          OPTIONAL {{ ?st pq:P1350 ?apps }}
        }}""")
        out += [{"p": qid(b, "p"), "team": qid(b, "team"), "apps": val(b, "apps")} for b in rows]
        time.sleep(1)
    teams = sorted({r["team"] for r in out})
    national = set()
    for batch in chunks(teams, 300):
        rows = sparql(f"""SELECT ?team WHERE {{ VALUES ?team {{ {values(batch)} }} ?team wdt:P31/wdt:P279* wd:{NATIONAL_TEAM} . }}""")
        national |= {qid(b, "team") for b in rows}
        time.sleep(1)
    return [r for r in out if r["team"] in national]


def fetch_labels(ids):
    out = {}
    for batch in chunks(sorted(ids), 300):
        rows = sparql(f"""SELECT ?x ?tr ?en WHERE {{
          VALUES ?x {{ {values(batch)} }}
          OPTIONAL {{ ?x rdfs:label ?tr FILTER(LANG(?tr) = "tr") }}
          OPTIONAL {{ ?x rdfs:label ?en FILTER(LANG(?en) = "en") }}
        }}""")
        for b in rows:
            out[qid(b, "x")] = val(b, "tr") or val(b, "en") or qid(b, "x")
    return out


def fetch_trwiki(ids):
    """Oyuncunun Türkçe Wikipedia makale başlığı (varsa)."""
    out = {}
    for batch in chunks(ids, 300):
        rows = sparql(f"""SELECT ?p ?title WHERE {{
          VALUES ?p {{ {values(batch)} }}
          ?article schema:about ?p ; schema:isPartOf <https://tr.wikipedia.org/> ; schema:name ?title .
        }}""")
        out.update({qid(b, "p"): val(b, "title") for b in rows})
        time.sleep(1)
    return out


def views_window():
    """Son 12 tamamlanmış ay, Wikimedia API biçiminde (YYYYMMDD)."""
    t = time.localtime()
    end_y, end_m = (t.tm_year, t.tm_mon - 1) if t.tm_mon > 1 else (t.tm_year - 1, 12)
    start_y, start_m = (end_y - 1, end_m + 1) if end_m < 12 else (end_y, 1)
    return f"{start_y}{start_m:02d}01", f"{end_y}{end_m:02d}28"


def fetch_views(titles):
    """Türkçe Wikipedia'da son 12 ayın okunma sayısı. Başlık başına bir istek; önbellek kaldığı yerden devam eder."""
    from concurrent.futures import ThreadPoolExecutor
    path = RAW / "trwiki_views.json"
    start, end = views_window()
    cache = json.loads(path.read_text()) if path.exists() and not FRESH else {}
    if cache.get("_window") != [start, end]:
        cache = {"_window": [start, end]}
    todo = sorted({t for t in titles if t not in cache})

    def one(title):
        url = ("https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/tr.wikipedia/all-access/user/"
               f"{urllib.parse.quote(title.replace(' ', '_'), safe='')}/monthly/{start}/{end}")
        for attempt in range(4):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(req, timeout=30) as r:
                    return title, sum(i["views"] for i in json.load(r)["items"])
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    return title, 0
                time.sleep(2 * (attempt + 1))
            except Exception:
                time.sleep(2 * (attempt + 1))
        return title, None

    with ThreadPoolExecutor(6) as pool:
        for i, (title, n) in enumerate(pool.map(one, todo), 1):
            if n is not None:
                cache[title] = n
            if i % 500 == 0:
                print(f"  okunma {i}/{len(todo)}", file=sys.stderr)
                path.write_text(json.dumps(cache, ensure_ascii=False))
    RAW.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(cache, ensure_ascii=False))
    return cache


def score_suggestion(rank):
    """Okunma sırasına göre ilk bilinirlik önerisi; asıl puan elle verilir (kural belgesi)."""
    for limit, score in ((150, 5), (500, 4), (1000, 3), (2000, 2)):
        if rank <= limit:
            return score
    return 1


def main():
    excluded = {r["qid"]: r for r in csv.DictReader(EXCLUDE.open(encoding="utf-8"))}

    print("Türk kulüpleri…", file=sys.stderr)
    # Milli takımlar da "futbol kulübü" alt sınıfında görünüyor; kulüp listesinden çıkar.
    clubs = {c["qid"]: c["name"] for c in cached("clubs", fetch_clubs) if "millî" not in c["name"].lower()}
    print(f"  {len(clubs)} kulüp", file=sys.stderr)

    print("Kulüp üyelikleri…", file=sys.stderr)
    spells = cached("spells", lambda: fetch_spells(sorted(clubs)))
    by_player = defaultdict(list)
    for s in spells:
        if s["p"] not in excluded and s["club"] in clubs:
            by_player[s["p"]].append(s)
    ids = sorted(by_player)
    print(f"  {len(ids)} oyuncu ({len(excluded)} hariç tutuldu)", file=sys.stderr)

    print("Oyuncu bilgileri…", file=sys.stderr)
    people = defaultdict(lambda: defaultdict(set))
    for r in cached("people", lambda: fetch_people(ids)):
        for k, v in r.items():
            if v and k != "p":
                people[r["p"]][k].add(v)

    print("Milli takımlar…", file=sys.stderr)
    national = cached("national", lambda: fetch_national(ids))

    label_ids = {v for p in people.values() for k in ("sport", "cit", "pos") for v in p[k]}
    label_ids |= {n["team"] for n in national}
    labels = cached("labels", lambda: fetch_labels(label_ids))

    # A milli takım: adında U-, gençlik, olimpik, B takımı geçmeyenler
    def senior(team):
        name = labels.get(team, "").lower()
        return not any(w in name for w in ("under", "yaş altı", "u-1", "u-2", "u1", "u2", "youth", "olympic", "olimpik",
                                            "genç", "ümit", " b ", "b national", "amateur", "amatör", "a2"))

    caps = {}
    for n in national:
        if senior(n["team"]):
            prev = caps.get(n["p"])
            apps = int(float(n["apps"])) if n["apps"] else None
            if not prev or (apps or 0) > (prev[1] or 0):
                caps[n["p"]] = (labels.get(n["team"], n["team"]), apps)

    print("Türkçe Wikipedia okunma sayıları…", file=sys.stderr)
    trwiki = cached("trwiki", lambda: fetch_trwiki(ids))
    views = fetch_views(trwiki.values())
    start, end = views_window()
    print(f"  {len(trwiki)} oyuncunun Türkçe makalesi var ({start}–{end})", file=sys.stderr)

    rows = []
    for p in ids:
        info = people[p]
        name = next(iter(info["tr"]), None) or next(iter(info["en"]), None) or p
        sp = sorted(by_player[p], key=lambda s: (s["start"] or 9999, s["end"] or 9999))
        club_txt = "; ".join(
            f"{clubs.get(s['club'], s['club'])} ({s['start'] or '?'}–{s['end'] or ''})" for s in sp)
        starts = [s["start"] for s in sp if s["start"]]
        ends = [s["end"] or s["start"] for s in sp if s["end"] or s["start"]]
        born = min((int(b[:4]) for b in info["born"] if b[:4].isdigit()), default="")
        # Kural: 1959'dan (Milli Lig) sonra Türkiye'de oynamış olmalı. Türkiye kariyeri daha önce
        # bitenler ya da tarihi hiç yokken 1959'da 38 yaşını geçmiş olanlar elenir.
        if (ends and max(ends) < FIRST_SEASON) or (not ends and born and born < FIRST_SEASON - 38):
            continue
        nation = sorted(labels.get(x, x) for x in (info["sport"] or info["cit"]))
        team, apps = caps.get(p, ("", None))
        # Elle bakılması gerekenler: yeni transferler (Wikidata'da söylenti de olabiliyor),
        # 20 yıldan uzun tek kulüp dönemi, tarihsiz dönem.
        flags = []
        if any((s["start"] or 0) >= CURRENT_YEAR for s in sp):
            flags.append("yeni transfer")
        if any(s["start"] and s["end"] and s["end"] - s["start"] > 20 for s in sp):
            flags.append("uzun dönem")
        if any(not s["start"] for s in sp):
            flags.append("tarihsiz dönem")
        rows.append({
            "qid": p,
            "ad": name,
            "puan_onerisi": "",
            "trwiki_okunma_12ay": views.get(trwiki.get(p), 0) or 0,
            "wikipedia_dil_sayisi": max((int(x) for x in info["links"]), default=0),
            "dogum_yili": born,
            "olum": "evet" if info["died"] else "",
            "uyruk": " / ".join(nation),
            "pozisyon": " / ".join(sorted(labels.get(x, x) for x in info["pos"])),
            "turk_kulupleri": club_txt,
            "turkiye_ilk_yil": min(starts, default=""),
            "turkiye_son_yil": max(ends, default=""),
            "a_milli_takim": team,
            "a_milli_mac": "" if apps is None else apps,
            "kontrol": ", ".join(flags),
            "wikidata": f"https://www.wikidata.org/wiki/{p}",
        })

    # Türk futbolseverin tanıdığı oyuncuyu en iyi Türkçe Wikipedia okunması gösteriyor; eşitlikte dil sayısı.
    rows.sort(key=lambda r: (-r["trwiki_okunma_12ay"], -r["wikipedia_dil_sayisi"]))
    for rank, r in enumerate(rows, 1):
        r["puan_onerisi"] = score_suggestion(rank)
    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print(f"Yazıldı: {OUT.relative_to(ROOT)} ({len(rows)} oyuncu)", file=sys.stderr)


if __name__ == "__main__":
    main()
