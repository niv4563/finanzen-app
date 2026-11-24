/* =====================================================================
   66. VERSION 1.39.0 – TÄGLICHE SCHÄTZUNG AUS DEINEM VERHALTEN
   Für jede Kategorie mit veränderlichen Ausgaben (Lebensmittel, Restaurant, Kleidung, Freizeit …)
   lernt die App aus allen bisherigen Buchungen:
   - Niveau: wie viel pro Monat (letzte 6 Monate stärker gewichtet, Ausreisser gedämpft)
   - Saison: ist dieser Monat in früheren Jahren teurer oder günstiger (z. B. Dezember)?
   - Wochentag: an welchen Tagen du dafür Geld ausgibst (z. B. Samstag Einkauf)
   Daraus entsteht für jeden Tag des Monats eine geschätzte Ausgabe pro Kategorie.
   Die Prognose im Ausblick rechnet damit statt mit dem gleichmässig verteilten Budget.
   Alles wird auf dem Gerät gerechnet; es geht nichts ins Internet.
   ===================================================================== */
var BH_FIX = ['fix','schulden','spar'];
// Wallet-Kategorien zählen ins Budget einer eigenen Kategorie («Zählt ins Budget von») – gerechnet wird pro Budget-Kategorie
var bhKey = c => { const x = D.cats.find(y=>y.id===c); return x?.bud && D.cats.some(y=>y.id===x.bud && !y.wid) ? x.bud : c; };
var bhGroup = c => D.cats.find(x=>x.id===bhKey(c))?.group || D.cats.find(x=>x.id===c)?.group || '';
var bhVar = c => c && c!=='_inc' && c!=='_tr' && !BH_FIX.includes(bhGroup(c));
var bhCache = {k:null, v:null};

// Modell pro Kategorie aus der ganzen Geschichte (ohne laufenden Monat)
function bhModel(){
  const key = TODAY+'|'+D.tx.length+'|'+(D.savedAt||'');
  if(bhCache.k===key) return bhCache.v;
  // die letzten 48 Monate vor dem laufenden Monat (nicht die ältesten)
  const first = D.tx.reduce((m,t)=>t.d<m?t.d:m, '9999').slice(0,7), hist = [];
  for(let ym=ymAdd(TODAY,-1); ym>=first && hist.length<48; ym=ymAdd(ym,-1)) hist.unshift(ym);
  const histSet = new Set(hist);
  const byCat = {};
  for(const t of D.tx){ const v = kSpend(t); if(!v || !bhVar(t.c)) continue; const ym = t.d.slice(0,7); if(!histSet.has(ym)) continue;
    const o = byCat[bhKey(t.c)] ??= {m:{}, dow:Array(7).fill(0), n:0}; o.m[ym] = (o.m[ym]||0) + v; o.dow[new Date(t.d+'T12:00').getDay()] += v; o.n++; }
  const models = {};
  for(const [c,o] of Object.entries(byCat)){
    // nur Monate ab der ersten Buchung dieser Kategorie zählen
    const firstM = Object.keys(o.m).sort()[0], ms = hist.filter(m=>m>=firstM), vals = ms.map(m=>o.m[m]||0);
    if(ms.length<2 || o.n<3) continue;
    const sorted = [...vals].sort((a,b)=>a-b), med = sorted[Math.floor(sorted.length/2)], cap = Math.max(med*2.5, 1);
    const w = vals.map(v=>Math.min(v, cap));                         // Ausreisser dämpfen (z. B. ein grosser Einkauf)
    const last = (n) => { const l = w.slice(-n); return l.length ? l.reduce((a,b)=>a+b,0)/l.length : 0; };
    const wt = w.slice(-6).map((v,i,a)=>v*(i+1)).reduce((a,b)=>a+b,0) / w.slice(-6).map((v,i)=>i+1).reduce((a,b)=>a+b,0);
    let level = 0.6*wt + 0.4*last(12);
    // Saison: gleicher Kalendermonat in früheren Jahren im Vergleich zu deren Jahresschnitt
    const mm = TODAY.slice(5), same = ms.filter(m=>m.slice(5)===mm);
    let sf = 1;
    if(same.length){ const r = same.map(m=>{ const y = ms.filter(x=>x.slice(0,4)===m.slice(0,4)), avg = y.reduce((s,x)=>s+(o.m[x]||0),0)/y.length; return avg>0 ? (o.m[m]||0)/avg : 1; });
      sf = Math.min(1.6, Math.max(0.6, 1 + (r.reduce((a,b)=>a+b,0)/r.length - 1) * Math.min(1, same.length/2) * 0.7)); }
    // Wochentag: Anteil, mit Glättung (wenige Buchungen → fast gleichmässig)
    const tot = o.dow.reduce((a,b)=>a+b,0) || 1, k = Math.max(0, 1 - o.n/60);
    const dow = o.dow.map(v=>(v/tot)*7*(1-k) + k);
    // Streuung → Bandbreite
    const mean = vals.reduce((a,b)=>a+b,0)/vals.length, sd = Math.sqrt(vals.reduce((s,v)=>s+(v-mean)**2,0)/vals.length);
    models[c] = {c, level, sf, month:level*sf, dow, months:ms.length, n:o.n, cv: mean ? sd/mean : 1, top:o.dow.indexOf(Math.max(...o.dow))};
  }
  bhCache = {k:key, v:models}; return models;
}
// Geschätzte Ausgabe einer Kategorie an einem Tag
function bhDay(m, d){
  const ym = d.slice(0,7), n = +mEnd(ym).slice(8); let sw = 0;
  for(let i=1;i<=n;i++) sw += m.dow[new Date(ym+'-'+String(i).padStart(2,'0')+'T12:00').getDay()];
  return m.month * m.dow[new Date(d+'T12:00').getDay()] / sw;
}
// Andere Monate: nur das Niveau (ohne Saison des laufenden Monats)
function bhMonthEst(m, ym){ if(ym===TODAY) return m.month; return m.level; }
function bhDayIn(m, d){ const ym = d.slice(0,7); return bhDay({...m, month:bhMonthEst(m, ym)}, d); }

