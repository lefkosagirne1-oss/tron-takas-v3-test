// Nile-only, unsigned deployment estimation. Never builds, signs, or broadcasts a transaction.
import {readFileSync} from "node:fs";
const endpoint="https://nile.trongrid.io/wallet/";
const artifact=JSON.parse(readFileSync(new URL("../v6-test/dist/TakasV8Invite.json",import.meta.url),"utf8"));
if(artifact.contractName!=="TakasV8Invite"||artifact.compiler!=="tron-solc 0.8.31"||
   !/^[0-9a-f]+$/i.test(artifact.bytecode||""))throw Error("Pinned official V8 artifact required");
const owner="41"+"11".repeat(20); // Synthetic public test address; never a user wallet.
async function read(path,body){
 const response=await fetch(endpoint+path,{method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error(path+" HTTP "+response.status);
 return response.json();
}
const block=await read("getnowblock",{});
const params=await read("getchainparameters",{});
const number=Number(block?.block_header?.raw_data?.number);
const timestamp=Number(block?.block_header?.raw_data?.timestamp);
const price=Number(params?.chainParameter?.find(x=>x.key==="getEnergyFee")?.value);
if(!Number.isSafeInteger(number)||number<1||!Number.isFinite(timestamp)||
   Math.abs(Date.now()-timestamp)>600000||!Number.isFinite(price)||price<=0)
 throw Error("Nile block/chain parameter read failed");
console.log("Nile read-only block:",number,"Energy price (SUN):",price);
const body={owner_address:owner,data:artifact.bytecode,call_value:0};
let success=false;
for(const path of ["deployconstantcontract","triggerconstantcontract","estimateenergy"]){
 try{
  const result=await read(path,body);
  const energy=Number(result.energy_required??result.energy_used);
  const ok=result.result?.result===true&&Number.isFinite(energy)&&energy>0;
  if(ok){success=true;console.log(path,"unsigned deployment Energy:",energy,
    "theoretical burn without Energy (TRX):",(energy*price/1e6).toFixed(4));}
  else console.log(path,"did not return a usable deployment estimate:",JSON.stringify(result).slice(0,350));
 }catch(e){console.log(path,"not available for unsigned deployment estimate:",String(e.message||e));}
}
console.log(success?"At least one Nile read-only deployment estimate returned positive Energy.":
 "No valid Nile deployment estimate; cost and deploy remain unverified.");
console.log("No signing, no broadcast, no TRX spent; synthetic owner is not the user's wallet.");
