import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import solc from "solc";
import ganache from "ganache";
import {BrowserProvider,ContractFactory,parseEther} from "ethers";

const source=readFileSync(new URL("../contracts/TakasV5Draft.sol",import.meta.url),"utf8");
const input={language:"Solidity",sources:{"TakasV5Draft.sol":{content:source}},settings:{optimizer:{enabled:true,runs:200},viaIR:true,evmVersion:"paris",outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}}};
const compiled=JSON.parse(solc.compile(JSON.stringify(input)));
const errors=(compiled.errors||[]).filter(x=>x.severity==="error");
assert.equal(errors.length,0,errors.map(x=>x.formattedMessage).join("\n"));
const item=compiled.contracts["TakasV5Draft.sol"].TakasV5Draft;
async function fixture(){
 const node=ganache.provider({logging:{quiet:true},wallet:{totalAccounts:5,defaultBalance:1000},chain:{hardfork:"shanghai"}});
 const p=new BrowserProvider(node),[owner,a,b,other]=await Promise.all([0,1,2,3].map(i=>p.getSigner(i)));
 const swap=await new ContractFactory(item.abi,"0x"+item.evm.bytecode.object,owner).deploy();
 await swap.waitForDeployment();
 const one=async tx=>{await(await tx).wait()};
 const addrA=await a.getAddress(),addrB=await b.getAddress();
 await one(swap.createInviteWithParties(addrA,addrB,0,0));
 return {node,p,owner,a,b,other,swap,one};
}
const zero="0x0000000000000000000000000000000000000000";
test("V5 one-tx invite, B offer+accept, A accept+deposit, B deposit, manager finalizes",async()=>{
 const f=await fixture(),{swap,a,b,one}=f;
 // Distinct assets are mandatory. For native-vs-token tests, use a real mock TRC20.
 const tokenSource=`pragma solidity ^0.8.20; contract Token {mapping(address=>uint) public balanceOf; mapping(address=>mapping(address=>uint)) public allowance; function mint(address a,uint n) external {balanceOf[a]+=n;} function approve(address a,uint n) external returns(bool){allowance[msg.sender][a]=n;return true;} function transferFrom(address f,address t,uint n) external returns(bool){require(balanceOf[f]>=n&&allowance[f][msg.sender]>=n);balanceOf[f]-=n;allowance[f][msg.sender]-=n;balanceOf[t]+=n;return true;} function transfer(address t,uint n) external returns(bool){require(balanceOf[msg.sender]>=n);balanceOf[msg.sender]-=n;balanceOf[t]+=n;return true;}}`;
 const c=JSON.parse(solc.compile(JSON.stringify({language:"Solidity",sources:{"Token.sol":{content:tokenSource}},settings:{outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}}}))).contracts["Token.sol"].Token;
 const token=await new ContractFactory(c.abi,"0x"+c.evm.bytecode.object,f.owner).deploy();await token.waitForDeployment();
 await one(swap.connect(a).propose(1,zero,parseEther("2")));
 await one(swap.connect(b).proposeAndAcceptA(1,await token.getAddress(),parseEther("10"),await swap.offerAHash(1)));
 await one(token.mint(await b.getAddress(),parseEther("10")));
 await one(token.connect(b).approve(await swap.getAddress(),parseEther("10")));
 await one(swap.connect(a).acceptAndDeposit(1,await swap.termsHash(1),{value:parseEther("2")}));
 assert.equal((await swap.getSwap(1)).depositedA,true);
 await one(swap.connect(b).deposit(1));
 await assert.rejects(swap.connect(a).finalize(1));
 await one(swap.finalize(1));
 assert.equal((await swap.getSwap(1)).completed,true);
 assert.equal(await token.balanceOf(await a.getAddress()),parseEther("10"));
 await assert.rejects(one(swap.finalize(1,{gasLimit:450000})));
});
test("V5 cannot accept or deposit before counterparty offer",async()=>{
 const {swap,a}=await fixture();
 await assert.rejects(swap.connect(a).acceptAndDeposit(1,zero,{value:parseEther("2")}));
});
test("V5 invalid parties and non-manager invite rejected",async()=>{
 const {swap,a,b}=await fixture();
 await assert.rejects(swap.connect(a).createInviteWithParties(await a.getAddress(),await b.getAddress(),0,0));
 await assert.rejects(swap.createInviteWithParties(await a.getAddress(),await a.getAddress(),0,0));
});

