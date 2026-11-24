/* =====================================================================
   63. BUDGETPLANUNG NEU GEGLIEDERT
   Einkommen (Lohn + Nebeneinkommen, aufklappbar) · Differenz · Ausgaben total (aufklappbar) ·
   Rückstellung Jahreskosten (gleichmässig) · Jahresbudget · sicher kommende Abgaben.
   D.income[ym] bleibt das Total (alle Rechnungen nutzen es weiter); Nebeneinkommen liegen in
   D.incSide = [{id, name, plan:{ym:betrag}}], der Lohn ist Total minus Nebeneinkommen.
   ===================================================================== */
var isSum = ym => (D.incSide||[]).reduce((a,s)=>a+(+(s.plan?.[ym])||0),0);
var lohnOf = ym => Math.max(0, (D.income[ym]||0) - isSum(ym));
var setLohn = (m,v) => { D.income[m] = r2(Math.max(0,v) + isSum(m)); };
var setSide = (s,m,v) => { const old = +(s.plan[m])||0; if(v) s.plan[m] = r2(v); else delete s.plan[m]; D.income[m] = r2(Math.max(0, (D.income[m]||0) + (v||0) - old)); };

// Auf- und Zuklappen pro Gerät merken
var B_OPEN0 = {inc:true, out:true, rueck:true, abg:false, jb:false};
var bOpen = () => { if(S.bopen) return S.bopen; let o = {}; try{ o = JSON.parse(bLS('bopen')||'{}'); }catch(e){} return S.bopen = {...B_OPEN0, ...o}; };
var bSetOpen = (k,v) => { const o = bOpen(); o[k] = v; bLSset('bopen', JSON.stringify(o)); };
document.addEventListener('toggle', e=>{ const d = e.target; if(d?.dataset?.bo) bSetOpen(d.dataset.bo, d.open); }, true);
var bDet = (k, sumHtml, body, cls='card mt') => `<details class="${cls} bdet" data-bo="${k}" ${(bOpen()[k] ?? B_OPEN0[k] ?? true) ? 'open' : ''}><summary>${sumHtml}</summary>${body}</details>`;

function incDialog(id, ym){
  D.incSide ??= [];
  const isNew = id==='new', isL = id==='_lohn', s = isNew ? {id:'is'+uid(), name:'', plan:{}} : D.incSide.find(x=>x.id===id);
  if(!isL && !s) return;
  const cur = isL ? lohnOf(ym) : (+(s.plan[ym])||0);
  dialog(`<h3>${isL?'Lohn netto':isNew?'Nebeneinkommen hinzufügen':esc(s.name)}</h3>
    ${isL?'':`<label class="f">Bezeichnung<input id="isn" value="${esc(s.name)}" maxlength="40" placeholder="z. B. Nebenjob, Vermietung, Kinderzulagen, Zinsen"></label>`}
    <label class="f">Betrag pro Monat (CHF)<input id="isv" inputmode="decimal" value="${cur?fmt0.format(cur):''}" placeholder="0" style="font-size:22px;font-weight:650"></label>
    <fieldset class="scope"><legend class="small muted">Gilt für</legend>
      <label><input type="radio" name="isc" value="one" ${isNew?'':'checked'}> nur ${ymLabel(ym)}</label>
      <label><input type="radio" name="isc" value="fwd" ${isNew?'checked':''}> ${ymLabel(ym)} und alle folgenden Monate</label>
      <label><input type="radio" name="isc" value="year"> ganzes Jahr ${ym.slice(0,4)}</label></fieldset>
    ${isL?'':'<p class="small muted">Wird zum Einkommen gezählt – in der Differenz, im Ausblick und in der Prognose.</p>'}
    ${acts(isNew||isL)}`,
  k=>{
    if(k==='del'){ for(const m of Object.keys(s.plan)) setSide(s, m, 0); D.incSide = D.incSide.filter(x=>x!==s); markDel(s.id); return; }
    const v = parseNum(val('isv')); if(isNaN(v) || v<0){ $('#isv').style.borderColor='var(--bad)'; return false; }
    if(!isL){ const n = val('isn').trim(); if(!n){ $('#isn').style.borderColor='var(--bad)'; return false; } s.name = n.slice(0,40); if(isNew) D.incSide.push(s); }
    const sc = document.querySelector('input[name=isc]:checked').value;
    const targets = sc==='one' ? [ym] : sc==='fwd' ? C.months.filter(m=>m>=ym) : C.months.filter(m=>m.startsWith(ym.slice(0,4)));
    for(const m of (targets.length?targets:[ym])) isL ? setLohn(m, v) : setSide(s, m, v);
  });
}
// Direkte Eingabe in den Feldern (Lohn, Nebeneinkommen)
document.addEventListener('change', e=>{
  const el = e.target, c = el?.dataset?.cell; if(!c || !D || !(c==='_lohn' || c.startsWith('_is:'))) return;
  e.stopPropagation();
  const v = parseNum(el.value||'0'); if(isNaN(v) || v<0){ el.style.color='var(--bad)'; return; }
  const ym = el.dataset.ym;
  if(c==='_lohn') setLohn(ym, v); else { const s = (D.incSide||[]).find(x=>x.id===c.slice(4)); if(!s) return; setSide(s, ym, v); }
  save(); render();
}, true);

