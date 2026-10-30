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


## 30 Ekim 2026, 04:12 TRT: aynı TRC20 ile iki taraflı takas TVM testi

- `v8-test/tvm-state.mjs` resmi tron-solc ile derlenen **aynı TRC20 sözleşmesini** A ve B'nin seçtiği senaryoyla genişletildi. A 60 token + ayrı 50 TRX komisyon teminatı, B 90 token yatırdı. Yönetici son onayından önce komisyon alınmadığı; son onaydan sonra A'nın net +30 token, B'nin net -30 token değişimi yaşadığı, escrow token bakiyesinin başlangıç seviyesine döndüğü ve yöneticinin yalnız 50 TRX aldığı yerel Nile TVM üzerinde doğrulandı.
- Kod commit'i [1db1be774863fad20f581c231c2fa62d20280e85](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/commit/1db1be774863fad20f581c231c2fa62d20280e85). [TVM CI #40984357734](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/40984357734) **başarılı**; [Pages #40984357122](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/40984357122) **başarılı**. Önceki head `20faa5f8` ile karşılaştırmada **yalnız 27 test satırı eklendi, silinen dosya yok**. Sözleşme, resmi artifact ve kullanıcı arayüzü değiştirilmedi.
- **Hazır değildir:** Gerçek Nile deploy, imzalı takas/iade ve cüzdan maliyeti doğrulanmadı. Kullanıcıdan imza, test TRX veya ekran görüntüsü istenmedi. Sonraki aşama imzasız maliyet azaltma araştırması ve gerçek Nile dağıtım kapısının güvenlik değerlendirmesi.

## 30 Ekim 2026, 05:13 TRT: davet bağlantısı ve kayıp sır durumunda iade

