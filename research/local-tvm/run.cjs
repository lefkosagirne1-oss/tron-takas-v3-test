process.env.NO_PROXY='127.0.0.1,localhost,::1';process.env.no_proxy=process.env.NO_PROXY;
const fs=require('fs'),{spawn}=require('child_process'),assert=require('assert');const {TronWeb}=require('tronweb');const crypto=require('crypto');
const home='/tmp/takas-local-tvm',host='http://127.0.0.1:18090';if(!/^http:\/\/127\.0\.0\.1:/.test(host))throw Error('Local only');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const keys=JSON.parse(fs.readFileSync(home+'/accounts.json'));const wallets=keys.map(x=>new TronWeb({fullHost:host,privateKey:x.privateKey}));const owner=wallets[0],a=wallets[1],b=wallets[2];const results={date:new Date().toISOString(),network:'isolated private TVM',steps:[],checks:[]};
const node=spawn(fs.readFileSync(home+'/java-path','utf8').trim(),['-Djava.net.preferIPv4Stack=true','-Xmx2g','-jar','FullNode.jar','--witness','-c','private.conf','-d',home+'/run-'+Date.now()],{cwd:home,env:{...process.env,LD_PRELOAD:home+'/loopback.so'},stdio:['ignore',fs.openSync(home+'/child.log','a',0o600),fs.openSync(home+'/child.log','a',0o600)]});
const post=async(path,body={})=>{const r=await fetch(host+'/wallet/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(3000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();};
async function wait(hash,label){for(let i=0;i<60;i++){const d=await post('gettransactioninfobyid',{value:hash});if(d.receipt){assert.equal(d.receipt.result,'SUCCESS',label+':'+d.receipt.result);results.steps.push({label,hash,energy:d.receipt.energy_usage_total||0,bandwidth:d.receipt.net_usage||0,net_fee:d.receipt.net_fee||0,energy_fee:d.receipt.energy_fee||0,fee:d.fee||0});fs.writeFileSync("research/local-tvm/results.json",JSON.stringify(results,null,2));console.log("Confirmed",label,d.receipt.energy_usage_total||0);return d;}await sleep(500);}throw Error('Receipt timeout '+label);}
async function deploy(artifact,label){const tx=await owner.transactionBuilder.createSmartContract({abi:artifact.abi,bytecode:artifact.bytecode,feeLimit:1000000000,userFeePercentage:100,originEnergyLimit:10000000},owner.defaultAddress.base58);const signed=await owner.trx.sign(tx);const sent=await owner.trx.sendRawTransaction(signed);if(!sent.result)throw Error("Local broadcast rejected: "+JSON.stringify({code:sent.code,message:sent.message}));const d=await wait(tx.txID,label);return owner.address.fromHex(d.contract_address);}
async function call(c,w,name,args,label,opts={}){const v=await w.contract(c.abi,c.addr);const hash=await v[name](...args).send({feeLimit:1000000000,shouldPollResponse:false,...opts});return wait(hash,label);}
async function rejectsOnTVM(swap,w,fn,id,label){
const c=await w.contract(swap.abi,swap.addr);const hash=await c[fn](id).send({feeLimit:1000000000,shouldPollResponse:false});
for(let i=0;i<60;i++){const d=await post('gettransactioninfobyid',{value:hash});if(d.receipt){if(d.receipt.result!=='REVERT')throw Error('Unexpected negative receipt '+label+': '+JSON.stringify(d.receipt));results.negative_checks??=[];results.negative_checks.push({label,hash,contractRet:d.receipt.result,energy:d.receipt.energy_usage_total||0});console.log('TVM rejection confirmed',label);return;}await sleep(500);}throw Error('Negative receipt timeout '+label);
}
const secret1='0x'+'11'.repeat(32),secret2='0x'+'22'.repeat(32);const sha=x=>'0x'+crypto.createHash('sha256').update(Buffer.from(x.replace(/^0x/,''),'hex')).digest('hex');const commit=(s,w)=>sha(s+w.address.toHex(w.defaultAddress.base58).slice(2));
(async()=>{for(let i=0;i<100;i++){try{const block=await post('getnowblock');if(block.block_header?.raw_data?.number>0)break;}catch(e){if(i%10===0)console.log('Waiting local RPC',e.message);}if(i===99)throw Error('Private node unavailable');await sleep(1000);}
results.parameters=await post('getchainparameters');results.peers=await post('listnodes');assert.equal(results.peers.nodes?.length||0,0);console.log('Private TVM started, zero peers');
const compiler=require('/tmp/tron-soljson.cjs').cwrap('solidity_compile','string',['string','number','number']);const source=fs.readFileSync('v6-test/invite.test.mjs','utf8').match(/const tokenSource=`([\s\S]*?)`;/)[1];const out=JSON.parse(compiler(JSON.stringify({language:'Solidity',sources:{'Token.sol':{content:source}},settings:{optimizer:{enabled:true,runs:200},evmVersion:'paris',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}}),0,0));const t=out.contracts['Token.sol'].Token;const token={abi:t.abi,bytecode:t.evm.bytecode.object};for(const name of ['strings-runs200-irtrue','errors-runs1-irtrue']){
const tokenAddr=await deploy(token,name+'.token.deploy'),tc={abi:token.abi,addr:tokenAddr};
const artifact=JSON.parse(fs.readFileSync('research/mainnet-cost-guarded/'+name+'.json'));
const swap={abi:artifact.abi,addr:await deploy(artifact,name+'.deploy')};const label=s=>name+'.'+s;
const c=await owner.contract(artifact.abi,swap.addr),ca=await a.contract(artifact.abi,swap.addr),cb=await b.contract(artifact.abi,swap.addr),tok=await owner.contract(token.abi,tokenAddr);
const addressBalance=async addr=>Number((await post('getaccount',{address:owner.address.toHex(addr)})).balance||0);const balance=w=>addressBalance(w.defaultAddress.base58);
await call(tc,owner,'mint',[b.defaultAddress.base58,'20000000'],label('mint'));
await call(tc,b,'approve',[swap.addr,'20000000'],label('approve'));
await call(swap,owner,'create',[1,'1000000',sha(secret1),sha(secret2)],label('create'));
await rejectsOnTVM(swap,owner,'finalize',1,label('reject-c-finalize-1'));
await call(swap,a,'commitRole',[1,1,commit(secret1,a)],label('commitA'));
await call(swap,b,'commitRole',[1,2,commit(secret2,b)],label('commitB'));await sleep(3500);
await call(swap,a,'deposit',[1,1,'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb','50000000',secret1],label('depositA'),{callValue:50000000});
await rejectsOnTVM(swap,a,'refund',1,label('reject-ca-refund-1'));await rejectsOnTVM(swap,owner,'finalize',1,label('reject-c-finalize-1'));
await call(swap,b,'deposit',[1,2,tokenAddr,'20000000',secret2],label('depositB'));
await rejectsOnTVM(swap,a,'finalize',1,label('reject-ca-finalize-1'));
const ownerBefore=await balance(owner),bBefore=await balance(b),tokenABefore=BigInt((await tok.balanceOf(a.defaultAddress.base58).call()).toString());
const receipt=await call(swap,owner,'finalize',[1],label('finalize'));
const d=await c.getDeal(1).call();assert(d.completed);assert.equal(BigInt((await tok.balanceOf(a.defaultAddress.base58).call()).toString())-tokenABefore,20000000n);
assert.equal((await balance(b))-bBefore,49000000);assert.equal((await balance(owner))-ownerBefore+(receipt.fee||0),1000000);assert.equal(await addressBalance(swap.addr),0);
await rejectsOnTVM(swap,owner,'finalize',1,label('reject-c-finalize-1'));await rejectsOnTVM(swap,a,'refund',1,label('reject-ca-refund-1'));
results.checks.push(name+': swap, exact token/TRX/commission balances, manager-only finalize, early refund/finalize and duplicate-finalize rejection');console.log(name,'equal-state swap and balances passed');
if(name.startsWith('errors')){
// Production bytecode and production deadlines, no shortened test windows.
for(const id of [2,3]){
await call(swap,owner,'create',[1,'1000000',sha(secret1),sha(secret2)],label('timeout'+id+'.create'));
await call(swap,a,'commitRole',[id,1,commit(secret1,a)],label('timeout'+id+'.commitA'));await sleep(3500);
await call(swap,a,'deposit',[id,1,'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb','50000000',secret1],label('timeout'+id+'.depositA'),{callValue:50000000});
}
await call(tc,owner,'mint',[b.defaultAddress.base58,'20000000'],label('timeout3.mint'));await call(tc,b,'approve',[swap.addr,'20000000'],label('timeout3.approve'));
await call(swap,b,'commitRole',[3,2,commit(secret2,b)],label('timeout3.commitB'));await sleep(3500);
await call(swap,b,'deposit',[3,2,tokenAddr,'20000000',secret2],label('timeout3.depositB'));
const single=await c.getDeal(2).call(),dual=await c.getDeal(3).call();
const chainTime=async()=>Number((await post('getnowblock')).block_header.raw_data.timestamp)/1000;
const now=await chainTime();assert(Number(single.depositDeadline.toString())-now>800);assert(Number(dual.finalDeadline.toString())-now>250);
results.deadlines={single:Number(single.depositDeadline.toString()),dual:Number(dual.finalDeadline.toString()),setupChainTime:now};
await rejectsOnTVM(swap,a,'refund',2,label('reject-ca-refund-2'));await rejectsOnTVM(swap,a,'refund',3,label('reject-ca-refund-3'));await rejectsOnTVM(swap,b,'refund',3,label('reject-cb-refund-3'));
async function until(deadline,what){let tick=0;while(await chainTime()<deadline){if(tick++%30===0){console.log('Waiting production deadline',what,Math.ceil(deadline-await chainTime()),'seconds remaining');fs.writeFileSync('research/local-tvm/results.json',JSON.stringify(results,null,2));}await sleep(2000);}}
await until(results.deadlines.dual+1,'5-minute final window');await rejectsOnTVM(swap,owner,'finalize',3,label('reject-c-finalize-3'));
let before=await balance(a);let rr=await call(swap,a,'refund',[3],label('timeout3.refundA'));assert.equal((await balance(a))-before+(rr.fee||0),50000000);
const tokenBefore=BigInt((await tok.balanceOf(b.defaultAddress.base58).call()).toString());await call(swap,b,'refund',[3],label('timeout3.refundB'));assert.equal(BigInt((await tok.balanceOf(b.defaultAddress.base58).call()).toString())-tokenBefore,20000000n);
let state=await c.getDeal(3).call();assert(state.refundedA&&state.refundedB);await rejectsOnTVM(swap,a,'refund',3,label('reject-ca-refund-3'));results.checks.push('Production 5-minute window: both refunds exact, no commission, late finalize and double refund rejected');console.log('5-minute double refund passed');
await until(results.deadlines.single+1,'15-minute funding window');before=await balance(a);rr=await call(swap,a,'refund',[2],label('timeout2.refundA'));assert.equal((await balance(a))-before+(rr.fee||0),50000000);state=await c.getDeal(2).call();assert(state.refundedA);await rejectsOnTVM(swap,a,'refund',2,label('reject-ca-refund-2'));assert.equal(await addressBalance(swap.addr),0);results.checks.push('Production 15-minute window: single refund exact, no commission, double refund rejected');console.log('15-minute single refund passed');
}
}

})().then(()=>{fs.writeFileSync('research/local-tvm/results.json',JSON.stringify(results,null,2));console.log('Results saved');}).catch(e=>{results.error=String(e.message).replace(/[a-fA-F0-9]{64}/g,'[redacted]');fs.writeFileSync('research/local-tvm/results.json',JSON.stringify(results,null,2));console.log('TEST ERROR',results.error);process.exitCode=1;}).finally(async()=>{await sleep(3500);node.kill('SIGTERM');});
