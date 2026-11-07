const escapeHTML=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
async function refresh(){try{const res=await fetch('/api/public',{cache:'no-store'}),p=await res.json(),el=document.querySelector('#publicContent');
 if(p.status==='LIVE')el.className='live-card',el.innerHTML=`<div class="big-label">● VERIFIED & HUMAN-APPROVED · ${escapeHTML(p.id)}</div><h2>${escapeHTML(p.title)}</h2><ul>${p.lines.map(x=>`<li>${escapeHTML(x)}</li>`).join('')}</ul><div class="live-note">Published ${new Date(p.publishedAt).toLocaleString()} · Evidence receipt ${escapeHTML(p.receiptHash)}… · Rechecked against current operations</div>`;
 else if(p.status==='WITHHELD')el.className='live-card withheld',el.innerHTML=`<div class="big-label">● TEMPORARILY WITHHELD</div><h2>Evidence changed. We paused this announcement.</h2><p>${escapeHTML(p.message)}</p>`;
 else el.className='live-card',el.innerHTML='<div class="big-label">○ NO APPROVED ANNOUNCEMENTS YET</div><h2>Nothing goes live without evidence.</h2><p>Waiting for an agent investigation and human approval.</p>';
 }catch {document.querySelector('#publicContent').textContent='Cannot connect to the local verification service.';}}
refresh();setInterval(refresh,4000);