var WD = ['So','Mo','Di','Mi','Do','Fr','Sa'], WDL = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];

// Prognose: Alltag & Freizeit aus dem Verhalten statt gleichmässig aus dem Budget
fcEvents = (prev => function(until){
  const F = prev(until), M = bhModel(), today = todayIso(), tmr = dAdd(today,1);
  // auch Monate ohne Budget bekommen den täglichen Gebrauch
  for(let ym=TODAY; ym<=until.slice(0,7); ym=ymAdd(ym,1)){ if(F.bud.some(b=>b.ym===ym)) continue;
    const from = ym===TODAY ? tmr : ym+'-01', to = mEnd(ym) > until ? until : mEnd(ym); if(from<=to) F.bud.push({ym, from, to, tot:0, per:[]}); }
  F.bud.sort((a,b)=>a.ym.localeCompare(b.ym));
  for(const b of F.bud){ const days = {}; let tot = 0, beh = 0;
    for(const p of b.per){ const m = M[p.c.id];
      if(m && m.months>=3){ let s = 0; const dd = {}; for(let d=b.from; d<=b.to; d=dAdd(d,1)){ const v = bhDayIn(m, d); dd[d] = v; s += v; }
        // Rechnungen dieser Kategorie im Monat sind schon genau drin: vom geschätzten Rest abziehen
        const f = s>0 ? Math.max(0, s - (p.known||0))/s : 0;
        for(const d in dd){ days[d] = (days[d]||0) + dd[d]*f; } tot += s*f; beh++; p.beh = s*f; }
      else { const n = dDiff(b.from,b.to)+1; for(let d=b.from; d<=b.to; d=dAdd(d,1)) days[d] = (days[d]||0) + p.rest/n; tot += p.rest; } }
    // Kategorien mit Verhalten, aber ohne Budget
    for(const m of Object.values(M)){ if(m.months<3 || b.per.some(p=>p.c.id===m.c)) continue; const c = D.cats.find(x=>x.id===m.c); if(!c || c.archived) continue;
      let s = 0; for(let d=b.from; d<=b.to; d=dAdd(d,1)){ const v = bhDayIn(m, d); days[d] = (days[d]||0) + v; s += v; } tot += s; b.per.push({c, rest:0, beh:s, known:0}); beh++; }
    b.days = days; b.tot = tot; b.beh = beh;
  }
  return F;
})(fcEvents);
fcSeries = function(until){
  const today = todayIso(), F = fcEvents(until), start = fcLiquidNow(), byDay = {};
  for(const x of F.list) byDay[x.d] = (byDay[x.d]||0) + x.v;
  for(const b of F.bud){ if(b.days) for(const [d,v] of Object.entries(b.days)) byDay[d] = (byDay[d]||0) + v;
    else { const n = dDiff(b.from,b.to)+1; for(let d=b.from; d<=b.to; d=dAdd(d,1)) byDay[d] = (byDay[d]||0) + b.tot/n; } }
  const pts = []; let v = start - (byDay[today]||0);
  pts.push({d:today, v});
  for(let d=dAdd(today,1); d<=until; d=dAdd(d,1)){ v -= byDay[d]||0; pts.push({d, v}); }
  return {F, pts, start};
};

