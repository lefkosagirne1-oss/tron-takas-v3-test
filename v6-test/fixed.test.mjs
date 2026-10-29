import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import solc from "solc";
import ganache from "ganache";
import {BrowserProvider,ContractFactory,parseEther,parseUnits} from "ethers";
const tokenSource=`pragma solidity ^0.8.20; contract Token {mapping(address=>uint256) public balanceOf; mapping(address=>mapping(address=>uint256)) public allowance; function mint(address a,uint256 n) external {balanceOf[a]+=n;} function approve(address s,uint256 n) external returns(bool){allowance[msg.sender][s]=n;return true;} function transfer(address to,uint256 n) external returns(bool){require(balanceOf[msg.sender]>=n);balanceOf[msg.sender]-=n;balanceOf[to]+=n;return true;} function transferFrom(address from,address to,uint256 n) external returns(bool){require(balanceOf[from]>=n&&allowance[from][msg.sender]>=n);allowance[from][msg.sender]-=n;balanceOf[from]-=n;balanceOf[to]+=n;return true;}}`;
const input={language:"Solidity",sources:{"V7.sol":{content:readFileSync(new URL("../contracts/TakasV7Fixed.sol",import.meta.url),"utf8")},"Token.sol":{content:tokenSource}},settings:{optimizer:{enabled:true,runs:200},evmVersion:"paris",viaIR:true,outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}}};
const out=JSON.parse(solc.compile(JSON.stringify(input)));
assert.deepEqual((out.errors||[]).filter(x=>x.severity==="error").map(x=>x.formattedMessage),[]);
const artifact=(f,n)=>[out.contracts[f][n].abi,"0x"+out.contracts[f][n].evm.bytecode.object];
async function setup(payer=0,bps=0){
 const provider=new BrowserProvider(ganache.provider({logging:{quiet:true},wallet:{totalAccounts:5,defaultBalance:1000},chain:{hardfork:"shanghai"}}));
 const [owner,a,b,other]=await Promise.all([0,1,2,3].map(i=>provider.getSigner(i)));
 const swap=await new ContractFactory(...artifact("V7.sol","TakasV7Fixed"),owner).deploy();await swap.waitForDeployment();
 const token=await new ContractFactory(...artifact("Token.sol","Token"),owner).deploy();await token.waitForDeployment();
 const send=async tx=>(await tx).wait();
 await send(swap.create(payer,bps));
 await send(token.mint(await b.getAddress(),parseEther("20")));
 await send(token.connect(b).approve(await swap.getAddress(),parseEther("20")));
 const depositA=()=>send(swap.connect(a).deposit(1,1,"0x0000000000000000000000000000000000000000",parseUnits("3",6),{value:parseUnits("3",6)}));
 const depositB=async()=>send(swap.connect(b).deposit(1,2,await token.getAddress(),parseEther("20")));
 return {provider,owner,a,b,other,swap,token,send,depositA,depositB};
}
test("one deposit each and manager finalizes; no fee",async()=>{const x=await setup();await x.depositA();await x.depositB();await x.send(x.swap.finalize(1));assert.equal((await x.swap.getDeal(1)).completed,true);assert.equal(await x.token.balanceOf(await x.a.getAddress()),parseEther("20"));});
test("fee charged only on finalization",async()=>{const x=await setup(2,parseEther("1"));await x.depositA();await x.depositB();await x.send(x.swap.finalize(1));assert.equal(await x.token.balanceOf(await x.a.getAddress()),parseEther("19"));assert.equal(await x.token.balanceOf(await x.owner.getAddress()),parseEther("1"));});
test("non-manager cannot finalize",async()=>{const x=await setup();await x.depositA();await x.depositB();await assert.rejects(x.send(x.swap.connect(x.a).finalize(1)));});
test("same wallet cannot claim both roles",async()=>{const x=await setup();await x.depositA();await assert.rejects(x.send(x.swap.connect(x.a).deposit(1,2,await x.token.getAddress(),1)));});
test("single deposit refunded after timeout",async()=>{const x=await setup();await x.depositA();await x.provider.send("evm_increaseTime",[901]);await x.provider.send("evm_mine",[]);await x.send(x.swap.connect(x.a).refund(1));assert.equal((await x.swap.getDeal(1)).refundedA,true);});
test("both deposits refunded after final timeout",async()=>{const x=await setup();await x.depositA();await x.depositB();await x.provider.send("evm_increaseTime",[901]);await x.provider.send("evm_mine",[]);await x.send(x.swap.connect(x.a).refund(1));await x.send(x.swap.connect(x.b).refund(1));assert.equal(await x.token.balanceOf(await x.b.getAddress()),parseEther("20"));});
test("cannot deposit twice",async()=>{const x=await setup();await x.depositA();await assert.rejects(x.depositA());});

test("A-side fixed fee deducted on finalize",async()=>{const x=await setup(1,parseUnits("0.15",6));await x.depositA();await x.depositB();await x.send(x.swap.finalize(1));assert.equal(await x.provider.getBalance(await x.swap.getAddress()),0n);assert.equal((await x.swap.getDeal(1)).completed,true);});
test("reject invalid fee configurations",async()=>{const x=await setup();await assert.rejects(x.send(x.swap.create(0,100)));await assert.rejects(x.send(x.swap.create(3,1001)));});
test("cannot finalize with only one deposit",async()=>{const x=await setup();await x.depositA();await assert.rejects(x.send(x.swap.finalize(1)));});
test("refund cannot be taken before deadline",async()=>{const x=await setup();await x.depositA();await assert.rejects(x.send(x.swap.connect(x.a).refund(1)));});
test("cannot finalize after five minute final window",async()=>{const x=await setup();await x.depositA();await x.depositB();await x.provider.send("evm_increaseTime",[301]);await x.provider.send("evm_mine",[]);await assert.rejects(x.send(x.swap.finalize(1)));});
test("cannot deposit after funding deadline",async()=>{const x=await setup();await x.depositA();await x.provider.send("evm_increaseTime",[901]);await x.provider.send("evm_mine",[]);await assert.rejects(x.depositB());});
test("refund only once",async()=>{const x=await setup();await x.depositA();await x.provider.send("evm_increaseTime",[901]);await x.provider.send("evm_mine",[]);await x.send(x.swap.connect(x.a).refund(1));await assert.rejects(x.send(x.swap.connect(x.a).refund(1)));});
test("manager cannot deposit",async()=>{const x=await setup();await assert.rejects(x.send(x.swap.deposit(1,1,"0x0000000000000000000000000000000000000000",1,{value:1})));});

test("fixed fee cannot equal or exceed payer deposit",async()=>{const x=await setup(1,parseUnits("3",6));await assert.rejects(x.depositA());});
test("fixed fee is not charged on refund",async()=>{const x=await setup(2,parseEther("1"));await x.depositB();await x.provider.send("evm_increaseTime",[901]);await x.provider.send("evm_mine",[]);await x.send(x.swap.connect(x.b).refund(1));assert.equal(await x.token.balanceOf(await x.b.getAddress()),parseEther("20"));});

// Re-run CI after artifact publishing retry fix.