/* ---- Rückstellung Jahreskosten ---- */
var RK_SUG = ['Steuern','Serafe (Radio & TV)','Haftpflicht & Hausrat','Motorfahrzeugsteuer','Autoversicherung','Halbtax / GA','Zahnarzt & Dentalhygiene','Mitgliedschaften'];
function rkCard(){
  const items = [...D.yearly].sort((a,b)=>a.month-b.month), fast = !!D.settings.rueckFast;
  const ver = items.filter(x=>x.mode==='verteilt'), tot = items.reduce((a,x)=>a+x.amount,0), perM = ver.reduce((a,x)=>a+x.amount/12,0);
  const ms = Array.from({length:12},(_,i)=>ymAdd(TODAY,i)).filter(m=>C.m[m]);
  const bal = ms.map(m=>({m, v:C.m[m].acc?.rueck?.end})).filter(x=>x.v!=null), low = bal.slice().sort((a,b)=>a.v-b.v)[0], now = C.m[TODAY]?.acc?.rueck;
  const have = new Set(items.map(x=>bkNorm(x.name).split(' ')[0]));
  const sug = RK_SUG.filter(n=>!have.has(bkNorm(n).split(' ')[0]));
  const chip = (v,l) => `<button class="chip ${(v==='fast')===fast?'on':''}" data-act="rkmode" data-v="${v}">${l}</button>`;
  const sum = `<span class="chev"></span><div class="sp"><h3>Rückstellung Jahreskosten</h3><div class="small muted">${items.length?`${items.length} Posten · CHF ${chf0(tot)} pro Jahr`:'Noch keine Jahreskosten erfasst'}</div></div>
    <div class="bsr"><b class="num">CHF ${chf0(perM)}</b><div class="small muted">pro Monat zurücklegen</div></div>`;
  const body = `<div class="chips rkch" style="padding:0;margin:4px 0 8px">${chip('even','Gleichmässig (1/12 pro Monat)')}${chip('fast','Bis zur ersten Fälligkeit ansparen')}</div>
    ${items.length?`<table class="rktab"><thead><tr><th>Posten</th><th class="num">pro Jahr</th><th class="num">pro Monat</th></tr></thead><tbody>
      ${items.map(x=>`<tr data-act="edityearly" data-id="${x.id}" class="click"><td>${esc(x.name)}<div class="small muted">fällig im ${MN[x.month-1]} · ${x.mode==='verteilt'?'aus der Rückstellung':'aus dem Budget '+esc(catName(x.cat))}</div></td><td class="num">${chf0(x.amount)}</td><td class="num">${x.mode==='verteilt'?chf0(x.amount/12):'–'}</td></tr>`).join('')}
      <tr class="tot"><td>Total</td><td class="num">${chf0(tot)}</td><td class="num">${chf0(perM)}</td></tr></tbody></table>`:'<p class="small muted">Alles, was nicht jeden Monat kommt – Steuern, Versicherungen, Serafe, Abos pro Jahr –, hier erfassen. Die App legt jeden Monat gleich viel zurück, so gibt es keine Überraschung.</p>'}
    ${now?`<p class="small" style="margin:8px 0 0">Rückstellungskonto Ende ${ymLabel(TODAY)}: <b class="num">CHF ${chf0(now.end)}</b>${low && low.v<-0.5?` · <span class="neg">im ${ymLabel(low.m)} fehlen CHF ${chf0(-low.v)}</span> – einmalig einzahlen oder «Bis zur ersten Fälligkeit ansparen» wählen.`:low?' · reicht für alle Fälligkeiten der nächsten 12 Monate.':''}</p>`:''}
    <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:10px"><button class="btn sm pri" data-act="addyearly">+ Jahreskosten</button>${sug.slice(0,6).map(n=>`<button class="chip" data-act="rkadd" data-n="${esc(n)}">+ ${esc(n)}</button>`).join('')}</div>
    <p class="small muted" style="margin:8px 0 0">Achte darauf, dass dieselben Kosten nicht zusätzlich als Monatsbudget stehen.</p>`;
  return bDet('rueck', sum, body);
}