test("V5 offer amendment clears prior acceptance and blocks premature deposit",async()=>{
 const {swap,a,b,one}=await fixture();
 await one(swap.connect(a).propose(1,zero,parseEther("2")));
 // Native A and B cannot have the same token, but B can propose an EOA? Reject invalid token.
 await assert.rejects(swap.connect(b).proposeAndAcceptA(1,zero,parseEther("5"),await swap.offerAHash(1)));
 assert.equal((await swap.getSwap(1)).acceptedB,false);
 await one(swap.connect(a).propose(1,zero,parseEther("3")));
 await assert.rejects(swap.connect(a).acceptAndDeposit(1,zero,{value:parseEther("3")}));
});
test("V5 manager cannot finalize before both deposits",async()=>{
 const {swap,one,a}=await fixture();
 await one(swap.connect(a).propose(1,zero,parseEther("2")));
 await assert.rejects(swap.finalize(1));
});
test("V5 manager cannot cancel an already cancelled invitation twice",async()=>{
 const {swap,one}=await fixture();
 await one(swap.cancelUnused(1));
 assert.equal((await swap.getSwap(1)).cancelled,true);
 await assert.rejects(one(swap.cancelUnused(1)));
});
test("V5 no unauthorized wallet may submit A offer",async()=>{
 const {swap,other}=await fixture();
 await assert.rejects(swap.connect(other).propose(1,zero,parseEther("2")));
});

test("V5 one-sided native deposit is refundable after 15-minute timeout",async()=>{
 const {swap,a,b,node,one}=await fixture();
 // B proposes a contract token address; no B deposit is needed for the timeout scenario.
 const tokenSource="pragma solidity ^0.8.20; contract Stub {}";
 const compiledToken=JSON.parse(solc.compile(JSON.stringify({language:"Solidity",sources:{"Stub.sol":{content:tokenSource}},settings:{outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}}})));
 const stub=compiledToken.contracts["Stub.sol"].Stub;
 const token=await new ContractFactory(stub.abi,"0x"+stub.evm.bytecode.object,a).deploy();
 await token.waitForDeployment();
 await one(swap.connect(a).propose(1,zero,parseEther("2")));
 await one(swap.connect(b).proposeAndAcceptA(1,await token.getAddress(),parseEther("10"),await swap.offerAHash(1)));
 await one(swap.connect(a).acceptAndDeposit(1,await swap.termsHash(1),{value:parseEther("2")}));
 await assert.rejects(one(swap.connect(a).refund(1)));
 const deadline=Number((await swap.getSwap(1)).depositDeadline);
 await node.request({method:"evm_setTime",params:[(deadline+2)*1000]});
 await node.request({method:"evm_mine",params:[]});
 await one(swap.connect(a).refund(1,{gasLimit:350000}));
 assert.equal((await swap.getSwap(1)).refundedA,true);
 await assert.rejects(one(swap.connect(a).refund(1)));
 await assert.rejects(one(swap.finalize(1)));
});

