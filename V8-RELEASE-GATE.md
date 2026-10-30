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


## 30 Ekim 2026, 00:15 TRT: resmi TRON derleyicisiyle yerel TVM TRC20 komisyon/iade testi

- `v8-test/tvm-state.mjs` genişletildi. Ayrı `LocalTRC20` mock token'ı, SHA'sı sabitlenmiş **resmi tron-solc 0.8.31** derleyicisiyle test anında derlenip `@tvmjs/tvm` TronNile ortamına dağıtıldı. `transferFrom`, `balanceOf`, `approve`, `transfer` çağrıları gerçek TVM simülatörü içinde çalıştırıldı.
- B tarafının **200 token + ayrı 50 TRX komisyon teminatı** yatırdığı, A tarafının 100 TRX yatırdığı başarılı takasta: A 200 token aldı, B 100 TRX aldı, yönetici yalnız finalize sonrasında 50 TRX aldı. Komisyonun finalize öncesi yöneticiye geçmediği doğrulandı.
- Başka takasta B yalnız 75 token + 50 TRX yatırdı; 15 dakika geçince **75 token ve 50 TRX'in tamamını geri aldı**, yöneticiye komisyon gitmedi. Token escrow bakiyesi sıfırlandı.
- CI sırası güncellendi: sabit SHA'lı resmi compiler, yerel TVM testlerinden **önce** indiriliyor. [GitHub Actions #40956129307](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/40956129307) **başarılı**. Commit'ler `bd430464af3517fbbe8e76613cd151b87d563110` ve `a28699516d46712fda1d5c728160ea30e0c2b7fc`. Önceki commit'e göre dosya silinmedi; yalnız test ve CI değişti. İlk ara commit'in CI başarısızlığı, derleyicinin indirilme sırasından kaynaklandı ve ikinci commit'te giderildi.
- **Yayın engeli değişmedi:** Bu sonuçlar yalnızca yerel TVM simülasyonudur. V8 gerçek Nile ağına kurulmadı; gerçek zincirde takas veya iade yapılmadı. Kullanıcıdan imza/TRX/ekran görüntüsü istenmedi. Sonraki öncelik: gerçek Nile read-only kurulum Energy simülasyonu ve daha geniş kötü niyetli TRC20 testleri.

## 30 Ekim 2026, 01:16 TRT: ücret kesen TRC20 için yerel TVM güvenlik testi