/* ---- Sicher kommende Abgaben (nächste 12 Monate) ---- */
var ABG_K = {bill:'Rechnung', pend:'vorgemerkt', plan:'geplant', yearly:'Jahreskosten', fix:'feste Kosten (Budget)', rec:'wiederkehrend'};
function abgCard(){
  let list = [];
  try{ list = fcEvents(dAdd(todayIso(), 365)).list.filter(x=>x.v>0 && ABG_K[x.k] && !x.move && !(typeof fcIsMove==='function' && fcIsMove(x))); }catch(e){ list = []; }
  const byM = {}; for(const x of list) (byM[x.d.slice(0,7)] ??= []).push(x);
  const tot = list.reduce((a,x)=>a+x.v,0), exact = list.filter(x=>!x.est).reduce((a,x)=>a+x.v,0);
  const sum = `<span class="chev"></span><div class="sp"><h3>Sicher kommende Abgaben</h3><div class="small muted">nächste 12 Monate · ${list.length} Zahlungen</div></div>
    <div class="bsr"><b class="num">CHF ${chf0(tot)}</b><div class="small muted">davon genau CHF ${chf0(exact)}</div></div>`;
  const body = list.length ? Object.keys(byM).sort().map(m=>{ const L = byM[m], s = L.reduce((a,x)=>a+x.v,0);
      return `<div class="abgm"><div class="row"><b class="sp">${ymLabel(m)}</b><b class="num">CHF ${chf0(s)}</b></div>
        ${L.map(x=>`<div class="abgr ${x.est?'est':''}" ${x.go?`data-go="${x.go}"`:''}><span class="small muted">${+x.d.slice(8)}.</span><span class="sp">${esc(x.n)} <span class="small muted">· ${x.est?'geschätzt':'genau'} · ${ABG_K[x.k]}</span></span><span class="num">${x.est?'('+chf0(x.v)+')':chf0(x.v)}</span></div>`).join('')}</div>`; }).join('')
    + '<p class="small muted" style="margin:8px 0 0">Genau = Rechnungen, Vormerkungen und geplante Zahlungen. Geschätzt (in Klammern) = feste Kosten und Jahreskosten aus deinem Budget. Überträge zwischen deinen Konten fehlen bewusst.</p>'
    : '<p class="small muted">Keine bekannten Zahlungen in den nächsten 12 Monaten.</p>';
  return bDet('abg', sum, body);
}