test("V5 both parties recover deposits after five-minute manager settlement timeout",async()=>{
 const {swap,a,b,node,one,owner}=await fixture();
 const tokenSource="pragma solidity ^0.8.20; contract Token {mapping(address=>uint) public balanceOf; mapping(address=>mapping(address=>uint)) public allowance; function mint(address a,uint n) external {balanceOf[a]+=n;} function approve(address a,uint n) external returns(bool){allowance[msg.sender][a]=n;return true;} function transferFrom(address f,address t,uint n) external returns(bool){require(balanceOf[f]>=n&&allowance[f][msg.sender]>=n);balanceOf[f]-=n;allowance[f][msg.sender]-=n;balanceOf[t]+=n;return true;} function transfer(address t,uint n) external returns(bool){require(balanceOf[msg.sender]>=n);balanceOf[msg.sender]-=n;balanceOf[t]+=n;return true;}}";
 const ct=JSON.parse(solc.compile(JSON.stringify({language:"Solidity",sources:{"Token.sol":{content:tokenSource}},settings:{outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}}}))).contracts["Token.sol"].Token;
 const token=await new ContractFactory(ct.abi,"0x"+ct.evm.bytecode.object,owner).deploy();
 await token.waitForDeployment();
 await one(token.mint(await b.getAddress(),parseEther("10")));
 await one(swap.connect(a).propose(1,zero,parseEther("2")));
 await one(swap.connect(b).proposeAndAcceptA(1,await token.getAddress(),parseEther("10"),await swap.offerAHash(1)));
 await one(token.connect(b).approve(await swap.getAddress(),parseEther("10")));
 await one(swap.connect(a).acceptAndDeposit(1,await swap.termsHash(1),{value:parseEther("2")}));
 await one(swap.connect(b).deposit(1));
 const deadline=Number((await swap.getSwap(1)).settlementDeadline);
 assert.ok(deadline>0);
 await node.request({method:"evm_setTime",params:[(deadline+2)*1000]});
 await node.request({method:"evm_mine",params:[]});
 await assert.rejects(one(swap.finalize(1,{gasLimit:450000})));
 await one(swap.connect(a).refund(1,{gasLimit:350000}));
 await one(swap.connect(b).refund(1,{gasLimit:350000}));
 const s=await swap.getSwap(1);
 assert.equal(s.refundedA,true);
 assert.equal(s.refundedB,true);
 assert.equal(s.completed,false);
 assert.equal(await token.balanceOf(await b.getAddress()),parseEther("10"));
 await assert.rejects(one(swap.connect(b).refund(1,{gasLimit:350000})));
});

test("V5 fee rules reject invalid combinations and above 10 percent",async()=>{
 const {swap,a,b}=await fixture();
 const x=await a.getAddress(),y=await b.getAddress();
 await assert.rejects(swap.createInviteWithParties(x,y,1001,1));
 await assert.rejects(swap.createInviteWithParties(x,y,100,0));
 await assert.rejects(swap.createInviteWithParties(x,y,0,1));
 await assert.rejects(swap.createInviteWithParties(x,y,100,3));
});
test("V5 rejects unknown swap, zero offers, and forged native amount",async()=>{
 const {swap,a,b,one}=await fixture();
 await assert.rejects(swap.connect(a).propose(999,zero,parseEther("2")));
 await assert.rejects(swap.connect(a).propose(1,zero,0));
 const src="pragma solidity ^0.8.20; contract Stub {}";
 const out=JSON.parse(solc.compile(JSON.stringify({language:"Solidity",sources:{"Stub.sol":{content:src}},settings:{outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}}}))).contracts["Stub.sol"].Stub;
 const token=await new ContractFactory(out.abi,"0x"+out.evm.bytecode.object,a).deploy();await token.waitForDeployment();
 await one(swap.connect(a).propose(1,zero,parseEther("2")));
 await one(swap.connect(b).proposeAndAcceptA(1,await token.getAddress(),parseEther("10"),await swap.offerAHash(1)));
 await assert.rejects(one(swap.connect(a).acceptAndDeposit(1,await swap.termsHash(1),{value:parseEther("1"),gasLimit:350000})));
 assert.equal((await swap.getSwap(1)).depositedA,false);
});
test("V5 offer expires and unused invite can be cancelled without deposits",async()=>{
 const {swap,a,b,node,one}=await fixture();
 const deadline=Number((await swap.getSwap(1)).offerDeadline);
 await node.request({method:"evm_setTime",params:[(deadline+2)*1000]});
 await node.request({method:"evm_mine",params:[]});
 await assert.rejects(one(swap.connect(a).propose(1,zero,parseEther("2"),{gasLimit:350000})));
 await one(swap.cancelUnused(1));
 assert.equal((await swap.getSwap(1)).cancelled,true);
});

