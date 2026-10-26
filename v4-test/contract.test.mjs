import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import solc from "solc";
import ganache from "ganache";
import { BrowserProvider, ContractFactory, Contract, parseEther } from "ethers";

const mockToken = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract MockToken {
    string public constant name = "Test Token";
    string public constant symbol = "TST";
    uint8 public constant decimals = 18;
    mapping(address=>uint256) public balanceOf;
    mapping(address=>mapping(address=>uint256)) public allowance;
    function mint(address to, uint256 value) external {balanceOf[to]+=value;}
    function approve(address spender,uint256 value) external returns(bool) {allowance[msg.sender][spender]=value;return true;}
    function transfer(address to,uint256 value) external returns(bool) {
        require(balanceOf[msg.sender]>=value,"balance");
        balanceOf[msg.sender]-=value;balanceOf[to]+=value;return true;
    }
    function transferFrom(address from,address to,uint256 value) external returns(bool) {
        require(balanceOf[from]>=value&&allowance[from][msg.sender]>=value,"allowance/balance");
        allowance[from][msg.sender]-=value;balanceOf[from]-=value;balanceOf[to]+=value;return true;
    }
}`;

function compile() {
  const input = {
    language:"Solidity",
    sources:{
      "TakasV4Draft.sol":{content:readFileSync(new URL("../contracts/TakasV4Draft.sol", import.meta.url),"utf8")},
      "MockToken.sol":{content:mockToken}
    },
    settings:{
      optimizer:{enabled:true,runs:200},
      viaIR:true,
      outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}
    }
  };
  const output=JSON.parse(solc.compile(JSON.stringify(input)));
  const errors=(output.errors||[]).filter(e=>e.severity==="error");
  assert.equal(errors.length,0,errors.map(e=>e.formattedMessage).join("\n"));
  const take=(file,name)=>{
    const item=output.contracts[file][name];
    assert.ok(item.evm.bytecode.object.length>0,"bytecode");
    return {abi:item.abi,bytecode:"0x"+item.evm.bytecode.object};
  };
  return {swap:take("TakasV4Draft.sol","TakasV4Draft"),token:take("MockToken.sol","MockToken")};
}

const artifacts=compile();
async function fixture() {
  const node=ganache.provider({logging:{quiet:true},wallet:{totalAccounts:5,defaultBalance:1000},chain:{hardfork:"shanghai"}});
  const provider=new BrowserProvider(node);
  const [owner,a,b,other]=await Promise.all([0,1,2,3].map(i=>provider.getSigner(i)));
  const swap=await new ContractFactory(artifacts.swap.abi,artifacts.swap.bytecode,owner).deploy();
  await swap.waitForDeployment();
  const token=await new ContractFactory(artifacts.token.abi,artifacts.token.bytecode,owner).deploy();
  await token.waitForDeployment();
  const one=(fn)=>fn.then(tx=>tx.wait());
  return {node,provider,owner,a,b,other,swap,token,one};
}

async function registerAndOffer(f,{fee=500,payer=1,amountA=parseEther("100"),amountB=parseEther("50000")}={}) {
  const {swap,token,owner,a,b,one}=f;
  await one(swap.createInvite(fee,payer));
  const id=1;
  await one(swap.connect(a).requestRole(id,1));
  await one(swap.connect(b).requestRole(id,2));
  await one(swap.confirmParticipants(id));
  await one(swap.connect(a).propose(id,"0x0000000000000000000000000000000000000000",amountA));
  await one(swap.connect(b).propose(id,await token.getAddress(),amountB));
  await one(token.mint(await b.getAddress(),amountB));
  await one(token.connect(b).approve(await swap.getAddress(),amountB));
  await one(swap.connect(a).acceptTerms(id));
  await one(swap.connect(b).acceptTerms(id));
  return id;
}

test("participant-driven 100 native ↔ 50000 token: 5% A fee and exact settlement",async()=>{
  const f=await fixture();const {swap,token,a,b,owner,one,provider}=f;
  await registerAndOffer(f);
  const abefore=await token.balanceOf(await a.getAddress());
  await one(swap.connect(a).deposit(1,{value:parseEther("100")}));
  await one(swap.connect(b).deposit(1));
  const rawBalance=async addr=>BigInt(await f.node.request({method:"eth_getBalance",params:[addr,"latest"]}));
  const beforeB=await rawBalance(await b.getAddress());
  const beforeFee=await rawBalance(await owner.getAddress());
  await one(swap.finalize(1));
  assert.equal((await token.balanceOf(await a.getAddress()))-abefore,parseEther("50000"));
  assert.equal((await rawBalance(await b.getAddress()))-beforeB,parseEther("95"));
  assert.ok((await rawBalance(await owner.getAddress()))>beforeFee, "manager receives fee after transaction gas");
  assert.equal(await provider.getBalance(await swap.getAddress()),0n);
  assert.equal((await swap.getSwap(1)).completed,true);
  await assert.rejects(one(swap.finalize(1)));
  await assert.rejects(one(swap.connect(a).refund(1)));
});

test("both parties can withdraw after settlement deadline if manager does not finalize",async()=>{
  const f=await fixture();const {swap,a,b,provider,token,one}=f;
  await registerAndOffer(f);
  await one(swap.connect(a).deposit(1,{value:parseEther("100")}));
  await one(swap.connect(b).deposit(1));
  await provider.send("evm_increaseTime",[31*60]);
  await provider.send("evm_mine",[]);
  await assert.rejects(one(swap.finalize(1)));
  const before=await token.balanceOf(await b.getAddress());
  await one(swap.connect(a).refund(1));
  await one(swap.connect(b).refund(1));
  assert.equal(await token.balanceOf(await b.getAddress()),before+parseEther("50000"));
  assert.equal(await provider.getBalance(await swap.getAddress()),0n);
  await assert.rejects(one(swap.connect(a).refund(1)));
});

test("changed offer resets both approvals; unauthorized settlement blocked",async()=>{
  const f=await fixture();const {swap,a,b,other,token,one}=f;
  await one(swap.createInvite(500,1));
  await one(swap.connect(a).requestRole(1,1));
  await one(swap.connect(b).requestRole(1,2));
  await one(swap.confirmParticipants(1));
  await one(swap.connect(a).propose(1,"0x0000000000000000000000000000000000000000",parseEther("100")));
  await one(swap.connect(b).propose(1,await token.getAddress(),parseEther("50000")));
  await one(swap.connect(a).acceptTerms(1));
  assert.equal((await swap.getSwap(1)).acceptedA,true);
  await one(swap.connect(b).propose(1,await token.getAddress(),parseEther("60000")));
  const state=await swap.getSwap(1);
  assert.equal(state.acceptedA,false);
  assert.equal(state.acceptedB,false);
  await assert.rejects(one(swap.connect(other).finalize(1)));
  await assert.rejects(one(swap.connect(other).deposit(1)));
  await assert.rejects(one(swap.connect(other).propose(1,await token.getAddress(),1n)));
});

test("deposit timeout: single depositor receives full refund with no fee",async()=>{
  const f=await fixture();const {swap,a,b,owner,provider,one}=f;
  await registerAndOffer(f);
  await one(swap.connect(a).deposit(1,{value:parseEther("100")}));
  await provider.send("evm_increaseTime",[16*60]);
  await provider.send("evm_mine",[]);
  const managerBefore=await provider.getBalance(await owner.getAddress());
  await one(swap.connect(a).refund(1));
  assert.equal(await provider.getBalance(await swap.getAddress()),0n);
  assert.equal(await provider.getBalance(await owner.getAddress()),managerBefore);
  await assert.rejects(one(swap.connect(b).deposit(1)));
});

test("service fee zero and participant wallet rules",async()=>{
  const f=await fixture();const {swap,a,b,other,one}=f;
  await assert.rejects(one(swap.connect(other).createInvite(500,1)));
  await assert.rejects(one(swap.createInvite(2000,1)));
  await one(swap.createInvite(0,0));
  await one(swap.connect(a).requestRole(1,1));
  await assert.rejects(one(swap.connect(a).requestRole(1,2)));
  await assert.rejects(one(swap.confirmParticipants(1)));
  await one(swap.connect(b).requestRole(1,2));
  assert.equal((await swap.getSwap(1)).partyB,await b.getAddress());
  await one(swap.confirmParticipants(1,{gasLimit:500000}));
  await assert.rejects(one(swap.connect(other).requestRole(1,1)));
});
