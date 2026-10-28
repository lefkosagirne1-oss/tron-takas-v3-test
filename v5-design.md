# Takas V5 — düşük işlem maliyetli Nile tasarımı (taslak)

Durum: **Tasarım; henüz dağıtılmadı veya test edilmedi.** V4 sözleşmesi ve çalışan V4 bağlantıları değişmeyecek.

## Kullanıcı akışı
1. Yönetici tek işlemle daveti ve **önceden doğruladığı** A/B cüzdan adreslerini kaydeder. Davet URL'si cüzdan sahipliği kanıtı değildir.
2. A, cüzdanını **ücretsiz** bağlar; tokenini ve miktarını girer. `Teklifimi gönder` tek zincir işlemiyle teklifini kaydeder. A'nın ilk teklifi, B'nin henüz bilinmeyen miktarına onay sayılmaz.
3. B, A'nın teklifini görür; kendi miktarını girer. `Teklifimi gönder ve A'nın teklifini kabul et` tek zincir işlemi yapar.
4. A, B'nin son teklifini görür. `Şartları kabul et ve yatır` tek zincir işlemiyle A'nın son onayını ve yatırmasını birleştirir. TRC20 tokeni için allowance önceden verilmemişse **ayrı approve işlemi** gerekebilir.
5. B, `Yatır` tek zincir işlemi yapar (TRC20 için gerekirse ayrı approve). İki yatırımın ardından 5 dakikalık son onay süresi başlar.
6. Yönetici `Son onay ve takası tamamla` işlemini imzalar. Sadece başarıda komisyon; zaman aşımında kullanıcıya açık iade.

## Değişmez güvenlik kuralları
- Taraflardan biri teklifini değiştirirse önceki karşılıklı kabul geçersizleşir. Son teklifi görmeden yatırım yapılamaz.
- Teklifler, taraflar, varlıklar, tutarlar ve komisyon imza öncesi gösterilir.
- İlk yatırım için 15 dakika, iki yatırım sonrası yönetici onayı için 5 dakika.
- Yönetici onayı olmadan takas tamamlanmaz; zaman aşımında yatıran taraflar kendi iadelerini alabilir.
- Komisyon yalnızca başarılı sonuçta; eksik TRC20 aktarımı reddedilir.
- İşlem sonucu doğrulanmadan aynı imza tekrar istenmez.
- TRON Energy/Bandwidth maliyeti hâlâ olabilir. Bir düğme bir imza anlamına gelmeli; otomatik olarak çok sayıda imza gizlenmemeli.

## Teknik sözleşme planı
- `createInviteWithParties(address a,address b,uint16 feeBps,uint8 feePayer)`: yönetici tek işlemde davet ve tarafları kaydeder.
- `submitOffer(id,token,amount,acceptOtherOfferHash)`: taraf kendi teklifini kaydeder; mevcut karşı teklifin hash'ini onaylayabilir. Karşı teklif yoksa hash sıfırdır.
- `acceptAndDeposit(id,expectedTermsHash)`: son teklifi atomik olarak onaylar ve yatırır; **diğer tarafın aynı terms hash'ini önceden onaylamış olması gerekir**.
- `deposit(id,expectedTermsHash)`: karşılıklı onaylanmış aynı şartlara yatırır.
- `finalize`, `refund`, `preview`: V4 korumaları korunur.
- Token approve ihtiyacını ortadan kaldırdığı iddia edilmez; yalnızca tokenin gerçekten desteklediği permit/authorization türü ayrıca doğrulanırsa değerlendirilebilir.

## Test kapısı
- A teklif verir, B teklif+onay verir, A son onay+yatırır, B yatırır, yönetici sonuçlandırır.
- Teklif değişimi eski imzaları geçersiz kılar.
- Yanlış cüzdan, yanlış token, yanlış miktar, çift yatırım, tekrar finalize engellenir.
- Yatırma süresi ve yönetici süresi dolunca tam iade; komisyon sıfır.
- Transfer vergili/eksik gönderim yapan token reddedilir.
- Nile'de önce yalnız test TRX ve test tokeniyle uçtan uca kanıt.