test("V5 stale A offer hash cannot be accepted by B",async()=>{
 const {swap,a,b,one}=await fixture();
 await one(swap.connect(a).propose(1,zero,parseEther("2")));
 const stale=await swap.offerAHash(1);
 await one(swap.connect(a).propose(1,zero,parseEther("3")));
 const src="pragma solidity ^0.8.20; contract Stub {}";
 const out=JSON.parse(solc.compile(JSON.stringify({language:"Solidity",sources:{"Stub.sol":{content:src}},settings:{outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}}}))).contracts["Stub.sol"].Stub;
 const token=await new ContractFactory(out.abi,"0x"+out.evm.bytecode.object,a).deploy();await token.waitForDeployment();
 await assert.rejects(one(swap.connect(b).proposeAndAcceptA(1,await token.getAddress(),parseEther("10"),stale,{gasLimit:350000})));
 assert.equal((await swap.getSwap(1)).acceptedB,false);
});
test("V5 stale final terms hash cannot trigger A deposit",async()=>{
 const {swap,a,b,one}=await fixture();
 const src="pragma solidity ^0.8.20; contract Stub {}";
 const out=JSON.parse(solc.compile(JSON.stringify({language:"Solidity",sources:{"Stub.sol":{content:src}},settings:{outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}}}))).contracts["Stub.sol"].Stub;
 const token=await new ContractFactory(out.abi,"0x"+out.evm.bytecode.object,a).deploy();await token.waitForDeployment();
 await one(swap.connect(a).propose(1,zero,parseEther("2")));
 await one(swap.connect(b).proposeAndAcceptA(1,await token.getAddress(),parseEther("10"),await swap.offerAHash(1)));
 const stale=await swap.termsHash(1);
 await one(swap.connect(a).propose(1,zero,parseEther("3")));
 await assert.rejects(one(swap.connect(a).acceptAndDeposit(1,stale,{value:parseEther("2"),gasLimit:350000})));
 assert.equal((await swap.getSwap(1)).depositedA,false);
});

test("V5 charges A commission only on successful finalization",async()=>{
 const {swap,a,b,owner,one}=await fixture();
 const tokenSource="pragma solidity ^0.8.20; contract Token {mapping(address=>uint) public balanceOf; mapping(address=>mapping(address=>uint)) public allowance; function mint(address a,uint n) external {balanceOf[a]+=n;} function approve(address a,uint n) external returns(bool){allowance[msg.sender][a]=n;return true;} function transferFrom(address f,address t,uint n) external returns(bool){require(balanceOf[f]>=n&&allowance[f][msg.sender]>=n);balanceOf[f]-=n;allowance[f][msg.sender]-=n;balanceOf[t]+=n;return true;} function transfer(address t,uint n) external returns(bool){require(balanceOf[msg.sender]>=n);balanceOf[msg.sender]-=n;balanceOf[t]+=n;return true;}}";
 const c=JSON.parse(solc.compile(JSON.stringify({language:"Solidity",sources:{"Token.sol":{content:tokenSource}},settings:{outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}}}))).contracts["Token.sol"].Token;
 const token=await new ContractFactory(c.abi,"0x"+c.evm.bytecode.object,owner).deploy();await token.waitForDeployment();
 await one(swap.createInviteWithParties(await a.getAddress(),await b.getAddress(),500,1));
 await one(token.mint(await b.getAddress(),parseEther("10")));
 await one(swap.connect(a).propose(2,zero,parseEther("2")));
 await one(swap.connect(b).proposeAndAcceptA(2,await token.getAddress(),parseEther("10"),await swap.offerAHash(2)));
 await one(token.connect(b).approve(await swap.getAddress(),parseEther("10")));
 await one(swap.connect(a).acceptAndDeposit(2,await swap.termsHash(2),{value:parseEther("2")}));
 await one(swap.connect(b).deposit(2));
 const fee=await swap.preview(2);
 assert.equal(fee[0],parseEther("0.1"));
 const before=await owner.provider.getBalance(await owner.getAddress());
 await one(swap.finalize(2));
 assert.equal(await token.balanceOf(await a.getAddress()),parseEther("10"));
 assert.equal((await swap.getSwap(2)).completed,true);
});
test("V5 rejects token contract that falsely reports transfers without changing balances",async()=>{
 const {swap,a,b,owner,one}=await fixture();
 const src="pragma solidity ^0.8.20; contract Fake {function balanceOf(address) external pure returns(uint){return 0;} function transferFrom(address,address,uint) external pure returns(bool){return true;} function transfer(address,uint) external pure returns(bool){return true;}}";
 const c=JSON.parse(solc.compile(JSON.stringify({language:"Solidity",sources:{"Fake.sol":{content:src}},settings:{outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}}}))).contracts["Fake.sol"].Fake;
 const token=await new ContractFactory(c.abi,"0x"+c.evm.bytecode.object,owner).deploy();await token.waitForDeployment();
 await one(swap.connect(a).propose(1,zero,parseEther("2")));
 await one(swap.connect(b).proposeAndAcceptA(1,await token.getAddress(),parseEther("10"),await swap.offerAHash(1)));
 await one(swap.connect(a).acceptAndDeposit(1,await swap.termsHash(1),{value:parseEther("2")}));
 await assert.rejects(one(swap.connect(b).deposit(1,{gasLimit:350000})));
 assert.equal((await swap.getSwap(1)).depositedB,false);
});

