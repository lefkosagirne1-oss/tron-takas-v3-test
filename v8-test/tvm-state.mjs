// Local TVMJS stateful test with TRON Nile execution rules.
// It never broadcasts transactions or uses a real wallet.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {Interface} from "ethers";
import {createTVM} from "@tvmjs/tvm";
import {Common,TronNile} from "@tvmjs/common";
import {createBlock} from "@tvmjs/block";
import {createAddressFromString,hexToBytes,bytesToHex} from "@tvmjs/util";

const artifact=JSON.parse(readFileSync(new URL("../v6-test/dist/TakasV8Invite.json",import.meta.url),"utf8"));
const common=new Common({chain:TronNile});
const tvm=await createTVM({common});
const iface=new Interface(artifact.abi);
const manager=createAddressFromString("0x"+"11".repeat(20));
const alice=createAddressFromString("0x"+"22".repeat(20));
const bob=createAddressFromString("0x"+"33".repeat(20));
const block=(n,t)=>createBlock({header:{number:BigInt(n),timestamp:BigInt(t)}},{common});
const secretA=Buffer.alloc(32,0xaa),secretB=Buffer.alloc(32,0xbb);
const sha=data=>"0x"+createHash("sha256").update(data).digest("hex");
const commitment=(secret,wallet)=>sha(Buffer.concat([secret,Buffer.from(wallet.toString().slice(2),"hex")]));
const txid=n=>hexToBytes("0x"+n.toString(16).padStart(64,"0"));
function expectSuccess(r,label){
 if(r.execResult.exceptionError)throw Error(label+": "+r.execResult.exceptionError.error);
 return r;
}
async function call(caller,contract,fn,args,number,timestamp,value=0n){
 const result=await tvm.runCall({
  caller,origin:caller,to:contract,
  data:hexToBytes(iface.encodeFunctionData(fn,args)),
  gasLimit:10_000_000n,value,skipBalance:true,
  block:block(number,timestamp),
 });
 expectSuccess(result,fn);
 return iface.decodeFunctionResult(fn,bytesToHex(result.execResult.returnValue));
}
const deployed=expectSuccess(await tvm.runCall({
 caller:manager,origin:manager,data:hexToBytes("0x"+artifact.bytecode),
 gasLimit:20_000_000n,rootTransactionId:txid(1),skipBalance:true,block:block(1,1000),
}),"deploy");
assert.ok(deployed.createdAddress,"TRON contract address missing");
const contract=deployed.createdAddress;
assert.equal((await call(manager,contract,"inviteVersion",[],2,1003))[0],8n);
assert.equal((await call(manager,contract,"manager",[],2,1003))[0].toLowerCase(),manager.toString().toLowerCase());
assert.equal((await call(manager,contract,"nextId",[],2,1003))[0],1n);
await call(manager,contract,"create",[1,50_000_000n,sha(secretA),sha(secretB)],3,1006);
const deal=(await call(manager,contract,"getDeal",[1],4,1009))[0];
assert.equal(deal.feePayer,1n);
assert.equal(deal.feeAmount,50_000_000n);
await call(alice,contract,"commitRole",[1,1,commitment(secretA,alice)],5,1012);
await call(bob,contract,"commitRole",[1,2,commitment(secretB,bob)],5,1012);
const zero="0x"+"00".repeat(20);
await call(alice,contract,"deposit",[1,1,zero,100_000_000n,"0x"+secretA.toString("hex")],6,1015,100_000_000n);
await call(bob,contract,"deposit",[1,2,zero,200_000_000n,"0x"+secretB.toString("hex")],7,1018,200_000_000n);
let state=(await call(manager,contract,"getDeal",[1],8,1021))[0];
assert.equal(state.depositedA,true);
assert.equal(state.depositedB,true);
assert.equal(state.finalDeadline,1318n);
await call(manager,contract,"finalize",[1],8,1021);
state=(await call(manager,contract,"getDeal",[1],9,1024))[0];
assert.equal(state.completed,true);

// Separate deal: one participant deposits; after 15 minutes they reclaim it.
await call(manager,contract,"create",[0,0n,sha(secretA),sha(secretB)],10,1030);
await call(alice,contract,"commitRole",[2,1,commitment(secretA,alice)],11,1033);
await call(alice,contract,"deposit",[2,1,zero,1_000_000n,"0x"+secretA.toString("hex")],12,1036,1_000_000n);
await call(alice,contract,"refund",[2],13,1937);
state=(await call(manager,contract,"getDeal",[2],14,1940))[0];
assert.equal(state.refundedA,true);
console.log("Local Nile TVM full TRX/TRX escrow and timeout refund OK; deploy Energy",deployed.execResult.executionGasUsed.toString());
console.log("No Nile broadcast, no wallet signature, no on-chain swap.");
