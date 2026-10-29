import test from "node:test";
import {createHash} from "node:crypto";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import solc from "solc";
import ganache from "ganache";
import {BrowserProvider,ContractFactory,parseEther,parseUnits} from "ethers";
const inviteA="0x"+"11".repeat(32),inviteB="0x"+"22".repeat(32);
const inviteHash=secret=>"0x"+createHash("sha256").update(Buffer.from(secret.slice(2),"hex")).digest("hex");
const walletCommitHash=(secret,wallet)=>"0x"+createHash("sha256").update(Buffer.concat([Buffer.from(secret.slice(2),"hex"),Buffer.from(wallet.slice(2),"hex")])).digest("hex");
const tokenSource=`pragma solidity ^0.8.20; contract Token {mapping(address=>uint256) public balanceOf; mapping(address=>mapping(address=>uint256)) public allowance; function mint(address a,uint256 n) external {balanceOf[a]+=n;} function approve(address s,uint256 n) external returns(bool){allowance[msg.sender][s]=n;return true;} function transfer(address to,uint256 n) external returns(bool){require(balanceOf[msg.sender]>=n);balanceOf[msg.sender]-=n;balanceOf[to]+=n;return true;} function transferFrom(address from,address to,uint256 n) external returns(bool){require(balanceOf[from]>=n&&allowance[from][msg.sender]>=n);allowance[from][msg.sender]-=n;balanceOf[from]-=n;balanceOf[to]+=n;return true;}}`;
const input={language:"Solidity",sources:{"V8.sol":{content:readFileSync(process.env.COST_SOURCE,"utf8")},"Token.sol":{content:tokenSource}},settings:{optimizer:{enabled:true,runs:1},evmVersion:"paris",viaIR:true,outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}}};
const out=JSON.parse(solc.compile(JSON.stringify(input)));
assert.deepEqual((out.errors||[]).filter(x=>x.severity==="error").map(x=>x.formattedMessage),[]);
const artifact=(f,n)=>[out.contracts[f][n].abi,"0x"+out.contracts[f][n].evm.bytecode.object];
async function setup(payer=0,bps=0){
 const provider=new BrowserProvider(ganache.provider({logging:{quiet:true},wallet:{totalAccounts:5,defaultBalance:1000},chain:{hardfork:"shanghai"}}));
 provider.pollingInterval=10;
 const [owner,a,b,other]=await Promise.all([0,1,2,3].map(i=>provider.getSigner(i)));
 const swap=await new ContractFactory(...artifact("V8.sol","TakasV8Invite"),owner).deploy();await swap.waitForDeployment();
 const token=await new ContractFactory(...artifact("Token.sol","Token"),owner).deploy();await token.waitForDeployment();
 const send=async tx=>(await tx).wait();
 await send(swap.create(payer,bps,inviteHash(inviteA),inviteHash(inviteB)));
 await send(swap.connect(a).commitRole(1,1,walletCommitHash(inviteA,await a.getAddress())));
 await send(swap.connect(b).commitRole(1,2,walletCommitHash(inviteB,await b.getAddress())));
 await send(token.mint(await b.getAddress(),parseEther("20")));
 await send(token.connect(b).approve(await swap.getAddress(),parseEther("20")));
 const depositA=()=>send(swap.connect(a).deposit(1,1,"0x0000000000000000000000000000000000000000",parseUnits("3",6),inviteA,{value:parseUnits("3",6)}));
 const depositB=async()=>send(swap.connect(b).deposit(1,2,await token.getAddress(),parseEther("20"),inviteB));
 return {provider,owner,a,b,other,swap,token,send,depositA,depositB,inviteA,inviteB};
}
test("one deposit each and manager finalizes; no fee",async()=>{const x=await setup();await x.depositA();await x.depositB();await x.send(x.swap.finalize(1));assert.equal((await x.swap.getDeal(1)).completed,true);assert.equal(await x.token.balanceOf(await x.a.getAddress()),parseEther("20"));});
test("fee charged only on finalization",async()=>{const x=await setup(1,parseUnits("1",6));await x.depositA();await x.depositB();await x.send(x.swap.finalize(1));assert.equal(await x.token.balanceOf(await x.a.getAddress()),parseEther("20"));assert.equal((await x.swap.getDeal(1)).completed,true);});
test("non-manager cannot finalize",async()=>{const x=await setup();await x.depositA();await x.depositB();await assert.rejects(x.send(x.swap.connect(x.a).finalize(1)));});
test("same wallet cannot claim both roles",async()=>{const x=await setup();await x.depositA();await assert.rejects(x.send(x.swap.connect(x.a).deposit(1,2,await x.token.getAddress(),1,x.inviteB)));});
test("single deposit refunded after timeout",async()=>{const x=await setup();await x.depositA();await x.provider.send("evm_increaseTime",[901]);await x.provider.send("evm_mine",[]);await x.send(x.swap.connect(x.a).refund(1));assert.equal((await x.swap.getDeal(1)).refundedA,true);});
test("both deposits refunded after final timeout",async()=>{const x=await setup();await x.depositA();await x.depositB();await x.provider.send("evm_increaseTime",[901]);await x.provider.send("evm_mine",[]);await x.send(x.swap.connect(x.a).refund(1));await x.send(x.swap.connect(x.b).refund(1));assert.equal(await x.token.balanceOf(await x.b.getAddress()),parseEther("20"));});
test("cannot deposit twice",async()=>{const x=await setup();await x.depositA();await assert.rejects(x.depositA());});

