/* =====================================================================
   27. VERSION 1.9.0 – STARTSEITE WIE DIE WALLET-APP: KONTEN | BUDGETS & ZIELE, DASHBOARD MIT ANZEIGEN,
       AUSGABENSTRUKTUR, LETZTE EINTRÄGE, KONTOSTAND-TREND, BEVORSTEHENDE GEPLANTE ZAHLUNGEN
   ===================================================================== */
var AI = {
  bank:'<path d="M3 10 12 4l9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  pig:CI.pig, card:CI.card, shield:CI.shield,
  invest:'<path d="M4 20V14M10 20V9M16 20V12M22 20V5"/><path d="M2 20h20"/>',
  cash:'<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
};
function accIcon(a){
  const n = (a.name||'').toLowerCase();
  if(a.kind==='debt') return /kredit(?!karte)|darlehen|leasing/.test(n) && !/karte/.test(n) ? AI.bank : AI.card;
  if(/3a|säule|vorsorge/.test(n)) return AI.shield;
  if(/invest|anlage|depot|aktien|fonds/.test(n) || a.id==='anlage') return AI.invest;
  if(/spar|reserve/.test(n) || a.notgroschen) return AI.pig;
  if(/bar|cash/.test(n)) return AI.cash;
  return AI.bank;
}
var accVal = a => { const b = bankBalance(a.id); return b ? b.v : (C.m[TODAY]?.acc[a.id]?.start ?? C.m[C.now]?.acc[a.id]?.start ?? 0); };
var signChf = v => (v<0?'−':'')+chf(Math.abs(v));

/* ---------- Bevorstehende geplante Zahlungen ----------
   Aus offenen Rechnungen, Jahreskosten und festen Kosten. Bei festen Kosten nimmt die App den Tag,
   an dem die letzte Zahlung dieser Kategorie vom Konto ging (z. B. Miete am 27.). */
