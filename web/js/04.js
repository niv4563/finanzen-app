   <text x="2" y="${yy(hi)+4}">${chf0(hi)}</text><text x="2" y="${yy(lo)}">${chf0(lo)}</text>
   ${ti>=0?`<line x1="${x(ti)}" x2="${x(ti)}" y1="8" y2="${H-22}" stroke="var(--acc)" stroke-width="1.5"/><text x="${x(ti)+3}" y="18" style="fill:var(--acc)">heute</text>`:''}
   ${line(res,'var(--leben)',1.6)}${line(vals,'var(--acc)',2.4)}</svg>
   <div class="legend"><span><span class="dot" style="background:var(--acc)"></span>Nettovermögen</span><span><span class="dot" style="background:var(--leben)"></span>Flüssiges Geld</span><span><span class="dot" style="background:var(--warn)"></span>Reserve-Ziel</span></div>`;
}

/* ---- 7.5 Ziele & Reserve ---- */
function goalCard(name, target, accId, dateYm, extra=''){
  const n=C.now, have = C.m[n].acc[accId]?.end ?? 0, p = target>0 ? Math.min(1,Math.max(0,have/target)) : 0;
  const hit = firstFrom(n, x=>(x.acc[accId]?.end??-1e12) >= target);
  const fut = C.months.filter(m=>m>=n).slice(0,12), inflow = fut.reduce((s,m)=>s+(C.m[m].acc[accId]?.inflow||0)-(C.m[m].acc[accId]?.out||0),0)/Math.max(1,fut.length);
  let status = '', need = '';
  if(have>=target) status = '<span class="tag">erreicht</span>';
  else if(dateYm){ const left=Math.max(1,ymDiff(n,dateYm)); const req=(target-have)/left;
    need = `Nötig: CHF ${chf0(req)}/Monat bis ${ymLabel(dateYm)} · geplant: CHF ${chf0(inflow)}/Monat`;
    status = inflow>=req-0.5 ? '<span class="tag">auf Kurs</span>' : '<span class="tag w">zu wenig geplant</span>'; }
  else status = hit ? `<span class="tag g">laut Plan ${ymShortY(hit)}</span>` : '<span class="tag w">im Plan nicht erreicht</span>';
  return `<div class="card"><div class="row"><h3 class="sp" style="margin:0">${esc(name)}</h3>${status}${extra}</div>
    <div class="row" style="margin:10px 0 6px"><b class="num" style="font-size:20px">${chf0(have)}</b><span class="muted">von CHF ${chf0(target)}</span><span class="sp"></span><b>${pct(p)}</b></div>
    <div class="bar" style="height:10px"><i style="width:${p*100}%;background:var(--spar)"></i></div>
    <p class="small muted" style="margin:8px 0 0">${esc(accName(accId))}${need?' · '+need:hit&&have<target?' · laut Plan erreicht im '+ymLabel(hit):''}</p></div>`;
}
function vZiele(){
  const na = D.accounts.find(a=>a.notgroschen), s=D.settings;
  const goals = D.goals.map(g=>goalCard(g.name, g.target, g.acc, g.date, `<button class="ibtn" data-act="editgoal" data-id="${g.id}">✎</button>`)).join('');
  return head('Ziele & Reserve', 'Zuerst die Reserve, dann deine eigenen Sparziele. Die Reserve ist für Notfälle – nicht für Wünsche.', '<button class="btn sm pri" data-act="addgoal">+ Sparziel</button>') + `
  <div class="hint">Reserve-Ziel = ${s.notMonate} × Ø Bedarf pro Monat (CHF ${chf0(C.bedarf)}) = <b>CHF ${chf0(C.reserveZiel)}</b>. Empfohlen sind 3–6 Monate; die Monate stellst du unter Regeln ein.</div>
  <div class="grid g2">
    ${na?goalCard('Reserve / Notgroschen', C.reserveZiel, na.id, null):'<div class="card">Lege unter Konten ein Reservekonto fest.</div>'}
    ${goals}
  </div>
  ${!D.goals.length?'<p class="small muted">Beispiele für Sparziele: Eigenheim (Haushalt Sparkonto), Auto, Weiterbildung. Ziel mit Betrag, Datum und Konto anlegen – die App rechnet aus, wie viel du monatlich brauchst.</p>':''}`;
}

/* ---- 7.6 Wünsche ---- */
const PRIO = {1:['Hoch','var(--bad)'],2:['Mittel','var(--warn)'],3:['Tief','var(--muted)']};
function wishBadge(w){
  const p=w._p; if(!p) return '';
  if(p.regel) return p.fitsTopf ? '<span class="tag">passt in den Topf</span>' : p.fitsBudget ? '<span class="tag">passt ins Budget</span>' : `<span class="tag b">CHF ${chf0(p.extra)}/Mt. fehlen</span>`;
  if(p.topf && p.ym<=C.now) return '<span class="tag">jetzt aus dem Topf</span>';
  if(p.ym && p.waitDays>0 && p.ym<=p.wait) return `<span class="tag w">Bedenkzeit ${p.waitDays} T.</span>`;
  if(!p.ym) return `<span class="tag b">${p.block==='schulden'?'erst Schulden tilgen':'nicht absehbar'}</span>`;
  if(p.ym<=C.now) return `<span class="tag">jetzt leistbar</span>`;
  return `<span class="tag ${p.est?'w':'g'}">${p.est?'ca. ':''}${ymShortY(p.ym)}</span>`;
}
function vWuensche(){
  const n=C.now, m=C.m[n], s=D.settings;
  const open = D.wishes.filter(w=>!w.done).sort(wishOrder);
  const done = D.wishes.filter(w=>w.done).sort((a,b)=>b.done.localeCompare(a.done));
  const totalOpen = open.reduce((t,w)=>t+w.price,0);
  const blockTxt = !m.schuldenfrei ? `Du hast noch Schulden (CHF ${chf0(-m.schulden)}). Wünsche werden erst ab dem Monat eingeplant, in dem du schuldenfrei bist.` :
    m.liquid < C.reserveZiel ? 'Die Reserve ist noch nicht voll. Wünsche werden erst aus Geld bezahlt, das über der Reserve liegt.' : 'Schuldenfrei und Reserve voll – Wünsche werden aus dem Geld darüber bezahlt.';
  const item = w => { const p=w._p||{}; const [pn,pc]=PRIO[w.prio]||PRIO[2], t=wtype(w);
    if(t==='regel') return `<div class="li wish"><span class="prio" style="background:var(--acc)"></span><div class="sp"><b>${esc(w.name)}</b>
      <div class="small muted"><span class="wctag" title="Kategorie, Rang ${wcatRank(w)+1}">${wcatRank(w)+1}. ${esc(wcatOf(w).name)}</span> · CHF ${chf0(w.price)} pro Monat${w.note?' · '+esc(w.note):''}</div>
      <div class="small" style="margin-top:4px">${p.fitsTopf?'✓ Passt in deinen Topf «Unter Leuten» – ohne Einfluss auf dein Sparen.':p.fitsBudget?`✓ Passt ins Budget: CHF ${chf0(p.extra)}/Mt. über dem Topf, der Restbetrag reicht.`:`Dafür fehlen CHF ${chf0(p.extra)} pro Monat – Topf erhöhen oder anderswo kürzen.`}</div>
      <div class="row small" style="margin-top:6px"><span class="sp"></span><button class="btn sm" data-act="editwish" data-id="${w.id}">Bearbeiten</button><button class="btn sm pri" data-act="buywish" data-id="${w.id}">Angemeldet ✓</button></div></div>
      <div class="wdate ${p.ym?'now':'no'}"><span class="small muted">möglich</span><b>${p.ym?'ab jetzt':'noch nicht'}</b></div></div>`;
    const now = p.ym && p.ym<=n, months = p.ym && !now ? ymDiff(n,p.ym) : null;
    const date = !p.ym ? (p.block==='schulden'?'nach Schulden':'nicht absehbar') : now ? (p.topf?'jetzt':'jetzt') : (p.est?'ca. ':'')+ymShortY(p.ym);
    const progress = Math.max(0,Math.min(1, m.frei / (p.cum||1)));
    return `<div class="li wish" style="align-items:stretch"><span class="prio" style="background:${pc}" title="Priorität ${pn}"></span>
      <div class="sp"><b>${esc(w.name)}</b><div class="small muted"><span class="wctag" title="Kategorie, Rang ${wcatRank(w)+1}">${wcatRank(w)+1}. ${esc(wcatOf(w).name)}</span> · <span class="num">CHF ${chf0(w.price)}</span> · Priorität ${pn}${w.note?' · '+esc(w.note):''}</div>
      ${p.topf?`<div class="small" style="margin-top:3px">${now?'✓ Aus deinem Topf «Unter Leuten» bezahlbar.':`Topf dafür ${p.saveMonths} ${p.saveMonths===1?'Monat':'Monate'} ansparen.`}</div>`:''}
      ${p.waitDays>0?`<div class="small wrn">Bedenkzeit: noch ${p.waitDays} Tage – will ich das wirklich?</div>`:''}
      <div class="bar" style="margin:8px 0 6px"><i style="width:${progress*100}%;background:${pc}"></i></div>
      <div class="row small muted"><span class="sp">${months&&!p.topf?'oder separat ca. CHF '+chf0(w.price/months)+'/Monat sparen':''}</span>
        <button class="btn sm" data-act="editwish" data-id="${w.id}">Bearbeiten</button><button class="btn sm" data-act="buywish" data-id="${w.id}">Gekauft</button></div></div>
      <div class="wdate ${now?'now':!p.ym?'no':''}"><span class="small muted">leistbar ab</span><b>${date}</b>${months?`<span class="small muted">in ${months} Mt.</span>`:''}</div></div>`; };
  return head('Wünsche & Erlebnisse', 'Erlebnisse mit Menschen, Regelmässiges wie Verein oder Kurs und Anschaffungen – die App zeigt, was jetzt geht und ab wann der Rest drinliegt.', '<button class="btn sm pri" data-act="addwish">+ Wunsch</button>') + `
  <div class="stats">
    ${kpi('Frei verfügbar heute', chf0(Math.max(0,m.frei)), 'flüssig − Reserve − Puffer', m.frei>0?'pos':'')}
    ${kpi('Offene Wünsche', chf0(totalOpen), open.length+' Wünsche')}
    ${kpi('Reserve-Ziel', chf0(C.reserveZiel), s.notMonate+' Monate Bedarf')}
    ${kpi('Bedenkzeit', s.wartefrist+' Tage', 'gegen Spontankäufe')}
  </div>
  <div class="grid g2 mt"><div>${leuteCard(false)}</div><div>${quickCard()}</div></div>
  <div class="card mt"><div class="row"><div class="sp"><h3 style="margin:0">Rangfolge der Kategorien</h3><p class="small muted" style="margin:2px 0 0">Wünsche aus wichtigeren Kategorien kommen zuerst an die Reihe – danach zählt die Priorität.</p></div><button class="btn sm" data-act="wcats">Rangfolge ändern</button></div>
    <div class="wcrank">${wcats().map((c,i)=>{ const k=open.filter(w=>wcatOf(w).id===c.id).length; return `<span class="wcchip ${k?'':'muted'}"><b>${i+1}</b>${esc(c.name)}${k?` <span class="tag">${k}</span>`:''}</span>`; }).join('')}</div></div>

  ${['erlebnis','regel','ding'].map(t=>{ const l=D.wishes.filter(w=>!w.done && wtype(w)===t && !(t==='regel'&&w.active)).sort(wishOrder); const run=t==='regel'?D.wishes.filter(w=>!w.done&&wtype(w)==='regel'&&w.active):[];
    return `<div class="card mt"><div class="row"><h3 class="sp" style="margin:0">${WTYPE[t][1]} ${WTYPE[t][0]}</h3><button class="btn sm" data-act="addwish" data-t="${t}">+ hinzufügen</button></div>
      <p class="small muted" style="margin:2px 0 4px">${t==='erlebnis'?'Zuerst aus dem Topf «Unter Leuten», grössere Erlebnisse vor Anschaffungen.':t==='regel'?'Verein, Kurs, Sportgruppe – passt es dauerhaft ins Budget?':blockTxt+' Reihenfolge: Rang der Kategorie, dann Priorität.'}</p>
      <div class="list">${l.map(item).join('')||'<p class="small muted">Noch nichts erfasst.</p>'}</div>
      ${run.length?`<div class="small muted" style="margin-top:8px">Läuft bereits: ${run.map(w=>`<b style="color:var(--ink)">${esc(w.name)}</b> CHF ${chf0(w.price)}/Mt. <a class="link" data-act="editwish" data-id="${w.id}">✎</a>`).join(' · ')}</div>`:''}</div>`; }).join('')}
  ${done.length?`<div class="card mt"><h3>Erfüllt</h3><div class="list">${done.map(w=>`<div class="li"><span class="sp">${esc(w.name)} <span class="small muted">${w.done.split('-').reverse().join('.')}</span></span><span class="num">${chf0(w.price)}</span><button class="ibtn" data-act="editwish" data-id="${w.id}">✎</button></div>`).join('')}</div></div>`:''}
  <p class="small muted">Berechnung: Guthaben auf flüssigen Konten (${D.accounts.filter(a=>a.liquid).map(a=>esc(a.name)).join(', ')}) minus Reserve (CHF ${chf0(C.reserveZiel)}) minus Puffer (CHF ${chf0(s.puffer)}). «Gekauft» erfasst die Zahlung als Buchung.</p>`;
}

/* ---- 7.7 Regeln ---- */
function vRegeln(){
  const y=S.year, ms=vis(C.months.filter(m=>m.startsWith(y))), s=D.settings, n=C.m[TODAY]?TODAY:ms[0];
  if(!ms.length) return head('Regeln '+y)+'<div class="card">Keine Daten.</div>';
  const res = Object.fromEntries(ms.map(m=>[m,checkMonth(m)]));
  const items = RULES.map(r=>{ const [st,d]=res[n]?.[r.id]||['na',''];
    const okN = ms.filter(m=>res[m][r.id]?.[0]==='ok').length, rel = ms.filter(m=>res[m][r.id]?.[0]!=='na').length;
    return `<div class="rrow">${stIcon(st)}<div class="sp"><div class="t">${esc(ruleTitle(r))}</div><div class="small muted">${esc(d)}</div></div>
      <div class="dots" title="${okN} von ${rel} Monaten eingehalten">${ms.map(m=>{const x=res[m][r.id]?.[0]||'na';return `<i class="${x} ${m===n?'now':''}" title="${ymShort(m)}: ${esc(res[m][r.id]?.[1]||'')}"></i>`}).join('')}</div></div>`; }).join('');
  const sum = k => ms.reduce((t,m)=>t+C.m[m].t[k],0), incY = ms.reduce((t,m)=>t+C.m[m].inc,0)||1;
  const num = (k,l) => `<label class="f">${l}<input class="setting" data-k="${k}" value="${s[k]}" inputmode="decimal"></label>`;
  return head('Regeln '+y, `Links: Stand ${ymLabel(n)}. Rechts: jeder Punkt ist ein Monat (Jan–Dez).`) + `
  <div class="stats">${kpi('Bedarf',pct(sum('bedarf')/incY),'Ziel ≤ '+s.fix+' %')}${kpi('Freizeit & Wünsche',pct(sum('wunsch')/incY),'Ziel ≤ '+s.pers+' %')}${kpi('Sparen & Schuldenabbau',pct(sum('spar')/incY),'Ziel ≥ '+s.spar+' %')}</div>
  <div class="card mt">${items}</div>
  <details class="card mt"><summary><h3>Regeln einstellen</h3></summary><div class="grid g3" style="gap:0 14px;margin-top:12px">
      ${num('fix','Bedarf max. %')}${num('pers','Freizeit & Wünsche max. %')}${num('spar','Sparen & Schuldenabbau min. %')}${num('notMonate','Reserve (Monate Bedarf)')}
      ${num('max3a','Säule 3a Maximum CHF/Jahr')}${num('aboLimit','Abo-Limit CHF/Monat')}${num('kkGuthabenMax','Max. Guthaben Kreditkarte')}${num('puffer','Puffer Privatkonto CHF')}
      ${num('wartefrist','Bedenkzeit Wünsche (Tage)')}${num('leuteZiel','Ziel: Aktivitäten unter Leuten pro Monat')}</div>
      <p class="small muted" style="margin:0">Säule 3a 2026: CHF 7'258 für Angestellte mit Pensionskasse – jedes Jahr prüfen.</p></details>`;
}

