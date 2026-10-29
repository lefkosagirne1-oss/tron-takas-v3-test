import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
import {webcrypto} from "node:crypto";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const common=read("takas-common.js");
const manager=read("takas-yonetici.html").match(/<script>([\s\S]*?)<\/script>/)[1];
const participant=read("takas-katilimci.html").match(/<script>([\s\S]*?)<\/script>/)[1];
const secretA="0x"+"11".repeat(32),secretB="0x"+"22".repeat(32);
async function sha(s){return "0x"+Buffer.from(await webcrypto.subtle.digest("SHA-256",Buffer.from(s.slice(2),"hex"))).toString("hex");}
async function make(page,secret=secretA,amount="100"){
 const els=new Map(),get=id=>{
  if(!els.has(id))els.set(id,{value:id==="asset"?"TRX":id==="amount"?amount:"",textContent:"",hidden:false,disabled:false});
  return els.get(id);
 };
 const owner="T"+"a".repeat(33),user="T"+"b".repeat(33);
 const deal={partyA:"0x"+"0".repeat(64),partyB:"0x"+"0".repeat(64),tokenA:"0x"+"0".repeat(64),tokenB:"0x"+"0".repeat(64),amountA:"0",amountB:"0",feeAmount:"50000000",feePayer:1,depositDeadline:"0",finalDeadline:"0",depositedA:false,depositedB:false,refundedA:false,refundedB:false,completed:false,cancelled:false,inviteHashA:await sha(secretA),inviteHashB:await sha(secretB)};
 let next=1n;const sent=[];
 const c={
  manager:()=>({call:async()=> "0x"+"1".repeat(40)}),
  inviteVersion:()=>({call:async()=>8}),
  nextId:()=>({call:async()=>next.toString()}),
  getDeal:()=>({call:async()=>deal}),
  create:(payer,fee,ha,hb)=>({send:async()=>{deal.feePayer=payer;deal.feeAmount=fee;deal.inviteHashA=ha;deal.inviteHashB=hb;next++;return "a".repeat(64);}}),
  deposit:(id,role,token,n,s)=>({send:async opts=>{sent.push({id,role,token,n,s,opts});deal.depositedA=true;deal.partyA="0x"+"2".repeat(40);return "a".repeat(64);}})
 };
 const tw={ready:true,fullNode:{host:"https://nile.trongrid.io"},defaultAddress:{base58:page==="manager"?owner:user},isAddress:()=>true,address:{fromHex:hex=>hex.endsWith("1".repeat(40))?owner:user},contract:async()=>c,trx:{getTransactionInfo:async()=>({receipt:{result:"SUCCESS"}}),getCurrentBlock:async()=>({block_header:{raw_data:{timestamp:1000000}}})}};
 const store=new Map();
 const ctx={crypto:webcrypto,window:{tronWeb:tw},document:{getElementById:get},location:{search:"?secure=1&contract=TE9jxbtjX4GczdpLfvmPnQ8YbDf6LZPB6a&id=1&role=1&secret="+encodeURIComponent(secret),href:"https://example.com/takas-"+(page==="manager"?"yonetici":"katilimci")+".html"},URL,URLSearchParams,BigInt,Number,String,console,setTimeout,clearTimeout,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},navigator:{clipboard:{writeText:async()=>{}}}};
 vm.createContext(ctx);vm.runInContext(common,ctx);vm.runInContext(page==="manager"?manager:participant,ctx);
 return {ctx,get,deal,sent};
}
test("secure frontend scripts parse and have V8 ABI",()=>{
 for(const s of [common,manager,participant])assert.doesNotThrow(()=>new vm.Script(s));
 assert.match(common,/"name":"inviteVersion"/);
 assert.match(common,/"name":"inviteSecret"/);
 assert.match(read("takas-kurulum.html"),/TakasV8Invite.json/);
});
test("manager creates distinct private A and B invitation URLs",async()=>{
 const x=await make("manager");
 x.get("payer").value="1";x.get("fee").value="50";
 await x.get("create").onclick();
 const a=new URL(x.get("a").value),b=new URL(x.get("b").value);
 assert.equal(a.searchParams.get("role"),"1");
 assert.equal(b.searchParams.get("role"),"2");
 assert.notEqual(a.searchParams.get("secret"),b.searchParams.get("secret"));
 assert.match(x.get("status").textContent,/bağlantıları hazır/);
 x.get("a").value="";await x.get("recover").onclick();
 assert.match(x.get("a").value,/secret=/);
});
test("valid A invite deposits 100 TRX with 50 TRX fee",async()=>{
 const x=await make("participant");
 await x.get("deposit").onclick();
 assert.equal(x.sent.length,1);
 assert.equal(x.sent[0].n,"100000000");
 assert.equal(x.sent[0].s,secretA);
});
test("B secret cannot be used on A invitation",async()=>{
 const x=await make("participant",secretB);
 await x.get("deposit").onclick();
 assert.equal(x.sent.length,0);
 assert.match(x.get("status").textContent,/davet anahtarı yanlış/);
});
test("30 TRX rejected before signing if commission is 50 TRX",async()=>{
 const x=await make("participant",secretA,"30");
 await x.get("deposit").onclick();
 assert.equal(x.sent.length,0);
 assert.match(x.get("status").textContent,/Komisyon 50 TRX/);
});


