// Local TVMJS stateful test with TRON Nile execution rules.
// It never broadcasts transactions or uses a real wallet.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import solc from "solc";
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
// The browser validates every immutable manager slot in deployed runtime.
// Verify the official TRON compiler actually patches all slots identically.
const deployedRuntime=bytesToHex(await tvm.stateManager.getContractCode(contract)).replace(/^0x/,"").toLowerCase();
assert.equal(deployedRuntime.length,artifact.runtimeBytecode.length,"Runtime length mismatch");
const managerSlot="0".repeat(24)+"11".repeat(20);
const managerReferences=Object.values(artifact.immutableReferences).flat();
assert.ok(managerReferences.length>1,"Manager immutable references missing");
for(const ref of managerReferences){
 assert.equal(ref.length,32,"Unexpected immutable manager slot length");
 assert.equal(deployedRuntime.slice(ref.start*2,(ref.start+ref.length)*2),managerSlot,
  "Constructor must patch every immutable manager slot consistently");
}
console.log("Local Nile TVM deployed runtime: all",managerReferences.length,"manager immutable slots match.");
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
const balance=async who=>(await tvm.stateManager.getAccount(who))?.balance??0n;
assert.equal(await balance(alice),200_000_000n,"A must receive full B deposit");
assert.equal(await balance(bob),50_000_000n,"B must receive A deposit minus 50 TRX fee");
assert.equal(await balance(manager),50_000_000n,"Manager must receive fee only on success");

// Separate deal: one participant deposits; after 15 minutes they reclaim it.
await call(manager,contract,"create",[0,0n,sha(secretA),sha(secretB)],10,1030);
await call(alice,contract,"commitRole",[2,1,commitment(secretA,alice)],11,1033);
await call(alice,contract,"deposit",[2,1,zero,1_000_000n,"0x"+secretA.toString("hex")],12,1036,1_000_000n);
await call(alice,contract,"refund",[2],13,1937);
state=(await call(manager,contract,"getDeal",[2],14,1940))[0];
assert.equal(state.refundedA,true);
assert.equal(await balance(alice),200_000_000n,"Timed-out A deposit must be fully refunded");
// Both sides deposit, but manager misses the five-minute window.
// Both deposits must be refunded and the manager must NOT receive another fee.
await call(manager,contract,"create",[2,50_000_000n,sha(secretA),sha(secretB)],15,1943);
await call(alice,contract,"commitRole",[3,1,commitment(secretA,alice)],16,1946);
await call(bob,contract,"commitRole",[3,2,commitment(secretB,bob)],16,1946);
await call(alice,contract,"deposit",[3,1,zero,100_000_000n,"0x"+secretA.toString("hex")],17,1949,100_000_000n);
await call(bob,contract,"deposit",[3,2,zero,200_000_000n,"0x"+secretB.toString("hex")],18,1952,200_000_000n);
await call(alice,contract,"refund",[3],19,2253);
await call(bob,contract,"refund",[3],20,2256);
state=(await call(manager,contract,"getDeal",[3],21,2259))[0];
assert.equal(state.refundedA,true);
assert.equal(state.refundedB,true);
assert.equal(state.completed,false);
assert.equal(await balance(manager),50_000_000n,"Expired swap must not charge B fee");
assert.equal(await balance(alice),200_000_000n,"Expired A deposit must be refunded");
assert.equal(await balance(bob),200_000_000n,"Expired B deposit must be refunded");
console.log("Local Nile TVM full TRX/TRX escrow and timeout refund OK; deploy Energy",deployed.execResult.executionGasUsed.toString());
console.log("No Nile broadcast, no wallet signature, no on-chain swap.");


