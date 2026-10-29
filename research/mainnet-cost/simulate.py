import urllib.request,json,time,pathlib,os
root=pathlib.Path(__file__).resolve().parent
results=[]
for name in ['strings-runs200-irtrue','strings-runs1-irtrue','errors-runs1-irtrue','errors-runs200-irtrue']:
 a=json.load(open(root/(name+'.json')))
 body={'owner_address':os.environ['SIMULATION_OWNER'],'visible':True,'data':a['bytecode']}
 req=urllib.request.Request('https://api.trongrid.io/wallet/triggerconstantcontract',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'})
 try:
  d=json.load(urllib.request.urlopen(req,timeout=30));row={'name':name,'energy':d.get('energy_used'),'result':d.get('result')};results.append(row);print(row,flush=True)
 except Exception as e:print(str(e),flush=True)
 time.sleep(1.3)
json.dump(results,open(root/'mainnet-simulation.json','w'),indent=2)
