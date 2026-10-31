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

const artifact=JSON.parse(readFileSync(process.env.V8_TVM_ARTIFACT_PATH||new URL("../v6-test/dist/TakasV8Invite.json",import.meta.url),"utf8"));
assert.equal(artifact.contractName,"TakasV8Invite");
assert.equal(artifact.compiler,"tron-solc 0.8.31");
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
// Local TVM Energy observations, NOT an estimate of actual Nile billing.
const energySamples=new Map();
function recordEnergy(fn,args,value,result){
 if(!["create","commitRole","deposit","finalize","refund","cancelUnused"].includes(fn))return;
 const energy=result.execResult.executionGasUsed;
 if(typeof energy!=="bigint"||energy<=0n)throw Error("Missing local TVM Energy for "+fn);
 const kind=fn==="deposit"?( /^0x0{40}$/i.test(String(args[2]))?"deposit:TRX":value>0n?"deposit:TRC20+TRXfee":"deposit:TRC20" ):fn;
 const values=energySamples.get(kind)||[];
 values.push(energy);
 energySamples.set(kind,values);
}
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
 recordEnergy(fn,args,value,result);
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
const getCode=tvm.stateManager.getCode||tvm.stateManager.getContractCode;
assert.equal(typeof getCode,"function","TVM state manager must expose a runtime code reader");
const deployedRuntime=bytesToHex(await getCode.call(tvm.stateManager,contract)).replace(/^0x/,"").toLowerCase();
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
// Candidate-only regression: verify the ACTUAL TVM revert payload selectors,
// not just the compiler ABI, retain their correct Turkish explanations.
// Published V8 (string reverts) is intentionally unchanged.
if(artifact.errorSelectorsTr){
 const stranger=createAddressFromString("0x"+"44".repeat(20));
 const cases=[
  {sender:stranger,payer:0,fee:0n,a:sha(secretA),b:sha(secretB),reason:"Manager only"},
  {sender:manager,payer:0,fee:0n,a:"0x"+"00".repeat(32),b:sha(secretB),reason:"Invalid invitations"},
  {sender:manager,payer:3,fee:0n,a:sha(secretA),b:sha(secretB),reason:"Invalid fee"},
  {sender:manager,payer:0,fee:1n,a:sha(secretA),b:sha(secretB),reason:"Fee payer required"}
 ];
 for(const [index,scenario] of cases.entries()){
  const failed=await tvm.runCall({
   caller:scenario.sender,origin:scenario.sender,to:contract,
   data:hexToBytes(iface.encodeFunctionData("create",[scenario.payer,scenario.fee,scenario.a,scenario.b])),
   gasLimit:10_000_000n,skipBalance:true,block:block(3,1006+index)
  });
  assert.ok(failed.execResult.exceptionError,"Candidate call must revert: "+scenario.reason);
  const payload=bytesToHex(failed.execResult.returnValue||new Uint8Array());
  assert.match(payload,/^0x[0-9a-f]{8}$/i,"Candidate must return a 4-byte custom error selector");
  const translation=artifact.errorSelectorsTr[payload.toLowerCase()];
  assert.equal(translation?.reason,scenario.reason,"Actual TVM selector must map to the expected reason");
  assert.ok(translation.messageTr?.length>10,"Candidate must retain a meaningful Turkish error message");
 }
 assert.equal((await call(manager,contract,"nextId",[],3,1012))[0],1n,
  "Rejected candidate calls must not create a deal");
 console.log("Local Nile TVM candidate custom-error revert payloads and Turkish translations OK.");
}
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