// The mock TRC20 is compiled with the SAME pinned official TRON compiler.
// Exercise real TVM CALL / STATICCALL / transferFrom / transfer and native fee
// transfers, not just the EVM/Ganache equivalent.
const require=createRequire(import.meta.url);
const tronSolc=solc.setupMethods(require(fileURLToPath(new URL("../v6-test/.cache/tron-soljson.cjs",import.meta.url))));
assert.ok(tronSolc.version().startsWith("0.8.31"),"Official TRON compiler required for token TVM test");
const tokenSource=`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract LocalTRC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public transferFeePercent;
    function setTransferFeePercent(uint256 percent) external {
        require(percent < 100, "fee");
        transferFeePercent = percent;
    }
    function mint(address who, uint256 amount) external { balanceOf[who] += amount; }
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount; return true;
    }
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount;
        uint256 credited = amount * (100 - transferFeePercent) / 100;
        balanceOf[to] += credited;
        balanceOf[address(0)] += amount - credited;
        return true;
    }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount && allowance[from][msg.sender] >= amount, "allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        uint256 credited = amount * (100 - transferFeePercent) / 100;
        balanceOf[to] += credited;
        balanceOf[address(0)] += amount - credited;
        return true;
    }
}`;
const tokenInput={language:"Solidity",sources:{"LocalTRC20.sol":{content:tokenSource}},settings:{
 optimizer:{enabled:true,runs:200},evmVersion:"paris",viaIR:true,
 outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}
}};
const tokenOutput=JSON.parse(tronSolc.compile(JSON.stringify(tokenInput)));
assert.deepEqual((tokenOutput.errors||[]).filter(x=>x.severity==="error").map(x=>x.formattedMessage),[]);
const tokenArtifact=tokenOutput.contracts["LocalTRC20.sol"].LocalTRC20;
const tokenIface=new Interface(tokenArtifact.abi);
const tokenDeployment=expectSuccess(await tvm.runCall({
 caller:manager,origin:manager,data:hexToBytes("0x"+tokenArtifact.evm.bytecode.object),
 gasLimit:20_000_000n,rootTransactionId:txid(2),skipBalance:true,block:block(22,2262),
}),"deploy TRC20");
assert.ok(tokenDeployment.createdAddress,"Local TVM token deployment missing");
const token=tokenDeployment.createdAddress;
async function tokenCall(caller,fn,args,n,t){
 const result=expectSuccess(await tvm.runCall({
  caller,origin:caller,to:token,data:hexToBytes(tokenIface.encodeFunctionData(fn,args)),
  gasLimit:10_000_000n,skipBalance:true,block:block(n,t),
 }),"TRC20 "+fn);
 return tokenIface.decodeFunctionResult(fn,bytesToHex(result.execResult.returnValue));
}
const tokenBalance=async who=>(await tokenCall(manager,"balanceOf",[who.toString()],31,2300))[0];
const tokenAddress=token.toString();

// B pays a 50 TRX fee while sending TRC20: the whole token amount must go to A.
// The extra 50 TRX must reach the manager ONLY after finalize.
await call(manager,contract,"create",[2,50_000_000n,sha(secretA),sha(secretB)],23,2265);
await tokenCall(manager,"mint",[bob.toString(),200n],24,2268);
await tokenCall(bob,"approve",[contract.toString(),200n],25,2271);
await call(alice,contract,"commitRole",[4,1,commitment(secretA,alice)],26,2274);
await call(bob,contract,"commitRole",[4,2,commitment(secretB,bob)],26,2274);
const beforeTokenFee=await balance(manager);
await call(alice,contract,"deposit",[4,1,zero,100_000_000n,"0x"+secretA.toString("hex")],27,2277,100_000_000n);
await call(bob,contract,"deposit",[4,2,tokenAddress,200n,"0x"+secretB.toString("hex")],28,2280,50_000_000n);
assert.equal(await tokenBalance(contract),200n,"TRC20 amount must reach escrow");
assert.equal(await balance(manager),beforeTokenFee,"Manager must not receive token payer fee before finalization");
await call(manager,contract,"finalize",[4],29,2283);
assert.equal(await tokenBalance(alice),200n,"A must receive all 200 TRC20 units");
assert.equal(await tokenBalance(contract),0n,"Escrow must not retain swapped token");
assert.equal(await balance(manager)-beforeTokenFee,50_000_000n,"Manager receives exactly 50 TRX fee on success");
assert.equal((await call(manager,contract,"getDeal",[4],30,2286))[0].completed,true);

// Token payer alone: after 15 minutes both TRC20 and the separate native TRX
// fee are refunded. Manager receives no fee on failed deal.
await call(manager,contract,"create",[2,50_000_000n,sha(secretA),sha(secretB)],32,2310);
await tokenCall(manager,"mint",[bob.toString(),75n],33,2313);
await tokenCall(bob,"approve",[contract.toString(),75n],34,2316);
await call(bob,contract,"commitRole",[5,2,commitment(secretB,bob)],35,2319);
const beforeRefundToken=await tokenBalance(bob);
const beforeRefundTrx=await balance(bob);
const beforeRefundManager=await balance(manager);
await call(bob,contract,"deposit",[5,2,tokenAddress,75n,"0x"+secretB.toString("hex")],36,2322,50_000_000n);
assert.equal(await tokenBalance(contract),75n,"Failed-deal TRC20 remains in escrow before refund");
await call(bob,contract,"refund",[5],37,3223);
assert.equal(await tokenBalance(bob),beforeRefundToken,"B must recover all TRC20 tokens");
assert.equal(await tokenBalance(contract),0n,"Refund must empty token escrow");
assert.equal(await balance(bob),beforeRefundTrx,"B must recover entire separate TRX fee");
assert.equal(await balance(manager),beforeRefundManager,"No manager fee on expired TRC20 swap");
assert.equal((await call(manager,contract,"getDeal",[5],38,3226))[0].refundedB,true);
console.log("Official tron-solc mock TRC20 local Nile TVM fee finalize and fee+token timeout refund OK.");
console.log("Only local TVM tests: no real Nile deployment, signature, or transaction.");