/* ---- Jahresbudget ---- */
function jbCard(y){
  const ms = C.months.filter(m=>m.startsWith(y)); if(!ms.length) return '';
  const S2 = f => ms.reduce((a,m)=>a+(f(C.m[m])||0),0), inc = S2(m=>m.inc), out = S2(m=>m.out), side = ms.reduce((a,m)=>a+isSum(m),0);
  const gr = Object.entries(GROUPS).map(([g,G])=>({g,G,v:S2(m=>m.g[g])})).filter(x=>x.v);
  const sum = `<span class="chev"></span><div class="sp"><h3>Jahresbudget ${y}</h3><div class="small muted">${ms.length<12?`${ymShort(ms[0])}–${ymShort(ms.at(-1))} · `:''}Einkommen ${chf0(inc)} · Ausgaben ${chf0(out)}</div></div>
    <div class="bsr"><b class="num ${inc-out<-0.5?'neg':'in'}">CHF ${chf0(inc-out)}</b><div class="small muted">Differenz</div></div>`;
  const body = `<div class="jbl"><div class="row"><span class="sp">Lohn netto</span><b class="num">${chf0(inc-side)}</b></div>
    ${(D.incSide||[]).map(s=>{ const v = ms.reduce((a,m)=>a+(+(s.plan[m])||0),0); return v?`<div class="row"><span class="sp">${esc(s.name)}</span><b class="num">${chf0(v)}</b></div>`:''; }).join('')}
    <div class="row jbt"><span class="sp">Einkommen</span><b class="num">${chf0(inc)}</b></div>
    ${gr.map(x=>`<div class="row"><span class="sp"><span class="dot" style="background:${x.G.c}"></span>${x.G.n}</span><b class="num">${chf0(x.v)}</b><span class="small muted jbp">${pct(x.v/(inc||1))}</span></div>`).join('')}
    <div class="row jbt"><span class="sp">Ausgaben total</span><b class="num">${chf0(out)}</b></div>
    <div class="row jbt"><span class="sp">Differenz</span><b class="num ${inc-out<-0.5?'neg':'in'}">${chf0(inc-out)}</b></div>
    <p class="small muted" style="margin:6px 0 0">Ø pro Monat: Einkommen ${chf0(inc/ms.length)} · Ausgaben ${chf0(out/ms.length)} · Differenz ${chf0((inc-out)/ms.length)}</p></div>`;
  return bDet('jb', sum, body);
}

