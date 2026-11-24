/* =====================================================================
   68. BUDGET NACH GRUPPEN: GRUNDBEDÜRFNISSE · FIXKOSTEN · SPAREN · PERSÖNLICHE WÜNSCHE · FREIZEIT
   • «Plan bearbeiten» und Jahresübersicht sind nach diesen fünf Gruppen gegliedert.
     Schuldenabbau (Raten, Kreditkarte) zählt zu den Fixkosten.
   • Muss · Brauch · Will bleibt als Markierung bei jeder Kategorie:
     Muss ist fix (nur bewusst ändern, muss im Budget stehen), Brauch und Will frei anpassbar.
   • Alle Gruppen haben wieder ein Budget – auch Persönliche Wünsche und Freizeit.
   ===================================================================== */
// «Persönliche Wünsche» ist intern eine Freizeit-Kategorie mit Merkmal wsub – so zählen sie in allen
// bisherigen Auswertungen (Tagesbudget, Budgetseite, Prognose) weiter wie Freizeit.
GROUPS.leben.n = 'Grundbedürfnisse'; GROUPS.leben.d = 'Lebensmittel, Körperpflege, Kleidung, Gesundheit, Haushalt';
GROUPS.freizeit.n = 'Freizeit'; GROUPS.freizeit.d = 'Hobbys, Restaurant, Ausgang, Ferien, Abos';
var GS = [
  {k:'leben',  n:'Grundbedürfnisse',     t:c=>c.group==='leben',                      c:'var(--leben)'},
  {k:'fix',    n:'Fixkosten',            t:c=>c.group==='fix' || c.group==='schulden', c:'var(--fix)'},
  {k:'spar',   n:'Sparen & Vorsorge',    t:c=>c.group==='spar',                       c:'var(--spar)'},
  {k:'wunsch', n:'Persönliche Wünsche',  t:c=>c.group==='freizeit' && !!c.wsub,       c:'#9b6bd6'},
  {k:'frei',   n:'Freizeit',             t:c=>c.group==='freizeit' && !c.wsub,        c:'var(--frei)'},
];
GS[0].d = GROUPS.leben.d; GS[1].d = 'Miete, Versicherungen, Steuern, Abos mit Vertrag, Rückstellung, Schuldenabbau'; GS[2].d = 'Reserve, Eigenheim, Säule 3a, Investieren';
GS[3].d = 'Anschaffungen, Shopping, Geschenke'; GS[4].d = GROUPS.freizeit.d;
var gSec = c => GS.find(s=>s.t(c)) || GS[4];
var wsubFix = () => { for(const c of (D?.cats||[])){ if(c.group==='wunsch'){ c.group = 'freizeit'; c.wsub = true; } else if(c.group!=='freizeit' && c.wsub) delete c.wsub; } };
save = (prev => function(){ try{ wsubFix(); }catch(e){} return prev.apply(this, arguments); })(save);
// Gruppe wählen: «Persönliche Wünsche» als eigene Auswahl
catDialog = (prev => function(c){
  prev(c); const sel = $('#cg'); if(!sel) return;
  const fo = sel.querySelector('option[value="freizeit"]'); if(fo) fo.textContent = 'Freizeit';
  sel.querySelector('option[value="freizeit"]')?.insertAdjacentHTML('beforebegin', `<option value="wunsch">Persönliche Wünsche</option>`);
  if(c?.group==='freizeit' && c.wsub) sel.value = 'wunsch';
  sel.addEventListener('change', ()=>{ if(c && sel.value==='freizeit') delete c.wsub; });
})(catDialog);
// Will hat wieder ein Budget: Zuweisen ändert nur die Markierung
setNeed = function(c, v){ if(c && MBW[v]) c.need = v; };
var WUNSCH_RX = /wünsch|wunsch|anschaff|shopping|geschenk|elektronik|möbel|einricht|gadget/i;
migrate = (prev => function(d){ const r = prev(d); try{ if(r){ r.flags ??= {};
  if(!r.flags.grp5){ for(const c of r.cats) if(c.group==='freizeit' && WUNSCH_RX.test(c.name||'')) c.wsub = true; r.flags.grp5 = true; }
  for(const c of r.cats) if(c.group==='wunsch'){ c.group = 'freizeit'; c.wsub = true; }
  if(!r.flags.will2){ for(const c of r.cats) if(c.willBak){ r.plan[c.id] ??= {}; for(const [m,v] of Object.entries(c.willBak)) if(!r.plan[c.id][m]) r.plan[c.id][m] = v; delete c.willBak; } r.flags.will2 = true; }
} }catch(e){} return r; })(migrate);