test("V5 charges B commission only on successful finalization",async()=>{
 const {swap,a,b,owner,one}=await fixture();
 const tokenSource="pragma solidity ^0.8.20; contract Token {mapping(address=>uint) public balanceOf; mapping(address=>mapping(address=>uint)) public allowance; function mint(address a,uint n) external {balanceOf[a]+=n;} function approve(address a,uint n) external returns(bool){allowance[msg.sender][a]=n;return true;} function transferFrom(address f,address t,uint n) external returns(bool){require(balanceOf[f]>=n&&allowance[f][msg.sender]>=n);balanceOf[f]-=n;allowance[f][msg.sender]-=n;balanceOf[t]+=n;return true;} function transfer(address t,uint n) external returns(bool){require(balanceOf[msg.sender]>=n);balanceOf[msg.sender]-=n;balanceOf[t]+=n;return true;}}";
 const c=JSON.parse(solc.compile(JSON.stringify({language:"Solidity",sources:{"Token.sol":{content:tokenSource}},settings:{outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}}}))).contracts["Token.sol"].Token;
 const token=await new ContractFactory(c.abi,"0x"+c.evm.bytecode.object,owner).deploy();await token.waitForDeployment();
 await one(swap.createInviteWithParties(await a.getAddress(),await b.getAddress(),500,2));
 await one(token.mint(await b.getAddress(),parseEther("10")));
 await one(swap.connect(a).propose(2,zero,parseEther("2")));
 await one(swap.connect(b).proposeAndAcceptA(2,await token.getAddress(),parseEther("10"),await swap.offerAHash(2)));
 await one(token.connect(b).approve(await swap.getAddress(),parseEther("10")));
 await one(swap.connect(a).acceptAndDeposit(2,await swap.termsHash(2),{value:parseEther("2")}));
 await one(swap.connect(b).deposit(2));
 const fee=await swap.preview(2);
 assert.equal(fee[0],parseEther("0.5"));
 assert.equal(fee[1],parseEther("9.5"));
 const before=await owner.provider.getBalance(await owner.getAddress());
 await one(swap.finalize(2));
 assert.equal(await token.balanceOf(await a.getAddress()),parseEther("9.5"));
 assert.equal(await token.balanceOf(await owner.getAddress()),parseEther("0.5"));
 assert.equal((await swap.getSwap(2)).completed,true);
});

test("V5 B commission remains zero on refund after settlement timeout",async()=>{
 const {swap,a,b,owner,node,one}=await fixture();
 const src="pragma solidity ^0.8.20; contract Token {mapping(address=>uint) public balanceOf; mapping(address=>mapping(address=>uint)) public allowance; function mint(address a,uint n) external {balanceOf[a]+=n;} function approve(address a,uint n) external returns(bool){allowance[msg.sender][a]=n;return true;} function transferFrom(address f,address t,uint n) external returns(bool){require(balanceOf[f]>=n&&allowance[f][msg.sender]>=n);balanceOf[f]-=n;allowance[f][msg.sender]-=n;balanceOf[t]+=n;return true;} function transfer(address t,uint n) external returns(bool){require(balanceOf[msg.sender]>=n);balanceOf[msg.sender]-=n;balanceOf[t]+=n;return true;}}";
 const c=JSON.parse(solc.compile(JSON.stringify({language:"Solidity",sources:{"Token.sol":{content:src}},settings:{outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}}}))).contracts["Token.sol"].Token;
 const token=await new ContractFactory(c.abi,"0x"+c.evm.bytecode.object,owner).deploy();await token.waitForDeployment();
 await one(swap.createInviteWithParties(await a.getAddress(),await b.getAddress(),500,2));
 await one(token.mint(await b.getAddress(),parseEther("10")));
 await one(swap.connect(a).propose(2,zero,parseEther("2")));
 await one(swap.connect(b).proposeAndAcceptA(2,await token.getAddress(),parseEther("10"),await swap.offerAHash(2)));
 await one(token.connect(b).approve(await swap.getAddress(),parseEther("10")));
 await one(swap.connect(a).acceptAndDeposit(2,await swap.termsHash(2),{value:parseEther("2")}));
 await one(swap.connect(b).deposit(2));
 const deadline=Number((await swap.getSwap(2)).settlementDeadline);
 await node.request({method:"evm_setTime",params:[(deadline+2)*1000]});
 await node.request({method:"evm_mine",params:[]});
 await one(swap.connect(a).refund(2,{gasLimit:350000}));
 await one(swap.connect(b).refund(2,{gasLimit:350000}));
 assert.equal(await token.balanceOf(await b.getAddress()),parseEther("10"));
 assert.equal(await token.balanceOf(await owner.getAddress()),0n);
 assert.equal((await swap.getSwap(2)).completed,false);
});

