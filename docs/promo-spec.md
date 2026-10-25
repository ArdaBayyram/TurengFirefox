# Tureng Neo tanıtım alanı — görsel bilgileri

Eklentinin açılır penceresinde, sonuç listesinin altında yer alacak.

## Ölçü

| | Değer |
| --- | --- |
| Ekranda görüneceği genişlik | **400 piksel** |
| Teslim edilecek dosya genişliği | **800 piksel** (2x, yüksek çözünürlüklü ekranlar için) |
| Önerilen yükseklik | ekranda ~64 piksel → dosyada **800 × 128** |
| Oran | yaklaşık 6:1 |

Yükseklik esnek: eklenti görseli 400 piksel genişliğe göre orantılı ölçekliyor, oran ne
olursa olsun bozulma olmaz. Ancak ekranda 100 pikseli geçen bir yükseklik pencerede
sonuçların önüne geçmeye başlar.

## Format

- **PNG**, **WebP** veya **SVG**.
- SVG tercih edilirse 2x sürüme gerek yok, tek dosya her ekranda net görünür.
- Dosya boyutu mümkünse 100 KB altında olsun; görsel eklentinin içine gömülüyor.

## Köşeler

Köşeleri **yuvarlatmadan**, düz kenarlı gönderin. Eklenti 8 piksellik yuvarlatmayı kendisi
uyguluyor; önceden yuvarlatılmış bir görselde çift kenar oluşuyor.

## Koyu tema (opsiyonel)

Eklenti kullanıcının tarayıcı temasına göre açık/koyu görünüm destekliyor. İsterseniz koyu
zemin için ikinci bir dosya gönderebilirsiniz; göndermezseniz her iki temada da aynı görsel
kullanılır.

## Görselle birlikte gerekenler

1. **Yönlendirme bağlantısı** — tıklandığında açılacak tam adres. UTM parametresi
   eklerseniz tıklamaları kendi tarafınızda görebilirsiniz.
2. **Kısa alternatif metin** — görsel yüklenemediğinde ve ekran okuyucularda okunacak
   birkaç kelimelik ifade (örn. "Tureng Neo — yapay zekâ destekli çeviri").

## Metin seçeneği

Görsel yerine tek satırlık bir tanıtım metni de kullanılabilir. Bu durumda metin, eklentinin
kendi yazı tipi ve renkleriyle gösterilir.

## Dikkat edilmesi gereken iki nokta

- **Görsel, her açılışta sunucudan çekilmek yerine eklentinin içine gömülecek.** Bu,
  kullanıcıların eklentiyi her açtığında dışarıya istek gitmemesi için gerekli. Sonucu
  olarak görsel veya bağlantı değiştiğinde eklentinin yeni bir sürümünün yayımlanması,
  imzalanması ve mağaza incelemesinden geçmesi gerekiyor. Sık değişen bir kampanya
  planlanıyorsa bunu baştan konuşmakta fayda var.
- **Yazı boyutuna dikkat.** Görsel ekranda yalnızca 400 piksel genişliğinde görünüyor;
  küçük puntolu metinler okunmuyor.
