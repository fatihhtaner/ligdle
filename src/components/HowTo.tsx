/** İlk tahminden önce ya da "Nasıl oynanır" düğmesiyle açılan kısa anlatım. Örnek kutular gerçek renklerle. */
export function HowTo({ onClose }: { onClose?: () => void }) {
  return (
    <section className="howto" aria-labelledby="howto-title">
      <div className="howto-head">
        <h2 id="howto-title">Nasıl oynanır</h2>
        {onClose && <button className="ghost" onClick={onClose}>Kapat</button>}
      </div>
      <ol>
        <li>Bir futbolcu yaz ve tahmin et. Her tahminde 8 kutu açılır.</li>
        <li>Kutular, tahmin ettiğin oyuncunun gizli oyuncuya ne kadar benzediğini gösterir.</li>
        <li>Kutuya dokunursan neden o renkte yandığını görürsün. Tahmin hakkın sınırsız.</li>
      </ol>
      <div className="examples">
        <figure>
          <div className="tile hit">Kanat<span className="sub">Hücum</span></div>
          <figcaption><strong>Yeşil:</strong> tam tuttu. Gizli oyuncu da kanat.</figcaption>
        </figure>
        <figure>
          <div className="tile near"><span className="flag">🇧🇷</span>Brezilya</div>
          <figcaption><strong>Sarı:</strong> yakın. Ülke farklı ama aynı bölgeden, Güney Amerika.</figcaption>
        </figure>
        <figure>
          <div className="tile miss">1987<span className="arrow">↑</span></div>
          <figcaption><strong>Kırmızı ve ok:</strong> uzak. Gizli oyuncu daha geç doğmuş.</figcaption>
        </figure>
      </div>
      <p className="note">
        Kulüpler, kariyerinin Türkiye'deki kulüpleridir; Türkiye'de oynamamış milli oyuncularda yurt dışı kulüpleri.
        Dönem kariyerinin ortasına denk gelen on yıl, şampiyonluk Süper Lig şampiyonluğudur.
      </p>
    </section>
  );
}
