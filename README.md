# Ligdle

Türk futbolu için günlük futbolcu tahmin oyunu. Her gün herkese aynı gizli futbolcu çıkar; her tahminde 8 özellik kutusu yeşil, sarı ya da kırmızı yanarak cevaba ne kadar yaklaştığını gösterir.

| Kutu | Yeşil | Sarı |
| --- | --- | --- |
| Pozisyon | Aynı mevki | Aynı mevki grubu |
| Uyruk | Aynı ülke | Aynı bölge |
| Türk kulüpleri | Kulüp listesi aynı | En az bir ortak kulüp |
| Doğum yılı | Aynı yıl | En fazla 3 yıl fark (↑↓) |
| Dönem | Aynı on yıl | Komşu on yıl (↑↓) |
| Süper Lig şampiyonluğu | Aynı sayı | En fazla 1 fark (↑↓) |
| A milli maç | Aynı aralık | Komşu aralık (↑↓) |
| Durum | Aktif / emekli aynı | — |

Kuralların tamamı kural belgesinde: https://claude.ai/artifact/4yoaHSjXkmj93VcQyvSnNX

## Çalıştırma

Derleme adımı yok. `index.html` dosyasını tarayıcıda açman yeterli.
## Veri

- `scripts/wikidata_candidates.py`: Wikidata'dan Türk kulüplerinde oynamış futbolcuları çeker ve `data/candidates.csv` dosyasına yazar. Liste, kaç dilde Wikipedia sayfası olduğuna göre sıralanır. `kontrol` sütunu elle bakılması gereken satırları gösterir. Çalıştırmak için: `python3 scripts/wikidata_candidates.py` (ham sorgular `data/raw/` altında önbelleğe alınır; `--fresh` ile yeniden çekilir).
- `data/exclude.csv`: Oyuna hiç alınmayacak oyuncular ve nedeni.

## Durum

Prototip. Veri setinde 37 oyuncu var ve değerler taslaktır; kural belgesine göre yeniden kurulacak.
