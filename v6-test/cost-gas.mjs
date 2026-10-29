import test from "node:test";
import {createHash} from "node:crypto";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import solc from "solc";
import ganache from "ganache";
import {BrowserProvider,ContractFactory,parseEther,parseUnits} from "ethers";
const inviteA="0x"+"11".repeat(32),inviteB="0x"+"22".repeat(32);
const inviteHash=secret=>"0x"+createHash("sha256").update(Buffer.from(secret.slice(2),"hex")).digest("hex");
const tokenSource=`pragma solidity ^0.8.20; contract Token {mapping(address=>uint256) public balanceOf; mapping(address=>mapping(address=>uint256)) public allowance; function mint(address a,uint256 n) external {balanceOf[a]+=n;} function approve(address s,uint256 n) external returns(bool){allowance[msg.sender][s]=n;return true;} function transfer(address to,uint256 n) external returns(bool){require(balanceOf[msg.sender]>=n);balanceOf[msg.sender]-=n;balanceOf[to]+=n;return true;} function transferFrom(address from,address to,uint256 n) external returns(bool){require(balanceOf[from]>=n&&allowance[from][msg.sender]>=n);allowance[from][msg.sender]-=n;balanceOf[from]-=n;balanceOf[to]+=n;return true;}}`;
const input={language:"Solidity",sources:{"V8.sol":{content:readFileSync(process.env.COST_SOURCE,"utf8")},"Token.sol":{content:tokenSource}},settings:{optimizer:{enabled:true,runs:Number(process.env.COST_RUNS||200)},evmVersion:"paris",viaIR:true,outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}}};
const out=JSON.parse(solc.compile(JSON.stringify(input)));
assert.deepEqual((out.errors||[]).filter(x=>x.severity==="error").map(x=>x.formattedMessage),[]);
const artifact=(f,n)=>[out.contracts[f][n].abi,"0x"+out.contracts[f][n].evm.bytecode.object];
const receipts=[];
async function setup(payer=0,bps=0){
 const provider=new BrowserProvider(ganache.provider({logging:{quiet:true},wallet:{totalAccounts:5,defaultBalance:1000},chain:{hardfork:"shanghai"}}));
 provider.pollingInterval=10;
 const [owner,a,b,other]=await Promise.all([0,1,2,3].map(i=>provider.getSigner(i)));
 const swap=await new ContractFactory(...artifact("V8.sol","TakasV8Invite"),owner).deploy();await swap.waitForDeployment();
 const token=await new ContractFactory(...artifact("Token.sol","Token"),owner).deploy();await token.waitForDeployment();
 const send=async tx=>{const r=await (await tx).wait(); receipts.push(Number(r.gasUsed));return r;};
 await send(swap.create(payer,bps,inviteHash(inviteA),inviteHash(inviteB)));
 await send(token.mint(await b.getAddress(),parseEther("20")));
 await send(token.connect(b).approve(await swap.getAddress(),parseEther("20")));
 const depositA=()=>send(swap.connect(a).deposit(1,1,"0x0000000000000000000000000000000000000000",parseUnits("3",6),inviteA,{value:parseUnits("3",6)}));
 const depositB=async()=>send(swap.connect(b).deposit(1,2,await token.getAddress(),parseEther("20"),inviteB));
 return {provider,owner,a,b,other,swap,token,send,depositA,depositB,inviteA,inviteB};
}

const x=await setup(1,1000000);await x.depositA();await x.depositB();await x.send(x.swap.finalize(1));console.log(JSON.stringify({source:process.env.COST_SOURCE,gas:receipts}));await x.provider.destroy();