function upcoming(days=35){
  const today = todayIso(), until = dAdd(today, days), out = [];
  for(const b of D.bills||[]) if(b.status==='offen') out.push({d:b.due||today, n:b.creditor, sub:bkName(b.cat||'_offen'), v:b.amount, c:b.cat, go:'rechnungen'});
  const m = C.m[TODAY] || C.m[C.now];
  for(const c of D.cats.filter(c=>c.group==='fix' && !c.archived)){
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
  const late = x.d < todayIso(), ic = x.c ? catIcon({c:x.c}) : CI.tag, col = x.c ? (GROUPS[D.cats.find(c=>c.id===x.c)?.group]?.c || 'var(--acc)') : 'var(--acc)';
  return `<div class="wrow" data-go="${x.go}"><span class="wic" style="background:${col}">${ci(ic)}</span><div class="wmid"><b>${esc(x.n)}</b><span>${esc(x.sub)}</span></div>
    <div class="wend"><b class="num out">−${chf(x.v)}</b><span class="${late?'late':''}">${late?'überfällig · ':''}${dShort(x.d)}</span></div></div>`;
}

/* ---------- Anzeige-Instrument (Tacho) wie im Wallet-Dashboard ---------- */
function gauge(p, label, value, size){
  p = Math.max(0, Math.min(1, isFinite(p) ? p : .5));
  const W = size, r = W*0.4, cx = W/2, cy = W*0.5, sw = Math.max(5, W*0.06);
  const pt = a => [cx + r*Math.cos(a), cy + r*Math.sin(a)], a0 = Math.PI*0.75, span = Math.PI*1.5;
  const arc = (f1,f2,c) => { const [x1,y1] = pt(a0+span*f1), [x2,y2] = pt(a0+span*f2); return `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${(f2-f1)*span>Math.PI?1:0} 1 ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>`; };
  const a = a0+span*p, nx = cx + r*0.82*Math.cos(a), ny = cy + r*0.82*Math.sin(a), bx = cx - r*0.18*Math.cos(a), by = cy - r*0.18*Math.sin(a);
  return `<div class="gauge"><svg viewBox="0 0 ${W} ${W*0.86}" width="${W}" height="${(W*0.86).toFixed(0)}" aria-hidden="true">${arc(0,.3,'#e34948')}${arc(.36,.64,'#f29a38')}${arc(.7,1,'#1baf7a')}
    <line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="var(--ink)" stroke-width="${Math.max(2,W*0.025)}" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="${W*0.06}" fill="var(--ink)"/></svg>
    <span>${label}</span><b class="num">${value}</b></div>`;
}
function dashboard(){
  const to = todayIso(), from = dAdd(to,-29), pf = dAdd(from,-30), pt = dAdd(from,-1);
  const sum = (f,t,fn) => D.tx.filter(x=>x.d>=f && x.d<=t && !isTr(x)).reduce((s,x)=>s+fn(x),0);
  const inc = sum(from,to,inAmt), out = sum(from,to,outAmt), pout = sum(pf,pt,outAmt), net = inc-out;
  const accs = activeAccs().filter(a=>!a.archived), liquid = accs.filter(a=>a.liquid||a.main).reduce((s,a)=>s+accVal(a),0);
  const total = accs.reduce((s,a)=>s+accVal(a),0), assets = accs.filter(a=>a.kind!=='debt').reduce((s,a)=>s+Math.max(0,accVal(a)),0);
  const debt = accs.filter(a=>a.kind==='debt').reduce((s,a)=>s+Math.max(0,-accVal(a)),0);
  const next7 = upcoming(7).filter(x=>x.d>=to).reduce((s,x)=>s+x.v,0), outlook = liquid - next7;
  const cards = accs.filter(a=>a.kind==='debt' && a.limit), used = cards.reduce((s,a)=>s+Math.max(0,-accVal(a)),0), lim = cards.reduce((s,a)=>s+a.limit,0);
  const perMonth = Math.max(1, out);
  const g = (p,l,v,s) => gauge(p,l,v,s);
  return `<div class="xcard dash"><div class="ah"><div><h3>Übersicht</h3><span class="small muted">Letzte 30 Tage und Ausblick auf die nächsten 7 Tage</span></div></div>
    <div class="g2">${g(liquid/perMonth/3, 'Verfügbar', chf0(liquid), 132)}${g(inc>0 ? .5+net/inc/2 : (net<0?0:.5), 'Cashflow', (net<0?'−':'')+chf0(Math.abs(net)), 132)}</div>
    <div class="g4">${g(outlook/perMonth/2, 'Ausblick 7 T.', (outlook<0?'−':'')+chf0(Math.abs(outlook)), 76)}${g(pout ? 1-(out/pout)/2 : .5, 'Ausgaben', chf0(out), 76)}
      ${g(lim ? 1-used/lim : .5, 'Kredit', lim ? Math.round(used/lim*100)+'%' : '–', 76)}${g(assets+debt ? 1-debt/(assets+debt) : 1, 'Schuld', assets+debt ? Math.round(debt/(assets+debt)*100)+'%' : '0%', 76)}</div>
    <a class="wmore" data-go="statistik">Statistiken</a></div>`;
}

/* ---------- Karten der Startseite ---------- */
function homeStructure(){
  const to = todayIso(), from = dAdd(to,-29), l = D.tx.filter(t=>t.d>=from && t.d<=to && t.c!=='_inc' && !isTr(t)), by = {};
  for(const t of l) by[t.c] = (by[t.c]||0) + outAmt(t);
  const all = Object.entries(by).filter(([,v])=>v>0.004).sort((a,b)=>b[1]-a[1]), top = all.slice(0,7), rest = all.slice(7).reduce((s,[,v])=>s+v,0);
  const parts = top.map(([c,v],i)=>({n:c==='_offen'?'Ohne Kategorie':bkName(c), v, c:CAT_COL[i]})); if(rest>0) parts.push({n:'Andere', v:rest, c:'#8a96a3'});
  const tot = parts.reduce((s,x)=>s+x.v,0), prev = D.tx.filter(t=>t.d>=dAdd(from,-30) && t.d<from && t.c!=='_inc' && !isTr(t)).reduce((s,t)=>s+outAmt(t),0);
  return `<div class="xcard"><div class="ah"><h3>Ausgabenstruktur</h3></div>
    <div class="kpibig"><div><span class="small muted">Letzte 30 Tage</span><b class="num">CHF ${chf(tot)}</b></div><div class="r"><span class="small muted">vs. vorherige 30 Tage</span>${delta(tot, prev, false)}</div></div>
    <div class="struct"><div class="sd">${donut(parts, parts[0]?.n||'Ausgaben', parts[0]?'CHF '+chf0(parts[0].v):'–', 170)}</div>
      <div class="dleg2">${parts.map(p=>`<div data-go="statistik"><i style="background:${p.c}"></i><span class="sp">${esc(p.n)}</span><b class="num">${chf0(p.v)}</b><em>${tot?Math.round(p.v/tot*100):0}%</em></div>`).join('')||'<p class="small muted">Noch keine Ausgaben in den letzten 30 Tagen.</p>'}</div></div>
    <a class="wmore" data-go="statistik">Mehr anzeigen</a></div>`;
}
function homeRecent(){
  const l = [...D.tx].filter(t=>t.d<=todayIso()).sort((a,b)=>b.d.localeCompare(a.d)||(b.imp?1:0)-(a.imp?1:0)).slice(0,5);
  return `<div class="xcard"><div class="ah"><div><h3>Letzte Einträge</h3><span class="small muted">Letzte 30 Tage</span></div></div>
    ${l.map(t=>bkTxRow(t).replace(/<span>([^<]*)<\/span><\/div><\/div>$/, (m,acc)=>`<span>${dShort(t.d)}</span></div></div>`).replace('<div class="wmid"><b>', '<div class="wmid"><b>').replace(/(<div class="wmid">.*?<\/b>)/, `$1<span>${esc(accName(bkAcc(t)))}</span>`)).join('')||'<p class="small muted">Noch keine Buchungen. Tippe auf +.</p>'}
    <a class="wmore" data-go="buchungen">Mehr anzeigen</a></div>`;
}
function homeTrend(){
  if(!D.accounts.some(a=>D.bal?.[a.id])) return '';
  const to = todayIso(), from = dAdd(to,-29), keep = S.af; S.af = {};
  const vals = [], labels = [], tips = []; for(let d=from; d<=to; d=dAdd(d,1)){ vals.push(balTotal(d)); labels.push(d===to?'Heute':dShort(d)); tips.push(new Date(d+'T12:00').toLocaleDateString('de-CH',{weekday:'short',day:'numeric',month:'long'})); }
  const prev = balTotal(dAdd(from,-1)); S.af = keep;
  return `<div class="xcard"><div class="ah"><h3>Kontostand-Trend</h3></div>
    <div class="kpibig"><div><span class="small muted">Heute</span><b class="num">CHF ${signChf(vals.at(-1))}</b></div><div class="r"><span class="small muted">vs. vor 30 Tagen</span>${delta(vals.at(-1), prev)}</div></div>
    ${chart({label:'Kontostand der letzten 30 Tage', h:190, labels, tips, series:[{name:'Kontostand', color:C_BAL, kind:'area', values:vals}]})}
    <a class="wmore" data-go="statistik" data-tab="bal">Mehr anzeigen</a></div>`;
}
function homeUpcoming(){
  const l = upcoming(35);
  return `<div class="xcard"><div class="ah"><h3>Bevorstehende geplante Zahlungen</h3></div>
    ${l.slice(0,6).map(upRow).join('')||'<p class="small muted">In den nächsten 5 Wochen ist nichts geplant. Rechnungen fotografierst du über +.</p>'}
    <a class="wmore" data-go="rechnungen">Mehr anzeigen</a></div>`;
}
function homeAccounts(){
  const accs = activeAccs().filter(a=>!a.archived);
  return `<div class="hacc">${accs.map(a=>{ const v = accVal(a), b = bankBalance(a.id), dim = !b && !v;
      return `<div class="htile ${dim?'dim':''}" data-act="baledit" data-id="${a.id}" style="${dim?'':'background:'+wAccColor(a)}"><span class="n">${ci(accIcon(a))}<span>${esc(a.name)}</span></span><b class="num">CHF ${signChf(v)}</b></div>`; }).join('')}
    <div class="htile add" data-go="konten"><span>Konten verwalten</span><b>+</b></div></div>
    <div class="row" style="justify-content:flex-end;margin:10px 0 4px"><button class="btn sm" data-go="buchungen">${ci(CI.list)} Einträge</button></div>`;
}
function homeChips(){
  return `<div class="hchips">${[['statistik','<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>','Ausgaben'],['rechnungen','<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>','Geplante Zahlungen'],['budget',ICON.budget.replace(/^<svg[^>]*>|<\/svg>$/g,''),'Budgets'],['ziele','<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>','Ziele'],['konten',AI.bank,'Konten']]
    .map(([v,i,l])=>`<button data-go="${v}"${v==='statistik'?' data-tab="aus"':''}><span>${ci(i)}</span>${l}</button>`).join('')}</div>`;
}
vStart = function(){
  const tab = S.stab||'konten', unm = D.tx.filter(t=>t.c==='_offen').length;
  const tabs = `<div class="stabs"><button class="${tab==='konten'?'on':''}" data-act="stab" data-t="konten">Konten</button><button class="${tab==='budgets'?'on':''}" data-act="stab" data-t="budgets">Budgets & Ziele</button></div>`;
  if(tab==='budgets') return tabs + `<div class="hbud">${vBudgetW()}</div><div class="hbud mt">${vZiele()}</div>`;
  const hint = [];
  if(NATIVE && !D.walletApi?.token && !D.flags?.wbHint) hint.push(`<div class="hint row"><span class="sp"><b>Wallet by BudgetBakers verbinden?</b> Dann kommen deine Wallet-Buchungen automatisch.</span><button class="btn sm pri" data-go="wallet">Verbinden</button><button class="btn sm" data-act="wbhintno">Nein</button></div>`);
  if(unm) hint.push(`<div class="wnote" data-act="mapcats"><span class="wic" style="background:var(--warn)">${ci(CI.q)}</span><span class="sp"><b>${unm} Buchungen ohne Kategorie</b><br><span class="small muted">Antippen zum Zuordnen</span></span>›</div>`);
  return tabs + homeAccounts() + homeChips() + hint.join('') + `<div class="agrid home">${dashboard()}${homeStructure()}${homeRecent()}${homeTrend()}${homeUpcoming()}${leuteCard?leuteCard(true):''}</div>`;
};
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act="stab"]'); if(a){ e.stopPropagation(); S.stab = a.dataset.t; render(); scrollTo(0,0); return; }
  const g = e.target.closest('[data-go][data-tab]'); if(g) S.atab = g.dataset.tab;
}, true);

