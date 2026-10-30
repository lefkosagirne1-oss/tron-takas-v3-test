// Unsigned deployment-cost matrix: official tron-solc + local Nile TVM.
// Experiments never change the published V8 artifact or broadcast a transaction.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {createTVM} from "@tvmjs/tvm";
import {Common,TronNile} from "@tvmjs/common";
import {createBlock} from "@tvmjs/block";
import {createAddressFromString,hexToBytes} from "@tvmjs/util";
import solc from "solc";

const require=createRequire(import.meta.url);
const compiler=solc.setupMethods(require("../v6-test/.cache/tron-soljson.cjs"));
assert.ok(compiler.version().startsWith("0.8.31"),"Official compiler version mismatch");
const source=readFileSync(new URL("../contracts/TakasV8Invite.sol",import.meta.url),"utf8");
const reference=JSON.parse(readFileSync(new URL("../v6-test/dist/TakasV8Invite.json",import.meta.url),"utf8"));
assert.equal(reference.compiler,"tron-solc 0.8.31");
const manager=createAddressFromString("0x"+"11".repeat(20));

// Compare revert-message bytecode costs without changing published V8 safety checks.
function compactRequireReasons(input, replacement=null){
 let scan=0, emitted=0, count=0, result="";
 while(true){
  const start=input.indexOf("require(",scan);
  if(start<0)break;
  let depth=1, quote="", escaped=false, comma=-1, p=start+"require(".length;
  for(;p<input.length;p++){
   const ch=input[p];
   if(quote){
    if(escaped)escaped=false;
    else if(ch==="\\")escaped=true;
    else if(ch===quote)quote="";
   }else if(ch==="'"||ch==='"')quote=ch;
   else if(ch==="(")depth++;
   else if(ch===")"){if(--depth===0)break;}
   else if(ch===","&&depth===1)comma=p;
  }
  if(depth!==0)throw Error("Unbalanced require in benchmark source");
  if(comma>=0&&/^"[^"]*"$/.test(input.slice(comma+1,p).trim())){
   const reason=input.slice(comma+1,p).trim().slice(1,-1);
   const shortReason=typeof replacement==="function"?replacement(count,reason):replacement;
   result+=input.slice(emitted,start)+input.slice(start,comma);
   result+=shortReason===null?")":", "+JSON.stringify(shortReason)+")";
   emitted=p+1;count++;
  }
  scan=p+1;
 }
 return {source:result+input.slice(emitted),count};
}
// Unique custom errors retain machine-readable failure identity while avoiding
// Solidity's ABI-encoded revert strings. Benchmark-only: no published contract changes.
function customErrorVariant(input){
 let scan=0,emitted=0,count=0,result="";
 const codes=new Map();
 while(true){
  const start=input.indexOf("require(",scan);
  if(start<0)break;
  let depth=1,quote="",escaped=false,comma=-1,p=start+"require(".length;
  for(;p<input.length;p++){
   const ch=input[p];
   if(quote){
    if(escaped)escaped=false;
    else if(ch==="\\")escaped=true;
    else if(ch===quote)quote="";
   }else if(ch==="'"||ch==='"')quote=ch;
   else if(ch==="(")depth++;
   else if(ch===")"){if(--depth===0)break;}
   else if(ch===","&&depth===1)comma=p;
  }
  if(depth!==0)throw Error("Unbalanced require in custom error benchmark");
  if(comma>=0&&/^"[^"]*"$/.test(input.slice(comma+1,p).trim())){
   const reason=input.slice(comma+1,p).trim().slice(1,-1);
   if(!codes.has(reason))codes.set(reason,"E"+codes.size.toString(36).toUpperCase().padStart(2,"0"));
   const condition=input.slice(start+"require(".length,comma);
   // Braces avoid dangling-else changes for one-line if (...) require(...); else ...
   result+=input.slice(emitted,start)+"{ if (!("+condition+")) revert "+codes.get(reason)+"(); }";
   emitted=p+1;count++;
  }
  scan=p+1;
 }
 const declarations=Array.from(codes.values(),code=>"    error "+code+"();").join("\n");
 result=(result+input.slice(emitted)).replace("contract TakasV8Invite {","contract TakasV8Invite {\n"+declarations);
 return {source:result,count,codes:Object.fromEntries(codes)};
}

