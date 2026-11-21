/* =====================================================================
   33. VERSION 1.14.0 – FINANZ-ASSISTENT (KI IM GERÄT): Prognosen, Kaufverhalten, Spartipps,
       KI-Zuordnung, «Frag die App» – dazu Labels, Buchung aufteilen, Mitteilungen,
       Konto-Farbe & Symbol, Fingerabdruck/Windows Hello im Browser.
   Alles wird auf dem Gerät gerechnet. Es gehen keine Daten an einen KI-Dienst oder sonst ins Internet.
   ===================================================================== */
var kMed = a => { if(!a.length) return 0; const s = [...a].sort((x,y)=>x-y), m = s.length>>1; return s.length%2 ? s[m] : (s[m-1]+s[m])/2; };
var kTm = a => { if(!a.length) return 0; const s = [...a].sort((x,y)=>x-y); const t = s.length>=5 ? s.slice(0,-1) : s; return t.reduce((x,y)=>x+y,0)/t.length; };   // Mittel ohne grössten Ausreisser
var kSd = a => { if(a.length<2) return 0; const m = a.reduce((s,x)=>s+x,0)/a.length; return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1)); };
var kSpend = t => !isTr(t) && t.c!=='_inc' ? outAmt(t) : 0;
var kS0 = v => (v<0?'−':'+')+chf0(Math.abs(v));
var kMer = t => { const k = bkMerchant(String(t.n||'').split(' · ')[0].replace(/^kauf\/dienstleistung\s*/i,'').replace(/[\/]+/g,' ').replace(/karten\s*nr\.?\s*x*\d*/ig,' ').replace(/^google pay\s*-\s*/i,'').replace(/^(paypal|google|apple pay|sumup|zettle)\s*\*\s*/i,'')); return /^(OHNE TEXT|DIV\.? ZAHLUNGEN)$/.test(k) || !/^[A-ZÄÖÜ0-9]{2}/.test(k) || /^[A-ZÄÖÜ]{1,3}$/.test(k) ? '' : k; };
var kPct = (a,b) => b ? Math.round((a-b)/Math.abs(b)*100) : null;
// volle Monate mit Buchungen vor dem aktuellen Monat (höchstens n)
function kMonths(n){ const have = new Set(D.tx.map(t=>t.d.slice(0,7))), out = [];
  for(let i=1;i<=36 && out.length<n;i++){ const ym = ymAdd(TODAY,-i); if(have.has(ym)) out.push(ym); } return out.reverse(); }
var _kc = {};
function kCache(name, fn){ const key = name+'|'+D.tx.length+'|'+todayIso()+'|'+(D.plans||[]).length; if(_kc[name]?.key!==key) _kc[name] = {key, v:fn()}; return _kc[name].v; }
function kCatMonth(){ return kCache('cm', ()=>{ const m = {};
  for(const t of D.tx){ const v = kSpend(t); if(!v) continue; const ym = t.d.slice(0,7); ((m[ym] ??= {})[t.c] = (m[ym][t.c]||0) + v); } return m; }); }
function kNetMonth(){ return kCache('nm', ()=>{ const m = {};
  for(const t of D.tx){ if(isTr(t)) continue; const ym = t.d.slice(0,7); m[ym] = (m[ym]||0) + inAmt(t) - outAmt(t); } return m; }); }

/* ---------- 1. Prognose Monatsende ---------- */
function kForecastMonth(){ return kCache('fm', ()=>{
  const ym = TODAY, end = mEnd(ym), today = todayIso(), dim = +end.slice(8), el = Math.min(dim, +today.slice(8)), frac = el/dim;
  const hist = kMonths(6), CM = kCatMonth(), cur = CM[ym]||{}, plan = C.m[ym]?.plan || {};
  const cats = new Set([...Object.keys(cur), ...hist.flatMap(h=>Object.keys(CM[h]||{}))]);
  const planned = planOcc(today, end).filter(x=>x.v>0);
  let spent = 0, est = 0, varSum = 0; const rows = [];
  // was in früheren Monaten nach dem heutigen Tag noch dazukam (berücksichtigt, wann Miete, Steuern usw. fällig sind)
  const after = {}; for(const t of D.tx){ const v = kSpend(t); if(!v) continue; const h = t.d.slice(0,7); if(hist.includes(h) && +t.d.slice(8) > el) ((after[h] ??= {})[t.c] = (after[h][t.c]||0) + v); }
  const kAvg = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0, restM = {};
  for(const c of cats) restM[c] = kAvg(hist.map(h=>after[h]?.[c]||0));
  // Summe auf das «typische» Restmonat-Total ohne den teuersten Ausreisser-Monat skalieren
  const sumM = Object.values(restM).reduce((x,y)=>x+y,0), target = kTm(hist.map(h=>Object.values(after[h]||{}).reduce((x,y)=>x+y,0))), sc = sumM>0 ? Math.min(1, target/sumM) : 1;
  for(const c of cats){
    const now = cur[c]||0, hv = hist.map(h=>CM[h]?.[c]||0), hm = kMed(hv), sd = kSd(hv), grp = D.cats.find(x=>x.id===c)?.group;
    const pl = planned.filter(x=>x.c===c).reduce((s,x)=>s+x.v,0), restH = restM[c]*sc;
    let e;
    if(['fix','schulden','spar'].includes(grp)) e = now + Math.max(pl, now >= hm*0.8 ? 0 : restH);
    else { const paceRest = now / Math.max(frac, 0.15) * (1-frac); e = now + Math.max(pl, 0.35*paceRest + 0.65*restH); }
    spent += now; est += e; varSum += (sd*(1-frac))**2;
    rows.push({c, now, e, hm, plan:plan[c]||0});
  }
  const incHist = hist.map(h=>D.tx.filter(t=>t.d.startsWith(h) && t.c==='_inc').reduce((s,t)=>s+inAmt(t),0)), incNow = D.tx.filter(t=>t.d.startsWith(ym) && t.c==='_inc').reduce((s,t)=>s+inAmt(t),0);
  const incPlan = -planOcc(today, end).filter(x=>x.v<0).reduce((s,x)=>s+x.v,0), incMed = kMed(incHist);
  const inc = incNow + (incPlan || (incNow < incMed*0.5 ? incMed - incNow : 0));
  // Verlauf: kumulierte Ausgaben pro Tag, Ø der letzten Monate
  const cum = Array(dim).fill(0), HC = Object.fromEntries(hist.map(h=>[h, Array(dim).fill(0)]));
  for(const t of D.tx){ const v = kSpend(t); if(!v) continue; const ym2 = t.d.slice(0,7), day = Math.min(dim-1, +t.d.slice(8)-1);
    if(ym2===ym && day<el) cum[day] += v; else if(HC[ym2]) HC[ym2][day] += v; }
  for(let i=1;i<dim;i++){ cum[i] += cum[i-1]; for(const h of hist) HC[h][i] += HC[h][i-1]; }
  const avg = cum.map((_,i)=>Math.round(kMed(hist.map(h=>HC[h][i]))));   // typischer Monat (Median, Ausreisser wie Steuern zählen weniger)
  const line = cum.map((v,i)=>i<el?v:null), fc = cum.map((v,i)=>i<el-1?null:i===el-1?v:spent + (est-spent)*(i-el+1)/Math.max(1,dim-el));
  return {ym, el, dim, frac, spent, est, sd:Math.sqrt(varSum), inc, hasHist:hist.length>=2, rows:rows.sort((a,b)=>b.e-a.e), line, fc, avg, n:hist.length};
}); }
function cardKiMonth(){
  const f = kForecastMonth(); if(!f.hasHist) return `<div class="xcard"><div class="ah"><h3>Prognose ${MN[+f.ym.slice(5)-1]}</h3></div><p class="small muted">Für eine Prognose braucht der Assistent mindestens zwei Monate mit Buchungen.</p></div>`;
  const save = f.inc - f.est, over = f.rows.filter(r=>r.plan>0 && r.e > r.plan*1.05).sort((a,b)=>(b.e-b.plan)-(a.e-a.plan)).slice(0,4);
  const labels = f.line.map((_,i)=>String(i+1)), tips = f.line.map((_,i)=>`${i+1}. ${MN[+f.ym.slice(5)-1]}`);
  return `<div class="xcard xw"><div class="ah"><div><h3>Prognose Monatsende</h3><span class="small muted">${MN[+f.ym.slice(5)-1]} · ${f.el} von ${f.dim} Tagen · Basis ${f.n} Monate</span></div></div>
    <div class="kgrid"><div><span>Ausgaben bis heute</span><b class="num">CHF ${chf0(f.spent)}</b></div>
      <div><span>Ausgaben bis Monatsende</span><b class="num out">≈ ${chf0(f.est)}</b><em>± ${chf0(f.sd*1.28)}</em></div>
      <div><span>Einnahmen erwartet</span><b class="num in">≈ ${chf0(f.inc)}</b></div>
      <div><span>Bleibt übrig</span><b class="num ${save<0?'out':'in'}">≈ ${kS0(save)}</b></div></div>
    ${chart({label:'Ausgaben im Monat kumuliert', h:190, labels, tips, series:[{name:'Bisher', color:C_OUT, kind:'area', values:f.line},{name:'Prognose', color:C_OUT, dash:true, values:f.fc},{name:'Typischer Monat', color:'#8a96a3', dash:true, values:f.avg}]})}
    ${over.length?`<p class="small" style="margin:8px 0 4px"><b>Voraussichtlich über Budget</b></p>${over.map(r=>`<div class="krow"><span>${esc(bkName(r.c))}</span><span class="num">≈ ${chf0(r.e)} von ${chf0(r.plan)}</span><b class="num out">+${chf0(r.e-r.plan)}</b></div>`).join('')}`:'<p class="small muted" style="margin:8px 0 0">Alle Budgets halten voraussichtlich.</p>'}</div>`;
}