/* ---- Monat bearbeiten ---- */
vBudgetMonat = function(tabs){
  const ym=S.ym, m=C.m[ym];
  if(!m) return head('Budget '+ymLabel(ym),'',tabs)+`<div class="card">Für ${ymLabel(ym)} gibt es noch kein Budget. <button class="btn sm pri" data-act="newyear" data-y="${ym.slice(0,4)}">Budget ${ym.slice(0,4)} anlegen</button></div>`;
  const y=ym.slice(0,4), op = bOpen();
  const row = c => { const plan=D.plan[c.id]?.[ym]||0, yc=m.yc.cats[c.id]||0, ist=C.ist[c.id]?.[ym], tot=plan+yc;
    const used = ist!=null && tot>0 ? ist/tot : null, col = used==null?'':used>1.001?'var(--bad)':used>0.85?'var(--warn)':'var(--ok)';
    return `<div class="brow2">
      <div class="bname" ${c.id==='rueck'?'data-go="jahr"':`data-act="budedit" data-c="${c.id}" data-ym="${ym}"`}><span>${esc(c.name)} <span class="mchev">›</span></span>${c.acc&&c.id!=='rueck'?`<span class="small muted">→ ${esc(accName(c.acc))}</span>`:''}${yc&&c.id!=='rueck'?`<span class="small muted">+ CHF ${chf0(yc)} aus Jahreskosten</span>`:''}${c.id==='rueck'?'<span class="small muted">gleichmässig für Jahresrechnungen zurückgelegt</span>':''}</div>
      ${c.id==='rueck' ? `<div class="bauto"><b class="num">CHF ${chf0(yc)}</b><span class="small muted">automatisch</span></div>`
        : `<label class="bamt"><span class="small muted">CHF</span><input class="amtin cell" data-cell="${c.id}" data-ym="${ym}" value="${plan?fmt0.format(plan):''}" placeholder="0" inputmode="decimal" aria-label="Budget ${esc(c.name)}"></label>`}
      <div class="bist ${ist==null?'noist':''}">${ist!=null?`<div class="small"><span class="muted">Ausgegeben</span> <b class="num" style="color:${col}">${chf0(ist)}</b></div><div class="bar"><i style="width:${Math.min(100,(used||0)*100)}%;background:${col}"></i></div>`:'<span class="small muted">noch keine Ausgaben</span>'}</div>
      ${c.id==='rueck' ? '<button class="btn sm ghost" data-go="jahr">Jahreskosten …</button>' : `<button class="btn sm ghost" data-act="budedit" data-c="${c.id}" data-ym="${ym}" title="Mehr Optionen">Ändern …</button>`}</div>`; };
  const incRow = (id, name, v, cell, note='') => `<div class="brow2"><div class="bname" data-act="incedit" data-id="${id}" data-ym="${ym}"><span>${esc(name)} <span class="mchev">›</span></span>${note}</div>
      <label class="bamt"><span class="small muted">CHF</span><input class="amtin cell" data-cell="${cell}" data-ym="${ym}" value="${v?fmt0.format(v):''}" placeholder="0" inputmode="decimal" aria-label="${esc(name)}"></label><div class="bist"></div>
      <button class="btn sm ghost" data-act="incedit" data-id="${id}" data-ym="${ym}">Ändern …</button></div>`;
  const side = (D.incSide||[]).filter(s=>s.plan[ym] || Object.keys(s.plan).some(k=>k.startsWith(y)));
  const incHtml = bDet('inc', `<span class="chev"></span><div class="sp"><h3>Einkommen</h3><div class="small muted">Lohn${side.length?` + ${side.length} Nebeneinkommen`:''}${m.incIst!=null?` · erhalten CHF ${chf0(m.incIst)}`:''}</div></div><div class="bsr"><b class="num">CHF ${chf0(m.inc)}</b><div class="small muted">pro Monat</div></div>`,
    incRow('_lohn','Lohn netto', lohnOf(ym), '_lohn') + side.map(s=>incRow(s.id, s.name, +(s.plan[ym])||0, '_is:'+s.id, '<span class="small muted">Nebeneinkommen</span>')).join('')
    + `<div style="padding:8px 0 2px"><button class="btn sm" data-act="incedit" data-id="new" data-ym="${ym}">+ Nebeneinkommen</button></div>`);
  const d = m.inc - m.out, spar = (m.g.spar||0) + (m.g.schulden||0);
  const diffHtml = `<div class="card mt bdiff"><div class="bdrow"><div><span class="small muted">Einkommen</span><b class="num">${chf0(m.inc)}</b></div><span class="op">−</span><div><span class="small muted">Ausgaben</span><b class="num">${chf0(m.out)}</b></div><span class="op">=</span>
      <div><span class="small muted">Differenz</span><b class="num ${d<-0.5?'neg':d>0.5?'in':''}">${chf0(d)}</b></div></div>
    <p class="small ${d<-0.5?'neg':'muted'}" style="margin:8px 0 0">${d<-0.5?`Du hast CHF ${chf0(-d)} mehr verplant, als du einnimmst. Kürze eine Kategorie oder plane ein Nebeneinkommen.`:d>50?`CHF ${chf0(d)} sind noch nicht verteilt – z. B. aufs Sparen legen.`:'Alles verteilt.'}${m.inc?` Sparen & Schuldenabbau: ${pct(spar/m.inc)} vom Einkommen.`:''}</p></div>`;
  let groups = '';
  for(const [g,G] of Object.entries(GROUPS)){
    const cs=D.cats.filter(c=>c.group===g && !isEmptyCat(c.id,y)); if(!cs.length) continue;
    groups += bDet('g_'+g, `<span class="chev"></span><span class="dot" style="background:${G.c}"></span><div class="sp"><h3>${G.n}</h3><div class="small muted">${G.d}</div></div>
      <div class="bsr"><b class="num">CHF ${chf0(m.g[g])}</b><div class="small muted">${pct(m.g[g]/(m.inc||1))} vom Einkommen</div></div>`, cs.map(row).join(''), 'bsub');
  }
  const outHtml = bDet('out', `<span class="chev"></span><div class="sp"><h3>Ausgaben total</h3><div class="small muted">inkl. Sparen, Schuldenabbau und Rückstellung</div></div><div class="bsr"><b class="num">CHF ${chf0(m.out)}</b><div class="small muted">${pct(m.out/(m.inc||1))} vom Einkommen</div></div>`, groups);
  return head('Budget '+ymLabel(ym), 'Betrag direkt ins Feld tippen. Über «Ändern …» bzw. den Namen antippen gilt ein Betrag auch für alle folgenden Monate. Bereiche lassen sich auf- und zuklappen.', tabs+'<button class="btn sm" data-act="addcat">+ Kategorie</button>')
    + incHtml + diffHtml + outHtml + rkCard() + jbCard(y) + abgCard() + emptyNote(y);
};

