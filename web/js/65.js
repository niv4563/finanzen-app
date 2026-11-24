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
BS[3].n = 'Will – nicht budgetiert'; BS[3].d = 'Restaurant, Freizeit, Anschaffungen, Ferien. Kein Budget – bezahlt aus dem, was frei bleibt.';
BS[0].d = 'Miete, Versicherungen, Steuern, Abos mit Vertrag, Schulden. Muss sicher im Budget stehen – fix, wird nicht gesteuert.';
BS[2].d = 'Lebensmittel, Arbeitsweg, Körperpflege. Je nach Situation anpassen.';
// Muss · Brauch · Will zuweisen. Will hat kein Budget: Beträge ab diesem Monat werden zur Seite gelegt und bei «Brauch»/«Muss» wiederhergestellt.
function setNeed(c, v){
  if(!c || !MBW[v]) return; const was = bSec(c).k; c.need = v; const now = bSec(c).k;
  if(now==='will' && was!=='will'){ const p = D.plan[c.id] || {}; c.willBak = {...(c.willBak||{})};
    for(const m of Object.keys(p)) if(m>=TODAY && p[m]){ c.willBak[m] = p[m]; delete p[m]; } }
  else if(was==='will' && now!=='will' && c.willBak){ D.plan[c.id] ??= {}; for(const [m,v2] of Object.entries(c.willBak)) if(m>=TODAY && !D.plan[c.id][m]) D.plan[c.id][m] = v2; delete c.willBak; }
}
migrate = (prev => function(d){ const r = prev(d); try{ if(r && !r.flags?.will1){ const D0 = D; D = r; for(const c of r.cats) if(c.group!=='spar' && c.id!=='rueck' && needOfCat(c)==='will'){ const p = r.plan[c.id]||{}; c.willBak = {...(c.willBak||{})}; for(const m of Object.keys(p)) if(m>=TODAY && p[m]){ c.willBak[m] = p[m]; delete p[m]; } } D = D0; (r.flags ??= {}).will1 = true; } }catch(e){} return r; })(migrate);
// Vorschlag für einen fehlenden Muss-Betrag: regelmässige Zahlung (auf den Monat gerechnet) oder Ø der letzten Monate
function mussSug(c, ym){
  const r = (typeof rcAll==='function' ? rcAll() : []).find(x=>x.cat===c.id || bhKey(x.cat)===c.id);
  if(r) return Math.round(r.amount / ({M:1,Q:3,H:6,J:12}[r.freq]||1));
  const l = [1,2,3,4,5,6].map(i=>C.ist[c.id]?.[ymAdd(ym,-i)]).filter(v=>v!=null && v>0); return l.length ? Math.round(l.reduce((a,b)=>a+b,0)/l.length) : 0;
}
var mbwSel = c => (c.group==='spar' || c.id==='rueck') ? '' : `<span class="mbwsel" title="Muss · Brauch · Will">${['muss','brauch','will'].map(v=>`<button class="${bSec(c).k===v?'on '+v:''}" data-act="bneed" data-c="${c.id}" data-v="${v}" aria-label="${MBW[v].n}">${MBW[v].n}</button>`).join('')}</span>`;
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act="bneed"],[data-act="setneed"],[data-act="mussfill"],[data-act="mussfillall"]'); if(!a || !D) return; e.stopPropagation(); e.preventDefault();
  const k = a.dataset.act;
  if(k==='bneed' || k==='setneed'){ const c = D.cats.find(x=>x.id===(a.dataset.c||a.dataset.id)); if(!c) return; const was = bSec(c).k; setNeed(c, a.dataset.v); save(); render();
    if(was!==bSec(c).k) toastMsg(`${c.name}: ${MBW[bSec(c).k]?.n || 'Sparen'}${bSec(c).k==='will'?' – nicht mehr im Budget':''}`); return; }
  const fill = (c, ym, v) => { D.plan[c.id] ??= {}; for(const m of C.months.filter(m=>m>=ym)) if(!D.plan[c.id][m]) D.plan[c.id][m] = v; };
  if(k==='mussfill'){ const c = D.cats.find(x=>x.id===a.dataset.c); if(c){ fill(c, a.dataset.ym, +a.dataset.v); save(); render(); } }
  if(k==='mussfillall'){ const ym = a.dataset.ym; let n = 0; for(const c of D.cats.filter(c=>bSec(c).k==='muss' && c.id!=='rueck' && !isEmptyCat(c.id, ym.slice(0,4)))) if(!C.months.filter(x=>x.startsWith(ym.slice(0,4))).some(x=>(C.m[x]?.plan?.[c.id]||0)>0)){ const v = mussSug(c, ym); if(v){ fill(c, ym, v); n++; } } save(); render(); toastMsg(n+' Muss-Beträge übernommen'); }
}, true);
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
    const yPl = C.months.filter(x=>x.startsWith(y)).reduce((t,x)=>t+(C.m[x]?.plan?.[c.id]||0),0);
    if(!plan && yPl>0 && c.id!=='rueck') return `<div class="brow2 bfix"><div class="bname" data-act="budedit" data-c="${c.id}" data-ym="${ym}"><span>${esc(c.name)} ${kl(c.id)}</span>${mbwSel(c)}<span class="small muted">diesen Monat nichts fällig · ${y}: CHF ${chf0(yPl)}</span></div>
        <div class="bauto"><b class="num">CHF 0</b><span class="small muted">fix</span></div><div class="bist"></div>
        <button class="btn sm ghost" data-act="budedit" data-c="${c.id}" data-ym="${ym}">Betrag ändern …</button></div>`;
    if(!plan && c.id!=='rueck'){ const sg = mussSug(c, ym);
      return `<div class="brow2 bfix bmiss"><div class="bname"><span>${esc(c.name)} ${kl(c.id)}</span>${mbwSel(c)}<span class="small" style="color:var(--bad)">Fehlt im Budget – Muss muss sicher drin sein</span></div>
        <div class="bauto"><b class="num">CHF 0</b><span class="small muted">fehlt</span></div>
        <div class="bist">${sg?`<button class="btn sm pri" data-act="mussfill" data-c="${c.id}" data-ym="${ym}" data-v="${sg}">CHF ${chf0(sg)} übernehmen</button>`:''}</div>
        <button class="btn sm ghost" data-act="budedit" data-ok="1" data-c="${c.id}" data-ym="${ym}">Betrag eingeben …</button></div>`; }
    return `<div class="brow2 bfix"><div class="bname" ${c.id==='rueck'?'data-go="jahr"':`data-act="budedit" data-c="${c.id}" data-ym="${ym}"`}><span>${esc(c.name)} ${kl(c.id)}</span>${mbwSel(c)}${note?`<span class="small muted">${note}</span>`:''}${warn?`<span class="small" style="color:var(--warn)">Effektiv weicht ab – Betrag prüfen</span>`:''}</div>
      <div class="bauto"><b class="num">CHF ${chf0(plan)}</b><span class="small muted">fix</span></div>
      <div class="bist">${ist!=null?`<div class="small"><span class="muted">Bezahlt</span> <b class="num">${chf0(ist)}</b></div>`:'<span class="small muted">noch nicht bezahlt</span>'}</div>
      ${c.id==='rueck'?'<button class="btn sm ghost" data-go="jahr">Jahreskosten …</button>':`<button class="btn sm ghost" data-act="budedit" data-c="${c.id}" data-ym="${ym}">Betrag ändern …</button>`}</div>`; };
  const editRow = c => { const plan = D.plan[c.id]?.[ym]||0, yc = m.yc.cats[c.id]||0;
    return `<div class="brow2"><div class="bname" data-act="budedit" data-ok="1" data-c="${c.id}" data-ym="${ym}"><span>${esc(c.name)} <span class="mchev">›</span></span>${yc?`<span class="small muted">+ CHF ${chf0(yc)} aus Jahreskosten</span>`:''}</div>
      <label class="bamt"><span class="small muted">CHF</span><input class="amtin cell" data-cell="${c.id}" data-ym="${ym}" value="${plan?fmt0.format(plan):''}" placeholder="0" inputmode="decimal" aria-label="Budget ${esc(c.name)}"></label>
      <div class="bist">${istTxt(c, plan+yc)}</div>
      <button class="btn sm ghost" data-act="budedit" data-ok="1" data-c="${c.id}" data-ym="${ym}">Ändern …</button></div>`; };
  const editRow2 = c => editRow(c).replace(/(<span>[^<]*<span class="mchev">›<\/span><\/span>)/, `$1${kl(c.id)}${mbwSel(c)}`);
  const willIst = c => Math.max(0, C.ist[c.id]?.[ym] || 0);
  const willRow = c => { const ist = willIst(c), l = [1,2,3].map(i=>C.ist[c.id]?.[ymAdd(ym,-i)]).filter(v=>v!=null), avg = l.length ? l.reduce((a,b)=>a+b,0)/l.length : null;
    return `<div class="brow2 bwill"><div class="bname"><span>${esc(c.name)} ${kl(c.id)}</span>${mbwSel(c)}${avg!=null?`<span class="small muted">Ø letzte 3 Monate CHF ${chf0(avg)}</span>`:''}</div>
      <div class="bauto"><b class="num">–</b><span class="small muted">kein Budget</span></div>
      <div class="bist"><div class="small"><span class="muted">${ym===TODAY?'Bisher':'Ausgegeben'}</span> <b class="num">${chf0(ist)}</b></div></div><span></span></div>`; };
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
  const pM = P('muss'), pS = P('spar'), pB = P('brauch'), iW = D.cats.filter(c=>bSec(c).k==='will').reduce((s,c)=>s+willIst(c),0), frei = m.inc - pM - pS - pB, rest = frei - iW;
  const miss = D.cats.filter(c=>bSec(c).k==='muss' && c.id!=='rueck' && !isEmptyCat(c.id,y) && !C.months.filter(x=>x.startsWith(y)).some(x=>(C.m[x]?.plan?.[c.id]||0)>0));
  const line = (l, v, cls='', sub='') => `<div class="bfl ${cls}"><span>${l}${sub?`<em>${sub}</em>`:''}</span><b class="num">${v<0?'−':''}${chf0(Math.abs(v))}</b></div>`;
  const flow = `<div class="card mt bflow"><h3 style="margin:0 0 6px">So verteilt sich dein Einkommen</h3>
    ${line('Einkommen', m.inc)}${line('− Muss (fix)', -pM, 'neg2', 'nicht steuerbar')}${line('− Sparen & Vorsorge', -pS, 'neg2')}
    ${line('− Brauch geplant', -pB, 'neg2', 'je nach Situation')}
    ${line('= Frei für Will', frei, 'sum '+(frei<-0.5?'neg':''), 'kein Budget')}${line(ym===TODAY?'− Will bisher ausgegeben':'− Will ausgegeben', -iW, 'neg2')}
    ${line(ym<TODAY?'= Übrig geblieben':'= Noch frei', rest, 'sum '+(rest<-0.5?'neg':rest>0.5?'in':''))}
    <p class="small ${frei<-0.5||rest<-0.5?'neg':'muted'}" style="margin:8px 0 0">${frei<-0.5?`Muss, Sparen und Brauch brauchen schon CHF ${chf0(-frei)} mehr als das Einkommen – Brauch kürzen, Muss bleibt fix.`:rest<-0.5?`Für Will wurde CHF ${chf0(-rest)} mehr ausgegeben, als frei war.`:`Für Will ${ym<TODAY?'blieben':'sind noch'} CHF ${chf0(rest)} frei.`}${m.inc?` Muss ${pct(pM/m.inc)} · Sparen ${pct(pS/m.inc)} · Brauch ${pct(pB/m.inc)} · Will ${pct(iW/m.inc)} vom Einkommen.`:''}</p>
    ${miss.length?`<div class="hint mt" style="background:color-mix(in srgb,var(--bad) 10%,var(--card))"><b>${miss.length} Muss-Posten ohne Budget:</b> ${miss.map(c=>esc(c.name)).join(', ')}. Muss gehört sicher ins Budget. <button class="btn sm pri" data-act="mussfillall" data-ym="${ym}">Vorschläge übernehmen</button></div>`:''}</div>`;
  // Bereiche
  let secs = '';
  for(const s of BS){
    const cs = D.cats.filter(c=>bSec(c)===s && !isEmptyCat(c.id,y)); if(!cs.length) continue;
    const sum = s.k==='will' ? iW : P(s.k);
    secs += bDet('s_'+s.k, `<span class="dot" style="background:${s.c}"></span><div class="sp"><h3>${s.n}</h3><div class="small muted">${s.d}</div></div>
      <div class="bsr"><b class="num">CHF ${chf0(sum)}</b><div class="small muted">${s.k==='will'?(ym===TODAY?'bisher ausgegeben':'ausgegeben'):pct(sum/(m.inc||1))+' vom Einkommen'}</div></div>`,
      cs.sort((a,b)=>s.k==='will' ? willIst(b)-willIst(a) : ((m.plan[b.id]||0)-(m.plan[a.id]||0))).map(s.fix ? fixRow : s.k==='will' ? willRow : editRow2).join(''), 'card mt bsec'+(s.fix?' bsfix':''));
  }
  return head('Budget '+ymLabel(ym), 'Muss steht sicher im Budget und ist fix. Brauch passt du je nach Situation an. Will hat kein Budget – bezahlt wird aus dem, was frei bleibt. Mit M · B · W bei jeder Kategorie ordnest du sie zu.', tabs+'<button class="btn sm" data-act="addcat">+ Kategorie</button>')
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
  rows += `<tr class="ycat ysub"><td>− Brauch</td>${cells(m=>secV(m, BS[2]))}</tr>`;
  const restY = m => C.m[m].inc - BS.slice(0,3).reduce((t,s)=>t+secV(m,s),0);
  rows += `<tr class="yrest ydiff"><td>Frei für Will</td>${ms.map(m=>`<td class="num ${cur(m)} ${restY(m)<-0.5?'neg':'in'}">${chf0(restY(m))}</td>`).join('')}<td class="num tot ${sumY(restY)<-0.5?'neg':'in'}">${chf0(sumY(restY))}</td></tr>`;
  rows += `<tr class="yinc ytog yout" data-act="btog" data-k="out"><td>${chev(op.out)}Ausgaben geplant (ohne Will)</td>${cells(m=>BS.slice(0,3).reduce((t,s)=>t+secV(m,s),0))}</tr>`;
  if(op.out) for(const s of BS){
    const cs = D.cats.filter(c=>bSec(c)===s && !isEmptyCat(c.id,y)); if(!cs.length) continue; const o = op['s_'+s.k] ?? true;
    rows += `<tr class="ygrp ytog" data-act="btog" data-k="s_${s.k}"><td>${chev(o)}<span class="dot" style="background:${s.c}"></span>${s.n.split(' – ')[0]}${s.fix?' <span class="small muted">fix</span>':s.k==='will'?' <span class="small muted">kein Budget · effektiv</span>':''}</td>${s.k==='will'?ms.map(m=>`<td class="num ${cur(m)}">${m<=TODAY?fmtv(cs.reduce((t,c)=>t+Math.max(0,C.ist[c.id]?.[m]||0),0)):''}</td>`).join('')+`<td class="num tot">${chf0(sumY(m=>m<=TODAY?cs.reduce((t,c)=>t+Math.max(0,C.ist[c.id]?.[m]||0),0):0))}</td>`:cells(m=>secV(m,s))}</tr>`;
    if(o && s.k==='will') for(const c of cs) rows += `<tr class="ycat yfix"><td>${esc(c.name)} <span class="small muted">effektiv</span></td>${ms.map(m=>`<td class="num ${cur(m)}">${m<=TODAY?fmtv(Math.max(0,C.ist[c.id]?.[m]||0)):''}</td>`).join('')}<td class="num tot">${chf0(sumY(m=>m<=TODAY?Math.max(0,C.ist[c.id]?.[m]||0):0))}</td></tr>`;
    else if(o) for(const c of cs) rows += `<tr class="ycat ${s.fix?'yfix':''}"><td>${esc(c.name)}</td>${ms.map(m=>{ const pl = catV(m,c), ist = C.ist[c.id]?.[m], over = !s.fix && ist!=null && ist>pl+0.5;
        return c.id==='rueck' ? `<td class="num ${cur(m)}" data-go="jahr" title="automatisch aus den Jahreskosten">${fmtv(pl)}</td>`
          : `<td class="num click ${cur(m)} ${over?'over':''}" data-act="budedit" ${s.fix?'':'data-ok="1"'} data-c="${c.id}" data-ym="${m}" title="${ist!=null?'Effektiv: CHF '+chf0(ist)+' · ':''}${s.fix?'fix – nur bewusst ändern':'Klicken zum Ändern'}">${fmtv(pl)}</td>`; }).join('')}<td class="num tot">${chf0(sumY(m=>catV(m,c)))}</td></tr>`;
  }
  const allOpen = op.inc && op.out && BS.every(s=>op['s_'+s.k] ?? true);
  return head('Jahresübersicht '+y, 'Einkommen, davon fix (Muss & Sparen), Brauch und was für Will frei bleibt. Will hat kein Budget, hier steht, was effektiv ausgegeben wurde.', tabs+`<button class="btn sm" data-act="ball2">${allOpen?'Alle zuklappen':'Alle aufklappen'}</button><button class="btn sm" data-act="newyear" data-y="${+y+1}">Budget ${+y+1} anlegen</button>`)
    + oldNote() + `<div class="card ytable"><table><colgroup><col class="cname">${ms.map(()=>'<col>').join('')}<col></colgroup><thead><tr><th>Kategorie</th>${ms.map(m=>`<th class="${cur(m)}">${ymShort(m)}</th>`).join('')}<th class="tot">${ms.length<12?ymShort(ms[0])+'–'+ymShort(ms.at(-1)):'Jahr'}</th></tr></thead><tbody>${rows}</tbody></table></div>`
    + rkCard() + jbCard(y) + abgCard() + emptyNote(y);
};
document.addEventListener('click', e=>{ const a = e.target.closest('[data-act="ball2"]'); if(!a || !D) return; e.stopPropagation();
  const o = bOpen(), all = o.inc && o.out && BS.every(s=>o['s_'+s.k] ?? true);
  for(const k of ['inc','out', ...BS.map(s=>'s_'+s.k)]) bSetOpen(k, !all); render(); }, true);