// Both participants may select the SAME TRC20 contract. In that case the
// escrow must preserve each party's separately committed amount and the
// additional TRX fee must be paid exactly once, only on finalization.
await call(manager,contract,"create",[1,50_000_000n,sha(secretA),sha(secretB)],59,3290);
await tokenCall(manager,"mint",[alice.toString(),60n],60,3293);
await tokenCall(manager,"mint",[bob.toString(),90n],61,3296);
await tokenCall(alice,"approve",[contract.toString(),60n],62,3299);
await tokenCall(bob,"approve",[contract.toString(),90n],63,3302);
await call(alice,contract,"commitRole",[8,1,commitment(secretA,alice)],64,3305);
await call(bob,contract,"commitRole",[8,2,commitment(secretB,bob)],64,3305);
const sameTokenAliceBefore=await tokenBalance(alice);
const sameTokenBobBefore=await tokenBalance(bob);
const sameTokenManagerBefore=await balance(manager);
const sameTokenEscrowBefore=await tokenBalance(contract);
await call(alice,contract,"deposit",[8,1,tokenAddress,60n,"0x"+secretA.toString("hex")],65,3308,50_000_000n);
await call(bob,contract,"deposit",[8,2,tokenAddress,90n,"0x"+secretB.toString("hex")],66,3311);
assert.equal(await tokenBalance(contract),sameTokenEscrowBefore+150n,"Same-token escrow must hold both deposits");
assert.equal(await balance(manager),sameTokenManagerBefore,"Same-token fee must remain escrowed before finalization");
await call(manager,contract,"finalize",[8],67,3314);
assert.equal(await tokenBalance(alice),sameTokenAliceBefore-60n+90n,"A receives B's full same-token amount");
assert.equal(await tokenBalance(bob),sameTokenBobBefore-90n+60n,"B receives A's full same-token amount");
assert.equal(await tokenBalance(contract),sameTokenEscrowBefore,"Same-token escrow must return to starting balance");
assert.equal(await balance(manager)-sameTokenManagerBefore,50_000_000n,"A's TRX fee paid once on success");
assert.equal((await call(manager,contract,"getDeal",[8],68,3317))[0].completed,true);
console.log("Official tron-solc local Nile TVM same-TRC20 two-party swap and A native fee OK.");


// Regression: a token owner can switch transfer taxes AFTER escrow funding.
// The exact-recipient check correctly rejects a short-paid refund atomically,
// but funds cannot be recovered until the token owner restores standard transfers.
// This is a genuine limitation of accepting arbitrary mutable TRC20 contracts.
await call(manager,contract,"create",[2,50_000_000n,sha(secretA),sha(secretB)],69,3320);
await tokenCall(manager,"mint",[bob.toString(),40n],70,3323);
await tokenCall(bob,"approve",[contract.toString(),40n],71,3326);
await call(bob,contract,"commitRole",[9,2,commitment(secretB,bob)],72,3329);
const dynamicFeeBobTokenBefore=await tokenBalance(bob);
const dynamicFeeBobTrxBefore=await balance(bob);
const dynamicFeeManagerBefore=await balance(manager);
await call(bob,contract,"deposit",[9,2,tokenAddress,40n,"0x"+secretB.toString("hex")],73,3332,50_000_000n);
await tokenCall(manager,"setTransferFeePercent",[10n],74,3335);
await assert.rejects(
  ()=>call(bob,contract,"refund",[9],75,4233),
  /refund:/,
  "Token owner changing outgoing tax must not cause a partial refund"
);
assert.equal((await call(manager,contract,"getDeal",[9],76,4236))[0].refundedB,false,
  "Failed taxed refund must remain retryable");
assert.equal(await tokenBalance(contract),40n,"Failed refund must keep all tokens in escrow");
assert.equal(await balance(manager),dynamicFeeManagerBefore,"Failed refund must never pay manager");
await tokenCall(manager,"setTransferFeePercent",[0n],77,4239);
await call(bob,contract,"refund",[9],78,4242);
assert.equal(await tokenBalance(bob),dynamicFeeBobTokenBefore,"Tax removed: full token refund must succeed");
assert.equal(await balance(bob),dynamicFeeBobTrxBefore,"Tax removed: extra TRX fee must be fully refunded");
assert.equal((await call(manager,contract,"getDeal",[9],79,4245))[0].refundedB,true);
console.log("Local Nile TVM mutable-token tax: atomic failed refund, then full retry after tax removal OK.");
console.log("Release caveat: arbitrary token issuer may permanently block refunds by changing transfer behavior.");


