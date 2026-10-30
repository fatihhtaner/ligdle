"""Rehber yazılarındaki tablolar için veri: Süper Lig sezonları (şampiyon, ikinci, üçüncü, gol kralı).

Kaynak, build_players.py'nin de kullandığı İngilizce Wikipedia "List of Turkish football champions" sayfası
(CC BY-SA 4.0). Çıktı: src/content/champions.json. Kullanım: python3 scripts/build_content.py [--fresh]
"""
import csv
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import build_players as b  # noqa: E402

OUT = b.ROOT / "src" / "content" / "champions.json"
# Oyundan çıkarılan oyuncular tablolarda da adıyla yer almaz
EXCLUDED = {r["ad"] for r in csv.DictReader((b.ROOT / "data" / "exclude.csv").open(encoding="utf-8"))}


def team(cell):
    found = b.links(cell)
    return b.club_name(found[0][0]) if found else None


def scorers(cell):
    # "{{flagicon|TUR}} [[Metin Oktay]] (Galatasaray)", birden çok gol kralı <br> ile ayrılır
    out = []
    for part in re.split(r"<br\s*/?>", cell):
        m = re.search(r"\{\{flagicon\|(\w+)[^}]*\}\}\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]\s*\(([^)]*)\)", part)
        if m:
            out.append({"name": (m.group(3) or m.group(2)).strip(), "nat": m.group(1),
                        "club": b.club_name(b.plain(m.group(4)))})
    return out


def main():
    b.champions()  # sayfayı önbelleğe alır
    text = (b.CACHE / "champions_page.txt").read_text()
    table = text[text.index("===Süper Lig (1959–present)==="):]
    table = table[:table.index("|}")]
    seasons = []
    for row in table.split("|-")[1:]:
        cells = [c[1:] for c in row.split("\n") if c.startswith("|")]
        season = re.search(r"\|(\d{4}(?:–\d{2,4})?)\]\]", cells[0]).group(1)
        goals = re.search(r"(\d+)\s*$", cells[5]) if len(cells) > 5 else None
        found = scorers(cells[4]) if len(cells) > 4 else []
        kept = [s for s in found if s["name"] not in EXCLUDED]
        seasons.append({
            "season": season, "winner": team(cells[1]), "second": team(cells[2]),
            "third": team(cells[3]) if len(cells) > 3 else None,
            "scorers": kept,
            # gol sayısı yalnızca çıkarılan bir oyuncuya aitse o da gösterilmez
            "goals": int(goals.group(1)) if goals and (kept or not found) else None,
        })
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(seasons, ensure_ascii=False, indent=1) + "\n")
    print(f"{len(seasons)} sezon → {OUT.relative_to(b.ROOT)}", file=sys.stderr)


if __name__ == "__main__":
    main()
