/* =====================================================================
   63. VERSION 1.36.0 – AUSBLICK: ZUKUNFT GESTRICHELT, GENAUERE PROGNOSE
   Bisher (durchgezogen) und Prognose (gestrichelt) in einem Verlauf. Die Prognose rechnet mit
   - genau bekannten Zahlungen: offene und angewiesene Rechnungen, Vormerkungen,
     Daueraufträge, Lohn und Einnahmen, geplante Zahlungen aus Wallet
   - Schätzungen: feste Kosten aus dem Budget (am üblichen Tag), Jahreskosten,
     Alltag & Freizeit aus dem Budget (über die Tage verteilt), Lohn aus den letzten Monaten.
   Eine gescannte Rechnung ersetzt die passende Schätzung (gleiche Kategorie oder gleicher
   Name, gleicher Monat) – so wird die Prognose mit jeder Rechnung genauer.
   ===================================================================== */
var fcTok = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').split(/[^a-z0-9]+/).filter(w=>w.length>=4 && !['rechnung','zahlung','monat','jahres','kosten','gmbh','schweiz'].includes(w));
var fcNameMatch = (a, b) => { const A = fcTok(a), B = new Set(fcTok(b)); return A.some(w=>B.has(w) || [...B].some(v=>v.length>=5 && w.length>=5 && (v.startsWith(w.slice(0,5)) || w.startsWith(v.slice(0,5))))); };
var fcLiquidAccs = () => activeAccs().filter(a=>!a.archived && (a.liquid||a.main));
var fcLiquidNow = () => fcLiquidAccs().reduce((s,a)=>s+accVal(a),0);

