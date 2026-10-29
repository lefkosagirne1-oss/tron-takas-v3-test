import fs from "node:fs";
import solc from "solc";
const source=fs.readFileSync("contracts/TakasV5FixedFee.sol","utf8");
const input={language:"Solidity",sources:{"TakasV5FixedFee.sol":{content:source}},settings:{optimizer:{enabled:true,runs:200},evmVersion:"paris",viaIR:true,outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}}};
const compiled=JSON.parse(solc.compile(JSON.stringify(input)));
const errors=(compiled.errors||[]).filter(x=>x.severity==="error");
if(errors.length)throw Error(errors.map(x=>x.formattedMessage).join("\n"));
const c=compiled.contracts["TakasV5FixedFee.sol"].TakasV5FixedFee;
if(!c?.evm?.bytecode?.object)throw Error("Missing V5 bytecode");
const invite=c.abi.find(x=>x.type==="function"&&x.name==="createInvite");
if(invite?.inputs?.length!==3||invite.inputs[0].type!=="uint256"||invite.inputs[1].type!=="uint8"||invite.inputs[2].type!=="address")throw Error("Fixed fee ABI mismatch");
const ui=fs.readFileSync("v5-common.js","utf8");
const required=["VERSION","manager","nextId","createInvite","requestRole","rejectRequests","confirmParticipants","propose","acceptTerms","deposit","finalize","refund","cancelUnused"];
const uiFns=new Map(Array.from(ui.matchAll(/fn\("([^"]+)",\[([^\]]*)\],\[([^\]]*)\],"(view|nonpayable|payable)"\)/g),m=>[m[1],{inputs:Array.from(m[2].matchAll(/"([^"]+)"/g),x=>x[1]),outputs:Array.from(m[3].matchAll(/"([^"]+)"/g),x=>x[1]),mutability:m[4]}]));
for(const name of required){
 const onchain=c.abi.find(x=>x.type==="function"&&x.name===name),client=uiFns.get(name);
 if(!onchain||!client)throw Error("V5 UI ABI function missing: "+name);
 if(JSON.stringify(onchain.inputs.map(x=>x.type))!==JSON.stringify(client.inputs)||JSON.stringify(onchain.outputs.map(x=>x.type))!==JSON.stringify(client.outputs)||onchain.stateMutability!==client.mutability)throw Error("V5 UI ABI mismatch: "+name);
}
const getter=c.abi.find(x=>x.type==="function"&&x.name==="getSwap");
if(!getter||getter.inputs?.[0]?.type!=="uint256"||getter.outputs?.[0]?.type!=="tuple")throw Error("getSwap ABI mismatch");
console.log("V5 UI ABI verified against compiled Solidity:",required.length,"functions");
console.log("V5 fixed-fee compilation OK:",c.evm.bytecode.object.length/2,"bytes");
