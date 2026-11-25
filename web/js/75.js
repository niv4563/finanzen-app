/* =====================================================================
   77. ANALYSE › BERICHT – WIE WALLET (WEB)
   • Lohnmonat: Zeitraum vom Lohntag bis zum Tag davor (z. B. 26.–25.), automatisch erkannt oder einstellbar
   • Einnahmen & Ausgaben: 6 Zeiträume nebeneinander, pro Hauptkategorie, mit Veränderung in %
     (antippen zeigt die Unterkategorien)
   • Kontostand: Verlauf der Konten «in Statistik», Erklärung warum er steigt oder sinkt, alle Konten
   • Cashflow: Einnahmen/Ausgaben pro Tag, Vergleich mit Vorperiode und Vorjahr
   Gezählt werden wie bei Wallet nur Konten, die in der Statistik zählen. Überträge zählen nicht als
   Einnahme oder Ausgabe.
   ===================================================================== */
TITLES.bericht = 'Analyse';
(() => { const h = HUBS.find(x=>x.k==='ana'); if(h && !h.tabs.some(t=>t[0]==='bericht')) h.tabs.unshift(['bericht','Bericht']); })();

/* ---------- Lohnmonat ---------- */
function lmDetect(){
  if(S._lmd && S._lmd.n===D.tx.length) return S._lmd.v;
  const from = dAdd(todayIso(), -400), best = {};
  for(const t of D.tx){ if(t.d<from || isTr(t) || !brIsInc(t) || !brStat(t)) continue; const v = sv(t); if(v<1000) continue;
    const ym = t.d.slice(0,7); if(!best[ym] || v>best[ym].v) best[ym] = {v, day:+t.d.slice(8,10)}; }
  const cnt = {}; for(const x of Object.values(best)) cnt[x.day] = (cnt[x.day]||0)+1;
  const top = Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0]; let v = top ? +top[0] : 1;
  if(v < 15) v = 1; if(v > 28) v = 28;
  S._lmd = {n:D.tx.length, v}; return v;
}
var lmStart = () => { const s = +D.settings.mStart; return s>=1 && s<=28 ? s : lmDetect(); };
var p2 = n => String(n).padStart(2,'0');
function lmPeriod(k){
  const s = lmStart(), t = todayIso(); let ym = t.slice(0,7); if(+t.slice(8,10) < s) ym = ymAdd(ym,-1);
  ym = ymAdd(ym, k||0); const from = ym+'-'+p2(s), to = dAdd(ymAdd(ym,1)+'-'+p2(s), -1);
  return {from, to, ym, l: s===1 ? ymLabel(ym) : dLong(from)+' – '+dLong(to), s: s===1 ? MN[+ym.slice(5)-1].slice(0,3)+' '+ym.slice(2,4) : dShort(from)+' – '+dShort(to)};
}

/* ---------- Buchungen einteilen ---------- */
var brAcc = id => D.accounts.find(a=>a.id===id);
var brStat = t => { const a = brAcc(bkAcc(t)); return !a || inStats(a); };
var brCat = t => D.cats.find(x=>x.id===t.c);
function brTop(t){
  if(t.c==='_inc') return 'Einkommen'; if(!t.c || t.c==='_offen') return 'Unbekannt';
  const c = brCat(t); if(!c) return 'Unbekannt'; if(c.wparent) return c.wparent;
  const b = c.bud && D.cats.find(x=>x.id===c.bud); if(b?.wparent) return b.wparent;
  if(c.group==='spar') return 'Investitionen';
  return wParentOf(c.name);
}
var brIsInc = t => t.c==='_inc' || /^einkommen|^income/i.test(brTop(t));
var brSub = t => t.c==='_inc' ? 'Einkommen' : (!t.c || t.c==='_offen') ? 'Ohne Kategorie' : (brCat(t)?.name || 'Ohne Kategorie');
function brTx(from, to){ return D.tx.filter(t=>t.d>=from && t.d<=to && !isTr(t) && !t.vorm && !t.pending && brStat(t) && t.d<=todayIso()); }
function brSums(from, to){
  const r = {inc:0, out:0, top:{}, sub:{}, days:{}};
  for(const t of brTx(from, to)){ const v = sv(t), inc = brIsInc(t), tp = brTop(t), sb = brSub(t);
    const k = (inc?'i:':'o:')+tp, amt = inc ? v : -v;
    r.top[k] = (r.top[k]||0) + amt; (r.sub[k] ??= {})[sb] = (r.sub[k][sb]||0) + amt;
    if(inc) r.inc += v; else r.out += -v;
    const dd = (r.days[t.d] ??= {i:0, o:0}); if(v>0) dd.i += v; else dd.o += -v; }
  return r;
}