/* ---- 7.8 Abos ---- */
function vAbos(){
  const act = D.abos.filter(a=>a.active!==false), m = aboMonthly(null), zero = act.filter(a=>!a.price);
  return head('Abos', 'Laufende Kosten im Blick – jedes Abo regelmässig hinterfragen.', '<button class="btn pri sm" data-act="addabo">+ Abo</button>') + `
  <div class="stats">
   ${kpi('Pro Monat', chf(m), 'Limit '+chf0(D.settings.aboLimit), m>D.settings.aboLimit?'neg':'')}
   ${kpi('Pro Jahr', chf(m*12), act.length+' aktive Abos')}
   ${kpi('In 10 Jahren', chf0(m*120), 'so viel kosten die Abos')}
  </div>
  ${zero.length?`<div class="hint mt">${zero.length} Abos mit CHF 0 (${zero.map(a=>esc(a.name)).join(', ')}) – prüfen, ob du sie noch brauchst.</div>`:''}
  <div class="card mt"><div class="list">${[...D.abos].sort((a,b)=>(b.interval==='J'?b.price/12:b.price)-(a.interval==='J'?a.price/12:a.price)).map(a=>`<div class="li" style="${a.active===false?'opacity:.5':''}"><div class="sp"><div>${esc(a.name)}</div><div class="small muted">${a.interval==='J'?'jährlich':'monatlich'} CHF ${chf(a.price)} · über ${esc(accName(a.acc))}</div></div>
   <span class="num">${chf(a.interval==='J'?a.price/12:a.price)}<span class="small muted">/Mt</span></span><button class="ibtn" data-act="editabo" data-id="${a.id}">✎</button></div>`).join('')||'<p class="muted">Keine Abos.</p>'}</div></div>`;
}

