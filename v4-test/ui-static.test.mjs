import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read=name=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
const participant=read("v4-nile-katilimci.html");
const manager=read("v4-nile-yonetici.html");
const script=html=>{
 const m=html.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(m,"script missing");return m[1];
};
const mockPage=(html,search="")=>{
 const nodes=new Map();
 for(const [,id] of html.matchAll(/\bid="([^"]+)"/g))
  nodes.set(id,{id,disabled:false,hidden:false,dataset:{},textContent:"",value:"",click(){this.clicked=(this.clicked||0)+1}});
 const document={getElementById(id){assert.ok(nodes.has(id),"Missing ID: "+id);return nodes.get(id)},
  querySelectorAll(){return []},hidden:false};
 const sandbox={document,window:{addEventListener(){}},location:{search,href:"https://example.test/v4-nile-yonetici.html"},
  URL,URLSearchParams,BigInt,Date,Number,String,Math,Promise,
  setInterval(){},setTimeout(){},clearTimeout(){},confirm(){return false},
  localStorage:{getItem(){return null},setItem(){}},navigator:{clipboard:{writeText:async()=>{}}},
  fetch:async()=>{throw Error("Offline test does not call Nile")}};
 sandbox.globalThis=sandbox;
 return {nodes,sandbox};
};
test("V4 page JavaScript parses and element IDs exist",()=>{
 for(const html of [participant,manager]){
  new vm.Script(script(html));
  const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
  for(const [,id] of script(html).matchAll(/\$\("([^"]+)"\)/g))
   assert.ok(ids.has(id),"Missing HTML ID: "+id);
 }
});
test("participant uses one action with safe progression",()=>{
 assert.match(participant,/#joinSection\{display:none!important\}/);
 assert.match(participant,/#wallet,#join,#propose,#accept,#allow,#deposit,#refund\{display:none!important\}/);
 assert.ok(participant.indexOf('id="proposalSection"')<participant.indexOf('id="simpleFlow"'));
 const p=mockPage(participant,"?contract=TBdLdLLLZDFQaRdUEwHXeLaYpCH8pfgqXR&id=6&role=1");
 vm.runInNewContext(script(participant)+"\nglobalThis.testHooks={setWallet(v){wallet=v},setUnverified(v){unverifiedTx=v},update:updatePrimaryAction};",p.sandbox);
 const el=id=>p.nodes.get(id),h=p.sandbox.testHooks;
 h.update();assert.equal(el("primaryAction").dataset.target,"wallet");
 h.setWallet("TA");
 el("joinSection").hidden=false;el("join").disabled=false;
 h.update();assert.equal(el("primaryAction").dataset.target,"join");
 el("joinSection").hidden=true;el("proposalSection").hidden=false;el("propose").disabled=false;
 h.update();assert.equal(el("primaryAction").dataset.target,"propose");
 el("proposalSection").hidden=true;el("accept").hidden=false;el("accept").disabled=false;
 h.update();assert.equal(el("primaryAction").dataset.target,"accept");
 h.setUnverified("pendingTx");
 h.update();assert.equal(el("primaryAction").disabled,true);
 assert.match(participant,/watchSignedTransaction\(tx,"join"\)/);
 assert.match(participant,/watchSignedTransaction\(tx,"propose"\)/);
});
test("manager single button selects confirmation or finalization",()=>{
 assert.match(manager,/#adminActions\{display:none!important\}/);
 const p=mockPage(manager);
 vm.runInNewContext(script(manager)+"\nglobalThis.testHooks={setCurrent(v){current=v},setFinal(v){readyForFinal=v},update:updateManagerPrimary};",p.sandbox);
 const el=id=>p.nodes.get(id),h=p.sandbox.testHooks;
 h.update();assert.equal(el("managerPrimary").disabled,true);
 h.setCurrent({completed:false,cancelled:false});
 el("confirm").disabled=false;el("finalize").disabled=true;
 h.update();assert.equal(el("managerPrimary").dataset.target,"confirm");
 h.setFinal(true);el("finalize").disabled=false;
 h.update();assert.equal(el("managerPrimary").dataset.target,"finalize");
 h.setCurrent({completed:true,cancelled:false});
 h.update();assert.equal(el("managerPrimary").disabled,true);
});
test("V4 contract preserves required security and time windows",()=>{
 const solidity=read("contracts/TakasV4Draft.sol");
 for(const fn of ["requestRole","confirmParticipants","propose","acceptTerms","deposit","finalize","refund"])
  assert.match(solidity,new RegExp("function "+fn+"\\("));
 assert.match(solidity,/DEPOSIT_WINDOW = 15 minutes/);
 assert.match(solidity,/SETTLEMENT_WINDOW = 5 minutes/);
});

test("landing page routes to secure invitation setup without fabricating a participant role",()=>{
 const landing=read("index.html");
 assert.match(landing,/href="\.\/takas-kurulum\.html"/);
 assert.match(landing,/takas-yonetici\.html\?secure=1/);
 assert.doesNotMatch(landing,/href="\.\/v[345]-/);
 assert.doesNotMatch(landing,/role=1|role=2|participantId/);
 assert.match(landing,/Katılımcılar yalnız kendilerine gönderilen özel bağlantıyı açar/);
});

test("participant shows live deposit and settlement countdown beside primary action",()=>{
 assert.ok(participant.includes('<pre id="quickTimer" hidden></pre>'));
 assert.match(participant,/quick\.hidden=false;quick\.textContent=el\.textContent/);
 assert.match(participant,/quick\.hidden=true/);
});
