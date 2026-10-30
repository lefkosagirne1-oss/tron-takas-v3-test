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

function compileVariant({runs,viaIR,stripMetadata}){
 const input={
  language:"Solidity",sources:{"TakasV8Invite.sol":{content:source}},
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
const results=[{name:"published",runs:200,viaIR:true,stripMetadata:false,bytes:reference.bytecode.length/2,energy:baselineEnergy.toString(),deltaEnergy:"0"}];
for(const variant of [
 {name:"runs-1",runs:1,viaIR:true,stripMetadata:false},
 {name:"metadata-none",runs:200,viaIR:true,stripMetadata:true},
 {name:"runs-1-metadata-none",runs:1,viaIR:true,stripMetadata:true},
 {name:"legacy-codegen",runs:200,viaIR:false,stripMetadata:false},
 {name:"legacy-runs-1",runs:1,viaIR:false,stripMetadata:false},
 {name:"legacy-metadata-none",runs:200,viaIR:false,stripMetadata:true}
]){
 try{
  const bytecode=compileVariant(variant);
  const energy=await measure(bytecode);
  results.push({...variant,bytes:bytecode.length/2,energy:energy.toString(),deltaEnergy:(energy-baselineEnergy).toString()});
 }catch(e){
  results.push({...variant,error:String(e.message||e).slice(0,350)});
 }
}
console.log(JSON.stringify({network:"local TVM TronNile (NOT real Nile)",compiler:"tron-solc 0.8.31",results},null,2));
console.log("Benchmark only. No deployed artifact or contract was changed.");
