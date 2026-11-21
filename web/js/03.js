    return `<div class="li"><span class="sp">${esc(a.name)}${x.istSet?' <span class="tag">abgeglichen</span>':''}</span><span class="num ${x.start<0?'neg':''}">${chf(x.start)}</span><button class="btn sm" data-act="setist" data-id="${a.id}" data-ym="${ym}">${x.istSet?'Ändern':'Abgleichen'}</button></div>`}).join('');
  const done = D.accounts.filter(a=>m.acc[a.id]?.istSet).length, tot = D.accounts.filter(a=>m.acc[a.id]).length;
  return head(ymLabel(ym), 'Was geplant war und was du wirklich ausgegeben hast.') + (ym===TODAY&&dailyCard()?dailyCard()+'<div class="mt"></div>':'') + `
  <div class="stats">
    ${kpi('Einkommen (netto)', chf(m.inc), m.incIst!=null?'Ist erfasst':'geplant')}
    ${kpi('Ausgaben inkl. Sparen', chf(m.out), list.length+' Buchungen')}
    ${kpi('Restbetrag', chf(m.rest), 'nicht zugewiesen', m.rest<0?'neg':'pos')}
    ${kpi(esc(main?.name||'Hauptkonto')+' Ende Monat', ma?chf(ma.end):'–', 'Prognose', ma&&ma.end<0?'neg':'')}
  </div>
  <div class="card mt"><div class="row"><h3 class="sp" style="margin:0">Aufteilung deines Einkommens</h3><span class="small muted">Ziel ≤${s.fix} / ≤${s.pers} / ≥${s.spar}</span></div>
    <div class="stack" style="margin-top:10px">${seg(m.t.bedarf,TOPF.bedarf.c,'Bedarf')}${seg(m.t.wunsch,TOPF.wunsch.c,'Wünsche')}${seg(m.t.spar,TOPF.spar.c,'Sparen')}</div>
    <div class="legend">${Object.entries(TOPF).map(([k,g])=>`<span><span class="dot" style="background:${g.c}"></span>${g.n} <b class="num" style="color:var(--ink)">${pct(m.t[k]/inc)}</b> · CHF ${chf0(m.t[k])}</span>`).join('')}</div></div>
  <div class="grid g2 mt">
    <div class="card"><h3>Plan vs. Ist</h3><div class="small muted" style="margin-top:-6px">Kategorie antippen, um eine Ausgabe zu erfassen.</div>${catRows||'<p class="muted">Keine Kategorien mit Budget.</p>'}</div>
    <div class="grid" style="align-content:start">
      <div class="card"><div class="row"><h3 class="sp" style="margin:0">Buchungen</h3><button class="btn sm pri" data-act="addtx">+ Buchung</button></div><div class="list">${txHtml||'<p class="muted small">Noch keine Buchungen. Erfasse Ausgaben, um Plan und Ist zu vergleichen.</p>'}</div></div>
      <details class="card"><summary><h3>Monatsabschluss</h3><span class="tag ${done?'':'g'}">${done}/${tot} abgeglichen</span></summary>
        <p class="small muted" style="margin:8px 0 0">Am Monatsanfang die echten Kontostände eintragen – so bleibt die Prognose korrekt.</p><div class="list">${close}</div></details>
      <details class="card"><summary><h3>Regeln</h3>${['ok','warn','bad'].map(k=>{const c=RULES.filter(r=>rules[r.id]?.[0]===k).length;return c?`<span class="tag ${k==='ok'?'':k==='warn'?'w':'b'}">${c} ${k==='ok'?'✓':k==='warn'?'!':'✕'}</span>`:''}).join(' ')}</summary><div style="margin-top:6px">${RULES.map(r=>{const [st,d]=rules[r.id]||['na',''];return `<div class="rule">${stIcon(st)}<div><div class="t">${esc(ruleTitle(r))}</div><div class="d">${esc(d)}</div></div></div>`}).join('')}</div></details>
    </div>
  </div>`;
}

/* ---- 7.3 Budget: Monat (bearbeiten) oder Jahresübersicht (lesen) ---- */
function isEmptyCat(id, y){
  if(S.showEmpty) return false;
  const c=D.cats.find(c=>c.id===id); if(c?.archived) return true; if(c?.keep) return false;
  return !C.months.filter(m=>m.startsWith(y)).some(m=>(D.plan[id]?.[m])||C.ist[id]?.[m]!=null||C.m[m].yc.cats[id]);
}
function emptyNote(y){ const n=D.cats.filter(c=>isEmptyCat(c.id,y)).length;
  return S.showEmpty ? `<p class="small"><a class="link" data-act="toggleempty">Leere Kategorien ausblenden</a></p>` : n ? `<p class="small muted">${n} Kategorien ohne Beträge ausgeblendet · <a class="link" data-act="toggleempty">anzeigen</a></p>` : ''; }