- `v8-test/tvm-state.mjs` resmi TRON derleyicisiyle hazırlanan mock TRC20'ye %10 transfer kesintisi eklenerek genişletildi. B tarafı 100 token + 50 TRX teminat yatırmayı denediğinde V8 `Received amount mismatch` nedeniyle **yatırımı reddetti**. Yerel TVM üzerinde token bakiyelerinin, TRX teminatının ve yönetici bakiyesinin değişmediği, rolün yatırılmış sayılmadığı ve 15 dakikalık saatin başlamadığı doğrulandı.
- [GitHub Actions V8 TVM #40964560687](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/40964560687) **başarılı**; sabit SHA ile resmi `tron-solc 0.8.31`, TVM TRX/TRX, normal TRC20, TRC20+TRX ücret/iade, ücret kesen TRC20'nin atomik reddi ve optimizer kıyaslaması geçti. Kod commit'i `d0010eaaf6711ba95a6cfabf1d25b28d1748c2de`.
- Bu test yalnız yerel TronNile TVM simülasyonudur. **Gerçek Nile dağıtımı, gerçek zincir yatırımı ve iadesi yok. Hazır değil.** Kurulumun ücretsiz gerçek Nile Energy simülasyonu ve TronLink/TVM davranışı doğrulanmadan imza veya test TRX istenmemeli.

## 30 Ekim 2026, 01:18 TRT: gerçek Nile RPC ile imzasız kurulum Energy simülasyonu

- Yeni `v8-test/nile-deploy-readonly.mjs` ve `.github/workflows/v8-tvm-smoke.yml` adımı, resmi V8 artifact'ini **Nile üzerinde hiçbir işlem yayınlamadan** `wallet/triggerconstantcontract` ve `wallet/estimateenergy` ile simüle etti. Yönetici cüzdanı kullanılmadı; sentetik adres `41` + 20 bayt `11` kullanıldı.
- [GitHub Actions #40964787833](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/40964787833) **başarılı**. Nile blok **72258800**, Energy fiyatı **100 SUN**. `triggerconstantcontract`: **1.501.462 Energy / teorik 150,1462 TRX**; `estimateenergy`: **1.507.328 Energy / teorik 150,7328 TRX**. `deployconstantcontract` HTTP 405 verdi, diğer iki yöntem geçerli sonuç döndürdü. Yerel TVM ölçümü **1.505.683 Energy** idi.
- Bu sonuç **gerçek Nile node simülasyonudur**, ancak belirli yönetici cüzdanının Energy/hesap kaynakları, nihai imza ve yayın maliyeti değildir. `takas-kurulum.html` hâlâ cüzdan özelinde yeniden ücretsiz tahmin gerektirir. 160 TRX üst sınırı ve %15+7 TRX güvenlik payı mevcut tahminle kurulumu engelleyebilir; güvenlik payı veya üst sınır doğrulanmadan körlemesine artırılmamalı. Sözleşme küçültme/kurulum maliyetini düşürme araştırması sürmeli.
- **Gerçek Nile deploy / takas / iade yapılmadı; hazır değildir.** Kullanıcıdan imza, TRX veya ekran görüntüsü istenmedi.


## 30 Ekim 2026, 02:13 TRT: çıkışta ücret kesen TRC20 için atomik son onay testi

- `v8-test/tvm-state.mjs` yerel resmi TRON compiler + TronNile TVM testinde, `transferFrom` ile escrow'a tam ulaşan fakat **sonraki `transfer` çağrısında %10 kesinti yapan** TRC20 senaryosu eklendi.
- A 100 TRX, B 100 token + 50 TRX komisyon teminatı yatırdıktan sonra yönetici `finalize` denedi. Alıcıya eksik token gideceği için son onay geri alındı: `completed=false`, escrow token bakiyesi ve A/B TRX bakiyeleri değişmedi, yönetici komisyon almadı. Token kesintisi kaldırılınca 5 dakikalık pencere içinde tekrar `finalize` başarılı oldu ve yönetici tam 50 TRX aldı.
- Kod commit'i [c39bc2886cced6fc6ab9aef947927da33c7131a6](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/commit/c39bc2886cced6fc6ab9aef947927da33c7131a6). [GitHub Actions TVM #40971699138](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/40971699138) başarılı; resmi compiler indirme, TRX/TRX, TRC20+TRX, iade, giriş/çıkış kesintili token regresyonları, salt-okunur Nile tahmini ve optimizer adımları başarıyla tamamlandı.
- Bu yalnız yerel TVM kanıtıdır; **V8 gerçek Nile'a kurulmadı, zincirde gerçek takas yapılmadı, hazır değildir.** Kurulum maliyeti ve gerçek TronLink imzalı davranış yayın engeli olmaya devam ediyor. Kullanıcıdan imza veya TRX istenmedi.


## 30 Ekim 2026, 03:14 TRT: yönetici immutable bütünlüğü ve kurulum maliyeti kıyaslaması

- Güvenlik açığı giderildi: V8 arayüzü Nile çalışma kodunu karşılaştırırken derleyicinin altı immutable manager slotunu körlemesine maskeliyordu. Sahte bir sözleşme `manager()` için doğru cüzdanı döndürüp başka slotlarda yetki/komisyon alıcısını değiştirebilirdi. `takas-common.js` artık **tek immutable tanımı**, altı slotun **aynı sıfır olmayan 20 bayt yönetici adresini** taşıması ve diğer bütün çalışma kodunun birebir eşleşmesini zorunlu tutuyor. Bölünmüş slot saldırısı ve kod değiştirme regresyonu eklendi.
- İlk test koşusunda eski test mock'u immutable slotları sıfır bıraktığı için 23 test başarısız oldu; mock gerçek constructor-patched runtime ile düzeltildi. Son [GitHub Actions UI/test #40978169351](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/40978169351) **110/110 başarılı, 0 hata**. Sözleşme artifact'i değişmedi.
- [Resmi TRON compiler + yerel Nile TVM #40978293018](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/40978293018) **başarılı**. TVM'de sözleşme oluşturulunca gerçek runtime'daki **altı immutable manager slotunun da aynı 20 bayt adrese yazıldığı** doğrulandı. TRX/TRX, token+TRX komisyon, süre aşımı iadeleri ve giriş/çıkış ücretli token atomik geri alma testleri geçti. Nile salt-okunur blok **72261092**, Energy fiyatı **100 SUN**; imzasız `triggerconstantcontract` **1.501.462 Energy**, `estimateenergy` **1.507.328 Energy**.
- Resmi tron-solc optimizer maliyet matrisi: yayınlanan `viaIR=true, runs=200` **7394 bayt / 1.505.683 Energy**. En iyi denenen `viaIR=true, runs=1, metadata=none` **7341 bayt / 1.495.070 Energy**; tasarruf **10.613 Energy (~%0,70; 100 SUN fiyatıyla teorik 1,0613 TRX)**. `viaIR=false` denemeleri daha pahalı. Bu kazanç küçük olduğu için yayımlanan artifact, derleme ayarları ve sözleşme **değiştirilmedi**.
- `d5ef0841` ile son güvenlik/test commit'i karşılaştırmasında **silinen dosya yok**. Eski V6/V7 iade sayfaları değiştirilmedi. Kullanıcıdan imza, TRX veya ekran görüntüsü istenmedi.
- **YAYIN ENGELİ DEVAM EDİYOR:** V8 gerçek Nile'a kurulmadı; gerçek zincirde imzalı takas ve iade doğrulanmadı. Yerel TVM, CI ve imzasız RPC tahmini bunu ikame etmez. Hazır ilan etme. Sonraki öncelik: kurulumun ~150 TRX Energy maliyetini güvenliği bozmadan azaltacak mimari araştırma ve imzasız preflight; gerçek dağıtım için yönetici imzası olmadan zincir kanıtı üretilemez.
