const $=id=>document.getElementById(id);
let data,chosen='PL-1000',toastTimer;
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
async function api(route,{method='GET',payload,pin}={}){
 const res=await fetch('/api'+route,{method,headers:{'Content-Type':'application/json',...(pin?{'x-manager-pin':pin}:{})},body:payload===undefined?undefined:JSON.stringify(payload)});
 const body=await res.json();if(!res.ok)throw Error(body.error||`HTTP ${res.status}`);return body;
}
function alertMsg(msg,error=false){const el=$('toast');el.textContent=msg;el.className='toast visible'+(error?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.className='toast',4300);}
const stamp=s=>new Date(s).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
function labelStatus(s){return ({DRAFT:'INVESTIGATING',AWAITING_APPROVAL:'NEEDS SIGN-OFF',PUBLISHED:'PUBLISHED'})[s]||s;}
function summaryCards(){
 const pub=data.public.status;
 $('metrics').innerHTML=`<div class="metric"><span>ACTIVE REVIEWS</span><strong>${data.cases.filter(c=>c.status==='DRAFT').length}</strong></div><div class="metric"><span>PENDING APPROVAL</span><strong>${data.cases.filter(c=>c.status==='AWAITING_APPROVAL').length}</strong></div><div class="metric"><span>PUBLIC STATUS</span><strong style="font-size:21px;color:${pub==='LIVE'?'#17775f':pub==='WITHHELD'?'#b44a38':'#75817d'}">${pub==='LIVE'?'Verified live':pub==='WITHHELD'?'Withheld':'No release yet'}</strong></div>`;
}
function inbox(){
 $('caseCount').textContent=data.cases.length;
 $('cases').innerHTML=data.cases.map(c=>`<button class="case ${c.id===chosen?'selected':''}" data-case="${esc(c.id)}"><div class="row"><span class="case-id">${esc(c.id)}</span><span class="status ${c.status}">${esc(labelStatus(c.status))}</span></div><h3>${esc(c.title)}</h3><p>${esc(c.rawText)}</p></button>`).join('')||'<p class="muted" style="padding:18px">No requests yet.</p>';
 document.querySelectorAll('[data-case]').forEach(b=>b.addEventListener('click',()=>{chosen=b.dataset.case;render();}));
}
function evidenceLabel(claim){return `${claim.type==='delivery'?'Delivery':claim.type==='stock'?'Stock':'Returns'} · ${claim.key} · ${claim.value} ${claim.type==='stock'?'units':'days'}`;}
function chosenPanel(){
 const c=data.cases.find(c=>c.id===chosen); const v=$('selected'),a=$('actions');
 if(!c){$('caseTitle').textContent='Select a request';$('caseStatus').textContent='WAITING';v.innerHTML='<p class="muted">Choose a request from the inbox.</p>';a.innerHTML='';return;}
 $('caseTitle').textContent=c.title;$('caseStatus').textContent=labelStatus(c.status);$('caseStatus').className=`status ${c.status}`;
 const checks=c.checks.map(({claim,passed,proof})=>`<div class="claim-row"><div><strong>${esc(evidenceLabel(claim))}</strong><p>${esc(proof)}</p>${c.status==='DRAFT'?`<div class="inline-actions"><button class="small-link" data-revise="${claim.id}">Revise</button><button class="small-link danger" data-remove="${claim.id}">Remove</button></div>`:''}</div><span class="state ${passed?'good':'bad'}">${passed?'✓ VERIFIED':'× BLOCKED'}</span></div>`).join('');
 v.innerHTML=`<div class="section-caption">ORIGINAL REQUEST</div><div class="original">“${esc(c.rawText)}”</div><div class="section-caption">STRUCTURED CLAIMS · ${c.claims.length}</div>${checks||'<p class="muted smaller">No claims extracted yet. Ask your agent in Switch to inspect the request and add evidence-backed claims, or add one manually below.</p>'}`+
 (c.status==='DRAFT'?`<div class="section-caption">ADD FACTUAL CLAIM</div><form class="claim-form" id="claimForm"><select id="claimType"><option value="delivery">Delivery</option><option value="stock">Stock</option><option value="returns">Returns</option></select><select id="claimKey"></select><input id="claimValue" type="number" min="1" value="1" required><button class="btn btn-outline" type="submit">Add</button></form>`:'')+
 (c.claims.length?`<div class="section-caption">PUBLISHABLE COPY · GENERATED FROM EVIDENCE</div><div class="safe-copy">${esc(c.copyPreview||'')}</div>`:'')+
 (c.status==='PUBLISHED'?`<p class="evidence-note">Approved by a human · <a href="/api/receipts/${c.id}" target="_blank"><u>Evidence receipt ↗</u></a> · <a href="/live" target="_blank"><u>View public page ↗</u></a></p>`:'')+
 (c.status==='AWAITING_APPROVAL'?`<p class="evidence-note">Proof packet prepared at operations revision ${c.receipt.factsRevision}. A human must enter the manager PIN to publish.</p>`:'');
 a.innerHTML=c.status==='DRAFT'?`<button id="submitClaim" class="btn btn-dark" style="width:auto">Submit evidence for approval →</button><span class="micro">Only fully verified claims may proceed.</span>`:c.status==='AWAITING_APPROVAL'?`<div class="approval"><label>Manager PIN <input id="approvePin" type="password" placeholder="PIN shown in server terminal" autocomplete="off"></label><button class="btn btn-dark" id="approveBtn" style="width:auto">Approve & publish ↗</button></div>`:`<a class="btn btn-outline" href="/live" target="_blank">See the published announcement ↗</a>`;
 if(c.status==='DRAFT'){
  $('claimType').addEventListener('change',()=>updateKeyOptions('claimType','claimKey'));updateKeyOptions('claimType','claimKey');
  $('claimForm').addEventListener('submit',async e=>{e.preventDefault();await operation(async()=>api(`/cases/${chosen}/claims`,{method:'POST',payload:{type:$('claimType').value,key:$('claimKey').value,value:Number($('claimValue').value)}}),'Claim added.');});
  document.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>operation(async()=>api(`/cases/${chosen}/claims/${b.dataset.remove}`,{method:'DELETE'}),'Claim removed.')));
  document.querySelectorAll('[data-revise]').forEach(b=>b.addEventListener('click',()=>{const newValue=prompt('New promised number (days or units):');if(newValue===null)return;operation(async()=>api(`/cases/${chosen}/claims/${b.dataset.revise}`,{method:'PATCH',payload:{value:Number(newValue)}}),'Claim revised.');}));
  $('submitClaim').addEventListener('click',()=>operation(async()=>api(`/cases/${chosen}/submit`,{method:'POST'}),'Evidence packet submitted. Human approval required.'));
 }
 if(c.status==='AWAITING_APPROVAL'){$('approveBtn').addEventListener('click',()=>operation(async()=>api(`/cases/${chosen}/approve`,{method:'POST',pin:$('approvePin').value}),'Published to the public announcement page.'));}
}
function updateKeyOptions(typeId,keyId){const type=$(typeId).value, items=type==='delivery'?['Berlin','Paris','Tallinn']:type==='stock'?['AURORA','ATLAS','HALO']:['policy'];$(keyId).innerHTML=items.map(x=>`<option value="${x}">${x==='policy'?'Return policy':x}</option>`).join('');}
function factPanel(){
 const f=data.facts;$('revision').textContent=`REV ${f.revision}`;
 $('facts').innerHTML=`<div class="section-caption">DELIVERY · BUSINESS DAYS</div>`+Object.entries(f.deliveryDays).map(([city,days])=>`<div class="fact-row"><span>${esc(city)}</span><strong>${days} days</strong></div>`).join('')+
 `<div class="section-caption">WAREHOUSE INVENTORY</div>`+Object.entries(f.stock).map(([sku,qty])=>`<div class="fact-row"><span>${esc(data.skuNames[sku])} <span class="micro">${sku}</span></span><strong>${qty} available</strong></div>`).join('')+`<div class="section-caption">POLICIES</div><div class="fact-row"><span>Return window</span><strong>${f.returnsDays} days</strong></div>`;
}
function timeline(){ $('events').innerHTML=data.events.slice(0,14).map(e=>`<div class="event"><span class="event-mark"></span><div><strong>${esc(e.action.replaceAll('.',' / '))}</strong><p>${esc(e.detail)}</p><time>${esc(e.caseId||e.actor)} · ${stamp(e.time)}</time></div></div>`).join('');}
function render(){if(!data)return;summaryCards();inbox();chosenPanel();factPanel();timeline();}
async function refresh(){try{data=await api('/state');if(!data.cases.some(c=>c.id===chosen))chosen=data.cases[0]?.id||null;render();}catch(e){alertMsg(e.message,true);}}
async function operation(fn,success){try{await fn();alertMsg(success);await refresh();}catch(e){alertMsg(e.message,true);await refresh();}}
$('newForm').addEventListener('submit',async e=>{e.preventDefault();await operation(async()=>{const c=await api('/cases',{method:'POST',payload:{title:$('titleInput').value,rawText:$('rawInput').value}});chosen=c.id;$('newForm').reset();},'Request opened. Ask the agent to investigate.');});
$('factKind').addEventListener('change',()=>updateKeyOptions('factKind','factKey'));
updateKeyOptions('factKind','factKey');
$('factForm').addEventListener('submit',async e=>{e.preventDefault();const pin=prompt('Manager PIN from your server terminal:');if(!pin)return;await operation(()=>api('/facts',{method:'POST',pin,payload:{kind:$('factKind').value,key:$('factKey').value,value:Number($('factValue').value)}}),'Operational data updated.');});
$('reset').addEventListener('click',async()=>{if(!confirm('Reset all demo data, case history, and published announcements?'))return;const pin=prompt('Enter manager PIN to reset:');if(!pin)return;await operation(async()=>{await api('/reset',{method:'POST',pin});chosen='PL-1000';},'Demo reset successfully.');});
refresh();setInterval(()=>{if(document.visibilityState==='visible' && !document.querySelector(':focus:is(input,textarea,select)'))refresh();},6000);