test("A-side fixed fee deducted on finalize",async()=>{const x=await setup(1,parseUnits("0.15",6));await x.depositA();await x.depositB();await x.send(x.swap.finalize(1));assert.equal(await x.provider.getBalance(await x.swap.getAddress()),0n);assert.equal((await x.swap.getDeal(1)).completed,true);});
test("reject invalid fee configurations",async()=>{const x=await setup();await assert.rejects(x.send(x.swap.create(0,100,inviteHash(inviteA),inviteHash(inviteB))));await assert.rejects(x.send(x.swap.create(3,1001,inviteHash(inviteA),inviteHash(inviteB))));});
test("cannot finalize with only one deposit",async()=>{const x=await setup();await x.depositA();await assert.rejects(x.send(x.swap.finalize(1)));});
test("refund cannot be taken before deadline",async()=>{const x=await setup();await x.depositA();await assert.rejects(x.send(x.swap.connect(x.a).refund(1)));});
test("cannot finalize after five minute final window",async()=>{const x=await setup();await x.depositA();await x.depositB();await x.provider.send("evm_increaseTime",[301]);await x.provider.send("evm_mine",[]);await assert.rejects(x.send(x.swap.finalize(1)));});
test("cannot deposit after funding deadline",async()=>{const x=await setup();await x.depositA();await x.provider.send("evm_increaseTime",[901]);await x.provider.send("evm_mine",[]);await assert.rejects(x.depositB());});
test("refund only once",async()=>{const x=await setup();await x.depositA();await x.provider.send("evm_increaseTime",[901]);await x.provider.send("evm_mine",[]);await x.send(x.swap.connect(x.a).refund(1));await assert.rejects(x.send(x.swap.connect(x.a).refund(1)));});
test("manager cannot deposit",async()=>{const x=await setup();await assert.rejects(x.send(x.swap.deposit(1,1,"0x0000000000000000000000000000000000000000",1,x.inviteA,{value:1})));});

test("fixed fee cannot equal or exceed payer deposit",async()=>{const x=await setup(1,parseUnits("3",6));await assert.rejects(x.depositA());});
test("fixed fee is not charged on refund",async()=>{const x=await setup(1,parseUnits("1",6));await x.depositA();await x.provider.send("evm_increaseTime",[901]);await x.provider.send("evm_mine",[]);await x.send(x.swap.connect(x.a).refund(1));assert.equal((await x.swap.getDeal(1)).refundedA,true);});

// Re-run CI after artifact publishing retry fix.

test("token fee payer must escrow exact additional TRX fee",async()=>{
 const x=await setup(2,parseUnits("1",6));
 await assert.rejects(x.depositB());
 await assert.rejects(x.send(x.swap.connect(x.b).deposit(1,2,await x.token.getAddress(),parseEther("20"),x.inviteB,{value:parseUnits("2",6)})));
 await x.send(x.swap.connect(x.b).deposit(1,2,await x.token.getAddress(),parseEther("20"),x.inviteB,{value:parseUnits("1",6)}));
 assert.equal(await x.provider.getBalance(await x.swap.getAddress()),parseUnits("1",6));
});
test("token fee payer receives full token and extra TRX fee back after timeout",async()=>{
 const x=await setup(2,parseUnits("1",6));
 await x.send(x.swap.connect(x.b).deposit(1,2,await x.token.getAddress(),parseEther("20"),x.inviteB,{value:parseUnits("1",6)}));
 await x.provider.send("evm_increaseTime",[901]);await x.provider.send("evm_mine",[]);
 await x.send(x.swap.connect(x.b).refund(1));
 assert.equal(await x.token.balanceOf(await x.b.getAddress()),parseEther("20"));
 assert.equal(await x.provider.getBalance(await x.swap.getAddress()),0n);
});
test("token fee payer pays native TRX only when manager finalizes",async()=>{
 const x=await setup(2,parseUnits("1",6));
 const balance=async()=>BigInt(await x.provider.send("eth_getBalance",[await x.swap.getAddress(),"latest"]));
 await x.depositA();
 await x.send(x.swap.connect(x.b).deposit(1,2,await x.token.getAddress(),parseEther("20"),x.inviteB,{value:parseUnits("1",6)}));
 assert.equal(await balance(),parseUnits("4",6));
 await x.send(x.swap.finalize(1));
 assert.equal(await x.token.balanceOf(await x.a.getAddress()),parseEther("20"));
 assert.equal(await balance(),0n);
 assert.equal((await x.swap.getDeal(1)).completed,true);
});

