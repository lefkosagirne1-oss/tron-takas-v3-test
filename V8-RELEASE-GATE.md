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
2. **Token + ayrı TRX hizmet bedeli** sözleşme/UI ve iade testlerine eklendi: TRX yatıran tarafta ücret yatırılan TRX'ten düşer; TRC20 yatıran tarafta ücret ayrıca TRX teminatı olarak yatırılır ve başarısızlıkta iade edilir. Bu yolun gerçek TVM/Nile davranışı hâlâ doğrulanmalı.
3. **İzin verilen tokenların güvenilirliği**: herhangi bir özel TRC20 sözleşmesi kötü niyetli balance/transfer uygulaması sunabilir; gerçek varlıklarla kullanımdan önce allowlist veya daha sıkı güvenlik modeli ve bağımsız denetim gerekir.
4. Davet sırları yöneticinin tarayıcı localStorage'ında; tarayıcı verileri silinirse SHA-256 tek yönlü olduğundan orijinal bağlantılar kurtarılamaz. Güvenli yedekleme/aktarım tasarımı değerlendirilmeli.
5. Katılımcı bağlantısındaki sözleşme adresi bağımsız olarak resmi yayınlanan sözleşme koduyla doğrulanmıyor; sahte sözleşme bağlantısı riskini azaltacak doğrulama gerekli.
6. V8 henüz yönetici cüzdanıyla Nile'a kurulmadı. **Kullanıcıdan imza veya test TRX harcaması istemeden** mümkün olan salt-okunur kontroller tamamlanmalı. Gerçek dağıtım olmadan "hazır" denmemeli.

## Sonraki çalışmanın önceliği

CI testlerinin ve GitHub Pages'in başarılı olduğunu doğrula; resmi artifact'in güncel sözleşme ABI'sinde `commitRole` ve `committedHash` bulunduğunu doğrula. Ardından token + ayrı TRX komisyonunun resmi artifact/ABI ve test sonuçlarını doğrula; kötü niyetli token durumlarını ve sahte sözleşme korumasını test ederek geliştir. Gereksiz Nile imzası/harcaması yapma.

## 29 Ekim ek UI denetimi

- Güvenli V8 katılımcı arayüzündeki FRHN test-token kısa yolu kaldırıldı; TRX veya adresi açıkça girilen TRC20 seçimi kaldı. `v6-test/secure-ui.test.mjs` buna yönelik regresyon kontrolü içerir.
- GitHub commit `712b8bfa50d7d01a38add8e9d16b8da16d883938`; CI ve Pages sonuçları ayrıca doğrulanmadan tamamlandı sayılmamalı.
- **Yayın engeli devam ediyor:** Nile gerçek TVM kurulumu / takas yok; sözleşme adresi sahteciliğini önleyen on-chain kod kimliği doğrulaması henüz eklenmedi.

## 29 Ekim 2026, güvenlik sertleştirmesi (sonraki çalışma)

- Çok aşamalı TronLink akışında cüzdan değişimi tespit edilip imzadan önce reddedilir. A/B token approve, role commitment, deposit; yönetici create ve finalize aynı seçili cüzdanla devam eder.
- Katılımcı/yönetici sayfası artık davet bağlantısındaki V8 adresinin Nile `wallet/getcontractinfo` `runtimecode` değerini resmi TRON compiler artifact'iyle karşılaştırır. `manager` immutable olduğu için derleyicinin bildirdiği `immutableReferences` byte offsetleri dışında **tam eşleşme** zorunludur; manager adresi ayrıca sözleşmeden doğrulanır. Sahte sözleşme bağlantısında imza engellenir.
- `v6-test/build.mjs` artık `runtimeBytecode` ve `immutableReferences` alanlarını resmi tron-solc 0.8.31 artifact'ine ekler. Derleyicinin immutable manager için altı adet 32 baytlık slot bildirdiği doğrulandı.
- GitHub Actions run **40920291672** başarılı: **101 test geçti, 0 hata**. Resmi TRON compiler derlemesi başarılı; salt-okunur Nile RPC blok **72252870**, Energy fiyatı **100 SUN**. Artifact yayın commit'i `1a61cf13ea26a68a7d94c348901627c73b4d4317`.
- Kod derlemesi ve EVM/Ganache testleri gerçek Nile TVM takası yerine geçmez. **V8 hâlâ Nile'a kurulmadı; gerçek zincir takası yapılmadı. Hazır değildir.** Kullanıcıdan cüzdan imzası veya TRX harcaması istenmemeli.
- Sonraki kontrol: artifact yayın commit'inin Pages dağıtımını teyit et; gerçek TVM davranışı ve kullanıcıya maliyetsiz kurulum tahmini yöntemlerini doğrula. Dağıtım olmadan uçtan uca başarı bildirme.

