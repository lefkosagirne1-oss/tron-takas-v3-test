const fs=require('fs');const solc=require(process.env.TRON_SOLC_PATH||'/tmp/tron-soljson.cjs');const compile=solc.cwrap('solidity_compile','string',['string','number','number']);const base=JSON.parse(fs.readFileSync(__dirname+'/baseline-input.json'));const rows=[];
for(const custom of [false,true])for(const runs of [1,200])for(const viaIR of [true,false]){
let sourceErrors=[];let input=JSON.parse(JSON.stringify(base)),source=input.sources['TakasV8Invite.sol'].content;
if(custom){let n=0;source=source.replace(/,\s*"([^"]+)"\s*\);/g,(all,msg)=>{let name='E'+(++n);sourceErrors.push(name);return ', '+name+'());';});}
input.settings.optimizer.runs=runs;input.settings.viaIR=viaIR;
if(custom){source=source.replace('contract TakasV8Invite {','contract TakasV8Invite {\n'+sourceErrors.map(x=>'error '+x+'();').join('\n'));source=source.replace(/revert\("Not a depositor"\)/g,'revert NotDepositor()').replace('contract TakasV8Invite {','contract TakasV8Invite {\nerror NotDepositor();');}
input.sources['TakasV8Invite.sol'].content=source;
const out=JSON.parse(compile(JSON.stringify(input),0,0));const errors=(out.errors||[]).filter(x=>x.severity==='error');const name=`${custom?'errors':'strings'}-runs${runs}-ir${viaIR}`;
if(errors.length){rows.push({name,errors:errors.map(x=>x.message)});continue;}
const c=out.contracts['TakasV8Invite.sol'].TakasV8Invite;fs.writeFileSync(__dirname+'/'+name+'.json',JSON.stringify({abi:c.abi,bytecode:c.evm.bytecode.object,runtime:c.evm.deployedBytecode.object}));fs.writeFileSync(__dirname+'/'+name+'.sol',source);rows.push({name,creation:c.evm.bytecode.object.length/2,runtime:c.evm.deployedBytecode.object.length/2});console.log(rows.at(-1));
}
fs.writeFileSync(__dirname+'/matrix.json',JSON.stringify(rows,null,2));