// Security regression: an invitation is bound to the wallet that committed
// in an EARLIER block. A same-block commitment cannot be used for deposit,
// and a different wallet cannot take an already-funded role after the secret
// becomes public in the successful deposit transaction.
const stranger=createAddressFromString("0x"+"44".repeat(20));
await call(manager,contract,"create",[0,0n,sha(secretA),sha(secretB)],80,4248);
await call(stranger,contract,"commitRole",[10,1,commitment(secretA,stranger)],81,4251);
await assert.rejects(
 ()=>call(stranger,contract,"deposit",[10,1,zero,1_000_000n,"0x"+secretA.toString("hex")],81,4251,1_000_000n),
 /deposit:/,
 "Same-block commitment must not authorize a deposit"
);
let roleState=(await call(manager,contract,"getDeal",[10],82,4254))[0];
assert.equal(roleState.depositedA,false,"Same-block failed deposit must not bind role A");
assert.equal(roleState.depositDeadline,0n,"Same-block failed deposit must not start the timer");
// runCall(skipBalance:true) does not model the rejected caller-value debit;
// assert escrow state rather than simulator-injected caller balances.
await call(alice,contract,"commitRole",[10,1,commitment(secretA,alice)],83,4257);
const escrowBeforeInvite=await balance(contract);
await call(alice,contract,"deposit",[10,1,zero,1_000_000n,"0x"+secretA.toString("hex")],84,4260,1_000_000n);
await assert.rejects(
 ()=>call(stranger,contract,"commitRole",[10,1,commitment(secretA,stranger)],85,4263),
 /commitRole:/,
 "Revealed invitation must not allow another wallet to commit to occupied role"
);
await assert.rejects(
 ()=>call(stranger,contract,"deposit",[10,1,zero,1_000_000n,"0x"+secretA.toString("hex")],86,4266,1_000_000n),
 /deposit:/,
 "Previously committed stranger must not replace funded A"
);
roleState=(await call(manager,contract,"getDeal",[10],87,4269))[0];
assert.equal(roleState.partyA.toLowerCase(),alice.toString().toLowerCase(),"Funded role owner must remain Alice");
assert.equal(roleState.depositedB,false,"Attacker must not fill unrelated role");
await call(alice,contract,"refund",[10],88,5161);
assert.equal(await balance(contract),escrowBeforeInvite,"Escrow must return all timed-out principal");
assert.equal((await call(manager,contract,"getDeal",[10],89,5164))[0].refundedA,true);
console.log("Local Nile TVM invitation prior-block and post-reveal role-hijack regression OK.");


// Exact deadline boundaries matter: the last second of the funding window
// and final approval window must never permit a late transfer or manager fee.
const deadlineEscrowBefore=await balance(contract);
const deadlineManagerBefore=await balance(manager);
await call(manager,contract,"create",[0,0n,sha(secretA),sha(secretB)],90,6000);
await call(alice,contract,"commitRole",[11,1,commitment(secretA,alice)],91,6003);
await call(bob,contract,"commitRole",[11,2,commitment(secretB,bob)],91,6003);
await call(alice,contract,"deposit",[11,1,zero,1_000_000n,"0x"+secretA.toString("hex")],92,6006,1_000_000n);
assert.equal((await call(manager,contract,"getDeal",[11],93,6906))[0].depositDeadline,6906n);
await assert.rejects(
 ()=>call(bob,contract,"deposit",[11,2,zero,2_000_000n,"0x"+secretB.toString("hex")],93,6906,2_000_000n),
 /deposit:/,"Deposit exactly at the 15-minute deadline must revert"
);
let boundaryDeal=(await call(manager,contract,"getDeal",[11],94,6906))[0];
assert.equal(boundaryDeal.depositedB,false,"Expired B deposit must not bind a role");
await call(alice,contract,"refund",[11],95,6906);
assert.equal((await call(manager,contract,"getDeal",[11],96,6909))[0].refundedA,true);
assert.equal(await balance(contract),deadlineEscrowBefore,"Funding deadline must return full escrow");
assert.equal(await balance(manager),deadlineManagerBefore,"Funding expiry cannot pay commission");