const budgetMode = () => S.bmode || (window.innerWidth>=1000 ? 'jahr' : 'monat');
function vBudget(){
  const mode = budgetMode();
  const tabs = `<div class="seg"><button class="${mode==='monat'?'on':''}" data-act="bmode" data-m="monat">Monat bearbeiten</button><button class="${mode==='jahr'?'on':''}" data-act="bmode" data-m="jahr">Jahresübersicht</button></div>`;
  return mode==='monat' ? vBudgetMonat(tabs) : vBudgetJahr(tabs);
}
function budgetSummary(m){
  const inc=m.inc||1, seg=(v,c)=>v>0?`<div style="width:${Math.min(100,v/inc*100)}%;background:${c}"></div>`:'';
  return `<div class="card bsum"><div class="bsum-row">
      <div><div class="small muted">Einkommen</div><b class="num">${chf0(m.inc)}</b></div><span class="op">−</span>
      <div><div class="small muted">Ausgaben & Sparen</div><b class="num">${chf0(m.out)}</b></div><span class="op">=</span>
      <div><div class="small muted">Noch nicht verteilt</div><b class="num ${m.rest<-0.5?'neg':m.rest>0.5?'pos':''}">${chf0(m.rest)}</b></div></div>
    <div class="stack" style="margin-top:12px">${seg(m.t.bedarf,TOPF.bedarf.c)}${seg(m.t.wunsch,TOPF.wunsch.c)}${seg(m.t.spar,TOPF.spar.c)}</div>
    <div class="legend">${Object.entries(TOPF).map(([k,g])=>`<span><span class="dot" style="background:${g.c}"></span>${g.n} <b style="color:var(--ink)">${pct(m.t[k]/inc)}</b></span>`).join('')}</div>
    ${m.rest<-0.5?`<p class="small neg" style="margin:8px 0 0">Du hast CHF ${chf0(-m.rest)} mehr verplant als du verdienst. Kürze eine Kategorie.</p>`:m.rest>50?`<p class="small muted" style="margin:8px 0 0">Tipp: Verteile den Rest, z. B. auf «Sparen (Reserve)».</p>`:''}</div>`;
}
function vBudgetMonat(tabs){
  const ym=S.ym, m=C.m[ym];
  if(!m) return head('Budget '+ymLabel(ym),'',tabs)+`<div class="card">Für ${ymLabel(ym)} gibt es noch kein Budget. <button class="btn sm pri" data-act="newyear" data-y="${ym.slice(0,4)}">Budget ${ym.slice(0,4)} anlegen</button></div>`;
  const y=ym.slice(0,4);
  const row = c => { const plan=D.plan[c.id]?.[ym]||0, yc=m.yc.cats[c.id]||0, ist=C.ist[c.id]?.[ym], tot=plan+yc;
    const used = ist!=null && tot>0 ? ist/tot : null, col = used==null?'':used>1.001?'var(--bad)':used>0.85?'var(--warn)':'var(--ok)';
    return `<div class="brow2">
      <div class="bname" ${c.id==='rueck'?'data-go="jahr"':`data-act="budedit" data-c="${c.id}" data-ym="${ym}"`}><span>${esc(c.name)} <span class="mchev">›</span></span>${c.acc&&c.id!=='rueck'?`<span class="small muted">→ ${esc(accName(c.acc))}</span>`:''}${yc&&c.id!=='rueck'?`<span class="small muted">+ CHF ${chf0(yc)} aus Jahreskosten</span>`:''}${c.id==='rueck'?'<span class="small muted">wird für Jahresrechnungen zurückgelegt</span>':''}</div>
      ${c.id==='rueck' ? `<div class="bauto"><b class="num">CHF ${chf0(yc)}</b><span class="small muted">automatisch</span></div>`
        : `<label class="bamt"><span class="small muted">CHF</span><input class="amtin cell" data-cell="${c.id}" data-ym="${ym}" value="${plan?fmt0.format(plan):''}" placeholder="0" inputmode="decimal" aria-label="Budget ${esc(c.name)}"></label>`}
      <div class="bist ${ist==null?'noist':''}">${ist!=null?`<div class="small"><span class="muted">Ausgegeben</span> <b class="num" style="color:${col}">${chf0(ist)}</b></div><div class="bar"><i style="width:${Math.min(100,(used||0)*100)}%;background:${col}"></i></div>`:'<span class="small muted">noch keine Ausgaben</span>'}</div>
      ${c.id==='rueck' ? '<button class="btn sm ghost" data-go="jahr">Jahreskosten …</button>' : `<button class="btn sm ghost" data-act="budedit" data-c="${c.id}" data-ym="${ym}" title="Mehr Optionen">Ändern …</button>`}</div>`; };
  let html = budgetSummary(m);
  html += `<div class="card mt"><div class="bgroup-h"><h3>Einkommen</h3></div>
    <div class="brow2"><div class="bname"><span>Lohn netto</span>${m.incIst!=null?`<span class="small muted">erhalten: CHF ${chf0(m.incIst)}</span>`:''}</div>
    <label class="bamt"><span class="small muted">CHF</span><input class="amtin cell" data-cell="_inc" data-ym="${ym}" value="${D.income[ym]?fmt0.format(D.income[ym]):''}" placeholder="0" inputmode="decimal" aria-label="Einkommen"></label><div class="bist"></div>
    <button class="btn sm ghost" data-act="budedit" data-c="_inc" data-ym="${ym}">Ändern …</button></div></div>`;
  for(const [g,G] of Object.entries(GROUPS)){
    const cs=D.cats.filter(c=>c.group===g && !isEmptyCat(c.id,y)); if(!cs.length) continue;
    html += `<div class="card mt"><div class="bgroup-h"><span class="dot" style="background:${G.c}"></span><div class="sp"><h3>${G.n}</h3><div class="small muted">${G.d}</div></div>
      <div style="text-align:right"><b class="num" style="font-size:17px">CHF ${chf0(m.g[g])}</b><div class="small muted">${pct(m.g[g]/(m.inc||1))} vom Einkommen</div></div></div>
      ${cs.map(row).join('')}</div>`;
  }
  return head('Budget '+ymLabel(ym), 'Betrag direkt ins Feld tippen. Über «Ändern …» bzw. den Namen antippen gilt ein Betrag auch für alle folgenden Monate.', tabs+'<button class="btn sm" data-act="addcat">+ Kategorie</button>') + html + emptyNote(y);
}
function vBudgetJahr(tabs){
  const y=S.year, ms=vis(C.months.filter(m=>m.startsWith(y)));
  if(!ms.length) return head('Jahresübersicht '+y,'',tabs)+`<div class="card">Kein Budget für ${y}. <button class="btn sm pri" data-act="newyear" data-y="${y}">Budget ${y} anlegen</button></div>`;
  const cur = m => m===TODAY?'cur':'', open=S.yopen||Object.fromEntries(Object.keys(GROUPS).map(g=>[g,true]));
  const sumY = f => ms.reduce((s,m)=>s+f(m),0);
  const cells = (f, cls='') => ms.map(m=>`<td class="num ${cur(m)} ${cls}">${(v=>v?chf0(v):'–')(f(m))}</td>`).join('') + `<td class="num tot">${chf0(sumY(f))}</td>`;
  let rows = `<tr class="yinc"><td>Einkommen</td>${cells(m=>C.m[m].inc)}</tr>`;
  for(const [g,G] of Object.entries(GROUPS)){
    const cs=D.cats.filter(c=>c.group===g && !isEmptyCat(c.id,y)); if(!cs.length) continue;
    rows += `<tr class="ygrp" data-act="ytoggle" data-g="${g}"><td><span class="chev">${open[g]?'▾':'▸'}</span><span class="dot" style="background:${G.c}"></span>${G.n}</td>${cells(m=>C.m[m].g[g])}</tr>`;
    if(open[g]) for(const c of cs) rows += `<tr class="ycat"><td>${esc(c.name)}</td>${ms.map(m=>{ const pl=C.m[m].plan[c.id]||0, ist=C.ist[c.id]?.[m], over=ist!=null&&ist>pl+0.5;
        return `<td class="num click ${cur(m)} ${over?'over':''}" data-act="budedit" data-c="${c.id}" data-ym="${m}" title="${ist!=null?'Ausgegeben: CHF '+chf0(ist)+' · ':''}Klicken zum Ändern">${pl?chf0(pl):'–'}</td>`; }).join('')}<td class="num tot">${chf0(sumY(m=>C.m[m].plan[c.id]||0))}</td></tr>`;
  }
  rows += `<tr class="yrest"><td>Noch nicht verteilt</td>${ms.map(m=>`<td class="num ${cur(m)} ${C.m[m].rest<-0.5?'neg':''}">${chf0(C.m[m].rest)}</td>`).join('')}<td class="num tot">${chf0(sumY(m=>C.m[m].rest))}</td></tr>`;
  const allOpen = Object.keys(GROUPS).every(g=>open[g]);
  return head('Jahresübersicht '+y, 'Das ganze Jahr auf einen Blick. Einen Betrag anklicken, um ihn zu ändern (auch für Folgemonate). Gruppen lassen sich zuklappen.', tabs+`<button class="btn sm" data-act="yall">${allOpen?'Alle zuklappen':'Alle aufklappen'}</button><button class="btn sm" data-act="newyear" data-y="${+y+1}">Budget ${+y+1} anlegen</button>`) +
    oldNote() + `<div class="card ytable"><table><colgroup><col class="cname">${ms.map(()=>'<col>').join('')}<col></colgroup><thead><tr><th>Kategorie</th>${ms.map(m=>`<th class="${cur(m)}">${ymShort(m)}</th>`).join('')}<th class="tot">${ms.length<12?ymShort(ms[0])+"–"+ymShort(ms.at(-1)):"Jahr"}</th></tr></thead><tbody>${rows}</tbody></table></div>` + emptyNote(y);
}
function budgetDialog(c, ym){
  const isInc = c==='_inc', name = isInc ? 'Einkommen' : catName(c), cur = isInc ? (D.income[ym]||0) : (D.plan[c]?.[ym]||0);
  const last3=[1,2,3].map(i=>ymAdd(ym,-i)).map(m=>C.ist[c]?.[m]).filter(v=>v!=null), avg = last3.length ? last3.reduce((a,b)=>a+b,0)/last3.length : null;
  const yc = !isInc && C.m[ym]?.yc.cats[c];
  dialog(`<h3>${esc(name)}</h3>
    <label class="f">Betrag pro Monat (CHF)<input id="bv" inputmode="decimal" value="${cur?fmt0.format(cur):''}" placeholder="0" style="font-size:22px;font-weight:650"></label>
    ${avg!=null?`<p class="small muted" style="margin-top:-6px">Tatsächlich ausgegeben (Ø letzte ${last3.length} Mt.): <b>CHF ${chf0(avg)}</b> · <a class="link" data-dlg="useavg">übernehmen</a></p>`:''}
    ${yc?`<p class="small muted">Dazu kommen automatisch CHF ${chf0(yc)} aus den Jahreskosten.</p>`:''}
    <fieldset class="scope"><legend class="small muted">Gilt für</legend>
      <label><input type="radio" name="sc" value="one" checked> nur ${ymLabel(ym)}</label>
      <label><input type="radio" name="sc" value="fwd"> ${ymLabel(ym)} und alle folgenden Monate</label>
      <label><input type="radio" name="sc" value="year"> ganzes Jahr ${ym.slice(0,4)}</label></fieldset>
    ${isInc?'':`<p class="small" style="margin:10px 0 0"><a class="link" data-dlg="editcat">Kategorie umbenennen / Gruppe ändern</a></p>`}
    ${acts(true)}`,
  k=>{ if(k==='useavg'){ $('#bv').value=fmt0.format(Math.ceil(avg/10)*10); return false; }
    if(k==='editcat'){ setTimeout(()=>catDialog(D.cats.find(x=>x.id===c)),50); return; }
    const v=parseNum($('#bv').value); if(isNaN(v)){ $('#bv').style.borderColor='var(--bad)'; return false; }
    const sc=document.querySelector('input[name=sc]:checked').value;
    const targets = sc==='one' ? [ym] : sc==='fwd' ? C.months.filter(m=>m>=ym) : C.months.filter(m=>m.startsWith(ym.slice(0,4)));
    for(const m of targets){ if(isInc) D.income[m]=v; else { (D.plan[c]??={}); if(v) D.plan[c][m]=v; else delete D.plan[c][m]; } } });
}