/* ---- 7.9 Daten ---- */
function vDaten(){
  const last = D.backupAt ? new Date(D.backupAt).toLocaleString('de-CH') : 'noch nie';
  return head('Daten & Backup', 'Deine Daten liegen nur auf diesem Gerät.') + appCard() + `
  <div class="grid g2">
   <div class="card"><h3>Backup</h3><p class="small muted">Regelmässig speichern. Damit überträgst du die Daten auch zwischen Handy und PC.</p>
    <p class="small">Letztes Backup: <b>${last}</b></p>
    <div class="row"><button class="btn pri" data-act="export">Backup speichern (verschlüsselt)</button><button class="btn" data-act="import">Backup laden …</button></div></div>
   <div class="card"><h3>Export für Excel</h3><p class="small muted">Budget, Ist und Kontostände eines Jahres als CSV.</p>
    <div class="row"><select class="in" id="csvy">${years().map(y=>`<option ${y===S.year?'selected':''}>${y}</option>`).join('')}</select><button class="btn" data-act="csv">CSV exportieren</button></div></div>
   ${NATIVE?'':`<div class="card"><h3>Als App installieren</h3><p class="small muted">${location.protocol==='file:'?'Die Datei ist direkt geöffnet. Zum Installieren muss die App über https erreichbar sein (siehe LIESMICH).':'Android (Chrome): Menü ⋮ → «App installieren». Windows (Edge/Chrome): Symbol in der Adressleiste → «Installieren».'}</p>
    <button class="btn ${window._installEvt?'':'hide'}" data-act="install">Jetzt installieren</button></div>`}
   <div class="card"><h3>Ansicht</h3><p class="small muted">Monate davor werden in Übersichten und Diagrammen ausgeblendet (bleiben aber gespeichert und gerechnet).</p>
    <label class="f">Ansicht ab Monat<input type="month" class="in setting-month" data-k="viewFrom" value="${D.settings.viewFrom||''}"></label></div>
   ${syncCard()}
   <div class="card"><h3>App-Sperre ${CK?'<span class="tag">aktiv</span>':'<span class="tag w">aus</span>'}</h3>
    <p class="small muted">${CK?'Deine Daten sind verschlüsselt gespeichert (AES-256). Die App sperrt sich nach Inaktivität.':'Schützt die App mit einer PIN und speichert alle Daten verschlüsselt. Empfohlen.'}</p>
    ${CK&&NATIVE?'<p class="small muted">Wenn du die App verlässt, sperrt sie sich spätestens nach 1 Minute.</p>':''}${CK?`<label class="f">Automatisch sperren nach<select class="in setting-sel" data-k="autoLock">${[1,2,5,10,15,30].map(m=>`<option value="${m}" ${(D.settings.autoLock||5)===m?'selected':''}>${m} Min. ohne Benutzung</option>`).join('')}</select></label>
      <div class="row"><button class="btn sm" data-act="locknow">Jetzt sperren</button><button class="btn sm" data-act="pinchange">PIN ändern</button>${NATIVE?'':'<button class="btn sm danger" data-act="pinremove">Sperre entfernen</button>'}</div>`
     :`<button class="btn pri" data-act="pinset">App-Sperre einrichten</button>`}</div>
   <div class="card"><h3>Alles löschen</h3><p class="small muted">Entfernt alle Daten von diesem Gerät. Vorher ein Backup machen.</p><button class="btn danger" data-act="reset">Alle Daten löschen</button></div>
  </div>`;
}
function vMehr(){
  return head('Mehr') + `<div class="card morelist">${[['empfehlungen','✦','Empfehlungen & Fahrplan','Was du als Nächstes tun solltest'],['buchungen','≡','Buchungen & Import','Ist-Ausgaben, Wallet, CSV'],['analyse','◔','Ausgaben-Analyse','Vergleich, Händler, Budget-Vorschlag'],['prognose','↗','Prognose & Szenarien','Was wäre wenn, 10–30 Jahre'],['jahr','◷','Jahreskosten','Jährliche Rechnungen mit Monat'],['konten','◫','Konten & Schulden','Kontostände, Schuldenplan, Vermögen'],['ziele','◎','Ziele & Reserve','Notgroschen und eigene Sparziele'],['regeln','✓','Regeln','Ampel, 50/30/20, Einstellungen'],['abos','↻','Abos','Laufende Kosten'],['daten','⚙','Daten & Backup','Sichern, laden, exportieren']]
    .map(([id,i,n,d])=>`<a data-go="${id}"><span class="i">${i}</span><span class="sp"><b>${n}</b><br><span class="small muted">${d}</span></span>›</a>`).join('')}</div>`;
}

