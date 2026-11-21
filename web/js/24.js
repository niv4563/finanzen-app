/* =====================================================================
   32. VERSION 1.13.0 – DAUERAUFTRÄGE & LOHN, HINWEISE (GLOCKE), ABO-ERKENNUNG, «BIS ZUM LOHN»,
       KALENDER, SCHNELL ERFASSEN
   ===================================================================== */
var FREQ = [['M','monatlich'],['W','wöchentlich'],['Q','vierteljährlich'],['H','halbjährlich'],['J','jährlich']];
var freqName = f => (FREQ.find(x=>x[0]===f)||FREQ[0])[1];

/* ---------- Daueraufträge: Termine berechnen und mit Buchungen abgleichen ---------- */
function planDates(p, from, to){
  const out = [], start = p.start || todayIso(); if(p.end && p.end < from) return out;
  if(p.freq==='W'){ let d = start; while(d < from) d = dAdd(d, 7); for(; d<=to; d=dAdd(d,7)) if(!p.end || d<=p.end) out.push(d); return out; }
  const step = {M:1, Q:3, H:6, J:12}[p.freq||'M'] || 1, day = +(p.day || start.slice(8,10));
  let ym = start.slice(0,7);
  while(true){ const d = ym+'-'+String(Math.min(day, +mEnd(ym).slice(8))).padStart(2,'0'); if(d>to) break;
    if(d>=from && d>=start && (!p.end || d<=p.end)) out.push(d); ym = ymAdd(ym, step); }
  return out;
}
// Ist ein Termin schon gebucht? (gleiche Kategorie bzw. Text, Betrag ±15 %, Datum ±6 Tage)
function planPaid(p, d){
  const amt = Math.abs(p.amount), words = String(p.match||'').split(',').map(s=>bkNorm(s)).filter(Boolean);
  return D.tx.some(t=>{ if(Math.abs(dDiff(d, t.d))>6) return false;
    const v = Math.abs(t.imp ? t.sa : t.a); if(Math.abs(v-amt) > amt*0.15+0.5) return false;
    if(p.type==='in' ? (t.imp ? t.sa<0 : t.c!=='_inc') : (t.imp ? t.sa>0 : t.c==='_inc')) return false;
    return (p.cat && t.c===p.cat) || (words.length && words.some(w=>bkNorm(t.n||'').includes(w))); });
}
function planOcc(from, to){
  const out = [];
  for(const p of D.plans||[]){ if(p.off) continue;
    for(const d of planDates(p, from, to)){ if(planPaid(p, d)) continue;
      out.push({d, n:p.name, sub:(p.type==='in'?'Einnahme':'Dauerauftrag')+' · '+freqName(p.freq), v:p.type==='in' ? -Math.abs(p.amount) : Math.abs(p.amount), c:p.type==='in'?'_inc':p.cat, go:'plaene', plan:p.id}); } }
  return out;
}