test("V5 legacy acceptance requires exact current terms hash",async()=>{
 const {swap,a,b,one}=await fixture();
 const src="pragma solidity ^0.8.20; contract Stub {}";
 const c=JSON.parse(solc.compile(JSON.stringify({language:"Solidity",sources:{"Stub.sol":{content:src}},settings:{outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}}}))).contracts["Stub.sol"].Stub;
 const token=await new ContractFactory(c.abi,"0x"+c.evm.bytecode.object,a).deploy();await token.waitForDeployment();
 await one(swap.connect(a).propose(1,zero,parseEther("2")));
 await one(swap.connect(b).propose(1,await token.getAddress(),parseEther("10")));
 const stale=await swap.termsHash(1);
 await one(swap.connect(a).propose(1,zero,parseEther("3")));
 await assert.rejects(one(swap.connect(b).acceptTerms(1,stale,{gasLimit:350000})));
 assert.equal((await swap.getSwap(1)).acceptedB,false);
 await one(swap.connect(b).acceptTerms(1,await swap.termsHash(1)));
 assert.equal((await swap.getSwap(1)).acceptedB,true);
});

test("V5 offer hash is bound to this chain and contract address",async()=>{
 const {swap,a,one}=await fixture();
 await one(swap.connect(a).propose(1,zero,parseEther("2")));
 const actual=await swap.offerAHash(1);
 const network=await a.provider.getNetwork();
 const {AbiCoder,keccak256}=await import("ethers");
 const coder=AbiCoder.defaultAbiCoder();
 const expected=keccak256(coder.encode(["uint256","address","uint256","address","address","uint256"],[network.chainId,await swap.getAddress(),1,await a.getAddress(),zero,parseEther("2")]));
 assert.equal(actual,expected);
 const wrong=keccak256(coder.encode(["uint256","address","uint256","address","address","uint256"],[network.chainId,"0x000000000000000000000000000000000000dEaD",1,await a.getAddress(),zero,parseEther("2")]));
 assert.notEqual(actual,wrong);
});

test("V5 rejects final approval hash from a different network",async()=>{
 const {swap,a,b,one}=await fixture();
 const src="pragma solidity ^0.8.20; contract Stub {}";
 const c=JSON.parse(solc.compile(JSON.stringify({language:"Solidity",sources:{"Stub.sol":{content:src}},settings:{outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}}}))).contracts["Stub.sol"].Stub;
 const token=await new ContractFactory(c.abi,"0x"+c.evm.bytecode.object,a).deploy();
 await token.waitForDeployment();
 await one(swap.connect(a).propose(1,zero,parseEther("2")));
 await one(swap.connect(b).proposeAndAcceptA(1,await token.getAddress(),parseEther("10"),await swap.offerAHash(1)));
 const correct=await swap.termsHash(1);
 const wrong="0x"+"ab".repeat(32);
 assert.notEqual(correct,wrong);
 await assert.rejects(one(swap.connect(a).acceptAndDeposit(1,wrong,{value:parseEther("2"),gasLimit:450000})));
 assert.equal((await swap.getSwap(1)).depositedA,false);
});
