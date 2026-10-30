// Candidate-only Turkish error catalogue. The published V8 contract and UI
// remain unchanged until full Nile deployment and UI error handling are tested.
import assert from "node:assert/strict";
import {id} from "ethers";

export const ERROR_MESSAGES_TR=Object.freeze({
 "Manager only":"Bu işlemi yalnız takas yöneticisi yapabilir.",
 "Reentrancy":"İşlem devam ederken yeniden çağrı reddedildi.",
 "Invalid invitations":"A ve B davet anahtarları geçersiz veya aynı.",
 "Invalid fee":"Komisyonu ödeyecek taraf geçersiz.",
 "Fee payer required":"Komisyon varsa A veya B tarafını seçin.",
 "Closed":"Bu takas kapanmış; yeni işlem yapılamaz.",
 "Invalid participant":"Bu cüzdan veya taraf bu işlem için uygun değil.",
 "Invalid commitment":"Cüzdan güvenlik kaydı geçersiz.",
 "Deposit expired":"15 dakikalık yatırım süresi doldu.",
 "Role unavailable":"Bu taraf başka bir cüzdan tarafından kullanılmış.",
 "Unknown deal":"Takas numarası bulunamadı.",
 "Invalid invitation":"Bu tarafın davet anahtarı geçersiz.",
 "Wallet not committed":"Bu cüzdan için önce güvenlik kaydı yapılmalı.",
 "Wait one block":"Güvenlik kaydından sonra yeni Nile bloğunu bekleyin.",
 "Invalid asset":"Token adresi veya miktarı geçersiz.",
 "Both deposited":"İki taraf da yatırdı; yeni yatırım kabul edilmiyor.",
 "A unavailable":"A tarafı için yatırım hakkı artık kullanılamıyor.",
 "B unavailable":"B tarafı için yatırım hakkı artık kullanılamıyor.",
 "Fee exceeds amount":"Komisyon, yatırılan TRX miktarından küçük olmalı.",
 "Not ready":"Yönetici son onayı için iki tarafın da yatırması gerekiyor.",
 "Final window expired":"5 dakikalık yönetici son onay süresi doldu; iade kullanılabilir.",
 "Not refundable":"Bu takas henüz iade edilemez.",
 "Not expired":"İade için gerekli süre henüz dolmadı.",
 "No A refund":"A tarafında iade edilecek yatırım yok veya daha önce iade edildi.",
 "No B refund":"B tarafında iade edilecek yatırım yok veya daha önce iade edildi.",
 "Already used":"Yatırım yapılmış takas iptal edilemez.",
 "Wrong TRX amount":"Gönderilen TRX miktarı girilen miktarla uyuşmuyor.",
 "Wrong TRX fee":"Token yatırımı için gereken ayrı TRX komisyon teminatı uyuşmuyor.",
 "Received amount mismatch":"Sözleşmeye eksik token ulaştı; yatırım geri alındı.",
 "TRX send failed":"TRX aktarımı başarısız; işlem geri alındı.",
 "Recipient amount mismatch":"Alıcıya eksik token ulaştı; işlem geri alındı.",
 "Balance read failed":"Token bakiyesi güvenli şekilde okunamadı.",
 "Token transfer failed":"Token aktarımı başarısız; işlem geri alındı."
});

// Map ABI custom-error selectors to clear messages. Only generated for a
// temporary candidate artifact, not exposed as a claim of Nile readiness.
export function attachCandidateErrorMessages(artifact,codes){
 const pairs=Object.entries(codes);
 assert.equal(pairs.length,33,"Unexpected number of distinct V8 revert reasons");
 assert.deepEqual(new Set(pairs.map(([reason])=>reason)),new Set(Object.keys(ERROR_MESSAGES_TR)),
  "Every distinct error needs an explicit Turkish translation");
 const declared=artifact.abi.filter(x=>x.type==="error");
 assert.equal(declared.length,pairs.length,"Candidate ABI custom-error count mismatch");
 const selectors={};
 for(const [reason,name] of pairs){
  const entry=declared.find(x=>x.name===name);
  assert.ok(entry&&entry.inputs.length===0,"Missing parameterless custom error "+name);
  const selector=id(name+"()").slice(0,10).toLowerCase();
  assert.ok(!selectors[selector],"Custom error selector collision: "+selector);
  selectors[selector]={name,reason,messageTr:ERROR_MESSAGES_TR[reason]};
 }
 artifact.errorSelectorsTr=selectors;
 assert.equal(Object.keys(selectors).length,pairs.length);
 return artifact;
}
