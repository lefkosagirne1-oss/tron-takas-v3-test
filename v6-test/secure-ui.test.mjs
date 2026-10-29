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
 let next=1n;const sent=[],commits=[];
 const c={
  manager:()=>({call:async()=> "0x"+"1".repeat(40)}),
  inviteVersion:()=>({call:async()=>8}),
  nextId:()=>({call:async()=>next.toString()}),
  getDeal:()=>({call:async()=>deal}),
  committedHash:()=>({call:async()=>commits.at(-1)?.hash||"0x"+"0".repeat(64)}),
  commitRole:(id,role,hash)=>({send:async()=>{commits.push({id,role,hash});return "a".repeat(64);}}),
  create:(payer,fee,ha,hb)=>({send:async()=>{deal.feePayer=payer;deal.feeAmount=fee;deal.inviteHashA=ha;deal.inviteHashB=hb;next++;return "a".repeat(64);}}),
  deposit:(id,role,token,n,s)=>({send:async opts=>{sent.push({id,role,token,n,s,opts});deal.depositedA=true;deal.partyA="0x"+"2".repeat(40);return "a".repeat(64);}})
 };
 const tokenContract={
  decimals:()=>({call:async()=>6}),
  balanceOf:()=>({call:async()=>"1000000000"}),
  allowance:()=>({call:async()=>"1000000000"}),
  approve:()=>({send:async()=>"a".repeat(64)})
 };
 const tw={ready:true,fullNode:{host:"https://nile.trongrid.io"},defaultAddress:{base58:page==="manager"?owner:user},isAddress:()=>true,address:{fromHex:hex=>hex.endsWith("1".repeat(40))?owner:user,toHex:addr=>"41"+(addr===owner?"1":"2").repeat(40)},contract:async(_abi,addr)=>addr==="TE9jxbtjX4GczdpLfvmPnQ8YbDf6LZPB6a"?c:tokenContract,trx:{getBalance:async()=>1000000000,getTransactionInfo:async()=>({receipt:{result:"SUCCESS"},blockNumber:100}),getCurrentBlock:async()=>({block_header:{raw_data:{timestamp:1000000,number:101}}})}};
 const store=new Map();
 const ctx={crypto:webcrypto,window:{tronWeb:tw},document:{getElementById:get},location:{search:"?secure=1&contract=TE9jxbtjX4GczdpLfvmPnQ8YbDf6LZPB6a&id=1&role=1&secret="+encodeURIComponent(secret),href:"https://example.com/takas-"+(page==="manager"?"yonetici":"katilimci")+".html"},URL,URLSearchParams,BigInt,Number,String,console,setTimeout,clearTimeout,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},navigator:{clipboard:{writeText:async()=>{}}}};
 ctx.fetch=async url=>({
  ok:true,
  json:async()=>String(url).includes("TakasV8Invite.json")
    ?JSON.parse(read("v6-test/dist/TakasV8Invite.json"))
    :{runtimecode:JSON.parse(read("v6-test/dist/TakasV8Invite.json")).runtimeBytecode}
 });
 vm.createContext(ctx);vm.runInContext(common,ctx);vm.runInContext(page==="manager"?manager:participant,ctx);
 return {ctx,get,deal,sent,commits,tw,tokenContract};
}
test("secure frontend scripts parse and have V8 ABI",()=>{
 for(const s of [common,manager,participant])assert.doesNotThrow(()=>new vm.Script(s));
 assert.match(common,/"name":"inviteVersion"/);
 assert.match(common,/"name":"inviteSecret"/);
 assert.match(common,/"name":"commitRole"/);
 assert.match(common,/"name":"committedHash"/);
 assert.match(read("takas-kurulum.html"),/TakasV8Invite.json/);
 assert.match(read("takas-kurulum.html"),/a\.abi\.some\(x=>x\.name==="commitRole"\)/);
 assert.match(read("takas-kurulum.html"),/a\.abi\.some\(x=>x\.name==="committedHash"\)/);
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

test("manager shows net amounts and fixed fee before final approval",async()=>{
 const x=await make("manager");
 x.get("id").value="1";
 x.deal.depositedA=true;x.deal.depositedB=true;
 x.deal.amountA="100000000";x.deal.amountB="200000000";
 x.deal.finalDeadline="1300";
 await x.get("check").onclick();
 const details=x.get("details").textContent;
 assert.match(details,/B'ye gidecek: 50 TRX/);
 assert.match(details,/A'ya gidecek: 200 TRX/);
 assert.match(details,/Komisyon: 50 TRX \(A öder/);
 assert.match(details,/Kalan süre: 5 dk/);
});

test("deployment recovery rejects a wallet connected outside Nile",()=>{
 const setup=read("takas-kurulum.html");
 assert.match(setup,/Doğrulama için TronLink ağını resmi Nile Testnet seç/);
 assert.match(setup,/nile\\\.trongrid\\\.io/);
});

test("deployment cannot be signed with zero or invalid Energy estimate",()=>{
 const setup=read("takas-kurulum.html");
 assert.match(setup,/e\.energy_required>0/);
 assert.match(setup,/triggerconstantcontract/);
 assert.match(setup,/fallback\.energy_used>0/);
 assert.match(setup,/if\(!estimatedEnergy\)throw Error/);
 assert.match(setup,/geçerli pozitif Energy tahmini alınamadı/);
});


test("V8 frontend deal ABI matches the official TRON artifact address types",()=>{
 const match=common.match(/const ABI=(\[[\s\S]*?\]);\s*const \$=/);
 assert.ok(match,"Frontend ABI not found");
 const ui=JSON.parse(match[1]);
 const compiled=JSON.parse(read("v6-test/dist/TakasV8Invite.json")).abi;
 for(const name of ["getDeal","create","deposit","commitRole","committedHash","finalize","refund","manager","inviteVersion"]){
  const actual=ui.find(x=>x.name===name);
  const official=compiled.find(x=>x.name===name);
  assert.ok(actual&&official,"Missing ABI function: "+name);
  assert.deepEqual(actual.inputs.map(x=>x.type),official.inputs.map(x=>x.type));
  assert.deepEqual(actual.outputs.map(x=>x.type),official.outputs.map(x=>x.type));
 }
 const uiFields=ui.find(x=>x.name==="getDeal").outputs[0].components.map(x=>[x.name,x.type]);
 const compiledFields=compiled.find(x=>x.name==="getDeal").outputs[0].components.map(x=>[x.name,x.type]);
 assert.deepEqual(uiFields,compiledFields);
});
test("V8 setup prevents duplicate deployments and verifies saved manager",()=>{
 const setup=read("takas-kurulum.html");
 assert.match(setup,/const installed=localStorage\.getItem\(installedKey\)/);
 assert.match(setup,/existing\.inviteVersion\(\)\.call\(\)/);
 assert.match(setup,/existing\.manager\(\)\.call\(\)/);
 assert.match(setup,/if\(localStorage\.getItem\(installedKey\)\)throw Error\("V8 sözleşmesi zaten kurulu/);
});


test("zero TRX address decodes as native asset for address-typed V8 ABI",async()=>{
 const x=await make("manager");
 const zero40="0x"+"0".repeat(40);
 const zero41="41"+"0".repeat(40);
 assert.equal(vm.runInContext("readableAddress("+JSON.stringify(zero40)+",window.tronWeb)",x.ctx),"—");
 assert.equal(vm.runInContext("readableAddress("+JSON.stringify(zero41)+",window.tronWeb)",x.ctx),"—");
 assert.equal(vm.runInContext("readableAddress(ZERO,window.tronWeb)",x.ctx),"—");
 x.get("id").value="1";
 x.deal.depositedA=true;x.deal.amountA="100000000";x.deal.tokenA=zero40;
 await x.get("check").onclick();
 assert.match(x.get("details").textContent,/yatırdı: 100 TRX/);
});


test("Nile deployment Energy check uses official read-only deploy simulation before fallback",()=>{
 const setup=read("takas-kurulum.html");
 const estimate=setup.match(/\$\("estimate"\)\.onclick=async\(\)=>\{([\s\S]*?)\};\$\("deploy"\)/)?.[1];
 assert.ok(estimate,"Energy estimate handler missing");
 assert.match(estimate,/transactionBuilder\?\.deployConstantContract/);
 assert.match(estimate,/ownerAddress:selectedWallet\(\),input:"0x"\+artifact\.bytecode,callValue:0,confirmed:false/);
 assert.match(estimate,/e\?\.result\?\.result===true/);
 assert.doesNotMatch(estimate,/\.sign\(|sendRawTransaction|broadcasttransaction/);
 assert.match(estimate,/if\(!estimatedEnergy\)throw Error/);
});


test("recovered deployment is tied to official bytecode and selected manager",()=>{
 const setup=read("takas-kurulum.html");
 assert.match(setup,/wallet\/gettransactionbyid/);
 assert.match(setup,/deployedCode!==expectedCode/);
 assert.match(setup,/deployedOwner!==String\(w\.address\.toHex\(selectedWallet\(\)\)\)\.replace\(/);
 assert.match(setup,/deployment\?\.type!=="CreateSmartContract"/);
});

test("participant commits wallet-bound invitation before sending deposit",async()=>{
 const x=await make("participant");
 await x.get("deposit").onclick();
 assert.equal(x.commits.length,1);
 assert.equal(x.commits[0].role,1);
 assert.equal(x.sent.length,1);
 const h=await webcrypto.subtle.digest("SHA-256",Buffer.concat([Buffer.from(secretA.slice(2),"hex"),Buffer.from("22".repeat(20),"hex")]));
 assert.equal(x.commits[0].hash,"0x"+Buffer.from(h).toString("hex"));
});
test("participant reuses a confirmed commitment without another signature",async()=>{
 const x=await make("participant");
 const hash=await vm.runInContext("hashWalletCommitment("+JSON.stringify(secretA)+",window.tronWeb)",x.ctx);
 x.commits.push({id:"1",role:1,hash});
 await x.get("deposit").onclick();
 assert.equal(x.commits.length,1);
 assert.equal(x.sent.length,1);
});

test("token-paying participant deposits token and separate refundable TRX fee",async()=>{
 const x=await make("participant");
 x.get("asset").value="OTHER";
 x.get("token").value="T"+"c".repeat(33);
 await x.get("deposit").onclick();
 assert.equal(x.commits.length,1);
 assert.equal(x.sent.length,1);
 assert.equal(x.sent[0].n,"100000000");
 assert.equal(x.sent[0].opts.callValue,"50000000");
 assert.equal(x.sent[0].token,x.get("token").value);
});
test("manager displays full token amount rather than subtracting TRX fee from token",async()=>{
 const x=await make("manager");
 x.get("id").value="1";
 x.deal.depositedA=true;x.deal.depositedB=true;
 x.deal.amountA="100000000";x.deal.amountB="200000000";
 x.deal.tokenA="0x"+"2".repeat(40);
 await x.get("check").onclick();
 assert.match(x.get("details").textContent,/B'ye gidecek: 100 token/);
 assert.match(x.get("details").textContent,/Komisyon: 50 TRX/);
});

test("V8 participant only offers TRX or explicit custom TRC20, without FRHN test branding",()=>{
 const page=read("takas-katilimci.html");
 assert.match(page,/<option value="TRX">TRX<\/option>/);
 assert.match(page,/<option value="OTHER">/);
 assert.doesNotMatch(page,/value="FRHN"|type==="FRHN"/);
 assert.doesNotMatch(read("takas-common.js"),/const FRHN=/);
});

test("V8 waits until a later Nile block before depositing after commitment",async()=>{
 const x=await make("participant");
 const result=await vm.runInContext('waitNextBlock(window.tronWeb,"a".repeat(64))',x.ctx);
 assert.equal(result,undefined);
 assert.match(read("takas-katilimci.html"),/await waitNextBlock\(tw,commitTx\)/);
});

test("insufficient TRX prevents commitment and deposit signatures",async()=>{
 const x=await make("participant");
 x.tw.trx.getBalance=async()=>parseInt("90000000",10);
 await x.get("deposit").onclick();
 assert.equal(x.commits.length,0);
 assert.equal(x.sent.length,0);
 assert.match(x.get("status").textContent,/TRX bakiyesi yetersiz/);
});
test("insufficient token balance prevents approve and commitment",async()=>{
 const x=await make("participant");
 x.get("asset").value="OTHER";
 x.get("token").value="T"+"c".repeat(33);
 x.tokenContract.balanceOf=()=>({call:async()=>"10"});
 await x.get("deposit").onclick();
 assert.equal(x.commits.length,0);
 assert.equal(x.sent.length,0);
 assert.match(x.get("status").textContent,/Token bakiyesi yetersiz/);
});
test("token payer needs separate TRX fee before approving token",async()=>{
 const x=await make("participant");
 x.get("asset").value="OTHER";
 x.get("token").value="T"+"c".repeat(33);
 x.tw.trx.getBalance=async()=>1000000;
 await x.get("deposit").onclick();
 assert.equal(x.commits.length,0);
 assert.equal(x.sent.length,0);
 assert.match(x.get("status").textContent,/TRX bakiyesi yetersiz/);
});

test("participant refuses signatures when selected TronLink wallet changes mid-flow",async()=>{
 const x=await make("participant");
 x.tw.trx.getBalance=async()=>{x.tw.defaultAddress.base58="T"+"c".repeat(33);return 1000000000;};
 await x.get("deposit").onclick();
 assert.equal(x.commits.length,0);
 assert.equal(x.sent.length,0);
 assert.match(x.get("status").textContent,/Cüzdan değişti/);
});
test("manager refuses to create when selected wallet changes after reading next deal id",async()=>{
 const x=await make("manager");
 x.get("payer").value="1";x.get("fee").value="50";
 const original=x.tw.contract;
 x.tw.contract=async(abi,addr)=>{
  const c=await original(abi,addr);
  if(addr==="TE9jxbtjX4GczdpLfvmPnQ8YbDf6LZPB6a"){
   return {...c,nextId:()=>({call:async()=>{x.tw.defaultAddress.base58="T"+"c".repeat(33);return "1";}})};
  }
  return c;
 };
 await x.get("create").onclick();
 assert.match(x.get("status").textContent,/Cüzdan değişti/);
 assert.equal(x.get("a").value,"");
 assert.equal(x.get("b").value,"");
});
test("V8 transaction sender enforces the expected wallet before TronLink signing",()=>{
 assert.match(common,/ensureWallet\(tw,opts\.expectedWallet\)/);
 assert.match(participant,/expectedWallet:expectedWallet|expectedWallet\}/);
 assert.match(manager,/send\(c\.finalize\(idValue\(\)\),\{expectedWallet\}\)/);
});

test("V8 refuses fake contract code even if its ABI, version and manager look valid",async()=>{
 const x=await make("participant");
 vm.runInContext('verifiedV8Code=""',x.ctx);
 x.ctx.fetch=async url=>({
  ok:true,
  json:async()=>String(url).includes("TakasV8Invite.json")
    ?JSON.parse(read("v6-test/dist/TakasV8Invite.json"))
    :{runtimecode:"0x60006000"}
 });
 await x.get("deposit").onclick();
 assert.equal(x.commits.length,0);
 assert.equal(x.sent.length,0);
 assert.match(x.get("status").textContent,/sözleşme kodu resmi V8 derlemesiyle eşleşmiyor/);
});
test("official TRON runtime bytecode is required before V8 signing",()=>{
 const build=read("v6-test/build.mjs");
 assert.match(build,/evm\.deployedBytecode\.object/);
 assert.match(common,/wallet\/getcontractinfo/);
 assert.match(common,/sameV8Runtime\(expected,actual,artifact\.immutableReferences\)/);
});

test("V8 runtime comparison permits only compiler-declared immutable manager offsets",async()=>{
 const x=await make("participant");
 const artifact=JSON.parse(read("v6-test/dist/TakasV8Invite.json"));
 const code=artifact.runtimeBytecode.toLowerCase();
 const refs=artifact.immutableReferences;
 assert.ok(Object.values(refs).flat().length>0,"Immutable manager slots must be recorded");
 const first=Object.values(refs).flat()[0];
 const start=first.start*2,length=first.length*2;
 const modified=code.slice(0,start)+"a".repeat(length)+code.slice(start+length);
 const good=vm.runInContext("sameV8Runtime("+JSON.stringify(code)+","+JSON.stringify(modified)+","+JSON.stringify(refs)+")",x.ctx);
 assert.equal(good,true);
 const outside=(start===0?length:0);
 const corrupted=code.slice(0,outside)+(code[outside]==="f"?"0":"f")+code.slice(outside+1);
 const bad=vm.runInContext("sameV8Runtime("+JSON.stringify(code)+","+JSON.stringify(corrupted)+","+JSON.stringify(refs)+")",x.ctx);
 assert.equal(bad,false);
});