/* =====================================================================
   STATISTIK WIE IN DER WALLET-APP: Reiter Saldo · Ausblick · Cashflow · Ausgaben · Kredit,
   Zeitraum-Leiste unten (7T · 30T · 12W · 6M · 1J, blättern, eigener Zeitraum), Konten & Filter
   ===================================================================== */
function apSet(p){
  const to = todayIso(), len = {d7:7, d30:30, w12:84, m6:182, y1:365}[p];
  if(len){ S.ap = {p, to, from:dAdd(to, -(len-1))}; return; }
  const ym = to.slice(0,7), y = to.slice(0,4);
  S.ap = p==='m' ? {p, from:ym+'-01', to:mEnd(ym)} : p==='y' ? {p, from:y+'-01-01', to:y+'-12-31'} : {p:'d30', to, from:dAdd(to,-29)};
}
var AP2 = [['d7','7T'],['d30','30T'],['w12','12W'],['m6','6M'],['y1','1J']];
var STAB = [['saldo','Saldo'],['ausblick','Ausblick'],['cash','Cashflow'],['aus','Ausgaben'],['kredit','Kredit']];

function cardByAccount(a){
  const end = a.to>todayIso() ? todayIso() : a.to, accs = balAccs().map(x=>({x, v:balAt(x.id,end)})).sort((p,q)=>q.v-p.v), tot = accs.reduce((s,r)=>s+r.v,0), mx = Math.max(1, ...accs.map(r=>Math.abs(r.v)));
  if(!accs.length) return '';
  return `<div class="xcard"><div class="ah"><div><h3>Kontostand nach Konten</h3><span class="small muted">Auf welchen Konten habe ich das meiste Geld?</span></div></div>
    <div class="kpibig"><div><b class="num">CHF ${signChf(tot)}</b></div></div>
    ${accs.map(r=>`<div class="mrow"><span class="sp"><b>${esc(r.x.name)}</b><div class="mbar"><i style="width:${Math.abs(r.v)/mx*100}%;background:${r.v<0?C_OUT:wAccColor(r.x)}"></i></div></span><b class="num ${r.v<0?'out':''}">${signChf(r.v)}</b></div>`).join('')}</div>`;
}
function cardOutlook(){
  const to = todayIso(), until = dAdd(to,30), up = upcoming(30).filter(x=>x.d>=dAdd(to,-20));
  const liquid = activeAccs().filter(a=>!a.archived && (a.liquid||a.main)).reduce((s,a)=>s+accVal(a),0);
  const vals = [], labels = [], tips = []; let v = liquid - up.filter(x=>x.d<to).reduce((s,x)=>s+x.v,0);
  for(let d=to; d<=until; d=dAdd(d,1)){ v -= up.filter(x=>x.d===d).reduce((s,x)=>s+x.v,0); vals.push(v); labels.push(d===to?'Heute':dShort(d)); tips.push(new Date(d+'T12:00').toLocaleDateString('de-CH',{weekday:'short',day:'numeric',month:'long'})); }
  return `<div class="xcard xw"><div class="ah"><div><h3>Ausblick</h3><span class="small muted">Wie viel bleibt nach den geplanten Zahlungen?</span></div></div>
    <div class="kpibig"><div><span class="small muted">Heute verfügbar</span><b class="num">CHF ${signChf(liquid)}</b></div><div class="r"><span class="small muted">In 30 Tagen</span><b class="num ${vals.at(-1)<0?'out':''}" style="font-size:16px">CHF ${signChf(vals.at(-1))}</b></div></div>
    ${chart({label:'Erwarteter Kontostand der nächsten 30 Tage', h:200, labels, tips, series:[{name:'Erwartet', color:C_BAL, kind:'area', values:vals}]})}
    <p class="small muted">Berechnet aus deinen liquiden Konten minus offene Rechnungen, feste Kosten (am üblichen Tag) und Jahreskosten. Lohn ist nicht eingerechnet.</p></div>
    <div class="xcard xw"><div class="ah"><h3>Geplante Zahlungen (30 Tage)</h3><b class="num out">−${chf(up.reduce((s,x)=>s+x.v,0))}</b></div>${up.map(upRow).join('')||'<p class="small muted">Nichts geplant.</p>'}</div>`;
}
function cardDebts(){
  const debts = D.accounts.filter(x=>x.kind==='debt' && !x.archived); if(!debts.length) return '';
  const rows = debts.map(x=>({x, v:Math.max(0,-accVal(x))})), tot = rows.reduce((s,r)=>s+r.v,0), zins = rows.reduce((s,r)=>s+r.v*(r.x.rate||0)/100/12,0);
  return `<div class="xcard"><div class="ah"><div><h3>Schulden</h3><span class="small muted">Was kosten mich meine Schulden?</span></div></div>
    <div class="kpibig"><div><span class="small muted">Total</span><b class="num out">CHF ${chf(tot)}</b></div><div class="r"><span class="small muted">Zinsen pro Monat ca.</span><b class="num" style="font-size:16px">CHF ${chf(zins)}</b></div></div>
    ${rows.map(r=>`<div class="mrow"><span class="sp"><b>${esc(r.x.name)}</b> <span class="small muted">${r.x.rate?r.x.rate+' % Zins':'ohne Zins'}</span><div class="mbar"><i style="width:${tot?r.v/tot*100:0}%;background:${C_OUT}"></i></div></span><b class="num">${chf(r.v)}</b></div>`).join('')}
    <a class="wmore" data-go="konten">Schuldenplan öffnen</a></div>`;
}
function perSheet(){
  const a = apGet(), nf = afActive(), open = S.psOpen;
  return `<div class="psheet ${open?'open':''}">
    <button class="psgrip" data-act="psopen" aria-label="${open?'Einstellungen schliessen':'Zeitraum und Filter einstellen'}"><i></i></button>
    <div class="psrow"><button class="psnav" data-act="apprev" aria-label="Früherer Zeitraum">‹</button><button class="psrange" data-act="psopen">${dShort(a.from)} – ${dShort(a.to)}${a.from.slice(0,4)!==todayIso().slice(0,4)?' '+a.from.slice(0,4):''} ▾</button><button class="psnav" data-act="apnext" aria-label="Späterer Zeitraum">›</button></div>
    <div class="psmore">
      <div class="pspre">${AP2.map(([p,l])=>`<button class="${a.p===p?'on':''}" data-act="ap" data-p="${p}">${l}</button>`).join('')}</div>
      <div class="pscust"><label>Von<input type="date" id="apfrom" value="${a.from}"></label><span>–</span><label>Bis<input type="date" id="apto" value="${a.to}"></label></div>
      <button class="btn wide" data-act="afopen">${S.afOpen?'Filter ausblenden':'Konten & Filter'}${nf?' ('+nf+' aktiv)':''}</button>
      ${filterPanel()}
    </div></div>`;
}
vStatistik = function(){
  const a = apGet(), tab = S.atab2||'saldo';
  let body = '';
  if(tab==='saldo') body = `<div class="agrid">${cardBalance(a,true)}${cardByAccount(a)}${balTable(a)}</div>`;
  else if(tab==='ausblick') body = `<div class="agrid">${cardOutlook()}</div>`;
  else if(tab==='cash') body = kpis(a) + `<div class="agrid">${cardCashflow(a)}${cardCompare(a)}${cashTable(a)}</div>`;
  else if(tab==='aus') body = `<div class="agrid">${cardStructure(a)}${cardNeeds(a)}${cardMerchants(a)}${cardRecent(a)}${report(a)}</div>`;
  else body = `<div class="agrid">${cardCredit()}${cardDebts()}</div>`;
  return `<div class="stabs">${STAB.map(([k,l])=>`<button class="${k===tab?'on':''}" data-act="atab2" data-t="${k}">${l}</button>`).join('')}</div>${body}${perSheet()}`;
};
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act="atab2"],[data-act="psopen"]'); if(!a) return; e.stopPropagation();
  if(a.dataset.act==='atab2'){ S.atab2 = a.dataset.t; scrollTo(0,0); } else S.psOpen = !S.psOpen;
  render();
}, true);
document.addEventListener('change', e=>{
  if(e.target.id!=='apfrom' && e.target.id!=='apto') return; const f = $('#apfrom').value, t = $('#apto').value;
  if(f && t && f<=t){ S.ap = {p:'c', from:f, to:t}; render(); }
});
// Link «Mehr anzeigen» vom Kontostand-Trend öffnet direkt den Reiter Saldo
document.addEventListener('click', e=>{ const g = e.target.closest('[data-go="statistik"]'); if(g) S.atab2 = g.dataset.tab ? (g.dataset.tab==='bal' ? 'saldo' : g.dataset.tab) : (g.closest('.dash') ? 'saldo' : g.closest('.xcard')?.querySelector('h3')?.textContent==='Ausgabenstruktur' ? 'aus' : (S.atab2||'saldo')); }, true);
FAB_VIEWS.splice(FAB_VIEWS.indexOf('statistik'), 1);
