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
// The optional candidate is produced by the pinned official compiler in CI.
// It is only simulated, never published or signed.
const candidatePath=process.env.V8_READONLY_CANDIDATE_ARTIFACT_PATH;
const candidate=candidatePath?JSON.parse(readFileSync(candidatePath,"utf8")):null;
if(candidate&&(candidate.contractName!=="TakasV8Invite"||
 candidate.compiler!=="tron-solc 0.8.31"||candidate.network!=="Nile"||
 !/^[0-9a-f]+$/i.test(candidate.bytecode||"")||
 candidate.bytecode===artifact.bytecode))
 throw Error("Unsigned candidate must be a distinct pinned official TRON artifact");

async function estimate(label,bytecode){
 const body={owner_address:owner,data:bytecode,call_value:0};
 const values={};
 for(const path of ["deployconstantcontract","triggerconstantcontract","estimateenergy"]){
  try{
   const result=await read(path,body);
   const energy=Number(result.energy_required??result.energy_used);
   const ok=result.result?.result===true&&Number.isSafeInteger(energy)&&energy>0;
   if(ok){
    values[path]=energy;
    console.log(label,path,"unsigned deployment Energy:",energy,
     "theoretical burn without Energy (TRX):",(energy*price/1e6).toFixed(4));
   }else console.log(label,path,"did not return a usable deployment estimate:",JSON.stringify(result).slice(0,350));
  }catch(e){console.log(label,path,"not available for unsigned deployment estimate:",String(e.message||e));}
 }
 return values;
}
const published=await estimate("published",artifact.bytecode);
if(candidate){
 const experimental=await estimate("experimental-custom-errors",candidate.bytecode);
 for(const path of ["triggerconstantcontract","estimateenergy"]){
  if(published[path]&&experimental[path]){
   const saved=published[path]-experimental[path];
   console.log("UNSIGNED NILE COMPARISON",path,"saved Energy:",saved,
    "theoretical TRX difference:",(saved*price/1e6).toFixed(4));
  }
 }
 if(!Object.keys(experimental).length)throw Error("No usable Nile candidate deployment estimate");
}
console.log(Object.keys(published).length?
 "Published artifact has a positive Nile read-only deployment estimate.":
 "No valid Nile deployment estimate; cost and deploy remain unverified.");
console.log("No signing, no broadcast, no TRX spent; synthetic owner is not the user's wallet.");
