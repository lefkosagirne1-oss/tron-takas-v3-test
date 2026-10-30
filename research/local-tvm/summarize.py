import json,pathlib
root=pathlib.Path(__file__).resolve().parent
x=json.load(open(root/'results.json'));m=json.load(open(root/'mainnet-parameters.json'))
local={v['key']:v.get('value',0) for v in x['parameters']['chainParameter']};main={v['key']:v.get('value',0) for v in m['chainParameter']}
def row(s):
 bw=s['bandwidth'] or s['net_fee']//local['getTransactionFee']
 return {'label':s['label'],'energy':s['energy'],'bandwidth_units':bw,'energy_TRX_at_mainnet_price':s['energy']*main['getEnergyFee']/1e6,'bandwidth_TRX_without_quota':bw*main['getTransactionFee']/1e6}
summary={'status':('passed' if len(x['checks'])>=4 and len(x.get('negative_checks',[]))>=7 and not x.get('error') else 'incomplete'),'measurement_date':x['date'],'kind':'local private TVM receipts; hypothetical current Mainnet price conversion, no Mainnet deployment','local_mainnet_parameter_differences':{k:{'local':local.get(k),'mainnet':main.get(k)} for k in ['getEnergyFee','getTransactionFee','getFreeNetLimit','getAllowDynamicEnergy','getDynamicEnergyThreshold','getDynamicEnergyIncreaseFactor','getDynamicEnergyMaxFactor','getAllowEnergyAdjustment','getAllowStrictMath']},'negative_receipt_checks':x.get('negative_checks',[]),'checks':x['checks'],'error':x.get('error'),'variants':{}}
for prefix in ['strings-runs200-irtrue','errors-runs1-irtrue']:
 allrows=[row(s) for s in x['steps'] if s['label'].startswith(prefix+'.')]
 runtime=[r for r in allrows if len(r['label'].split('.'))==2 and r['label'].split('.')[-1] in ['create','commitA','commitB','approve','depositA','depositB','finalize']]
 deploy=next(r for r in allrows if r['label']==prefix+'.deploy')
 e=sum(r['energy'] for r in runtime);bw=sum(r['bandwidth_units'] for r in runtime)
 summary['variants'][prefix]={'deployment':deploy,'runtime_steps':runtime,'runtime_energy':e,'runtime_bandwidth_units':bw,'runtime_total_TRX_without_resources':(e*main['getEnergyFee']+bw*main['getTransactionFee'])/1e6,'deployment_total_TRX_without_resources':deploy['energy_TRX_at_mainnet_price']+deploy['bandwidth_TRX_without_quota'],'refund_steps':[r for r in allrows if 'refund' in r['label']]}
base=summary['variants']['strings-runs200-irtrue'];opt=summary['variants']['errors-runs1-irtrue'];summary['savings']={'constructor_energy':base['deployment']['energy']-opt['deployment']['energy'],'constructor_energy_percent':100*(1-opt['deployment']['energy']/base['deployment']['energy']),'runtime_energy':base['runtime_energy']-opt['runtime_energy'],'runtime_energy_percent':100*(1-opt['runtime_energy']/base['runtime_energy']),'runtime_TRX':base['runtime_total_TRX_without_resources']-opt['runtime_total_TRX_without_resources']}
(root/'summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps({'checks':summary['checks'],'savings':summary['savings'],'totals':{k:{'deploy':v['deployment_total_TRX_without_resources'],'swap':v['runtime_total_TRX_without_resources']} for k,v in summary['variants'].items()}},indent=2))
