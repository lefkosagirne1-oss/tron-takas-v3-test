const ZERO="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb";const ABI=[{"inputs":[{"name":"payer","type":"uint8"},{"name":"amount","type":"uint256"},{"name":"inviteHashA","type":"bytes32"},{"name":"inviteHashB","type":"bytes32"}],"name":"create","outputs":[{"type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"id","type":"uint256"},{"name":"role","type":"uint8"},{"name":"token","type":"address"},{"name":"amount","type":"uint256"},{"name":"inviteSecret","type":"bytes32"}],"name":"deposit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"name":"id","type":"uint256"}],"name":"finalize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"id","type":"uint256"}],"name":"refund","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"id","type":"uint256"}],"name":"getDeal","outputs":[{"type":"tuple","components":[{"name":"partyA","type":"address"},{"name":"partyB","type":"address"},{"name":"tokenA","type":"address"},{"name":"tokenB","type":"address"},{"name":"amountA","type":"uint256"},{"name":"amountB","type":"uint256"},{"name":"feeAmount","type":"uint256"},{"name":"feePayer","type":"uint8"},{"name":"depositDeadline","type":"uint64"},{"name":"finalDeadline","type":"uint64"},{"name":"depositedA","type":"bool"},{"name":"depositedB","type":"bool"},{"name":"refundedA","type":"bool"},{"name":"refundedB","type":"bool"},{"name":"completed","type":"bool"},{"name":"cancelled","type":"bool"},{"name":"inviteHashA","type":"bytes32"},{"name":"inviteHashB","type":"bytes32"}]}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"nextId","outputs":[{"type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"manager","outputs":[{"type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"inviteVersion","outputs":[{"type":"uint8"}],"stateMutability":"pure","type":"function"},{"inputs":[{"name":"id","type":"uint256"},{"name":"role","type":"uint8"},{"name":"commitment","type":"bytes32"}],"name":"commitRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"id","type":"uint256"},{"name":"role","type":"uint8"},{"name":"who","type":"address"}],"name":"committedHash","outputs":[{"type":"bytes32"}],"stateMutability":"view","type":"function"}];
const $=id=>document.getElementById(id);
const qs=new URLSearchParams(location.search);
const address=qs.get("contract")||"";
const OLD_CONTRACT="TAbRAac2vPh2cbcrMrBXr59erAoFV41mzN";
const fixedReady=()=>!!address&&address!==OLD_CONTRACT&&qs.get("secure")==="1";
const ready=fixedReady;
function status(t){$("status").textContent=t;}
function units(s,d){
  if(!Number.isInteger(d)||d<0||d>30)throw Error("Token ondalık sayısı geçersiz.");
  if(!/^\d+(\.\d+)?$/.test(s))throw Error("Geçerli miktar girin.");
  let [a,b=""]=s.split(".");
  if(b.length>d)throw Error("En fazla "+d+" ondalık basamak kullanılabilir.");
  return (BigInt(a)*10n**BigInt(d)+BigInt(b.padEnd(d,"0"))).toString();
}
function displayUnits(v,d=6){
  let n=BigInt(v),sign=n<0n?"-":"";
  if(n<0n)n=-n;
  const base=10n**BigInt(d);
  const frac=(n%base).toString().padStart(d,"0").replace(/0+$/,"");
  return sign+(n/base).toString()+(frac?"."+frac:"");
}
function netPreview(amount,fee,payer,role,type,decimals=6){
  if(!amount)return "Miktar girin.";
  try{
    const commission=Number(payer)===Number(role)?BigInt(fee):0n;
    if(type!=="TRX"){
      // TRC20 decimals are read from the token at deposit time. Do not apply
      // TRX decimals or subtract a TRX fee from an unrelated token amount.
      if(!/^\d+(\.\d+)?$/.test(amount))throw Error("Geçerli miktar girin.");
      const [whole,fraction=""]=amount.split(".");
      if(BigInt(whole+fraction)===0n)return "Miktar sıfırdan büyük olmalı.";
      const feeText=commission>0n?"Komisyon teminatı: "+displayUnits(commission)+" TRX (ayrıca yatırılır)":"Komisyon yok";
      return "Yatırım: "+amount+" token · "+feeText+" · Karşı tarafa: "+amount+" token";
    }
    const gross=BigInt(units(amount,decimals));
    if(gross<=0n)return "Miktar sıfırdan büyük olmalı.";
    if(commission>=gross)return "Komisyon "+displayUnits(commission)+" TRX. Yatırılacak TRX bunun üzerinde olmalı.";
    return "Yatırım: "+displayUnits(gross,decimals)+" TRX · Komisyon: "+displayUnits(commission)+" TRX · Karşı tarafa: "+displayUnits(gross-commission,decimals)+" TRX";
  }catch(e){return "Miktarı kontrol edin: "+e.message;}
}
function readableAddress(raw,tw){
  if(raw==null)return "—";
  const s=String(raw);
  if(s===ZERO||/^(?:0x)?0{40}$/i.test(s)||/^41(?:0){40}$/i.test(s))return "—";
  if(/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(s))return s;
  const hex=s.replace(/^0x/i,"");
  if(/^[0-9a-fA-F]{64}$/.test(hex)){
    const h=hex.slice(-40);
    if(/^0+$/.test(h))return "—";
    return tw.address.fromHex("41"+h);
  }
  if(/^41[0-9a-fA-F]{40}$/.test(hex))return tw.address.fromHex(hex);
  if(/^[0-9a-fA-F]{40}$/.test(hex))return tw.address.fromHex("41"+hex);
  return "—";
}
async function wallet(){
  if(!window.tronWeb?.ready)throw Error("TronLink içinde Nile ağına bağlı cüzdan açın.");
  if(!ready())throw Error("Geçerli güvenli V8 sözleşme veya davet bağlantısı gerekli.");
  const tw=window.tronWeb;
  const host=String(tw.fullNode?.host||tw.fullNode?.url||"").toLowerCase();
  if(!/^https:\/\/nile\.trongrid\.io(?::443)?\/?$/i.test(host))throw Error("Güvenlik: TronLink ağını resmi Nile Testnet (nile.trongrid.io) olarak seçin.");
  if(!tw.defaultAddress?.base58)throw Error("TronLink cüzdanını seçin.");
  return tw;
}
let verifiedV8Code="";
function sameV8Runtime(expected,actual,refs){
  if(!/^[0-9a-f]+$/.test(expected)||!(/^[0-9a-f]+$/.test(actual))||expected.length!==actual.length)return false;
  // This artifact has exactly one immutable: the 20-byte manager address.
  // Every compiler-declared reference MUST contain the same deployed manager.
  // Merely masking offsets would let a fake contract use a benign manager()
  // reference but a different manager for owner checks or fee payouts.
  if(Object.keys(refs||{}).length!==1)return false;
  const spans=Object.values(refs).flat();
  if(!spans.length)return false;
  let left=expected,right=actual,managerSlot="";
  for(const span of spans){
    const start=Number(span.start),length=Number(span.length);
    if(!Number.isSafeInteger(start)||length!==32||start<0||(start+length)*2>expected.length)return false;
    const begin=start*2,end=(start+length)*2;
    const slot=actual.slice(begin,end);
    if(!/^0{24}[0-9a-f]{40}$/.test(slot)||/^0+$/.test(slot))return false;
    if(managerSlot&&managerSlot!==slot)return false;
    managerSlot=slot;
    const mask="0".repeat(end-begin);
    left=left.slice(0,begin)+mask+left.slice(end);
    right=right.slice(0,begin)+mask+right.slice(end);
  }
  return left===right;
}
async function verifyV8Code(){
  if(verifiedV8Code===address)return;
  const artifactResponse=await fetch("./v6-test/dist/TakasV8Invite.json",{cache:"no-store"});
  if(!artifactResponse.ok)throw Error("Resmi V8 sözleşme derlemesi yüklenemedi.");
  const artifact=await artifactResponse.json();
  const expected=String(artifact.runtimeBytecode||"").replace(/^0x/i,"").toLowerCase();
  if(artifact.compiler!=="tron-solc 0.8.31"||!/^[0-9a-f]+$/.test(expected)||expected.length<100)
    throw Error("Resmi V8 çalışma kodu doğrulanamadı; işlem kapalı.");
  const response=await fetch("https://nile.trongrid.io/wallet/getcontractinfo",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({value:address,visible:true})
  });
  if(!response.ok)throw Error("Nile sözleşme kodu okunamadı.");
  const info=await response.json();
  const actual=String(info.runtimecode||"").replace(/^0x/i,"").toLowerCase();
  if(!sameV8Runtime(expected,actual,artifact.immutableReferences))throw Error("Güvenlik: Nile sözleşme kodu resmi V8 derlemesiyle eşleşmiyor. İşlem imzalanmadı.");
  verifiedV8Code=address;
}
async function contract(){
  const tw=await wallet();
  if(!tw.isAddress(address))throw Error("Sözleşme adresi geçersiz.");
  await verifyV8Code();
  const c=await tw.contract(ABI,address);
  const manager=await c.manager().call();
  if(readableAddress(manager,tw)==="—")throw Error("Sözleşme doğrulanamadı.");
  const version=Number((await c.inviteVersion().call()).toString());
  if(version!==8)throw Error("Güvenli davet sözleşmesi değil; eski sözleşme kullanılamaz.");
  return c;
}
async function assertManager(){
  const tw=await wallet(),c=await contract();
  const manager=readableAddress(await c.manager().call(),tw);
  if(manager!==tw.defaultAddress.base58)throw Error("Bu cüzdan yönetici değil.");
  return {tw,c};
}
async function waitTx(hash,tw,tries=24){
  for(let i=0;i<tries;i++){
    const info=await tw.trx.getTransactionInfo(hash);
    if(info?.receipt?.result==="SUCCESS")return info;
    if(info?.receipt?.result&&info.receipt.result!=="SUCCESS")throw Error("Zincir işlemi başarısız: "+info.receipt.result+" · "+hash);
    await new Promise(resolve=>setTimeout(resolve,2500));
  }
  throw Error("İşlem gönderildi ancak henüz kesinleşmedi. Yeniden imzalamayın; önce işlem kimliğini kontrol edin: "+hash);
}
async function waitNextBlock(tw,txid){
  // commitRole must be mined in an earlier block than deposit; otherwise
  // the contract reverts and the participant wastes TRX on the failed call.
  const receipt=await tw.trx.getTransactionInfo(txid);
  const committedAt=Number(receipt?.blockNumber);
  if(!Number.isSafeInteger(committedAt)||committedAt<=0)throw Error("Güvenlik kaydının blok numarası okunamadı. Yatırım gönderilmedi; daha sonra tekrar deneyin.");
  for(let i=0;i<12;i++){
    const block=await tw.trx.getCurrentBlock();
    const now=Number(block?.block_header?.raw_data?.number);
    if(Number.isSafeInteger(now)&&now>committedAt)return;
    await new Promise(resolve=>setTimeout(resolve,2500));
  }
  throw Error("Güvenlik kaydı sonraki blokta henüz doğrulanmadı. Yatırım gönderilmedi; daha sonra tekrar deneyin.");
}
function ensureWallet(tw,expected){
  if(expected&&tw.defaultAddress?.base58!==expected)throw Error("Cüzdan değişti. İşlem imzalanmadı; yeniden kontrol edin.");
}
function safeCallValue(value){
  let sun;
  try{sun=BigInt(value??0);}catch(_){throw Error("TRX tutarı geçersiz; işlem gönderilmedi.");}
  if(sun<0n||sun>BigInt(Number.MAX_SAFE_INTEGER))throw Error("TRX tutarı TronLink güvenli sayı sınırını aşıyor; işlem gönderilmedi.");
  return Number(sun);
}
async function send(method,opts={}){
  const tw=await wallet();
  ensureWallet(tw,opts.expectedWallet);
  const callValue=safeCallValue(opts.value);
  const hash=await method.send({feeLimit:150000000,callValue,shouldPollResponse:false});
  if(!/^[0-9a-f]{64}$/i.test(String(hash)))throw Error("İşlem kimliği alınamadı.");
  // The caller may need to retain private invitation keys once a transaction
  // was broadcast, even when receipt polling later fails or times out.
  if(opts.onHash)opts.onHash(hash);
  status("Zincir onayı bekleniyor: "+hash);
  await waitTx(hash,tw);
  status("İşlem zincirde doğrulandı: "+hash);
  return hash;
}
function link(role,id,secret){return new URL("takas-katilimci.html?secure=1&contract="+encodeURIComponent(address)+"&id="+encodeURIComponent(id)+"&role="+role+"#secret="+encodeURIComponent(secret),location.href).href;}
function copy(t){
  if(!t){status("Önce takas bağlantısını oluşturun veya numarasını girin.");return;}
  if(!navigator.clipboard?.writeText){status("Bağlantı alanına basılı tutup kopyalayın.");return;}
  navigator.clipboard.writeText(t).then(()=>status("Bağlantı kopyalandı.")).catch(()=>status("Bağlantıya basılı tutup kopyalayın."));
}
function linksKey(tw,id){return "secure-takas:"+address+":"+(tw?.defaultAddress?.base58||"")+":"+id;}
function lastKey(tw){return "secure-takas-last:"+address+":"+(tw?.defaultAddress?.base58||"");}
function saveInvite(id,a,b,tw){
  const key=linksKey(tw,id),previous=localStorage.getItem(key);
  if(previous!==null){
    const saved=loadInvite(id,tw);
    if(!saved||saved.a!==a||saved.b!==b)
      throw Error("Bu takas numarası için kayıtlı davet anahtarları var. Önceki bağlantıları korumak için üzerlerine yazılmadı.");
  }
  localStorage.setItem(key,JSON.stringify({id:String(id),a,b}));
  localStorage.setItem(lastKey(tw),String(id));
}
function loadInvite(id,tw){
  const raw=localStorage.getItem(linksKey(tw,id));
  if(!raw)return null;
  try{const v=JSON.parse(raw);return /^[0-9]+$/.test(v.id)&&validSecret(v.a)&&validSecret(v.b)?v:null;}catch(_){return null;}
}
function restoreLinks(tw){return localStorage.getItem(lastKey(tw))||"";}
function validSecret(s){return /^0x[0-9a-fA-F]{64}$/.test(s||"");}
function randomSecret(){
  if(!crypto?.getRandomValues)throw Error("Güvenli rastgele davet anahtarı oluşturulamadı.");
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  return "0x"+Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
}
async function hashSecret(secret){
  if(!validSecret(secret))throw Error("Davet anahtarı geçersiz.");
  const bytes=Uint8Array.from(secret.slice(2).match(/../g),v=>parseInt(v,16));
  const hash=await crypto.subtle.digest("SHA-256",bytes);
  return "0x"+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("");
}
async function hashWalletCommitment(secret,tw){
  if(!validSecret(secret))throw Error("Davet anahtarı geçersiz.");
  const walletHex=String(tw.address.toHex(tw.defaultAddress.base58)).replace(/^0x/i,"");
  if(!/^41[0-9a-fA-F]{40}$/.test(walletHex))throw Error("Cüzdan adresi okunamadı.");
  // Solidity abi.encodePacked(bytes32,address): 32 secret bytes + 20 address bytes.
  const data=Uint8Array.from((secret.slice(2)+walletHex.slice(2)).match(/../g),v=>parseInt(v,16));
  const hash=await crypto.subtle.digest("SHA-256",data);
  return "0x"+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("");
}
function sameHash(a,b){return String(a).toLowerCase().replace(/^0x/,"")===String(b).toLowerCase().replace(/^0x/,"");}
const TOKEN_ABI=[{"name":"decimals","inputs":[],"outputs":[{"type":"uint8"}],"stateMutability":"view","type":"function"},{"name":"balanceOf","inputs":[{"type":"address"}],"outputs":[{"type":"uint256"}],"stateMutability":"view","type":"function"},{"name":"allowance","inputs":[{"type":"address"},{"type":"address"}],"outputs":[{"type":"uint256"}],"stateMutability":"view","type":"function"},{"name":"approve","inputs":[{"type":"address"},{"type":"uint256"}],"outputs":[{"type":"bool"}],"stateMutability":"nonpayable","type":"function"}];