await call(manager,contract,"create",[1,50_000_000n,sha(secretA),sha(secretB)],97,7000);
await call(alice,contract,"commitRole",[12,1,commitment(secretA,alice)],98,7003);
await call(bob,contract,"commitRole",[12,2,commitment(secretB,bob)],98,7003);
await call(alice,contract,"deposit",[12,1,zero,100_000_000n,"0x"+secretA.toString("hex")],99,7006,100_000_000n);
await call(bob,contract,"deposit",[12,2,zero,200_000_000n,"0x"+secretB.toString("hex")],100,7009,200_000_000n);
assert.equal((await call(manager,contract,"getDeal",[12],101,7309))[0].finalDeadline,7309n);
await assert.rejects(
 ()=>call(manager,contract,"finalize",[12],101,7309),
 /finalize:/,"Final approval exactly at the 5-minute deadline must revert"
);
boundaryDeal=(await call(manager,contract,"getDeal",[12],102,7309))[0];
assert.equal(boundaryDeal.completed,false,"Expired final approval must not settle");
await call(alice,contract,"refund",[12],103,7309);
await call(bob,contract,"refund",[12],104,7312);
assert.equal(await balance(contract),deadlineEscrowBefore,"Final deadline must return both full deposits");
assert.equal(await balance(manager),deadlineManagerBefore,"Expired final approval cannot pay commission");
console.log("Local Nile TVM exact 15-minute deposit / 5-minute finalize boundaries and refunds OK.");

await call(manager,contract,"create",[0,0n,sha(secretA),sha(secretB)],105,7400);
await call(manager,contract,"cancelUnused",[13],106,7403);
await assert.rejects(
 ()=>call(alice,contract,"commitRole",[13,1,commitment(secretA,alice)],107,7406),
 /commitRole:/,"Cancelled unused deal must reject further role commitments"
);
assert.equal((await call(manager,contract,"getDeal",[13],108,7409))[0].cancelled,true);
assert.equal(await balance(contract),deadlineEscrowBefore,"Cancelling an unused deal cannot move funds");
console.log("Local Nile TVM unused-deal cancellation blocks commitments.");