/* ---- Jahresübersicht ---- */
vBudgetJahr = function(tabs){
  const y=S.year, ms=vis(C.months.filter(m=>m.startsWith(y)));
  if(!ms.length) return head('Jahresübersicht '+y,'',tabs)+`<div class="card">Kein Budget für ${y}. <button class="btn sm pri" data-act="newyear" data-y="${y}">Budget ${y} anlegen</button></div>`;
  const cur = m => m===TODAY?'cur':'', open=S.yopen||Object.fromEntries(Object.keys(GROUPS).map(g=>[g,true])), op = bOpen();
  const sumY = f => ms.reduce((s,m)=>s+f(m),0), fmtv = v => v ? chf0(v) : '–';
  const cells = (f, cls='') => ms.map(m=>`<td class="num ${cur(m)} ${cls}">${fmtv(f(m))}</td>`).join('') + `<td class="num tot">${chf0(sumY(f))}</td>`;
  const ecells = (id, f) => ms.map(m=>`<td class="num click ${cur(m)}" data-act="incedit" data-id="${id}" data-ym="${m}" title="Klicken zum Ändern">${fmtv(f(m))}</td>`).join('') + `<td class="num tot">${chf0(sumY(f))}</td>`;
  const chev = o => `<span class="chev">${o?'▾':'▸'}</span>`, first = ms.find(m=>m>=TODAY)||ms[0];
  let rows = `<tr class="yinc ytog" data-act="btog" data-k="inc"><td>${chev(op.inc)}Einkommen</td>${cells(m=>C.m[m].inc)}</tr>`;
  if(op.inc){ rows += `<tr class="ycat"><td>Lohn netto</td>${ecells('_lohn', lohnOf)}</tr>`;
    for(const s of (D.incSide||[]).filter(s=>ms.some(m=>s.plan[m]))) rows += `<tr class="ycat"><td>${esc(s.name)}</td>${ecells(s.id, m=>+(s.plan[m])||0)}</tr>`;
    rows += `<tr class="ycat"><td><a class="link" data-act="incedit" data-id="new" data-ym="${first}">+ Nebeneinkommen</a></td>${ms.map(()=>'<td></td>').join('')}<td></td></tr>`; }
  rows += `<tr class="yrest ydiff"><td>Differenz</td>${ms.map(m=>`<td class="num ${cur(m)} ${C.m[m].rest<-0.5?'neg':'in'}">${chf0(C.m[m].rest)}</td>`).join('')}<td class="num tot ${sumY(m=>C.m[m].rest)<-0.5?'neg':'in'}">${chf0(sumY(m=>C.m[m].rest))}</td></tr>`;
  rows += `<tr class="yinc ytog yout" data-act="btog" data-k="out"><td>${chev(op.out)}Ausgaben total</td>${cells(m=>C.m[m].out)}</tr>`;
  if(op.out) for(const [g,G] of Object.entries(GROUPS)){
    const cs=D.cats.filter(c=>c.group===g && !isEmptyCat(c.id,y)); if(!cs.length) continue;
    rows += `<tr class="ygrp" data-act="ytoggle" data-g="${g}"><td>${chev(open[g])}<span class="dot" style="background:${G.c}"></span>${G.n}</td>${cells(m=>C.m[m].g[g])}</tr>`;
    if(open[g]) for(const c of cs) rows += `<tr class="ycat"><td>${esc(c.name)}</td>${ms.map(m=>{ const pl=C.m[m].plan[c.id]||0, ist=C.ist[c.id]?.[m], over=ist!=null&&ist>pl+0.5;
        return c.id==='rueck' ? `<td class="num ${cur(m)}" data-go="jahr" title="automatisch aus den Jahreskosten">${fmtv(pl)}</td>` : `<td class="num click ${cur(m)} ${over?'over':''}" data-act="budedit" data-c="${c.id}" data-ym="${m}" title="${ist!=null?'Ausgegeben: CHF '+chf0(ist)+' · ':''}Klicken zum Ändern">${fmtv(pl)}</td>`; }).join('')}<td class="num tot">${chf0(sumY(m=>C.m[m].plan[c.id]||0))}</td></tr>`;
  }
  const allOpen = Object.keys(GROUPS).every(g=>open[g]) && op.inc && op.out;
  return head('Jahresübersicht '+y, 'Das ganze Jahr auf einen Blick. Einen Betrag anklicken, um ihn zu ändern (auch für Folgemonate). Einkommen, Ausgaben und Gruppen lassen sich zuklappen.', tabs+`<button class="btn sm" data-act="ball">${allOpen?'Alle zuklappen':'Alle aufklappen'}</button><button class="btn sm" data-act="newyear" data-y="${+y+1}">Budget ${+y+1} anlegen</button>`) +
    oldNote() + `<div class="card ytable"><table><colgroup><col class="cname">${ms.map(()=>'<col>').join('')}<col></colgroup><thead><tr><th>Kategorie</th>${ms.map(m=>`<th class="${cur(m)}">${ymShort(m)}</th>`).join('')}<th class="tot">${ms.length<12?ymShort(ms[0])+"–"+ymShort(ms.at(-1)):"Jahr"}</th></tr></thead><tbody>${rows}</tbody></table></div>`
    + rkCard() + jbCard(y) + abgCard() + emptyNote(y);
};

