# Ligdle

Türk futbolu için günlük futbolcu tahmin oyunu. Her gün herkese aynı gizli futbolcu çıkar; her tahminde 8 özellik kutusu yeşil, sarı ya da kırmızı yanarak cevaba ne kadar yaklaştığını gösterir.

| Kutu | Yeşil | Sarı |
| --- | --- | --- |
| Pozisyon | Aynı mevki | Aynı mevki grubu |
| Uyruk | Aynı ülke | Aynı bölge |
| Kulüpler | Kulüp listesi aynı | En az bir ortak kulüp |
| Doğum yılı | Aynı yıl | En fazla 3 yıl fark (↑↓) |
| Dönem | Aynı on yıl | Komşu on yıl (↑↓) |
| Süper Lig şampiyonluğu | Aynı sayı | En fazla 1 fark (↑↓) |
| A milli maç | Aynı aralık | Komşu aralık (↑↓) |
| Durum | Aktif / emekli aynı | — |

Kuralların tamamı kural belgesinde: https://claude.ai/artifact/4yoaHSjXkmj93VcQyvSnNX

## Çalıştırma

Vite + React + TypeScript. Node 20 veya üstü gerekir.

```bash
npm install
npm run dev      # geliştirme sunucusu: http://localhost:5173
npm test         # oyun kuralları testleri
npm run build    # dist/ klasörüne statik site
```

`dist/` herhangi bir statik sunucuda (GitHub Pages, Netlify, Vercel) alt klasörde de çalışır.

## Kod düzeni

- `src/game/`: oyun kuralları (`rules.ts`), günlük oyuncu seçimi (`daily.ts`), oyuncu verisi (`players.ts`), paylaşım metni, tarayıcı depolaması.
- `src/components/`: tahmin tablosu, arama kutusu, kazanma kutusu.
- `src/styles.css`: tema renkleri ve tüm stiller.
- `public/img/`: logo, ikonlar, paylaşım görseli.

## Veri

- `scripts/wikidata_candidates.py`: Wikidata'dan 1959 sonrası Türk kulüplerinde ya da Türkiye A milli takımında oynamış futbolcuları çeker (`giris` sütunu hangi yoldan girdiğini söyler; Türkiye'de oynamamış milli oyuncuların `kulupler` sütununda yabancı kulüpleri yer alır) ve `data/candidates.csv` dosyasına yazar. Liste, oyuncunun Türkçe Wikipedia sayfasının son 12 aydaki okunma sayısına göre sıralanır; `puan_onerisi` bu sıraya göre 1–5 arası bir başlangıç önerisidir, asıl bilinirlik puanı elle verilir. `kontrol` sütunu elle bakılması gereken satırları gösterir. Çalıştırmak için: `python3 scripts/wikidata_candidates.py` (ham sorgular `data/raw/` altında önbelleğe alınır; `--fresh` ile yeniden çekilir).
- `data/exclude.csv`: Oyuna hiç alınmayacak oyuncular ve nedeni.
- `scripts/build_players.py`: Aday listesinin ilk 1000 oyuncusu için oyunun 8 kutusunu hesaplar ve `src/game/players.json` dosyasını yazar. Mevki, kulüpler, yıllar, lig maçı ve milli maç İngilizce Wikipedia bilgi kutusundan (yoksa Türkçe), şampiyonluklar Wikipedia'daki şampiyonlar listesinden gelir. `data/players_review.csv` her oyuncunun değerlerini ve elle bakılması gereken alanları (`kontrol`) gösterir. Çalıştırmak için: `python3 scripts/build_players.py` (`--top 1500` ile daha fazla oyuncu).
- `data/legends.csv`: Dönemi 1980'ler ve öncesi olup yine de alınacak çok tanınan oyuncular. Bu listede olmayan eski oyuncular veri setine girmez.
- `data/drop.csv`: Tek tek çıkarılan oyuncular ve nedeni.
- `data/overrides.csv`: Elle düzeltmeler (`qid,ad,alan,deger,not`; alan: name, pos, nat, born, clubs, titles, caps, active, era, fame; kulüpler `;` ile ayrılır). Her kurulumda en son uygulanır, veri yeniden çekilince kaybolmaz.

## Durum

Prototip. Veri setinde 1000 oyuncu var; değerler otomatik derlendi, elle kontrolü sürüyor.