// Alle erwarteten Zahlungen bis «until». v > 0 = Ausgabe, v < 0 = Einnahme. est = Schätzung.
function fcEvents(until){
  const today = todayIso(), tmr = dAdd(today,1), ev = [], pushAt = (x) => ev.push({...x, d: x.d<today ? today : x.d, late: x.d<today});
  const months = []; for(let ym=TODAY; ym<=until.slice(0,7); ym=ymAdd(ym,1)) months.push(ym);
  // 1. Genau bekannt
  for(const b of D.bills||[]){
    if(b.status==='offen') pushAt({d:b.due||today, n:b.creditor, sub:'Rechnung', v:Math.abs(b.amount), c:b.cat, k:'bill', go:'rechnungen', ref:b.id});
    else if(b.status==='angewiesen') pushAt({d:dAdd(b.paid||today,2), n:b.creditor, sub:'Rechnung angewiesen', v:Math.abs(b.amount), c:b.cat, k:'bill', go:'rechnungen', ref:b.id});
  }
  for(const p of D.pend||[]) if(p.d<=until) pushAt({d:p.d, n:p.n, sub:'vorgemerkt', v:Math.abs(p.a), c:p.c, k:'pend', go:'buchungen'});
  for(const x of planOcc(dAdd(today,-10), until)) pushAt({...x, k:x.v<0?'inc':'plan'});
  for(const x of wbPlannedOcc(dAdd(today,-10), until))
    if(!ev.some(y=>Math.abs(Math.abs(y.v)-Math.abs(x.v))<1 && Math.abs(dDiff(y.d,x.d))<=3)) pushAt({...x, k:x.v<0?'inc':'plan'});
  // 2. Lohn schätzen, wenn er nirgends geplant ist
  if(!ev.some(x=>x.v<0 && x.k==='inc')){
    const inc = [1,2,3].map(i=>{ const ym = ymAdd(TODAY,-i), l = D.tx.filter(t=>t.d.startsWith(ym) && t.c==='_inc'); return {s:l.reduce((s,t)=>s+inAmt(t),0), big:l.sort((a,b)=>inAmt(b)-inAmt(a))[0]}; }).filter(x=>x.s>=500);
    if(inc.length>=2){ const avg = inc.reduce((s,x)=>s+x.s,0)/inc.length, day = Math.round(inc.reduce((s,x)=>s+ +x.big.d.slice(8),0)/inc.length);
      for(const ym of months){ const got = D.tx.filter(t=>t.d.startsWith(ym) && t.c==='_inc').reduce((s,t)=>s+inAmt(t),0); if(got >= avg*0.6) continue;
        const d = ym+'-'+String(Math.min(day, +mEnd(ym).slice(8))).padStart(2,'0'); if(d<=until) pushAt({d: d<tmr?tmr:d, n:'Lohn (geschätzt)', sub:'Schätzung · Ø der letzten Monate', v:-(avg-got), c:'_inc', k:'inc', est:true, go:'plaene'}); } }
  }
  // 3. Feste Kosten aus dem Budget (wenn nicht als Dauerauftrag erfasst)
  const planned = new Set((D.plans||[]).filter(p=>!p.off && p.type!=='in').map(p=>p.cat).filter(Boolean));
  for(const c of D.cats.filter(c=>c.group==='fix' && !c.archived && !planned.has(c.id))){
    const last = D.tx.filter(t=>t.c===c.id).sort((x,y)=>y.d.localeCompare(x.d))[0], day = last ? +last.d.slice(8) : 25;
    for(const ym of months){ const plan = C.m?.[ym]?.plan?.[c.id] || 0; if(plan<=0) continue;
      const ist = ym===TODAY ? Math.max(0, C.ist?.[c.id]?.[ym]||0) : 0, rest = plan - ist; if(rest < plan*0.2) continue;
      let d = ym+'-'+String(Math.min(day, +mEnd(ym).slice(8))).padStart(2,'0'); if(d<tmr) d = ym===TODAY ? (mEnd(ym)<tmr ? null : tmr) : d; if(!d || d>until) continue;
      pushAt({d, n:c.name, sub:'Schätzung · feste Kosten (Budget)', v:rest, c:c.id, k:'fix', est:true, go:'budget'}); }
  }
  // 4. Jahreskosten (jedes Vorkommen im Zeitraum)
  for(const y of D.yearly||[]){ for(let yr=+today.slice(0,4); yr<=+until.slice(0,4); yr++){ const d = `${yr}-${String(y.month).padStart(2,'0')}-01`;
    if(d>=dAdd(today,-20) && d<=until && !D.tx.some(t=>t.c===y.cat && Math.abs(dDiff(t.d,d))<=31 && Math.abs(kSpend(t)-y.amount) < y.amount*0.3)) pushAt({d: d<tmr?tmr:d, n:y.name, sub:'Schätzung · Jahreskosten', v:Math.abs(y.amount), c:y.cat, k:'yearly', est:true, go:'jahr'}); } }
  // 5. Rechnungen ersetzen passende Schätzungen
  const exact = ev.filter(x=>['bill','pend'].includes(x.k));
  for(const x of exact){
    const m = ev.find(y=>y.est && ['fix','yearly'].includes(y.k) && !y.gone && Math.abs(dDiff(y.d,x.d))<=31 && ((x.c && x.c===y.c && x.c!=='_offen') || fcNameMatch(x.n, y.n)))
      || ev.find(y=>y.k==='plan' && !y.gone && Math.abs(dDiff(y.d,x.d))<=25 && Math.abs(y.v-x.v) <= Math.max(20, y.v*0.35) && ((x.c && x.c===y.c && x.c!=='_offen') || fcNameMatch(x.n, y.n)));
    if(m){ m.gone = true; x.repl = {n:m.n, v:m.v, k:m.k}; x.c = x.c && x.c!=='_offen' ? x.c : m.c; }
  }
  // 6. Alltag & Freizeit: Rest des Budgets, über die Tage verteilt (Rechnungen dieser Kategorien werden abgezogen)
  const flex = D.cats.filter(c=>['leben','freizeit'].includes(c.group) && !c.archived), bud = [];
  for(const ym of months){ const from = ym===TODAY ? tmr : ym+'-01', to = mEnd(ym) > until ? until : mEnd(ym); if(from>to) continue;
    let tot = 0; const per = [];
    for(const c of flex){ const plan = C.m?.[ym]?.plan?.[c.id] || 0; if(!plan) continue;
      const ist = ym===TODAY ? Math.max(0, C.ist?.[c.id]?.[ym]||0) : 0, known = ev.filter(x=>!x.gone && !x.est && x.v>0 && x.c===c.id && x.d.startsWith(ym)).reduce((s,x)=>s+x.v,0);
      // Monat, der nur teilweise im Zeitraum liegt: anteilig
      const share = (dDiff(from,to)+1) / (dDiff(ym===TODAY?from:ym+'-01', mEnd(ym))+1), rest = Math.max(0, plan - ist - known) * share;
      if(rest>0){ tot += rest; per.push({c, rest, known}); } }
    if(tot>0) bud.push({ym, from, to, tot, per});
  }
  const list = ev.filter(x=>!x.gone && x.d<=until).sort((a,b)=>a.d.localeCompare(b.d));
  return {list, bud};
}
// Täglicher erwarteter Stand der liquiden Konten
function fcSeries(until){
  const today = todayIso(), F = fcEvents(until), start = fcLiquidNow(), byDay = {};
  for(const x of F.list) byDay[x.d] = (byDay[x.d]||0) + x.v;
  for(const b of F.bud){ const n = dDiff(b.from,b.to)+1; for(let d=b.from; d<=b.to; d=dAdd(d,1)) byDay[d] = (byDay[d]||0) + b.tot/n; }
  const pts = []; let v = start - (byDay[today]||0);
  pts.push({d:today, v});
  for(let d=dAdd(today,1); d<=until; d=dAdd(d,1)){ v -= byDay[d]||0; pts.push({d, v}); }
  return {F, pts, start};
}
// Bisheriger Verlauf der liquiden Konten (an den heutigen Stand angeglichen)
function fcPast(days){
  const today = todayIso(), accs = fcLiquidAccs(), at = d => accs.reduce((s,a)=>s+(D.bal?.[a.id] ? (balAt(a.id,d)||0) : accVal(a)),0), off = fcLiquidNow() - at(today), out = [];
  for(let i=days; i>=1; i--){ const d = dAdd(today,-i); out.push({d, v:at(d)+off}); }
  return out;
}