/* ---------- 2. Prognose 12 Monate ---------- */
function kForecastYear(){ return kCache('fy', ()=>{
  const NM = kNetMonth(), hist = kMonths(24), nets = hist.map(h=>NM[h]||0), last6 = nets.slice(-6), base = kMed(last6);
  const seas = {}; if(hist.length>=13){ const by = {}; hist.forEach((h,i)=>(by[h.slice(0,4)] ??= []).push(nets[i]));
    hist.forEach((h,i)=>{ const yr = by[h.slice(0,4)], mean = yr.reduce((s,x)=>s+x,0)/yr.length; if(yr.length>=6) seas[h.slice(5)] = Math.max(-3*Math.abs(base)-500, Math.min(3*Math.abs(base)+500, nets[i]-mean)); }); }
  const sd = kSd(last6.length>=3 ? last6 : nets);
  const start = balAccs().length ? balTotal(todayIso()) : activeAccs().filter(a=>!a.archived && (a.liquid||a.main)).reduce((s,a)=>s+accVal(a),0);
  const f = kForecastMonth(), thisRest = f.hasHist ? (f.inc - f.est) - ((NM[TODAY]||0)) : 0;
  const L = [], V = [], HI = [], LO = []; let v = start + thisRest;
  L.push('Heute'); V.push(start); HI.push(start); LO.push(start);
  for(let k=1;k<=12;k++){ const ym = ymAdd(TODAY,k); v += base + 0.5*(seas[ym.slice(5)]||0);
    L.push(MN[+ym.slice(5)-1].slice(0,3)); V.push(Math.round(v)); HI.push(Math.round(v + 1.28*sd*Math.sqrt(k))); LO.push(Math.round(v - 1.28*sd*Math.sqrt(k))); }
  return {hist:hist.length, base, sd, start, L, V, HI, LO, seas:Object.keys(seas).length>0, rate: (()=>{ const inc = hist.slice(-6).map(h=>D.tx.filter(t=>t.d.startsWith(h)&&t.c==='_inc').reduce((s,t)=>s+inAmt(t),0)).reduce((s,x)=>s+x,0); return inc ? last6.reduce((s,x)=>s+x,0)/inc*100 : null; })()};
}); }
function cardKiYear(){
  const y = kForecastYear(); if(y.hist<3) return `<div class="xcard"><div class="ah"><h3>Prognose 12 Monate</h3></div><p class="small muted">Ab drei Monaten mit Buchungen rechnet der Assistent eine Prognose für das nächste Jahr.</p></div>`;
  return `<div class="xcard xw"><div class="ah"><div><h3>Prognose 12 Monate</h3><span class="small muted">Typischer Monat ${y.base>=0?'+':'−'}${chf0(Math.abs(y.base))}${y.seas?' · mit Saison (z. B. Steuern, Ferien)':''}</span></div></div>
    <div class="kgrid"><div><span>Heute</span><b class="num">CHF ${chf0(y.start)}</b></div><div><span>In 12 Monaten</span><b class="num ${y.V.at(-1)<0?'out':''}">≈ ${chf0(y.V.at(-1))}</b><em>${chf0(y.LO.at(-1))} bis ${chf0(y.HI.at(-1))}</em></div>
      <div><span>Sparquote (6 Monate)</span><b class="num">${y.rate==null?'–':Math.round(y.rate)+' %'}</b></div><div><span>Schwankung pro Monat</span><b class="num">± ${chf0(y.sd)}</b></div></div>
    ${chart({label:'Erwarteter Stand der nächsten 12 Monate', h:210, labels:y.L, series:[{name:'Erwartet', color:C_BAL, kind:'area', values:y.V},{name:'Gut', color:C_IN, dash:true, values:y.HI},{name:'Vorsichtig', color:C_OUT, dash:true, values:y.LO}]})}
    <p class="small muted" style="margin:6px 0 0">Gerechnet aus deinem Monatsergebnis der letzten ${Math.min(6,y.hist)} Monate${y.seas?' und dem Verlauf im Vorjahr':''}. In 8 von 10 Fällen liegt der Stand zwischen «Vorsichtig» und «Gut».</p></div>`;
}

