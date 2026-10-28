# V5 Nile dağıtım kapısı (V4'ten bağımsız)

## Mevcut durum
- V5 kaynak: `contracts/TakasV5Draft.sol`.
- Otomatik EVM/Ganache testleri: GitHub Actions 40718306143 başarılı (21 test).
- Derleme paketi: aynı çalışmadaki `takas-v5-nile-unsigned-artifact` (ABI, bytecode, kaynak hash).
- V5 henüz Nile üzerinde **dağıtılmadı**. V4 sözleşmesine veya sayfalarına dokunulmayacak.
- Salt okunur ön kontrol: `v5-nile-hazirlik.html`.

## Canlı Nile öncesi engeller
1. **Token güvenliği**: Standart dışı, transfer kesintili, yeniden bazlanan veya transferi durdurulabilen tokenlar kilitli fonların iadesini/teslimini engelleyebilir. V5 şu anda token allowlist kullanmıyor. Mainnet'e uygun değil.
2. **TVM uyumluluğu**: EVM/Ganache testleri TRON Nile TVM üzerinde çalışmayı kanıtlamaz. Derlenen bytecode ve ABI TRON dağıtım aracıyla uyumluluk kontrolünden geçmeli.
3. **Kaynak/Energy**: Gerçek imzadan önce salt okunur Energy tahmini ve yönetici cüzdanının kullanılabilir kaynakları kontrol edilmeli; başarısız işlemler için tekrarlı deneme yapılmamalı.
4. **Kullanıcı arayüzü**: Yönetici/katılımcı sayfalarında doğru ağ, doğrulanmış V5 adresi, beklenen takas numarası, cüzdan rolü, token decimals ve fee/net tutarlar kontrol edilmeden yazma işlemleri açılmamalı.
5. **Uçtan uca test**: Ayrı A/B cüzdanları ve yönetici ile TRX–standart TRC20 başarılı takas, tek taraflı yatırma iadesi, çift taraflı yatırma sonrası yönetici gecikmesi iadesi ve komisyon senaryoları Nile üzerinde test edilmeli.
6. **Bağımsız inceleme**: Yerel test başarısı bağımsız güvenlik denetimi değildir.

## Amaçlanan akış
- Yönetici, `createInviteWithParties(A,B,feeBps,feePayer)` ile tek seferde iki cüzdanı sabitler.
- A, `propose` ile varlık ve miktar belirler.
- B, `offerAHash` değerini doğrulayıp `proposeAndAcceptA` ile karşı teklifini verir.
- A, `termsHash` ve net tutarları kontrol ederek `acceptAndDeposit` çağırır.
- B, `deposit` çağırır. Yönetici, 5 dakikalık süre içinde `finalize` çağırır.
- Süre dolduğunda uygun katılımcı `refund` ile kendi tam yatırdığı tutarı geri ister. İade otomatik transfer değildir; zincirde işlem çağrısı gerekir.

## Kritik not
Tarafların yalnızca davet linkini açması kimlik doğrulama değildir. Sözleşme, `msg.sender` cüzdan adresini doğrular. Hiçbir işlemde özel anahtar veya kurtarma ifadesi istenmemelidir.