// Authorization and one-time settlement regression in the actual local TronNile
// VM: a leaked invitation cannot skip wallet commitment; only the original
// depositor can reclaim funds, and the manager cannot cancel a funded deal.
await assert.rejects(
 ()=>call(stranger,contract,"create",[0,0n,sha(secretA),sha(secretB)],109,7412),
 /create:/,"Only the manager can create a deal"
);
await call(manager,contract,"create",[0,0n,sha(secretA),sha(secretB)],110,7415);
assert.equal((await call(manager,contract,"nextId",[],111,7418))[0],15n);
await assert.rejects(
 ()=>call(stranger,contract,"cancelUnused",[14],111,7418),
 /cancelUnused:/,"A stranger cannot cancel even an unused deal"
);
await call(alice,contract,"commitRole",[14,1,commitment(secretA,alice)],112,7421);
await assert.rejects(
 ()=>call(alice,contract,"deposit",[14,1,zero,1_000_000n,"0x"+secretB.toString("hex")],113,7424,1_000_000n),
 /deposit:/,"Wallet commitment must not authorize the other role's secret"
);
await assert.rejects(
 ()=>call(bob,contract,"deposit",[14,1,zero,1_000_000n,"0x"+secretA.toString("hex")],114,7427,1_000_000n),
 /deposit:/,"Knowing a secret must not bypass a prior wallet-bound commitment"
);
await call(alice,contract,"deposit",[14,1,zero,1_000_000n,"0x"+secretA.toString("hex")],115,7430,1_000_000n);
await assert.rejects(
 ()=>call(manager,contract,"cancelUnused",[14],116,7433),
 /cancelUnused:/,"Manager cannot cancel a funded deal"
);
await assert.rejects(
 ()=>call(stranger,contract,"refund",[14],117,8330),
 /refund:/,"A non-depositor cannot steal an expired deposit"
);
await assert.rejects(
 ()=>call(manager,contract,"refund",[14],118,8333),
 /refund:/,"Manager cannot collect an expired participant refund"
);
await call(alice,contract,"refund",[14],119,8336);
await assert.rejects(
 ()=>call(alice,contract,"refund",[14],120,8339),
 /refund:/,"The same deposit cannot be refunded twice"
);
assert.equal((await call(manager,contract,"getDeal",[14],121,8342))[0].refundedA,true);
assert.equal(await balance(contract),deadlineEscrowBefore,"Authorization checks must preserve escrow principal");
console.log("Local Nile TVM manager authorization, wallet-bound invite, refund ownership and double-refund regression OK.");

// No one except the manager can finalize, and a successful finalize cannot
// be repeated to pay a second commission or to transfer the assets again.
await call(manager,contract,"create",[1,50_000_000n,sha(secretA),sha(secretB)],122,8350);
await call(alice,contract,"commitRole",[15,1,commitment(secretA,alice)],123,8353);
await call(bob,contract,"commitRole",[15,2,commitment(secretB,bob)],123,8353);
await call(alice,contract,"deposit",[15,1,zero,100_000_000n,"0x"+secretA.toString("hex")],124,8356,100_000_000n);
await call(bob,contract,"deposit",[15,2,zero,200_000_000n,"0x"+secretB.toString("hex")],125,8359,200_000_000n);
await assert.rejects(
 ()=>call(stranger,contract,"finalize",[15],126,8362),
 /finalize:/,"An outsider cannot finalize a fully funded swap"
);
const managerBeforeFinal15=await balance(manager);
await call(manager,contract,"finalize",[15],127,8365);
assert.equal(await balance(manager)-managerBeforeFinal15,50_000_000n,"Manager receives exactly one fee");
await assert.rejects(
 ()=>call(manager,contract,"finalize",[15],128,8368),
 /finalize:/,"Manager cannot finalize twice"
);
await assert.rejects(
 ()=>call(alice,contract,"refund",[15],129,9268),
 /refund:/,"A settled swap cannot be refunded"
);
assert.equal(await balance(manager)-managerBeforeFinal15,50_000_000n,"No duplicate fee after rejected calls");
assert.equal((await call(manager,contract,"getDeal",[15],130,9271))[0].completed,true);
assert.equal(await balance(contract),deadlineEscrowBefore,"Settled swap must leave no residual principal");
console.log("Local Nile TVM outsider-finalize, single fee and settled-refund rejection OK.");