document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act]'); if(!a || !D) return; const k = a.dataset.act;
  if(k==='incedit'){ e.stopPropagation(); incDialog(a.dataset.id, a.dataset.ym || S.ym || TODAY); }
  else if(k==='btog'){ e.stopPropagation(); bSetOpen(a.dataset.k, !bOpen()[a.dataset.k]); render(); }
  else if(k==='ball'){ e.stopPropagation(); const open = S.yopen||Object.fromEntries(Object.keys(GROUPS).map(g=>[g,true])), o = bOpen(), all = Object.keys(GROUPS).every(g=>open[g]) && o.inc && o.out;
    S.yopen = Object.fromEntries(Object.keys(GROUPS).map(g=>[g,!all])); bSetOpen('inc', !all); bSetOpen('out', !all); render(); }
  else if(k==='rkmode'){ e.stopPropagation(); D.settings.rueckFast = a.dataset.v==='fast'; save(); render(); }
  else if(k==='rkadd'){ e.stopPropagation(); yearlyDialog(null); const n = $('#yn'); if(n){ n.value = a.dataset.n; setTimeout(()=>$('#ya')?.focus(), 40); } }
}, true);

// Abgleich zwischen Geräten: Nebeneinkommen wie die übrige Planung (neuerer Stand gewinnt), gelöschte bleiben weg
mergeData = (prev => function(local, remote){
  const out = prev(local, remote); if(out?.incSide && out.del){ const del = new Set(out.del); out.incSide = out.incSide.filter(x=>!del.has(x.id)); } return out;
})(mergeData);

// Excel-Import setzt das Einkommen aus der Lohnzeile – Nebeneinkommen bleiben dazu erhalten
xlsxApply2 = (prev => function(...args){
  const before = {...(D.income||{})}, r = prev.apply(this, args);
  let ch = false; for(const m in D.income){ if(D.income[m]!==before[m] && isSum(m)){ D.income[m] = r2(D.income[m] + isSum(m)); ch = true; } }
  bkRenameSwc(); if(ch){ save(); render(); }
  return r;
})(xlsxApply2);

// «Swisscom» heisst neu «Internet und TV»
function bkRenameSwc(d){ d ||= D; let n = 0; for(const c of d?.cats||[]) if(!c.wid && /swisscom/i.test(c.name||'')){ c.name = 'Internet und TV'; n++; } return n; }
migrate = (prev => function(d){ const r = prev(d); try{ if(r && !r.flags?.swc1){ bkRenameSwc(r); (r.flags ??= {}).swc1 = true; } }catch(e){} return r; })(migrate);