/* ---------- 3. Kaufverhalten ---------- */
function kBehaviour(){ return kCache('bh', ()=>{
  const today = todayIso(), since = dAdd(today,-180), l = D.tx.filter(t=>t.d>=since && t.d<=today && kSpend(t)>0), vari = l.filter(t=>!['fix','schulden','spar'].includes(D.cats.find(c=>c.id===t.c)?.group));
  const wd = Array(7).fill(0), wdN = Array(7).fill(0);
  for(let d=since; d<=today; d=dAdd(d,1)) wdN[(new Date(d+'T12:00').getDay()+6)%7]++;
  for(const t of vari) wd[(new Date(t.d+'T12:00').getDay()+6)%7] += kSpend(t);
  const wdAvg = wd.map((v,i)=>v/Math.max(1,wdN[i])), months = Math.max(1, dDiff(since,today)/30.4);
  const small = vari.filter(t=>kSpend(t)<20), thirds = [0,0,0]; for(const t of vari){ const d = +t.d.slice(8); thirds[d<=10?0:d<=20?1:2] += kSpend(t); }
  const tot = thirds.reduce((s,x)=>s+x,0)||1, weekend = (wd[5]+wd[6]) / (wd.reduce((s,x)=>s+x,0)||1);
  // Händler (90 Tage)
  const s90 = dAdd(today,-90), mer = new Map();
  for(const t of vari){ if(t.d<s90) continue; const k = kMer(t); if(!k || k.length<3) continue; const o = mer.get(k) || {k, n:0, s:0, c:t.c}; o.n++; o.s += kSpend(t); mer.set(k,o); }
  const merchants = [...mer.values()].sort((a,b)=>b.s-a.s).slice(0,8);
  // Trends: letzte 3 Monate gegen die 3 davor
  const H = kMonths(6), CM = kCatMonth(), a3 = H.slice(-3), b3 = H.slice(-6,-3), trends = [];
  if(b3.length===3) for(const c of D.cats){ if(c.group==='spar' || c.acc) continue; const A = a3.reduce((s,h)=>s+(CM[h]?.[c.id]||0),0)/3, B = b3.reduce((s,h)=>s+(CM[h]?.[c.id]||0),0)/3;
    if(Math.abs(A-B)>=20 && (B===0 || Math.abs(A-B)/B>=0.15)) trends.push({c:c.id, A, B, d:A-B}); }
  // Preiserhöhungen bei wiederkehrenden Zahlungen
  const s365 = dAdd(today,-365), rec = new Map();
  for(const t of D.tx){ if(t.d<s365 || !kSpend(t)) continue; const k = kMer(t); if(!k || k.length<3) continue; (rec.get(k) || rec.set(k,[]).get(k)).push({d:t.d, v:kSpend(t), c:t.c}); }
  const ups = [];
  for(const [k, xs] of rec){ const ms = new Set(xs.map(x=>x.d.slice(0,7))); if(ms.size<4 || xs.length>ms.size+2) continue; xs.sort((a,b)=>a.d.localeCompare(b.d));
    const last = xs.at(-1), before = kMed(xs.slice(0,-1).map(x=>x.v)); if(before>=3 && last.v > before*1.05 && last.v-before>=1 && kSd(xs.slice(0,-1).map(x=>x.v)) < before*0.1) ups.push({k:bkName(last.c)+' · '+niceName(k.replace(/^\(.*?\)\s*/,'')), before, now:last.v, d:last.d}); }
  // Muss / Brauch / Will
  const mbw = {muss:0, brauch:0, will:0}; for(const t of D.tx){ if(t.d<dAdd(today,-90) || !kSpend(t) || t.c==='_offen') continue; mbw[needOf(t)] += kSpend(t); }
  return {wdAvg, small:{n:small.length/months, s:small.reduce((s,t)=>s+kSpend(t),0)/months}, thirds:thirds.map(x=>x/tot), weekend, merchants, trends:trends.sort((a,b)=>b.d-a.d), ups:ups.sort((a,b)=>(b.now-b.before)-(a.now-a.before)).slice(0,6), mbw, n:vari.length};
}); }
function cardKiBehaviour(){
  const b = kBehaviour(); if(b.n<20) return `<div class="xcard"><div class="ah"><h3>Dein Kaufverhalten</h3></div><p class="small muted">Sobald etwa 20 Ausgaben aus den letzten Monaten da sind, zeigt der Assistent hier dein Kaufverhalten.</p></div>`;
  const WD = ['Mo','Di','Mi','Do','Fr','Sa','So'], top = b.wdAvg.indexOf(Math.max(...b.wdAvg)), tm = b.mbw.muss+b.mbw.brauch+b.mbw.will||1;
  const up = b.trends.filter(x=>x.d>0).slice(0,4), dn = b.trends.filter(x=>x.d<0).sort((a,b)=>a.d-b.d).slice(0,3);
  return `<div class="xcard xw"><div class="ah"><div><h3>Dein Kaufverhalten</h3><span class="small muted">Variable Ausgaben der letzten 6 Monate</span></div></div>
    <div class="kgrid"><div><span>Teuerster Tag</span><b>${['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'][top]}</b><em>Ø CHF ${chf0(b.wdAvg[top])}</em></div>
      <div><span>Wochenende</span><b class="num">${Math.round(b.weekend*100)} %</b><em>der variablen Ausgaben</em></div>
      <div><span>Kleinbeträge unter 20</span><b class="num">${Math.round(b.small.n)}× / Mt.</b><em>zusammen CHF ${chf0(b.small.s)}</em></div>
      <div><span>Monatsanfang (1.–10.)</span><b class="num">${Math.round(b.thirds[0]*100)} %</b><em>Mitte ${Math.round(b.thirds[1]*100)} % · Ende ${Math.round(b.thirds[2]*100)} %</em></div></div>
    ${chart({label:'Ausgaben pro Wochentag', h:160, labels:WD, tips:WD, series:[{name:'Ø pro Tag', color:C_BAL, kind:'bar', values:b.wdAvg.map(v=>Math.round(v))}]})}
    <p class="small" style="margin:10px 0 4px"><b>Muss · Brauch · Will</b> <span class="muted">(90 Tage)</span></p>
    <div class="kbar">${['muss','brauch','will'].map(k=>`<i style="width:${b.mbw[k]/tm*100}%;background:${MBW[k].c}"></i>`).join('')}</div>
    <div class="row small muted" style="gap:14px;margin-top:4px">${['muss','brauch','will'].map(k=>`<span><i class="kdot" style="background:${MBW[k].c}"></i>${MBW[k].n} ${Math.round(b.mbw[k]/tm*100)} %</span>`).join('')}</div></div>
    <div class="xcard"><div class="ah"><h3>Was sich verändert</h3><span class="small muted">3 Monate vs. 3 davor</span></div>
      ${up.map(x=>`<div class="krow"><span>${esc(bkName(x.c))}</span><span class="num muted">${chf0(x.B)} → ${chf0(x.A)}</span><b class="num out">+${chf0(x.d)}</b></div>`).join('')}
      ${dn.map(x=>`<div class="krow"><span>${esc(bkName(x.c))}</span><span class="num muted">${chf0(x.B)} → ${chf0(x.A)}</span><b class="num in">−${chf0(-x.d)}</b></div>`).join('')}
      ${!up.length&&!dn.length?'<p class="small muted">Deine Ausgaben pro Kategorie sind stabil.</p>':''}
      ${b.ups.length?`<p class="small" style="margin:10px 0 4px"><b>Preiserhöhungen erkannt</b></p>${b.ups.map(x=>`<div class="krow"><span>${esc(x.k)}</span><span class="num muted">${chf(x.before)} → ${chf(x.now)}</span><b class="num out">+${kPct(x.now,x.before)} %</b></div>`).join('')}`:''}</div>
    <div class="xcard"><div class="ah"><h3>Wo du am meisten kaufst</h3><span class="small muted">90 Tage</span></div>
      ${b.merchants.map(m=>`<div class="krow"><span>${esc(niceName(m.k))}<em>${m.n}× · Ø ${chf(m.s/m.n)}</em></span><b class="num">${chf0(m.s)}</b></div>`).join('')||'<p class="small muted">Noch keine Händler erkannt.</p>'}</div>`;
}