/* ---- Monat bearbeiten ---- */
vBudgetMonat = function(tabs){
  const ym = S.ym, m = C.m[ym];
  if(!m) return head('Budget '+ymLabel(ym),'',tabs)+`<div class="card">Für ${ymLabel(ym)} gibt es noch kein Budget. <button class="btn sm pri" data-act="newyear" data-y="${ym.slice(0,4)}">Budget ${ym.slice(0,4)} anlegen</button></div>`;
  const y = ym.slice(0,4), rcs = (typeof rcAll==='function') ? rcAll() : [];
  const kl = id => `<a class="link katl" data-act="katinfo" data-c="${id}">Übersicht ›</a>`;
  const istTxt = (c, plan) => { const ist = C.ist[c.id]?.[ym]; if(ist==null) return '<span class="small muted">noch nichts gebucht</span>';
    const used = plan>0 ? ist/plan : null, col = used==null?'':used>1.001?'var(--bad)':used>0.85?'var(--warn)':'var(--ok)';
    return `<div class="small"><span class="muted">Ausgegeben</span> <b class="num" style="color:${col}">${chf0(ist)}</b></div><div class="bar"><i style="width:${Math.min(100,(used||0)*100)}%;background:${col}"></i></div>`; };
  const yPlan = c => C.months.filter(x=>x.startsWith(y)).reduce((t,x)=>t+(C.m[x]?.plan?.[c.id]||0),0);
  const fixRow = c => { const plan = (D.plan[c.id]?.[ym]||0) + (m.yc.cats[c.id]||0), ist = C.ist[c.id]?.[ym];
    const r = rcs.find(x=>x.cat===c.id || bhKey(x.cat)===c.id), last3 = [1,2,3].map(i=>C.ist[c.id]?.[ymAdd(ym,-i)]).filter(v=>v!=null), avg = last3.length ? last3.reduce((a,b)=>a+b,0)/last3.length : null;
    const note = c.id==='rueck' ? 'gleichmässig für Jahresrechnungen zurückgelegt' : r ? `regelmässig ${freqName(r.freq).toLowerCase()} ~CHF ${chf0(r.amount)}` : avg!=null ? `Ø letzte 3 Monate CHF ${chf0(avg)}` : '';
    const warn = avg!=null && plan>0 && Math.abs(avg-plan) > Math.max(20, plan*0.1) && c.id!=='rueck', yPl = yPlan(c);
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
    return `<div class="brow2"><div class="bname" data-act="budedit" data-ok="1" data-c="${c.id}" data-ym="${ym}"><span>${esc(c.name)} <span class="mchev">›</span></span>${kl(c.id)}${mbwSel(c)}${yc?`<span class="small muted">+ CHF ${chf0(yc)} aus Jahreskosten</span>`:''}</div>
      <label class="bamt"><span class="small muted">CHF</span><input class="amtin cell" data-cell="${c.id}" data-ym="${ym}" value="${plan?fmt0.format(plan):''}" placeholder="0" inputmode="decimal" aria-label="Budget ${esc(c.name)}"></label>
      <div class="bist">${istTxt(c, plan+yc)}</div>
      <button class="btn sm ghost" data-act="budedit" data-ok="1" data-c="${c.id}" data-ym="${ym}">Ändern …</button></div>`; };
  const row = c => (isMuss(c.id) || c.id==='rueck') ? fixRow(c) : editRow(c);
  // Einkommen
  const side = (D.incSide||[]).filter(s=>s.plan[ym] || Object.keys(s.plan).some(k=>k.startsWith(y)));
  const incRow = (id, name, v, cell, note='') => `<div class="brow2"><div class="bname" data-act="incedit" data-id="${id}" data-ym="${ym}"><span>${esc(name)} <span class="mchev">›</span></span>${note}</div>
      <label class="bamt"><span class="small muted">CHF</span><input class="amtin cell" data-cell="${cell}" data-ym="${ym}" value="${v?fmt0.format(v):''}" placeholder="0" inputmode="decimal" aria-label="${esc(name)}"></label><div class="bist"></div>
      <button class="btn sm ghost" data-act="incedit" data-id="${id}" data-ym="${ym}">Ändern …</button></div>`;
  const incHtml = bDet('inc', `<span class="chev"></span><div class="sp"><h3>Einkommen</h3><div class="small muted">Lohn${side.length?` + ${side.length} Nebeneinkommen`:''}${m.incIst!=null?` · erhalten CHF ${chf0(m.incIst)}`:''}</div></div><div class="bsr"><b class="num">CHF ${chf0(m.inc)}</b><div class="small muted">pro Monat</div></div>`,
    incRow('_lohn','Lohn netto', lohnOf(ym), '_lohn') + side.map(s=>incRow(s.id, s.name, +(s.plan[ym])||0, '_is:'+s.id, '<span class="small muted">Nebeneinkommen</span>')).join('')
    + `<div style="padding:8px 0 2px"><button class="btn sm" data-act="incedit" data-id="new" data-ym="${ym}">+ Nebeneinkommen</button></div>`);
  // Übersicht
  const P = s => D.cats.filter(c=>gSec(c)===s).reduce((t,c)=>t+(m.plan?.[c.id]||0),0);   // m.plan enthält Jahreskosten und Rückstellung schon
  const sums = GS.map(P), tot = sums.reduce((a,b)=>a+b,0), diff = m.inc - tot;
  const miss = D.cats.filter(c=>isMuss(c.id) && c.id!=='rueck' && !isEmptyCat(c.id,y) && !yPlan(c));
  const line = (l, v, cls='', sub='') => `<div class="bfl ${cls}"><span>${l}${sub?`<em>${sub}</em>`:''}</span><b class="num">${v<0?'−':''}${chf0(Math.abs(v))}</b></div>`;
  const flow = `<div class="card mt bflow"><h3 style="margin:0 0 6px">So verteilt sich dein Einkommen</h3>
    ${line('Einkommen', m.inc)}${GS.map((s,i)=>line('− '+s.n, -sums[i], 'neg2', m.inc?pct(sums[i]/m.inc):'')).join('')}
    ${line(diff<-0.5?'= Zu viel verplant':'= Noch nicht verteilt', diff, 'sum '+(diff<-0.5?'neg':diff>0.5?'in':''))}
    <p class="small ${diff<-0.5?'neg':'muted'}" style="margin:8px 0 0">${diff<-0.5?`Das Budget braucht CHF ${chf0(-diff)} mehr als das Einkommen – bei Grundbedürfnissen, Wünschen oder Freizeit kürzen, Muss-Beträge bleiben fix.`:diff>0.5?`CHF ${chf0(diff)} sind noch keiner Gruppe zugeteilt – z. B. Sparen erhöhen.`:'Das Einkommen ist ganz verteilt.'}</p>
    ${miss.length?`<div class="hint mt" style="background:color-mix(in srgb,var(--bad) 10%,var(--card))"><b>${miss.length} Muss-Posten ohne Budget:</b> ${miss.map(c=>esc(c.name)).join(', ')}. Muss gehört sicher ins Budget. <button class="btn sm pri" data-act="mussfillall" data-ym="${ym}">Vorschläge übernehmen</button></div>`:''}</div>`;
  // Gruppen
  let secs = '';
  GS.forEach((s,i)=>{
    const cs = D.cats.filter(c=>gSec(c)===s && !isEmptyCat(c.id,y));
    const body = cs.length ? cs.sort((a,b)=>(m.plan[b.id]||0)-(m.plan[a.id]||0)).map(row).join('')
      : `<p class="small muted" style="margin:8px 0">Noch keine Kategorie in dieser Gruppe. Bei einer Kategorie «Ändern …» → «Kategorie umbenennen / Gruppe ändern» oder <a class="link" data-act="addcat">neue Kategorie</a>.</p>`;
    secs += bDet('g_'+s.k, `<span class="dot" style="background:${s.c}"></span><div class="sp"><h3>${s.n}</h3><div class="small muted">${s.d}</div></div>
      <div class="bsr"><b class="num">CHF ${chf0(sums[i])}</b><div class="small muted">${pct(sums[i]/(m.inc||1))} vom Einkommen</div></div>`, body, 'card mt bsec');
  });
  return head('Budget '+ymLabel(ym), 'Gegliedert nach Grundbedürfnisse, Fixkosten, Sparen, Persönliche Wünsche und Freizeit. Mit M · B · W markierst du, was Muss ist (fix, muss im Budget stehen), Brauch oder Will.', tabs+'<button class="btn sm" data-act="addcat">+ Kategorie</button>')
    + incHtml + flow + secs + rkCard() + jbCard(y) + abgCard() + emptyNote(y);
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
  const secV = (m, s) => D.cats.filter(c=>gSec(c)===s).reduce((t,c)=>t+catV(m,c),0);
  const outV = m => GS.reduce((t,s)=>t+secV(m,s),0), diffV = m => C.m[m].inc - outV(m);
  let rows = `<tr class="yinc ytog" data-act="btog" data-k="inc"><td>${chev(op.inc)}Einkommen</td>${cells(m=>C.m[m].inc)}</tr>`;
  if(op.inc){ rows += `<tr class="ycat"><td>Lohn netto</td>${ecells('_lohn', lohnOf)}</tr>`;
    for(const s of (D.incSide||[]).filter(s=>ms.some(m=>s.plan[m]))) rows += `<tr class="ycat"><td>${esc(s.name)}</td>${ecells(s.id, m=>+(s.plan[m])||0)}</tr>`;
    rows += `<tr class="ycat"><td><a class="link" data-act="incedit" data-id="new" data-ym="${first}">+ Nebeneinkommen</a></td>${ms.map(()=>'<td></td>').join('')}<td></td></tr>`; }
  rows += `<tr class="yrest ydiff"><td>Differenz</td>${ms.map(m=>`<td class="num ${cur(m)} ${diffV(m)<-0.5?'neg':'in'}">${chf0(diffV(m))}</td>`).join('')}<td class="num tot ${sumY(diffV)<-0.5?'neg':'in'}">${chf0(sumY(diffV))}</td></tr>`;
  rows += `<tr class="yinc ytog yout" data-act="btog" data-k="out"><td>${chev(op.out)}Ausgaben total</td>${cells(outV)}</tr>`;
  if(op.out) for(const s of GS){
    const cs = D.cats.filter(c=>gSec(c)===s && !isEmptyCat(c.id,y)); if(!cs.length) continue; const o = op['g_'+s.k] ?? true;
    rows += `<tr class="ygrp ytog" data-act="btog" data-k="g_${s.k}"><td>${chev(o)}<span class="dot" style="background:${s.c}"></span>${s.n}</td>${cells(m=>secV(m,s))}</tr>`;
    if(o) for(const c of cs){ const fx = isMuss(c.id) || c.id==='rueck';
      rows += `<tr class="ycat ${fx?'yfix':''}"><td>${esc(c.name)}${fx&&c.id!=='rueck'?' <span class="small muted">fix</span>':''}</td>${ms.map(m=>{ const pl = catV(m,c), ist = C.ist[c.id]?.[m], over = !fx && ist!=null && ist>pl+0.5;
        return c.id==='rueck' ? `<td class="num ${cur(m)}" data-go="jahr" title="automatisch aus den Jahreskosten">${fmtv(pl)}</td>`
          : `<td class="num click ${cur(m)} ${over?'over':''}" data-act="budedit" ${fx?'':'data-ok="1"'} data-c="${c.id}" data-ym="${m}" title="${ist!=null?'Effektiv: CHF '+chf0(ist)+' · ':''}${fx?'Muss – fix, nur bewusst ändern':'Klicken zum Ändern'}">${fmtv(pl)}</td>`; }).join('')}<td class="num tot">${chf0(sumY(m=>catV(m,c)))}</td></tr>`; }
  }
  const allOpen = op.inc && op.out && GS.every(s=>op['g_'+s.k] ?? true);
  return head('Jahresübersicht '+y, 'Einkommen, Differenz und Ausgaben nach Grundbedürfnisse, Fixkosten, Sparen, Persönliche Wünsche und Freizeit. Muss-Beträge (fix) sind grau.', tabs+`<button class="btn sm" data-act="ball3">${allOpen?'Alle zuklappen':'Alle aufklappen'}</button><button class="btn sm" data-act="newyear" data-y="${+y+1}">Budget ${+y+1} anlegen</button>`)
    + oldNote() + `<div class="card ytable"><table><colgroup><col class="cname">${ms.map(()=>'<col>').join('')}<col></colgroup><thead><tr><th>Kategorie</th>${ms.map(m=>`<th class="${cur(m)}">${ymShort(m)}</th>`).join('')}<th class="tot">${ms.length<12?ymShort(ms[0])+'–'+ymShort(ms.at(-1)):'Jahr'}</th></tr></thead><tbody>${rows}</tbody></table></div>`
    + rkCard() + jbCard(y) + abgCard() + emptyNote(y);
};
document.addEventListener('click', e=>{ const a = e.target.closest('[data-act="ball3"]'); if(!a || !D) return; e.stopPropagation();
  const o = bOpen(), all = o.inc && o.out && GS.every(s=>o['g_'+s.k] ?? true);
  for(const k of ['inc','out', ...GS.map(s=>'g_'+s.k)]) bSetOpen(k, !all); render(); }, true);
// Will hat wieder ein Budget: alter Hinweis beim Umstellen entfällt
toastMsg = (prev => function(t, ...r){ return prev.call(this, typeof t==='string' ? t.replace(' – nicht mehr im Budget','') : t, ...r); })(toastMsg);