/* ---------- Ansicht ---------- */
var BR_ICON = {'Essen & Getränke':'🍴','Essen & Trinken':'🍴','Einkaufen':'🛍','Wohnen':'🏠','Transport':'🚌','Fahrzeug':'🚗','Leben & Unterhaltung':'🎭','Kommunikation, PC':'💻','Finanzausgaben':'🏦','Investitionen':'📈','Sonstiges':'☰','Unbekannt':'❔','Einkommen':'💰'};
function brPct(cur, prev, goodUp){
  if(Math.abs(prev) < 1) return Math.abs(cur) < 1 ? '<span class="brp z">0 %</span>' : '<span class="brp z">neu</span>';
  const p = (cur-prev)/Math.abs(prev)*100, good = goodUp ? p>=0 : p<=0, a = Math.abs(p) < 0.5 ? '→' : p>0 ? '↑' : '↓';
  return `<span class="brp ${Math.abs(p)<0.5?'z':good?'g':'b'}">${a} ${Math.abs(p)>=999?'>999':Math.round(Math.abs(p))} %</span>`;
}
function brHead(){
  const P = lmPeriod(S.lmOff||0), s = lmStart(), auto = !(+D.settings.mStart);
  return `<div class="brhead"><button class="ibtn" data-act="lmnav" data-d="-1" aria-label="Früherer Zeitraum">‹</button>
    <div class="brper"><b>${P.l}</b><button class="link small" data-act="lmset">Monat ${s===1?'= Kalendermonat':`ab dem ${s}.`}${auto?' (erkannt)':''} · ändern</button></div>
    <button class="ibtn" data-act="lmnav" data-d="1" aria-label="Späterer Zeitraum" ${(S.lmOff||0)>=0?'disabled':''}>›</button></div>`;
}
function vBericht(){
  const sg = S.brSeg || 'ea';
  let h = brHead() + `<div class="sgm brseg">${[['ea','Einnahmen & Ausgaben'],['kt','Kontostand'],['cf','Cashflow']].map(([v,l])=>`<button class="${v===sg?'on':''}" data-act="brseg" data-v="${v}">${l}</button>`).join('')}</div>`;
  try{ h += sg==='kt' ? brKonto() : sg==='cf' ? brCash() : brEA(); }catch(e){ console.error(e); h += '<div class="card">Bericht konnte nicht berechnet werden.</div>'; }
  h += `<p class="small muted">Wie bei Wallet zählen nur Konten, die in der Statistik zählen (Konten › «zählt im Saldo»). Überträge zwischen Konten sind weder Einnahme noch Ausgabe.</p>`;
  return h;
}
function brEA(){
  const off = S.lmOff||0, Ps = Array.from({length:6},(_,i)=>lmPeriod(off-i)), Ss = Ps.map(p=>brSums(p.from, p.to)), open = S.brOpen || (S.brOpen = {});
  const keys = pre => { const all = new Set(); Ss.forEach(s=>Object.keys(s.top).filter(k=>k.startsWith(pre)).forEach(k=>all.add(k)));
    return [...all].sort((a,b)=>Math.abs(Ss[0].top[b]||0)-Math.abs(Ss[0].top[a]||0) || Math.abs(Ss[1].top[b]||0)-Math.abs(Ss[1].top[a]||0)); };
  const cell = (v, pv, inc, bold) => `<td class="num"><div class="${bold?'brb':''} ${Math.abs(v)<0.5?'muted':''}">${inc||v<0.5?'':'−'}${chf(Math.abs(v))}</div>${pv!==undefined?brPct(v, pv, inc):''}</td>`;
  const head = `<tr><th></th>${Ps.map((p,i)=>`<th class="num ${i===0?'brcur':''}">${p.s}</th>`).join('')}</tr>`;
  const row = (k, inc) => { const name = k.slice(2), isO = !!open[k];
    let r = `<tr class="brrow" data-act="bropen" data-k="${esc(k)}"><td><span class="bri">${BR_ICON[name]||'•'}</span>${esc(name)} <span class="brchev">${isO?'▾':'▸'}</span></td>${Ss.map((s,i)=>cell(s.top[k]||0, i<5 ? (Ss[i+1].top[k]||0) : undefined, inc)).join('')}</tr>`;
    if(isO){ const subs = new Set(); Ss.forEach(s=>Object.keys(s.sub[k]||{}).forEach(x=>subs.add(x)));
      [...subs].sort((a,b)=>(Ss[0].sub[k]?.[b]||0)-(Ss[0].sub[k]?.[a]||0)).forEach(sb=>{ r += `<tr class="brsub"><td>${esc(sb)}</td>${Ss.map(s=>`<td class="num ${Math.abs(s.sub[k]?.[sb]||0)<0.5?'muted':''}">${chf(Math.abs(s.sub[k]?.[sb]||0))}</td>`).join('')}</tr>`; }); }
    return r; };
  const tot = (lab, f, inc) => `<tr class="brtot"><td><b>${lab}</b></td>${Ss.map((s,i)=>cell(f(s), i<5 ? f(Ss[i+1]) : undefined, inc, true)).join('')}</tr>`;
  const cfRow = `<tr class="brtot brcf"><td><b>Cashflow</b></td>${Ss.map((s,i)=>{ const v = s.inc - s.out; return `<td class="num"><div class="brb ${v>=0?'in':'neg'}">${v>=0?'+':'−'}${chf(Math.abs(v))}</div>${i<5?brPct(v, Ss[i+1].inc-Ss[i+1].out, true):''}</td>`; }).join('')}</tr>`;
  const avg = Ss.slice(1).reduce((a,s)=>a+s.out,0)/5, low = Ss[0].out>0 && Ss.slice(1).every(s=>Ss[0].out<=s.out);
  return `<div class="card brsum"><div class="brk"><span>Einnahmen</span><b class="num in">${chf(Ss[0].inc)}</b></div><div class="brk"><span>Ausgaben</span><b class="num neg">${Ss[0].out>=0.5?'−':''}${chf(Ss[0].out)}</b></div><div class="brk"><span>Cashflow</span><b class="num ${Ss[0].inc-Ss[0].out>=0?'in':'neg'}">${Ss[0].inc-Ss[0].out>=0?'+':'−'}${chf(Math.abs(Ss[0].inc-Ss[0].out))}</b></div>
    <p class="small muted" style="margin:8px 0 0;grid-column:1/-1">Ausgaben im Schnitt der 5 Zeiträume davor: CHF ${chf0(avg)}.${low?' <b class="in">Tiefster Wert der letzten 6 Zeiträume.</b>':''}</p></div>
    <div class="card ytable brtable mt"><table><thead>${head}</thead><tbody>
    ${tot('Gesamteinnahmen', s=>s.inc, true)}${keys('i:').map(k=>row(k, true)).join('')}
    ${tot('Gesamtausgaben', s=>s.out, false)}${keys('o:').map(k=>row(k, false)).join('')}
    ${cfRow}</tbody></table></div>
    <p class="small muted">Zeile antippen zeigt die Unterkategorien. Prozent = Veränderung zum Zeitraum davor; grün ist gut (mehr Einnahmen, weniger Ausgaben).</p>`;
}
function brBal(accs, d){ return accs.reduce((s,a)=>s+(balAt(a.id, d) ?? 0), 0); }
function brKonto(){
  const P = lmPeriod(S.lmOff||0), Pp = lmPeriod((S.lmOff||0)-1), end = P.to < todayIso() ? P.to : todayIso();
  const all = D.accounts.filter(a=>!a.archived && D.bal?.[a.id]), st = all.filter(a=>inStats(a) && accCur(a)==='CHF');
  const days = []; for(let d=P.from; d<=end; d=dAdd(d,1)) days.push(d);
  const vals = days.map(d=>r2(brBal(st, d))), v0 = r2(brBal(st, dAdd(P.from,-1))), v1 = vals.at(-1) ?? v0, vp = r2(brBal(st, Pp.to));
  // Warum steigt oder sinkt der Kontostand?
  let inc = 0, out = 0, trIn = 0, trOut = 0; const trBy = {};
  for(const t of D.tx){ if(t.d<P.from || t.d>end || !brStat(t)) continue; const a = brAcc(bkAcc(t)); if(a && accCur(a)!=='CHF') continue;
    const v = sv(t); if(isTr(t)){ if(!t.imp) continue; if(v>0) trIn += v; else trOut += -v; const k = t.n||'Übertrag'; } else if(brIsInc(t)) inc += v; else out += -v; }
  const diff = r2(v1 - v0), rest = r2(diff - (inc - out) - (trIn - trOut));
  const line = (l, v, cls) => `<div class="brline"><span>${l}</span><b class="num ${cls||''}">${v>=0?'+':'−'}${chf(Math.abs(v))}</b></div>`;
  const why = `<div class="card mt"><h3 style="margin:0 0 8px">Warum ${Math.abs(diff)<1?'sich der Kontostand kaum verändert':diff>0?'der Kontostand steigt':'der Kontostand sinkt'}</h3>
    <div class="brline"><span>Stand am ${dShort(dAdd(P.from,-1))}</span><b class="num">${chf(v0)}</b></div>
    ${line('Einnahmen', inc, 'in')}${line('Ausgaben', -out, 'neg')}
    ${trOut||trIn ? line('Überträge zu Konten ausserhalb der Statistik (z. B. Sparkonto)', trIn - trOut, trIn-trOut<0?'neg':'in') : ''}
    ${Math.abs(rest)>1 ? line('Ohne passende Buchung (Korrekturen, Fremdwährung)', rest) : ''}
    <div class="brline brlt"><span>Stand am ${dShort(end)}</span><b class="num ${v1<0?'neg':''}">${chf(v1)}</b></div>
    ${inc-out>0 && diff<0 ? `<p class="small" style="margin:8px 0 0">Du hast mehr eingenommen als ausgegeben (Cashflow +${chf0(inc-out)}). Der Kontostand sinkt trotzdem, weil Geld auf Konten ausserhalb der Statistik geht – das ist kein Verlust, nur eine Verschiebung.</p>`:''}</div>`;
  const rows = all.map(a=>{ const b = balAt(a.id, end), b0 = balAt(a.id, dAdd(P.from,-1)), c = accCur(a), s = inStats(a);
    return `<div class="bracc ${s?'':'dim'}"><span class="brdot" style="background:${a.color||wAccColor(a)}"></span><div class="sp"><b>${esc(a.name)}</b>${s?'':'<div class="small muted">Von Statistik ausgeschlossen</div>'}</div>
      <div class="gwr"><b class="num ${b<0?'neg':''}">${chf(b)} ${c!=='CHF'?c:''}</b>${b0!=null && Math.abs(b-b0)>=0.5?`<div class="small ${b-b0>=0?'in':'neg'}">${b-b0>=0?'+':'−'}${chf(Math.abs(b-b0))}</div>`:''}</div></div>`; }).join('');
  return `<div class="card"><div class="row"><div class="sp"><div class="small muted">${P.l}</div><div class="brbig num ${v1<0?'neg':''}">${chf(v1)}</div></div>${brPct(v1, vp, true)}</div>
    ${chart({h:230, labels:days.map(dShort), tips:days.map(d=>new Date(d+'T12:00').toLocaleDateString('de-CH',{weekday:'short', day:'numeric', month:'long'})), series:[{kind:'area', name:'Kontostand', color:C_BAL, values:vals}], label:'Kontostand-Verlauf'})}
    <p class="small muted" style="margin:6px 0 0">Summe der Konten in der Statistik: ${st.map(a=>esc(a.name)).join(', ')||'keine'}.</p></div>
    ${why}<div class="card mt"><h3 style="margin:0 0 6px">Alle Konten</h3>${rows}</div>`;
}
function brCash(){
  const off = S.lmOff||0, P = lmPeriod(off), Pp = lmPeriod(off-1), n = dDiff(P.from, P.to)+1;
  const yb = {from:yearBack(P.from), to:yearBack(P.to)};
  const S0 = brSums(P.from, P.to), S1 = brSums(Pp.from, Pp.to), S2 = brSums(yb.from, yb.to);
  const days = Array.from({length:n},(_,i)=>dAdd(P.from,i)), last = todayIso();
  const cum = (s, from) => { let c = 0; return Array.from({length:n},(_,i)=>{ const d = dAdd(from,i); if(d>last) return null; const x = s.days[d]; if(x) c += x.i - x.o; return r2(c); }); };
  const cf0 = S0.inc - S0.out, cf1 = S1.inc - S1.out, mx = Math.max(S0.inc, S0.out, 1);
  return `<div class="card">${chart({h:240, labels:days.map(dShort), series:[
      {kind:'bar', name:'Einnahmen', color:C_IN, values:days.map(d=>d>last?null:r2(S0.days[d]?.i||0))},
      {kind:'bar', name:'Ausgaben', color:C_OUT, values:days.map(d=>d>last?null:-r2(S0.days[d]?.o||0)), tipAbs:true},
      {kind:'line', name:'Cashflow', color:'var(--ink)', values:days.map(d=>d>last?null:r2((S0.days[d]?.i||0)-(S0.days[d]?.o||0)))}], label:'Cashflow pro Tag'})}
    ${legend([[C_IN,'Einnahmen'],[C_OUT,'Ausgaben'],['var(--ink)','Cashflow']])}</div>
    <div class="card mt"><div class="row"><div class="sp"><div class="small muted">${P.l}</div><div class="brbig num ${cf0>=0?'in':'neg'}">${cf0>=0?'+':'−'}${chf(Math.abs(cf0))}</div></div>${brPct(cf0, cf1, true)}</div>
      <div class="brline"><span>Einnahmen</span><b class="num">${chf(S0.inc)}</b></div><div class="bar"><i style="width:${S0.inc/mx*100}%;background:${C_IN}"></i></div>
      <div class="brline" style="margin-top:8px"><span>Ausgaben</span><b class="num">${S0.out>=0.5?'−':''}${chf(S0.out)}</b></div><div class="bar"><i style="width:${S0.out/mx*100}%;background:${C_OUT}"></i></div></div>
    <div class="card mt"><h3 style="margin:0 0 6px">Verlauf im Vergleich</h3><p class="small muted" style="margin:0 0 6px">Cashflow aufsummiert ab Beginn des Zeitraums.</p>
      ${chart({h:230, labels:days.map((d,i)=>'Tag '+(i+1)), tips:days.map(dShort), series:[
        {kind:'area', name:'Aktueller Zeitraum', color:C_BAL, values:cum(S0, P.from)},
        {kind:'line', name:'Vorheriger Zeitraum', color:C_PREV, values:cum(S1, Pp.from).map((v,i)=>v)},
        {kind:'line', name:'Vor einem Jahr', color:C_YEAR, values:cum(S2, yb.from)}], label:'Cashflow-Vergleich'})}
      ${legend([[C_BAL,'Aktueller Zeitraum'],[C_PREV,'Vorheriger Zeitraum'],[C_YEAR,'Vor einem Jahr']])}</div>`;
}

