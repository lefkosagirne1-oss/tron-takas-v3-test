// Read-only local TRON VM smoke test; no Nile transaction or wallet is used.
// This supplements Ganache tests but does NOT prove on-chain Nile deployment.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {id} from "ethers";
import {createTVM} from "@tvmjs/tvm";
import {Common,TronNile} from "@tvmjs/common";
import {hexToBytes,bytesToHex} from "@tvmjs/util";

const artifact=JSON.parse(readFileSync(new URL("../v6-test/dist/TakasV8Invite.json",import.meta.url),"utf8"));
assert.equal(artifact.compiler,"tron-solc 0.8.31");
assert.equal(artifact.network,"Nile");
assert.match(artifact.runtimeBytecode,/^[0-9a-f]+$/i);
const common=new Common({chain:TronNile});
assert.equal(common.chainId(),3448148188n);
assert.equal(common.isTron(),true);
const tvm=await createTVM({common});
for(const [selector,expected] of [["inviteVersion()",8n],["DEPOSIT_WINDOW()",900n],["FINAL_WINDOW()",300n]]){
 const result=await tvm.runCode({
  code:hexToBytes("0x"+artifact.runtimeBytecode),
  data:hexToBytes(id(selector).slice(0,10)),
  gasLimit:5_000_000n,
 });
 assert.equal(result.exceptionError,undefined,selector+": TVM exception");
 assert.ok(result.returnValue?.length===32,selector+": expected uint256 result");
 const value=BigInt(bytesToHex(result.returnValue));
 assert.equal(value,expected,selector+": wrong TRON VM result");
 console.log("Nile TVM local bytecode OK:",selector,"=",value.toString(),"Energy",result.executionGasUsed.toString());
}
console.log("Only local TRON VM execution. No Nile deployment or real swap.");
