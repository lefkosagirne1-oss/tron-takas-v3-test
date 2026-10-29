import json,urllib.request,pathlib,time,os
root=pathlib.Path(__file__).resolve().parent.parent
rows=[]
for directory,name in [('mainnet-cost','strings-runs200-irtrue'),('mainnet-cost','errors-runs1-irtrue'),('mainnet-cost-guarded','errors-runs1-irtrue')]:
 a=json.load(open(root/directory/(name+'.json')))
 owner=os.environ['SIMULATION_OWNER']
 body={'owner_address':owner,'new_contract':{'origin_address':owner,'contract_name':'TakasV8Invite','abi':{'entrys':a['abi']},'bytecode':a['bytecode'],'call_value':0,'consume_user_resource_percent':100,'origin_energy_limit':10000000},'fee_limit':160000000,'visible':True}
 try:
  body={'owner_address':owner,'abi':json.dumps(a['abi']),'bytecode':a['bytecode'],'call_value':0,'consume_user_resource_percent':100,'origin_energy_limit':10000000,'fee_limit':160000000,'name':'TakasV8Invite','visible':True}
  req=urllib.request.Request('https://api.trongrid.io/wallet/deploycontract',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'})
  d=json.load(urllib.request.urlopen(req,timeout=25));raw=d.get('raw_data_hex');
  if raw and a['bytecode'] in raw:
   n=len(raw)//2
   def varlen(n):
    x=1
    while n>127:n>>=7;x+=1
    return x
   size=1+varlen(n)+n+1+1+65+64
   row={'variant':directory+'/'+name,'raw_data_bytes':n,'single_signature_bandwidth_estimate':size,'bandwidth_TRX_if_no_quota':size/1000,'method':'unsigned raw_data envelope + one 65-byte signature + 64 result allowance; no signature or broadcast performed'}
  else:row={'variant':name,'error':d}
 except Exception as e:row={'variant':name,'error':str(e)}
 print(json.dumps(row)[:1000],flush=True);rows.append(row);time.sleep(1.3)
json.dump(rows,open(root/'mainnet-cost'/'bandwidth.json','w'),indent=2)