/* ---------- Bedienung ---------- */
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act="lmnav"],[data-act="brseg"],[data-act="bropen"],[data-act="lmset"]'); if(!a || !D) return; e.stopPropagation(); e.preventDefault();
  const act = a.dataset.act;
  if(act==='lmnav'){ S.lmOff = Math.min(0, (S.lmOff||0) + +a.dataset.d); render(); return; }
  if(act==='brseg'){ S.brSeg = a.dataset.v; try{ localStorage.setItem(KEY+'.brseg', S.brSeg); }catch(e){} render(); return; }
  if(act==='bropen'){ const k = a.dataset.k; S.brOpen ??= {}; S.brOpen[k] = !S.brOpen[k]; render(); return; }
  if(act==='lmset'){ const cur = +D.settings.mStart || 0, det = lmDetect();
    dialog(`<h3>Monat für die Analyse</h3><p class="small muted" style="margin-top:0">Am besten beginnt der Monat am Tag, an dem der Lohn kommt – so steht jeder Lohn in seinem eigenen Monat. Wallet rechnet bei dir vom 26. bis zum 25.</p>
      <label class="f">Monat beginnt am<select id="lms"><option value="0" ${!cur?'selected':''}>Automatisch (erkannt: ${det===1?'1.':det+'.'})</option>${Array.from({length:28},(_,i)=>i+1).map(d=>`<option value="${d}" ${cur===d?'selected':''}>${d===1?'1. (Kalendermonat)':d+'.'}</option>`).join('')}</select></label>
      <p class="small muted">Gilt nur für die Analyse. Das Budget bleibt in Kalendermonaten.</p>
      <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Speichern</button></div>`,
    k=>{ if(k!=='ok') return; const v = +$('#lms').value; if(v) D.settings.mStart = v; else delete D.settings.mStart; S.lmOff = 0; }); }
}, true);
try{ S.brSeg = localStorage.getItem(KEY+'.brseg') || 'ea'; }catch(e){}
CUSTOM_V.bericht = vBericht;
render = (prev => function(){ prev.apply(this, arguments); try{ if(S.view==='bericht' && D && !S.locked) drawCharts(); }catch(e){ console.error(e); } })(render);