/* =====================================================================
   8. DIALOGE
   ===================================================================== */
function dialog(html, onSave){
  $('#dlgbody').innerHTML = html; const d=$('#dlg'); d.showModal();
  d.onclick = e => { const a=e.target.closest('[data-dlg]'); if(e.target===d) d.close();
    if(!a) return; const k=a.dataset.dlg;
    if(k==='cancel') d.close();
    else if(onSave){ const r=onSave(k); if(r!==false){ d.close(); save(); render(); } } };
  const first=d.querySelector('input,select'); if(first) setTimeout(()=>first.focus(),30);
}
const val = id => $('#'+id).value;
const acts = (isNew, delLabel='Löschen') => `<div class="acts">${isNew?'':`<button class="btn danger" data-dlg="del">${delLabel}</button><span class="sp"></span>`}<button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Speichern</button></div>`;
function catOptions(sel){
  return `<option value="_inc" ${sel==='_inc'?'selected':''}>Einkommen</option>` + Object.entries(GROUPS).map(([g,G])=>`<optgroup label="${G.n}">${D.cats.filter(c=>c.group===g && (!c.archived || c.id===sel)).map(c=>`<option value="${c.id}" ${c.id===sel?'selected':''}>${esc(c.name)}</option>`).join('')}</optgroup>`).join('');
}
function txDialog(t, preset={}, onDone){
  const isNew=!t; t = t || {d:(S.view==='monat' && S.ym!==TODAY ? S.ym+'-01' : todayIso()), c:'', a:'', n:'', acc:mainAcc().id, ...preset};
  dialog(`<h3>${isNew?'Neue Buchung':'Buchung bearbeiten'}</h3>
   <label class="f">Betrag CHF<input id="fa" inputmode="decimal" value="${t.a===''?'':chf(t.a)}" placeholder="z. B. 45.50"></label>
   <label class="f">Kategorie<select id="fc">${catOptions(t.c)}</select></label>
   <label class="f">Bezahlt von<select id="fk">${activeAccs().map(a=>`<option value="${a.id}" ${a.id===(t.acc||mainAcc().id)?'selected':''}>${esc(a.name)}${a.main?' (Budget)':''}</option>`).join('')}</select></label>
   <label class="f">Datum<input id="fd" type="date" value="${t.d}"></label>
   <label class="f">Notiz<input id="fn" value="${esc(t.n)}" placeholder="optional"></label>
   <p class="small muted" style="margin:0">Zahlung ab einem anderen Konto (z. B. Sparkonto) belastet dieses Konto direkt und zählt nicht ins Monatsbudget.</p>
   ${acts(isNew)}`,
  k=>{ if(k==='del'){ markDel(t.id); D.tx=D.tx.filter(x=>x!==t); return; }
    const a=parseNum(val('fa')); if(!a||isNaN(a)||!val('fd')){ $('#fa').style.borderColor='var(--bad)'; return false; }
    const c=val('fc'); Object.assign(t,{d:val('fd'),c,a,n:val('fn').trim(),acc:c==='_inc'?mainAcc().id:val('fk')});
    if(isNew){ t.id=uid(); D.tx.push(t); } onDone?.(t); calc(); checkAlerts(); });
}
function catDialog(c){
  const isNew=!c; c=c||{id:'c'+uid(),name:'',group:'freizeit',acc:null};
  dialog(`<h3>${isNew?'Neue Kategorie':'Kategorie bearbeiten'}</h3>
   <label class="f">Name<input id="cn" value="${esc(c.name)}"></label>
   <label class="f">Gruppe<select id="cg">${Object.entries(GROUPS).map(([g,G])=>`<option value="${g}" ${g===c.group?'selected':''}>${G.n} (${TOPF[G.topf].n})</option>`).join('')}</select></label>
   <label class="f">Geld fliesst auf Konto<select id="ca"><option value="">– keins (Geld ist ausgegeben) –</option>${activeAccs().filter(a=>!a.main).map(a=>`<option value="${a.id}" ${a.id===c.acc?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label>
   ${acts(isNew)}`,
  k=>{ if(k==='del'){ if(!confirm('Kategorie «'+c.name+'» mit allen Budgetwerten löschen?')) return false; D.cats=D.cats.filter(x=>x!==c); delete D.plan[c.id]; return; }
    if(!val('cn').trim()) return false; Object.assign(c,{name:val('cn').trim(),group:val('cg'),acc:val('ca')||null}); if(isNew) D.cats.push(c); });
}
const chk = (id,on,l) => `<label class="f" style="color:var(--ink)"><input type="checkbox" id="${id}" ${on?'checked':''} style="display:inline;width:auto;margin:0 6px 0 0">${l}</label>`;
function accDialog(a){
  const isNew=!a; a=a||{id:'k'+uid(),name:'',kind:'asset',rate:0,startYm:C.now,start:0,out:0,outM:{},abos:false};
  dialog(`<h3>${isNew?'Neues Konto':'Konto bearbeiten'}</h3>
   <label class="f">Name<input id="an" value="${esc(a.name)}"></label>
   <div class="grid g2" style="gap:0 12px">
   <label class="f">Art<select id="ak"><option value="asset">Guthaben</option><option value="debt" ${a.kind==='debt'?'selected':''}>Schulden / Kredit</option></select></label>
   <label class="f">Zins % p.a. (bei Minus)<input id="ar" inputmode="decimal" value="${a.rate}"></label>
   <label class="f">Startmonat<input id="as" type="month" value="${a.startYm}"></label>
   <label class="f">Startstand CHF<input id="ast" inputmode="decimal" value="${a.start}"></label>
   <label class="f">Fixer Abgang pro Monat<input id="ao" inputmode="decimal" value="${a.out}" title="${esc(a.outLabel||'')}"></label>
   <label class="f">Abos werden abgebucht<select id="aa"><option value="0">Nein</option><option value="1" ${a.abos?'selected':''}>Ja</option></select></label>
   </div>
   ${chk('ang',a.notgroschen,'Reservekonto (Notgroschen)')}${chk('alq',a.liquid,'Flüssig – zählt für Reserve und Wünsche')}
   ${a.main?'<p class="small muted">Hauptkonto: hier landet der Restbetrag jedes Monats.</p>':''}
   ${acts(isNew||a.main)}`,
  k=>{ if(k==='del'){ if(!confirm('Konto löschen?')) return false; D.accounts=D.accounts.filter(x=>x!==a); D.cats.forEach(c=>{if(c.acc===a.id)c.acc=null}); return; }
    if(!val('an').trim()) return false;
    const ng=$('#ang').checked; if(ng) D.accounts.forEach(x=>x.notgroschen=false);
    Object.assign(a,{name:val('an').trim(),kind:val('ak'),rate:parseNum(val('ar'))||0,startYm:val('as')||a.startYm,start:parseNum(val('ast'))||0,out:parseNum(val('ao'))||0,abos:val('aa')==='1',notgroschen:ng,liquid:$('#alq').checked||ng});
    if(isNew) D.accounts.push(a); });
}
function istDialog(id,ym){
  const a=D.accounts.find(x=>x.id===id), x=C.m[ym].acc[id], cur=D.ist[id]?.[ym];
  dialog(`<h3>${esc(a.name)} – Anfang ${ymLabel(ym)}</h3>
   <p class="small muted">Berechnet: CHF ${chf(x.start)}. Echten Kontostand eintragen (Schulden mit Minus) – ab hier rechnet die App damit weiter.</p>
   <label class="f">Echter Kontostand CHF<input id="iv" inputmode="decimal" value="${cur!=null?chf(cur):''}" placeholder="${chf(x.start)}"></label>
   ${acts(cur==null,'Eintrag entfernen')}`,
  k=>{ if(k==='del'){ delete D.ist[id][ym]; return; } const v=parseNum(val('iv')); if(isNaN(v)||val('iv').trim()==='') return false; (D.ist[id]??={})[ym]=v; });
}
function aboDialog(a){
  const isNew=!a; a=a||{id:'a'+uid(),name:'',interval:'M',price:0,acc:(D.accounts.find(x=>x.abos)||D.accounts[0]).id,active:true};
  dialog(`<h3>${isNew?'Neues Abo':'Abo bearbeiten'}</h3>
   <label class="f">Name<input id="bn" value="${esc(a.name)}"></label>
   <div class="grid g2" style="gap:0 12px"><label class="f">Preis CHF<input id="bp" inputmode="decimal" value="${a.price}"></label>
   <label class="f">Abrechnung<select id="bi"><option value="M">Monatlich</option><option value="J" ${a.interval==='J'?'selected':''}>Jährlich</option></select></label></div>
   <label class="f">Bezahlt über<select id="ba">${activeAccs().map(x=>`<option value="${x.id}" ${x.id===a.acc?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>
   ${chk('bact',a.active!==false,'Aktiv')}${acts(isNew)}`,
  k=>{ if(k==='del'){ markDel(a.id); D.abos=D.abos.filter(x=>x!==a); return; } if(!val('bn').trim()) return false;
    Object.assign(a,{name:val('bn').trim(),price:parseNum(val('bp'))||0,interval:val('bi'),acc:val('ba'),active:$('#bact').checked}); if(isNew) D.abos.push(a); });
}
function wishDialog(w){
  const isNew=!w; w=w||{id:'w'+uid(),name:'',price:'',prio:2,added:todayIso(),note:'',done:null,type:S.wtype||'erlebnis',wc:(S.wtype||'erlebnis')==='erlebnis'?'menschen':'sonst'};
  dialog(`<h3>${isNew?'Neuer Wunsch':'Wunsch bearbeiten'}</h3>
   <div class="seg wt" style="margin-bottom:12px">${Object.entries(WTYPE).map(([k,[n,i]])=>`<button type="button" class="${wtype(w)===k?'on':''}" data-wt="${k}">${i} ${n.split(' (')[0]}</button>`).join('')}</div>
   <label class="f">Was wünschst du dir?<input id="wn" value="${esc(w.name)}" placeholder="z. B. Wochenende mit Freunden, Tanzkurs, neues Velo"></label>
   <div class="grid g2" style="gap:0 12px"><label class="f" id="wpl">${wtype(w)==='regel'?'Kosten pro Monat CHF':'Preis CHF'}<input id="wp" inputmode="decimal" value="${w.price===''?'':w.price}"></label>
   <label class="f">Priorität<select id="wr">${[1,2,3].map(p=>`<option value="${p}" ${+w.prio===p?'selected':''}>${PRIO[p][0]}</option>`).join('')}</select></label></div>
   <label class="f">Kategorie<select id="wk">${wcats().map((c,i)=>`<option value="${c.id}" ${wcatOf(w).id===c.id?'selected':''}>${i+1}. ${esc(c.name)}</option>`).join('')}</select></label>
   <p class="small muted" style="margin:-6px 0 10px">Die Zahl ist der Rang: Wünsche aus höher eingestuften Kategorien kommen zuerst an die Reihe. Innerhalb der Kategorie entscheidet die Priorität.</p>
   <label class="f">Notiz / Link<input id="wo" value="${esc(w.note)}" placeholder="optional"></label>
   ${w.done?chk('wd',true,'Erfüllt'):''}
   ${acts(isNew)}`,
  k=>{ if(k==='del'){ markDel(w.id); D.wishes=D.wishes.filter(x=>x!==w); return; }
    const p=parseNum(val('wp')); if(!val('wn').trim()||!p||isNaN(p)) return false;
    Object.assign(w,{name:val('wn').trim(),price:p,prio:+val('wr'),note:val('wo').trim(),type:$('.wt button.on')?.dataset.wt||'ding',wc:val('wk')});
    if(w.done && $('#wd') && !$('#wd').checked) w.done=null;
    if(isNew) D.wishes.push(w); });
}
function wcatDialog(){
  const row = c => `<div class="li wcr" data-id="${c.id}"><span class="wrk num muted"></span><input class="sp" value="${esc(c.name)}" aria-label="Name der Kategorie">
     <button type="button" class="btn sm" data-wcmv="up" aria-label="höher">↑</button><button type="button" class="btn sm" data-wcmv="down" aria-label="tiefer">↓</button><button type="button" class="btn sm" data-wcmv="del" aria-label="löschen">✕</button></div>`;
  dialog(`<h3>Wunsch-Kategorien</h3>
    <p class="small muted" style="margin-top:0">Ganz oben = wichtigste Kategorie. Wünsche aus oberen Kategorien werden zuerst eingeplant und sind darum früher leistbar.</p>
    <div class="list" id="wcl">${wcats().map(row).join('')}</div>
    <button type="button" class="btn sm" data-wcmv="add" style="margin-top:8px">+ Kategorie</button>
    <p class="small muted">Gelöschte Kategorien: ihre Wünsche wandern zu «${esc(wcats().at(-1).name)}» bzw. zur untersten Kategorie.</p>${acts(true)}`,
  ()=>{ const rows=[...document.querySelectorAll('#wcl .wcr')]; if(!rows.length) return false;
    const next = rows.map(r=>({id:r.dataset.id, name:r.querySelector('input').value.trim()||'Ohne Name'}));
    const ids=new Set(next.map(c=>c.id)); for(const w of D.wishes) if(w.wc && !ids.has(w.wc)) w.wc=next.at(-1).id;
    D.wcats=next; });
  wcNumber();
}
function wcNumber(){ document.querySelectorAll('#wcl .wcr').forEach((r,i)=>r.querySelector('.wrk').textContent=(i+1)+'.'); }
function buyWish(w){
  const t=wtype(w);
  if(t==='regel'){ w.active=true; w.since=todayIso(); save(); render(); return; }      // angemeldet: läuft jetzt monatlich
  if(t==='erlebnis' && w._p?.topf){ txDialog(null, {a:w.price, c:'leute', n:w.name, acc:mainAcc().id}, ()=>{ w.done=todayIso(); }); return; }
  const from = D.accounts.find(a=>a.liquid && !a.main) || mainAcc();
  txDialog(null, {a:w.price, c:t==='erlebnis'?'leute':'wuensche', n:w.name, acc:from.id}, ()=>{ w.done=todayIso(); });
}
function actDialog(){
  dialog(`<h3>Aktivität unter Leuten</h3>
    <label class="f">Was hast du gemacht?<input id="an2" placeholder="z. B. Znacht mit Kollegen, Vereinsabend, Kurs"></label>
    <div class="grid g2" style="gap:0 12px"><label class="f">Datum<input id="ad2" type="date" value="${todayIso()}"></label>
    <label class="f">Kosten CHF (leer = gratis)<input id="aa2" inputmode="decimal" placeholder="0"></label></div>
    <p class="small muted" style="margin:0">Gratis zählt genauso! Mit Kosten wird es als Ausgabe aus dem Topf «Unter Leuten» gebucht.</p>${acts(true)}`,
  ()=>{ const n=val('an2').trim()||'Aktivität', d=val('ad2')||todayIso(), a=parseNum(val('aa2'));
    if(a>0) D.tx.push({id:uid(), d, c:'leute', a, n, acc:mainAcc().id}); else (D.acts ??= []).push({id:uid(), d, n});
    S.actDone=true; });
}
function leuteCard(compact){
  const n=C.now, m=C.m[n], cnt=leuteCount(TODAY), goal=D.settings.leuteZiel||4, avail=m?.topfAvail??0;
  const recent=[...D.tx.filter(t=>t.c==='leute').map(t=>({d:t.d,n:t.n,a:t.a})), ...(D.acts||[]).map(a=>({d:a.d,n:a.n,a:0}))].sort((a,b)=>b.d.localeCompare(a.d)).slice(0,compact?3:6);
  const ideas = D.wishes.filter(w=>!w.done && wtype(w)==='erlebnis').slice(0,3);
  return `<div class="card leute"><div class="row" style="align-items:flex-start"><div class="sp"><h3 style="margin-bottom:2px">Unter Leuten</h3><div class="small muted">Diesen Monat: ${cnt} von ${goal} Aktivitäten</div></div>
      <button class="btn sm pri" data-act="addact">+ Aktivität</button></div>
    <div class="ldots">${Array.from({length:Math.max(goal,cnt)},(_,i)=>`<i class="${i<cnt?'on':''}"></i>`).join('')}</div>
    <div class="row" style="margin-top:10px"><div class="sp"><div class="small muted">Im Topf verfügbar</div><b class="num" style="font-size:22px;color:${avail<0?'var(--bad)':'var(--ok)'}">CHF ${chf0(avail)}</b></div>
      <div class="small muted" style="text-align:right">CHF ${chf0(m?.plan.leute||D.settings.leuteBudget||0)} pro Monat${C.now<(D.settings.leuteFrom||'')?' ab '+ymLabel(D.settings.leuteFrom):''}${leuteCommitted()?'<br>davon CHF '+chf0(leuteCommitted())+' fest (Kurs/Verein)':''}<br>nicht Verbrauchtes bleibt im Topf</div></div>
    ${cnt>=goal?'<p class="small pos" style="margin:8px 0 0">Ziel erreicht – stark! 🎉</p>':''}
    ${ideas.length?`<div class="small muted" style="margin-top:10px">Geplante Erlebnisse: ${ideas.map(w=>`<b style="color:var(--ink)">${esc(w.name)}</b> (${w._p?.ym&&w._p.ym<=n?'jetzt möglich':w._p?.ym?ymShortY(w._p.ym):'später'})`).join(' · ')}</div>`:''}
    ${!compact&&recent.length?`<div class="list" style="margin-top:8px">${recent.map(r=>`<div class="li small"><span class="sp">${esc(r.n)} <span class="muted">${r.d.split('-').reverse().slice(0,2).join('.')}</span></span><span class="num muted">${r.a?'CHF '+chf0(r.a):'gratis'}</span></div>`).join('')}</div>`:''}</div>`;
}
function goalDialog(g){
  const isNew=!g; g=g||{id:'g'+uid(),name:'',target:'',date:'',acc:(D.accounts.find(a=>a.kind==='asset'&&!a.main&&!a.notgroschen)||D.accounts[0]).id};
  dialog(`<h3>${isNew?'Neues Sparziel':'Sparziel bearbeiten'}</h3>
   <label class="f">Name<input id="gn" value="${esc(g.name)}" placeholder="z. B. Eigenheim"></label>
   <div class="grid g2" style="gap:0 12px"><label class="f">Zielbetrag CHF<input id="gt" inputmode="decimal" value="${g.target}"></label>
   <label class="f">Bis (optional)<input id="gd" type="month" value="${g.date||''}"></label></div>
   <label class="f">Gespart auf Konto<select id="ga">${activeAccs().filter(a=>a.kind==='asset').map(a=>`<option value="${a.id}" ${a.id===g.acc?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label>
   ${acts(isNew)}`,
  k=>{ if(k==='del'){ markDel(g.id); D.goals=D.goals.filter(x=>x!==g); return; }
    const t=parseNum(val('gt')); if(!val('gn').trim()||!t) return false;
    Object.assign(g,{name:val('gn').trim(),target:t,date:val('gd')||null,acc:val('ga')}); if(isNew) D.goals.push(g); });
}
function newYear(y){
  y=String(y); const py=String(+y-1), lastM=C.months.at(-1);
  for(let i=1;i<=12;i++){ const mm=String(i).padStart(2,'0'), ym=y+'-'+mm, s=C.m[py+'-'+mm] ? py+'-'+mm : lastM;
    if(D.income[ym]==null) D.income[ym] = D.income[s]||0;
    for(const c of D.cats){ const v = D.plan[c.id]?.[s]; if(v && D.plan[c.id]?.[ym]==null) (D.plan[c.id]??={})[ym]=v; } }
  save(); S.year=y; S.view='budget'; render();
}

/* =====================================================================
   9. IMPORT / EXPORT
   ===================================================================== */
function download(name, text, type){ if(NATIVE){ nativeSave(name, text); return; } const b=new Blob([text],{type}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),2000); }
function exportJson(){
  dialog(`<h3>Backup speichern</h3><p class="small muted" style="margin-top:-8px">Das Backup wird mit einem Passwort verschlüsselt. Ohne Passwort lässt es sich nicht öffnen – auch nicht von dir. Der Wallet-Token ist nie im Backup.</p>
    <label class="f">Backup-Passwort (mind. 8 Zeichen)<input id="bp1" type="password" autocomplete="new-password"></label>
    <label class="f">Passwort wiederholen<input id="bp2" type="password" autocomplete="new-password"></label>
    ${chk('bplain',false,'Unverschlüsselt speichern (nicht empfohlen)')}
    <p class="small neg" id="berr"></p>${acts(true)}`,
  ()=>{ const plain=$('#bplain').checked, p1=$('#bp1').value, p2=$('#bp2').value, err=t=>{ $('#berr').textContent=t; return false; };
    if(!plain){ if(p1.length<8) return err('Das Passwort muss mindestens 8 Zeichen haben.'); if(p1!==p2) return err('Die Passwörter stimmen nicht überein.'); }
    D.backupAt=new Date().toISOString(); save();
    const data = JSON.parse(JSON.stringify(D,(k,v)=>k==='_p'?undefined:v)), name='Finanzen_Backup_'+todayIso();
    if(plain){ download(name+'.json', JSON.stringify(data,null,1), 'application/json'); return; }
    (async()=>{ const salt=crypto.getRandomValues(new Uint8Array(16)), key=await deriveKey(p1, salt);
      const blob=await encryptObj(key, salt, data); download(name+'_verschluesselt.json', JSON.stringify({format:'finanzen-backup-enc', ...blob}), 'application/json'); })();
  });
}
async function importData(d){
  if(d.format==='finanzen-backup-enc'){
    return new Promise(res=>dialog(`<h3>Verschlüsseltes Backup</h3><label class="f">Backup-Passwort<input id="ip" type="password" autocomplete="current-password"></label><p class="small neg" id="ierr"></p>${acts(true)}`,
      ()=>{ (async()=>{ try{ const key=await deriveKey($('#ip').value, unb64(d.salt)); const data=await decryptObj(key, d); $('#dlg').close(); res(await importData(data)); }
        catch(e){ $('#ierr').textContent='Falsches Passwort oder beschädigte Datei.'; } })(); return false; }));
