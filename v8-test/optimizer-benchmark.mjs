// Deployment-cost experiment only: official tron-solc + local Nile TVM.
// No wallet signature, RPC broadcast, or on-chain transaction.
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
assert.match(compiler.version(),/^0\\.8\\.31/);
const source=readFileSync(new URL("../contracts/TakasV8Invite.sol",import.meta.url),"utf8");
const reference=JSON.parse(readFileSync(new URL("../v6-test/dist/TakasV8Invite.json",import.meta.url),"utf8"));
assert.equal(reference.compiler,"tron-solc 0.8.31");
const input={
 language:"Solidity",sources:{"TakasV8Invite.sol":{content:source}},
 settings:{optimizer:{enabled:true,runs:1},evmVersion:"paris",viaIR:true,
  outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}}
};
const output=JSON.parse(compiler.compile(JSON.stringify(input)));
const errors=(output.errors||[]).filter(x=>x.severity==="error");
assert.deepEqual(errors.map(x=>x.formattedMessage),[]);
const optimized=output.contracts?.["TakasV8Invite.sol"]?.TakasV8Invite?.evm?.bytecode?.object;
assert.match(optimized||"",/^[0-9a-f]+$/i);
const manager=createAddressFromString("0x"+"11".repeat(20));
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
const [originalEnergy,optimizedEnergy]=await Promise.all([
 measure(reference.bytecode),measure(optimized)
]);
console.log(JSON.stringify({
 network:"local TVM TronNile (NOT real Nile)",compiler:"tron-solc 0.8.31",
 original:{runs:200,bytes:reference.bytecode.length/2,energy:originalEnergy.toString()},
 experiment:{runs:1,bytes:optimized.length/2,energy:optimizedEnergy.toString()},
 energyDelta:(optimizedEnergy-originalEnergy).toString()
},null,2));
console.log("Benchmark only. No deployed artifact or contract was changed.");