/* Bevorstehende Zahlungen: Rechnungen + Daueraufträge/Lohn + (falls nicht geplant) feste Kosten + Jahreskosten */
function upcoming(days=35){
  const today = todayIso(), until = dAdd(today, days), out = [];
  for(const b of D.bills||[]) if(b.status==='offen') out.push({d:b.due||today, n:b.creditor, sub:bkName(b.cat||'_offen'), v:b.amount, c:b.cat, go:'rechnungen'});
  out.push(...planOcc(dAdd(today,-20), until));
  const planned = new Set((D.plans||[]).filter(p=>!p.off).map(p=>p.cat).filter(Boolean));
  const m = C.m[TODAY] || C.m[C.now];
  for(const c of D.cats.filter(c=>c.group==='fix' && !c.archived && !planned.has(c.id))){
    const plan = m?.plan?.[c.id] || 0; if(plan<=0) continue;
    const last = D.tx.filter(t=>t.c===c.id).sort((x,y)=>y.d.localeCompare(x.d))[0]; if(!last) continue;
    const day = +last.d.slice(8,10); let ym = last.d.slice(0,7), d;
    do { ym = ymAdd(ym,1); d = ym+'-'+String(Math.min(day, +mEnd(ym).slice(8))).padStart(2,'0'); } while(d < dAdd(today,-20));
    if(d<=until && !out.some(x=>x.c===c.id && Math.abs(dDiff(x.d,d))<10)) out.push({d, n:c.name, sub:GROUPS[c.group]?.n||'', v:plan, c:c.id, go:'budget'});
  }
  for(const y of D.yearly||[]){
    let yr = +today.slice(0,4), d = `${yr}-${String(y.month).padStart(2,'0')}-01`; if(d < dAdd(today,-20)) d = `${yr+1}-${String(y.month).padStart(2,'0')}-01`;
    if(d<=until) out.push({d, n:y.name, sub:'Jahreskosten', v:y.amount, c:y.cat, go:'jahr'});
  }
  return out.filter(x=>x.d<=until).sort((a,b)=>a.d.localeCompare(b.d));
}
function upRow(x){
  const late = x.d < todayIso(), inc = x.v<0, ic = inc ? CI.inc : x.c ? catIcon({c:x.c}) : CI.tag;
  const col = inc ? 'var(--ok)' : x.c ? (GROUPS[D.cats.find(c=>c.id===x.c)?.group]?.c || 'var(--acc)') : 'var(--acc)';
  return `<div class="wrow" data-go="${x.go}"><span class="wic" style="background:${col}">${ci(ic)}</span><div class="wmid"><b>${esc(x.n)}</b><span>${esc(x.sub)}</span></div>
    <div class="wend"><b class="num ${inc?'in':'out'}">${inc?'+':'−'}${chf(Math.abs(x.v))}</b><span class="${late?'late':''}">${late?'überfällig · ':''}${dShort(x.d)}</span></div></div>`;
}
function cardOutlook(){
  const to = todayIso(), until = dAdd(to,30), up = upcoming(30).filter(x=>x.d>=dAdd(to,-20));
  const liquid = activeAccs().filter(a=>!a.archived && (a.liquid||a.main)).reduce((s,a)=>s+accVal(a),0);
  const vals = [], labels = [], tips = []; let v = liquid - up.filter(x=>x.d<to).reduce((s,x)=>s+x.v,0);
  for(let d=to; d<=until; d=dAdd(d,1)){ v -= up.filter(x=>x.d===d).reduce((s,x)=>s+x.v,0); vals.push(v); labels.push(d===to?'Heute':dShort(d)); tips.push(new Date(d+'T12:00').toLocaleDateString('de-CH',{weekday:'short',day:'numeric',month:'long'})); }
  const hasInc = (D.plans||[]).some(p=>p.type==='in' && !p.off), out = up.filter(x=>x.v>0).reduce((s,x)=>s+x.v,0), inc = -up.filter(x=>x.v<0).reduce((s,x)=>s+x.v,0);
  return `<div class="xcard xw"><div class="ah"><div><h3>Ausblick</h3><span class="small muted">Wie viel bleibt nach den geplanten Zahlungen?</span></div></div>
    <div class="kpibig"><div><span class="small muted">Heute verfügbar</span><b class="num">CHF ${signChf(liquid)}</b></div><div class="r"><span class="small muted">In 30 Tagen</span><b class="num ${vals.at(-1)<0?'out':''}" style="font-size:16px">CHF ${signChf(vals.at(-1))}</b></div></div>
    ${chart({label:'Erwarteter Kontostand der nächsten 30 Tage', h:200, labels, tips, series:[{name:'Erwartet', color:C_BAL, kind:'area', values:vals}]})}
    <p class="small muted">Liquide Konten ${hasInc?'plus Lohn und Einnahmen ':''}minus offene Rechnungen, Daueraufträge, feste Kosten und Jahreskosten.${hasInc?'':' <a class="link" data-go="plaene">Lohn als Dauerauftrag erfassen</a>, damit er mitzählt.'}</p></div>
    <div class="xcard xw"><div class="ah"><h3>Geplant (30 Tage)</h3><span class="small"><b class="num out">−${chf(out)}</b>${inc?` · <b class="num in">+${chf(inc)}</b>`:''}</span></div>${up.map(upRow).join('')||'<p class="small muted">Nichts geplant.</p>'}</div>`;
}

