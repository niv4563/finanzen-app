/* =====================================================================
   67. BUDGET NACH MUSS · SPAREN · BRAUCH · WILL
   • «Plan bearbeiten» ist neu gegliedert: Einkommen → was fix weggeht (Muss, Sparen) → was frei bleibt
     → was du steuerst (Brauch, Will).
   • Muss-Beträge (Miete, Versicherungen, Steuern, Abos mit Vertrag, Schulden, Rückstellung) sind fix:
     kein Eingabefeld, Ändern nur bewusst über «Betrag ändern …» (z. B. neue Miete).
   • Muss wird nirgends gesteuert: keine Tagesbudgets, Warnungen, Wochengrenzen oder Spartipps dafür.
   ===================================================================== */
var BS = [
  {k:'muss',   n:'Muss – fixe Pflichtkosten', d:'Miete, Versicherungen, Steuern, Abos mit Vertrag, Schulden. Fix – wird nicht gesteuert.', c:'#e34948', fix:true, t:c=>c.group!=='spar' && needOfCat(c)==='muss'},
  {k:'spar',   n:'Sparen & Vorsorge',         d:'Reserve, Säule 3a, Ziele – zuerst zur Seite legen.', c:'var(--spar)', t:c=>c.group==='spar'},
  {k:'brauch', n:'Brauch – nötig, beeinflussbar', d:'Lebensmittel, Arbeitsweg, Körperpflege. Hier steuerst du.', c:'#eda100', t:c=>c.group!=='spar' && needOfCat(c)==='brauch'},
  {k:'will',   n:'Will – frei',               d:'Restaurant, Freizeit, Anschaffungen, Ferien. Hier steuerst du am meisten.', c:'#1baf7a', t:c=>c.group!=='spar' && needOfCat(c)==='will'},
];
var bSec = c => (c.id==='rueck' ? BS[0] : BS.find(s=>s.t(c))) || BS[2];
var isMuss = id => { const c = D.cats.find(x=>x.id===id); return !!c && bSec(c).k==='muss'; };
var bSum = (m, k) => D.cats.filter(c=>bSec(c).k===k).reduce((s,c)=>s+(m.cats?.[c.id] ?? m.plan?.[c.id] ?? 0),0);
var bPlanSum = (m, k) => D.cats.filter(c=>bSec(c).k===k).reduce((s,c)=>s+(m.plan?.[c.id]||0),0);

/* ---- Muss wird nicht gesteuert ---- */
daily = (prev => function(ym=TODAY){
  const d = prev(ym); if(!d) return d;
  d.cats = d.cats.filter(x=>bSec(x.c).k!=='muss');
  d.plan = d.cats.reduce((t,x)=>t+x.plan,0); d.ist = d.cats.reduce((t,x)=>t+x.ist,0); d.rest = d.plan-d.ist;
  d.perDay = Math.max(0,d.rest)/d.left; d.hasIst = d.cats.some(x=>x.ist>0); return d;
})(daily);
if(typeof recommendations==='function') recommendations = (prev => function(){ const r = prev.apply(this, arguments);
  const mn = new Set(D.cats.filter(c=>bSec(c).k==='muss').map(c=>`«${c.name}» wird regelmässig überschritten`));
  return Array.isArray(r) ? r.filter(x=>!mn.has(x.t)) : r; })(recommendations);

/* ---- Muss-Betrag nur bewusst ändern ---- */
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act="budedit"]'); if(!a || !D || a.dataset.ok || !isMuss(a.dataset.c) || a.dataset.c==='rueck') return;
  e.stopPropagation(); e.preventDefault();
  const c = a.dataset.c, ym = a.dataset.ym || S.ym || TODAY, cur = D.plan[c]?.[ym] || 0;
  dialog(`<h3>${esc(catName(c))}</h3><p>Das ist ein <b>fixer Muss-Betrag</b> (CHF ${chf0(cur)} pro Monat). Er wird nicht gesteuert und bleibt Monat für Monat gleich.</p>
    <p class="small muted">Nur ändern, wenn sich der Betrag wirklich geändert hat – z. B. neue Miete, neue Prämie, Abo gekündigt.</p>
    <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Betrag ändern …</button></div>`,
    k=>{ if(k==='ok') setTimeout(()=>budgetDialog(c, ym), 30); });
}, true);

