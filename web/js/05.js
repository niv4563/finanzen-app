  }
  if(!d.cats||!d.accounts) throw new Error('ungültig');
  if(D && !confirm('Bestehende Daten auf diesem Gerät ersetzen?')) return;
  D=migrate(d); D.backupAt=D.backupAt||new Date().toISOString(); await save(); S.view='home'; render();
}
function exportCsv(){
  const y=$('#csvy').value, ms=C.months.filter(m=>m.startsWith(y)), q=s=>'"'+String(s).replace(/"/g,'""')+'"', n=v=>v==null?'':String(r2(v)).replace('.',',');
  const L=[['Kategorie','Gruppe','Art',...ms.map(ymLabel)].map(q).join(';')];
  L.push([q('Einkommen'),q(''),q('Plan'),...ms.map(m=>n(D.income[m]))].join(';'));
  for(const c of D.cats){ L.push([q(c.name),q(GROUPS[c.group].n),q('Plan'),...ms.map(m=>n(D.plan[c.id]?.[m]))].join(';'));
    if(ms.some(m=>C.ist[c.id]?.[m]!=null)) L.push([q(c.name),q(GROUPS[c.group].n),q('Ist'),...ms.map(m=>n(C.ist[c.id]?.[m]))].join(';')); }
  for(const a of D.accounts) L.push([q(a.name),q('Konto'),q('Stand Anfang Monat'),...ms.map(m=>n(C.m[m].acc[a.id]?.start))].join(';'));
  download('Finanzen_'+y+'.csv','﻿'+L.join('\r\n'),'text/csv;charset=utf-8');
}
$('#csvfile').addEventListener('change', e=>{
  const f=e.target.files[0]; if(!f) return; const r=new FileReader();
  r.onload=()=>{ let txt=r.result; if(/Ã[¤¶¼]/.test(txt)){ const r2=new FileReader(); r2.onload=()=>{ go(r2.result); }; r2.readAsText(f,'windows-1252'); } else go(txt); e.target.value=''; };
  const go = t => { const rows=parseCSV(t); if(rows.length<2){ alert('Keine Daten in der CSV gefunden.'); return; } csvDialog(rows); };
  r.readAsText(f);
});
$('#file').addEventListener('change', e=>{
  const f=e.target.files[0]; if(!f) return; const r=new FileReader();
  r.onload=async()=>{ e.target.value=''; try{ await importData(JSON.parse(r.result)); }catch(err){ alert('Diese Datei ist kein gültiges Finanzen-Backup.'); } };
  r.readAsText(f);
});

/* =====================================================================
   11. HEUTE NOCH VERFÜGBAR (Tagesbudget) + WARNUNGEN
   ===================================================================== */
function daily(ym=TODAY){
  const m=C?.m[ym]; if(!m) return null;
  const days=new Date(+ym.slice(0,4), +ym.slice(5), 0).getDate();
  const today = ym===TODAY ? new Date().getDate() : ym<TODAY ? days : 0;
  const left = Math.max(1, days-today+1);
  const cats = D.cats.filter(c=>['leben','freizeit'].includes(c.group) && (m.plan[c.id]||0)>0).map(c=>{
    const plan=m.plan[c.id], ist=C.ist[c.id]?.[ym]||0, rest=plan-ist;
    return {c, plan, ist, rest, perDay:Math.max(0,rest)/left, used:ist/plan, expected:plan*today/days};
  }).sort((a,b)=>b.used-a.used);
  const plan=cats.reduce((t,x)=>t+x.plan,0), ist=cats.reduce((t,x)=>t+x.ist,0);
  return {cats, plan, ist, rest:plan-ist, perDay:Math.max(0,plan-ist)/left, left, days, today, hasIst: cats.some(x=>x.ist>0)};
}
function dailyCard(){
  const d=daily(); if(!d || !d.cats.length) return '';
  const st = x => x.used>=1 ? 'bad' : x.used>=0.8 ? 'warn' : x.ist>x.expected*1.15 ? 'warn' : 'ok';
  const col = s => s==='bad'?'var(--bad)':s==='warn'?'var(--warn)':'var(--ok)';
  const warn = d.cats.filter(x=>x.used>=0.8);
  return `<div class="card daily"><div class="row" style="align-items:flex-start">
      <div class="sp"><div class="small muted">Heute noch verfügbar · Lebenshaltung & Freizeit</div>
        <div class="dbig num ${d.rest<0?'neg':''}">CHF ${chf0(d.perDay)}<span class="small muted" style="font-weight:500;letter-spacing:0"> pro Tag</span></div>
        <div class="small muted">Noch CHF ${chf0(d.rest)} für ${d.left} ${d.left===1?'Tag':'Tage'} bis Monatsende · ausgegeben ${chf0(d.ist)} von ${chf0(d.plan)}</div></div>
      ${'Notification' in window && Notification.permission==='default' ? '<button class="btn sm" data-act="notify">Warnungen aktivieren</button>' : ''}</div>
    ${warn.length?`<div class="hint" style="margin:12px 0 4px;background:color-mix(in srgb,var(--warn) 14%,var(--card))">⚠ ${warn.map(x=>`<b>${esc(x.c.name)}</b> ${x.used>=1?'überschritten':pct(x.used)+' verbraucht'}`).join(' · ')}</div>`:''}
    <div class="dlist">${d.cats.map(x=>{ const s=st(x); return `<div class="drow" data-act="addtx" data-c="${x.c.id}">
      <span class="sp">${esc(x.c.name)}</span><span class="small muted num">${chf0(x.ist)} / ${chf0(x.plan)}</span><b class="num" style="min-width:86px;text-align:right;color:${col(s)}">${x.rest<0?'−'+chf0(-x.rest):chf0(x.perDay)+'/Tag'}</b>
      <div class="bar" style="flex-basis:100%"><i style="width:${Math.min(100,x.used*100)}%;background:${col(s)}"></i><em style="left:${Math.min(100,d.today/d.days*100)}%"></em></div></div>`; }).join('')}</div>
    ${!d.hasIst?'<p class="small muted" style="margin:8px 0 0">Noch keine Ausgaben erfasst – sobald Buchungen da sind (Wallet, CSV oder von Hand), zählt die App mit. Der Strich zeigt, wo du heute im Monat stehst.</p>':''}</div>`;
}
function checkAlerts(){
  const d=daily(); if(!d || !D) return; D.alerts ??= {}; const fresh=[];
  for(const x of d.cats){ const lvl = x.used>=1 ? 2 : x.used>=0.8 ? 1 : 0, k=TODAY+'|'+x.c.id;
    if(lvl > (D.alerts[k]||0)){ D.alerts[k]=lvl; fresh.push(`${x.c.name}: ${lvl===2?'Budget überschritten':pct(x.used)+' verbraucht'} (CHF ${chf0(x.ist)} von ${chf0(x.plan)})`); } }
  for(const k in D.alerts) if(!k.startsWith(TODAY)) delete D.alerts[k];
  if(fresh.length && 'Notification' in window && Notification.permission==='granted'){
    try{ new Notification('Finanzen – Budget-Warnung', {body:fresh.join('\n'), icon:'icon-192.png', tag:'budget-'+TODAY}); }catch(e){}
  }
  return fresh;
}

/* =====================================================================
   12. AUSGABEN-ANALYSE + BUDGET-VORSCHLAG
   ===================================================================== */
const merchant = s => String(s||'').toUpperCase().replace(/KAUF\/DIENSTLEISTUNG VOM [\d.]+/,'').replace(/\d{2,}[.\d]*/g,'').replace(/[^A-ZÄÖÜ ]/g,' ').trim().split(/\s+/).slice(0,2).join(' ') || 'Ohne Text';
function vAnalyse(){
  const ym=S.ym, last3=[1,2,3].map(i=>ymAdd(ym,-i)), dataM=last3.filter(m=>D.tx.some(t=>t.d.startsWith(m)));
  const istOf=(c,m)=>C.ist[c]?.[m]||0, from=ymAdd(TODAY,1);
  const rows = D.cats.map(c=>{ const now=istOf(c.id,ym), prev=istOf(c.id,ymAdd(ym,-1)), avg=dataM.length?dataM.reduce((t,m)=>t+istOf(c.id,m),0)/dataM.length:null, plan=C.m[ym]?.plan[c.id]||0;
      const sug = avg!=null && dataM.length>=2 && ['fix','leben','freizeit'].includes(c.group) ? Math.ceil(avg/50)*50 : null;
      return {c, now, prev, avg, plan, sug:(sug!=null && Math.abs(sug-plan)>=50)?sug:null}; })
    .filter(r=>r.now||r.prev||r.avg);
  const trend = (a,b) => !b ? '' : a>b*1.1 ? `<span class="neg">▲ ${pct(a/b-1)}</span>` : a<b*0.9 ? `<span class="pos">▼ ${pct(1-a/b)}</span>` : '<span class="muted">≈</span>';
  const tx=D.tx.filter(t=>t.d.startsWith(ym) && t.c!=='_inc' && !isMove(t));
  const byM={}; tx.forEach(t=>{ const k=merchant(t.n); (byM[k]??={s:0,n:0}); byM[k].s+=t.a; byM[k].n++; });
  const top=Object.entries(byM).sort((a,b)=>b[1].s-a[1].s).slice(0,8), topMax=top[0]?.[1].s||1;
  const six=vis(Array.from({length:6},(_,i)=>ymAdd(ym,i-5))), tot=m=>D.tx.filter(t=>t.d.startsWith(m)&&t.c!=='_inc'&&!isMove(t)).reduce((s,t)=>s+t.a,0), mx=Math.max(1,...six.map(tot));
  const sugs=rows.filter(r=>r.sug!=null);
  return head('Ausgaben-Analyse '+ymLabel(ym), 'Deine echten Ausgaben im Vergleich – und ein Budget, das zur Realität passt.') + `
  <div class="stats">${kpi('Ausgaben diesen Monat',chf0(tot(ym)),tx.length+' Buchungen')}${kpi('Vormonat',chf0(tot(ymAdd(ym,-1))),trend(tot(ym),tot(ymAdd(ym,-1))))}${kpi('Ø letzte 3 Monate',dataM.length?chf0(dataM.reduce((s,m)=>s+tot(m),0)/dataM.length):'–',dataM.length+' Monate mit Daten')}</div>
  <div class="grid g2 mt">
    <div class="card"><h3>Letzte 6 Monate</h3><div class="mbars">${six.map(m=>`<div title="${ymLabel(m)}: CHF ${chf0(tot(m))}"><small class="num">${tot(m)?chf0(tot(m)):''}</small><i style="height:${tot(m)/mx*85}%;${m===ym?'':'opacity:.45'}"></i><span>${ymShort(m)}</span></div>`).join('')}</div></div>
    <div class="card"><h3>Wo das Geld hingeht</h3>${top.length?top.map(([k,v])=>`<div class="drow" style="cursor:default"><span class="sp">${esc(k)} <span class="small muted">${v.n}×</span></span><b class="num">${chf0(v.s)}</b><div class="bar" style="flex-basis:100%"><i style="width:${v.s/topMax*100}%;background:var(--acc)"></i></div></div>`).join(''):'<p class="muted small">Noch keine Buchungen in diesem Monat.</p>'}</div>
  </div>
  <div class="card mt"><h3>Kategorien im Vergleich</h3>
    <div class="tw" style="max-height:none"><table><tr><th>Kategorie</th><th>${ymShort(ym)}</th><th>Vormonat</th><th>Ø 3 Mt.</th><th>Budget</th><th>Vorschlag</th></tr>
    ${rows.map(r=>`<tr><td>${esc(r.c.name)}</td><td class="num ${r.plan&&r.now>r.plan?'neg':''}">${chf0(r.now)} ${trend(r.now,r.prev)}</td><td class="num">${chf0(r.prev)}</td><td class="num">${r.avg!=null?chf0(r.avg):'–'}</td><td class="num">${chf0(r.plan)}</td>
      <td>${r.sug!=null?`<label class="row" style="justify-content:flex-end;gap:6px"><input type="checkbox" class="sugcb" data-c="${r.c.id}" data-v="${r.sug}" checked><b class="num">${chf0(r.sug)}</b></label>`:'<span class="muted">–</span>'}</td></tr>`).join('')||'<tr><td colspan="6" class="muted">Noch keine Ist-Daten. Verbinde Wallet oder importiere eine CSV.</td></tr>'}</table></div>
    ${sugs.length?`<div class="row mt"><span class="sp small muted">Vorschlag = Ø deiner echten Ausgaben der letzten Monate, auf 50 aufgerundet. Gilt ab ${ymLabel(from)}.</span><button class="btn pri sm" data-act="applysug">Ausgewählte ins Budget übernehmen</button></div>`
      :`<p class="small muted" style="margin-bottom:0">Vorschläge erscheinen, sobald mindestens 2 Monate mit Ist-Daten vorhanden sind.</p>`}
  </div>`;
}
function applySuggestions(){
  const sel=[...document.querySelectorAll('.sugcb:checked')]; if(!sel.length) return;
  const snap=JSON.stringify(D), from=ymAdd(TODAY,1);
  for(const cb of sel){ const c=cb.dataset.c, v=+cb.dataset.v; for(const m of C.months.filter(m=>m>=from)){ (D.plan[c]??={}); const yc=C.m[m].yc.cats[c]||0; const nv=Math.max(0,v-yc); if(nv) D.plan[c][m]=nv; else delete D.plan[c][m]; } }
  save(); S.undo={snap,label:sel.length+' Budget-Vorschläge'}; render();
}

/* =====================================================================
   13. SYNC HANDY ↔ PC (Ende-zu-Ende-verschlüsselt über deinen Cloudflare Worker)
   Der Kopplungscode enthält eine zufällige Kennung und einen 256-Bit-Schlüssel.
   Der Server sieht nur verschlüsselte Daten.
   ===================================================================== */
let SYNCCODE=null, SYNCBUSY=false, SYNCT=null;
const b64u = a => b64(a).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64u = s => unb64(s.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((s.length+3)%4));
function parseCode(code){ const raw=unb64u(code.trim()); if(raw.length!==48) throw new Error('Ungültiger Kopplungscode.');
  return {id:[...raw.slice(0,16)].map(b=>b.toString(16).padStart(2,'0')).join(''), key:raw.slice(16)}; }
async function syncKey(raw){ return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt','decrypt']); }
const syncReady = () => !!S.server?.sync;
function setSyncCode(c){ SYNCCODE=c||null; if(CK) save(); else if(c) localStorage.setItem(KEY+'.sync',c); else localStorage.removeItem(KEY+'.sync'); }
function markDel(id){ (D.del ??= []).push(id); if(D.del.length>3000) D.del=D.del.slice(-3000); }
const SYNC_SKIP = new Set(['sync','walletSync','alerts','_p']);
function syncPayload(d){ return JSON.parse(JSON.stringify(d,(k,v)=>SYNC_SKIP.has(k)?undefined:v)); }
function mergeData(local, remote){
  const newer = (remote.savedAt||'') > (local.savedAt||'') ? remote : local, older = newer===remote ? local : remote;
  const out = JSON.parse(JSON.stringify(newer));
  const del = new Set([...(local.del||[]), ...(remote.del||[])]);
  for(const k of ['tx','wishes','goals','yearly','abos','acts']){
    const map = new Map(); for(const x of (older[k]||[])) map.set(x.id,x); for(const x of (newer[k]||[])) map.set(x.id,x);
    out[k] = [...map.values()].filter(x=>!del.has(x.id));
  }
  out.del=[...del].slice(-3000); out.sync=local.sync; out.walletSync=local.walletSync; out.alerts=local.alerts;
  return migrate(out);
}
async function syncNow(manual=false){
  if(!D || !SYNCCODE || !syncReady() || SYNCBUSY) return; SYNCBUSY=true;
  const say = (t,c='') => { const el=$('#syncstatus'); if(el){ el.textContent=t; el.className='small '+c; } };
  if(manual) say('Synchronisiere …');
  try{
    const {id,key:raw}=parseCode(SYNCCODE), key=await syncKey(raw), path='sync/'+id;
    for(let attempt=0; attempt<2; attempt++){
      const g = await api(path);
      let rev=0;
      if(g.status===200){ const j=await g.json(); rev=j.rev||0;
        if(rev > (D.sync?.rev||0)){ const remote = await decryptObj(key, j.data); D = mergeData(D, remote); D.sync = {...(D.sync||{}), rev, dirty: D.sync?.dirty}; } }
      else if(g.status!==404) throw new Error('Sync-Server antwortet mit Fehler '+g.status+'.');
      if(!D.sync?.dirty && rev && rev===(D.sync?.rev||0)){ D.sync={...D.sync, at:new Date().toISOString(), err:null}; break; }
      const blob = await encryptObj(key, new Uint8Array(0), syncPayload(D));
      const p = await api(path, {method:'PUT', headers:{'Content-Type':'application/json','If-Match':String(rev)}, body:JSON.stringify({rev:rev+1, data:blob})});
      if(p.status===409) continue;
      if(!p.ok) throw new Error('Hochladen fehlgeschlagen (Fehler '+p.status+').');
      D.sync = {rev:rev+1, at:new Date().toISOString(), dirty:false, err:null}; break;
    }
    S.noDirty=true; await save(); S.noDirty=false; if(manual) say('Synchronisiert ✓','pos');
    safeRender();
  }catch(e){
    D.sync = {...(D.sync||{}), err: e instanceof TypeError ? 'Server nicht erreichbar.' : (e.message||String(e))};
    S.noDirty=true; save(); S.noDirty=false; say(D.sync.err,'neg');
  }finally{ SYNCBUSY=false; }
}
function syncSoon(){ clearTimeout(SYNCT); SYNCT=setTimeout(()=>syncNow(), 4000); }
async function syncCreate(){
  if(!syncReady()){ alert('Der Geräte-Sync funktioniert nur, wenn die App über deinen gesicherten Cloudflare-Server geöffnet ist.'); return; }
  const raw=crypto.getRandomValues(new Uint8Array(48)); const code=b64u(raw);
  setSyncCode(code); D.sync={rev:0, dirty:true}; await syncNow(true); render(); syncShowCode();
}
function syncShowCode(){
  dialog(`<h3>Kopplungscode</h3><p class="small muted" style="margin-top:-8px">Auf dem anderen Gerät unter ⚙ Daten & Backup → «Mit Code verbinden» eingeben. Der Code ist der Schlüssel zu deinen Daten – <b>nicht weitergeben</b>, nicht per Mail verschicken.</p>
    <textarea class="in" id="sc" readonly style="width:100%;height:80px;font-family:ui-monospace,monospace;font-size:13px;word-break:break-all">${SYNCCODE}</textarea>
    <div class="acts"><button class="btn" data-dlg="copy">Kopieren</button><button class="btn pri" data-dlg="cancel">Fertig</button></div>`,
  k=>{ if(k==='copy'){ navigator.clipboard?.writeText(SYNCCODE); $('#sc').select(); return false; } });
}
function syncJoinDialog(){
  if(!syncReady()){ alert('Der Geräte-Sync funktioniert nur, wenn die App über deinen gesicherten Cloudflare-Server geöffnet ist.'); return; }
  dialog(`<h3>Mit Code verbinden</h3><p class="small muted" style="margin-top:-8px">Die Daten auf <b>diesem</b> Gerät werden durch die synchronisierten ersetzt. Vorher bei Bedarf ein Backup machen.</p>
    <label class="f">Kopplungscode<textarea id="jc" class="in" style="width:100%;height:80px;font-family:ui-monospace,monospace;font-size:13px"></textarea></label><p class="small neg" id="jerr"></p>${acts(true)}`,
  ()=>{ (async()=>{ try{ const code=$('#jc').value.trim(), {id,key:raw}=parseCode(code), key=await syncKey(raw);
        const g=await api('sync/'+id); if(g.status===404) throw new Error('Zu diesem Code gibt es noch keine Daten.'); if(!g.ok) throw new Error('Fehler '+g.status);
        const j=await g.json(), remote=await decryptObj(key, j.data);
        D=migrate(remote); D.sync={rev:j.rev, at:new Date().toISOString(), dirty:false};
        setSyncCode(code); await save(); $('#dlg').close(); render(); alert('Verbunden. Dieses Gerät synchronisiert jetzt automatisch.');
      }catch(e){ $('#jerr').textContent = e instanceof TypeError ? 'Worker nicht erreichbar.' : (e.name==='OperationError' ? 'Code passt nicht zu den Daten.' : e.message); } })(); return false; });
}
function syncCard(){
  const s=D.sync||{}, on=!!SYNCCODE;
  if(NATIVE) return `<div class="card"><h3>Handy ↔ PC</h3><p class="small muted">In der Android-App überträgst du Daten mit dem verschlüsselten Backup: «Backup speichern» → z. B. in Google Drive oder per Mail an dich, am PC «Backup laden». Die Daten verlassen das Handy nur verschlüsselt.</p></div>`;
  return `<div class="card"><h3>Geräte synchronisieren ${on?'<span class="tag">aktiv</span>':''}</h3>
    <p class="small muted">Handy und PC gleichen sich automatisch ab – Ende-zu-Ende-verschlüsselt über deinen eigenen, mit Anmeldung geschützten Server. Cloudflare sieht nur unlesbare Daten.</p>
    ${syncReady()?'':'<p class="small neg">Nur verfügbar, wenn die App über deinen gesicherten Cloudflare-Server geöffnet ist (siehe ANLEITUNG-SICHERHEIT.md).</p>'}
    ${on?`<div class="row"><button class="btn sm pri" data-act="syncnow">Jetzt synchronisieren</button><button class="btn sm" data-act="synccode">Code für weiteres Gerät</button><button class="btn sm danger" data-act="syncoff">Auf diesem Gerät beenden</button></div>
        <p class="small muted" id="syncstatus" style="margin-bottom:0">${s.err?'<span class="neg">'+esc(s.err)+'</span>':s.at?'Zuletzt: '+new Date(s.at).toLocaleString('de-CH'):''}</p>`
       :`<div class="row"><button class="btn sm pri" data-act="synccreate">Neue Synchronisierung starten</button><button class="btn sm" data-act="syncjoin">Mit Code verbinden</button></div><p class="small" id="syncstatus"></p>`}
  </div>`;
}

/* =====================================================================
   14. WAS-WÄRE-WENN + LANGFRIST-PROGNOSE
   ===================================================================== */
const SC0 = {lohn:0, fix:0, bonus:0, jobloss:0, alv:70};
const LP0 = {years:20, rInv:4, r3a:3, rLiq:0.5, wachs:1, teu:1, overflow:true};
function scenarioMetrics(){
  const n=C.now, fut=C.months.filter(m=>m>=n), last=fut.at(-1), na=D.accounts.find(a=>a.notgroschen);
  let minL=Infinity, minM=null; for(const m of fut){ if(C.m[m].liquid<minL){ minL=C.m[m].liquid; minM=m; } }
  const neg = fut.find(m=>D.accounts.some(a=>a.kind==='asset' && (C.m[m].acc[a.id]?.end??0) < -0.5));
  const inc=fut.reduce((t,m)=>t+C.m[m].inc,0), sp=fut.reduce((t,m)=>t+C.m[m].t.spar,0);
  return { netto:C.m[last].netto, last, minL, minM, neg, reserve: na?firstFrom(n,x=>(x.acc[na.id]?.end||0)>=C.reserveZiel):null, frei:firstFrom(n,x=>x.schuldenfrei), quote: inc?sp/inc:NaN };
}
function runScenario(sc){
  const real=D, base=scenarioMetrics();
  const X=JSON.parse(JSON.stringify(D,(k,v)=>k==='_p'?undefined:v)); D=X;
  const start=ymAdd(C.now,1), fut=C.months.filter(m=>m>=start);
  fut.forEach((m,i)=>{ let inc=(D.income[m]||0)*(1+sc.lohn/100); if(i<sc.jobloss){ inc = (D.income[m]||0)*sc.alv/100;
    for(const c of D.cats.filter(c=>c.group==='spar')) if(D.plan[c.id]) delete D.plan[c.id][m]; }   // ohne Lohn wird nicht gespart
    D.income[m]=r2(inc); });
  if(sc.fix){ D.cats.push({id:'_scfix',name:'Szenario Fixkosten',group:'fix',acc:null}); D.plan._scfix={}; fut.forEach(m=>D.plan._scfix[m]=sc.fix); }
  if(sc.bonus && fut[0]) D.income[fut[0]]=(D.income[fut[0]]||0)+sc.bonus;
  calc(); const res=scenarioMetrics(); D=real; calc();
  return {base,res};
}
function longterm(lp){
  const n=C.now, F=C.months.filter(m=>m>=n).slice(0,12), avg=f=>F.reduce((t,m)=>t+f(C.m[m]),0)/Math.max(1,F.length), m=C.m[n];
  const bal=id=>m.acc[id]?.end||0;
  let liq=m.liquid, a3=bal('s3a'), inv=bal('anlage'), eig=bal('hspar'); liq+=m.schulden;  // Schulden aus Flüssigem tilgen
  const c3a=avg(x=>x.cats.s3a||0)*12, cInv=avg(x=>x.cats.invest||0)*12, cEig=avg(x=>x.cats.eigenheim||0)*12, cLiq=avg(x=>(x.cats.sparen||0)+Math.max(0,x.rest))*12;
  const cap=C.reserveZiel+D.settings.puffer, rows=[{y:0,liq,a3,inv,eig,tot:liq+a3+inv+eig,einz:0}]; let einz=0;
  for(let y=1;y<=lp.years;y++){ const g=(1+lp.wachs/100)**(y-1);
    liq=liq*(1+lp.rLiq/100)+cLiq*g; a3=a3*(1+lp.r3a/100)+c3a*g; inv=inv*(1+lp.rInv/100)+cInv*g; eig=eig*(1+lp.rLiq/100)+cEig*g; einz+=(cLiq+c3a+cInv+cEig)*g;
    if(lp.overflow){ const capY=cap*(1+lp.teu/100)**y; if(liq>capY){ inv+=liq-capY; liq=capY; } }
    rows.push({y,liq,a3,inv,eig,tot:liq+a3+inv+eig,einz}); }
  return {rows, c:{c3a,cInv,cEig,cLiq}};
}
function ltChart(rows){
  const W=1000,H=320,P=56, mx=Math.max(1,...rows.map(r=>r.tot)), x=i=>P+i*(W-P-10)/Math.max(1,rows.length-1), y=v=>10+(H-34)*(1-v/mx);
  const area=(f,c)=>`<path d="M${x(0)},${y(0)} ${rows.map((r,i)=>`L${x(i).toFixed(1)},${y(f(r)).toFixed(1)}`).join(' ')} L${x(rows.length-1)},${y(0)} Z" fill="${c}" />`;
  const ticks=[0,.25,.5,.75,1].map(t=>`<line x1="${P}" x2="${W-10}" y1="${y(mx*t)}" y2="${y(mx*t)}" stroke="var(--line)"/><text x="2" y="${y(mx*t)+4}">${chf0(mx*t/1000)}k</text>`).join('');
  const yl=rows.filter((r,i)=>i%5===0).map(r=>`<text x="${x(r.y)-8}" y="${H-6}">J${r.y}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Vermögensprognose">${ticks}${yl}
    ${area(r=>r.tot,'color-mix(in srgb,var(--acc) 85%,transparent)')}${area(r=>r.liq+r.a3+r.eig,'var(--spar)')}${area(r=>r.liq+r.eig,'var(--leben)')}${area(r=>r.liq,'var(--fix)')}</svg>
    <div class="legend"><span><span class="dot" style="background:var(--fix)"></span>Reserve & Konto</span><span><span class="dot" style="background:var(--leben)"></span>Eigenheim-Sparen</span><span><span class="dot" style="background:var(--spar)"></span>Säule 3a</span><span><span class="dot" style="background:var(--acc)"></span>Anlagen</span></div>`;
}
function vPrognose(){
  const sc=(S.sc ||= {...SC0}), lp=(S.lp ||= {...LP0});
  return head('Prognose & Szenarien','Was passiert, wenn sich etwas ändert – und wohin dich dein Plan langfristig bringt.') + `
  <div class="card"><h3>Was wäre wenn …</h3>
    <div class="grid g2" style="gap:4px 24px">
      ${slider('lohn','Lohn ändert sich um',sc.lohn,-30,30,1,' %')}
      ${slider('fix','Zusätzliche Fixkosten pro Monat (z. B. höhere Miete, Auto)',sc.fix,-500,1500,50,' CHF')}
      ${slider('bonus','Einmaliger Bonus / Ausgabe nächsten Monat',sc.bonus,-10000,20000,500,' CHF')}
      ${slider('jobloss','Jobverlust: Monate ohne Lohn (Sparen pausiert)',sc.jobloss,0,12,1,' Mt.')}
      ${sc.jobloss?slider('alv','Arbeitslosengeld in % vom Lohn',sc.alv,0,80,5,' %'):''}
    </div>
    <div id="scout">${scenarioHtml(sc)}</div>
    <div class="row"><span class="sp"></span><button class="btn sm" data-act="screset">Zurücksetzen</button></div></div>
  <div class="card mt"><h3>Langfrist-Prognose</h3>
    <div class="grid g3" style="gap:4px 24px">
      ${slider('years','Zeitraum',lp.years,5,40,5,' Jahre','lp')}
      ${slider('rInv','Rendite Anlagen (ETF) p.a.',lp.rInv,0,8,0.5,' %','lp')}
      ${slider('r3a','Rendite Säule 3a p.a.',lp.r3a,0,6,0.5,' %','lp')}
      ${slider('rLiq','Zins Sparkonto p.a.',lp.rLiq,0,3,0.25,' %','lp')}
      ${slider('wachs','Sparbeträge wachsen p.a. (Lohnerhöhung)',lp.wachs,0,4,0.5,' %','lp')}
      ${slider('teu','Teuerung p.a.',lp.teu,0,4,0.5,' %','lp')}
    </div>
    ${chk('lpov',lp.overflow,'Geld über der Reserve automatisch investieren')}
    <div id="lpout">${ltHtml(lp)}</div>
    <p class="small muted" style="margin-bottom:0">Annahmen, keine Garantie und keine Anlageberatung: Renditen schwanken, Verluste sind möglich. Basis sind deine geplanten Sparbeträge der nächsten 12 Monate.</p></div>`;
}
function slider(k,l,v,min,max,step,u,grp='sc'){ return `<label class="f sl">${l}<span class="row"><input type="range" class="rng" data-g="${grp}" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${v}"><b class="num" id="v_${grp}_${k}">${(v>0&&grp==='sc'&&k!=='jobloss'&&k!=='alv'?'+':'')+fmtN.format(v).replace(/\.00$/,'')}${u}</b></span></label>`; }
function scenarioHtml(sc){
  const same = JSON.stringify(sc)===JSON.stringify(SC0); const {base,res}=runScenario(sc);
  const d=(a,b,f)=>a===b?'':`<span class="${b>a?'pos':'neg'}">${b>a?'+':''}${f(b-a)}</span>`;
  const ym = v => v ? ymShortY(v) : 'nie', dm=(a,b)=>!a||!b||a===b?'':`<span class="${b<a?'pos':'neg'}">${ymDiff(a,b)>0?'+':''}${ymDiff(a,b)} Mt.</span>`;
  const row=(l,a,b,diff)=>`<tr><td>${l}</td><td class="num">${a}</td><td class="num"><b>${b}</b></td><td class="num">${diff}</td></tr>`;
  const warn = res.neg && res.neg!==base.neg ? `<div class="hint" style="background:color-mix(in srgb,var(--bad) 12%,var(--card))">⚠ Ab <b>${ymLabel(res.neg)}</b> rutscht ein Konto ins Minus. ${res.minL<0?'Die Reserve reicht nicht – tiefster Stand flüssiges Geld: CHF '+chf0(res.minL)+'.':'Gesamt ist genug Geld da, aber Beträge müssen zwischen den Konten verschoben werden.'}</div>`
    : `<div class="hint">${res.minL<0?'⚠ Das flüssige Geld reicht nicht':'✓ Das flüssige Geld reicht'} – tiefster Stand CHF ${chf0(res.minL)} (${ymShortY(res.minM)}).${base.neg?' Hinweis: Schon im aktuellen Plan wird ein Konto ab '+ymLabel(base.neg)+' negativ (siehe Empfehlungen).':''}</div>`;
  return `${same?'<p class="small muted">Schieberegler bewegen, um ein Szenario durchzuspielen.</p>':warn}
   <div class="tw" style="max-height:none"><table><tr><th></th><th>Heute geplant</th><th>Szenario</th><th>Unterschied</th></tr>
    ${row('Nettovermögen Ende '+ymShortY(res.last),chf0(base.netto),chf0(res.netto),d(base.netto,res.netto,chf0))}
    ${row('Reserve voll',ym(base.reserve),ym(res.reserve),dm(base.reserve,res.reserve))}
    ${row('Schuldenfrei',ym(base.frei),ym(res.frei),dm(base.frei,res.frei))}
    ${row('Tiefster Stand flüssiges Geld',chf0(base.minL),chf0(res.minL),d(base.minL,res.minL,chf0))}
    ${row('Sparquote',pct(base.quote),pct(res.quote),'')}</table></div>`;
}
function ltHtml(lp){
  const {rows,c}=longterm(lp), pick=[5,10,20,30,40].filter(y=>y<=lp.years); if(!pick.includes(lp.years)) pick.push(lp.years);
  const real=(v,y)=>v/(1+lp.teu/100)**y;
  return `<div class="stats" style="margin:8px 0 12px">${kpi('In '+lp.years+' Jahren',chf0(rows.at(-1).tot),'heutige Kaufkraft: CHF '+chf0(real(rows.at(-1).tot,lp.years)))}${kpi('Davon eingezahlt',chf0(rows.at(-1).einz+rows[0].tot),'Erträge: CHF '+chf0(rows.at(-1).tot-rows.at(-1).einz-rows[0].tot))}${kpi('Sparen pro Jahr (Start)',chf0(c.c3a+c.cInv+c.cEig+c.cLiq),'3a '+chf0(c.c3a)+' · Anlagen '+chf0(c.cInv))}</div>
    ${ltChart(rows)}
    <div class="tw mt" style="max-height:none"><table><tr><th>Jahr</th><th>Reserve & Konto</th><th>Eigenheim</th><th>Säule 3a</th><th>Anlagen</th><th>Total</th><th>Kaufkraft heute</th></tr>
    ${pick.map(y=>{const r=rows[y];return `<tr><td>${new Date().getFullYear()+y} (in ${y} J.)</td><td class="num">${chf0(r.liq)}</td><td class="num">${chf0(r.eig)}</td><td class="num">${chf0(r.a3)}</td><td class="num">${chf0(r.inv)}</td><td class="num"><b>${chf0(r.tot)}</b></td><td class="num muted">${chf0(real(r.tot,y))}</td></tr>`}).join('')}</table></div>`;
}

/* =====================================================================
   10. EREIGNISSE
   ===================================================================== */
document.addEventListener('click', e=>{
  const g=e.target.closest('[data-go]'); if(g){ S.view=g.dataset.go; S.undo=null; render(); window.scrollTo(0,0); return; }
  const mv=e.target.closest('[data-wcmv]'); if(mv){ const k=mv.dataset.wcmv, r=mv.closest('.wcr'), l=$('#wcl');
    if(k==='up' && r.previousElementSibling) l.insertBefore(r, r.previousElementSibling);
    if(k==='down' && r.nextElementSibling) l.insertBefore(r.nextElementSibling, r);
    if(k==='del' && l.children.length>1) r.remove();
    if(k==='add'){ l.insertAdjacentHTML('beforeend', `<div class="li wcr" data-id="c${uid()}"><span class="wrk num muted"></span><input class="sp" placeholder="z. B. Reisen" aria-label="Name der Kategorie"><button type="button" class="btn sm" data-wcmv="up" aria-label="höher">↑</button><button type="button" class="btn sm" data-wcmv="down" aria-label="tiefer">↓</button><button type="button" class="btn sm" data-wcmv="del" aria-label="löschen">✕</button></div>`); l.lastElementChild.querySelector('input').focus(); }
    wcNumber(); return; }
  const wt=e.target.closest('[data-wt]'); if(wt){ document.querySelectorAll('.wt button').forEach(b=>b.classList.toggle('on',b===wt)); const l=$('#wpl'); if(l) l.firstChild.textContent = wt.dataset.wt==='regel'?'Kosten pro Monat CHF':'Preis CHF'; return; }
  const a=e.target.closest('[data-act]'); if(!a) return; const k=a.dataset.act, id=a.dataset.id;
  const A = {
    prev:()=>step(-1), next:()=>step(1),
    addtx:()=>txDialog(null, a.dataset.c?{c:a.dataset.c}:{}), edittx:()=>txDialog(D.tx.find(t=>t.id===id)),
    addcat:()=>catDialog(null), editcat:()=>catDialog(D.cats.find(c=>c.id===a.dataset.c)),
    addacc:()=>accDialog(null), editacc:()=>accDialog(D.accounts.find(x=>x.id===id)),
    setist:()=>{ if(C.m[a.dataset.ym]?.acc[id]) istDialog(id,a.dataset.ym); },
    addabo:()=>aboDialog(null), editabo:()=>aboDialog(D.abos.find(x=>x.id===id)),
    addwish:()=>{ S.wtype=a.dataset.t||S.wtype; wishDialog(null); }, editwish:()=>wishDialog(D.wishes.find(x=>x.id===id)), buywish:()=>buyWish(D.wishes.find(x=>x.id===id)),
    addgoal:()=>goalDialog(null), editgoal:()=>goalDialog(D.goals.find(x=>x.id===id)),
    newyear:()=>newYear(a.dataset.y), export:exportJson, csv:exportCsv, import:()=>$('#file').click(),
    blank:()=>{ D=blank(); save(); render(); },
    reset:()=>{ if(confirm('Wirklich alle Daten auf diesem Gerät löschen?')) wipeAll(); },
    resetall:()=>{ if(confirm('Alle verschlüsselten Daten auf diesem Gerät endgültig löschen? Das geht nicht rückgängig.')) wipeAll(); },
    pinset:()=>pinDialog('set'), pinchange:()=>pinDialog('change'), pinremove:()=>pinDialog('remove'), locknow:()=>lock(),
    install:()=>window._installEvt?.prompt(),
    recapply:()=>applyRec(+a.dataset.i),
    addact:()=>actDialog(),
    chkupdate:()=>checkUpdate(true), updlater:()=>{ S.updLater=S.update?.v; render(); }, preupd:()=>restorePreUpdate(),
    doupdate:()=>{ const u=S.update?.url||''; if(u.startsWith(`https://github.com/${BUILD.repo}/releases/download/`)) location.href=u; },
    wcats:()=>wcatDialog(),
    okleute:()=>{ S.upgradedLeute=false; render(); },
    wfilter:()=>{ S.wtype=a.dataset.t; render(); },
    seed:()=>{ try{ D=migrate(JSON.parse(document.getElementById('seed').textContent)); D.backupAt=null; save(); const ys=years(); if(!ys.includes(S.year)) S.year=ys.at(-1); S.view='home'; render(); }catch(e){ alert('Die eingebetteten Daten konnten nicht geladen werden.'); } },
    okupg:()=>{ S.upgraded=false; render(); },
    txmore:()=>{ S.txShow=(S.txShow||60)+100; render(); },
    notify:()=>{ Notification.requestPermission().then(()=>render()); },
    applysug:()=>applySuggestions(),
    screset:()=>{ S.sc={...SC0}; render(); },
    synccreate:()=>syncCreate(), syncjoin:()=>syncJoinDialog(), syncnow:()=>syncNow(true), synccode:()=>syncShowCode(),
    syncoff:()=>{ if(confirm('Synchronisierung auf diesem Gerät beenden? Die Daten bleiben hier erhalten.')){ setSyncCode(null); D.sync={}; save(); render(); } },
    bmode:()=>{ S.bmode=a.dataset.m; render(); },
    toggleempty:()=>{ S.showEmpty=!S.showEmpty; render(); },
    toggleold:()=>{ S.showOld=!S.showOld; if(!S.showOld){ const vf=D.settings.viewFrom; if(vf){ if(S.ym<vf) S.ym=vf; if(S.year<vf.slice(0,4)) S.year=vf.slice(0,4); } } render(); },
    budedit:()=>budgetDialog(a.dataset.c, a.dataset.ym),
    ytoggle:()=>{ const o=S.yopen||Object.fromEntries(Object.keys(GROUPS).map(g=>[g,true])); S.yopen={...o,[a.dataset.g]:!o[a.dataset.g]}; render(); },
    yall:()=>{ const allOpen=Object.keys(GROUPS).every(g=>(S.yopen||{[g]:true})[g]!==false && (S.yopen?S.yopen[g]:true)); S.yopen=Object.fromEntries(Object.keys(GROUPS).map(g=>[g,!allOpen])); render(); },
    fillfwd:()=>{ const c=a.dataset.c, from=a.dataset.ym, v = c==='_inc' ? (D.income[from]||0) : ((D.plan[c]?.[from])||0);
      const ms=C.months.filter(m=>m>from); if(!confirm(`${catName(c)}: CHF ${chf(v)} für ${ms.length} folgende Monate übernehmen?`)) return;
      for(const m of ms){ if(c==='_inc') D.income[m]=v; else { (D.plan[c]??={}); if(v) D.plan[c][m]=v; else delete D.plan[c][m]; } } save(); render(); },
    addyearly:()=>yearlyDialog(null), edityearly:()=>yearlyDialog(D.yearly.find(x=>x.id===id)),
    wsync:()=>walletSync(),
    mapcats:()=>mapDialog(), csvimport:()=>$('#csvfile').click(),
    aufbau:()=>{ const snap=JSON.stringify(D); aufbauplan(ymAdd(C.now,1)); save(); S.undo={snap,label:'Aufbauplan'}; render(); window.scrollTo(0,0); },
    qadd:()=>{ const p=S.qp; if(!p||isNaN(p)) return; D.wishes.push({id:'w'+uid(),name:($('#qname')?.value||'').trim()||'Wunsch',price:p,prio:2,added:todayIso(),note:'',done:null}); S.qp=null; save(); S.view='wuensche'; render(); },
    recgo:()=>{ const r=RECS[+a.dataset.i]?.act; if(!r) return; if(r.fn==='export') return exportJson(); S.view=r.go; if(r.year) S.year=r.year; S.undo=null; render(); window.scrollTo(0,0); },
    undo:()=>{ if(!S.undo) return; D=migrate(JSON.parse(S.undo.snap)); S.undo=null; save(); render(); },
  };
  A[k]?.();
});
function step(d){ if(d<0 && !S.showOld && D?.settings.viewFrom){ const lim=D.settings.viewFrom; if(['monat','buchungen','analyse'].includes(S.view) || (S.view==='budget' && budgetMode()==='monat')){ if(ymAdd(S.ym,d)<lim) return; } else if(String(+S.year+d)<lim.slice(0,4)) return; } if(['monat','buchungen','analyse'].includes(S.view) || (S.view==='budget' && budgetMode()==='monat')){ S.ym=ymAdd(S.ym,d); S.year=S.ym.slice(0,4); } else S.year=String(+S.year+d); render(); }
document.addEventListener('change', e=>{
  const el=e.target;
  if(el.dataset.cell){ const v=parseNum(el.value); if(isNaN(v)){ el.style.color='var(--bad)'; return; }
    const {cell,ym}=el.dataset;
    if(cell==='_inc') D.income[ym]=v; else { (D.plan[cell]??={}); if(v) D.plan[cell][ym]=v; else delete D.plan[cell][ym]; }
    save(); const tw=document.querySelector('.tw'), sx=tw?.scrollLeft, sy=tw?.scrollTop; render();
    const t2=document.querySelector('.tw'); if(t2){ t2.scrollLeft=sx; t2.scrollTop=sy; } }
  if(el.id==='lpov'){ S.lp.overflow=el.checked; $('#lpout').innerHTML=ltHtml(S.lp); return; }
  if(el.classList.contains('setting-month')){ D.settings[el.dataset.k]=el.value||''; save(); render(); return; }
  if(el.classList.contains('setting-sel')){ D.settings[el.dataset.k]=+el.value; save(); return; }
  if(el.classList.contains('setting-cb')){ D.settings[el.dataset.k]=el.checked; save(); if(el.checked) autoSync(true); return; }
  if(el.id==='ffc'){ S.fc=el.value; render(); return; }
  if(el.classList.contains('setting')){ const v=parseNum(el.value); if(!isNaN(v)){ D.settings[el.dataset.k]=v; save(); render(); } }
});
document.addEventListener('input', e=>{
  if(e.target.classList.contains('rng')){ const el=e.target, g=el.dataset.g, k=el.dataset.k, v=+el.value, obj=(g==='sc'?S.sc:S.lp); obj[k]=v;
    const u = g==='sc' ? ({lohn:' %',fix:' CHF',bonus:' CHF',jobloss:' Mt.',alv:' %'}[k]) : ({years:' Jahre'}[k]||' %');
    $('#v_'+g+'_'+k).textContent=(v>0&&g==='sc'&&k!=='jobloss'&&k!=='alv'?'+':'')+fmtN.format(v).replace(/\.00$/,'')+u;
    clearTimeout(S.rt); S.rt=setTimeout(()=>{ if(g==='sc'){ if(k==='jobloss' && (v===0)!==(S.lastJ===0)){ S.lastJ=v; render(); return; } S.lastJ=S.sc.jobloss; $('#scout').innerHTML=scenarioHtml(S.sc); } else $('#lpout').innerHTML=ltHtml(S.lp); },120); return; }
  if(e.target.id==='fq'){ S.q=e.target.value; const pos=e.target.selectionStart; render(); const el=$('#fq'); el.focus(); el.setSelectionRange(pos,pos); return; }
  if(e.target.id==='qprice'){ S.qp=parseNum(e.target.value); document.querySelectorAll('#qout').forEach(o=>o.innerHTML=quickCheck(S.qp)); }
});
document.addEventListener('keydown', e=>{
  if(e.key==='Enter' && e.target.dataset?.cell){ e.preventDefault(); const ins=[...document.querySelectorAll('input.cell')]; const nx=ins[ins.indexOf(e.target)+1];
    const sel=nx?`input.cell[data-cell="${nx.dataset.cell}"][data-ym="${nx.dataset.ym}"]`:null; e.target.blur(); if(sel) setTimeout(()=>{ const n=document.querySelector(sel); n?.focus(); n?.select(); },0); }
  if(e.key==='Enter' && $('#dlg').open && e.target.tagName==='INPUT'){ e.preventDefault(); $('#dlg').querySelector('[data-dlg="ok"]')?.click(); }
