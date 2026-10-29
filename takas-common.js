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
    const gross=BigInt(units(amount,decimals));
    if(gross<=0n)return "Miktar sıfırdan büyük olmalı.";
    const commission=Number(payer)===Number(role)?BigInt(fee):0n;
    if(commission>0n&&type!=="TRX")return "Komisyon bu tarafta: TRX seçilmelidir.";
    if(commission>=gross)return "Komisyon "+displayUnits(commission)+" TRX. Yatırılacak TRX bunun üzerinde olmalı.";
    return "Yatırım: "+displayUnits(gross,decimals)+" "+type+" · Komisyon: "+displayUnits(commission)+" TRX · Karşı tarafa: "+displayUnits(gross-commission,decimals)+" "+type;
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
async function contract(){
  const tw=await wallet();
  if(!tw.isAddress(address))throw Error("Sözleşme adresi geçersiz.");
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
async function send(method,opts={}){
  const tw=await wallet();
  const hash=await method.send({feeLimit:150000000,callValue:opts.value||0,shouldPollResponse:false});
  if(!/^[0-9a-f]{64}$/i.test(String(hash)))throw Error("İşlem kimliği alınamadı.");
  status("Zincir onayı bekleniyor: "+hash);
  await waitTx(hash,tw);
  status("İşlem zincirde doğrulandı: "+hash);
  return hash;
}
function link(role,id,secret){return new URL("takas-katilimci.html?secure=1&contract="+encodeURIComponent(address)+"&id="+encodeURIComponent(id)+"&role="+role+"&secret="+encodeURIComponent(secret),location.href).href;}
function copy(t){
  if(!t){status("Önce takas bağlantısını oluşturun veya numarasını girin.");return;}
  if(!navigator.clipboard?.writeText){status("Bağlantı alanına basılı tutup kopyalayın.");return;}
  navigator.clipboard.writeText(t).then(()=>status("Bağlantı kopyalandı.")).catch(()=>status("Bağlantıya basılı tutup kopyalayın."));
}
function linksKey(tw,id){return "secure-takas:"+address+":"+(tw?.defaultAddress?.base58||"")+":"+id;}
function lastKey(tw){return "secure-takas-last:"+address+":"+(tw?.defaultAddress?.base58||"");}
function saveInvite(id,a,b,tw){
  localStorage.setItem(linksKey(tw,id),JSON.stringify({id:String(id),a,b}));
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
const TOKEN_ABI=[{"name":"decimals","inputs":[],"outputs":[{"type":"uint8"}],"stateMutability":"view","type":"function"},{"name":"allowance","inputs":[{"type":"address"},{"type":"address"}],"outputs":[{"type":"uint256"}],"stateMutability":"view","type":"function"},{"name":"approve","inputs":[{"type":"address"},{"type":"uint256"}],"outputs":[{"type":"bool"}],"stateMutability":"nonpayable","type":"function"}];
