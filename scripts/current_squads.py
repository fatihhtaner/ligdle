#!/usr/bin/env python3
"""Süper Lig'in güncel kadroları: veri setinde olmayan güncel oyuncular build_players.py'ye bu listeden eklenir.

Kaynak, İngilizce Wikipedia (CC BY-SA 4.0): sezon sayfasındaki takımlar ve her kulüp sayfasının "Current squad"
bölümü. Kiralık gönderilenler, altyapı ve rezerv kadrolar alınmaz. Oyuncular Wikidata kimliğine çevrilir.

Çıktı: data/current_squads.csv. Kullanım: python3 scripts/current_squads.py [--season 2026–27]
"""
import csv
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "current_squads.csv"
USER_AGENT = "LigdleDataBot/0.1 (https://github.com/fatihhtaner/ligdle)"
SEASON = sys.argv[sys.argv.index("--season") + 1] if "--season" in sys.argv else "2026–27"
# Kadro bölümü sayılmayan başlıklar
NOT_FIRST_TEAM = re.compile(r"loan|reserve|academy|youth|under|u-?\d|women|former|retired|captain|staff|B team", re.I)


def api(**params):
    q = urllib.parse.urlencode({"format": "json", "formatversion": 2, "redirects": 1, **params})
    for attempt in range(4):
        try:
            req = urllib.request.Request(f"https://en.wikipedia.org/w/api.php?{q}", headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:
            print(f"  istek hatası ({e}); yeniden", file=sys.stderr)
            time.sleep(3 * (attempt + 1))
    raise RuntimeError("Wikipedia isteği başarısız")


def wikitext(title):
    return api(action="parse", page=title, prop="wikitext")["parse"]["wikitext"]


def link(s):
    m = re.search(r"\[\[([^\]|#]+)", s)
    return m.group(1).strip() if m else None


def teams():
    text = wikitext(f"{SEASON} Süper Lig")
    table = text[text.index("{| class=\"wikitable sortable\"", text.index("Teams")):]
    table = table[:table.index("|}")]
    # Her satırın ilk hücresi takım
    return [link(row.split("\n|")[1]) for row in table.split("|-")[1:] if "[[" in row]


def squad(club):
    text = wikitext(club)
    heads = list(re.finditer(r"^(=+)\s*([^=\n]*?)\s*\1\s*$", text, re.M))
    out = []
    for i, h in enumerate(heads):
        name = h.group(2)
        if "squad" not in name.lower() or NOT_FIRST_TEAM.search(name):
            continue
        body = text[h.end():heads[i + 1].start() if i + 1 < len(heads) else len(text)]
        for m in re.finditer(r"\{\{\s*Fs player\s*\|([^\n]*)\}\}", body, re.I):
            name_field = re.search(r"\bname\s*=\s*(\[\[[^\]]+\]\]|[^|}]+)", m.group(1))
            title = name_field and link(name_field.group(1))
            if title:
                out.append(title)
        if out:  # ilk dolu kadro bölümü yeterli
            break
    return out


def qids(titles):
    out = {}
    titles = sorted(set(titles))
    for i in range(0, len(titles), 50):
        r = api(action="query", prop="pageprops", ppprop="wikibase_item", titles="|".join(titles[i:i + 50]))["query"]
        alias = {x["from"]: x["to"] for x in r.get("normalized", []) + r.get("redirects", [])}
        found = {p["title"]: p.get("pageprops", {}).get("wikibase_item") for p in r["pages"]}
        for t in titles[i:i + 50]:
            final = alias.get(alias.get(t, t), alias.get(t, t))
            out[t] = found.get(final)
        time.sleep(0.5)
    return out


def main():
    clubs = teams()
    print(f"{SEASON}: {len(clubs)} takım", file=sys.stderr)
    rows = []
    for club in clubs:
        players = squad(club)
        print(f"  {club}: {len(players)} oyuncu", file=sys.stderr)
        rows += [(club, p) for p in players]
        time.sleep(0.5)
    ids = qids([p for _, p in rows] + clubs)
    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["qid", "ad", "kulup", "kulup_qid"])
        for club, p in rows:
            if ids.get(p):
                w.writerow([ids[p], p, club, ids.get(club, "")])
    missing = [p for _, p in rows if not ids.get(p)]
    print(f"Yazıldı: {OUT.relative_to(ROOT)} ({len(rows) - len(missing)} oyuncu; Wikidata'sı bulunamayan {len(missing)})",
          file=sys.stderr)


if __name__ == "__main__":
    main()