test("landing page routes only to secure V8 setup and saved manager",()=>{
 const home=read("index.html");
 assert.match(home,/takas-kurulum\.html/);
 assert.match(home,/takas-yonetici\.html\?secure=1/);
 assert.doesNotMatch(home,/href=["']\.\/v[45]-/);
});
test("deployment recovery persists V8 contract and decodes padded manager address",()=>{
 const setup=read("takas-kurulum.html");
 assert.match(setup,/function normalizeManager/);
 assert.match(setup,/localStorage\.setItem\(installedKey,addr\)/);
 assert.match(setup,/secure-takas-v8-contract/);
});

test("A can deposit TRX even if B already deposited TRX",async()=>{
 const x=await make("participant");
 x.deal.depositedB=true;
 x.deal.tokenB="0x"+"0".repeat(64);
 x.deal.partyB="0x"+"1".repeat(40);
 await x.get("deposit").onclick();
 assert.equal(x.sent.length,1);
 assert.equal(x.sent[0].n,"100000000");
});

test("Nile deployment requires official TRON compiler artifact",()=>{
 const setup=read("takas-kurulum.html");
 const workflow=read(".github/workflows/v6-tests.yml");
 const build=read("v6-test/build.mjs");
 assert.match(setup,/a\.compiler!=="tron-solc 0\.8\.31"/);
 assert.match(workflow,/tronprotocol\/solc-bin/);
 assert.match(workflow,/a45a82d014fadd6d8ea9086ecec221be5bcb5b93/);
 assert.match(build,/tronSolc\.compile/);
});

test("legacy V6/V7 create, deposit and finalize are disabled while refund remains accessible",()=>{
 const oldManager=read("v6-nile-yonetici.html");
 const oldParticipant=read("v6-nile-katilimci.html");
 assert.match(oldManager,/\$\("create"\)\.disabled=true/);
 assert.match(oldManager,/\$\("final"\)\.disabled=true/);
 assert.match(oldParticipant,/\$\("deposit"\)\.disabled=true/);
 assert.doesNotMatch(oldParticipant,/\$\("refund"\)\.disabled=true/);
 assert.match(oldParticipant,/\$\("refund"\)\.onclick/);
});
test("deployment estimate is bound to the selected TronLink wallet",()=>{
 const setup=read("takas-kurulum.html");
 assert.match(setup,/estimatedWallet=selectedWallet\(\)/);
 assert.match(setup,/estimatedWallet!==selectedWallet\(\)/);
});
