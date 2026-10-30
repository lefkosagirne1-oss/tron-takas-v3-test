const fs=require('fs');const {TronWeb}=require('tronweb');const home='/tmp/takas-local-tvm';
(async()=>{const accounts=await Promise.all([0,1,2,3].map(()=>TronWeb.createAccount()));fs.writeFileSync(home+'/accounts.json',JSON.stringify(accounts),{mode:0o600});const assets=accounts.map((x,i)=>({accountName:'Test'+i,accountType:'Normal',address:x.address.base58,balance:'100000000000000'}));assets.push({accountName:'Blackhole',accountType:'AssetIssue',address:'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb',balance:'-9223372036854775808'});const text=`include "release.conf"
seed.node.ip.list=[]
node.active=[]
node.passive=[]
node.fastForward=[]
node.discovery.enable=false
node.discovery.persist=false
node.p2p.version=297102924
node.listen.port=19891
node.http.fullNodeEnable=true
node.http.fullNodePort=18090
node.http.solidityEnable=false
node.http.PBFTEnable=false
node.rpc.minEffectiveConnection=0
node.rpc.enable=false
node.rpc.solidityEnable=false
node.rpc.PBFTEnable=false
node.dns.treeUrls=[]
localwitness=${JSON.stringify([accounts[3].privateKey])}
genesis.block.assets=${JSON.stringify(assets)}
genesis.block.witnesses=${JSON.stringify([{address:accounts[3].address.base58,url:'http://localhost',voteCount:100000}])}
genesis.block.timestamp="${Date.now()-60000}"
block.needSyncCheck=false
block.maintenanceTimeInterval=300000
vm.supportConstant=true
committee.allowCreationOfContracts=1
committee.allowSameTokenName=1
committee.allowTvmTransferTrc10=1
committee.allowTvmConstantinople=1
committee.allowTvmSolidity059=1
committee.allowTvmIstanbul=1
committee.allowTvmLondon=1
committee.allowTvmShangHai=1
committee.allowMultiSign=1
`;
fs.writeFileSync(home+'/private.conf',text,{mode:0o600});console.log('Ephemeral isolated test configuration generated');})();
