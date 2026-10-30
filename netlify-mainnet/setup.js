const installedKey="mainnet-hazir-takas-contract",pendingKey="mainnet-hazir-takas-deploy-pending";
let setupBusy=false,estimateRecord=null;
let setupLastRead=0;
async function setupRead(fn){
 for(let attempt=0;attempt<3;attempt++){
  const delay=Math.max(0,1200-(Date.now()-setupLastRead));
  if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
  setupLastRead=Date.now();
  try{return await fn();}catch(e){
   const code=Number(e?.response?.status||e?.status||e?.statusCode);
   if(code!==429&&!/\b429\b/.test(e?.message||""))throw e;
   if(attempt===2)throw Error("Mainnet veri sunucusu istek sınırına takıldı (429). İşlem gönderilmedi. Daha sonra yeniden hesaplayın.");
   status("Mainnet veri sunucusu meşgul (429). Bekleyip ücretsiz sorguyu yeniden deniyoruz...");
   await new Promise(resolve=>setTimeout(resolve,5000*2**attempt+Math.floor(Math.random()*500)));
  }
 }
}
async function setupRun(button,fn){
 if(setupBusy)return;setupBusy=true;button.disabled=true;
 try{await fn();}catch(e){status(e.message||String(e));}
 finally{setupBusy=false;button.disabled=false;$("deploy").disabled=!estimateRecord||!!localStorage.getItem(pendingKey);}
}
function setupWalletLabel(tw){$("walletLabel").textContent="Mainnet · "+tw.defaultAddress.base58;}
async function getArtifact(){
 const r=await fetch("TakasV8Invite.json",{cache:"no-store"});
 if(!r.ok)throw Error("Sözleşme derlemesi okunamadı.");
 const text=await r.text();
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));
 const sha=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
 if(sha!=="9fe0515c762d7627d7c26a88edb6e89a01a92c89dd5b7f01f314ff20004d5322")throw Error("Sözleşme dosyasının bütünlüğü doğrulanamadı.");
 const a=JSON.parse(text);
 if(!Array.isArray(a.abi)||!/^[a-f0-9]+$/i.test(a.bytecode||""))throw Error("Beklenen TRON derlemesi bulunamadı.");
 return a;
}
async function openExisting(addr,tw){
 if(!tw.isAddress(addr))throw Error("Geçerli Mainnet sözleşme adresini girin.");
 const originalAccount=tw.defaultAddress.base58;
 const c=await tw.contract(ABI,addr);
 const [raw,version]=await Promise.all([c.manager().call(),c.inviteVersion().call()]);
 await verifyRuntime(tw,addr,readableAddress(raw,tw));
 if(Number(version.toString())!==8)throw Error("Sözleşme arayüzü bu sürümle uyumlu değil.");
 if(readableAddress(raw,tw)!==tw.defaultAddress.base58)throw Error("Bu sözleşmenin yönetici cüzdanını seçin.");
 const current=await networkWallet();
 if(current.defaultAddress.base58!==originalAccount)throw Error("Cüzdan değişti; yeniden kontrol edin.");
 localStorage.setItem(installedKey,addr);$("existing").value=addr;
 const url=managerURL(addr);$("savedLink").value=url;$("open").href=url;$("done").hidden=false;
 status("Mainnet sözleşmesi ve yönetici doğrulandı. Tam yönetici bağlantınızı kaydedin.");
}
$("connect").onclick=()=>setupRun($("connect"),async()=>{const tw=await connectWallet();setupWalletLabel(tw);status("Mainnet cüzdanı bağlandı. Mevcut sözleşmenizi açabilir veya ilk kurulum maliyetini hesaplayabilirsiniz.");});
$("verify").onclick=()=>setupRun($("verify"),async()=>{const tw=await networkWallet();setupWalletLabel(tw);await openExisting($("existing").value.trim(),tw);});
$("copyLink").onclick=()=>copy($("savedLink").value);
$("feeLimit").oninput=()=>{estimateRecord=null;$("deploy").disabled=true;};
$("estimate").onclick=()=>setupRun($("estimate"),async()=>{
 estimateRecord=null;$("deploy").disabled=true;
 if(localStorage.getItem(pendingKey))throw Error("Önce önceki kurulumun sonucunu kontrol edin; ikinci bir kurulum göndermeyin.");
 const tw=await setupRead(()=>networkWallet()),account=tw.defaultAddress.base58,limit=units($("feeLimit").value.trim(),6);
 if(BigInt(limit)<=0n||BigInt(limit)>15000000000n)throw Error("Energy üst sınırı 0 ile 15000 TRX arasında olmalı.");
 status("Gerçek Mainnet Energy fiyatı ve cüzdan kaynakları okunuyor...");
 const artifact=await getArtifact();
 const post=(path,body)=>setupRead(()=>tw.fullNode.request("wallet/"+path,body,"post"));
 const e=await post("triggerconstantcontract",{owner_address:tw.address.toHex(account),data:artifact.bytecode});
 const p=await post("getchainparameters",{});
 const resources=await post("getaccountresource",{address:tw.address.toHex(account)});
 const balance=await setupRead(()=>tw.trx.getBalance(account));
 const energy=Number(e.energy_used),price=Number(p.chainParameter?.find(x=>x.key==="getEnergyFee")?.value);
 if(!e.result?.result||!Number.isSafeInteger(energy)||energy<=0||!Number.isSafeInteger(price)||price<=0)throw Error("Kurulum Energy tahmini alınamadı: "+String(e.Error||e.result?.message||e.result?.code||"geçersiz sunucu yanıtı").slice(0,300)+". İmza açılmadı; TRX harcanmadı.");
 const budget=Math.ceil(energy*1.2)*price;
 if(!Number.isSafeInteger(budget)||BigInt(budget)>BigInt(limit))throw Error("Tahmin güvenlik payıyla seçtiğiniz Energy sınırını aşıyor. İşlem gönderilmedi.");
 const free=Math.max(0,Number(resources.EnergyLimit||0)-Number(resources.EnergyUsed||0));
 const burn=Math.max(0,Math.ceil(energy*1.2)-free)*price;
 const unsigned=await setupRead(()=>tw.transactionBuilder.createSmartContract({abi:artifact.abi,bytecode:artifact.bytecode,feeLimit:Number(limit),callValue:0,userFeePercentage:100,originEnergyLimit:10000000,name:"TakasV8Invite"},tw.address.toHex(account)));
 if(!unsigned.raw_data_hex?.toLowerCase().includes(artifact.bytecode.toLowerCase()))throw Error("Kurulum bytecode doğrulanamadı.");
 // Serialized transaction: raw_data field + one 65-byte signature + TRON result allowance.
 const bytes=unsigned.raw_data_hex.length/2;
 const varint=n=>{let k=1;while(n>=128){n=Math.floor(n/128);k++;}return k;};
 const bandwidthBytes=1+varint(bytes)+bytes+67+64;
 const netPrice=Number(p.chainParameter?.find(x=>x.key==="getTransactionFee")?.value);
 if(!Number.isSafeInteger(netPrice)||netPrice<=0)throw Error("Bandwidth birim fiyatı okunamadı.");
 // Keep full Bandwidth allowance, even if this wallet currently has a free quota.
 const reserve=bandwidthBytes*netPrice;
 if(BigInt(balance.toString())<BigInt(burn)+BigInt(reserve))throw Error("Tahmin ve Bandwidth payı için bakiye yetersiz. Gereken yaklaşık "+displayUnits(BigInt(burn)+BigInt(reserve))+" TRX.");
 const current=await setupRead(()=>networkWallet());
 if(current.defaultAddress.base58!==account)throw Error("Cüzdan değişti; maliyeti yeniden hesaplayın.");
 estimateRecord={account,limit,artifact,at:Date.now()};
 $("cost").textContent="Tahmin: "+energy+" Energy. %20 payla yaklaşık "+displayUnits(burn)+" TRX yakımı; Energy sınırı "+displayUnits(limit)+" TRX. Tek imza ve sonuç payıyla Bandwidth üst tahmini: "+bandwidthBytes+" birim / "+displayUnits(reserve)+" TRX (kota yoksa). Tahmin 2 dakika geçerli.";
 status("Hesaplama tamamlandı. Kurulum yalnız sonraki düğmeye basıp TronLink'te imzalarsanız yapılır.");
});
async function finishDeployment(hash,tw){
 const info=await tw.trx.getTransactionInfo(hash);
 if(!info?.receipt?.result)throw Error("İşlem henüz kesinleşmedi. Yeniden kurmayın; işlem sonucu kontrol düğmesini kullanın: "+hash);
 if(info.receipt.result!=="SUCCESS"){
  localStorage.removeItem(pendingKey);estimateRecord=null;
  throw Error("Kurulum başarısız: "+info.receipt.result+". Tekrar denemeden önce nedeni kontrol edilmeli.");
 }
 if(!info.contract_address)throw Error("Bu işlemde kurulmuş sözleşme adresi bulunamadı.");
 const addr=tw.address.fromHex(info.contract_address);
 await openExisting(addr,tw);
 localStorage.removeItem(pendingKey);estimateRecord=null;
 status("Mainnet kurulumu başarılı. Yönetici bağlantınızı kopyalayıp TronLink favorilerine ekleyin.");
}
$("deploy").onclick=()=>setupRun($("deploy"),async()=>{
 if(localStorage.getItem(pendingKey))throw Error("Bekleyen kurulum var; önce sonucu kontrol edin.");
 const estimate=estimateRecord;
 if(!estimate||Date.now()-estimate.at>120000)throw Error("Maliyet tahmini eskidi; ücretsiz hesaplamayı yeniden yapın.");
 const tw=await networkWallet(),account=tw.defaultAddress.base58;
 if(account!==estimate.account)throw Error("Cüzdan değişti; maliyeti bu cüzdanla yeniden hesaplayın.");
 const unsigned=await tw.transactionBuilder.createSmartContract({abi:estimate.artifact.abi,bytecode:estimate.artifact.bytecode,feeLimit:Number(estimate.limit),callValue:0,userFeePercentage:100,originEnergyLimit:10000000,name:"TakasV8Invite"},tw.address.toHex(account));
 if(!/^[a-f0-9]{64}$/i.test(unsigned?.txID||""))throw Error("Kurulum işlemi hazırlanamadı.");
 const current=await networkWallet();
 if(current.defaultAddress.base58!==account)throw Error("Cüzdan değişti; işlem imzalanmadı.");
 status("Mainnet kurulumu için TronLink imzası bekleniyor. Energy üst sınırı: "+displayUnits(estimate.limit)+" TRX.");
 const signed=await tw.trx.sign(unsigned);
 if(!signed?.signature?.length)throw Error("İmza alınamadı; kurulum gönderilmedi.");
 const afterSign=await networkWallet();
 if(afterSign.defaultAddress.base58!==account)throw Error("Cüzdan değişti; imzalı işlem yayınlanmadı.");
 localStorage.setItem(pendingKey,unsigned.txID);$("txid").value=unsigned.txID;estimateRecord=null;
 const result=await tw.trx.sendRawTransaction(signed);
 if(!result?.result)throw Error("Yayın sonucu doğrulanamadı. Yeniden kurmayın; işlem kimliğini kontrol edin: "+unsigned.txID);
 status("Kurulum gönderildi; zincir sonucu bekleniyor: "+unsigned.txID);
 await waitTx(unsigned.txID,tw);
 await finishDeployment(unsigned.txID,tw);
});
$("recover").onclick=()=>setupRun($("recover"),async()=>{
 const hash=$("txid").value.trim();
 if(!/^[a-f0-9]{64}$/i.test(hash))throw Error("64 karakterlik işlem kimliğini girin.");
 const pending=localStorage.getItem(pendingKey);
 if(pending&&pending!==hash)throw Error("Bekleyen kurulumun işlem kimliğini kontrol edin: "+pending);
 const tw=await networkWallet();await finishDeployment(hash,tw);
});
try{
 const saved=localStorage.getItem(installedKey);if(saved&&/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(saved)){$("existing").value=saved;$("savedLink").value=managerURL(saved);$("open").href=managerURL(saved);$("done").hidden=false;}
 const pending=localStorage.getItem(pendingKey);if(pending){$("txid").value=pending;status("Önceki kurulum işlemi bekliyor. Yeniden kurmadan önce sonucunu kontrol edin.");}
}catch(_){status("Tarayıcı kaydı kullanılamıyor. Tam yönetici bağlantınızı ayrıca saklayın.");}
