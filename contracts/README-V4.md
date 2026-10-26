# Takas V4 — İlk sözleşme taslağı

**Durum (26.10.2026):** Solidity kaynak kodu hazır; henüz derlenmedi, otomatik/yerel testleri çalıştırılmadı, Nile ağına dağıtılmadı. **Gerçek veya test tokeni göndermeyin.**

## Yeni akış
1. Yönetici `createInvite(feeBps, feePayer)` ile komisyon kuralı oluşturur (ör. %5 = 500 baz puan, ödeyen = A).
2. Taraf A ve Taraf B, kendi cüzdanlarıyla `requestRole` çağırır. Kimlik ve rol talebi yönetici tarafından bağımsız kontrol edilmelidir.
3. Yönetici iki adresi doğrulayıp `confirmParticipants` ile kilitler. Böylece sadece URL'deki `role=a` parametresine güvenilmez.
4. Katılımcılar kendileri `propose` ile varlık ve miktar belirler. Teklif değişirse **iki tarafın önceki kabulü sıfırlanır**.
5. İki taraf karşı tarafın teklifini ve net sonucu görerek `acceptTerms` çağırır. **15 dakikalık yatırma süresi ancak iki teklif de kabul edilince başlar.**
6. İki taraf `deposit` ile varlıkları sözleşmeye aktarır; iki yatırım tamamlanınca yönetici son işlemi için **30 dakikalık süre** başlar.
7. Yönetici `finalize` ile varlıkları atomik olarak karşı taraflara, başarılı takastaki hizmet bedelini ise kendi cüzdanına gönderir.
8. Yatırma penceresi tamamlanmadan ikinci yatırım gelmezse veya yönetici nihai süreyi kaçırırsa yatırım yapan taraflar `refund` ile kendi yatırımlarını alabilir.

## Mevcut taslakta bilinçli sınırlamalar
- İlk gelen katılımcı rol talebinde bulunabilir; yönetici onayı olmadan sözleşme teklif/yatırma aşamasına **geçmez**. Kötü niyetli rol talepleri `rejectRequests` ile temizlenir. Bu yine de spam ve kimlik doğrulama riskini tamamen çözmez.
- Fonlar yönetici cüzdanında değil, sözleşmede tutulur. Yöneticinin tek başına fonlara el koyabileceği özel fonksiyon yoktur.
- Bazı TRC20 tokenleri, aktarım vergisi/rebasing/özel dönüş davranışları nedeniyle desteklenmeyebilir. `deposit` tam miktarın geldiğini denetler. Kapsamlı token uyumluluk testleri zorunludur.
- Katılımcılar aynı anda farklı cüzdanlardan işlem yapmalıdır. Kullanıcı arayüzündeki role parametresi yetki kanıtı değildir.
- 30 dakikalık son onay süresi, önceki V3 testinde 5 dakikanın yetersiz kaldığı gözlemine dayanan yeni **tasarım varsayımıdır**; henüz zincirde doğrulanmadı.
- Kaynak dosya `contracts/TakasV4Draft.sol` eski V3 sözleşmesiyle bağımsızdır.

## Dağıtımdan önce zorunlu testler
- [ ] Solidity 0.8.31 ile derleme ve ABI kontrolü
- [ ] Yetkisiz `createInvite`, `confirmParticipants` ve `finalize` engellemesi
- [ ] Aynı adres / eksik katılımcı / yanlış role talepleri
- [ ] Teklif güncellenince her iki onayın geçersiz olması
- [ ] TRX ↔ TRC20 ve TRC20 ↔ TRC20 gerçek miktar işlemleri
- [ ] %0, %5, %10 komisyon; A/B ödeyen; yuvarlama ve net tutar doğruluğu
- [ ] Eksik yatırma, ikinci yatırımın geç gelmesi ve komisyonsuz iade
- [ ] Son onay süresi dolunca her iki tarafın ayrı ayrı iadesi
- [ ] Yeniden giriş, çift yatırma, iki kez iade, iki kez tamamlamanın engellenmesi
- [ ] Transferi başarısız tokenlar, fee-on-transfer ve token uyumluluğu
- [ ] Nile dağıtımı, zincir üstü olay ve bakiye denetimi, mobil TronLink kullanıcı testi
- [ ] Mainnet öncesi bağımsız güvenlik denetimi

**Durum:** Kontrolleri geçmeden Nile'de imza veya Mainnet kullanımı önerilmez.