function compileVariant({runs,viaIR,stripMetadata,sourceOverride}){
 const input={
  language:"Solidity",sources:{"TakasV8Invite.sol":{content:sourceOverride||source}},
  settings:{optimizer:{enabled:true,runs},evmVersion:"paris",viaIR,
   ...(stripMetadata?{metadata:{bytecodeHash:"none"}}:{}),
   outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}}
 };
 const output=JSON.parse(compiler.compile(JSON.stringify(input)));
 const errors=(output.errors||[]).filter(x=>x.severity==="error");
 if(errors.length)throw Error(errors.map(x=>x.formattedMessage).join("\n"));
 const bytecode=output.contracts?.["TakasV8Invite.sol"]?.TakasV8Invite?.evm?.bytecode?.object;
 assert.match(bytecode||"",/^[0-9a-f]+$/i);
 return bytecode;
}
async function measure(bytecode){
 const common=new Common({chain:TronNile});
 const tvm=await createTVM({common});
 const result=await tvm.runCall({
  caller:manager,origin:manager,data:hexToBytes("0x"+bytecode),
  gasLimit:20_000_000n,rootTransactionId:hexToBytes("0x"+"01".padStart(64,"0")),
  skipBalance:true,block:createBlock({header:{number:1n,timestamp:1000n}},{common}),
 });
 assert.equal(result.execResult.exceptionError,undefined,"Deployment must succeed in local TVM");
 assert.ok(result.createdAddress,"Deployed address required");
 return result.execResult.executionGasUsed;
}
const baselineEnergy=await measure(reference.bytecode);
const noReasons=compactRequireReasons(source);
const shortReasons=compactRequireReasons(source,"E");
const reasonCodeMap={};
const customErrors=customErrorVariant(source);
const uniqueReasons=compactRequireReasons(source,(index,reason)=>{
 const code=index.toString(36).toUpperCase().padStart(2,"0");
 assert.ok(!(code in reasonCodeMap),"Duplicate compact revert code");
 reasonCodeMap[code]=reason;
 return code;
});
assert.ok(noReasons.count>=15&&noReasons.count===shortReasons.count&&
 uniqueReasons.count===noReasons.count&&customErrors.count===noReasons.count,
 "Expected the same require strings in all experimental variants");
assert.equal(Object.keys(reasonCodeMap).length,uniqueReasons.count,
 "Every require reason must have its own compact UI-translatable code");
console.log("Experimental require message rewrites:",noReasons.count);
console.log("Unique short revert codes for future Turkish UI mapping:",JSON.stringify(reasonCodeMap));
const results=[{name:"published",runs:200,viaIR:true,stripMetadata:false,bytes:reference.bytecode.length/2,energy:baselineEnergy.toString(),deltaEnergy:"0"}];
for(const variant of [
 {name:"runs-1",runs:1,viaIR:true,stripMetadata:false},
 {name:"metadata-none",runs:200,viaIR:true,stripMetadata:true},
 {name:"runs-1-metadata-none",runs:1,viaIR:true,stripMetadata:true},
 {name:"legacy-codegen",runs:200,viaIR:false,stripMetadata:false},
 {name:"legacy-runs-1",runs:1,viaIR:false,stripMetadata:false},
 {name:"legacy-metadata-none",runs:200,viaIR:false,stripMetadata:true},
 {name:"require-no-reasons",runs:200,viaIR:true,stripMetadata:false,sourceOverride:noReasons.source},
 {name:"require-one-char-reasons",runs:200,viaIR:true,stripMetadata:false,sourceOverride:shortReasons.source},
 {name:"require-unique-two-char-codes",runs:200,viaIR:true,stripMetadata:false,sourceOverride:uniqueReasons.source},
 {name:"require-unique-custom-errors",runs:200,viaIR:true,stripMetadata:false,sourceOverride:customErrors.source}
]){
 try{
  const bytecode=compileVariant(variant);
  const energy=await measure(bytecode);
  const {sourceOverride,...metadata}=variant;
  results.push({...metadata,bytes:bytecode.length/2,energy:energy.toString(),deltaEnergy:(energy-baselineEnergy).toString()});
 }catch(e){
  const {sourceOverride,...metadata}=variant;
  results.push({...metadata,error:String(e.message||e).slice(0,350)});
 }
}
console.log(JSON.stringify({network:"local TVM TronNile (NOT real Nile)",compiler:"tron-solc 0.8.31",results},null,2));
console.log("Benchmark only. No deployed artifact or contract was changed.");