/* ---------- Seite «Daueraufträge & Lohn» ---------- */
function planDialog(i){
  const isNew = i==null, p = isNew ? {type:'out', name:'', amount:'', cat:'', acc:mainAcc().id, freq:'M', start:todayIso(), day:+todayIso().slice(8), match:''} : {...D.plans[i]};
  dialog(`<h3>${isNew?'Neuer Dauerauftrag':'Dauerauftrag bearbeiten'}</h3>
    <div class="sgm"><button class="${p.type!=='in'?'on':''}" data-dlg="t:out">Ausgabe</button><button class="${p.type==='in'?'on':''}" data-dlg="t:in">Einnahme (z. B. Lohn)</button></div>
    <label class="f">Name<input id="pn" value="${esc(p.name)}" placeholder="z. B. Miete, Krankenkasse, Lohn"></label>
    <div class="grid g2" style="gap:0 12px"><label class="f">Betrag CHF<input id="pa" inputmode="decimal" value="${p.amount===''?'':chf(Math.abs(p.amount))}"></label>
      <label class="f">Rhythmus<select id="pf">${FREQ.map(([k,l])=>`<option value="${k}" ${p.freq===k?'selected':''}>${l}</option>`).join('')}</select></label>
      <label class="f">Erste Zahlung<input id="ps" type="date" value="${p.start}"></label>
      <label class="f">Konto<select id="pacc">${activeAccs().map(a=>`<option value="${a.id}" ${a.id===p.acc?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label></div>
    <label class="f" id="pcatl" style="${p.type==='in'?'display:none':''}">Kategorie<select id="pc"><option value="">– wählen –</option>${catOptions(p.cat).replace(/<option value="_inc"[^>]*>[^<]*<\/option>/,'')}</select></label>
    <label class="f">Erkennen am Buchungstext (optional, mit Komma)<input id="pm" value="${esc(p.match||'')}" placeholder="z. B. css, krankenkasse"></label>
    <label class="f">Endet am (optional)<input id="pe" type="date" value="${p.end||''}"></label>
    ${chk('poff', !!p.off, 'Pausiert')}<p class="small neg" id="perr"></p>${acts(isNew)}`,
  k=>{
    if(k.startsWith('t:')){ p.type = k.slice(2); document.querySelectorAll('#dlgbody .sgm button').forEach(b=>b.classList.toggle('on', b.dataset.dlg===k)); $('#pcatl').style.display = p.type==='in'?'none':''; return false; }
    if(k==='del'){ D.plans.splice(i,1); return; }
    const a = parseNum(val('pa')); if(!val('pn').trim() || !isFinite(a) || !a){ $('#perr').textContent = 'Bitte Name und Betrag angeben.'; return false; }
    const np = {id:p.id||'p'+uid(), type:p.type, name:val('pn').trim(), amount:Math.abs(a), freq:val('pf'), start:val('ps')||todayIso(), day:+(val('ps')||todayIso()).slice(8), acc:val('pacc'), cat:p.type==='in'?'':val('pc'), match:val('pm').trim(), end:val('pe')||undefined, off:$('#poff').checked||undefined};
    (D.plans ??= []); if(isNew) D.plans.push(np); else D.plans[i] = np; });
}
function vPlaene(){
  const L = D.plans||[], today = todayIso(), sug = aboSuggest();
  const next = p => planDates(p, dAdd(today,-6), dAdd(today, 400)).find(d=>!planPaid(p,d)) || '';
  const perMonth = p => Math.abs(p.amount) * ({W:52/12, M:1, Q:1/3, H:1/6, J:1/12}[p.freq]||1);
  const sumOut = L.filter(p=>p.type!=='in' && !p.off).reduce((s,p)=>s+perMonth(p),0), sumIn = L.filter(p=>p.type==='in' && !p.off).reduce((s,p)=>s+perMonth(p),0);
  return `<p class="sub">Feste Zahlungen und Einnahmen mit Datum. Der Ausblick, die Glocke und «Bis zum Lohn» rechnen damit. Kommt die Zahlung über einen Bank-Import, gilt sie automatisch als erledigt.</p>
    <div class="wkpi"><div><span>Ausgaben pro Monat</span><b class="num out">−${chf(sumOut)}</b></div><div><span>Einnahmen pro Monat</span><b class="num in">+${chf(sumIn)}</b></div></div>
    <div class="xcard"><div class="ah"><h3>Daueraufträge</h3><button class="btn sm pri" data-act="plannew">+ Neu</button></div>
    ${L.map((p,i)=>{ const n = next(p), inc = p.type==='in';
      return `<div class="wrow ${p.off?'dimr':''}" data-act="planedit" data-i="${i}"><span class="wic" style="background:${inc?'var(--ok)':(GROUPS[D.cats.find(c=>c.id===p.cat)?.group]?.c||'var(--acc)')}">${ci(inc?CI.inc:catIcon({c:p.cat}))}</span>
        <div class="wmid"><b>${esc(p.name)}</b><span>${freqName(p.freq)}${p.cat?' · '+esc(bkName(p.cat)):''}${p.off?' · pausiert':''}</span></div>
        <div class="wend"><b class="num ${inc?'in':'out'}">${inc?'+':'−'}${chf(p.amount)}</b><span>${n?'nächste '+dShort(n):'–'}</span></div></div>`; }).join('') || '<p class="small muted">Noch keine. Lege zuerst deinen Lohn an, dann Miete, Krankenkasse usw.</p>'}</div>
    ${sug.length?`<div class="xcard mt"><div class="ah"><div><h3>Erkannte wiederkehrende Zahlungen</h3><span class="small muted">Aus deinen Buchungen der letzten Monate</span></div></div>
      ${sug.map((s,i)=>`<div class="wrow"><span class="wic" style="background:var(--warn)">${ci(CI.repeat)}</span><div class="wmid"><b>${esc(s.name)}</b><span>${esc(s.who)} · ${s.n}× · etwa am ${s.day}.</span></div>
        <div class="wend"><b class="num ${s.type==='in'?'in':'out'}">${s.type==='in'?'+':'−'}${chf(s.amount)}</b><span><a class="link" data-act="planadd" data-i="${i}">Übernehmen</a></span></div></div>`).join('')}</div>`:''}`;
}

/* ---------- Abo-Erkennung: gleicher Händler, ähnlicher Betrag, in mindestens 3 der letzten 4 Monate ---------- */
function aboSuggest(){
  const since = ymAdd(TODAY, -4)+'-01', by = new Map();
  for(const t of D.tx){ if(t.d<since || isTr(t) || t.c==='_offen') continue;
    const v = t.imp ? t.sa : (t.c==='_inc' ? t.a : -t.a); if(Math.abs(v)<5) continue;
    const key = bkMerchant(String(t.n||'').split(' · ')[0]); if(!key || key.length<3 || /^OHNE TEXT$/.test(key)) continue;
    (by.get(key) || by.set(key, []).get(key)).push({d:t.d, v, c:t.c}); }
  const have = (D.plans||[]).map(p=>bkNorm(p.name+' '+(p.match||'')));
  const out = [];
  for(const [key, l] of by){
    const months = new Set(l.map(x=>x.d.slice(0,7))); if(months.size<3) continue;
    const vals = l.map(x=>x.v).sort((a,b)=>a-b), med = vals[Math.floor(vals.length/2)];
    const close = l.filter(x=>Math.abs(x.v-med) <= Math.abs(med)*0.15+1); if(new Set(close.map(x=>x.d.slice(0,7))).size<3 || close.length>months.size+2) continue;
    const nk = bkNorm(key); if(have.some(h=>h.includes(nk))) continue;
    const days = close.map(x=>+x.d.slice(8)).sort((a,b)=>a-b), day = days[Math.floor(days.length/2)];
    const cat = Object.entries(close.reduce((m,x)=>(m[x.c]=(m[x.c]||0)+1,m),{})).sort((a,b)=>b[1]-a[1])[0][0];
    const type = med>0?'in':'out', amount = Math.abs(+med.toFixed(2));
    if((D.plans||[]).some(p=>(p.type||'out')===type && Math.abs(p.amount-amount)<=amount*0.2 && Math.abs((p.day||+String(p.start).slice(8))-day)<=5)) continue;
    const name = type==='in' ? (amount>=1000 ? 'Lohn' : 'Einnahme') : bkName(cat);
    out.push({name, who:niceName(key), match:nk, amount, type, cat:type==='in'?'':cat, day, n:close.length});
  }
  return out.sort((a,b)=>b.amount-a.amount).slice(0,15);
}

/* ---------- «Bis zum Lohn» ---------- */
function nextPayday(){
  const today = todayIso(), inc = (D.plans||[]).filter(p=>p.type==='in' && !p.off).flatMap(p=>planDates(p, today, dAdd(today,62))).sort()[0];
  if(inc) return {d:inc, src:'plan'};
  const last = D.tx.filter(t=>t.c==='_inc' && Math.abs(t.imp?t.sa:t.a)>=1000).sort((a,b)=>b.d.localeCompare(a.d))[0]; if(!last) return null;
  const day = +last.d.slice(8); let ym = TODAY, d = ym+'-'+String(Math.min(day,+mEnd(ym).slice(8))).padStart(2,'0'); if(d<=today){ ym = ymAdd(ym,1); d = ym+'-'+String(Math.min(day,+mEnd(ym).slice(8))).padStart(2,'0'); }
  return {d, src:'auto'};
}
function cardPayday(){
  const pd = nextPayday(); if(!pd) return '';
  const today = todayIso(), days = Math.max(1, dDiff(today, pd.d));
  // frei verfügbar: Zahlungskonten und Bargeld – ohne Sparkonten/Reserve
  const liquid = activeAccs().filter(a=>!a.archived && (a.liquid||a.main) && !a.notgroschen && a.wtype!=='spar').reduce((s,a)=>s+accVal(a),0);
  const due = upcoming(days+1).filter(x=>x.v>0 && x.d<pd.d).reduce((s,x)=>s+x.v,0), free = liquid - due, perDay = free/days;
  return `<div class="xcard payday"><div class="ah"><div><h3>Bis zum Lohn</h3><span class="small muted">noch ${days} Tag${days>1?'e':''} · nächster Lohn ${dShort(pd.d)}${pd.src==='auto'?' (geschätzt)':''}</span></div></div>
    <div class="pdrow"><div><span class="small muted">pro Tag frei</span><b class="num ${perDay<0?'out':''}">CHF ${signChf(perDay)}</b></div>
      <div class="r"><span class="small muted">Zahlungskonten ${chf0(liquid)} − geplant ${chf0(due)}</span><b class="num ${free<0?'out':''}">CHF ${signChf(free)}</b></div></div>
    ${pd.src==='auto'?'<a class="wmore" data-go="plaene">Lohn als Dauerauftrag erfassen</a>':''}</div>`;
}

/* ---------- Glocke: Hinweise ---------- */
function notices(){
  const out = [], today = todayIso(), seen = D.flags?.seen || {};
  for(const b of D.bills||[]) if(b.status==='offen' && b.due){ const n = dDiff(today, b.due);
    if(n<0) out.push({k:'b'+b.id, lvl:'bad', t:`Rechnung überfällig: ${b.creditor}`, s:`CHF ${chf(b.amount)} · fällig seit ${dShort(b.due)}`, go:'rechnungen'});
    else if(n<=3) out.push({k:'b'+b.id+b.due, lvl:'warn', t:`Rechnung fällig: ${b.creditor}`, s:`CHF ${chf(b.amount)} · ${n===0?'heute':n===1?'morgen':'in '+n+' Tagen'}`, go:'rechnungen'}); }
  for(const x of planOcc(today, dAdd(today,2))) if(x.v>0) out.push({k:'p'+x.plan+x.d, lvl:'info', t:`${x.d===today?'Heute':'Bald'}: ${x.n}`, s:`CHF ${chf(x.v)} · ${dShort(x.d)}`, go:'plaene'});
  for(const x of planOcc(dAdd(today,-10), dAdd(today,-3))) out.push({k:'pm'+x.plan+x.d, lvl:'warn', t:`Nicht gefunden: ${x.n}`, s:`Erwartet am ${dShort(x.d)} – noch keine passende Buchung`, go:'plaene'});
  try{ const d = daily(); const frac = (+today.slice(8))/(+mEnd(TODAY).slice(8));
    for(const x of d?.cats||[]){ if(x.plan<=0) continue;
      if(x.used>=1) out.push({k:'u'+TODAY+x.c.id, lvl:'bad', t:`Budget überschritten: ${x.c.name}`, s:`CHF ${chf0(x.ist)} von ${chf0(x.plan)}`, go:'budget'});
      else if(x.used>frac+0.25 && x.used>=0.5) out.push({k:'r'+TODAY+x.c.id, lvl:'warn', t:`Budget schnell aufgebraucht: ${x.c.name}`, s:`${Math.round(x.used*100)} % verbraucht, Monat erst zu ${Math.round(frac*100)} % vorbei`, go:'budget'}); } }catch(e){}
  const since = dAdd(today,-7);
  for(const t of D.tx){ if(t.d<since || isTr(t) || t.c==='_inc' || t.c==='_offen') continue; const v = outAmt(t); if(v<100) continue;
    const prev = D.tx.filter(x=>x.c===t.c && x!==t && x.d<t.d && x.d>=dAdd(t.d,-180) && !isTr(x)).map(outAmt).filter(x=>x>0);
    if(prev.length>=4){ const avg = prev.reduce((s,x)=>s+x,0)/prev.length; if(v>avg*3) out.push({k:'x'+t.id, lvl:'warn', t:`Ungewöhnlich hoch: ${bkName(t.c)}`, s:`CHF ${chf(v)} am ${dShort(t.d)} – sonst etwa CHF ${chf0(avg)}`, go:'buchungen'}); } }
  try{ const up = upcoming(30), liquid = activeAccs().filter(a=>!a.archived && (a.liquid||a.main)).reduce((s,a)=>s+accVal(a),0); let v = liquid, low = null;
    for(const x of up.filter(x=>x.d>=today)){ v -= x.v; if(v<0 && !low) low = x.d; }
    if(low) out.push({k:'neg'+low, lvl:'bad', t:'Konto droht ins Minus', s:`Nach den geplanten Zahlungen um den ${dShort(low)}`, go:'statistik'}); }catch(e){}
  const unm = D.tx.filter(t=>t.c==='_offen').length; if(unm) out.push({k:'unm'+unm, lvl:'info', t:`${unm} Buchungen ohne Kategorie`, s:'Antippen zum Zuordnen', act:'mapcats'});
  const sug = aboSuggest().length; if(sug) out.push({k:'abo'+sug, lvl:'info', t:`${sug} wiederkehrende Zahlungen erkannt`, s:'Als Dauerauftrag übernehmen?', go:'plaene'});
  return out.map(n=>({...n, seen:!!seen[n.k]}));
}
function bellDialog(){
  const L = notices();
  dialog(`<h3>Hinweise</h3>${L.map(n=>`<div class="nrow2 ${n.lvl} ${n.seen?'seen':''}" ${n.act?`data-act="${n.act}"`:`data-go="${n.go}"`} data-k="${esc(n.k)}"><i></i><span class="sp"><b>${esc(n.t)}</b><br><span class="small muted">${esc(n.s)}</span></span>›</div>`).join('')||'<p class="small muted">Alles in Ordnung – keine Hinweise.</p>'}
    <div class="acts">${L.some(n=>!n.seen)?'<button class="btn" data-dlg="seen">Alle als gelesen markieren</button>':''}<button class="btn pri" data-dlg="cancel">Schliessen</button></div>`,
  k=>{ if(k==='seen'){ D.flags ??= {}; D.flags.seen ??= {}; L.forEach(n=>D.flags.seen[n.k]=1); } });
  $('#dlg').classList.add('bottom');
}
function bellUpdate(){
  const h = document.querySelector('header'); if(!h || !D || S.locked){ $('#bell')?.remove(); return; }
  if(!$('#bell')) h.insertAdjacentHTML('beforeend', `<button class="ibtn bell" id="bell" data-act="bell" aria-label="Hinweise">${ci('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>')}<i></i></button>`);
  const n = notices().filter(x=>!x.seen && x.lvl!=='info').length; const b = $('#bell i'); b.textContent = n||''; b.style.display = n?'':'none';
}
document.addEventListener('click', e=>{
  const nr = e.target.closest('.nrow2[data-k]'); if(nr){ D.flags ??= {}; D.flags.seen ??= {}; D.flags.seen[nr.dataset.k] = 1; save(); $('#dlg').close(); }
  const a = e.target.closest('[data-act="bell"]'); if(a && D){ e.stopPropagation(); bellDialog(); }
}, true);

/* ---------- Kalender ---------- */
function vKalender(){
  const ym = S.calYm || TODAY, first = ym+'-01', last = mEnd(ym), start = weekStart(first), today = todayIso();
  const sums = {}, pl = {};
  for(const t of D.tx){ if(t.d<first || t.d>last || isTr(t)) continue; const v = t.imp ? t.sa : (t.c==='_inc'?t.a:-t.a); sums[t.d] = (sums[t.d]||0)+v; }
  for(const x of upcoming(62)) if(x.d>=today && x.d>=first && x.d<=last) (pl[x.d] ??= []).push(x);
  let cells = ''; for(let d=start; d<=last || (dDiff(start,d)%7); d=dAdd(d,1)){ const inM = d.slice(0,7)===ym, s = sums[d];
    cells += `<button class="cday ${inM?'':'oth'} ${d===today?'tod':''} ${S.calDay===d?'sel':''}" data-act="calday" data-d="${d}"><span>${+d.slice(8)}</span>${s?`<b class="num ${s<0?'out':'in'}">${s<0?'−':'+'}${chf0(Math.abs(s))}</b>`:''}${pl[d]?'<i></i>':''}</button>`; }
  const tot = Object.values(sums), out = -tot.filter(v=>v<0).reduce((a,b)=>a+b,0), inc = tot.filter(v=>v>0).reduce((a,b)=>a+b,0);
  const sel = S.calDay && S.calDay.startsWith(ym) ? S.calDay : null, dayTx = sel ? D.tx.filter(t=>t.d===sel).sort((a,b)=>(a.imp?1:0)-(b.imp?1:0)) : [];
  return `<div class="bper"><div class="psrow"><button class="psnav" data-act="calprev" aria-label="Voriger Monat">‹</button><span class="psrange">${ymLabel(ym)}</span><button class="psnav" data-act="calnext" aria-label="Nächster Monat">›</button></div></div>
    <div class="wsum"><div><span>Ausgaben</span><b class="num out">−${chf0(out)}</b></div><div><span>Einnahmen</span><b class="num in">+${chf0(inc)}</b></div><div><span>Saldo</span><b class="num ${inc-out<0?'out':'in'}">${signChf(inc-out)}</b></div></div>
    <div class="xcard"><div class="cal"><div class="cwd">${['Mo','Di','Mi','Do','Fr','Sa','So'].map(x=>`<span>${x}</span>`).join('')}</div><div class="cgrid">${cells}</div></div>
      <p class="small muted" style="margin:8px 0 0">Punkt = geplante Zahlung. Tag antippen zeigt die Buchungen.</p></div>
    ${sel?`<div class="wday mt"><div class="wdayh"><span>${dayLabel(sel)}</span></div>${dayTx.map(bkTxRow).join('')}${(pl[sel]||[]).map(upRow).join('')||''}${!dayTx.length&&!pl[sel]?'<p class="small muted">Keine Buchungen.</p>':''}</div>`:''}`;
}
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act^="cal"],[data-act^="plan"]'); if(!a || !D) return; const k = a.dataset.act;
  const H = {calprev:()=>{ S.calYm = ymAdd(S.calYm||TODAY,-1); S.calDay=null; }, calnext:()=>{ S.calYm = ymAdd(S.calYm||TODAY,1); S.calDay=null; }, calday:()=>{ S.calDay = S.calDay===a.dataset.d ? null : a.dataset.d; },
    plannew:()=>{ planDialog(); return 'skip'; }, planedit:()=>{ planDialog(+a.dataset.i); return 'skip'; },
    planadd:()=>{ const s = aboSuggest()[+a.dataset.i]; if(!s) return; const d = TODAY+'-'+String(Math.min(s.day,28)).padStart(2,'0');
      (D.plans ??= []).push({id:'p'+uid(), type:s.type, name:s.name, amount:s.amount, freq:'M', start:d<todayIso()?ymAdd(TODAY,1)+'-'+String(Math.min(s.day,28)).padStart(2,'0'):d, day:s.day, acc:mainAcc().id, cat:s.cat, match:s.match}); save(); toastMsg(`«${s.name}» als Dauerauftrag übernommen`); } };
  if(!H[k]) return; e.stopPropagation(); if(H[k]()!=='skip') render();
}, true);

/* ---------- Schnell erfassen: häufige eigene Buchungen als Vorlagen im Plus-Menü ---------- */
function templates(){
  const by = new Map();
  for(const t of D.tx){ if(t.imp || !t.c || t.c==='_offen' || isTr(t)) continue; const k = t.c+'|'+String(t.n||'').trim().toLowerCase();
    const o = by.get(k) || {c:t.c, n:t.n||'', a:[], last:''}; o.a.push(Math.abs(t.a)); if(t.d>o.last) o.last = t.d; by.set(k,o); }
  return [...by.values()].filter(o=>o.a.length>=2).sort((x,y)=>y.a.length-x.a.length || y.last.localeCompare(x.last)).slice(0,6)
    .map(o=>{ const s = [...o.a].sort((x,y)=>x-y); return {...o, amt:s[Math.floor(s.length/2)]}; });
}
var _fabSheet1130 = fabSheet;
fabSheet = function(){
  _fabSheet1130(); const T = templates(); if(!T.length) return;
  $('#dlgbody .sheet')?.insertAdjacentHTML('afterbegin', `<div class="tpls"><span class="small muted">Schnell erfassen</span><div>${T.map((t,i)=>`<button data-tpl="${i}"><b>${esc(t.n||bkName(t.c))}</b><span>${chf(t.amt)}</span></button>`).join('')}</div></div>`);
  S.tplList = T;
};
document.addEventListener('click', e=>{ const b = e.target.closest('[data-tpl]'); if(!b || !D) return; e.stopPropagation(); const t = S.tplList?.[+b.dataset.tpl]; $('#dlg').close();
  if(t) setTimeout(()=>txDialog(null, {c:t.c, a:t.amt, n:t.n}), 60); }, true);

/* ---------- Einbinden: Menü, Seiten, Startseite, Glocke ---------- */
NAV4[0][1].push(['kalender', ICON.cal, 'Kalender']);
NAV4.find(s=>s[0]==='Geplante Zahlungen')?.[1].unshift(['plaene', ICON.repeat, 'Daueraufträge & Lohn']);
TITLES.kalender = 'Kalender'; TITLES.plaene = 'Daueraufträge & Lohn';
FAB_VIEWS.push('kalender','plaene');
var _vStart1130 = vStart;
vStart = function(){ const h = _vStart1130(); return (S.stab||'konten')==='konten' ? h.replace('<div class="agrid home">', `<div class="agrid home">${cardPayday()}`) : h; };
var _render1130 = render;
render = function(){
  const custom = {kalender:vKalender, plaene:vPlaene}[S.view];
  if(custom && !S.locked && D){ const keep = S.view; S.view = 'autoregeln'; _render1130(); S.view = keep;
    $('header h1').textContent = TITLES[keep]; $('#main').innerHTML = custom();
    document.querySelectorAll('nav.side a').forEach(x=>x.classList.toggle('on', x.dataset.go===keep));
    $('#fab')?.classList.remove('hide'); $('#mnav')?.style.setProperty('visibility','hidden'); bellUpdate(); return; }
  _render1130(); bellUpdate();
};
