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

## 31 Ekim 2026, 00:15 TRT: bekleyen kurulum kimliği kurtarma koruması

- V8 kurulum doğrulamasında bekleyen bir sözleşme kurulum işlem kimliği kayıtlıysa farklı bir işlem kimliğiyle doğrulama denemesi RPC çağrısından önce reddedilir. Önceden alakasız, başarısız bir Nile işlemi sorgulanarak gerçek bekleyen kurulum kaydı silinebiliyordu; bu durum belirsiz yayının ardından yanlışlıkla ikinci kurulum riskini artırıyordu. Artık yalnız aynı bekleyen işlem kimliğinin kesin başarısızlığı kaydı temizleyebilir.
- Düzeltme commit'i 07ba32ee, davranış regresyon testi a5122a47. Test, farklı başarısız işlemde bekleyen kaydın korunmasını ve aynı bekleyen işlem kesin başarısızsa temizlenebilmesini yürütülerek doğruluyor.
- GitHub Actions https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41129403241 başarılı: 126 test geçti, 0 hata. Resmi SHA sabitlenmiş tron-solc 0.8.31 indirildi, V8 artifact yeniden üretildi; Nile salt-okunur blok 72.286.237, Energy fiyatı 100 SUN. GitHub Pages https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41129402817 başarılı.
- d5ef0841 ile son test commit'i arasındaki GitHub karşılaştırmasında silinen dosya yok. Sözleşme kaynağı, yayımlanan V8 bytecode ve eski V6/V7 iade yolları değiştirilmedi.
- Açık güvenlik riski: GitHub Pages'teki aynı origin altında başka sayfalardan localStorage okunabilir. Davet sırlarının bu origin üzerinde kalıcı düz metin tutulması, origin'de zararlı JavaScript bulunması halinde gizlilik garantisi vermez. Bağımsız alan adı veya güvenli sır saklama yaklaşımı değerlendirilmeden gerçek varlıklar için yeterli güvenlik iddia edilmemeli.
- YAYIN ENGELİ: V8 gerçek Nile'a kurulmadı; gerçek zincirde takas, son onay veya iade yapılmadı. Bu koşulda hazır ilan edilmez. Kullanıcıdan imza, test TRX veya ekran görüntüsü istenmedi.


## 31 Ekim 2026, 01:26 TRT: cüzdan değiştirme yarış koşulu ve token ondalık sınırı

