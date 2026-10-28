import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {createHash} from "node:crypto";
import solc from "solc";

const source=readFileSync(new URL("../contracts/TakasV5Draft.sol",import.meta.url),"utf8");
const input={language:"Solidity",sources:{"TakasV5Draft.sol":{content:source}},settings:{optimizer:{enabled:true,runs:200},viaIR:true,evmVersion:"paris",outputSelection:{"*":{"*":["abi","evm.bytecode.object","evm.deployedBytecode.object"]}}}};
const result=JSON.parse(solc.compile(JSON.stringify(input)));
const errors=(result.errors||[]).filter(e=>e.severity==="error");
if(errors.length)throw Error(errors.map(e=>e.formattedMessage).join("\n"));
const contract=result.contracts["TakasV5Draft.sol"].TakasV5Draft;
if(!contract.evm.bytecode.object || !contract.evm.deployedBytecode.object)throw Error("Missing deploy bytecode");
const artifact={contractName:"TakasV5Draft",network:"TRON Nile TESTNET ONLY - not deployed",solcVersion:solc.version(),sourceSha256:createHash("sha256").update(source).digest("hex"),abi:contract.abi,bytecode:"0x"+contract.evm.bytecode.object,deployedBytecode:"0x"+contract.evm.deployedBytecode.object};
mkdirSync("v5-build",{recursive:true});
writeFileSync("v5-build/TakasV5Draft.json",JSON.stringify(artifact,null,2)+"\n");
console.log("V5 deploy artifact generated; source SHA256:",artifact.sourceSha256);
console.log("Creation bytecode bytes:",artifact.bytecode.length/2-1);
console.log("NO chain transaction was sent.");