- Yeni A/B davet bağlantılarında 32 baytlık özel anahtar HTTP sorgu parametresinden `#secret=` URL fragment'ına taşındı; fragment sunucuya HTTP isteğinde gönderilmez. Daha önce dağıtılmış `?secret=` bağlantıları katılımcı arayüzünde geriye dönük çalışmaya devam eder. Fragment, varsa eski query anahtarına göre önceliklidir.
- V8 katılımcısı özel davet sırrını kaybetmiş olsa bile, güvenilir V8 sözleşme adresi + takas numarası + rol bilgisiyle **yalnız yatırdığı tutarın süresi dolmuş iadesini** talep edebilir. `refund()` sözleşmede yatıran cüzdanı kontrol eder; sır olmadan `deposit()` imzası engellenmeye devam eder. Yeni UI regresyonları her iki durumu doğrular. Eski V6/V7 iade sayfaları değiştirilmedi.
- GitHub Actions [UI/yerel test #40990884766](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/40990884766) **başarılı**; [Pages #40990884879](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/40990884879) **başarılı**. Son kod commit'i `8ada87be15c051bc6bfc348bc30c0e1152b04b6f`. Önceki `5c92728e` ile karşılaştırmada yalnız üç UI/test dosyası değişti, **silinen dosya yok**. İlk ara commit'lerin başarısız CI denemeleri yeni iade yolunun regex/sır kontrolü testleriyle yakalandı; son commit'te giderildi.
- **YAYIN ENGELİ DEVAM EDİYOR:** Resmi V8 artifact'i ve Solidity sözleşmesi bu çalışmada değişmedi. Gerçek Nile deploy, imzalı takas ve gerçek zincir iade testi yok. Yaklaşık 150 TRX'lik imzasız kurulum Energy tahmini de değişmedi. Kullanıcıdan imza, TRX veya ekran görüntüsü istenmedi; sistemi hazır ilan etme.


## 30 Ekim 2026: değiştirilebilir TRC20 transfer vergisi / iade kilitlenmesi

- Yerel TronNile TVM regresyonu eklendi: B tarafı 40 TRC20 + 50 TRX komisyon teminatını **normal transfer koşullarında** yatırır. Token yöneticisi yatırmadan sonra %10 transfer vergisi açarsa 15 dakikalık süre sonunda `refund` alıcıya eksik ulaşmayı reddeder; tüm işlem atomik geri alınır, komisyon ödenmez ve iade hakkı kaybolmaz. Vergi tekrar sıfırlanınca aynı iade başarılı olur, hem 40 token hem 50 TRX tam döner.
- **Kritik güvenlik sınırı:** Token yöneticisi transfer vergisini/engellemeyi kalıcı tutarsa sözleşme tokenları ve beraberindeki TRX komisyon teminatını iade edemeyebilir. Salt `balanceOf` farkı denetimi fonların eksik gönderilmesini önler, ancak keyfi TRC20 için koşulsuz iade garantisi vermez. Sözleşme değiştirilmeden önce bu riskin çözümü olarak güvenilir token allowlist'i ve değiştirilebilir token politikalarının reddi değerlendirilmelidir; yalnız UI uyarısı yeterli değildir.
- [Resmi TRON derleyicisi + yerel Nile TVM #40996390611](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/40996390611) **başarılı**: dinamik token transfer vergisi yüzünden iadenin atomik reddi ve vergi kaldırıldıktan sonra eksiksiz iade doğrulandı. [UI/yerel test #40996450197](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/40996450197) **başarılı**. Katılımcı sayfasına özel tokenın sonradan iade engeli yaratabileceği uyarısı eklendi. V8 gerçek Nile'a kurulmadı, gerçek zincir takası yapılmadı; hazır değildir. Kullanıcıdan cüzdan imzası, test TRX veya ekran görüntüsü istenmedi.

## 30 Ekim 2026, 07:15 TRT: kurulum tahmini eskimesi güvenlik kontrolü

- V8 kurulumunda ücretsiz Nile Energy tahmini artık **5 dakika** geçerlidir. Süre dolarsa veya seçili TronLink cüzdanı değişirse kurulum imzalanmadan durur; imza öncesinde ve imzadan sonra, işlem yayınlanmadan hemen önce aynı kontrol yeniden yapılır. Böylece saatler önceki maliyet/kaynak tahminine güvenilmez.
- Değişiklikler: `takas-kurulum.html` ve `v6-test/secure-ui.test.mjs`. İlk CI denemesinde önceki testin eski `estimatedWallet!==selectedWallet()` kod kalıbına bağlı olması nedeniyle 113/114 test geçti; test yeni `estimateFresh()` kontrolünü doğrulayacak biçimde güncellendi. Son [GitHub Actions #41001831147](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41001831147) **114/114 başarılı, 0 hata**. [GitHub Pages #41001831333](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41001831333) başarılı. Resmi TRON derleyici/artifact adımı başarılı; Nile salt-okunur blok **72265923**, Energy fiyatı **100 SUN**. Kod commit'i `0418ce91531904827cea3d881e5a3554c705f5d6`.
- Önceki main `f919d9e1` ile farkta **yalnız iki dosya değişti, silinen dosya yok**. Solidity, V8 resmi bytecode, eski V6/V7 iade sayfaları değiştirilmedi.
- **YAYIN ENGELİ DEVAM EDİYOR:** V8 Nile'a dağıtılmadı; gerçek zincir takası/iadesi yapılmadı. İmzasız kurulum Energy tahmini yaklaşık 150 TRX düzeyinde ve 160 TRX üst sınırına güvenlik payı sığmıyor. Geliştirmeyi imzasız maliyet azaltma ve güvenilir token politikası üzerinde sürdür; kullanıcıdan TRX, imza veya ekran görüntüsü isteme. Hazır ilan etme.

## 30 Ekim 2026, 09:15 TRT: yönetici son onayında takas kimliği ve durum sabitlemesi

- `takas-yonetici.html` son onay işleminde **ekranda incelenen takas numarasını** `reviewedId` olarak sabitliyor; kullanıcı asenkron inceleme sırasında numara alanını değiştirirse farklı takasa imza atılmıyor.
- Token meta verileri okunurken takasın iade edilmesi veya tutar, taraf, token, komisyon ya da son onay süresinin değişmesi olasılığına karşı, son imza öncesinde **ikinci zincir okuması** yapılıyor. Değişen/kapalı takasta imza engelleniyor. Bu, işlemin imzadan sonraki zincir sırasını garanti etmez; sözleşme son kontrolleri yine geçerlidir.
- `v6-test/secure-ui.test.mjs` üç yeni regresyon testi içeriyor: inceleme sırasında ID değişimi, arada iade, değişmeyen takasta başarılı son onay. İlk CI [#41012815434](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41012815434) eski kod kalıbını arayan regresyon yüzünden 118/119 başarısız oldu; eski test güncellendi. Son [GitHub Actions #41012936565](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41012936565) **119/119 başarılı, 0 hata**; resmi TRON derleyici/artifact üretimi başarılı, Nile salt-okunur blok **72268307**, Energy fiyatı **100 SUN**. [GitHub Pages #41012935931](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41012935931) başarılı. Kod/test commit'i `fe091b65447734182f49f3c79ba9ea47137fe7fe`.
- `d5ef0841` ile güncel kod karşılaştırmasında silinen dosya yok. Solidity V8 sözleşmesi, resmi artifact ve eski V6/V7 iade sayfaları bu çalışmada değiştirilmedi.
- **Hazır değil:** Gerçek Nile V8 kurulumu, imzalı zincir takası/iadesi yok; yaklaşık 150 TRX kurulum tahmini ve değiştirilebilir TRC20 iade kilitlenmesi riski sürüyor. Kullanıcıdan cüzdan imzası, TRX veya ekran görüntüsü istenmedi.


## 30 Ekim 2026, 10:19 TRT: davet güvenlik kaydı / rol çalma yerel TVM regresyonu

- Resmi TRON compiler artifact'inin yerel TronNile TVM testine ek güvenlik senaryosu eklendi: bir cüzdanın aynı blokta oluşturduğu `commitRole` kaydıyla hemen `deposit` yapması reddediliyor ve takasın rolü/süresi değişmiyor. A tarafı önceki blokta güvenlik kaydı oluşturup yatırdıktan sonra, açığa çıkan davet sırrıyla başka cüzdanın rolü devralma veya yeniden kayıt denemeleri de reddediliyor. Süre dolunca yatıran tarafın iadesi ve escrow bakiyesinin temizlenmesi doğrulandı.
- `@tvmjs/tvm` testlerindeki `skipBalance:true` çağrısı imzasız simülasyon için kullanıcı bakiyesi borçlandırmasını modellemediğinden, ilk iki CI denemesinde kullanıcı bakiyesi üzerinden kurulan hatalı test beklentileri başarısız oldu. Test, güvenilir sözleşme durumuna ve escrow bakiyesine göre düzeltilerek tekrar çalıştırıldı.
- Kod/test commit'i [82cf0232](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/commit/82cf0232b4ae96c1aef37526451c2602ad5cb1a8). [Yerel TVM CI #41019337251](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41019337251) başarılı; [GitHub Pages #41019336952](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41019336952) başarılı. Solidity ve resmi artifact değiştirilmedi, eski iade sayfaları korunuyor.
- **V8 hâlâ Nile'a dağıtılmadı, gerçek zincirde imzalı takas/iade kanıtı yok ve hazır değildir.** Yaklaşık 150 TRX kurulum Energy maliyeti ile değiştirilebilir TRC20 iade kilidi riskleri sürüyor. Kullanıcıdan imza, TRX veya ekran görüntüsü istenmedi.


## 30 Ekim 2026, 11:18 TRT: TVM tam sınır zamanı ve kullanılmamış takas iptali

- Resmi `tron-solc 0.8.31` artifact'iyle çalışan yerel TronNile TVM testlerine iki zaman sınırı regresyonu eklendi: ilk yatırımdan **tam 900 saniye sonra** B'nin yatırımı reddedilir, A tam tutarı iade alır; ikinci yatırımdan **tam 300 saniye sonra** yönetici `finalize` işlemi reddedilir, A ve B tam yatırımlarını geri alır, yönetici komisyon alamaz. Ayrı testte yönetici kullanılmamış takası iptal edince yeni `commitRole` reddedilir.
- Kod commit'i [5542876b](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/commit/5542876b342a1c454b4d8470d1b9580891ce82d0). [Yerel TVM CI #41025375195](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41025375195) **başarılı**; resmi derleyici indirildi ve SHA sabiti doğrulandı. GitHub diff: yalnız `v8-test/tvm-state.mjs` değişti (+49 satır), silinen dosya yok; Solidity, artifact ve eski iade sayfaları değiştirilmedi.
- İmzasız Nile RPC blok **72270734**, Energy fiyatı **100 SUN**. Kurulum simülasyonu `triggerconstantcontract` **1.501.462 Energy**, `estimateenergy` **1.507.328 Energy** (kaynak Energy olmadan teorik ~150 TRX). `deployconstantcontract` HTTP 405 verdi; bu endpoint'e dayanılmıyor.
- **Yayın engeli değişmedi:** V8 gerçek Nile'a kurulmadı, imzalı zincir takası ve iade kanıtı yok. Yerel TVM sınır testleri gerçek zincir testi yerine geçmez. Kullanıcıdan imza, TRX veya ekran görüntüsü istenmedi. Sonraki aşamada gerçek Nile dağıtımından önce maliyet/enerji ve değiştirilebilir TRC20 iade riski ele alınmalı.


## 30 Ekim 2026, 12:18 TRT: yerel TVM yetki / davet / tek-seferlik ödeme regresyonları

- Resmi `tron-solc 0.8.31` artifact'iyle `v8-test/tvm-state.mjs` testlerine yeni, imzasız TronNile TVM senaryoları eklendi. Yönetici olmayan cüzdanın takas oluşturması veya iptal etmesi, yanlış davet sırrı, önceki blokta cüzdana bağlanmamış davetle yatırma, yönetici tarafından fonlanmış takasın iptali, yatırmayan cüzdanın ve yöneticinin iade talebi, ikinci iade, yetkisiz son onay, ikinci son onay ve tamamlanmış takasın iadesi reddedildi. Normal tek seferlik son onayda **50 TRX komisyonun yalnız bir kez** ödendiği ve escrow'un boşaldığı doğrulandı.
- Kod/test commit'i [`56c0d1c5`](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/commit/56c0d1c5a9accd3e96924bcef9d59e10ea08b379). [Yerel Nile TVM CI #41032319167](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41032319167) **başarılı**. Loglarda yeni yetki/tek komisyon regresyonlarının geçtiği görüldü. İmzasız gerçek Nile sorgusunda blok **72271937**, Energy fiyatı **100 SUN**, `triggerconstantcontract` **1.501.462 Energy**, `estimateenergy` **1.507.328 Energy**.
- `d5ef0841` başlangıç kaydıyla karşılaştırmada **48 commit, silinen dosya yok**; V8 Solidity ve resmi artifact, eski V6/V7 iade arayüzleri değiştirilmedi. Pages dağıtımının bu test commit'i için tamamlanması ayrıca kontrol edilmeli.
- **YAYIN ENGELİ DEVAM EDİYOR:** V8 gerçek Nile'a dağıtılmadı, gerçek zincirde imzalı takas/iade yok. Kullanıcıdan imza, test TRX veya ekran görüntüsü istenmedi. Sözleşme kurulumu yaklaşık 150 TRX teorik Energy yakımı gerektiriyor; değiştirilebilir TRC20'lerin iadeyi kalıcı engelleyebilme riski sürüyor. Kullanıcıya hazır deme.

## 30 Ekim 2026, 13:20 TRT: kurulum yayın reddi ve belirsiz sonuç koruması

- V8 kurulum sayfasında imzalanmış işlem kimliği yayın öncesinde kaydedilmeye devam ediyor. Nile düğümü `SIGERROR`, `CONTRACT_VALIDATE_ERROR`, `TAPOS_ERROR`, `TRANSACTION_EXPIRATION_ERROR` veya `BANDWIDTH_ERROR` ile **kesin reddettiğinde** bekleyen kayıt temizleniyor, önceki Energy tahmini geçersizleştiriliyor ve yeni ücretsiz tahmin zorunlu kılınıyor.
- `DUP_TRANSACTION_ERROR`, bilinmeyen hata kodu veya yayın sırasında ağ istisnası halinde işlem kimliği korunuyor; aynı sözleşmeyi ikinci kez kurmak yerine zincirde işlem doğrulaması isteniyor. Hiçbir gerçek imza/yayın yapılmadı. `v6-test/secure-ui.test.mjs` regresyonu eklendi.
- Kod commit'i `bf8e7ec43a83d7c63cda01e3fc35f795c5bcf2dc`. [GitHub Actions #41039859908](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41039859908): **120/120 test geçti, 0 hata**; resmi TRON compiler derleme adımı başarılı, imzasız Nile blok **72273182**, Energy fiyatı **100 SUN**. [Pages #41039859721](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41039859721) başarılı. Önceki main `5d919be29123` ile farkta yalnız kurulum sayfası ve regresyon testi değişti, **silinen dosya yok**.
- **Yayın engeli sürüyor:** V8 gerçek Nile ağına dağıtılmadı; imzalı gerçek takas ve iade yok. Yaklaşık 150 TRX teorik kurulum Energy maliyeti ve değiştirilebilir TRC20 iade kilidi riski devam ediyor. Kullanıcıdan cüzdan imzası, TRX veya ekran görüntüsü istenmedi. Hazır ilan etme.

## 30 Ekim 2026, 14:13 TRT: işlem başına yerel TVM Energy ölçümü

- Resmi V8 TRON artifact'iyle çalışan `v8-test/tvm-state.mjs` artık **başarılı** işlemlerin yerel TronNile TVM yürütme Energy aralıklarını ayrı ayrı kaydediyor. Kod commit'i [cf603871](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/commit/cf60387111a40f1a4ec8db41732c09b8a04ac0d5). [Yerel TVM CI #41046456869](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41046456869) **başarılı**.
- Ölçülen aralıklar (Energy, farklı test senaryoları): takas oluşturma **51.392–91.172** (15 örnek), davet/cüzdan güvenlik kaydı **47.786–49.818** (23), TRX yatırımı **47.412–73.286** (14), TRC20 yatırımı **77.621** (1), TRC20 + ayrı TRX komisyon teminatı **97.556–103.682** (5), yönetici son onayı **21.929–45.370** (5), iade **10.419–36.084** (10). İptal **20.976** (1). Başarısız/revert işlemler bu aralıklara dahil değil.
- Gerçek Nile **salt-okunur** blok **72.274.243**, Energy birim fiyatı **100 SUN**; imzasız deploy simülasyonları `triggerconstantcontract` **1.501.462 Energy** ve `estimateenergy` **1.507.328 Energy** verdi. Bunlar gerçek işlem ücretini garanti etmez; kullanılabilir Energy, dinamik kaynaklar, TVM farkları, bandwidth ve token `approve` maliyetleri ayrıca etkiler.
- Bu çalışmada yalnız test kodu ve bu ilerleme kaydı değişti; V8 sözleşmesi, resmi artifact, katılımcı/yönetici sayfaları ve eski V6/V7 iade yolları değiştirilmedi. **Gerçek Nile V8 deploy/takas/iade hâlâ yok; sistem hazır değildir.** Kullanıcıdan imza, test TRX veya ekran görüntüsü istenmedi.

## 30 Ekim 2026, 15:18 TRT: güvenlik kontrollerini kaldırmadan bytecode küçültme deneyi

- Resmi sabitlenmiş `tron-solc 0.8.31` ile V8 kaynak dosyasındaki **38 adet `require` hata açıklamasının** yalnızca deneysel derleme kopyasında kaldırılması veya tek karaktere indirilmesi karşılaştırıldı. Gerçek sözleşme kaynağı, resmi artifact ve yayınlanan katılımcı/yönetici işlemleri **değiştirilmedi**.
- [Yerel TronNile TVM CI #41054243548](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41054243548) başarılı. Mevcut bytecode **7394 bayt / 1.505.683 Energy**; açıklamasız deney **5463 bayt / 1.119.069 Energy** (386.614 Energy, yaklaşık **38,6614 TRX** teorik tasarruf); bütün açıklamaları tek `E` karakteri yapan deney **5678 bayt / 1.162.116 Energy** (343.567 Energy, yaklaşık **34,3567 TRX** teorik tasarruf). Hesap, salt-okunur Nile'da daha önce gözlenen **100 SUN/Energy** varsayımıyladır; **gerçek Nile fatura tahmini değildir**.
- Bu deneyler revert nedenlerini okunamaz hale getirir. Güvenli ve anlaşılır hata mesajlarını korumak için ayrı kısa hata kodları + arayüzde Türkçe açıklama eşlemesi tasarlanmadan resmi artifact değiştirilmeyecek. Deneysel bytecode'un fonksiyonel TVM regresyonları ayrıca koşulmadı; yalnız deploy başarılı oldu. Yüksek kurulum maliyeti sorununa olası yaklaşım olarak kaydedildi.
- [Pages #41054243403](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41054243403) başarılı. **V8 gerçek Nile'a dağıtılmadı, gerçek zincirde takas veya iade yapılmadı; hazır değildir.** Kullanıcıdan imza, TRX ya da ekran görüntüsü istenmedi.


## 30 Ekim 2026, 16:20 TRT: benzersiz hata kimliğini koruyan düşük maliyetli derleme deneyi

- V8'in resmi sabitlenmiş `tron-solc 0.8.31` derleyicisiyle **yalnız deneysel kopyasında** 38 `require` kontrolünün hata nedenleri incelendi. Orijinal sözleşme, yayınlanan artifact, ABI ve V8 arayüzleri **değiştirilmedi**.
- Her kontrol için ayrı iki karakterli revert metni: **7.088 bayt / 1.444.415 yerel TVM Energy**; mevcut sürüm **7.394 bayt / 1.505.683 Energy**. Ayrı metinlerle tasarruf yalnız **61.268 Energy** (~6,1268 TRX).
- Aynı nedenleri tekrarlayan kontrollerde aynı seçiciyi kullanan **benzersiz Solidity custom error** deneyi: **6.013 bayt / 1.229.183 yerel TVM Energy**. Mevcut sürüme göre **276.500 Energy**, Nile'da gözlenen 100 SUN/Energy varsayımıyla teorik **27,65 TRX** kurulum tasarrufu. Her farklı hata nedeninin kimliği korunur; fakat hata seçicilerinin Türkçe UI mesajlarına eşlenmesi ve tam sözleşme regresyonu **henüz yapılmadı**.
- Deneydeki ilk özel hata dönüşümü sözdizimi sorunu düzeltilip tekrar test edildi. [Yerel Nile TVM / resmi derleyici CI #41062159609](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41062159609) **başarılı**; [Pages #41062157871](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41062157871) **başarılı**. Test commit'i `147e7b35c0ff2414b2f11d8c6900f711f4dd2680`.
- Bu ölçümler **yalnız deneysel bytecode'un TVM kurulumu** için geçerlidir; deneysel sözleşmenin yatırma, komisyon, iade ve yönetici son onay akışları ayrıca test edilmeden üretim artifact'i değiştirilmemeli. Ücretler gerçek Nile işlemiyle ölçülmedi.
- **V8 hâlâ Nile'a dağıtılmadı; gerçek zincirde takas ve iade yapılmadı, sistem hazır değil.** Kullanıcıdan imza, TRX veya ekran görüntüsü istenmedi. Sonraki aşama: benzersiz custom error ABI seçicileri için Türkçe UI eşlemesi ve tam yerel TVM regresyonu, ardından imzasız Nile Energy tahmini.

## 30 Ekim 2026, 17:12 TRT: custom error deneyi tam yerel TVM regresyonu

- [Kod commit'i `ee71fe48`](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/commit/ee71fe487bdf41b53cbcb5c61e02c8e54f298288) ile optimizer kıyaslaması artık **benzersiz Solidity custom error** deneysel artifact'ini yalnız GitHub Actions geçici dizinine yazıyor; yayımlanan `contracts/TakasV8Invite.sol`, `v6-test/dist/TakasV8Invite.json`, katılımcı/yönetici UI ve eski iade sayfaları değiştirilmedi.
- [Yerel Nile TVM CI #41069603376](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41069603376) **başarılı**. Resmi sabitlenmiş tron-solc 0.8.31 ile üretilen deneysel 6.013 bayt / 1.229.183 Energy sürümü, yayınlanan 7.394 bayt / 1.505.683 Energy sürümüyle **aynı tam stateful TVM senaryolarından** geçirildi: TRX/TRX takas, TRC20 + ayrı TRX komisyonu, tam zaman sınırları, iade, iki taraf aynı token, giriş/çıkış transfer vergisi, dinamik vergi sonrası iade, davet rol güvenliği, yetkisiz işlemler ve çift komisyon/çift iade reddi. Deneysel sürümde altı immutable manager slotu da eşleşti. Fark **276.500 Energy** (~27,65 TRX teorik, 100 SUN/Energy varsayımıyla); gerçek Nile fatura tahmini değildir.
- Bu deneyde özel hata seçicileri ABI'de bulunuyor; ancak **Türkçe UI hata seçici eşlemesi henüz yok**. Bu nedenle deneysel artifact **yayınlanmadı**. Kullanıcı arayüzü, gerçek Nile RPC ile bu deneysel artifact için imzasız Energy tahmini ve değiştirilebilir TRC20 iade riski ayrıca çözülmeli.
- **YAYIN ENGELİ:** V8 Nile'a dağıtılmadı, gerçek zincirde imzalı takas/iade yapılmadı. Yerel TVM kanıtı gerçek Nile işlemi yerine geçmez. Kullanıcıdan imza, TRX veya ekran görüntüsü istenmedi. Hazır ilan etme.

## 30 Ekim 2026, 18:17 TRT: deneysel custom error için gerçek Nile imzasız maliyet karşılaştırması

- `v8-test/nile-deploy-readonly.mjs` artık resmi sabitlenmiş tron-solc 0.8.31 ile CI'da geçici üretilen **deneysel custom-error artifact'ini** de gerçek Nile RPC'ye salt-okunur gönderiyor; `deployconstantcontract` HTTP 405 verdiği için geçerli `triggerconstantcontract` ve `estimateenergy` yanıtları karşılaştırıldı. Kullanıcı cüzdanı kullanılmadı, işlem imzalanmadı veya yayınlanmadı.
- [V8 yerel TVM + Nile salt-okunur CI #41079083742](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41079083742) **başarılı**. Gerçek Nile blok **72.279.095**, Energy fiyatı **100 SUN**. Deneysel aday: `triggerconstantcontract` **1.224.962 Energy** (122,4962 TRX teorik), `estimateenergy` **1.234.533 Energy** (123,4533 TRX teorik). Mevcut yayımlanmış V8'e kıyasla sırasıyla **276.500** ve **272.795 Energy** düşüş (27,65 / 27,2795 TRX teorik). Bunlar kullanıcının gerçek ücretleri değildir; cüzdan kaynakları, Energy ve bandwidth ayrıca değerlendirilmelidir.
- `v8-test/custom-error-messages.mjs` deneysel adayın **33 farklı Solidity custom error** kimliğini ABI seçicisiyle birebir doğruluyor; her biri için açık Türkçe hata açıklaması sağlıyor. Eşleme **yalnız CI geçici aday artifact'inde** tutuluyor; kullanıcıya yayınlanan sözleşme veya arayüz değiştirilmedi. Aday tam yerel TronNile TVM TRX/TRX, TRC20, komisyon, iade, süre ve rol güvenliği regresyonlarını yeniden geçti.
- Değişiklikler: `b40c3bed`, `7e7d71dd`, `0025e96a`, `37822113`, `558bac0d`. `3a53e296` ile karşılaştırmada **silinen dosya yok**; eski V6/V7 iade akışları, yayımlanan V8 artifact'i ve sözleşme kaynakları değişmedi.
- **YAYIN ENGELİ DEVAM EDİYOR:** Custom-error adayı daha ucuz görünse de henüz üretim artifact'ine geçirilmedi. V8 gerçek Nile ağına kurulmadı, gerçek zincirde imzalı takas/iade yok. Kullanıcıdan cüzdan imzası, test TRX veya ekran görüntüsü istenmedi. Bir sonraki adım: kullanıcıya gösterilen hata kodlarını ve işlem öncesi güvenlik kontrolünü doğrulayan UI regresyonları; gerçek deploy yapılmadan hazır ilan etme.

## 30 Ekim 2026, 19:13 TRT: gerçek yerel TVM revert verisiyle Türkçe hata kimliği regresyonu

- Deneysel (henüz yayımlanmayan) custom-error artifact'i için `v8-test/tvm-state.mjs` içine gerçek `@tvmjs/tvm` yürütmesinden dönen **4 baytlık revert selector** kontrolü eklendi. Yönetici olmayan `create`, geçersiz davet hash'i, geçersiz komisyon tarafı ve komisyon tarafı seçilmeden ücret belirlenmesi ayrı ayrı reddedildi. Her revert verisi `errorSelectorsTr` tablosundaki doğru Türkçe açıklamayla eşleşti; reddedilen çağrılar `nextId` değerini değiştirmedi. Bu, sadece ABI metni eşleşmesi değil, gerçek yerel TVM revert payload testidir.
- Kod commit'i [`ea4c0732`](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/commit/ea4c07328eea83eeeb6852e90a4f50afa869e249). [Yerel TVM / resmi TRON compiler / imzasız Nile maliyet CI #41087665013](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41087665013) **başarılı**; logda `Local Nile TVM candidate custom-error revert payloads and Turkish translations OK.` görüldü. [GitHub Pages #41087663935](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41087663935) **başarılı**. Gerçek Nile salt-okunur blok **72.280.218**, Energy **100 SUN**; aday imzasız `estimateenergy` **1.234.533 Energy** (mevcut sürüme göre **272.795 Energy** daha az). Bunlar kullanıcının kesin maliyeti değildir.
- Başlangıç commit'i `d5ef0841` ile karşılaştırmada **silinen dosya yok**. Yayınlanan Solidity V8 kaynağı, resmi artifact, yönetici/katılımcı arayüzleri ve eski V6/V7 iade yolları bu test değişikliğinde korunmuştur.
- **YAYIN ENGELİ:** V8 gerçek Nile'a kurulmadı, imzalı zincir takası veya iadesi yok. Deneysel daha ucuz artifact henüz yayınlanmadı; UI hata çözümlemesi, güvenlik ve kurulum maliyeti ayrıca doğrulanmalı. Kullanıcıdan cüzdan imzası, TRX veya ekran görüntüsü istenmedi. Hazır ilan etme.


## 30 Ekim 2026, 20:19 TRT: Nile kurulum / kurtarma kod kimliği sertleştirmesi

- V8 kurulum sayfası `takas-kurulum.html` artık kayıtlı sözleşmeyi açarken, yeni kurulumun zincir onayından sonra ve eski kurulum işlem kimliğinden kurtarma sırasında **Nile `wallet/getcontractinfo` çalışma kodunu** resmi TRON compiler artifact'inin `runtimeBytecode` ve `immutableReferences` alanlarıyla karşılaştırıyor. Altı yönetici immutable slotu bağlı cüzdanın 20 baytlık adresiyle birebir eşleşmeli; diğer tüm baytlar da aynı olmalı. Yanlış sözleşme veya cüzdan değişimi doğrulamayı kapatır.
- Kod commitleri `200cd7fb3636233699a5c43087d09e078202a8c4`, regresyon testleri `338e7b6db9bd07589f6d78efa39eac4788815f68`. Test: geçerli runtime kabulü, değiştirilmiş manager slotu reddi, runtime kod bozulması reddi ve cüzdan değişimi reddi.
- [CI #41097515175](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41097515175): **121 test geçti, 0 hata**; resmi tron-solc 0.8.31 sabit blob doğrulandı. Nile salt-okunur blok **72281528**, Energy fiyatı **100 SUN**.
- [Pages #41097514317](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41097514317) başarılı. `d5ef0841` ile güncel `338e7b6d` arasındaki GitHub karşılaştırmasında silinmiş dosya yok. Sözleşme bytecode/artifact bu çalışmada değiştirilmedi.
- **YAYIN ENGELİ DEVAM EDİYOR:** V8 gerçek Nile ağına kurulmadı; zincirde gerçek takas ve iade testi yok. Salt-okunur sorgular ve yerel TVM testleri bunu kanıtlamaz. Kullanıcıdan imza, test TRX veya ekran görüntüsü istenmedi. Gerçek Nile doğrulaması olmadan hazır denmeyecek.

## 30 Ekim 2026: token/ayrı TRX komisyonu önizleme düzeltmesi

- Katılımcı önizlemesi TRC20 token miktarından sabit TRX komisyonunu düşmüyor; token miktarını tam gösterip ayrı iade edilebilir TRX teminatını açıkça yazıyor. 30 token + 50 TRX komisyon gibi geçerli senaryolar, TRX miktarı 30 olduğunda uygulanacak red kuralıyla karıştırılmıyor. Ondalık sayısı token sözleşmesinden işlem öncesi okunur; önizleme herhangi bir token için yanlışlıkla 6 ondalık dayatmaz.
- Güvenlik regresyonu eklendi: 30 token / 50 TRX, 18 ondalıklı token gösterimi ve 30 TRX / 50 TRX reddi. Sözleşme, resmi artifact ve eski V6/V7 iade sayfaları değiştirilmedi.
- **Gerçek Nile V8 kurulumu ve gerçek takas/iade yapılmadı; sistem hazır değildir.** CI/Pages sonucu ayrı doğrulanmadan başarı bildirilmez.

## 30 Ekim 2026, 22:20 TRT: özel davet bağlantısı kaybına karşı çift oluşturma koruması

- Yönetici aynı zincir `nextId` numarası için daha önce kaydedilmiş özel A/B davet anahtarları varken yeniden `create` işlemi imzalayamaz. Bu, başarısı henüz bilinmeyen ilk işlemin ardından ikinci denemenin aynı yerel kaydı farklı sırlarla ezmesini ve önceki davet bağlantılarının kaybolmasını önler. `saveInvite` mevcut kaydı farklı sırlarla ezmeye karşı ayrıca korumalıdır. Hatalı/yarım kalmış kayıt varsa **imza göndermeden durur**; böyle bir durumda önceki işlemin zincir sonucu incelenmelidir.
- Kod commitleri `ecd1df60`, `2a477ce2`, regresyon testi `539ebb17`. [GitHub Actions #41114338466](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41114338466) **123/123 test başarılı**, 0 hata; sabitlenmiş resmi TRON compiler indirme ve artifact doğrulama adımları başarılı. Salt-okunur Nile blok **72.283.965**, Energy fiyatı **100 SUN**. [Pages #41114338792](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41114338792) başarılı.
- `d5ef0841` ile `main` karşılaştırmasında silinen dosya bulunmadı. Solidity V8 sözleşmesi, resmi bytecode artifact'i ve eski V6/V7 iade sayfaları değiştirilmedi. Önceki [yerel TronNile TVM #41087665013](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41087665013) başarılı; bu değişiklik yalnız V8 UI'dadır.
- **YAYIN ENGELİ SÜRÜYOR:** V8 Nile'a gerçek kurulum yapılmadı; zincirde gerçek takas, son onay veya iade kanıtı yok. ~150 TRX teorik kurulum maliyeti ve değiştirilebilir TRC20 iade kilidi riski çözülmedi. Kullanıcıdan imza, TRX veya ekran görüntüsü istenmedi. Hazır ilan etme.


## 30 Ekim 2026, 23:18 TRT: A/B ve yönetici için salt-okunur otomatik durum yenileme

- Katılımcı sayfası `takas-katilimci.html`, geçerli güvenli V8 davetinde 20 saniyede bir takas durumunu salt-okunur sorguluyor; A/B'nin diğer tarafın yatırımı veya yönetici onayı için tekrar tekrar durum düğmesine basması gerekmiyor. Sekme görünür değilse veya işlem sürüyorsa otomatik kontrol yapılmıyor. Geçici RPC hatasında son doğrulanmış durum korunuyor.
- Yönetici sayfası `takas-yonetici.html`, geçerli takas numarası seçiliyken 20 saniyede bir zincirden yatırım ve son onay süresini yeniliyor; otomatik sorgu hiçbir imza veya `finalize` çağrısı yapmıyor.
- Komisyonu ödemeyen tarafın panelinden diğer tarafın sabit TRX komisyon tutarı kaldırıldı; yalnız ödeyen taraf tutarı ve kesinti/teminat açıklamasını görüyor.
- `v6-test/secure-ui.test.mjs` içine iki regresyon eklendi: katılımcının otomatik okuma ve ücret gizliliği; yöneticinin otomatik salt-okuma kontrolü. Değişiklik commit'leri: `89320b0a`, `252fdc7d`, `19850a8d`. İki sayfanın inline JavaScript sözdizimi ayrıca kontrol edildi.
- Bu kaydın yazıldığı anda GitHub Actions test `41122160060` ve Pages `41122159924` **queued** durumundaydı; tamamlanmış gibi gösterilmemeli. Sözleşme, resmi compiler artifact, eski V6/V7 iade akışları değiştirilmedi.
- **Yayın engeli değişmedi:** V8 Nile'a kurulmadı, gerçek zincirde imzalı takas veya iade yapılmadı. Gerçek Nile deploy olmadan sistem hazır değildir; kullanıcıdan cüzdan imzası, TRX veya ekran görüntüsü istenmedi.