// ---------- Karte: Tägliche Schätzung für diesen Monat ----------
function cardDaily(){
  const M = bhModel(), cats = Object.values(M).filter(m=>m.months>=2 && D.cats.some(c=>c.id===m.c));
  if(!cats.length) return `<div class="xcard xw"><div class="ah"><h3>Tägliche Schätzung</h3></div><p class="small muted">Für eine Schätzung aus deinem Verhalten braucht es Buchungen aus mindestens zwei Monaten.</p></div>`;
  const ym = TODAY, today = todayIso(), n = +mEnd(ym).slice(8), days = Array.from({length:n},(_,i)=>ym+'-'+String(i+1).padStart(2,'0'));
  const actDay = d => D.tx.filter(t=>t.d===d && bhVar(t.c)).reduce((s,t)=>s+kSpend(t),0);  // alle veränderlichen Ausgaben des Tages
  const estDay = d => cats.reduce((s,m)=>s+bhDay(m,d),0);
  const act = days.map(d=>d<=today ? actDay(d) : null), est = days.map(estDay);
  const spent = act.reduce((s,v)=>s+(v||0),0), rest = days.filter(d=>d>today).reduce((s,d)=>s+estDay(d),0), expSoFar = days.filter(d=>d<=today).reduce((s,d)=>s+estDay(d),0);
  const budget = cats.reduce((s,m)=>s+(C.m?.[ym]?.plan?.[m.c]||0),0) || D.cats.filter(c=>['leben','freizeit'].includes(c.group)).reduce((s,c)=>s+(C.m?.[ym]?.plan?.[c.id]||0),0);
  const total = spent + rest, cvAvg = cats.reduce((s,m)=>s+m.cv*m.month,0) / Math.max(1, cats.reduce((s,m)=>s+m.month,0));
  const band = Math.round(rest * Math.min(0.5, cvAvg*0.6));
  const chartV = chart({label:'Ausgaben pro Tag: effektiv und geschätzt', h:200, labels:days.map(d=>String(+d.slice(8))), tips:days.map(d=>`${WDL[new Date(d+'T12:00').getDay()]}, ${dShort(d)}${d>today?' · Schätzung':''}`),
    series:[{name:'Effektiv', color:C_OUT, kind:'bar', values:act.map(v=>v==null?0:Math.round(v))},{name:'Geschätzt', color:'#8a96a3', dash:true, values:est.map(v=>Math.round(v))}]});
  // Kategorien
  const rows = cats.map(m=>{ const c = D.cats.find(x=>x.id===m.c), so = D.tx.filter(t=>t.d.startsWith(ym) && t.d<=today && bhKey(t.c)===m.c).reduce((s,t)=>s+kSpend(t),0),
      re = days.filter(d=>d>today).reduce((s,d)=>s+bhDay(m,d),0), pl = C.m?.[ym]?.plan?.[m.c]||0;
      return {m, c, so, re, end:so+re, pl}; }).sort((a,b)=>b.end-a.end);
  const crow = r => `<tr><td>${esc(r.c.name)}<span class="small muted">Ø ${chf0(r.m.month/n)}/Tag · meist ${WD[r.m.top]}${Math.abs(r.m.sf-1)>=0.08?` · ${ymShort(ym)} ${r.m.sf>1?'+':'−'}${Math.round(Math.abs(r.m.sf-1)*100)} %`:''}</span></td>
      <td class="num">${chf0(r.so)}</td><td class="num bplan">${chf0(r.re)}</td><td class="num ${r.pl && r.end>r.pl+1?'out':''}"><b>${chf0(r.end)}</b></td><td class="num muted">${r.pl?chf0(r.pl):'–'}</td></tr>`;
  // kommende Tage
  const next = days.filter(d=>d>today).map(d=>{ const parts = cats.map(m=>({c:m.c, v:bhDay(m,d)})).filter(x=>x.v>=1).sort((a,b)=>b.v-a.v);
    return {d, v:parts.reduce((s,x)=>s+x.v,0), parts}; });
  const mx = Math.max(1, ...next.map(x=>x.v));
  const drow = x => `<div class="dyrow"><span class="dyd"><b>${WD[new Date(x.d+'T12:00').getDay()]}</b> ${dShort(x.d)}</span><span class="dyb"><i style="width:${x.v/mx*100}%"></i></span><b class="num bplan">${chf0(x.v)}</b>
      <span class="dyp small muted">${x.parts.slice(0,3).map(p=>`${esc(bkName(p.c))} ${chf0(p.v)}`).join(' · ')}</span></div>`;
  const accNote = expSoFar>0 ? Math.round((spent/expSoFar-1)*100) : 0;
  return `<div class="xcard xw"><div class="ah"><div><h3>Tägliche Schätzung · ${ymLabel(ym)}</h3><span class="small muted">Aus deinem Verhalten seit ${ymLabel(ymAdd(TODAY,-Math.max(...cats.map(m=>m.months))))} · Lebensmittel, Konsum, Freizeit</span></div></div>
    <div class="kgrid fck"><div><span>Bisher ausgegeben</span><b class="num">CHF ${chf0(spent)}</b><small class="muted">${accNote===0?'genau wie geschätzt':`${Math.abs(accNote)} % ${accNote>0?'mehr':'weniger'} als geschätzt`}</small></div>
      <div><span>Geschätzt bis Monatsende</span><b class="num bplan">CHF ${chf0(rest)}</b><small class="muted">± ${chf0(band)}</small></div>
      <div><span>Erwartet im ${ymShort(ym)}</span><b class="num bplan ${budget && total>budget?'out':''}">CHF ${chf0(total)}</b><small class="muted">${budget?`Budget ${chf0(budget)} · ${total>budget?chf0(total-budget)+' darüber':chf0(budget-total)+' darunter'}`:'kein Budget'}</small></div>
      <div><span>Pro Tag (Rest)</span><b class="num bplan">CHF ${chf0(rest/Math.max(1,days.filter(d=>d>today).length))}</b><small class="muted">${days.filter(d=>d>today).length} Tage</small></div></div>
    ${chartV}
    <div class="fclegend small"><span><i class="sq"></i>effektiv</span><span><i class="ln d g"></i>geschätzt</span></div>
    <details class="mt" open><summary class="small"><b>Kommende Tage</b></summary><div class="dylist">${next.map(drow).join('')||'<p class="small muted">Der Monat ist vorbei.</p>'}</div></details>
    <details class="mt"><summary class="small"><b>Nach Kategorie</b></summary><div class="tw"><table class="fctab dytab"><tr><th>Kategorie</th><th>Bisher</th><th>Rest (geschätzt)</th><th>Erwartet</th><th>Budget</th></tr>${rows.map(crow).join('')}</table></div></details>
    <p class="small muted" style="margin:8px 0 0">So rechnet die App: Niveau der letzten Monate (die letzten 6 zählen mehr, Ausreisser gedämpft), Saison aus früheren Jahren und deine Wochentage. Die Prognose oben verwendet diese Tageswerte. Kategorien mit Budget, aber ohne eigene Buchungen (z. B. Puffer), rechnet sie weiterhin mit dem Budget.</p></div>`;
}
cardOutlook = (prev => function(){ const h = prev().replace(/Schätzung · Rest des Budgets auf (\d+) Tage/g, (x,n)=>bhCache.v && Object.keys(bhCache.v).length ? `Schätzung aus deinem Verhalten · ${n} Tage` : x), k = cardDaily(), i = h.indexOf('<div class="xcard xw"><div class="ah"><div><h3>Kontotrend');
  return i>=0 ? h.slice(0,i) + k + h.slice(i) : h + k; })(cardOutlook);
// Auch im Reiter «Ausgaben» der Analyse: tägliche Schätzung zuoberst
vStatistik = (prev => function(){ const h = prev(); if((S.atab2||'saldo')!=='aus') return h; const i = h.indexOf('<div class="agrid">');
  return i>=0 ? h.slice(0, i+19) + cardDaily() + h.slice(i+19) : h; })(vStatistik);