## 29 Ekim 2026, 21:13 TRT: iade ve kurulum imza güvenliği

- V8 katılımcı iade akışı da başlangıçta seçilen TronLink cüzdanına sabitlendi; cüzdan okuma ile imza arasında değişirse iade işlemi gönderilmiyor. Eski V6/V7 iade arayüzlerine dokunulmadı.
- V8 kurulum akışında cüzdan, işlem hazırlanırken ve imzadan sonra yayınlanmadan önce tekrar kontrol ediliyor; yanlış cüzdanla yayınlama engelleniyor.
- İki yeni regresyon testi eklendi. [GitHub Actions #40928526008](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/40928526008): **103/103 test geçti**, resmi TRON derleyicisi çalıştı. Nile salt-okunur sorgu: blok **72253904**, Energy fiyatı **100 SUN**. Ganache uWS yerel ikili uyarısı çıktı ancak testler başarıyla tamamlandı.
- [GitHub Pages #40928526340](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/40928526340) başarılı. Kod commit'i `0a6a2cfd8dec7ee7451a6eb7f062655576564f40`. Önceki commit `2d0aca8e21e862100d1b00867baa9a6f14d40696` ile karşılaştırmada **silinen dosya yok**.
- Resmi TRON dokümantasyonu `deployConstantContract` için imzasız/harcamasız kurulum simülasyonu tanımlıyor: https://tronweb.network/docu/docs/5.3.2/API%20List/transactionBuilder/deployConstantContract . Ancak bu çalışmada V8 artifact'iyle gerçek Nile TVM kurulum simülasyonu sonucu elde edilmedi; yalnız zincir blok/parametre sorgusu doğrulandı.
- **YAYIN ENGELİ:** V8 hâlâ Nile'a dağıtılmadı, gerçek TVM yatırma/takas/iade doğrulaması yok. Sistemi hazır ilan etme. Sonraki çalışmada Nile kurulum simülasyonunu, gerçek TRON davranışını ve kullanıcıya maliyetsiz preflight kontrollerini sürdür. Kullanıcıdan imza veya TRX isteme.

## 29 Ekim 2026, 21:16 TRT: TronWeb SUN parametresi

- Resmi TronWeb sözleşme `.send()` seçeneklerinde `callValue` sayısal tiptedir. Önceki V8 arayüzü TRX ve token komisyonu yatırımlarında SUN miktarını string gönderiyordu; `takas-common.js` artık güvenli tam sayı aralığını kontrol edip `number` olarak iletiyor. Çok büyük veya negatif SUN tutarları **imza öncesinde** reddediliyor. Sözleşme `uint256` parametreleri string kalıyor (hassasiyet kaybı yok).
- [GitHub Actions #40928943585](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/40928943585): **104 test geçti, 0 hata**, resmi TRON compiler artifact yeniden üretildi; Nile salt-okunur blok **72253960**, Energy fiyatı **100 SUN**. [GitHub Pages #40928942115](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/40928942115) başarılı. Kod commit'i `5089bc1887213e9a099171465f3489152a99f58b`.
- **Hâlâ hazır değil:** Nile'da V8 deploy ve gerçek TVM takas/iade testleri yok. Kullanıcıdan imza veya TRX harcaması istenmedi.

## 29 Ekim 2026, 22:20 TRT: süre sonu güvenli ön kontrol

- Katılımcı sayfası, token onayı / davet güvenlik kaydı / yatırım imzası öncesinde **güncel Nile takas durumunu yeniden okur**. Bu arada diğer işlem rolü doldurduysa veya takas kapandıysa yatırım imzalanmaz. İlk masraflı adımda 60 saniye, güvenlik kaydı öncesinde 40 saniye, yatırım öncesinde 15 saniye süre payı aranır; son dakikada gereksiz revert riski azaltılır. İlk yatıran için henüz süre başlamadığından bu sınır uygulanmaz.
- Katılımcı iadesi ve yöneticinin son onayı, Nile blok zamanını okuyamazsa **imza göndermeden durur**. Son onaya 15 saniyeden az kaldıysa işlem gönderilmez; süre bitince iade yolu korunur.
- Yeni regresyonlar: son dakika yatırımı engelleme, commit sonrası başka işlemin rolü kapatması, okunamayan iade blok zamanı, son saniye yönetici onayı ve okunamayan yönetici blok zamanı. İlk CI denemesinde iki testin mock yatırımları sıfır bırakılmıştı; test verileri düzeltilerek tekrar koşuldu.
- [GitHub Actions #40938822399](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/40938822399): **109/109 test geçti, 0 hata**, resmi TRON compiler artifact yeniden üretildi; salt-okunur Nile blok **72255221**, Energy fiyatı **100 SUN**. [GitHub Pages #40938821822](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/40938821822) başarılı. Kod/test commit'i `b22823fd8e27167f42cc3e4e2c9afcafb72810e6`.
- Bu değişikliklerde Solidity sözleşmesi ve eski V6/V7 iade arayüzleri değiştirilmedi; önceki main `48321b54` ile diff'te silinen dosya yok.
- **YAYIN ENGELİ SÜRÜYOR:** V8 henüz Nile'a kurulmadı; gerçek TVM para yatırma, son onay ve iade kanıtı yok. Yerel Ganache testleri zincir kanıtı değildir. Kullanıcıdan imza, test TRX veya ekran görüntüsü istemeden kalan salt-okunur kontrollerden devam et; hazır olduğunu söyleme.

## 29 Ekim 2026, 22:24 TRT: bağımsız yerel Nile TVM çalıştırması

- Resmi `tron-solc 0.8.31` V8 artifact'i artık ayrıca `@tvmjs/tvm@1.1.0` ile **TronNile** zincir kuralları altında, hiçbir cüzdan/işlem yayını olmadan çalıştırılıyor. Yeni testler `v8-test/tvm-smoke.mjs` ve `v8-test/tvm-state.mjs`; CI iş akışı `.github/workflows/v8-tvm-smoke.yml`.
- Yerel TVM runtime testi: `inviteVersion()=8`, `DEPOSIT_WINDOW()=900`, `FINAL_WINDOW()=300`. Stateful TVM testi: resmi bytecode ile sözleşme oluşturma, davet hash'leriyle takas açma, A/B cüzdan bağlı commit, **100 TRX ↔ 200 TRX** yatırma, **50 TRX A komisyonu** ile yönetici finalize, gerçek TVM hesap bakiyelerinde A=200 TRX, B=50 TRX, yönetici=50 TRX. Ayrıca tek yatırımın 15 dk sonra tam iadesi ve iki yatırımın 5 dk son onay süresi dolunca **komisyonsuz tam iadesi** doğrulandı.
- [GitHub Actions #40939893462](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/40939893462) başarılı. Önceki 109 Ganache/arayüz testi [#40938822399](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/40938822399) başarılı. Yerel TVM deployment tüketimi **1.505.683 Energy** olarak ölçüldü; Nile salt-okunur Energy fiyatı 100 SUN kabul edilirse teorik **150,5683 TRX** (kullanılabilir Energy düşülmeden) eder. Bu **gerçek Nile maliyet tahmini değildir** ve `takas-kurulum.html` kendi Nile tahminini ayrıca zorunlu tutar. 160 TRX feeLimit ve %15 güvenlik payı bazı cüzdanlarda kurulumu engelleyebilir; sınırı körlemesine yükseltme.
- Yerel TVMJS, java-tron Nile ağının kendisi değildir. **V8 hâlâ gerçek Nile'a dağıtılmadı ve gerçek zincir takası yok.** Gerçek TVM/TronLink imzası ve kullanıcı maliyeti gerektiren son doğrulama yapılmadı. Kullanıcıdan imza, TRX veya ekran görüntüsü istenmedi. Sistemi hazır ilan etme.

## 29 Ekim 2026, cüzdan izolasyonu ve kurulum Energy kıyaslaması

- V8 kurulum sayfasında kaydedilmiş sözleşme adresi ve bekleyen kurulum işlem kimliği artık seçili yönetici cüzdanının adresine göre ayrı saklanıyor. Bir cüzdanın kaydı başka cüzdanın kurulumunu yanlışlıkla kilitlemiyor. Ana sayfa da yalnız seçili cüzdanın sözleşmesine yönlendiriyor. Eski V6/V7 iade sayfaları değiştirilmedi.
- Resmi tron-solc 0.8.31 ile **yalnız yerel TronNile TVM** üzerinde optimizer `runs=200` ve `runs=1` kıyaslandı: mevcut artifact **7394 bayt / 1.505.683 Energy**, deneysel `runs=1` **7382 bayt / 1.503.277 Energy**. Kazanç yalnızca **2406 Energy (yaklaşık %0,16)**; mevcut güvenli artifact ve derleme ayarları **değiştirilmedi**. Test: [GitHub Actions #40947147139](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/40947147139) başarılı.
- Bu Energy değerleri gerçek Nile maliyeti değildir. Kurulum maliyetini anlamlı biçimde azaltmak için sözleşme tasarımı / bytecode boyutu üzerinde ayrıca çalışma gerekir; güvenlik kontrollerini kaldırarak maliyet düşürülmemelidir.
- **Yayın engeli devam ediyor:** V8 Nile'a kurulmadı ve gerçek zincirde takas/iade yapılmadı. Kullanıcıdan cüzdan imzası veya test TRX harcaması istenmedi.