// A fee-on-transfer token must NOT let the escrow mark a deposit as funded
// when fewer tokens actually arrive. The extra native fee must not be trapped.
await call(manager,contract,"create",[2,50_000_000n,sha(secretA),sha(secretB)],39,3230);
await tokenCall(manager,"mint",[bob.toString(),100n],40,3233);
await tokenCall(bob,"approve",[contract.toString(),100n],41,3236);
await tokenCall(manager,"setTransferFeePercent",[10n],42,3239);
await call(bob,contract,"commitRole",[6,2,commitment(secretB,bob)],43,3242);
const beforeBadToken=await tokenBalance(bob);
const beforeBadEscrow=await tokenBalance(contract);
const beforeBadTrx=await balance(bob);
const beforeBadManager=await balance(manager);
await assert.rejects(
  ()=>call(bob,contract,"deposit",[6,2,tokenAddress,100n,"0x"+secretB.toString("hex")],44,3245,50_000_000n),
  /deposit:/,
  "Fee-on-transfer token deposit must revert on short receipt"
);
const rejected=(await call(manager,contract,"getDeal",[6],45,3248))[0];
assert.equal(rejected.depositedB,false,"Failed token deposit must not claim a funded role");
assert.equal(rejected.depositDeadline,0n,"Failed token deposit must not start the timer");
assert.equal(await tokenBalance(bob),beforeBadToken,"Failed token deposit must not burn sender balance");
assert.equal(await tokenBalance(contract),beforeBadEscrow,"Failed token deposit must not credit escrow");
assert.equal(await balance(bob),beforeBadTrx,"Failed token deposit must not trap the extra TRX fee");
assert.equal(await balance(manager),beforeBadManager,"Manager must not receive a fee on failed deposit");
console.log("Local Nile TVM fee-on-transfer underfunding rejection and atomic rollback OK.");


// Outgoing fee-on-transfer must not silently short-pay A after B has deposited.
// The entire manager finalize must revert atomically, including the preceding
// native-TRX transfer, and a normal finalize remains possible after fee removal.
await tokenCall(manager,"setTransferFeePercent",[0n],46,3251);
await call(manager,contract,"create",[2,50_000_000n,sha(secretA),sha(secretB)],47,3254);
await tokenCall(manager,"mint",[bob.toString(),100n],48,3257);
await tokenCall(bob,"approve",[contract.toString(),100n],49,3260);
await call(alice,contract,"commitRole",[7,1,commitment(secretA,alice)],50,3263);
await call(bob,contract,"commitRole",[7,2,commitment(secretB,bob)],50,3263);
await call(alice,contract,"deposit",[7,1,zero,100_000_000n,"0x"+secretA.toString("hex")],51,3266,100_000_000n);
await call(bob,contract,"deposit",[7,2,tokenAddress,100n,"0x"+secretB.toString("hex")],52,3269,50_000_000n);
const outgoingEscrowBefore=await tokenBalance(contract);
const outgoingAliceBefore=await tokenBalance(alice);
const outgoingBobTrxBefore=await balance(bob);
const outgoingManagerBefore=await balance(manager);
await tokenCall(manager,"setTransferFeePercent",[10n],53,3272);
await assert.rejects(
  ()=>call(manager,contract,"finalize",[7],54,3275),
  /finalize:/,
  "Outgoing fee-on-transfer must not complete a short-paid swap"
);
assert.equal((await call(manager,contract,"getDeal",[7],55,3278))[0].completed,false,
 "Failed finalize must leave the deal open for refund or retry");
assert.equal(await tokenBalance(contract),outgoingEscrowBefore,
 "Failed finalize must restore escrow token balance");
assert.equal(await tokenBalance(alice),outgoingAliceBefore,
 "Failed finalize must not short-pay A");
assert.equal(await balance(bob),outgoingBobTrxBefore,
 "Failed finalize must roll back prior native-TRX transfer to B");
assert.equal(await balance(manager),outgoingManagerBefore,
 "Failed finalize must not pay manager fee");
await tokenCall(manager,"setTransferFeePercent",[0n],56,3281);
await call(manager,contract,"finalize",[7],57,3284);
assert.equal((await call(manager,contract,"getDeal",[7],58,3287))[0].completed,true);
assert.equal(await tokenBalance(alice),outgoingAliceBefore+100n);
assert.equal(await balance(manager),outgoingManagerBefore+50_000_000n);
console.log("Local Nile TVM outgoing fee-on-transfer finalize rollback and retry OK.");
