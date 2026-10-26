import fs from "node:fs";
import solc from "solc";
const contractSource=fs.readFileSync("contracts/TakasV4Draft.sol","utf8");
const input={
 language:"Solidity",
 sources:{"TakasV4Draft.sol":{content:contractSource}},
 settings:{
  optimizer:{enabled:true,runs:200},
  viaIR:true,
  outputSelection:{"*":{"*":["abi","evm.bytecode.object","evm.deployedBytecode.object"]}}
 }
};
const compiled=JSON.parse(solc.compile(JSON.stringify(input)));
const errors=(compiled.errors||[]).filter(x=>x.severity==="error");
if(errors.length)throw Error(errors.map(x=>x.formattedMessage).join("\n"));
const c=compiled.contracts["TakasV4Draft.sol"].TakasV4Draft;
if(!c.evm.bytecode.object || !Array.isArray(c.abi))throw Error("No ABI/bytecode");
const artifact={
 contractName:"TakasV4Draft",
 network:"nile",
 compiler:"0.8.31",
 optimizerRuns:200,
 sourceSha256:null,
 abi:c.abi,
 bytecode:c.evm.bytecode.object,
 deployedBytecode:c.evm.deployedBytecode.object
};
fs.writeFileSync("v4-deploy-artifact.json",JSON.stringify(artifact,null,2)+"\n");
console.log("V4 artifact generated: "+artifact.bytecode.length/2+" bytes bytecode, "+artifact.abi.length+" ABI entries");