// Symmetric token-fee regression: A (not just B) can pay a separate native
// commission while sending TRC20 to B. Verify the fee is withheld until
// finalize, and that the full token amount reaches B.
await call(manager,contract,"create",[1,50_000_000n,sha(secretA),sha(secretB)],131,9300);
await tokenCall(manager,"mint",[alice.toString(),60n],132,9303);
await tokenCall(alice,"approve",[contract.toString(),60n],133,9306);
await call(alice,contract,"commitRole",[16,1,commitment(secretA,alice)],134,9309);
await call(bob,contract,"commitRole",[16,2,commitment(secretB,bob)],134,9309);
const beforeATokenFeeManager=await balance(manager);
const beforeATokenFeeAliceTrx=await balance(alice);
const beforeATokenFeeBobTokens=await tokenBalance(bob);
const beforeATokenFeeEscrowTokens=await tokenBalance(contract);
await call(alice,contract,"deposit",[16,1,tokenAddress,60n,"0x"+secretA.toString("hex")],135,9312,50_000_000n);
await call(bob,contract,"deposit",[16,2,zero,120_000_000n,"0x"+secretB.toString("hex")],136,9315,120_000_000n);
assert.equal(await balance(manager),beforeATokenFeeManager,"A token payer fee must remain escrowed before final approval");
await call(manager,contract,"finalize",[16],137,9318);
assert.equal((await tokenBalance(bob))-beforeATokenFeeBobTokens,60n,"B receives A's full TRC20 amount");
assert.equal(await tokenBalance(contract),beforeATokenFeeEscrowTokens,"No residual A-side token principal");
assert.equal((await balance(manager))-beforeATokenFeeManager,50_000_000n,"Manager gets one A-side token payer fee");
assert.equal((await balance(alice))-beforeATokenFeeAliceTrx,70_000_000n,"A receives B's 120 TRX less separate 50 TRX fee");
assert.equal((await call(manager,contract,"getDeal",[16],138,9321))[0].completed,true);

// If the manager misses the five-minute deadline, BOTH deposits and A's
// separate native fee must return in full; no commission can be retained.
await call(manager,contract,"create",[1,50_000_000n,sha(secretA),sha(secretB)],139,9324);
await tokenCall(manager,"mint",[alice.toString(),35n],140,9327);
await tokenCall(alice,"approve",[contract.toString(),35n],141,9330);
await call(alice,contract,"commitRole",[17,1,commitment(secretA,alice)],142,9333);
await call(bob,contract,"commitRole",[17,2,commitment(secretB,bob)],142,9333);
const beforeARefundTokens=await tokenBalance(alice);
const beforeARefundTrx=await balance(alice);
const beforeBRefundTrx=await balance(bob);
const beforeARefundManager=await balance(manager);
await call(alice,contract,"deposit",[17,1,tokenAddress,35n,"0x"+secretA.toString("hex")],143,9336,50_000_000n);
await call(bob,contract,"deposit",[17,2,zero,20_000_000n,"0x"+secretB.toString("hex")],144,9339,20_000_000n);
await call(alice,contract,"refund",[17],145,9640);
await call(bob,contract,"refund",[17],146,9643);
const afterARefund=(await call(manager,contract,"getDeal",[17],147,9646))[0];
assert.equal(afterARefund.refundedA,true);
assert.equal(afterARefund.refundedB,true);
assert.equal(afterARefund.completed,false);
assert.equal(await tokenBalance(alice),beforeARefundTokens,"A receives full TRC20 refund");
assert.equal(await balance(alice),beforeARefundTrx,"A recovers all 50 TRX fee collateral");
assert.equal(await balance(bob),beforeBRefundTrx,"B recovers all 20 TRX principal");
assert.equal(await balance(manager),beforeARefundManager,"Expired A token payer fee never reaches manager");
console.log("Local Nile TVM A-side TRC20 fee finalize and two-party timeout refund OK.");

// Measure local execution Energy for each successful path. Values are not
// Nile fee quotes: real bandwidth, account resources and node execution vary.
const energySummary=Object.fromEntries([...energySamples].sort(([a],[b])=>a.localeCompare(b)).map(([kind,values])=>{
 const sorted=[...values].sort((a,b)=>a<b?-1:a>b?1:0);
 return [kind,{count:values.length,min:sorted[0].toString(),max:sorted.at(-1).toString()}];
}));
for(const kind of ["create","commitRole","deposit:TRX","deposit:TRC20+TRXfee","finalize","refund"]){
 assert.ok(energySummary[kind]?.count>0,"Missing Energy sample: "+kind);
}
console.log("LOCAL TVM execution Energy ranges (NOT Nile billing):",JSON.stringify(energySummary));
