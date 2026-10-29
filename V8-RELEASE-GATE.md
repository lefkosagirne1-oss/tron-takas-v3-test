# V8 Nile güvenlik / yayın kapısı (29 Ekim 2026)

Bu dosya otomatik çalışmaların sonraki aşamaları için iç teknik nottur. **V8 henüz Nile'a dağıtılmadı ve uçtan uca TVM takası doğrulanmadı. Hazır değildir.**

## Kontrol edilmiş tasarım

- `contracts/TakasV8Invite.sol`: yönetici create/finalize, iki özel SHA-256 davet, 15 dakikalık ilk yatırımla başlayan fonlama, iki yatırım sonrası 5 dakikalık yönetici son onayı, süre sonunda yalnız yatıran cüzdana iade.
- Davet sırrı deposit işlem verisinde açığa çıktığından, artık her cüzdan önce `commitRole(id, role, sha256(secret || 20-byte wallet))` işlemini ayrı blokta kaydeder. Deposit, aynı cüzdanın önceki blokta oluşturduğu commitment olmadan çalışmaz. Basit mempool sırrı kopyalama saldırısı engellenir; bu **mutlak frontrunning garantisi değildir**.
- Önceki commitment `committedHash` salt-okunur sorgusuyla yeniden kullanılabilir. Katılımcı aynı butona basar ancak en az iki TronLink imzası gerekir (commit + deposit; token için approve da gerekebilir).
- V6/V7 yeni işlem akışı kapalı; önceki iade yolu açık bırakılmıştır.
- `.github/workflows/v6-tests.yml` resmi `tronprotocol/solc-bin` derleyicisini sabit blob SHA ile indirir; V8 artifact'i **testlerden önce** yeniden üretir ve ABI eşleşmesini kontrol eder.

## Dağıtım öncesi çözülmesi gerekenler

1. **Gerçek TVM/Nile doğrulaması yok.** Ganache/ethers testleri EVM simülasyonudur; Tron compiler artifact'i başarılı derlemek, TVM üzerinde dağıtım ve swap testi anlamına gelmez.
2. **Komisyon ödeyen taraf şu an yalnız TRX yatırabilir.** Token + ayrı TRX hizmet bedeli desteklenmiyor; A/B'nin her varlığı seçebilmesi gereksinimiyle uyuşması için sözleşme/UI ve iade testleri ayrıca güncellenmeli.
3. **İzin verilen tokenların güvenilirliği**: herhangi bir özel TRC20 sözleşmesi kötü niyetli balance/transfer uygulaması sunabilir; gerçek varlıklarla kullanımdan önce allowlist veya daha sıkı güvenlik modeli ve bağımsız denetim gerekir.
4. Davet sırları yöneticinin tarayıcı localStorage'ında; tarayıcı verileri silinirse SHA-256 tek yönlü olduğundan orijinal bağlantılar kurtarılamaz. Güvenli yedekleme/aktarım tasarımı değerlendirilmeli.
5. Katılımcı bağlantısındaki sözleşme adresi bağımsız olarak resmi yayınlanan sözleşme koduyla doğrulanmıyor; sahte sözleşme bağlantısı riskini azaltacak doğrulama gerekli.
6. V8 henüz yönetici cüzdanıyla Nile'a kurulmadı. **Kullanıcıdan imza veya test TRX harcaması istemeden** mümkün olan salt-okunur kontroller tamamlanmalı. Gerçek dağıtım olmadan "hazır" denmemeli.

## Sonraki çalışmanın önceliği

CI testlerinin ve GitHub Pages'in başarılı olduğunu doğrula; resmi artifact'in güncel sözleşme ABI'sinde `commitRole` ve `committedHash` bulunduğunu doğrula. Ardından token + ayrı TRX komisyonunu ve iade davranışını, kötü niyetli token durumlarını ve sahte sözleşme korumasını test ederek geliştir. Gereksiz Nile imzası/harcaması yapma.