test("guessed deal id cannot hijack A role without secret",async()=>{
 const x=await setup();
 await assert.rejects(x.send(x.swap.connect(x.other).deposit(1,1,"0x0000000000000000000000000000000000000000",parseUnits("100",6),"0x"+"33".repeat(32),{value:parseUnits("100",6)})));
 assert.equal((await x.swap.getDeal(1)).depositedA,false);
});
test("B secret cannot be used to deposit as A",async()=>{
 const x=await setup();
 await assert.rejects(x.send(x.swap.connect(x.other).deposit(1,1,"0x0000000000000000000000000000000000000000",parseUnits("100",6),x.inviteB,{value:parseUnits("100",6)})));
});
test("100 TRX deposit with 50 TRX fixed fee succeeds",async()=>{
 const x=await setup(1,parseUnits("50",6));
 await x.send(x.swap.connect(x.a).deposit(1,1,"0x0000000000000000000000000000000000000000",parseUnits("100",6),x.inviteA,{value:parseUnits("100",6)}));
 await x.depositB();
 await x.send(x.swap.finalize(1));
 assert.equal((await x.swap.getDeal(1)).completed,true);
});
test("invalid invitation hashes cannot create deal",async()=>{
 const x=await setup();
 await assert.rejects(x.send(x.swap.create(0,0,"0x"+"00".repeat(32),inviteHash(inviteB))));
 await assert.rejects(x.send(x.swap.create(0,0,inviteHash(inviteA),inviteHash(inviteA))));
});

test("same-asset TRX-to-TRX swap works with different amounts and 50 TRX fee",async()=>{
 const x=await setup(1,parseUnits("50",6));
 const zero="0x0000000000000000000000000000000000000000";
 const amountA=parseUnits("100",6),amountB=parseUnits("200",6);
 await x.send(x.swap.connect(x.a).deposit(1,1,zero,amountA,x.inviteA,{value:amountA}));
 await x.send(x.swap.connect(x.b).deposit(1,2,zero,amountB,x.inviteB,{value:amountB}));
 const before=BigInt(await x.provider.send("eth_getBalance",[await x.b.getAddress(),"latest"]));
 await x.send(x.swap.finalize(1));
 const after=BigInt(await x.provider.send("eth_getBalance",[await x.b.getAddress(),"latest"]));
 assert.equal(after-before,parseUnits("50",6));
 assert.equal(BigInt(await x.provider.send("eth_getBalance",[await x.swap.getAddress(),"latest"])),0n);
 assert.equal((await x.swap.getDeal(1)).completed,true);
});
test("B-side TRX commission is deducted only after manager finalization",async()=>{
 const x=await setup(2,parseUnits("0.25",6));
 const zero="0x0000000000000000000000000000000000000000";
 await x.send(x.token.mint(await x.a.getAddress(),parseEther("10")));
 await x.send(x.token.connect(x.a).approve(await x.swap.getAddress(),parseEther("10")));
 await x.send(x.swap.connect(x.a).deposit(1,1,await x.token.getAddress(),parseEther("10"),x.inviteA));
 await x.send(x.swap.connect(x.b).deposit(1,2,zero,parseUnits("2",6),x.inviteB,{value:parseUnits("2",6)}));
 const before=BigInt(await x.provider.send("eth_getBalance",[await x.a.getAddress(),"latest"]));
 await x.send(x.swap.finalize(1));
 const after=BigInt(await x.provider.send("eth_getBalance",[await x.a.getAddress(),"latest"]));
 assert.equal(after-before,parseUnits("1.75",6));
 assert.equal(await x.token.balanceOf(await x.b.getAddress()),parseEther("30"));
 assert.equal((await x.swap.getDeal(1)).completed,true);
});

test("publicly revealed A secret cannot be front-run by an uncommitted wallet",async()=>{
 const x=await setup();
 const zero="0x0000000000000000000000000000000000000000";
 const n=parseUnits("100",6);
 await assert.rejects(x.send(x.swap.connect(x.other).deposit(1,1,zero,n,x.inviteA,{value:n})));
 await x.depositA();
 assert.equal((await x.swap.getDeal(1)).partyA,await x.a.getAddress());
});
test("copied wallet commitment cannot authorize another wallet",async()=>{
 const x=await setup();
 const zero="0x0000000000000000000000000000000000000000";
 const copied=walletCommitHash(x.inviteA,await x.a.getAddress());
 await x.send(x.swap.connect(x.other).commitRole(1,1,copied));
 await assert.rejects(x.send(x.swap.connect(x.other).deposit(1,1,zero,parseUnits("100",6),x.inviteA,{value:parseUnits("100",6)})));
 assert.equal((await x.swap.getDeal(1)).depositedA,false);
});
test("wallet commitment can be read for recovery without revealing invitation",async()=>{
 const x=await setup();
 const commitment=await x.swap.committedHash(1,1,await x.a.getAddress());
 assert.equal(commitment,walletCommitHash(x.inviteA,await x.a.getAddress()));
 assert.notEqual(commitment,inviteHash(x.inviteA));
});
