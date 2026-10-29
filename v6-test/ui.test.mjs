import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const root=new URL("../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");
const common=read("v6-common.js");
const participant=read("v6-nile-katilimci.html").match(/<script>([\s\S]*?)<\/script>/)?.[1];
const manager=read("v6-nile-yonetici.html").match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(participant&&manager);
test("shared JS and both inline scripts parse",()=>{
 for(const s of [common,participant,manager])assert.doesNotThrow(()=>new vm.Script(s));
});
function context(script,role=1,amount="100"){
 const els=new Map();
 const get=id=>{
  if(!els.has(id))els.set(id,{id,value:id==="asset"?"TRX":id==="amount"?amount:"",textContent:"",hidden:false,disabled:false});
  return els.get(id);
 };
 const owner="T"+"a".repeat(33),user="T"+"b".repeat(33);
 const deal={partyA:"0x"+"0".repeat(64),partyB:"0x"+"0".repeat(64),tokenA:"0x"+"0".repeat(64),tokenB:"0x"+"0".repeat(64),amountA:"0",amountB:"0",feeAmount:"50000000",feePayer:1,depositDeadline:"0",finalDeadline:"0",depositedA:false,depositedB:false,refundedA:false,refundedB:false,completed:false,cancelled:false};
 let nextId=1n;
 const sent=[];
 const c={
  manager:()=>({call:async()=> "0x"+"1".repeat(40)}),
  nextId:()=>({call:async()=>nextId.toString()}),
  getDeal:()=>({call:async()=>deal}),
  create:(payer,fee)=>({send:async()=>{deal.feePayer=payer;deal.feeAmount=fee;nextId++;return "a".repeat(64);}}),
  deposit:(id,r,token,n)=>({send:async opts=>{sent.push({id,r,token,n,opts});if(r===1){deal.depositedA=true;deal.amountA=n;deal.partyA="0x"+"2".repeat(40);}return "a".repeat(64);}}),
  finalize:()=>({send:async()=>{deal.completed=true;return "a".repeat(64);}})
 };
 const tw={
  ready:true,fullNode:{host:"https://nile.trongrid.io"},defaultAddress:{base58:script==="manager"?owner:user},
  isAddress:()=>true,address:{fromHex:hex=>hex.endsWith("1".repeat(40))?owner:user},
  contract:async()=>c,
  trx:{getTransactionInfo:async()=>({receipt:{result:"SUCCESS"}}),getCurrentBlock:async()=>({block_header:{raw_data:{timestamp:1000000}}})}
 };
 const store=new Map();
 const ctx={window:{tronWeb:tw},document:{getElementById:get},location:{search:"?fixed=1&contract=TE9jxbtjX4GczdpLfvmPnQ8YbDf6LZPB6a&id=1&role="+role,href:"https://example.com/v6-nile-"+(script==="manager"?"yonetici":"katilimci")+".html"},URL,URLSearchParams,BigInt,Number,String,console,setTimeout,clearTimeout,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},navigator:{clipboard:{writeText:async()=>{}}}};
 vm.createContext(ctx);vm.runInContext(common,ctx);vm.runInContext(script==="manager"?manager:participant,ctx);
 return {get,deal,sent,ctx};
}
test("100 TRX minus 50 TRX fee is valid, 30 TRX is rejected before signing",async()=>{
 const good=context("participant",1,"100");
 await good.get("deposit").onclick();
 assert.equal(good.sent.length,1);
 assert.equal(good.sent[0].n,"100000000");
 assert.equal(good.sent[0].opts.callValue,"100000000");
 assert.match(good.get("status").textContent,/doğrulandı/i);
 const low=context("participant",1,"30");
 await low.get("deposit").onclick();
 assert.equal(low.sent.length,0);
 assert.match(low.get("status").textContent,/Komisyon 50 TRX/);
});
test("fee preview shows exact net TRX and no fee for non-payer",()=>{
 const ctx={window:{},document:{getElementById:()=>({})},location:{search:"",href:"https://example.com/"},URLSearchParams,URL,BigInt};
 vm.createContext(ctx);vm.runInContext(common,ctx);
 assert.match(vm.runInContext('netPreview("100","50000000",1,1,"TRX")',ctx),/Karşı tarafa: 50 TRX/);
 assert.match(vm.runInContext('netPreview("100","50000000",1,2,"TRX")',ctx),/Karşı tarafa: 100 TRX/);
 assert.match(vm.runInContext('netPreview("30","50000000",1,1,"TRX")',ctx),/üzerinde olmalı/);
});
test("zero address in deal is displayed safely",()=>{
 const ctx={window:{},document:{getElementById:()=>({})},location:{search:"",href:"https://example.com/"},URLSearchParams,URL,BigInt};
 vm.createContext(ctx);vm.runInContext(common,ctx);
 assert.equal(vm.runInContext('readableAddress("0x"+"0".repeat(64),{address:{fromHex:()=>{throw Error("should not decode zero")}}})',ctx),"—");
});
test("manager can create and reconstruct participant links",async()=>{
 const x=context("manager");
 x.get("payer").value="1";x.get("fee").value="50";
 await x.get("create").onclick();
 assert.match(x.get("a").value,/role=1/);
 assert.match(x.get("b").value,/role=2/);
 assert.equal(x.get("id").value,"1");
 x.get("a").value="";x.get("b").value="";
 await x.get("recover").onclick();
 assert.match(x.get("a").value,/role=1/);
});
