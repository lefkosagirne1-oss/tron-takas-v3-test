import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";
const source=readFileSync("contracts/TakasV5FixedFee.sol","utf8");
const shared=readFileSync("v5-common.js","utf8");
new vm.Script(shared,{filename:"v5-common.js"});
const context={window:{}};vm.runInNewContext(shared,context,{filename:"v5-common.js"});
const v5=context.window.V5;
assert.equal(v5.units("0.25",6,false),250000n,"0.25 TRX = 250000 SUN");
assert.equal(v5.format(250000n,6),"0.25");
assert.equal(v5.units("2",18,false),2000000000000000000n,"18-decimal token fee");
assert.throws(()=>v5.units("0.0000001",6,false),"reject sub-SUN precision");
assert.throws(()=>v5.units("0",6,false),"reject zero deposit");
const netA=v5.net({feePayer:1n,feeAmount:250000n,amountA:3000000n,amountB:20000000000000000000n});
assert.equal(netA.forB,2750000n);
assert.equal(netA.forA,20000000000000000000n);
const netB=v5.net({feePayer:2n,feeAmount:2000000000000000000n,amountA:3000000n,amountB:20000000000000000000n});
assert.equal(netB.forA,18000000000000000000n);
assert.equal(netB.forB,3000000n);
assert.equal(v5.feeValid({feePayer:1n,feeAmount:3000000n,amountA:3000000n,amountB:1n}),false);
assert.equal(v5.feeValid({feePayer:1n,feeAmount:250000n,amountA:3000000n,amountB:1n}),true);

const struct=source.match(/struct Swap\s*\{([\s\S]*?)\}/)?.[1];
assert.ok(struct,"Swap struct missing");
const fields=struct.split("\n").map(x=>x.replace(/\/\/.*$/,"").trim()).filter(x=>/;\s*$/.test(x)).map(x=>x.match(/\b(\w+)\s*;/)?.[1]);
const clientFields=shared.match(/const names=\[([^\]]+)\]/)?.[1];
assert.ok(clientFields,"V5 raw decoder missing");
const decoded=Array.from(clientFields.matchAll(/"([^"]+)"/g),x=>x[1]);
assert.deepEqual(decoded,fields,"Frontend raw struct decoder must match Solidity field order");
assert.match(shared,/fn\("createInvite",\["uint256","uint8","address"\]/);
assert.match(source,/function createInvite\(uint256 feeAmount, uint8 feePayer, address feeAsset\)/);
for(const file of ["v5-nile-yonetici.html","v5-nile-katilimci.html"]){
 const html=readFileSync(file,"utf8");
 assert.match(html,/<script src="\.\/v5-common\.js"><\/script>/);
 const scripts=Array.from(html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g),m=>m[1]).filter(Boolean);
 assert.ok(scripts.length,"Inline JS missing: "+file);
 for(const [i,script] of scripts.entries())new vm.Script(script,{filename:file+"#script"+i});
 const ids=new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g),m=>m[1]));
 for(const script of scripts){
  for(const m of script.matchAll(/\$\("([^"]+)"\)/g))assert.ok(ids.has(m[1]),file+" missing element #"+m[1]);
 }
 assert.doesNotMatch(html,/feeBps|proposeAndAcceptA|acceptAndDeposit/,"Stale V4 logic in "+file);
 console.log(file+": inline JS syntax and DOM ids OK");
}
console.log("V5 UI static checks OK; struct fields:",fields.length);
