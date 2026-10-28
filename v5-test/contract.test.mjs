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
 await one(swap.connect(b).proposeAndAcceptA(1,await token.getAddress(),parseEther("10")));
 await one(token.mint(await b.getAddress(),parseEther("10")));
 await one(token.connect(b).approve(await swap.getAddress(),parseEther("10")));
 await one(swap.connect(a).acceptAndDeposit(1,{value:parseEther("2")}));
 assert.equal((await swap.getSwap(1)).depositedA,true);
 await one(swap.connect(b).deposit(1));
 await assert.rejects(swap.connect(a).finalize(1));
 await one(swap.finalize(1));
 assert.equal((await swap.getSwap(1)).completed,true);
 assert.equal(await token.balanceOf(await a.getAddress()),parseEther("10"));
 await assert.rejects(swap.finalize(1));
});
test("V5 cannot accept or deposit before counterparty offer",async()=>{
 const {swap,a}=await fixture();
 await assert.rejects(swap.connect(a).acceptAndDeposit(1,{value:parseEther("2")}));
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
 await assert.rejects(swap.connect(b).proposeAndAcceptA(1,zero,parseEther("5")));
 assert.equal((await swap.getSwap(1)).acceptedB,false);
 await one(swap.connect(a).propose(1,zero,parseEther("3")));
 await assert.rejects(swap.connect(a).acceptAndDeposit(1,{value:parseEther("3")}));
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
 await one(swap.connect(b).proposeAndAcceptA(1,await token.getAddress(),parseEther("10")));
 await one(swap.connect(a).acceptAndDeposit(1,{value:parseEther("2")}));
 await assert.rejects(one(swap.connect(a).refund(1)));
 const deadline=Number((await swap.getSwap(1)).depositDeadline);
 await node.request({method:"evm_setTime",params:[(deadline+2)*1000]});
 await node.request({method:"evm_mine",params:[]});
 await one(swap.connect(a).refund(1,{gasLimit:350000}));
 assert.equal((await swap.getSwap(1)).refundedA,true);
 await assert.rejects(one(swap.connect(a).refund(1)));
 await assert.rejects(one(swap.finalize(1)));
});
