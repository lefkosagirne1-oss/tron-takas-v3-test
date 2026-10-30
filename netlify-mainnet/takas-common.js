const ZERO="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb";const ABI=[{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"E1","type":"error"},{"inputs":[],"name":"E10","type":"error"},{"inputs":[],"name":"E11","type":"error"},{"inputs":[],"name":"E12","type":"error"},{"inputs":[],"name":"E13","type":"error"},{"inputs":[],"name":"E14","type":"error"},{"inputs":[],"name":"E15","type":"error"},{"inputs":[],"name":"E16","type":"error"},{"inputs":[],"name":"E17","type":"error"},{"inputs":[],"name":"E18","type":"error"},{"inputs":[],"name":"E19","type":"error"},{"inputs":[],"name":"E2","type":"error"},{"inputs":[],"name":"E20","type":"error"},{"inputs":[],"name":"E21","type":"error"},{"inputs":[],"name":"E22","type":"error"},{"inputs":[],"name":"E23","type":"error"},{"inputs":[],"name":"E24","type":"error"},{"inputs":[],"name":"E25","type":"error"},{"inputs":[],"name":"E26","type":"error"},{"inputs":[],"name":"E27","type":"error"},{"inputs":[],"name":"E28","type":"error"},{"inputs":[],"name":"E29","type":"error"},{"inputs":[],"name":"E3","type":"error"},{"inputs":[],"name":"E30","type":"error"},{"inputs":[],"name":"E31","type":"error"},{"inputs":[],"name":"E32","type":"error"},{"inputs":[],"name":"E33","type":"error"},{"inputs":[],"name":"E34","type":"error"},{"inputs":[],"name":"E35","type":"error"},{"inputs":[],"name":"E36","type":"error"},{"inputs":[],"name":"E37","type":"error"},{"inputs":[],"name":"E38","type":"error"},{"inputs":[],"name":"E4","type":"error"},{"inputs":[],"name":"E5","type":"error"},{"inputs":[],"name":"E6","type":"error"},{"inputs":[],"name":"E7","type":"error"},{"inputs":[],"name":"E8","type":"error"},{"inputs":[],"name":"E9","type":"error"},{"inputs":[],"name":"NotDepositor","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"}],"name":"Completed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"uint8","name":"feePayer","type":"uint8"},{"indexed":false,"internalType":"uint256","name":"feeAmount","type":"uint256"}],"name":"Created","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"uint8","name":"role","type":"uint8"},{"indexed":false,"internalType":"address","name":"wallet","type":"address"},{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Deposited","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"uint8","name":"role","type":"uint8"}],"name":"Refunded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"uint8","name":"role","type":"uint8"},{"indexed":true,"internalType":"address","name":"wallet","type":"address"}],"name":"RoleCommitted","type":"event"},{"inputs":[],"name":"DEPOSIT_WINDOW","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"FINAL_WINDOW","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"cancelUnused","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"uint8","name":"role","type":"uint8"},{"internalType":"bytes32","name":"commitment","type":"bytes32"}],"name":"commitRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"uint8","name":"role","type":"uint8"},{"internalType":"address","name":"who","type":"address"}],"name":"committedHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint8","name":"payer","type":"uint8"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"bytes32","name":"inviteHashA","type":"bytes32"},{"internalType":"bytes32","name":"inviteHashB","type":"bytes32"}],"name":"create","outputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"uint8","name":"role","type":"uint8"},{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"bytes32","name":"inviteSecret","type":"bytes32"}],"name":"deposit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"finalize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"getDeal","outputs":[{"components":[{"internalType":"address","name":"partyA","type":"address"},{"internalType":"address","name":"partyB","type":"address"},{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"},{"internalType":"uint256","name":"amountA","type":"uint256"},{"internalType":"uint256","name":"amountB","type":"uint256"},{"internalType":"uint256","name":"feeAmount","type":"uint256"},{"internalType":"uint8","name":"feePayer","type":"uint8"},{"internalType":"uint64","name":"depositDeadline","type":"uint64"},{"internalType":"uint64","name":"finalDeadline","type":"uint64"},{"internalType":"bool","name":"depositedA","type":"bool"},{"internalType":"bool","name":"depositedB","type":"bool"},{"internalType":"bool","name":"refundedA","type":"bool"},{"internalType":"bool","name":"refundedB","type":"bool"},{"internalType":"bool","name":"completed","type":"bool"},{"internalType":"bool","name":"cancelled","type":"bool"},{"internalType":"bytes32","name":"inviteHashA","type":"bytes32"},{"internalType":"bytes32","name":"inviteHashB","type":"bytes32"}],"internalType":"struct TakasV8Invite.Deal","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"inviteVersion","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"manager","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"nextId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"refund","outputs":[],"stateMutability":"nonpayable","type":"function"}];const USDT="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const $=id=>document.getElementById(id);
const qs=new URLSearchParams(location.search);
const address=qs.get("contract")||"";
const OLD_CONTRACT="TAbRAac2vPh2cbcrMrBXr59erAoFV41mzN";
const fixedReady=()=>!!address&&address!==OLD_CONTRACT&&qs.get("secure")==="1"&&qs.get("net")==="mainnet-hazir";
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
function getWallet(){return window.tron?.tronWeb||window.tronWeb;}
async function connectWallet(){
 const p=window.tron||window.tronLink;
 if(!p?.request)throw Error("Bu bağlantıyı TronLink tarayıcısında açın veya TronLink uzantısını etkinleştirin.");
 await p.request({method:window.tron?"eth_requestAccounts":"tron_requestAccounts"});
 return networkWallet();
}
async function networkWallet(){
 const tw=getWallet();
 if(!tw?.defaultAddress?.base58||tw.ready===false)throw Error("Önce cüzdanınızı bağlayın.");
 let host;try{host=new URL(tw.fullNode?.host||tw.fullNode?.url||"");}catch(_){throw Error("Ağ adresi okunamadı.");}
 if(host.protocol!=="https:"||host.hostname!=="api.trongrid.io"||host.port||host.username||host.password)throw Error("TronLink ağını TRON Mainnet seçin. Bu sayfa Nile veya özel ağda işlem yapmaz.");
 const chain=await tw.fullNode.request("jsonrpc",{jsonrpc:"2.0",id:1,method:"eth_chainId",params:[]},"post");
 if(String(chain?.result).toLowerCase()!=="0x2b6653dc")throw Error("Mainnet zincir kimliği doğrulanamadı; işlem gönderilmedi.");
 return tw;
}
async function wallet(){
 if(!ready())throw Error("Mainnet sözleşmesini içeren tam yönetici veya davet bağlantısı gerekli.");
 return networkWallet();
}
async function contract(){
  const tw=await wallet();
  if(!tw.isAddress(address))throw Error("Sözleşme adresi geçersiz.");
  const c=await tw.contract(ABI,address);
  const [manager,versionRaw]=await Promise.all([c.manager().call(),c.inviteVersion().call()]);
  if(readableAddress(manager,tw)==="—")throw Error("Sözleşme doğrulanamadı.");
  const version=Number(versionRaw.toString());
  if(version!==8)throw Error("Güvenli davet sözleşmesi değil; eski sözleşme kullanılamaz.");
  await verifyRuntime(tw,address,readableAddress(manager,tw));
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
let operationAccount="";
async function send(method,opts={}){
 const tw=await wallet();
 const account=tw.defaultAddress.base58;
 if(operationAccount&&operationAccount!==account)throw Error("İşlem sırasında cüzdan değişti; işlem gönderilmedi.");
 const key="mainnet-hazir-pending:"+address+":"+account;
 const previous=localStorage.getItem(key);
 if(previous){
  const info=await tw.trx.getTransactionInfo(previous);
  if(info?.receipt?.result){localStorage.removeItem(key);throw Error("Önceki işlem sonucu: "+info.receipt.result+". Güncel durumu kontrol edip devam edin: "+previous);}
  throw Error("Önceki işlem hâlâ bekliyor. Yeniden imzalamayın: "+previous);
 }
 status("TronLink imzası bekleniyor...");
 const hash=await method.send({feeLimit:150000000,callValue:opts.value||0,shouldPollResponse:false});
 if(!/^[0-9a-f]{64}$/i.test(String(hash)))throw Error("İşlem kimliği alınamadı; cüzdan geçmişini kontrol edin.");
 localStorage.setItem(key,hash);
 status("İşlem gönderildi. Zincir onayı bekleniyor: "+hash);
 try{await waitTx(hash,tw);}catch(e){throw e;}
 localStorage.removeItem(key);
 status("İşlem zincirde doğrulandı: "+hash);
 return hash;
}
function link(role,id,secret){return new URL("takas-katilimci.html?secure=1&net=mainnet-hazir&contract="+encodeURIComponent(address)+"&id="+encodeURIComponent(id)+"&role="+role+"#secret="+encodeURIComponent(secret),location.href).href;}
function copy(t){
  if(!t){status("Önce takas bağlantısını oluşturun veya numarasını girin.");return;}
  if(!navigator.clipboard?.writeText){status("Bağlantı alanına basılı tutup kopyalayın.");return;}
  navigator.clipboard.writeText(t).then(()=>status("Bağlantı kopyalandı.")).catch(()=>status("Bağlantıya basılı tutup kopyalayın."));
}
function linksKey(tw,id){return "mainnet-hazir-takas:"+address+":"+(tw?.defaultAddress?.base58||"")+":"+id;}
function lastKey(tw){return "mainnet-hazir-takas-last:"+address+":"+(tw?.defaultAddress?.base58||"");}
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
function sameHash(a,b){return String(a).toLowerCase().replace(/^0x/,"")===String(b).toLowerCase().replace(/^0x/,"");}
const TOKEN_ABI=[{"name":"decimals","inputs":[],"outputs":[{"type":"uint8"}],"stateMutability":"view","type":"function"},{"name":"allowance","inputs":[{"type":"address"},{"type":"address"}],"outputs":[{"type":"uint256"}],"stateMutability":"view","type":"function"},{"name":"approve","inputs":[{"type":"address"},{"type":"uint256"}],"outputs":[{"type":"bool"}],"stateMutability":"nonpayable","type":"function"}];


async function chainTime(tw){
 const block=await tw.trx.getCurrentBlock();
 const ms=Number(block?.block_header?.raw_data?.timestamp);
 if(!Number.isFinite(ms)||ms<=0)throw Error("Zincir saati okunamadı; işlem gönderilmedi.");
 return Math.floor(ms/1000);
}
function managerURL(addr){return new URL("takas-yonetici.html?secure=1&net=mainnet-hazir&contract="+encodeURIComponent(addr),location.href).href;}

let verifiedRuntime="";
async function verifyRuntime(tw,addr,manager){
 const key=addr+":"+manager;
 if(verifiedRuntime===key)return;
 const response=await fetch("TakasV8Invite.json",{cache:"no-store"});
 const text=await response.text();
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));
 const hex=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,"0")).join("");
 if(!response.ok||hex!=="9fe0515c762d7627d7c26a88edb6e89a01a92c89dd5b7f01f314ff20004d5322")throw Error("Test derlemesi bütünlüğü doğrulanamadı.");
 const artifact=JSON.parse(text);
 const managerWord=tw.address.toHex(manager).slice(-40).padStart(64,"0").toLowerCase();
 const expected=artifact.runtime.toLowerCase().replaceAll("7f"+"0".repeat(64),"7f"+managerWord);
 const code=await tw.fullNode.request("jsonrpc",{jsonrpc:"2.0",id:1,method:"eth_getCode",params:["0x"+tw.address.toHex(addr).slice(-40),"latest"]},"post");
 if(String(code.result||"").toLowerCase().replace(/^0x/,"")!==expected)throw Error("Bu adres yeni korumalı optimize test derlemesiyle eşleşmiyor. Eski sözleşmeyi burada kullanmayın.");
 verifiedRuntime=key;
}
async function walletCommitment(secret,account,tw){
 if(!validSecret(secret))throw Error("Davet anahtarı geçersiz.");
 const hex=secret.slice(2)+tw.address.toHex(account).slice(-40);
 const bytes=Uint8Array.from(hex.match(/../g),v=>parseInt(v,16));
 const hash=await crypto.subtle.digest("SHA-256",bytes);
 return "0x"+Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,"0")).join("");
}
async function ensureCommit(c,id,role,secret,tw){
 const account=tw.defaultAddress.base58,commitment=await walletCommitment(secret,account,tw);
 const existing=await c.committedHash(id,role,account).call();
 if(!sameHash(existing,commitment)){
  status("1/2: Davet cüzdana kilitlenecek. Bu imza varlık yatırmaz.");
  const hash=await send(c.commitRole(id,role,commitment));
  const info=await tw.trx.getTransactionInfo(hash),commitBlock=Number(info.blockNumber);
  if(!Number.isSafeInteger(commitBlock)||commitBlock<=0)throw Error("Cüzdan kilidi blok numarası okunamadı. Yeniden yatırmadan durumu kontrol edin.");
  // The deposit must be included strictly after the commitment block.
  for(let i=0;i<20;i++){
   const current=await tw.trx.getCurrentBlock();
   if(Number(current.block_header?.raw_data?.number)>commitBlock)break;
   if(i===19)throw Error("Sonraki blok henüz gelmedi. Kilit saklandı; tekrar Onayla ve yatır ile devam edin.");
   status("Cüzdan kilidi doğrulandı; sonraki Nile bloğu bekleniyor...");
   await new Promise(resolve=>setTimeout(resolve,1500));
  }
 }
 if((await networkWallet()).defaultAddress.base58!==account)throw Error("Cüzdan değişti; yatırım gönderilmedi.");
 status("2/2: Varlık yatırımı için TronLink imzası bekleniyor.");
}