/* ---------- 4. Spartipps ---------- */
function kTips(){
  const b = kBehaviour(), f = kForecastMonth(), y = kForecastYear(), out = [];
  for(const x of b.trends.filter(x=>x.d>=30 && x.B>0).slice(0,3)) out.push({lvl:'warn', t:`${bkName(x.c)} ist um CHF ${chf0(x.d)} pro Monat gestiegen`, s:`Zurück auf CHF ${chf0(x.B)} spart dir CHF ${chf0(x.d*12)} im Jahr.`});
  if(b.small.s>=80) out.push({lvl:'info', t:`Kleinbeträge: CHF ${chf0(b.small.s)} pro Monat`, s:`${Math.round(b.small.n)} Käufe unter CHF 20. Mit der Hälfte davon sparst du CHF ${chf0(b.small.s*6)} im Jahr.`});
  const tm = b.mbw.muss+b.mbw.brauch+b.mbw.will; if(tm && b.mbw.will/tm>0.3) out.push({lvl:'warn', t:`${Math.round(b.mbw.will/tm*100)} % deiner Ausgaben sind «Will»`, s:'Empfohlen sind höchstens 30 % (Regel 50/30/20).'});
  for(const u of b.ups.slice(0,2)) out.push({lvl:'warn', t:`${u.k} ist teurer geworden`, s:`Neu CHF ${chf(u.now)} statt ${chf(u.before)} – lohnt sich ein Wechsel oder eine Kündigung?`});
  const abo = (D.plans||[]).filter(p=>!p.off && p.type!=='in' && (p.freq||'M')==='M' && Math.abs(p.amount)<100).reduce((s,p)=>s+Math.abs(p.amount),0) + (D.abos||[]).filter(a=>a.active!==false).reduce((s,a)=>s+(a.interval==='J'?a.price/12:a.price),0);
  if(abo>=50) out.push({lvl:'info', t:`Abos und kleine Daueraufträge: CHF ${chf0(abo)} pro Monat`, s:`Das sind CHF ${chf0(abo*12)} im Jahr. Prüfe einmal, was du wirklich nutzt.`});
  if(f.hasHist && f.inc>0 && f.inc-f.est<0) out.push({lvl:'bad', t:'Dieser Monat geht voraussichtlich ins Minus', s:`Ausgaben ≈ ${chf0(f.est)}, Einnahmen ≈ ${chf0(f.inc)}. Noch ${f.dim-f.el} Tage zum Gegensteuern.`});
  if(y.hist>=3 && y.rate!=null && y.rate<10) out.push({lvl:'warn', t:`Sparquote nur ${Math.round(y.rate)} %`, s:'Ziel sind 10–20 % des Einkommens. Ein Dauerauftrag aufs Sparkonto direkt nach dem Lohn hilft.'});
  if(y.hist>=3 && y.rate!=null && y.rate>=20) out.push({lvl:'ok', t:`Stark: Sparquote ${Math.round(y.rate)} %`, s:'Du sparst mehr als die empfohlenen 20 %.'});
  if(b.weekend>0.45) out.push({lvl:'info', t:`${Math.round(b.weekend*100)} % gibst du am Wochenende aus`, s:'Ein fester Wochenend-Betrag (z. B. in bar) macht das planbar.'});
  return out;
}
function cardKiTips(){ const T = kTips();
  return `<div class="xcard"><div class="ah"><h3>Spartipps</h3><span class="small muted">aus deinen Zahlen</span></div>
    ${T.map(x=>`<div class="ktip ${x.lvl}"><i></i><span><b>${esc(x.t)}</b><br><span class="small muted">${esc(x.s)}</span></span></div>`).join('')||'<p class="small muted">Keine Auffälligkeiten – weiter so.</p>'}</div>`; }

/* ---------- 5. KI-Zuordnung (lernt aus deinen Buchungen, naiver Bayes-Klassifikator) ---------- */
var kTok = t => [...new Set(bkNorm((t.n||'')+' '+(t.wc||'')).split(' ').filter(w=>w.length>=3 && !/^\d+$/.test(w) && !/^(chf|eur|usd|twint|karte|kauf|kauf dienstleistung|dienstleistung|dienstleistungen|digital|goods|zahlung|datum|esr|lastschrift|gutschrift|belastung|einkauf|debit|card|kartennummer|xxxx|nr|und|der|die|das|fur|von|mit|ch)$/.test(w)))];
function kModel(){ return kCache('nb', ()=>{
  const cls = {}, vocab = new Set(); let N = 0;
  for(const t of D.tx.slice(-4000)){ if(!t.c || t.c==='_offen') continue; const w = kTok(t); if(!w.length) continue;
    const o = cls[t.c] ??= {n:0, w:{}, tot:0}; o.n++; N++; for(const x of w){ o.w[x] = (o.w[x]||0)+1; o.tot++; vocab.add(x); } }
  return {cls, N, V:vocab.size||1};
}); }
var kLvl = p => p>=0.5 ? ['sicher','hi'] : p>=0.3 ? ['wahrscheinlich',''] : ['unsicher','lo'];
var kPredict = function(t){
  const M = kModel(), w = kTok(t); if(!w.length || M.N<20) return null; const sc = [];
  for(const [c,o] of Object.entries(M.cls)){ let s = Math.log(o.n/M.N), hit = 0; for(const x of w){ const k = o.w[x]||0; if(k) hit++; s += Math.log((k+0.5)/(o.tot+0.5*M.V)); } sc.push({c, s, hit}); }
  sc.sort((a,b)=>b.s-a.s); if(!sc[0].hit) return null; const T = Math.max(1, w.length), mx = sc[0].s, z = sc.reduce((s,x)=>s+Math.exp((x.s-mx)/T),0);
  return {c:sc[0].c, p:(1/z) * (sc[0].hit/w.length)};   // vorsichtig: unbekannte Wörter senken die Sicherheit
}
function cardKiCats(){
  const open = D.tx.filter(t=>t.c==='_offen'); if(!open.length) return '';
  const P = open.map(t=>({t, r:kPredict(t)})).filter(x=>x.r).sort((a,b)=>b.r.p-a.r.p), sure = P.filter(x=>x.r.p>=0.5).length;
  S.kiCats = P;
  return `<div class="xcard"><div class="ah"><div><h3>KI-Zuordnung</h3><span class="small muted">${open.length} ohne Kategorie · ${P.length} Vorschläge</span></div>${sure?`<button class="btn sm pri" data-act="kicatall">${sure} sichere übernehmen</button>`:''}</div>
    ${P.slice(0,12).map((x,i)=>`<div class="krow"><span>${esc(niceName(x.t.n||'Ohne Text'))}<em>${dShort(x.t.d)} · CHF ${chf(Math.abs(sv(x.t)))}</em></span><span class="kpill ${kLvl(x.r.p)[1]}">${esc(bkName(x.r.c))} · ${kLvl(x.r.p)[0]}</span><button class="ibtn" data-act="kicat" data-i="${i}" aria-label="Übernehmen">✓</button></div>`).join('')||'<p class="small muted">Für diese Buchungen hat der Assistent noch nichts Passendes gelernt.</p>'}</div>`;
}

