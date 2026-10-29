import type { Player, Position } from "./types";

// Taslak veri: değerler elle girildi ve kural belgesine göre yeniden kurulacak.
// [ad, pozisyon, uyruk, doğum yılı, kulüpler (Türkiye'de oynamamışsa yabancı kulüpler), Süper Lig şampiyonluğu, milli maç aralığı (0-4), aktif mi, dönem]
type Row = [string, Position, string, number, string[], number, number, 0 | 1, number];

const ROWS: Row[] = [
  ["Gheorghe Hagi", "Ofansif OS", "Romanya", 1965, ["Galatasaray"], 4, 4, 0, 1990],
  ["Alex de Souza", "Ofansif OS", "Brezilya", 1977, ["Fenerbahçe"], 3, 1, 0, 2000],
  ["Arda Turan", "Kanat", "Türkiye", 1987, ["Galatasaray", "Manisaspor", "Başakşehir"], 2, 4, 0, 2000],
  ["Rüştü Reçber", "Kaleci", "Türkiye", 1973, ["Antalyaspor", "Fenerbahçe", "Beşiktaş"], 4, 4, 0, 1990],
  ["Emre Belözoğlu", "Merkez OS", "Türkiye", 1980, ["Galatasaray", "Fenerbahçe", "Başakşehir"], 7, 4, 0, 2000],
  ["Burak Yılmaz", "Santrfor", "Türkiye", 1985, ["Antalyaspor", "Beşiktaş", "Manisaspor", "Fenerbahçe", "Eskişehirspor", "Trabzonspor", "Galatasaray"], 3, 3, 0, 2010],
  ["Arda Güler", "Ofansif OS", "Türkiye", 2005, ["Fenerbahçe"], 0, 2, 1, 2020],
  ["Kerem Aktürkoğlu", "Kanat", "Türkiye", 1998, ["24 Erzincanspor", "Galatasaray", "Fenerbahçe"], 2, 2, 1, 2020],
  ["Mauro Icardi", "Santrfor", "Arjantin", 1993, ["Galatasaray"], 3, 1, 1, 2020],
  ["Dries Mertens", "Kanat", "Belçika", 1987, ["Galatasaray"], 3, 4, 0, 2020],
  ["Fernando Muslera", "Kaleci", "Uruguay", 1986, ["Galatasaray"], 8, 4, 1, 2010],
  ["Edin Džeko", "Santrfor", "Bosna-Hersek", 1986, ["Fenerbahçe"], 0, 4, 1, 2020],
  ["Ricardo Quaresma", "Kanat", "Portekiz", 1983, ["Beşiktaş", "Kasımpaşa"], 2, 3, 0, 2010],
  ["Pierre van Hooijdonk", "Santrfor", "Hollanda", 1969, ["Fenerbahçe"], 2, 2, 0, 2000],
  ["Didier Drogba", "Santrfor", "Fildişi Sahili", 1978, ["Galatasaray"], 1, 4, 0, 2010],
  ["Wesley Sneijder", "Ofansif OS", "Hollanda", 1984, ["Galatasaray"], 2, 4, 0, 2010],
  ["Tanju Çolak", "Santrfor", "Türkiye", 1963, ["Samsunspor", "Galatasaray", "Fenerbahçe", "İstanbulspor"], 1, 2, 0, 1980],
  ["Fatih Terim", "Stoper", "Türkiye", 1953, ["Adana Demirspor", "Galatasaray"], 0, 3, 0, 1970],
  ["Bülent Korkmaz", "Stoper", "Türkiye", 1968, ["Galatasaray", "Gaziantepspor"], 8, 4, 0, 1990],
  ["Hasan Şaş", "Kanat", "Türkiye", 1976, ["Ankaragücü", "Galatasaray"], 5, 2, 0, 2000],
  ["Nihat Kahveci", "Santrfor", "Türkiye", 1979, ["Beşiktaş"], 1, 3, 0, 2000],
  ["Volkan Demirel", "Kaleci", "Türkiye", 1981, ["Kartalspor", "Fenerbahçe"], 5, 3, 0, 2000],
  ["Mesut Özil", "Ofansif OS", "Almanya", 1988, ["Fenerbahçe", "Başakşehir"], 0, 3, 0, 2020],
  ["Robin van Persie", "Santrfor", "Hollanda", 1983, ["Fenerbahçe"], 0, 4, 0, 2010],
  ["Roberto Carlos", "Sol bek", "Brezilya", 1973, ["Fenerbahçe"], 0, 4, 0, 2000],
  ["Hamit Altıntop", "Merkez OS", "Türkiye", 1982, ["Galatasaray"], 2, 3, 0, 2010],
  ["Selçuk İnan", "Merkez OS", "Türkiye", 1985, ["Dardanelspor", "Manisaspor", "Trabzonspor", "Galatasaray"], 5, 3, 0, 2010],
  ["Gökdeniz Karadeniz", "Kanat", "Türkiye", 1980, ["Trabzonspor"], 0, 2, 0, 2000],
  ["Şenol Güneş", "Kaleci", "Türkiye", 1952, ["Trabzonspor"], 6, 2, 0, 1970],
  ["Aykut Kocaman", "Santrfor", "Türkiye", 1965, ["Sakaryaspor", "Fenerbahçe", "İstanbulspor"], 2, 1, 0, 1990],
  ["Barış Alper Yılmaz", "Kanat", "Türkiye", 2000, ["Keçiörengücü", "Galatasaray"], 3, 2, 1, 2020],
  ["Victor Osimhen", "Santrfor", "Nijerya", 1998, ["Galatasaray"], 1, 2, 1, 2020],
  ["Ferdi Kadıoğlu", "Sol bek", "Türkiye", 1999, ["Fenerbahçe"], 0, 2, 1, 2020],
  ["Uğurcan Çakır", "Kaleci", "Türkiye", 1996, ["1461 Trabzon", "Trabzonspor", "Galatasaray"], 1, 2, 1, 2020],
  ["Merih Demiral", "Stoper", "Türkiye", 1998, ["Alanyaspor"], 0, 3, 1, 2020],
  ["Sabri Sarıoğlu", "Sağ bek", "Türkiye", 1984, ["Galatasaray", "Göztepe"], 5, 2, 0, 2010],
];

export const PLAYERS: Player[] = ROWS.map(([name, pos, nat, born, clubs, titles, caps, active, era]) => ({
  name, pos, nat, born, clubs, titles, caps, active: !!active, era,
}));
