/* V5 Nile prototype. This file never deploys a contract or stores wallet secrets. */
(function(){
"use strict";
const ZERO="410000000000000000000000000000000000000000";
const FEE_LIMIT=30000000; // 30 test TRX transaction fee limit, not a promised fee
const names=["partyA","partyB","tokenA","tokenB","amountA","amountB","offerDeadline","depositDeadline","settlementDeadline","feeAmount","feePayer","feeAsset","walletsConfirmed","proposedA","proposedB","acceptedA","acceptedB","depositedA","depositedB","refundedA","refundedB","completed","cancelled"];
const bools=new Set(names.slice(12));
const fn=(name,ins,outs,mutability)=>({type:"function",name,inputs:ins.map((type,i)=>({name:"arg"+i,type})),outputs:outs.map((type,i)=>({name:"out"+i,type})),stateMutability:mutability});
const ABI=[
fn("VERSION",[],["uint256"],"view"),fn("manager",[],["address"],"view"),fn("nextId",[],["uint256"],"view"),
fn("createInvite",["uint256","uint8","address"],["uint256"],"nonpayable"),
fn("requestRole",["uint256","uint8"],[],"nonpayable"),
fn("rejectRequests",["uint256"],[],"nonpayable"),
fn("confirmParticipants",["uint256"],[],"nonpayable"),
fn("propose",["uint256","address","uint256"],[],"nonpayable"),
fn("acceptTerms",["uint256"],[],"nonpayable"),
fn("deposit",["uint256"],[],"payable"),
fn("finalize",["uint256"],[],"nonpayable"),
fn("refund",["uint256"],[],"nonpayable"),
fn("cancelUnused",["uint256"],[],"nonpayable")
];
const TOKEN_ABI=[
fn("decimals",[],["uint8"],"view"),fn("symbol",[],["string"],"view"),
fn("allowance",["address","address"],["uint256"],"view"),
fn("approve",["address","uint256"],["bool"],"nonpayable")
];
let tw=null,contract=null,contractAddress="",manager="";
function value(v){if(Array.isArray(v))return value(v[0]);if(v&&typeof v==="object"&&v[0]!==undefined)return value(v[0]);return String(v);}
function asBig(v){return BigInt(value(v));}
function format(raw,dp){const v=asBig(raw);const sign=v<0n?"-":"";const x=(v<0n?-v:v).toString().padStart(dp+1,"0");const whole=dp?x.slice(0,-dp):x;const frac=dp?x.slice(-dp).replace(/0+$/,""):"";return sign+whole+(frac?"."+frac:"");}
function units(input,dp,allowZero){const s=String(input).trim();if(!/^(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(s))throw Error("Geçerli pozitif miktar gir.");const parts=s.split(".");const frac=parts[1]||"";if(frac.length>dp)throw Error("Bu varlık en fazla "+dp+" ondalık hane kullanır.");const n=BigInt(parts[0])*10n**BigInt(dp)+BigInt(frac.padEnd(dp,"0")||"0");if(!allowZero&&n===0n)throw Error("Miktar sıfır olamaz.");if(n>=2n**256n)throw Error("Miktar çok büyük.");return n;}
function wallet(){return tw?.defaultAddress?.base58||"";}
function toHex(addr){if(!tw)throw Error("TronLink bağlanmadı.");if(!addr)throw Error("Adres boş.");const x=String(addr);if(/^41[0-9a-f]{40}$/i.test(x))return x.toLowerCase();if(/^0x[0-9a-f]{40}$/i.test(x))return ("41"+x.slice(2)).toLowerCase();if(!tw.isAddress(x))throw Error("Geçersiz TRON adresi.");return tw.address.toHex(x).toLowerCase();}
function address(addr){const x=toHex(addr);return x===ZERO?tw.address.fromHex(ZERO):tw.address.fromHex(x);}
function native(addr){return toHex(addr)===ZERO;}
function same(a,b){return toHex(a)===toHex(b);}
function assertNile(w){const host=String(w.fullNode?.host||w.fullNode?.url||"").toLowerCase();if(!host.includes("nile"))throw Error("TronLink ağını Nile Testnet olarak seç.");}
async function connect(){
 let w=window.tronWeb||window.tron?.tronWeb||window.tronLink?.tronWeb;
 const p=window.tronLink||window.tron;
 if((!w?.ready||!w.defaultAddress?.base58)&&p?.request)await p.request({method:"tron_requestAccounts"});
 w=window.tronWeb||window.tron?.tronWeb||window.tronLink?.tronWeb;
 if(!w?.ready||!w.defaultAddress?.base58)throw Error("TronLink Discover üzerinden cüzdan bağlantısına izin ver.");
 assertNile(w);tw=w;return wallet();
}
async function verify(addr){
 if(!tw)throw Error("Önce cüzdanı bağla.");
 if(!tw.isAddress(addr))throw Error("V5 sözleşme adresi geçersiz.");
 const chain=await tw.trx.getContract(addr);
 if(!chain?.bytecode)throw Error("Bu adreste Nile sözleşmesi bulunamadı.");
 const c=await tw.contract(ABI,addr);
 if(asBig(await c.VERSION().call())!==5n)throw Error("Bu adres V5 sözleşmesi değil.");
 const m=address(value(await c.manager().call()));
 if(!tw.isAddress(m))throw Error("Yönetici adresi okunamadı.");
 contract=c;contractAddress=addr;manager=m;
 return {manager:m,nextId:asBig(await c.nextId().call())};
}
function requireReady(){if(!tw||!contract)throw Error("Önce V5 sözleşmesini doğrula.");}
async function readSwap(id){
 requireReady();const n=BigInt(id);if(n<=0n||n>=asBig(await contract.nextId().call()))throw Error("Bu takas numarası bulunamadı.");
 const response=await fetch("https://nile.trongrid.io/wallet/triggerconstantcontract",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({owner_address:tw.address.toHex(wallet()),contract_address:tw.address.toHex(contractAddress),function_selector:"getSwap(uint256)",parameter:n.toString(16).padStart(64,"0"),visible:false})});
 if(!response.ok)throw Error("Nile durum sorgusu başarısız (HTTP "+response.status+").");
 const result=await response.json();const raw=result.constant_result?.[0];
 if(!result.result?.result||typeof raw!=="string"||raw.length!==names.length*64||!/^[0-9a-f]+$/i.test(raw))throw Error("Zincirdeki V5 takas bilgisi okunamadı.");
 const words=raw.match(/.{64}/g),d={};
 names.forEach((name,i)=>{const v=BigInt("0x"+words[i]);d[name]=(i<4||i===11)?(v===0n?ZERO:tw.address.fromHex("41"+words[i].slice(-40))):bools.has(name)?v===1n:v;});
 return d;
}
async function asset(token){
 requireReady();if(native(token))return {address:tw.address.fromHex(ZERO),dp:6,symbol:"TRX",token:null};
 const a=address(token),t=await tw.contract(TOKEN_ABI,a);
 const dp=Number(asBig(await t.decimals().call()));
 if(!Number.isInteger(dp)||dp<0||dp>30)throw Error("Token decimals geçersiz (0–30).");
 let symbol="TRC20";try{symbol=value(await t.symbol().call()).slice(0,16)}catch{}
 return {address:a,dp,symbol,token:t};
}
async function waitTx(txid){
 if(!/^[0-9a-f]{64}$/i.test(String(txid)))throw Error("İşlem kimliği alınamadı.");
 for(let i=0;i<30;i++){
  const info=await tw.trx.getTransactionInfo(txid).catch(()=>null);
  if(info&&info.id){
   if(info.receipt?.result&&info.receipt.result!=="SUCCESS")throw Error("Zincir işlemi başarısız: "+info.receipt.result+" · "+txid);
   return txid;
  }
  await new Promise(r=>setTimeout(r,2000));
 }
 throw Error("İşlem gönderildi ancak henüz doğrulanmadı. Yeniden göndermeden önce TronScan'de kontrol et: "+txid);
}
async function send(method,opts){requireReady();const id=await method.send(Object.assign({feeLimit:FEE_LIMIT},opts||{}));await waitTx(id);return id;}
function baseLink(file){return new URL("./"+file,window.location.href);}
function links(id){requireReady();const mk=(file,role)=>{const u=baseLink(file);u.searchParams.set("contract",contractAddress);u.searchParams.set("id",String(id));if(role)u.searchParams.set("role",String(role));return u.toString()};return {a:mk("v5-nile-katilimci.html",1),b:mk("v5-nile-katilimci.html",2),manager:mk("v5-nile-yonetici.html")};}
function net(d){const fee=d.feePayer===0n?0n:d.feeAmount;return {forA:d.amountB-(d.feePayer===2n?fee:0n),forB:d.amountA-(d.feePayer===1n?fee:0n)};}
function feeMatches(d){return d.feePayer===0n||same(d.feePayer===1n?d.tokenA:d.tokenB,d.feeAsset);}
window.V5={ZERO,FEE_LIMIT,connect,verify,readSwap,asset,units,format,asBig,value,address,toHex,native,same,wallet,send,waitTx,links,net,feeMatches,contract:()=>contract,manager:()=>manager,contractAddress:()=>contractAddress,tron:()=>tw};
})();