var OHZ = [['30','30 Tage'],['90','3 Monate'],['365','12 Monate']];
cardOutlook = function(){
  const today = todayIso(), hz = +(S.ohz||'90'), until = dAdd(today, hz), past = fcPast(hz<=30 ? 30 : hz<=90 ? 45 : 90);
  const {F, pts, start} = fcSeries(until), all = [...past, ...pts], wk = hz>90;
  // bei 12 Monaten: wöchentliche Punkte, damit der Verlauf ruhig bleibt
  const sel = wk ? all.filter((p,i)=>i===all.length-1 || p.d===today || dDiff(all[0].d,p.d)%7===0) : all;
  const ti = sel.findIndex(p=>p.d===today);
  const labels = sel.map(p=>p.d===today?'Heute':dShort(p.d)), tips = sel.map(p=>new Date(p.d+'T12:00').toLocaleDateString('de-CH',{weekday:'short',day:'numeric',month:'long',year:p.d.slice(0,4)!==today.slice(0,4)?'numeric':undefined})+(p.d>today?' · Prognose':''));
  const sPast = sel.map((p,i)=>i<=ti ? Math.round(p.v) : null), sFc = sel.map((p,i)=>i>=ti ? Math.round(p.v) : null);
  const end = pts.at(-1).v, low = pts.reduce((m,p)=>p.v<m.v?p:m, pts[0]);
  const exOut = F.list.filter(x=>x.v>0 && !x.est).reduce((s,x)=>s+x.v,0), esOut = F.list.filter(x=>x.v>0 && x.est).reduce((s,x)=>s+x.v,0) + F.bud.reduce((s,b)=>s+b.tot,0);
  const exIn = -F.list.filter(x=>x.v<0 && !x.est).reduce((s,x)=>s+x.v,0), esIn = -F.list.filter(x=>x.v<0 && x.est).reduce((s,x)=>s+x.v,0);
  const sure = exOut+esOut ? Math.round(exOut/(exOut+esOut)*100) : 100, repl = F.list.filter(x=>x.repl);
  // Monatsübersicht
  const months = []; for(let ym=TODAY; ym<=until.slice(0,7); ym=ymAdd(ym,1)) months.push(ym);
  const mrow = ym => { const L = F.list.filter(x=>x.d.startsWith(ym)), inc = -L.filter(x=>x.v<0).reduce((s,x)=>s+x.v,0), incE = L.some(x=>x.v<0 && x.est),
      fixS = L.filter(x=>x.v>0 && !x.est).reduce((s,x)=>s+x.v,0), fixE = L.filter(x=>x.v>0 && x.est).reduce((s,x)=>s+x.v,0), bu = F.bud.find(b=>b.ym===ym)?.tot||0,
      endP = [...pts].reverse().find(p=>p.d<=mEnd(ym))?.v ?? start;
    return `<tr><td>${ymShort(ym)}${ym===TODAY?' <span class="small muted">(Rest)</span>':''}</td><td class="num in">${inc?(incE?'<span class="bplan">':'')+'+'+chf0(inc)+(incE?'</span>':''):'–'}</td><td class="num">${fixS?'−'+chf0(fixS):'–'}</td><td class="num bplan">${fixE+bu?'−'+chf0(fixE+bu):'–'}</td><td class="num ${endP<0?'out':''}"><b>${signChf(Math.round(endP))}</b></td></tr>`; };
  const row = x => { const inc = x.v<0, ic = inc ? CI.inc : x.c ? catIcon({c:x.c}) : CI.tag, col = inc ? 'var(--ok)' : x.c ? (GROUPS[D.cats.find(c=>c.id===x.c)?.group]?.c || 'var(--acc)') : 'var(--acc)';
    const tag = x.est ? '' : '<span class="fctag ok">genau</span>';
    const rp = x.repl ? `<span class="fcrepl">ersetzt Schätzung «${esc(x.repl.n)}» CHF ${chf0(x.repl.v)}${Math.abs(x.v-x.repl.v)>=1?` (${x.v>x.repl.v?'+':'−'}${chf0(Math.abs(x.v-x.repl.v))})`:''}</span>` : '';
    return `<div class="wrow plan ${x.est?'est':''}" data-go="${x.go||'kalender'}"><span class="wic" style="background:${col}">${ci(ic)}</span><div class="wmid"><b>${esc(x.n)}</b><span>${tag}${esc(x.sub||'')}</span>${rp}</div>
      <div class="wend"><b class="num ${inc?'in':'out'}">(${inc?'+':'−'}${chf(Math.abs(x.v))})</b><span class="${x.late?'late':''}">${x.late?'überfällig · ':''}${dShort(x.d)}</span></div></div>`; };
  const budRows = F.bud.map(b=>`<div class="wrow plan est" data-go="budget"><span class="wic" style="background:${GROUPS.leben?.c||'var(--acc)'}">${ci(CI.tag)}</span><div class="wmid"><b>Alltag & Freizeit ${ymShort(b.ym)}</b><span>Schätzung · Rest des Budgets auf ${dDiff(b.from,b.to)+1} Tage</span>${b.per.some(p=>p.known)?`<span class="fcrepl">Rechnungen in diesen Kategorien bereits abgezogen</span>`:''}</div>
      <div class="wend"><b class="num out">(−${chf0(b.tot)})</b><span>${dShort(b.from)} – ${dShort(b.to)}</span></div></div>`).join('');
  const cut = dAdd(today,31), shown = hz>30 ? F.list.filter(x=>x.d<=cut || !x.est) : F.list;
  return `<div class="xcard xw"><div class="ah"><div><h3>Ausblick</h3><span class="small muted">Bisher durchgezogen, Prognose gestrichelt</span></div></div>
    <div class="chips" style="padding:0;margin:0 0 8px">${OHZ.map(([k,l])=>`<button class="chip ${String(hz)===k?'on':''}" data-act="ohz" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="kgrid fck"><div><span>Heute verfügbar</span><b class="num">CHF ${signChf(Math.round(start))}</b></div><div><span>Erwartet am ${dShort(until)}</span><b class="num bplan ${end<0?'out':''}">CHF ${signChf(Math.round(end))}</b></div>
      <div><span>Tiefster Stand</span><b class="num bplan ${low.v<0?'out':''}">CHF ${signChf(Math.round(low.v))}</b><small class="muted">${low.d===today?'heute':dShort(low.d)}</small></div>
      <div><span>Genau bekannt</span><b class="num">${sure} %</b><small class="muted">der erwarteten Ausgaben</small></div></div>
    ${chart({label:'Verfügbar: bisher und Prognose', h:230, labels, tips, series:[{name:'Bisher', color:C_BAL, kind:'area', values:sPast},{name:'Prognose', color:C_BAL, dash:true, values:sFc}]})}
    <div class="fclegend small"><span><i class="ln"></i>bisher</span><span><i class="ln d"></i>Prognose</span></div>
    <p class="small muted">Einnahmen ${exIn?`CHF ${chf0(exIn)} geplant`:''}${esIn?`${exIn?' + ':''}<span class="bplan">CHF ${chf0(esIn)} geschätzt</span>`:''}${!exIn&&!esIn?'keine erwartet':''} · Ausgaben CHF ${chf0(exOut)} genau + <span class="bplan">CHF ${chf0(esOut)} geschätzt</span>.
      ${repl.length?` <b>${repl.length} Rechnung${repl.length>1?'en ersetzen':' ersetzt'} eine Schätzung.</b>`:''} Je mehr Rechnungen du scannst, desto genauer.</p></div>
    ${months.length>1?`<div class="xcard xw"><div class="ah"><h3>Monat für Monat</h3><span class="small muted">gestrichelt = geschätzt</span></div><div class="tw"><table class="fctab"><tr><th>Monat</th><th>Einnahmen</th><th>Genau</th><th>Geschätzt</th><th>Stand Ende Monat</th></tr>${months.map(mrow).join('')}</table></div></div>`:''}
    <div class="xcard xw"><div class="ah"><h3>Was kommt</h3><span class="small"><b class="num out">(−${chf0(exOut+esOut)})</b>${exIn+esIn?` · <b class="num in">(+${chf0(exIn+esIn)})</b>`:''}</span></div>
      ${shown.map(row).join('')}${hz>30 ? F.bud.filter(b=>b.from<=cut).length ? budRows.split('<div class="wrow').slice(1,2).map(x=>'<div class="wrow'+x).join('') : '' : budRows}${!shown.length&&!budRows?'<p class="small muted">Nichts geplant.</p>':''}
      ${hz>30 && shown.length<F.list.length?`<p class="small muted">Geschätzte Posten nach ${dShort(cut)} sind nur in der Kurve und der Monatsübersicht enthalten.</p>`:''}</div>`;
};
document.addEventListener('click', e=>{ const a = e.target.closest('[data-act="ohz"]'); if(!a || !D) return; e.stopPropagation(); S.ohz = a.dataset.v; render(); }, true);
UI_KEEP.push('ohz');

// Kontostandtrend in der Analyse: Tage in der Zukunft als gestrichelte Prognose
cardBalance = (prev => function(a, xw){
  const h = prev(a, xw), today = todayIso(); if(a.to <= today || !balAccs().length) return h;
  try{
    const B = buckets(a.from, a.to), {pts} = fcSeries(a.to), delta = d => { const p = pts.find(x=>x.d===d) || pts.at(-1); return p.v - pts[0].v; }, now = balTotal(today);
    const past = B.list.map(b=>b.to>today ? null : balTotal(b.to)), fc = B.list.map((b,i)=>b.to>today ? now + delta(b.to) : (B.list[i+1] && B.list[i+1].to>today ? balTotal(b.to) : null));
    const id = 'ch'+chN, spec = CHD[id]; if(!spec) return h;
    spec.series = [{name:'Kontostand', color:C_BAL, kind:'area', values:past},{name:'Prognose', color:C_BAL, dash:true, values:fc.map(v=>v==null?null:Math.round(v))}];
    spec.tips = B.list.map((b,i)=>b.L + (b.to>today?' · Prognose':''));
    return h.replace(/(<\/div>)$/, `<p class="small muted" style="margin:6px 0 0">Gestrichelt: Prognose aus Rechnungen, Daueraufträgen, Lohn und Budget.</p>$1`);
  }catch(e){ return h; }
})(cardBalance);

// Neue Rechnung gescannt: melden, wenn sie eine Schätzung ersetzt
var fcSeenBills = null;
render = (prev => function(){
  const r = prev.apply(this, arguments);
  try{ if(D){ const ids = (D.bills||[]).map(b=>b.id);
    if(fcSeenBills){ const nu = (D.bills||[]).filter(b=>!fcSeenBills.has(b.id) && ['offen','angewiesen'].includes(b.status));
      if(nu.length){ const F = fcEvents(dAdd(todayIso(), 400)), hit = F.list.find(x=>x.k==='bill' && nu.some(b=>b.id===x.ref) && x.repl);
        if(hit) setTimeout(()=>toastMsg(`Prognose genauer: «${hit.repl.n}» (Schätzung CHF ${chf0(hit.repl.v)}) durch Rechnung CHF ${chf0(hit.v)} ersetzt`), 400); } }
    fcSeenBills = new Set(ids); } }catch(e){}
  return r;
})(render);

// Im Ausblick gilt der eigene Zeitraum (30 Tage · 3 · 12 Monate) – die Leiste unten entfällt dort
vStatistik = (prev => function(){ const h = prev(); if((S.atab2||'saldo')!=='ausblick') return h; const i = h.indexOf('<div class="psheet'); return i>=0 ? h.slice(0,i) : h; })(vStatistik);