/* ---------- 6. Frag die App ---------- */
var K_MON = ['januar','februar','marz','april','mai','juni','juli','august','september','oktober','november','dezember'];
function kAsk(q){
  const s = ' '+bkNorm(q).replace(/\bmaerz\b/g,'marz')+' ', today = todayIso(); let from, to, pl;
  const yr = s.match(/\b(20\d\d)\b/)?.[1], mi = K_MON.findIndex(m=>s.includes(' '+m+' ') || s.includes(' '+m.slice(0,3)+' '));
  const nd = s.match(/letzten (\d+) (tage|tagen|wochen|monate|monaten)/);
  if(nd){ const n = +nd[1], u = nd[2][0]; from = u==='t' ? dAdd(today,-n+1) : u==='w' ? dAdd(today,-7*n+1) : ymAdd(TODAY,-n+1)+'-01'; to = today; pl = `in den letzten ${n} ${nd[2]}`; }
  else if(mi>=0){ let y = yr || TODAY.slice(0,4), ym = y+'-'+String(mi+1).padStart(2,'0'); if(!yr && ym>TODAY) ym = (+y-1)+ym.slice(4); from = ym+'-01'; to = mEnd(ym); pl = 'im '+ymLabel(ym); }
  else if(yr){ from = yr+'-01-01'; to = yr+'-12-31'; pl = 'im Jahr '+yr; }
  else if(/ letzten monat | vormonat | letzter monat /.test(s)){ const ym = ymAdd(TODAY,-1); from = ym+'-01'; to = mEnd(ym); pl = 'im '+ymLabel(ym); }
  else if(/ letzte woche | letzter woche /.test(s)){ const w = dAdd(weekStart(today),-7); from = w; to = dAdd(w,6); pl = 'letzte Woche'; }
  else if(/ diese woche | dieser woche /.test(s)){ from = weekStart(today); to = today; pl = 'diese Woche'; }
  else if(/ heute /.test(s)){ from = to = today; pl = 'heute'; }
  else if(/ gestern /.test(s)){ from = to = dAdd(today,-1); pl = 'gestern'; }
  else if(/ (dieses|diesem|im) jahr /.test(s)){ from = TODAY.slice(0,4)+'-01-01'; to = today; pl = 'dieses Jahr'; }
  else if(/ (insgesamt|total|jemals|immer) /.test(s)){ from = '2000-01-01'; to = today; pl = 'insgesamt'; }
  else { from = TODAY+'-01'; to = today; pl = 'diesen Monat'; }
  // Kategorie oder Händler
  let cat = null, best = 0;
  for(const c of D.cats){ const n = bkNorm(c.name); if(n.length>=3 && s.includes(' '+n) && n.length>best){ cat = c.id; best = n.length; } }
  if(!cat){ for(const c of D.cats){ const n = bkNorm(c.name).split(' ')[0]; if(n.length>=4 && s.includes(' '+n.slice(0,Math.max(4,n.length-2))) && n.length>best){ cat = c.id; best = n.length; } } }
  const income = / (eingenommen|einnahmen|einkommen|verdient|lohn|gehalt) /.test(s);
  let mer = null; if(!cat && !income){ const m = s.match(/ (?:bei|im|in der|fur|an) ([a-z0-9][a-z0-9 ]{2,24}?) (?:ausgegeben|bezahlt|gekauft|gelassen|im|in|diesen|letzten|dieses|seit|$)/) || s.match(/ (?:bei|fur) ([a-z0-9]{3,}) /);
    if(m){ const w = m[1].trim(); if(!K_MON.includes(w) && !/^(monat|jahr|woche|essen)$/.test(w)) mer = w; } }
  const L = D.tx.filter(t=>t.d>=from && t.d<=to && !isTr(t) && (income ? t.c==='_inc' : t.c!=='_inc') && (!cat || t.c===cat) && (!mer || bkNorm((t.n||'')+' '+(t.wc||'')).includes(mer))).sort((a,b)=>b.d.localeCompare(a.d));
  const sum = L.reduce((s2,t)=>s2+(income?inAmt(t):outAmt(t)),0), what = cat ? `für ${bkName(cat)}` : mer ? `bei ${niceName(mer)}` : '';
  let ans;
  if(/ (prognose|monatsende|ende monat|reicht|wie viel bleibt|bleibt mir) /.test(s)){ const f = kForecastMonth(); ans = f.hasHist ? `Bis Ende ${MN[+TODAY.slice(5)-1]} gibst du voraussichtlich <b>CHF ${chf0(f.est)}</b> aus (bisher ${chf0(f.spent)}). Bei Einnahmen von etwa CHF ${chf0(f.inc)} bleiben <b>CHF ${kS0(f.inc-f.est)}</b>.` : 'Für eine Prognose fehlen noch Buchungen aus früheren Monaten.'; return {ans, L:[]}; }
  if(/ (gespart|sparen|ubrig|uebrig|cashflow|saldo) /.test(s)){ const l2 = D.tx.filter(t=>t.d>=from && t.d<=to && !isTr(t)); const net = l2.reduce((a,t)=>a+inAmt(t)-outAmt(t),0); return {ans:`${pl[0].toUpperCase()+pl.slice(1)} hast du netto <b>CHF ${kS0(net)}</b> ${net>=0?'gespart':'mehr ausgegeben als eingenommen'}.`, L:[]}; }
  if(/ (wie oft|wie viele mal|wievielmal|anzahl) /.test(s)) ans = `${pl[0].toUpperCase()+pl.slice(1)} ${L.length===1?'gab es':'gab es'} <b>${L.length} Buchung${L.length===1?'':'en'}</b> ${what}${L.length?` (zusammen CHF ${chf(sum)})`:''}.`;
  else if(/ (teuerste|grosste|hochste|groesste|hoechste|meiste) /.test(s) && L.length){ const m = [...L].sort((a,b)=>outAmt(b)+inAmt(b)-outAmt(a)-inAmt(a))[0]; ans = `Die grösste Buchung ${what} ${pl}: <b>CHF ${chf(Math.abs(sv(m)))}</b> am ${dShort(m.d)} (${esc(niceName(m.n||bkName(m.c)).slice(0,40))}).`; return {ans, L:[m]}; }
  else if(/ (durchschnitt|schnitt|pro monat|monatlich) /.test(s)){ const n = Math.max(1, Math.round(dDiff(from,to)/30.4)); ans = `${income?'Eingenommen':'Ausgegeben'} ${what} ${pl}: CHF ${chf(sum)} – das sind <b>Ø CHF ${chf(sum/n)} pro Monat</b>.`; }
  else ans = L.length ? `${pl[0].toUpperCase()+pl.slice(1)} hast du ${what} <b>CHF ${chf(sum)}</b> ${income?'eingenommen':'ausgegeben'} (${L.length} Buchung${L.length===1?'':'en'}).` : `${pl[0].toUpperCase()+pl.slice(1)} habe ich ${what||'dazu'} keine Buchungen gefunden.`;
  return {ans, L:L.slice(0,8)};
}
function cardKiAsk(){
  const r = S.kiQ ? kAsk(S.kiQ) : null, ex = ['Wie viel habe ich diesen Monat für Restaurant ausgegeben?','Wie viel bleibt bis Monatsende?','Wie oft war ich letzten Monat bei Migros?','Wie viel habe ich dieses Jahr gespart?','Durchschnitt Lebensmittel letzten 6 Monate'];
  return `<div class="xcard xw kask"><div class="ah"><div><h3>Frag die App</h3><span class="small muted">Antwortet aus deinen eigenen Buchungen – nichts verlässt das Gerät</span></div></div>
    <form id="kiaskf" class="row"><input class="in" id="kiq" value="${esc(S.kiQ||'')}" placeholder="z. B. Wie viel für Restaurant im Oktober?" style="flex:1" autocomplete="off"><button class="btn pri">Fragen</button></form>
    ${r?`<p class="kans">${r.ans}</p>${r.L.map(bkTxRow).join('')}`:`<div class="kex">${ex.map(x=>`<button data-kiq="${esc(x)}">${esc(x)}</button>`).join('')}</div>`}</div>`;
}

/* ---------- Seite «Finanz-Assistent» ---------- */
function vAssistent(){
  return `<p class="sub">Dein persönlicher Assistent rechnet direkt auf dem Gerät mit deinen Buchungen: Prognosen, Muster und Tipps. Es werden keine Daten an eine KI im Internet geschickt.</p>
    <div class="agrid">${cardKiAsk()}${cardKiMonth()}${cardKiTips()}${cardKiCats()}${cardKiYear()}${cardKiBehaviour()}</div>`;
}
// Startseite: kurzer Blick
function cardKiTeaser(){
  const f = kForecastMonth(); if(!f.hasHist) return ''; const t = kTips()[0], save = f.inc - f.est;
  return `<div class="xcard kteaser" data-go="assistent"><div class="ah"><h3>${ci('<path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>')} Assistent</h3><span class="small muted">›</span></div>
    <p class="small" style="margin:0">Bis Monatsende voraussichtlich <b class="num">CHF ${chf0(f.est)}</b> Ausgaben · bleibt <b class="num ${save<0?'out':'in'}">${kS0(save)}</b></p>
    ${t?`<p class="small muted" style="margin:6px 0 0">${esc(t.t)}</p>`:''}</div>`;
}