/* ---- Monat bearbeiten ---- */
vBudgetMonat = function(tabs){
  const ym = S.ym, m = C.m[ym];
  if(!m) return head('Budget '+ymLabel(ym),'',tabs)+`<div class="card">Für ${ymLabel(ym)} gibt es noch kein Budget. <button class="btn sm pri" data-act="newyear" data-y="${ym.slice(0,4)}">Budget ${ym.slice(0,4)} anlegen</button></div>`;
  const y = ym.slice(0,4), rcs = (typeof rcAll==='function') ? rcAll() : [];
  const kl = id => `<a class="link katl" data-act="katinfo" data-c="${id}">Übersicht ›</a>`;
  const istTxt = (c, plan) => { const ist = C.ist[c.id]?.[ym]; if(ist==null) return '<span class="small muted">noch nichts gebucht</span>';
    const used = plan>0 ? ist/plan : null, col = used==null?'':used>1.001?'var(--bad)':used>0.85?'var(--warn)':'var(--ok)';
    return `<div class="small"><span class="muted">Ausgegeben</span> <b class="num" style="color:${col}">${chf0(ist)}</b></div><div class="bar"><i style="width:${Math.min(100,(used||0)*100)}%;background:${col}"></i></div>`; };
  const fixRow = c => { const plan = (D.plan[c.id]?.[ym]||0) + (m.yc.cats[c.id]||0), ist = C.ist[c.id]?.[ym];
    const r = rcs.find(x=>x.cat===c.id || bhKey(x.cat)===c.id), last3 = [1,2,3].map(i=>C.ist[c.id]?.[ymAdd(ym,-i)]).filter(v=>v!=null), avg = last3.length ? last3.reduce((a,b)=>a+b,0)/last3.length : null;
    const note = c.id==='rueck' ? 'gleichmässig für Jahresrechnungen zurückgelegt' : r ? `regelmässig ${freqName(r.freq).toLowerCase()} ~CHF ${chf0(r.amount)}` : avg!=null ? `Ø letzte 3 Monate CHF ${chf0(avg)}` : '';
    const warn = avg!=null && plan>0 && Math.abs(avg-plan) > Math.max(20, plan*0.1) && c.id!=='rueck';
    return `<div class="brow2 bfix"><div class="bname" ${c.id==='rueck'?'data-go="jahr"':`data-act="budedit" data-c="${c.id}" data-ym="${ym}"`}><span>${esc(c.name)} ${kl(c.id)}</span>${note?`<span class="small muted">${note}</span>`:''}${warn?`<span class="small" style="color:var(--warn)">Effektiv weicht ab – Betrag prüfen</span>`:''}</div>
      <div class="bauto"><b class="num">CHF ${chf0(plan)}</b><span class="small muted">fix</span></div>
      <div class="bist">${ist!=null?`<div class="small"><span class="muted">Bezahlt</span> <b class="num">${chf0(ist)}</b></div>`:'<span class="small muted">noch nicht bezahlt</span>'}</div>
      ${c.id==='rueck'?'<button class="btn sm ghost" data-go="jahr">Jahreskosten …</button>':`<button class="btn sm ghost" data-act="budedit" data-c="${c.id}" data-ym="${ym}">Betrag ändern …</button>`}</div>`; };
  const editRow = c => { const plan = D.plan[c.id]?.[ym]||0, yc = m.yc.cats[c.id]||0;
    return `<div class="brow2"><div class="bname" data-act="budedit" data-ok="1" data-c="${c.id}" data-ym="${ym}"><span>${esc(c.name)} <span class="mchev">›</span></span>${yc?`<span class="small muted">+ CHF ${chf0(yc)} aus Jahreskosten</span>`:''}</div>
      <label class="bamt"><span class="small muted">CHF</span><input class="amtin cell" data-cell="${c.id}" data-ym="${ym}" value="${plan?fmt0.format(plan):''}" placeholder="0" inputmode="decimal" aria-label="Budget ${esc(c.name)}"></label>
      <div class="bist">${istTxt(c, plan+yc)}</div>
      <button class="btn sm ghost" data-act="budedit" data-ok="1" data-c="${c.id}" data-ym="${ym}">Ändern …</button></div>`; };
  const editRow2 = c => editRow(c).replace(/(<span>[^<]*<span class="mchev">›<\/span><\/span>)/, `$1${kl(c.id)}`);
  // Einkommen
  const side = (D.incSide||[]).filter(s=>s.plan[ym] || Object.keys(s.plan).some(k=>k.startsWith(y)));
  const incRow = (id, name, v, cell, note='') => `<div class="brow2"><div class="bname" data-act="incedit" data-id="${id}" data-ym="${ym}"><span>${esc(name)} <span class="mchev">›</span></span>${note}</div>
      <label class="bamt"><span class="small muted">CHF</span><input class="amtin cell" data-cell="${cell}" data-ym="${ym}" value="${v?fmt0.format(v):''}" placeholder="0" inputmode="decimal" aria-label="${esc(name)}"></label><div class="bist"></div>
      <button class="btn sm ghost" data-act="incedit" data-id="${id}" data-ym="${ym}">Ändern …</button></div>`;
  const incHtml = bDet('inc', `<span class="chev"></span><div class="sp"><h3>Einkommen</h3><div class="small muted">Lohn${side.length?` + ${side.length} Nebeneinkommen`:''}${m.incIst!=null?` · erhalten CHF ${chf0(m.incIst)}`:''}</div></div><div class="bsr"><b class="num">CHF ${chf0(m.inc)}</b><div class="small muted">pro Monat</div></div>`,
    incRow('_lohn','Lohn netto', lohnOf(ym), '_lohn') + side.map(s=>incRow(s.id, s.name, +(s.plan[ym])||0, '_is:'+s.id, '<span class="small muted">Nebeneinkommen</span>')).join('')
    + `<div style="padding:8px 0 2px"><button class="btn sm" data-act="incedit" data-id="new" data-ym="${ym}">+ Nebeneinkommen</button></div>`);
  // Übersicht: was fix weggeht, was frei bleibt
  const P = k => bPlanSum(m, k);   // m.plan enthält Jahreskosten und Rückstellung schon
  const pM = P('muss'), pS = P('spar'), pB = P('brauch'), pW = P('will'), frei = m.inc - pM - pS, rest = frei - pB - pW;
  const line = (l, v, cls='', sub='') => `<div class="bfl ${cls}"><span>${l}${sub?`<em>${sub}</em>`:''}</span><b class="num">${v<0?'−':''}${chf0(Math.abs(v))}</b></div>`;
  const flow = `<div class="card mt bflow"><h3 style="margin:0 0 6px">So verteilt sich dein Einkommen</h3>
    ${line('Einkommen', m.inc)}${line('− Muss (fix)', -pM, 'neg2', 'nicht steuerbar')}${line('− Sparen & Vorsorge', -pS, 'neg2')}
    ${line('= Frei für Brauch & Will', frei, 'sum')}${line('− Brauch geplant', -pB, 'neg2')}${line('− Will geplant', -pW, 'neg2')}
    ${line('= Noch nicht verteilt', rest, 'sum '+(rest<-0.5?'neg':rest>0.5?'in':''))}
    <p class="small ${rest<-0.5?'neg':'muted'}" style="margin:8px 0 0">${rest<-0.5?`Brauch und Will sind um CHF ${chf0(-rest)} zu hoch geplant – dort kürzen, Muss bleibt fix.`:rest>50?`CHF ${chf0(rest)} sind noch frei – z. B. mehr sparen.`:'Alles verteilt.'}${m.inc?` Muss ${pct(pM/m.inc)} · Sparen ${pct(pS/m.inc)} · Brauch ${pct(pB/m.inc)} · Will ${pct(pW/m.inc)} vom Einkommen.`:''}</p></div>`;
  // Bereiche
  let secs = '';
  for(const s of BS){
    const cs = D.cats.filter(c=>bSec(c)===s && !isEmptyCat(c.id,y)); if(!cs.length) continue;
    const sum = P(s.k);
    secs += bDet('s_'+s.k, `<span class="dot" style="background:${s.c}"></span><div class="sp"><h3>${s.n}</h3><div class="small muted">${s.d}</div></div>
      <div class="bsr"><b class="num">CHF ${chf0(sum)}</b><div class="small muted">${pct(sum/(m.inc||1))} vom Einkommen</div></div>`,
      cs.sort((a,b)=>((m.plan[b.id]||0)-(m.plan[a.id]||0))).map(s.fix ? fixRow : editRow2).join(''), 'card mt bsec'+(s.fix?' bsfix':''));
  }
  return head('Budget '+ymLabel(ym), 'Muss-Beträge sind fix. Steuern kannst du Brauch und Will: Betrag direkt ins Feld tippen oder über «Ändern …» auch für die folgenden Monate. Bereiche lassen sich zuklappen.', tabs+'<button class="btn sm" data-act="addcat">+ Kategorie</button>')
    + incHtml + flow + secs + rkCard() + jbCard(y) + abgCard() + emptyNote(y)
    + `<p class="small muted">Welche Kategorie Muss, Brauch oder Will ist, legst du unter <a class="link" data-go="mbw">Muss · Brauch · Will</a> fest.</p>`;
};