- V8 kurulumda bekleyen sözleşme işlemini doğrularken TronLink cüzdanı HTTP sorgusu sırasında değiştirilirse doğrulama imzasız durur; önceki cüzdanın ve yeni cüzdanın bekleyen işlem kayıtları korunur. Başarısız işlem kaydı yalnız başta seçilen cüzdanın sabit anahtarından temizlenebilir. Kurulum yayınında da bekleyen işlem anahtarı ilk yönetici cüzdanına sabitlendi; asenkron yayın sırasında cüzdan değişimi başka cüzdanın kaydını silemez. Son düğme durumu da güncel cüzdanın Energy tahminiyle hesaplanır.
- Yönetici takas durumunda rastgele TRC20'nin aşırı büyük `decimals()` değeri BigInt üs hesabıyla paneli kilitleyemez: 0–30 dışında ham token birimi güvenle gösterilir. Normal 18 ondalıklı token gösterimi korunur.
- Kod commitleri `23263d1d`, `eb1729b9`, `bf4c806d`, `c6e4fe41`, `e6fe0b99`, `160260a8`. Cüzdan değişimi sırasında bekleyen işlem koruması ve kötü niyetli token ondalıkları için yürütülen regresyon testleri eklendi.
- [GitHub Actions #41137947955](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41137947955) **128 test başarılı, 0 hata**; sabit SHA ile resmi tron-solc 0.8.31 indirilip artifact yeniden üretildi. Ganache isteğe bağlı uWS native modül uyarısı testleri engellemedi. Salt-okunur gerçek Nile blok **72.287.661**, Energy fiyatı **100 SUN**. [GitHub Pages #41137948254](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41137948254) başarılı. `958f2c72` ile `160260a8` arasındaki GitHub karşılaştırmasında silinen dosya yok.
- V8 Solidity kaynak sözleşmesi, resmi artifact ve eski V6/V7 iade sayfaları değiştirilmedi. **V8 gerçek Nile'a kurulmadı; gerçek zincir takası ve iadesi yapılmadı, hazır değildir.** Kullanıcıdan cüzdan imzası, test TRX veya ekran görüntüsü istenmedi. Sonraki çalışmada maliyet düşüren deneysel custom-error artifact'inin UI hata eşlemesini ve imzasız kurulum maliyetini doğrulamaya devam et.

## 31 Ekim 2026, 02:23 TRT: Energy tahmini ve kurulum kurtarmada iki cüzdan yarış koşulu giderildi

- V8 kurulum sayfasındaki **imzasız Energy maliyet tahmini** artık ilk seçilen yönetici cüzdanına sabitleniyor. getaccountresource, derleyici/simülasyon ve bakiye RPC sorguları sırasında TronLink A'dan B'ye geçerse A'nın Energy kaynakları B'nin kurulum tahmini olarak kaydedilmiyor; kurulum imzası kapalı kalıyor.
- Kurulum işlem kimliğinden kurtarmada gettransactioninfobyid sonrası ikinci gettransactionbyid RPC'si sırasında cüzdan değişirse doğrulama duruyor. İşlem sahibi, sözleşme yöneticisi, immutable runtime ve kalıcı kayıtlar ilk cüzdana bağlı; diğer cüzdanın bekleyen işlemi veya kayıtlı sözleşmesi değiştirilmiyor.
- Kod: 530edceb, 13e099a6; iki yürütülen cüzdan değişimi regresyonu ve mevcut statik kontrollerin güncellenmesi: 4e87329a, 3973933a, 9d42dc2e.
- [GitHub Actions #41144049934](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41144049934) **130/130 test başarılı**, 0 hata. Resmi sabitlenmiş TRON derleyicisi indirildi ve V8 artifact yeniden üretildi. Nile salt-okunur blok **72.288.789**, Energy fiyatı **100 SUN**; hiçbir işlem imzalanmadı veya yayınlanmadı.
- [GitHub Pages #41144048999](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41144048999) başarılı. dcda114f ile 9d42dc2e karşılaştırmasında yalnız takas-kurulum.html ve v6-test/secure-ui.test.mjs değişti; silinen dosya yok. V8 Solidity kaynağı, resmi artifact bytecode'u, eski V6/V7 iade sayfaları değiştirilmedi.
- **YAYIN ENGELİ:** V8 hâlâ gerçek Nile'a kurulmadı, zincirde gerçek takas/finalize/iade yok. Yerel testler ve imzasız RPC gerçek dağıtım yerine geçmez; sistem hazır değildir. Kullanıcıdan imza, TRX veya ekran görüntüsü istenmedi.


## 31 Ekim 2026, 03:22 TRT: imza sırasında değişen miktar/komisyon önlendi

- V8 katılımcı arayüzünde `Onayla ve yatır` işlemi boyunca varlık türü, token adresi ve miktar alanları geçici olarak kilitleniyor. Yönetici yeni takas oluştururken komisyon tarafı/tutarı, son onay verirken takas numarası aynı şekilde kilitleniyor. Böylece TronLink imzası beklenirken ekrandaki tutar değiştirilip farklı bir önceki tutarın imzalanmasıyla oluşabilecek kullanıcı yanılgısı önleniyor.
- Önceden devre dışı olan alanların durumu işlem sonrasında aynen geri yükleniyor; hata veya cüzdan reddi de alanları yeniden açıyor. İki yürütülen regresyon testi eklendi.
- Kod commit'leri `26c57c13`, `e79a7d49`; test commit'i `d0ac68bb`. [GitHub Actions #41149580183](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41149580183): **132/132 test başarılı, 0 hata**; sabitlenmiş resmi TRON compiler ile artifact derlemesi başarılı. Salt-okunur Nile blok **72.289.959**, Energy fiyatı **100 SUN**. [GitHub Pages #41149580365](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41149580365) başarılı.
- `20f8cc22` ile `d0ac68bb` arasındaki karşılaştırmada yalnız V8 katılımcı/yönetici arayüzleri ve regresyon testleri değişti, **silinen dosya yok**. V8 Solidity, resmi artifact ve eski V6/V7 iade akışları değiştirilmedi.
- **YAYIN ENGELİ:** V8 hâlâ gerçek Nile'a dağıtılmadı, gerçek zincir takası/finalize/iade kanıtı yok. Yerel testler gerçek zincir doğrulaması değildir; hazır ilan etme. Kullanıcıdan imza, TRX veya ekran görüntüsü istenmedi.


## 31 Ekim 2026, 04:15 TRT: yönetici salt-okunur yenileme yarış koşulu

- `takas-yonetici.html` üzerindeki otomatik durum sorgusu, yönetici takas numarasını değiştirirken geç tamamlanırsa eski takasın A/B özel davet bağlantılarını veya detaylarını yeni seçim üzerine yazabiliyordu. Eski seçimin yanıtı artık yok sayılıyor; numara değiştiğinde önceki bağlantılar temizleniyor. Yeni takas oluşturma sonunda oluşturulan davetler normal biçimde gösterilmeye devam ediyor.
- İki yeni **yürütülen asenkron regresyon** eklendi: geciken davet sorgusunda yeni takas numarası ve boş bağlantıların korunması; geciken Nile blok sorgusunda eski takas detaylarının gösterilmemesi. Kod commit'i `727a529a`, test commit'i `50a6cfc4`.
- [GitHub Actions test #41154343633](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41154343633) **134/134 başarılı**, 0 hata; sabit SHA'lı resmi tron-solc 0.8.31 indirildi ve artifact derlemesi doğrulandı. Salt-okunur Nile blok **72.291.026**, Energy fiyatı **100 SUN**. [GitHub Pages #41154343542](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41154343542) başarılı.
- `78191abb` ile `50a6cfc4` karşılaştırmasında yalnız yönetici HTML ve UI regresyon testleri değişti; silinen dosya yok. Solidity V8 kaynak, resmi artifact ve eski V6/V7 iade yolları değiştirilmedi.
- **YAYIN ENGELİ:** V8 henüz gerçek Nile'a kurulmadı; gerçek zincirde yatırım, yönetici finalize veya iade yapılmadı. Yerel TVM/CI ve salt-okunur RPC, gerçek takas kanıtı değildir. Kullanıcıdan imza, TRX veya ekran görüntüsü istenmedi; hazır ilan edilmez.

## 31 Ekim 2026, 05:13 TRT: yönetici imza reddi sonrası güvenli yeniden deneme

- V8 yöneticisi takas oluşturma imzasını TronLink'te **açıkça reddederse** (ör. kod 4001), henüz zincir işlem kimliği oluşmamışsa bu denemeye ait yeni davet sırları tarayıcı kaydından güvenli biçimde temizleniyor; önceki takasın kayıtlı davet dizini korunuyor. Böylece reddedilen bir imza, aynı takas numarasıyla sonraki denemeyi kalıcı olarak engellemiyor.
- İşlem kimliği alındıktan sonra Nile receipt sorgusu başarısız olur veya sonucu belirsiz kalırsa **iki özel davet sırrı saklanıyor ve ikinci imza engelleniyor**. İmza reddi dışındaki belirsiz hatalarda da anahtarlar silinmiyor; yayınlanmış olabilecek bir işlemin davetlerinin kaybolması önleniyor.
- takas-common.js yayın kimliğini receipt beklemesinden önce çağırana bildiriyor; takas-yonetici.html yalnız kesin reddedilen imzada kaydı geri alıyor. İki yeni yürütülen regresyon testi eklendi. Kod commitleri: 28f67cd1, 1efb5fdf; test commit'i f8e8682f.
- [GitHub Actions test #41158869171](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41158869171): **136/136 test geçti, 0 hata**. Sabit SHA ile resmi tron-solc 0.8.31 indirildi, artifact yeniden üretildi. Salt-okunur Nile blok **72.292.176**, Energy fiyatı **100 SUN**. Ganache'nin opsiyonel uWS ikili uyarısı test başarısını etkilemedi.
- [GitHub Pages #41158868794](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41158868794) başarılı. a170061c ile f8e8682f arasında yalnız V8 ortak JS, yönetici HTML ve UI regresyon testleri değişti; **silinen dosya yok**. Solidity sözleşmesi, resmi V8 artifact ve eski V6/V7 iade sayfaları değiştirilmedi.
- **YAYIN ENGELİ:** V8 gerçek Nile ağına kurulmadı, gerçek zincirde takas/finalize/iade yapılmadı. Yerel test, CI, Pages ve imzasız RPC sonucu uçtan uca doğrulama değildir. Kullanıcıdan imza, test TRX veya ekran görüntüsü istenmedi; hazır ilan edilmez.

## 31 Ekim 2026, 06:19 TRT: yönetici cüzdanı değişirken davet sızıntısı önlendi

- Yönetici paneli bir takasın özel A/B davet bağlantılarını zincirden doğrularken TronLink hesabı değişirse eski cüzdanın bağlantıları yeni cüzdan ekranına yazılmıyor. Gösterilmiş davetlerin kopyalanması da yalnız bağlantıları doğrulayan aynı cüzdana izin veriyor; cüzdan farklıysa iki bağlantı alanı temizleniyor.
- Yönetici salt-okunur takas durumu sorgusu sırasında cüzdan değişirse önceki cüzdanın miktar ve yatırım ayrıntıları yeni cüzdan ekranına yazılmıyor. Takas oluşturma sonrasında bağlantı kurtarma öncesinde de cüzdan tekrar kontrol ediliyor.
- Kod commit'i `d79c72bc`, üç yürütülen asenkron regresyon testi commit'i `5dae5c84`.
- [GitHub Actions test #41163721640](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41163721640) **139/139 başarılı, 0 hata**; sabit SHA ile resmi tron-solc 0.8.31 indirildi ve artifact derlemesi tamamlandı. Salt-okunur Nile blok **72.293.483**, Energy fiyatı **100 SUN**. [GitHub Pages #41163721572](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41163721572) başarılı.
- `d5ef0841` ile `5dae5c84` arasındaki GitHub karşılaştırmasında silinen dosya yok. Solidity sözleşmesi, yayımlanan V8 bytecode ve eski V6/V7 iade akışları değiştirilmedi.
- **YAYIN ENGELİ:** V8 hâlâ gerçek Nile'a kurulmadı, gerçek zincirde takas, yönetici finalize veya iade doğrulanmadı. CI/Pages/yerel TVM, gerçek zincir işleminin yerine geçmez. Kullanıcıdan cüzdan imzası, test TRX veya ekran görüntüsü istenmedi; hazır ilan edilmez.


## 31 Ekim 2026, 08:16 TRT: V8 kurulumda cüzdan değişimi / kayıt sızıntısı kontrolü

- `takas-kurulum.html` içindeki salt-okunur `prepare()` işlemi baştaki yönetici cüzdanına sabitlendi. Resmi derleme indirilirken, kayıtlı sözleşmenin sürümü/yöneticisi okunurken veya runtime doğrulanırken TronLink cüzdanı değişirse eski cüzdanın sözleşme bağlantısı yeni cüzdan ekranına yazılmıyor. Daha önce gösterilen kurulum adresi/bağlantısı yeni kontrol başında gizleniyor.
- Bekleyen kurulum işlem kimliği ve kurulu sözleşme kaydı yalnız başlangıçta seçilen cüzdanın anahtarından okunuyor. Önceki cüzdanın Energy tahmini, başka cüzdanın kurulum düğmesini görünüşte etkinleştiremiyor; `estimateFresh()` kullanılıyor. İmza veya işlem yayını yapılmadı.
- Kod commit'i `f1905af2`; üç yeni yürütülen regresyon ve güncellenen eski statik beklentiler: `028eb801`, `01b75651`. İlk test CI'si eski iki statik metin beklentisi nedeniyle başarısız oldu; beklentiler yeni cüzdan sabitleme mantığına göre düzeltildi.
- [GitHub Actions #41171811987](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41171811987): **142/142 test başarılı, 0 hata**; sabit SHA'lı resmi TRON derleyicisi/artifact üretimi tamamlandı. Nile salt-okunur blok **72.295.819**, Energy fiyatı **100 SUN**. [GitHub Pages #41171811661](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41171811661) başarılı.
- `95f10acf` ile `01b75651` karşılaştırmasında yalnız kurulum HTML'i ve UI test dosyası değişti; **silinen dosya yok**. `d5ef0841` temel sürümüne göre de silinen dosya yok. V8 Solidity sözleşmesi, resmi bytecode ve eski V6/V7 iade sayfaları değiştirilmedi.
- **YAYIN ENGELİ:** V8 hâlâ gerçek Nile'a kurulmadı; gerçek zincirde takas, finalize veya iade yapılmadı. Değiştirilebilir TRC20 tokenların iade kilidi riski ve yaklaşık 150 TRX'lik imzasız kurulum Energy tahmini sürüyor. Kullanıcıdan imza, TRX veya ekran görüntüsü istenmedi; sistem hazır değildir.


## 31 Ekim 2026, 09:20 TRT: kurulum Energy tahmininin resmi artifact'e sabitlenmesi

- V8 Nile kurulum sayfasında ücretsiz Energy tahmini artık **seçili cüzdan + beş dakikalık süre + birebir resmi bytecode** ile eşleştiriliyor. Resmi artifact tahmin ile kurulum arasında değişirse eski maliyet tahmini kullanılarak işlem imzalanması engelleniyor; yeniden ücretsiz tahmin gerekiyor.
- Eşzamanlı Nile getchainparameters / getaccountresource okumaları sırasında başka bir prepare() çağrısı resmi derlemeyi değiştirirse de tahmin iptal ediliyor. HTTP Energy tahmini ve TronWeb deployConstantContract isteği, işlem başında yakalanan aynı bytecode'a sabitlendi.
- Kod commit'leri: bd2e6642, e4dc6008. Regresyon test commit'leri: 092f9f57, 35225e80. Önceki beş dakikalık ve cüzdan değiştirme testleri yeni bytecode bağına göre güncellendi; üç yeni yürütülebilir regresyon eklendi.
- [Pages #41176148023](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41176148023) **başarılı**. [Yerel test CI #41176148563](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41176148563) bu kaydın yazıldığı anda **bekliyor**; başarılı test sayısı henüz iddia edilemez. 5d198f6d..35225e80 karşılaştırmasında yalnız kurulum HTML ve güvenli UI testleri değişti, silinen dosya yok. Solidity V8, resmi artifact ve eski V6/V7 iade sayfaları değiştirilmedi.
- **YAYIN ENGELİ:** Gerçek Nile V8 deploy, iki taraf yatırımı, finalize ve iade kanıtı yok. Kullanıcıdan imza veya TRX istenmedi. Sistem hazır ilan edilmez.


## 31 Ekim 2026: Energy tahmini regresyonu / CI doğrulaması

- Önceki kurulum güvenliği değişikliği, ücretsiz Nile Energy simülasyonunda `artifact.bytecode` yerine işlem başında yakalanan `estimateBytecode` değerini kullanmaya başladı. Buna rağmen `v6-test/secure-ui.test.mjs` içindeki statik beklenti eski ifadeyi aradığı için [CI #41176148563](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41176148563) **144 geçti / 1 başarısız** sonucunu verdi. Hata üretim kodunda değil, güncellenmemiş test beklentisindeydi.
- Regresyon beklentisi yakalanan resmi bytecode'u ve aynı bytecode'un imzasız simülasyona gönderildiğini doğrulayacak şekilde güncellendi. Test düzeltme commit'i `b256c45a8279b31ce2280d25bb8f24a88fd469c1`.
- [GitHub Actions #41180065461](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41180065461) **145/145 test başarılı, 0 hata**; resmi `tron-solc 0.8.31` derleyicisi sabit SHA ile indirildi, artifact yeniden üretildi. İmzasız Nile RPC kontrolü: blok **72.298.281**, Energy fiyatı **100 SUN**.
- [GitHub Pages #41180064905](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41180064905) başarılı. `d5ef0841` tabanından güncel `main` karşılaştırmasında **silinen dosya yok**; bu düzeltme yalnız UI regresyon testini değiştirdi. V8 Solidity, yayımlanan bytecode ve eski V6/V7 iade akışlarına dokunulmadı.
- **YAYIN ENGELİ DEVAM EDİYOR:** V8 Nile'a gerçek olarak kurulmadı; gerçek Nile üzerinde A/B yatırımı, yönetici son onayı veya iade yapılmadı. Yerel/CI testleri, Pages ve salt-okunur RPC gerçek takas kanıtı değildir. Kullanıcıdan imza, test TRX veya ekran görüntüsü istenmedi. **Hazır değildir.**

## 31 Ekim 2026, 11:15 TRT: başarısız Nile işlemlerinin anlaşılır hata açıklaması

- `takas-common.js` artık **yalnız başarısız** Nile işlem makbuzlarında geçerli, boyutu sınırlanmış ABI `Error(string)` revert verisini okuyup bilinen komisyon, davet, süre, token ve iade hatalarını Türkçe gösteriyor. Bozuk/verisiz revert yanıtında önceki güvenli `REVERT` mesajı korunuyor; hiçbir başarısız işlem başarılı sayılmıyor.
- Gelecekteki daha ucuz custom-error adayı için, **ancak resmi artifact'in çalışma kodu Nile'daki sözleşmeyle doğrulandıktan sonra**, artifact içindeki `errorSelectorsTr` açıklaması kullanılabilecek şekilde ön hazırlık yapıldı. Deneysel sözleşme **yayınlanmadı**.
- 4 yeni yürütülen regresyon: 50 TRX komisyon revert açıklaması, doğrulanmış aday seçicisi, bozuk revert payload'ının güvenli reddi ve başarılı makbuzun değişmeden kabulü. Kod/test commit'leri `7d5eb83c`, `be8d93d5`, `e86fc47a`, `e87a39e6`.
- [GitHub Actions #41183689059](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41183689059): **149/149 test geçti**, resmi sabit SHA'lı tron-solc 0.8.31 artifact üretimi başarılı; imzasız Nile blok **72.299.376**, Energy fiyatı **100 SUN**. [GitHub Pages #41183688972](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41183688972) başarılı.
- `9af129a8` → `e87a39e6` karşılaştırmasında yalnız ortak V8 JS ve UI testleri değişti; **silinen dosya yok**. Solidity V8, resmi artifact, eski V6/V7 iade sayfaları değiştirilmedi.
- **YAYIN ENGELİ:** V8 gerçek Nile'a kurulmadı; gerçek zincirde A/B yatırımı, yönetici son onayı ve iade kanıtı yok. Yerel testler, CI ve Pages bunun yerine geçmez. Kullanıcıdan imza, TRX veya ekran görüntüsü istenmedi; **hazır değildir**.


## 31 Ekim 2026, 12:21 TRT: Nile receipt RPC kesintilerinde ikinci imzayı önleme

- V8 ortak `waitTx` fonksiyonu, `getTransactionInfo` çağrısındaki **geçici Nile RPC hatasını** zincirde başarısız işlem gibi değerlendirmek yerine **aynı işlem kimliğiyle** sorgulamayı sürdürüyor. Kesin `REVERT` veya başka başarısız makbuz hâlâ hata veriyor; başarı yalnız `SUCCESS` makbuzuyla kabul ediliyor.
- Bütün denemelerde RPC başarısızsa mesaj, **işlem kimliğini ve yeniden imzalamama uyarısını** içeriyor. Böylece katılımcı ve yöneticinin aynı işlemi tekrar imzalayarak masraf yapma riski azaltılıyor.
- Kod commit'i `e20ca52514c4cdd8fdcecf2e5856059b14a2691b`; üç yürütülebilir regresyon testi `13ca32c43590276f445ebb204860bdaad3295d32`.
- [GitHub Actions test #41188197178](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41188197178) **152/152 başarılı, 0 hata**; resmi sabit SHA'lı TRON derleyicisi ve artifact üretimi başarılı. [GitHub Pages #41188197051](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41188197051) başarılı.
- `2584b24f` → `13ca32c4` GitHub karşılaştırmasında yalnız V8 ortak JS ve UI testleri değişti; silinen dosya yok. Solidity V8 sözleşmesi, yayımlanan artifact ve eski V6/V7 iade akışları değiştirilmedi.
- **YAYIN ENGELİ DEVAM EDİYOR:** V8 gerçek Nile'a kurulmadı, gerçek A/B yatırımı, yönetici finalize ve iade kanıtı yok. Yerel TVM/CI ve Pages uçtan uca Nile takası değildir. Kullanıcıdan imza, TRX veya ekran görüntüsü istenmedi; **hazır değildir**.

## 31 Ekim 2026, 13:15 TRT: Nile commitment sonrası salt-okunur RPC dayanıklılığı

- V8 `takas-common.js` içindeki `waitNextBlock`, başarılı `commitRole` işleminden sonra `getTransactionInfo` veya `getCurrentBlock` çağrısı geçici Nile RPC hatası verirse **aynı işlem kimliğini** ve sonraki bloğu tekrar sorgular. İkinci cüzdan imzası, ek commitment veya deposit göndermez. Blok yüksekliği hâlâ doğrulanamazsa yatırım imzalamadan durur ve orijinal commitment işlem kimliğini gösterir. Kesin başarısız commitment makbuzu reddedilir.
- Kod commit'i `97fa5d400cfea9fa04382a23ffe240a962f3fb18`; dört yeni yürütülebilir regresyon testi commit'i `084764eaef26a3cbd80d69790f1241ca80d4b66c`.
- [GitHub Actions test #41191924819](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41191924819): **156/156 test başarılı, 0 hata**; sabit Git blob SHA ile resmi tron-solc 0.8.31 indirildi, V8 artifact yeniden üretildi. Salt-okunur Nile blok **72.301.800**, Energy fiyatı **100 SUN**.
- [GitHub Pages #41191924400](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41191924400) başarılı. Önceki `92283151` commit'i ile `084764ea` karşılaştırmasında yalnız ortak V8 JS ve güvenli UI testleri değişti, **silinen dosya yok**. V8 Solidity sözleşmesi, resmi bytecode ve eski V6/V7 iade arayüzleri değiştirilmedi.
- **YAYIN ENGELİ SÜRÜYOR:** V8 gerçek Nile'a kurulmadı; gerçek Nile A/B yatırımı, yönetici finalize veya iade kanıtı yok. CI, yerel TVM ve Pages gerçek zincir takası yerine geçmez. Kullanıcıdan cüzdan imzası, TRX veya ekran görüntüsü istenmedi. **Hazır değildir.**


## 31 Ekim 2026, 14:18 TRT: uint256 sınırı ve imza öncesi güvenlik

- V8 ortak miktar dönüştürücüsü `units()`, TRX/token miktarları ve yönetici sabit komisyonu `uint256` üst sınırını aşarsa **TronLink imzasından önce** açık hata verir. Önceki davranış çok büyük miktarları JavaScript `BigInt` olarak kabul edip sözleşme ABI kodlamasında/revert sırasında gereksiz masraf veya karışıklık oluşturabilirdi. Değişiklik yalnız `takas-common.js` içindedir; sözleşme ve resmi artifact değiştirilmedi.
- İki yeni yürütülebilir regresyon: aşırı büyük A yatırımı için commitment/deposit imzası gönderilmez; aşırı büyük yönetici komisyonunda create imzası ve yetim davet kaydı oluşmaz. Kod `b5251655e1e5db931c559cda24b3e60bb3a197e4`, test `bdd476afe0cb8a1fc485fbd411dd883242b5b9a5`.
- [GitHub Actions #41196148497](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41196148497): **158/158 test başarılı, 0 hata**. Resmi sabit SHA'lı tron-solc 0.8.31 derlemesi ve artifact üretimi başarılı. İmzasız Nile kontrolü: blok **72.303.034**, Energy fiyatı **100 SUN**.
- [Pages #41196148242](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41196148242) bu kaydın yazıldığı sırada **beklemede**; yeni yayın başarıyla tamamlandı iddiası yok. Önceki [Pages #41192043984](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41192043984) başarılıydı. `c7c0ec13` → `bdd476af` karşılaştırmasında yalnız iki dosya değişti, **silinen dosya yok**. Eski V6/V7 iade yolları korunuyor.
- **YAYIN ENGELİ:** V8 gerçek Nile'a dağıtılmadı; gerçek A/B yatırımı, yönetici son onayı ve iade kanıtı yok. Yerel testler ve Pages zincir kanıtı değildir. Kullanıcıdan imza, TRX veya ekran görüntüsü istenmedi; **hazır değildir**. Sonraki çalışmada yeni Pages sonucunu ve gerçek TVM/kurulum güvenliğini denetle.

## 31 Ekim 2026, 15:21 TRT: imza öncesi ikinci bakiye ve token izni doğrulaması

- Katılımcı sayfasında ilk TRX/token bakiye ve allowance kontrolü korunurken, token izni veya commitRole işlemi sonrasında yatırım imzasından hemen önce seçili cüzdanın güncel TRX bakiyesi tekrar okunur. TRC20 için token bakiyesi ve sözleşme izni (allowance) yeniden okunur. Bu değerler işlem aralarında düşmüşse deposit gönderilmez; daha önce başarıyla yapılmış güvenlik kaydı veya token izni tekrarlanmaz.
- Üç yeni yürütülebilir regresyon: commitment sonrası TRX yetersizliği, token bakiyesinin azalması ve token allowance düşmesi. Kod/test tek atomik commit ac9d706b7d702cf4fd45000a7dd3d492a34f8dad; yalnız takas-katilimci.html ve v6-test/secure-ui.test.mjs değişti, silinen dosya yok. Solidity V8, resmi bytecode ve eski V6/V7 iade yolları değiştirilmedi.
- [GitHub Actions #41200620299](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41200620299): 161/161 test başarılı, 0 hata; sabit SHA'lı resmi TRON derleyicisi indirildi, artifact yeniden üretildi. Salt-okunur Nile blok 72.304.302, Energy fiyatı 100 SUN. [GitHub Pages #41200619855](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41200619855) başarılı.
- Bu ek kontroller, imza sonrası başka bir cüzdan işlemi veya ağdaki durum değişikliklerine karşı kesin garanti değildir; ancak bilinen yetersiz bakiye/izin durumunda gereksiz deposit imzasını engeller.
- YAYIN ENGELİ: V8 gerçek Nile ağına hâlâ dağıtılmadı; A/B gerçek yatırımı, yönetici son onayı ve iade zincirde doğrulanmadı. Kullanıcıdan imza, TRX veya ekran görüntüsü istenmedi. Sistem hazır değildir.

## 31 Ekim 2026, 16:22 TRT: kesinleşmiş başarısız takas oluşturma işleminin güvenli kurtarılması

- Yönetici V8 arayüzünde `create` işlemi zincirde kesin olarak `REVERT` veya başka terminal başarısızlıkla sonuçlanırsa `nextId` ilerlemez. Önceki uygulama davet anahtarlarını korumak için aynı numarada yeni takas oluşturmayı kalıcı olarak engelliyordu.
- `takas-yonetici.html` artık imzalı işlem yayınından dönen tx hash'ini davet anahtarlarından ayrı ve aynı yönetici cüzdanı/takas numarasına bağlı saklar. **Yalnızca ilgili hash'in Nile receipt sonucu kesin başarısızsa, takas numarası değişmemişse ve kayıt başka bir işlem tarafından değiştirilmemişse** eski davet kaydı temizlenerek yeniden oluşturma açılır. Başarılı, belirsiz veya RPC erişilemeyen işlemlerde sırlar korunur ve tekrar imza engellenir. Başka cüzdanın davetlerine dokunulmaz.
- İki yeni regresyon testi eklendi: kesin başarısız oluşturma sonrası tekrar deneme ve önce belirsiz kalan yayın için sonradan kesin başarısız receipt ile güvenli kurtarma. Testte eski başarısız hash ile yeni başarılı hash ayrı ayrı doğrulandı.
- Kod commit `dc6c633e`; test commitleri `4a1893a8`, `fb228aa8`, `4ada2e9d`. [GitHub Actions #41205089505](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41205089505) **163/163 test geçti, 0 hata**; resmi tron-solc 0.8.31 sabit blob SHA ile derleme başarılı. Salt-okunur Nile blok **72305503**, Energy fiyatı **100 SUN**. GitHub Pages yayını ayrıca tamamlanmadan doğrulanmış sayılmamalı.
- Eski V6/V7 iade dosyaları, V8 Solidity sözleşmesi ve resmi yayınlanan bytecode değiştirilmedi. Önceki `d5ef0841` ile `main` karşılaştırmasında silinen dosya bulunmadı.
- **Hazır değil:** V8 gerçek Nile ağına kurulmadı; gerçek zincir takas/iade yapılmadı. Hiçbir kullanıcı imzası, TRX harcaması veya ekran görüntüsü istenmedi.


## 31 Ekim 2026, 17:14 TRT: doğrulanmış makbuzdan sonra durum okuma hatasını güvenli ele alma

- V8 katılımcı sayfasında **zincirde SUCCESS makbuzu alınmış** deposit veya refund işleminden sonraki salt-okunur durum yenilemesi RPC hatası verirse artık işlem yanlışlıkla başarısız diye sunulmuyor. İşlem kimliği ve tekrar imzalamama uyarısı gösteriliyor; yeni yatırım veya iade otomatik gönderilmiyor.
- Yönetici sayfasında aynı güvenlik yaklaşımı create ve finalize için uygulandı. Başarılı create sonrası davet anahtarları korunuyor; bağlantıların doğrulanması tamamlanamadıysa yeni create imzası önerilmiyor. Başarılı finalize sonrası durum yenileme hatası ikinci son onaya yönlendirmiyor. **Başarı iddiası yalnız başarılı zincir receipt'i sonrasında** mümkün; belirsiz receipt ve REVERT durumları önceki gibi başarısız/belirsiz kalıyor.
- UI kod commit'leri `145f88e3`, `d37e7fa8`; dört yeni yürütülebilir regresyon testi `ceb51496`. [GitHub Actions test #41209045128](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41209045128) **167/167 başarılı, 0 hata**. Sabit SHA'lı resmi tron-solc 0.8.31 derlemesi ve artifact üretimi başarılı; salt-okunur Nile blok **72306542**, Energy fiyatı **100 SUN**. [GitHub Pages #41209045130](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41209045130) başarılı (Actions dağıtım sonucu; bağımsız sayfa HTTP erişimi bu çalışmada doğrulanamadı).
- `b735fef6` → `ceb51496` GitHub karşılaştırmasında yalnız iki V8 HTML arayüzü ve V8 UI regresyon testleri değişti; **silinen dosya yok**. V8 Solidity sözleşmesi, resmi yayınlanan bytecode ve eski V6/V7 iade yolları değiştirilmedi.
- **YAYIN ENGELİ SÜRÜYOR:** V8 gerçek Nile ağına dağıtılmadı, gerçek A/B yatırımı, yönetici finalize veya iade işlemi zincirde doğrulanmadı. Yerel TVM ve başarılı CI/Pages gerçek Nile takası değildir. Kullanıcıdan imza, TRX harcaması veya ekran görüntüsü istenmedi; **hazır değildir**.


## 31 Ekim 2026, 18:19 TRT: A tarafı TRC20 komisyonu ve çift taraflı iade TVM regresyonu

- Resmi tron-solc 0.8.31 artifact'iyle çalışan yerel TronNile TVM testlerine, **A tarafının TRC20 yatırıp 50 TRX komisyon teminatı ödediği** iki yeni senaryo eklendi: (1) B'nin 120 TRX yatırması ve yönetici finalize ile A'nın 120 TRX alması, B'nin 60 token alması, yöneticinin yalnız başarıda 50 TRX alması; (2) A'nın 35 token + 50 TRX ve B'nin 20 TRX yatırmasından sonra 5 dakikalık süre dolunca iki tarafa token/TRX anaparası ve teminatın eksiksiz iadesi, yöneticiye sıfır komisyon.
- İlk TVM CI denemesinde (f06c3b73) test senaryosundaki B cüzdanı, simülatörün kullanılabilir bakiyesinden fazla TRX göndermişti; bu **test verisi hatasıydı**, yayınlanan sözleşme hatası kanıtı değildi. B'nin ikinci senaryodaki tutarı 20 TRX olarak düzeltilerek tüm senaryolar geçti. Nihai test commit'i 42b26a4c.
- [GitHub Actions yerel TVM #41214238967](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41214238967) **başarılı**: yayınlanan resmi artifact ve deneysel custom-error artifact üzerinde tüm TVM senaryoları geçti. [GitHub Pages #41214238850](https://github.com/lefkosagirne1-oss/tron-takas-v3-test/actions/runs/41214238850) başarılı. Salt-okunur Nile blok 72307855, Energy fiyatı 100 SUN; yayınlanan artifact için imzasız estimateenergy 1.507.328 Energy, deneysel artifact için 1.234.533 Energy döndürdü. Bunlar gerçek kurulum maliyeti garantisi değildir.
- d5ef0841 → 42b26a4c karşılaştırmasında **silinen dosya yok**. Bu çalışmada V8 sözleşmesi, resmi bytecode, yönetici/katılımcı arayüzleri ve eski V6/V7 iade yolları değiştirilmedi. Kullanıcıdan imza, test TRX veya ekran görüntüsü istenmedi.
- **YAYIN ENGELİ DEVAM EDİYOR:** V8 Nile'a dağıtılmadı; gerçek Nile zincirinde A/B yatırma, yönetici son onay ve iade yapılmadı. Başarılı yerel TVM/CI/Pages, uçtan uca gerçek Nile doğrulaması yerine geçmez. **Hazır değildir.**