/* ---- 7.3b Jahreskosten ---- */
function yearlyMonthly(){ return D.yearly.filter(x=>x.mode==='verteilt').reduce((t,x)=>t+x.amount/12,0); }
function vJahr(){
  const items=[...D.yearly].sort((a,b)=>a.month-b.month), tot=items.reduce((t,x)=>t+x.amount,0);
  const byM = Array.from({length:12},(_,i)=>items.filter(x=>x.month===i+1).reduce((t,x)=>t+x.amount,0)), max=Math.max(1,...byM);
  const rueck = D.accounts.find(a=>a.id==='rueck'), rb = rueck && C.m[C.now].acc.rueck;
  return head('Jahreskosten', 'Rechnungen, die einmal pro Jahr kommen (Versicherungen, Serafe, Steuern-Nachzahlung, Service …). Monat wählen – die App plant sie automatisch ein.', '<button class="btn sm pri" data-act="addyearly">+ Jahreskosten</button>') + `
  <div class="stats">${kpi('Total pro Jahr',chf0(tot),items.length+' Posten')}${kpi('Diesen Monat zurücklegen',chf0(C.m[C.now].yc.cats.rueck||0),'danach Ø '+chf0(yearlyMonthly())+'/Monat')}${kpi('Rückstellungskonto',rb?chf0(rb.end):'–',rueck?'Stand Ende Monat':'entsteht automatisch')}</div>
  <div class="card mt"><h3>Wann fällt was an?</h3><div class="mbars">${byM.map((v,i)=>`<div title="${MN[i]}: CHF ${chf0(v)}"><i style="height:${v/max*100}%"></i><span>${MS[i]}</span></div>`).join('')}</div></div>
  <div class="card mt"><div class="list">${items.map(x=>`<div class="li"><span class="mchip">${MS[x.month-1]}</span><div class="sp"><b>${esc(x.name)}</b><div class="small muted">${x.mode==='verteilt'?'monatlich CHF '+chf0(x.amount/12)+' zurücklegen, im '+MN[x.month-1]+' vom Rückstellungskonto bezahlen':'im '+MN[x.month-1]+' aus dem Budget bezahlen'} · ${esc(catName(x.mode==='verteilt'?'rueck':x.cat))} · ab ${ymLabel(x.from)}</div></div><b class="num">${chf0(x.amount)}</b><button class="ibtn" data-act="edityearly" data-id="${x.id}">✎</button></div>`).join('')||'<p class="muted">Noch keine Jahreskosten. Tipp: Alles, was nicht monatlich kommt, hier erfassen – so gibt es keine Überraschungen.</p>'}</div></div>
  <p class="small muted">Empfehlung: grosse Jahresrechnungen «monatlich zurücklegen». Dann bleibt jeder Monat gleich und das Geld ist da, wenn die Rechnung kommt. Achte darauf, dass dieselben Kosten nicht zusätzlich im Budget stehen.</p>`;
}
function yearlyDialog(x){
  const isNew=!x; x=x||{id:'y'+uid(),name:'',amount:'',month:+TODAY.slice(5),cat:'',mode:'verteilt',from:C.now};
  dialog(`<h3>${isNew?'Neue Jahreskosten':'Jahreskosten bearbeiten'}</h3>
   <label class="f">Bezeichnung<input id="yn" value="${esc(x.name)}" placeholder="z. B. Haftpflicht- und Hausratversicherung"></label>
   <div class="grid g2" style="gap:0 12px"><label class="f">Betrag pro Jahr CHF<input id="ya" inputmode="decimal" value="${x.amount}"></label>
   <label class="f">Fällig im Monat<select id="ym">${MN.map((n,i)=>`<option value="${i+1}" ${x.month===i+1?'selected':''}>${n}</option>`).join('')}</select></label></div>
   <label class="f">Bezahlen<select id="yo"><option value="verteilt">Monatlich zurücklegen (empfohlen)</option><option value="faellig" ${x.mode==='faellig'?'selected':''}>Im Fälligkeitsmonat aus dem Budget</option></select></label>
   <label class="f">Kategorie (bei «im Fälligkeitsmonat»)<select id="yc">${D.cats.filter(c=>c.id!=='rueck').map(c=>`<option value="${c.id}" ${c.id===x.cat?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>
   <label class="f">Gilt ab<input id="yf" type="month" value="${x.from}"></label>
   ${acts(isNew)}`,
  k=>{ if(k==='del'){ markDel(x.id); D.yearly=D.yearly.filter(z=>z!==x); return; }
    const a=parseNum(val('ya')); if(!val('yn').trim()||!a) return false;
    Object.assign(x,{name:val('yn').trim(),amount:a,month:+val('ym'),mode:val('yo'),cat:val('yc'),from:val('yf')||C.now});
    if(isNew) D.yearly.push(x); ensureRueck(); });
}
function ensureRueck(){
  if(!D.yearly.some(x=>x.mode==='verteilt')) return;
  if(!D.accounts.some(a=>a.id==='rueck')) D.accounts.push({id:'rueck',name:'Rückstellung Jahreskosten',kind:'asset',rate:0,startYm:C.now,start:0,out:0,outM:{},abos:false});
  if(!D.cats.some(c=>c.id==='rueck')) D.cats.push({id:'rueck',name:'Rückstellung Jahreskosten',group:'fix',acc:'rueck'});
}

/* ---- 7.3c Buchungen & Import ---- */
function vBuch(){
  const ym=S.ym, q=(S.q||'').toLowerCase(), fc=S.fc||'';
  const list=D.tx.filter(t=>t.d.startsWith(ym) && (!fc||t.c===fc) && (!q || (catName(t.c)+' '+(t.n||'')).toLowerCase().includes(q))).sort((a,b)=>b.d.localeCompare(a.d));
  const sum=list.filter(t=>t.c!=='_inc').reduce((s,t)=>s+t.a,0), inc=list.filter(t=>t.c==='_inc').reduce((s,t)=>s+t.a,0);
  const src = t => t.src==='wallet'?'<span class="tag">Wallet</span>':t.src==='csv'?'<span class="tag g">CSV</span>':'';
  const unm = D.tx.filter(t=>t.c==='_offen').length;
  const ws=D.walletSync, sv=S.server;
  return head('Buchungen '+ymLabel(ym), 'Deine echten Ausgaben: von Hand, aus Wallet by BudgetBakers oder per CSV.', '<button class="btn sm pri" data-act="addtx">+ Buchung</button>') + `
  ${unm?`<div class="hint row"><span class="sp"><b>${unm} importierte Buchungen ohne Kategorie.</b> Ordne die Wallet-/CSV-Kategorien einmal zu – danach geht es automatisch.</span><button class="btn sm" data-act="mapcats">Zuordnen</button></div>`:''}
  <div class="grid g2">
    <div class="card"><h3>Wallet by BudgetBakers ${sv?.wallet?'<span class="tag">gesichert verbunden</span>':''}</h3>
      ${sv?.wallet?`<p class="small muted" style="margin-top:-4px">Deine Wallet-Ausgaben kommen nur lesend über deinen gesicherten Server. Der Token liegt verschlüsselt bei Cloudflare – nicht in der App.${sv.user?' Angemeldet als <b>'+esc(sv.user)+'</b>.':''}</p>
        <div class="row"><button class="btn sm pri" data-act="wsync">Jetzt synchronisieren</button><button class="btn sm" data-act="mapcats">Kategorien zuordnen</button></div>
        <label class="small row" style="margin-top:10px;gap:6px;cursor:pointer"><input type="checkbox" class="setting-cb" data-k="autoSync" ${D.settings.autoSync!==false?'checked':''}> Automatisch synchronisieren (beim Öffnen und alle 30 Min.)</label>
        <p class="small muted" style="margin-bottom:0">${ws?.at?'Letzte Prüfung: '+new Date(ws.at).toLocaleString('de-CH')+' · '+(ws.n||0)+' neue Buchungen':'Noch nicht synchronisiert.'}</p>
        ${ws?.err?`<p class="small neg" style="margin:4px 0 0">${esc(ws.err)}</p>`:''}`
      : sv ? `<p class="small muted" style="margin-top:-4px">Dein Server läuft, aber der Wallet-Token ist noch nicht hinterlegt. In Cloudflare: Worker → Settings → Variables and Secrets → <b>Secret</b> «WALLET_TOKEN» hinzufügen (Anleitung Schritt 6).</p>`
      : `<p class="small muted" style="margin-top:-4px">Aus Sicherheitsgründen verbindet sich die App nur über deinen eigenen, mit Anmeldung geschützten Cloudflare-Server mit Wallet. Der Token kommt nie in den Browser. Einrichtung: siehe <b>ANLEITUNG-SICHERHEIT.md</b>.</p>
        <p class="small muted" style="margin-bottom:0">Bis dahin: Wallet-Export als CSV importieren.</p>`}
      <div id="wstatus" class="small" style="margin-top:8px"></div></div>
    <div class="card"><h3>CSV importieren</h3>
      <p class="small muted" style="margin-top:-4px">Export aus Wallet, PostFinance oder einer anderen Bank. Spalten für Datum, Betrag und Kategorie werden erkannt, Doppelte übersprungen.</p>
      <button class="btn sm" data-act="csvimport">CSV-Datei wählen …</button></div>
  </div>
  <div class="card mt"><div class="row" style="margin-bottom:6px"><input class="in" id="fq" placeholder="Suchen …" value="${esc(S.q||'')}" style="flex:1;min-width:140px">
    <select class="in" id="ffc"><option value="">Alle Kategorien</option>${catOptions(fc)}</select></div>
    <div class="row small muted"><span class="sp">${list.length} Buchungen</span><span>Ausgaben <b class="num" style="color:var(--ink)">CHF ${chf(sum)}</b>${inc?` · Einnahmen <b class="num pos">CHF ${chf(inc)}</b>`:''}</span></div>
    <div class="list">${list.slice(0,S.txShow||60).map(t=>`<div class="li"><div class="sp"><div>${t.c==='_offen'?'<span class="tag w">ohne Kategorie</span> '+esc(t.wc||''):esc(catName(t.c))} ${src(t)}${isMove(t)?` <span class="tag g">ab ${esc(accName(t.acc))}</span>`:''}</div><div class="small muted">${t.d.split('-').reverse().join('.')}${t.n?' · '+esc(t.n):''}</div></div>
      <b class="num ${t.c==='_inc'?'pos':''}">${chf(t.a)}</b><button class="ibtn" data-act="edittx" data-id="${t.id}">✎</button></div>`).join('')||'<p class="muted">Keine Buchungen in diesem Monat.</p>'}</div>
    ${list.length>(S.txShow||60)?`<div class="row mt"><span class="sp small muted">${(S.txShow||60)} von ${list.length} angezeigt</span><button class="btn sm" data-act="txmore">Weitere anzeigen</button></div>`:''}</div>`;
}

/* Wallet – nur lesend über den eigenen Server (/api/wallet/...).
   Laut Wallet-Doku: max. 300 Anfragen/Stunde, 429 + Retry-After respektieren, 409 während der Erst-Synchronisierung,
   Änderungen über die Revision (X-Last-Data-Change-Rev) erkennen. */
function setWStatus(t,cls=''){ const el=$('#wstatus'); if(el){ el.className='small '+cls; el.textContent=t; } }
let SYNCING=false;
async function walletSync(auto=false){
  if(!D || !S.server?.wallet || SYNCING) return;
  const ws = D.walletSync || {};
  if(ws.nextTry && Date.now() < new Date(ws.nextTry)){ if(!auto) setWStatus('Wallet bittet um eine Pause – nächster Versuch '+new Date(ws.nextTry).toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'})+'.','neg'); return; }
  SYNCING=true; if(!auto) setWStatus('Synchronisiere …');
  const from = ws.from || ymAdd(C.now,-2)+'-01';
  let all=[], err=null, nextTry=null, rev=null, unchanged=false;
  const pause = (r, min) => { const ra=+(r.headers.get('Retry-After')||0); nextTry=new Date(Date.now()+Math.max(ra*1000, min*60000)).toISOString(); };
  try{
    // 1. günstige Prüfung: hat sich in Wallet überhaupt etwas geändert?
    const h = await api('wallet/rev');
    if(h.status===429){ pause(h,15); throw new Error('Zu viele Anfragen an Wallet – automatische Pause.'); }
    if(h.status===409){ pause(h,5); throw new Error('Wallet bereitet die Daten noch vor (Erst-Synchronisierung). Nächster Versuch in 5 Minuten.'); }
    if(!h.ok) throw new Error('Server-Fehler '+h.status+' bei der Prüfung.');
    rev = (await h.json()).rev;
    unchanged = rev && ws.rev===rev && ws.from===from && !ws.err;
    // 2. nur bei Änderungen alle Seiten laden (max. 200 pro Seite)
    if(!unchanged){ let offset=0;
      for(let page=0; page<25; page++){
        const r = await api(`wallet/records?limit=200&offset=${offset}&recordDate=gte.${from}`);
        if(r.status===429){ pause(r,15); throw new Error('Zu viele Anfragen an Wallet – automatische Pause.'); }
        if(r.status===409){ pause(r,5); throw new Error('Wallet bereitet die Daten noch vor (Erst-Synchronisierung). Nächster Versuch in 5 Minuten.'); }
        if(r.status===502) throw new Error('Wallet hat den Token abgelehnt. Prüfe das Secret WALLET_TOKEN und dein Premium-Abo.');
        if(!r.ok) throw new Error('Server-Fehler '+r.status+'.');
        const j = await r.json(), recs = Array.isArray(j.records) ? j.records : [];
        all = all.concat(recs);
        if(j.nextOffset==null || !recs.length) break; offset=j.nextOffset;
      } }
  }catch(e){ err = e instanceof TypeError ? (navigator.onLine===false ? 'Keine Internetverbindung.' : 'Server nicht erreichbar.') : (e.message||String(e)); }
  SYNCING=false;
  if(err){ D.walletSync = {...ws, err, nextTry, tried:new Date().toISOString()}; S.noDirty=true; save(); S.noDirty=false; setWStatus(err,'neg'); safeRender(); return; }
  let n=0;
  if(!unchanged){
    const rows = all.filter(r=>r && r.id && r.recordType!=='transfer' && !r.transfer).map(r=>({
      id:'wb_'+String(r.id).slice(0,80), d:String(r.recordDate||'').slice(0,10), amount:+(r.amount?.value ?? r.amount),
      wc:String(r.category?.name||'Ohne Kategorie').slice(0,80), n:String(r.counterParty||r.payee||r.note||'').slice(0,120), income:r.recordType==='income' }));
    n = importRows(rows,'wallet'); if(n){ calc(); checkAlerts(); }
  }
  D.walletSync = {at:new Date().toISOString(), n, rev, from: unchanged ? from : ymAdd(C.now,-1)+'-01', err:null, nextTry:null}; save();
  if(n || !auto) safeRender();
  if(!auto) setTimeout(()=>setWStatus(unchanged ? 'Keine Änderungen in Wallet.' : `${n} neue Buchungen übernommen (${all.length} geprüft).`,'pos'),0);
}
// nicht neu zeichnen, während jemand tippt oder ein Dialog offen ist
function safeRender(){ const ae=document.activeElement; if($('#dlg').open || (ae && /INPUT|SELECT|TEXTAREA/.test(ae.tagName))){ S.needRender=true; return; } render(); }
document.addEventListener('focusout', ()=>{ if(S.needRender) setTimeout(()=>{ if(S.needRender){ S.needRender=false; safeRender(); } },300); });
$('#dlg').addEventListener('close', ()=>{ if(S.needRender){ S.needRender=false; setTimeout(safeRender,50); } });
// automatisch: beim Öffnen, beim Zurückkehren in die App und alle 30 Minuten
function autoSync(force=false){
  if(!D || D.settings.autoSync===false || !S.server?.wallet) return;
  const last = D.walletSync?.at || D.walletSync?.tried; if(!force && last && Date.now()-new Date(last) < 10*60*1000) return;
  walletSync(true);
}
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') autoSync(); });
window.addEventListener('online', ()=>autoSync(true));
setInterval(()=>autoSync(true), 30*60*1000);

// gemeinsame Übernahme für Wallet und CSV
function importRows(rows, src){
  const have = new Set(D.tx.map(t=>t.id)), sig = new Set(D.tx.map(t=>t.d+'|'+r2(t.a)+'|'+(t.n||'').slice(0,20)));
  let n=0;
  for(const r of rows){
    if(!r.d || !isFinite(r.amount) || !r.amount) continue;
    const id = r.id || src+'_'+r.d+'_'+r2(r.amount)+'_'+(r.n||'').slice(0,20);
    const a = r2(Math.abs(r.amount)), s=r.d+'|'+a+'|'+(r.n||'').slice(0,20);
    if(have.has(id) || sig.has(s)) continue;
    const inc = r.income ?? r.amount>0;
    const c = D.walletMap[r.wc] || (inc ? '_inc' : '_offen');
    D.tx.push({id, d:r.d, c, a, n:r.n, wc:r.wc, src, acc:mainAcc().id}); have.add(id); sig.add(s); n++;
  }
  save(); return n;
}
function mapDialog(){
  const names = [...new Set(D.tx.filter(t=>t.wc).map(t=>t.wc))].sort();
  if(!names.length){ alert('Noch keine importierten Kategorien.'); return; }
  const cnt = w => D.tx.filter(t=>t.wc===w).length;
  dialog(`<h3>Kategorien zuordnen</h3><p class="small muted" style="margin-top:-8px">Wallet-/CSV-Kategorie → Kategorie in deinem Budget. Wird für alle bisherigen und künftigen Buchungen übernommen.</p>
    ${names.map((w,i)=>`<label class="f">${esc(w)} <span class="muted">(${cnt(w)})</span><select id="mp${i}"><option value="">– offen lassen –</option><option value="_skip" ${D.walletMap[w]==='_skip'?'selected':''}>Ignorieren (z. B. Umbuchung)</option>${catOptions(D.walletMap[w]||'')}</select></label>`).join('')}
    ${acts(true)}`,
  ()=>{ names.forEach((w,i)=>{ const v=$('#mp'+i).value; if(v) D.walletMap[w]=v; else delete D.walletMap[w]; });
    D.tx = D.tx.filter(t=>!(t.wc && D.walletMap[t.wc]==='_skip'));
    D.tx.forEach(t=>{ if(t.wc && D.walletMap[t.wc]) t.c=D.walletMap[t.wc]; else if(t.wc && t.c!=='_inc') t.c='_offen'; }); });
}
/* CSV */
function parseCSV(text){
  text=text.replace(/^﻿/,''); const first=text.split(/\r?\n/)[0]||'';
  const del=[';',',','\t'].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
  const rows=[]; let row=[],f='',q=false;
  for(let i=0;i<text.length;i++){ const ch=text[i];
    if(q){ if(ch==='"'){ if(text[i+1]==='"'){f+='"';i++;} else q=false; } else f+=ch; }
    else if(ch==='"') q=true; else if(ch===del){ row.push(f); f=''; } else if(ch==='\n'||ch==='\r'){ if(ch==='\r'&&text[i+1]==='\n') i++; row.push(f); rows.push(row); row=[]; f=''; } else f+=ch; }
  if(f||row.length){ row.push(f); rows.push(row); }
  return rows.filter(r=>r.some(c=>c.trim()));
}
const csvNum = s => { s=String(s||'').trim().replace(/['’\s]|CHF/g,''); if(/,\d{1,2}$/.test(s)) s=s.replace(/\./g,'').replace(',','.'); else s=s.replace(/,/g,''); return parseFloat(s); };
function csvDate(s){ s=String(s||'').trim(); let m;
  if((m=s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return m[1]+'-'+m[2]+'-'+m[3];
  if((m=s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/))) return (m[3].length===2?'20'+m[3]:m[3])+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
  return null; }
function csvDialog(rows){
  // Kopfzeile finden: erste Zeile mit mind. 3 Feldern
  const hi = rows.findIndex(r=>r.length>=3); const H = rows[hi].map(h=>h.trim()), body=rows.slice(hi+1);
  const find = re => H.findIndex(h=>re.test(h));
  let cD=find(/^(date|datum|buchungsdatum|record.?date)/i), cA=find(/^(amount|betrag|value)$/i), cC=find(/^(category|kategorie)/i), cN=find(/^(note|notiz|payee|counter.?party|buchungstext|avisierungstext|beschreibung|text)/i);
  let cG=find(/gutschrift/i), cL=find(/lastschrift|belastung/i);
  const opt=(id,sel,none)=>`<select id="${id}">${none?'<option value="-1">– keine –</option>':''}${H.map((h,i)=>`<option value="${i}" ${i===sel?'selected':''}>${esc(h)}</option>`).join('')}</select>`;
  dialog(`<h3>CSV importieren</h3><p class="small muted" style="margin-top:-8px">${body.length} Zeilen erkannt. Bitte Spalten prüfen.</p>
    <label class="f">Datum${opt('cD',cD)}</label>
    <label class="f">Betrag (Minus = Ausgabe)${opt('cA',cA,true)}</label>
    <div class="grid g2" style="gap:0 12px"><label class="f">oder Gutschrift${opt('cG',cG,true)}</label><label class="f">und Belastung${opt('cL',cL,true)}</label></div>
    <label class="f">Kategorie${opt('cC',cC,true)}</label>
    <label class="f">Text / Notiz${opt('cN',cN,true)}</label>
    ${acts(true)}`,
  ()=>{ const g=id=>+$('#'+id).value; const [d,a,c,n,gu,la]=[g('cD'),g('cA'),g('cC'),g('cN'),g('cG'),g('cL')];
    const out = body.map(r=>{ let amt = a>=0 ? csvNum(r[a]) : (csvNum(r[gu])||0) - Math.abs(csvNum(r[la])||0);
      return {d:csvDate(r[d]), amount:amt, wc:c>=0?(r[c]||'').trim()||'Ohne Kategorie':'Ohne Kategorie', n:n>=0?(r[n]||'').trim().slice(0,80):''}; }).filter(x=>x.d && isFinite(x.amount));
    const k = importRows(out,'csv'); S.view='buchungen'; setTimeout(()=>{ alert(k+' Buchungen übernommen, '+(out.length-k)+' übersprungen (doppelt oder leer).'); },50); });
}

/* ---- 7.4 Konten & Schulden ---- */
function spark(a){
  const ms=vis(C.months.filter(m=>m>=ymAdd(C.now,-6))).slice(0,18), v=ms.map(m=>C.m[m].acc[a.id]?.end??null).filter(x=>x!=null);
  if(v.length<2) return '';
  const lo=Math.min(0,...v), hi=Math.max(0,...v), r=(hi-lo)||1, W=140, H=34;
  const pts=v.map((y,i)=>(i*(W/(v.length-1))).toFixed(1)+','+(H-2-(y-lo)/r*(H-4)).toFixed(1)).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><line x1="0" x2="${W}" y1="${H-2-(0-lo)/r*(H-4)}" y2="${H-2-(0-lo)/r*(H-4)}" stroke="var(--line)"/><polyline points="${pts}" fill="none" stroke="${v.at(-1)<0?'var(--bad)':'var(--acc)'}" stroke-width="2"/></svg>`;
}
function vKonten(){
  const y=S.year, ms=vis(C.months.filter(m=>m.startsWith(y))), n=C.now, cur = m => m===TODAY?'cur':'';
  const cards = activeAccs().map(a=>{ const x=C.m[n].acc[a.id]; if(!x) return '';
    const yEnd = C.m[ms.at(-1)]?.acc[a.id]?.end;
    const flags=[a.main?'Hauptkonto':'', a.notgroschen?'Reserve':'', a.kind==='debt'?'Schulden':'', a.id==='rueck'?'Jahreskosten':''].filter(Boolean).map(f=>`<span class="tag g">${f}</span>`).join(' ');
    return `<div class="card acc"><div class="row"><b class="sp">${esc(a.name)}</b><button class="ibtn" data-act="editacc" data-id="${a.id}" title="Konto bearbeiten">✎</button></div>
      <div class="small">${flags}${a.rate?` <span class="tag w">${a.rate} % Zins</span>`:''}</div>
      <div class="row" style="align-items:flex-end;margin-top:10px"><div class="sp"><div class="big2 num ${x.start<-0.5?'neg':''}">${chf0(x.start)}</div><div class="small muted">Anfang ${ymLabel(n)}${x.istSet?' · abgeglichen ✓':''}</div></div>${spark(a)}</div>
      <div class="row small muted" style="margin-top:8px"><span class="sp">Ende ${y}: <b class="num" style="color:var(--ink)">${yEnd!=null?chf0(yEnd):'–'}</b></span><button class="btn sm" data-act="setist" data-id="${a.id}" data-ym="${n}">Stand eintragen</button></div></div>`; }).join('');
  const thead = `<tr><th>Konto</th>${ms.map(m=>`<th class="${cur(m)}">${ymShort(m)}</th>`).join('')}</tr>`;
  const rows = activeAccs().map(a=>`<tr><td>${esc(a.name)}</td>${ms.map(m=>{const x=C.m[m].acc[a.id];
      return `<td class="num click ${x&&x.start<0?'neg':''} ${cur(m)}" data-act="setist" data-id="${a.id}" data-ym="${m}">${x?(x.istSet?'<b>':'')+chf0(x.start)+(x.istSet?'</b>':''):''}</td>`}).join('')}</tr>`).join('')
    + `<tr class="tot"><td>Nettovermögen</td>${ms.map(m=>{const v=D.accounts.reduce((s,a)=>s+(C.m[m].acc[a.id]?.start||0),0);return `<td class="num ${cur(m)}">${chf0(v)}</td>`}).join('')}</tr>`;
  const debts = activeAccs().filter(a=>a.kind==='debt').sort((a,b)=>b.rate-a.rate);
  const dRows = debts.map(a=>{ const now=C.m[n].acc[a.id]; const free = firstFrom(n, x=>(x.acc[a.id]?.end??0)>=-0.5);
    return `<div class="li"><span class="sp">${esc(a.name)}</span><span class="small muted">${now&&now.start>=-0.5?'schuldenfrei ✓':free?'frei ab '+ymLabel(free):'nicht im Plan'}</span><b class="num ${now&&now.start<-0.5?'neg':'pos'}">${now?chf0(now.start):'–'}</b></div>`; }).join('');
  return head('Konten & Schulden', 'Aktueller Stand jedes Kontos. «Stand eintragen» = echten Kontostand übernehmen, ab dann rechnet die App damit.', '<button class="btn sm" data-act="addacc">+ Konto</button>') + `
  <div class="grid g3">${cards}</div>
  <div class="grid g2 mt">
    <div class="card"><h3>Schulden</h3><div class="list">${dRows||'<p class="muted">Keine Schuldenkonten.</p>'}</div>
      <p class="small muted" style="margin-bottom:0">Regel: Kreditkarte jeden Monat vollständig zurückzahlen, keine neuen Raten.</p></div>
    <div class="card"><h3>Nettovermögen</h3>${lineChart()}</div>
  </div>
  ${oldNote()}
  <details class="card mt"><summary><h3>Monatsverlauf ${y} (Tabelle)</h3></summary><div class="tw mt" style="max-height:none;border:1px solid var(--line)"><table>${thead}${rows}</table></div></details>`;
}


function lineChart(){
  const ms=vis(C.months), W=560, H=200, P=40;
  const vals = ms.map(m=>C.m[m].netto), res = ms.map(m=>C.m[m].liquid);
  const lo=Math.min(0,...vals,...res), hi=Math.max(0,...vals,...res,C.reserveZiel), rng=(hi-lo)||1;
  const x=i=>P+i*(W-P-8)/Math.max(1,ms.length-1), yy=v=>8+(H-30)*(1-(v-lo)/rng);
  const line=(arr,c,w,d='')=>`<polyline points="${arr.map((v,i)=>x(i).toFixed(1)+','+yy(v).toFixed(1)).join(' ')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" ${d}/>`;
  const ti=ms.indexOf(C.now);
  let ticks=''; ms.forEach((m,i)=>{ if(m.endsWith('-01')||i===0) ticks+=`<line x1="${x(i)}" x2="${x(i)}" y1="8" y2="${H-22}" stroke="var(--line)"/><text x="${x(i)+3}" y="${H-8}">${m.slice(0,4)}</text>`; });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Verlauf Nettovermögen">${ticks}
   <line x1="${P}" x2="${W-8}" y1="${yy(0)}" y2="${yy(0)}" stroke="var(--muted)" stroke-dasharray="3 3"/>
   <line x1="${P}" x2="${W-8}" y1="${yy(C.reserveZiel)}" y2="${yy(C.reserveZiel)}" stroke="var(--warn)" stroke-dasharray="5 4"/>