/* ---- Jahresübersicht ---- */
vBudgetJahr = function(tabs){
  const y = S.year, ms = vis(C.months.filter(m=>m.startsWith(y)));
  if(!ms.length) return head('Jahresübersicht '+y,'',tabs)+`<div class="card">Kein Budget für ${y}. <button class="btn sm pri" data-act="newyear" data-y="${y}">Budget ${y} anlegen</button></div>`;
  const cur = m => m===TODAY?'cur':'', op = bOpen(), fmtv = v => v ? chf0(v) : '–', sumY = f => ms.reduce((s,m)=>s+f(m),0);
  const cells = f => ms.map(m=>`<td class="num ${cur(m)}">${fmtv(f(m))}</td>`).join('') + `<td class="num tot">${chf0(sumY(f))}</td>`;
  const ecells = (id, f) => ms.map(m=>`<td class="num click ${cur(m)}" data-act="incedit" data-id="${id}" data-ym="${m}" title="Klicken zum Ändern">${fmtv(f(m))}</td>`).join('') + `<td class="num tot">${chf0(sumY(f))}</td>`;
  const chev = o => `<span class="chev">${o?'▾':'▸'}</span>`, first = ms.find(m=>m>=TODAY)||ms[0];
  const catV = (m, c) => C.m[m].plan[c.id]||0;
  const secV = (m, s) => D.cats.filter(c=>bSec(c)===s).reduce((t,c)=>t+catV(m,c),0);
  let rows = `<tr class="yinc ytog" data-act="btog" data-k="inc"><td>${chev(op.inc)}Einkommen</td>${cells(m=>C.m[m].inc)}</tr>`;
  if(op.inc){ rows += `<tr class="ycat"><td>Lohn netto</td>${ecells('_lohn', lohnOf)}</tr>`;
    for(const s of (D.incSide||[]).filter(s=>ms.some(m=>s.plan[m]))) rows += `<tr class="ycat"><td>${esc(s.name)}</td>${ecells(s.id, m=>+(s.plan[m])||0)}</tr>`;
    rows += `<tr class="ycat"><td><a class="link" data-act="incedit" data-id="new" data-ym="${first}">+ Nebeneinkommen</a></td>${ms.map(()=>'<td></td>').join('')}<td></td></tr>`; }
  const fixY = m => secV(m, BS[0]) + secV(m, BS[1]);
  rows += `<tr class="ycat ysub"><td>− Muss & Sparen (fix)</td>${cells(fixY)}</tr>`;
  rows += `<tr class="yrest ydiff"><td>Frei für Brauch & Will</td>${ms.map(m=>`<td class="num ${cur(m)}">${chf0(C.m[m].inc-fixY(m))}</td>`).join('')}<td class="num tot">${chf0(sumY(m=>C.m[m].inc-fixY(m)))}</td></tr>`;
  const restY = m => C.m[m].inc - BS.reduce((t,s)=>t+secV(m,s),0);
  rows += `<tr class="yrest"><td>Noch nicht verteilt</td>${ms.map(m=>`<td class="num ${cur(m)} ${restY(m)<-0.5?'neg':'in'}">${chf0(restY(m))}</td>`).join('')}<td class="num tot ${sumY(restY)<-0.5?'neg':'in'}">${chf0(sumY(restY))}</td></tr>`;
  rows += `<tr class="yinc ytog yout" data-act="btog" data-k="out"><td>${chev(op.out)}Ausgaben total (geplant)</td>${cells(m=>BS.reduce((t,s)=>t+secV(m,s),0))}</tr>`;
  if(op.out) for(const s of BS){
    const cs = D.cats.filter(c=>bSec(c)===s && !isEmptyCat(c.id,y)); if(!cs.length) continue; const o = op['s_'+s.k] ?? true;
    rows += `<tr class="ygrp ytog" data-act="btog" data-k="s_${s.k}"><td>${chev(o)}<span class="dot" style="background:${s.c}"></span>${s.n.split(' – ')[0]}${s.fix?' <span class="small muted">fix</span>':''}</td>${cells(m=>secV(m,s))}</tr>`;
    if(o) for(const c of cs) rows += `<tr class="ycat ${s.fix?'yfix':''}"><td>${esc(c.name)}</td>${ms.map(m=>{ const pl = catV(m,c), ist = C.ist[c.id]?.[m], over = !s.fix && ist!=null && ist>pl+0.5;
        return c.id==='rueck' ? `<td class="num ${cur(m)}" data-go="jahr" title="automatisch aus den Jahreskosten">${fmtv(pl)}</td>`
          : `<td class="num click ${cur(m)} ${over?'over':''}" data-act="budedit" ${s.fix?'':'data-ok="1"'} data-c="${c.id}" data-ym="${m}" title="${ist!=null?'Effektiv: CHF '+chf0(ist)+' · ':''}${s.fix?'fix – nur bewusst ändern':'Klicken zum Ändern'}">${fmtv(pl)}</td>`; }).join('')}<td class="num tot">${chf0(sumY(m=>catV(m,c)))}</td></tr>`;
  }
  const allOpen = op.inc && op.out && BS.every(s=>op['s_'+s.k] ?? true);
  return head('Jahresübersicht '+y, 'Einkommen, davon fix (Muss & Sparen), was frei bleibt und wie du Brauch und Will verteilst. Muss-Beträge sind fix und nur bewusst änderbar.', tabs+`<button class="btn sm" data-act="ball2">${allOpen?'Alle zuklappen':'Alle aufklappen'}</button><button class="btn sm" data-act="newyear" data-y="${+y+1}">Budget ${+y+1} anlegen</button>`)
    + oldNote() + `<div class="card ytable"><table><colgroup><col class="cname">${ms.map(()=>'<col>').join('')}<col></colgroup><thead><tr><th>Kategorie</th>${ms.map(m=>`<th class="${cur(m)}">${ymShort(m)}</th>`).join('')}<th class="tot">${ms.length<12?ymShort(ms[0])+'–'+ymShort(ms.at(-1)):'Jahr'}</th></tr></thead><tbody>${rows}</tbody></table></div>`
    + rkCard() + jbCard(y) + abgCard() + emptyNote(y);
};
document.addEventListener('click', e=>{ const a = e.target.closest('[data-act="ball2"]'); if(!a || !D) return; e.stopPropagation();
  const o = bOpen(), all = o.inc && o.out && BS.every(s=>o['s_'+s.k] ?? true);
  for(const k of ['inc','out', ...BS.map(s=>'s_'+s.k)]) bSetOpen(k, !all); render(); }, true);