/* ---------- Labels pro Buchung ---------- */
var kTags = s => [...new Set(String(s||'').split(/[,;#]/).map(x=>x.trim().toLowerCase().replace(/\s+/g,'-')).filter(Boolean))].slice(0,8);
function allTags(){ const m = {}; for(const t of D.tx) for(const g of t.tags||[]) (m[g] ??= []).push(t); return m; }
var _txDialog1140 = txDialog;
txDialog = function(t, preset={}, onDone){
  _txDialog1140(t, preset, x=>{ const el = $('#ftags'); if(el){ const g = kTags(el.value); if(g.length) x.tags = g; else delete x.tags; } onDone?.(x); });
  const body = $('#dlgbody'), act = body?.querySelector('.acts'); if(!act) return;
  const known = Object.keys(allTags()).slice(0,12), cur = (t?.tags||[]).join(', ');
  act.insertAdjacentHTML('beforebegin', `<label class="f">Labels <span class="muted">(mit Komma, z. B. ferien-2026, geschenk)</span><input id="ftags" value="${esc(cur)}" autocomplete="off"></label>
    ${known.length?`<div class="tagpick">${known.map(g=>`<button type="button" data-tagadd="${esc(g)}">#${esc(g)}</button>`).join('')}</div>`:''}
    ${t && !isTr(t) && t.c!=='_inc' && sv(t)<0 && !t.sp ? `<p class="small" style="margin:4px 0 0"><a class="link" data-act="splittx" data-id="${t.id}">${t.spl?'Aufteilung ändern':'Auf mehrere Kategorien aufteilen'}</a></p>`:''}
    ${t?.sp ? `<p class="small muted" style="margin:4px 0 0">Teil einer aufgeteilten Buchung · <a class="link" data-act="splittx" data-id="${t.sp}">Aufteilung bearbeiten</a></p>`:''}`);
};
document.addEventListener('click', e=>{ const b = e.target.closest('[data-tagadd]'); if(!b) return; e.preventDefault(); const el = $('#ftags'); if(!el) return;
  const g = kTags(el.value); if(!g.includes(b.dataset.tagadd)) g.push(b.dataset.tagadd); el.value = g.join(', '); }, true);
var _bkTxRow1140 = bkTxRow;
bkTxRow = function(t){
  const h = _bkTxRow1140(t), x = (t.tags||[]).map(g=>`<em class="tg">#${esc(g)}</em>`).join('') + (t.spl||t.sp ? '<em class="tg sp">geteilt</em>' : '');
  return x ? h.replace(/(<div class="wmid">[\s\S]*?)(<\/div>\s*<div class="wend">)/, `$1<span class="tgs">${x}</span>$2`) : h;
};
function vLabels(){
  const T = allTags(), keys = Object.keys(T).sort((a,b)=>T[b].length-T[a].length), sel = S.lab && T[S.lab] ? S.lab : null;
  if(sel){ const L = [...T[sel]].sort((a,b)=>b.d.localeCompare(a.d)), out = L.reduce((s,t)=>s+outAmt(t),0), inc = L.reduce((s,t)=>s+inAmt(t),0), days = {}; L.forEach(t=>(days[t.d] ??= []).push(t));
    return `<p class="small"><a class="link" data-act="labback">‹ Alle Labels</a></p><h2 style="margin:4px 0 10px">#${esc(sel)}</h2>
      <div class="wsum"><div><span>Ausgaben</span><b class="num out">−${chf(out)}</b></div><div><span>Einnahmen</span><b class="num in">+${chf(inc)}</b></div><div><span>Buchungen</span><b class="num">${L.length}</b></div></div>
      ${Object.entries(days).map(([d,l])=>`<div class="wday"><div class="wdayh"><span>${dayLabel(d)}</span></div>${l.map(bkTxRow).join('')}</div>`).join('')}`; }
  return `<p class="sub">Labels fassen Buchungen über Kategorien hinweg zusammen – z. B. alles für die Ferien 2026, ein Projekt oder Geschenke. Label setzen: Buchung antippen → «Labels».</p>
    <div class="xcard">${keys.map(k=>{ const o = T[k].reduce((s,t)=>s+outAmt(t),0); return `<div class="wrow" data-act="labopen" data-k="${esc(k)}"><span class="wic" style="background:var(--acc)">${ci(CI.tag)}</span><div class="wmid"><b>#${esc(k)}</b><span>${T[k].length} Buchungen</span></div><div class="wend"><b class="num out">−${chf(o)}</b></div></div>`; }).join('')||'<p class="small muted">Noch keine Labels.</p>'}</div>`;
}

/* ---------- Buchung aufteilen ---------- */
function splitUndo(p){
  const kids = D.tx.filter(x=>x.sp===p.id); for(const k of kids){ if(p.imp) p.sa = r2(p.sa + k.sa); else p.a = r2(p.a + k.a); markDel(k.id); }
  D.tx = D.tx.filter(x=>x.sp!==p.id); delete p.spl;
}
function splitDialog(id){
  const p = D.tx.find(x=>x.id===id); if(!p) return; const kids = D.tx.filter(x=>x.sp===p.id);
  const total = r2(Math.abs(sv(p)) + kids.reduce((s,k)=>s+Math.abs(sv(k)),0)), rows = kids.map(k=>({c:k.c, a:Math.abs(sv(k))}));
  if(!rows.length) rows.push({c:'', a:''});
  const rowH = (r,i) => `<div class="splr"><select class="in" data-sc="${i}"><option value="">– Kategorie –</option>${catOptions(r.c).replace(/<option value="_inc"[^>]*>[^<]*<\/option>/,'')}</select><input class="in" data-sa="${i}" inputmode="decimal" value="${r.a===''?'':chf(r.a)}" placeholder="Betrag"></div>`;
  dialog(`<h3>Buchung aufteilen</h3><p class="small muted" style="margin-top:-6px">${esc(niceName(p.n||bkName(p.c)))} · ${dShort(p.d)} · total CHF ${chf(total)}</p>
    <div class="splr main"><span>${esc(bkName(p.c))}</span><b class="num" id="splrest">CHF ${chf(total - rows.reduce((s,r)=>s+(+r.a||0),0))}</b></div>
    <div id="splrows">${rows.map(rowH).join('')}</div>
    <p class="small"><a class="link" data-dlg="add">+ Weitere Kategorie</a></p><p class="small neg" id="splerr"></p>
    <div class="acts">${kids.length?'<button class="btn danger" data-dlg="undo">Aufteilung aufheben</button><span class="sp"></span>':''}<button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Speichern</button></div>`,
  k=>{
    const read = () => [...document.querySelectorAll('#splrows .splr')].map(r=>({c:r.querySelector('select').value, a:parseNum(r.querySelector('input').value)}));
    if(k==='add'){ const L = read(); $('#splrows').insertAdjacentHTML('beforeend', rowH({c:'',a:''}, L.length)); return false; }
    if(k==='undo'){ splitUndo(p); calc(); return; }
    const L = read().filter(r=>r.c && r.a>0), sum = L.reduce((s,r)=>s+r.a,0);
    if(!L.length){ $('#splerr').textContent = 'Mindestens eine Kategorie mit Betrag angeben.'; return false; }
    if(sum >= total-0.004){ $('#splerr').textContent = `Die Teile (CHF ${chf(sum)}) müssen kleiner sein als das Total (CHF ${chf(total)}).`; return false; }
    splitUndo(p);
    L.forEach((r,i)=>{ const a = r2(r.a), kid = {...p, id:p.id+'_s'+(i+1)+uid().slice(0,3), c:r.c, sp:p.id}; delete kid.spl; delete kid.rcpt;
      if(p.imp){ kid.sa = -a; kid.a = a; p.sa = r2(p.sa + a); } else { kid.a = a; p.a = r2(p.a - a); } D.tx.push(kid); });
    p.spl = 1; calc();
  });
}
document.addEventListener('input', e=>{ if(!e.target.closest?.('#splrows')) return; const tot = +String($('#dlgbody p.small.muted')?.textContent.match(/total CHF ([\d'.,]+)/)?.[1]||'0').replace(/'/g,'');
  const s = [...document.querySelectorAll('#splrows input')].reduce((a,i)=>a+(parseNum(i.value)||0),0); const el = $('#splrest'); if(el) el.textContent = 'CHF '+chf(tot - s); });

/* ---------- Konto: Farbe & Symbol ---------- */
var LOOK_IC = {bank:AI.bank, pig:AI.pig, card:AI.card, cash:AI.cash, shield:AI.shield, invest:AI.invest, home:CI.home, car:CI.car, plane:CI.plane, gift:CI.gift, heart:CI.heart, cart:CI.cart, bag:CI.bag, phone:CI.phone};
var LOOK_COL = ['#5bc236','#2e7d32','#0d47a1','#2a78d6','#26c6da','#16a085','#8e44ad','#e87ba4','#e74c3c','#c0392b','#f39c12','#d35400','#795548','#2c3e50','#9e9e9e'];
var _accIcon1140 = accIcon;
accIcon = function(a){ return a?.icon && LOOK_IC[a.icon] ? LOOK_IC[a.icon] : _accIcon1140(a); };
function lookDialog(id){
  const a = D.accounts.find(x=>x.id===id); if(!a) return; let col = a.color || wAccColor(a), ic = a.icon || '';
  dialog(`<h3>${esc(a.name)} – Aussehen</h3><label class="f">Name<input id="lkn" value="${esc(a.name)}"></label>
    <p class="small muted" style="margin:8px 0 4px">Farbe</p><div class="lkcol">${LOOK_COL.map(c=>`<button type="button" data-dlg="c:${c}" class="${c===col?'on':''}" style="background:${c}" aria-label="Farbe ${c}"></button>`).join('')}</div>
    <p class="small muted" style="margin:12px 0 4px">Symbol</p><div class="lkic"><button type="button" data-dlg="i:" class="${ic?'':'on'}">Auto</button>${Object.entries(LOOK_IC).map(([k,v])=>`<button type="button" data-dlg="i:${k}" class="${k===ic?'on':''}">${ci(v)}</button>`).join('')}</div>
    <label class="f mt">Kontoart<select id="lkt">${W_TYPES.map(([k,l])=>`<option value="${k}" ${(a.wtype||wTypeOf('',a.name))===k?'selected':''}>${l}</option>`).join('')}</select></label>
    ${chk('lks', !a.nostats, 'Zählt in Statistik und Summen')}${acts(true)}`,
  k=>{ if(k.startsWith('c:')){ col = k.slice(2); document.querySelectorAll('.lkcol button').forEach(b=>b.classList.toggle('on', b.dataset.dlg===k)); return false; }
    if(k.startsWith('i:')){ ic = k.slice(2); document.querySelectorAll('.lkic button').forEach(b=>b.classList.toggle('on', b.dataset.dlg===k)); return false; }
    if(!val('lkn').trim()) return false; a.name = val('lkn').trim(); a.color = col; if(ic) a.icon = ic; else delete a.icon; a.wtype = val('lkt');
    if($('#lks').checked) delete a.nostats; else a.nostats = true; });
}
var _balDialog1140 = balDialog;
balDialog = function(id){ _balDialog1140(id); $('#dlgbody h3')?.insertAdjacentHTML('afterend', `<p class="small" style="margin:-4px 0 8px"><a class="link" data-act="acclook" data-id="${id}">Name, Farbe & Symbol ändern</a></p>`); };

/* ---------- Mitteilungen aufs Handy (eigenes Android-Plugin, ohne Fremdbibliothek) ---------- */
var notifyPlug = () => { if(!NATIVE) return null; if(PLUG.Notify) return PLUG.Notify; const C = window.Capacitor||{};
  PLUG.Notify = C.Plugins?.Notify || {enable:o=>C.nativePromise('Notify','enable',o||{}), schedule:o=>C.nativePromise('Notify','schedule',o)}; return PLUG.Notify; };
function notifyItems(){
  const out = [], today = todayIso(), det = !!D.settings.notifyDetail, at = (d, h=8) => new Date(d+'T'+String(h).padStart(2,'0')+':00:00').getTime();
  const add = (d, title, text, gen) => { const ms = at(d); if(ms > Date.now()+60000) out.push({id:1000+out.length, at:ms, title:det?title:'Finanzen', text:det?text:gen}); };
  for(const b of D.bills||[]) if(b.status==='offen' && b.due && b.due>=today && b.due<=dAdd(today,21)){ add(dAdd(b.due,-2), 'Rechnung bald fällig', `${b.creditor}: CHF ${chf(b.amount)} am ${dShort(b.due)}`, 'Eine Rechnung ist in 2 Tagen fällig.'); add(b.due, 'Rechnung heute fällig', `${b.creditor}: CHF ${chf(b.amount)}`, 'Heute ist eine Rechnung fällig.'); }
  for(const x of planOcc(today, dAdd(today,21))) if(x.v>0) add(x.d, 'Heute geplant', `${x.n}: CHF ${chf(x.v)}`, 'Heute ist eine Zahlung geplant.');
  const nm = ymAdd(TODAY,1)+'-01'; add(nm, 'Neuer Monat', `Schau dir an, wie ${MN[+TODAY.slice(5)-1]} gelaufen ist.`, 'Ein neuer Monat beginnt – Zeit für den Monatsrückblick.');
  try{ const f = kForecastMonth(); if(f.hasHist && f.inc - f.est < 0 && f.el < f.dim-3){ add(dAdd(today,1), 'Achtung Monatsbudget', `Voraussichtlich ${signChf(Math.round(f.inc-f.est))} am Monatsende.`, 'Dein Monat geht voraussichtlich ins Minus.'); } }catch(e){}
  return out.sort((a,b)=>a.at-b.at).slice(0,40);
}
var _nT;
function notifySync(){ clearTimeout(_nT); _nT = setTimeout(()=>{ const p = notifyPlug(); if(!p || !D || S.locked) return;
  const items = D.settings.notify ? notifyItems() : []; p.schedule({items}).catch(()=>{}); }, 1500); }
async function notifyToggle(on){
  if(on){ const p = notifyPlug(); if(!p){ toastMsg('Mitteilungen gibt es in der Android-App.'); return; }
    try{ const r = await p.enable({}); if(!r?.granted){ toastMsg('Mitteilungen sind in Android nicht erlaubt.'); return; } }catch(e){ toastMsg('Mitteilungen: '+(e.message||e)); return; } }
  D.settings.notify = on; save(); notifySync(); toastMsg(on?'Mitteilungen eingeschaltet':'Mitteilungen ausgeschaltet'); render();
}
var _bellDialog1140 = bellDialog;
bellDialog = function(){ _bellDialog1140(); if(!NATIVE) return;
  $('#dlgbody .acts')?.insertAdjacentHTML('beforebegin', `<div class="nset"><label class="chk"><input type="checkbox" id="ntf" ${D.settings.notify?'checked':''}> Mitteilungen aufs Handy (fällige Rechnungen, geplante Zahlungen, Warnungen)</label>
    <label class="chk small"><input type="checkbox" id="ntfd" ${D.settings.notifyDetail?'checked':''} ${D.settings.notify?'':'disabled'}> Namen und Beträge in der Mitteilung zeigen <span class="muted">(sonst nur «Heute ist eine Zahlung fällig»)</span></label></div>`); };
document.addEventListener('change', e=>{ if(e.target.id==='ntf') notifyToggle(e.target.checked).then(()=>{ const d = $('#ntfd'); if(d) d.disabled = !D.settings.notify; });
  if(e.target.id==='ntfd'){ D.settings.notifyDetail = e.target.checked; save(); notifySync(); } });

/* ---------- Fingerabdruck / Windows Hello im Browser (WebAuthn mit PRF) ----------
   Die PIN wird mit einem Schlüssel verschlüsselt, den nur der Sicherheitschip (Passkey) nach
   Fingerabdruck/Gesichtserkennung herausgibt. Ohne Passkey ist die gespeicherte PIN wertlos. */
var PK_KEY = KEY+'.pk';
var pkB64 = u => btoa(String.fromCharCode(...new Uint8Array(u))), pkUn = s => Uint8Array.from(atob(s), c=>c.charCodeAt(0));
var pkOk = () => !NATIVE && window.PublicKeyCredential && window.isSecureContext && navigator.credentials;
async function pkKey(prf){ const base = await crypto.subtle.importKey('raw', prf, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'HKDF', hash:'SHA-256', salt:new TextEncoder().encode('finanzen-pk-v1'), info:new Uint8Array(0)}, base, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']); }
async function pkPrf(id, salt){
  const r = await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)), allowCredentials:[{type:'public-key', id}], userVerification:'required', timeout:60000, extensions:{prf:{eval:{first:salt}}}}});
  const out = r?.getClientExtensionResults?.().prf?.results?.first; if(!out) throw new Error('Dieser Browser oder dieses Gerät unterstützt das sichere Entsperren (PRF) nicht.'); return out;
}
async function pkSetup(pin){
  const cred = await navigator.credentials.create({publicKey:{rp:{name:'Finanzen'}, user:{id:crypto.getRandomValues(new Uint8Array(16)), name:'Finanzen', displayName:'Finanzen'},
    challenge:crypto.getRandomValues(new Uint8Array(32)), pubKeyCredParams:[{type:'public-key', alg:-7},{type:'public-key', alg:-257}],
    authenticatorSelection:{userVerification:'required', residentKey:'discouraged', authenticatorAttachment:'platform'}, timeout:60000, extensions:{prf:{}}}});
  if(cred.getClientExtensionResults?.().prf?.enabled === false) throw new Error('Dieses Gerät unterstützt das sichere Entsperren (PRF) nicht.');
  const id = new Uint8Array(cred.rawId), salt = crypto.getRandomValues(new Uint8Array(32)), key = await pkKey(await pkPrf(id, salt)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, new TextEncoder().encode(pin));
  localStorage.setItem(PK_KEY, JSON.stringify({id:pkB64(id), salt:pkB64(salt), iv:pkB64(iv), ct:pkB64(ct)}));
}
async function pkUnlock(){
  const o = JSON.parse(localStorage.getItem(PK_KEY)||'null'); if(!o) return;
  const key = await pkKey(await pkPrf(pkUn(o.id), pkUn(o.salt)));
  return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM', iv:pkUn(o.iv)}, key, pkUn(o.ct)));
}
var _renderLock1140 = renderLock;
renderLock = function(){ _renderLock1140(); if(!pkOk() || !localStorage.getItem(PK_KEY) || $('#pin')?.disabled) return;
  $('#unlockf')?.insertAdjacentHTML('afterend', `<button class="btn mt" data-act="pkunlock" style="width:100%">${ICON.finger} Mit Fingerabdruck / Windows Hello</button>`);
  if(!S.pkTried){ S.pkTried = true; setTimeout(()=>document.querySelector('[data-act="pkunlock"]')?.click(), 300); } };
var _unlock1140 = unlock;
unlock = async function(pin){ await _unlock1140(pin); S.pkPin = pin; if(pkOk() && !localStorage.getItem(PK_KEY) && localStorage.getItem(PK_KEY+'.no')!=='1') setTimeout(pkOffer, 800); };
function pkOffer(){ const pin = S.pkPin; S.pkPin = null; if(!pin || !D || S.locked || $('#dlg').open) return;
  dialog(`<h3>Schneller entsperren?</h3><p class="small">Statt der PIN kannst du in diesem Browser mit Fingerabdruck, Gesichtserkennung oder Windows Hello entsperren. Die PIN wird dafür mit einem Schlüssel im Sicherheitschip deines Geräts verschlüsselt.</p>
    <div class="acts"><button class="btn" data-dlg="no">Nein, danke</button><button class="btn pri" data-dlg="ok">Einrichten</button></div>`,
  k=>{ if(k==='no'){ localStorage.setItem(PK_KEY+'.no','1'); return; } pkSetup(pin).then(()=>toastMsg('Fingerabdruck / Windows Hello eingerichtet')).catch(e=>toastMsg(e.name==='NotAllowedError'?'Abgebrochen':(e.message||'Einrichten nicht möglich'))); }); }
var _setPin1140 = setPin; setPin = async function(p){ await _setPin1140(p); localStorage.removeItem(PK_KEY); };
var _removePin1140 = removePin; removePin = async function(){ await _removePin1140(); localStorage.removeItem(PK_KEY); };

/* ---------- Klicks ---------- */
document.addEventListener('click', e=>{
  const ex = e.target.closest('[data-kiq]'); if(ex && D){ e.stopPropagation(); S.kiQ = ex.dataset.kiq; render(); return; }
  const a = e.target.closest('[data-act]'); if(!a || !D && a.dataset.act!=='pkunlock') return; const k = a.dataset.act;
  const H = {
    kicat:()=>{ const x = S.kiCats?.[+a.dataset.i]; if(x){ x.t.c = x.r.c; x.t.ai = 1; calc(); save(); toastMsg('Zugeordnet: '+bkName(x.r.c)); } },
    kicatall:()=>{ let n = 0; for(const x of S.kiCats||[]) if(x.r.p>=0.5 && x.t.c==='_offen'){ x.t.c = x.r.c; x.t.ai = 1; n++; } calc(); save(); toastMsg(n+' Buchungen zugeordnet'); },
    labopen:()=>{ S.lab = a.dataset.k; }, labback:()=>{ S.lab = null; },
    splittx:()=>{ $('#dlg').close(); setTimeout(()=>splitDialog(a.dataset.id), 60); return 'skip'; },
    acclook:()=>{ $('#dlg').close(); setTimeout(()=>lookDialog(a.dataset.id), 60); return 'skip'; },
    pkunlock:()=>{ pkUnlock().then(pin=>{ if(!pin) return; const f = $('#unlockf'); if(!f) return; $('#pin').value = pin; f.requestSubmit(); })
      .catch(err=>{ const m = $('#pinmsg'); if(m){ m.textContent = err.name==='NotAllowedError' ? 'Abgebrochen – PIN eingeben.' : (err.message||'Entsperren nicht möglich'); m.className = 'small neg'; } }); return 'skip'; },
  };
  if(!H[k]) return; e.stopPropagation(); e.preventDefault(); if(H[k]()!=='skip') render();
}, true);
document.addEventListener('submit', e=>{ if(e.target.id!=='kiaskf') return; e.preventDefault(); S.kiQ = $('#kiq').value.trim(); render(); setTimeout(()=>{ const i = $('#kiq'); if(i && !S.kiQ) i.focus(); }, 30); });

/* ---------- Einbinden ---------- */
NAV4[0][1].splice(3, 0, ['assistent', ICON.star, 'Finanz-Assistent']);
NAV4[0][1].push(['labels', ICON.list, 'Labels']);
TITLES.assistent = 'Finanz-Assistent'; TITLES.labels = 'Labels';
FAB_VIEWS.push('assistent','labels');
var _vStart1140 = vStart;
vStart = function(){ const h = _vStart1140(); return (S.stab||'konten')==='konten' ? h.replace('<div class="agrid home">', `<div class="agrid home">${cardKiTeaser()}`) : h; };
var _calc1140 = calc; calc = function(){ _kc = {}; return _calc1140.apply(this, arguments); };
var _save1140 = save;
save = function(){ const r = _save1140.apply(this, arguments); if(NATIVE && D?.settings?.notify) notifySync(); return r; };
var _render1140 = render;
render = function(){
  const custom = {assistent:vAssistent, labels:vLabels}[S.view];
  if(custom && !S.locked && D){ const keep = S.view; S.view = 'autoregeln'; _render1140(); S.view = keep;
    $('header h1').textContent = TITLES[keep]; $('#main').innerHTML = custom();
    document.querySelectorAll('nav.side a').forEach(x=>x.classList.toggle('on', x.dataset.go===keep));
    $('#fab')?.classList.remove('hide'); $('#mnav')?.style.setProperty('visibility','hidden'); bellUpdate(); drawCharts(); return; }
  _render1140();
};
