
/* =====================================================================
   18. VERSION 1.3 – FINGERABDRUCK, NEUE BUDGET- UND STATISTIK-SEITE, SYMBOLE
   ===================================================================== */
var BIO_KEY = KEY + '.bio';
var bioPlug = () => plug('BioLock');
var bioOn = () => NATIVE && !!localStorage.getItem(BIO_KEY);
var bioEnc = s => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
var bioDec = s => new TextDecoder().decode(Uint8Array.from(atob(s), c=>c.charCodeAt(0)));
function bioClear(){ localStorage.removeItem(BIO_KEY); if(NATIVE) bioPlug()?.disable().catch(()=>{}); }

// Fingerabdruck einrichten: PIN einmal bestätigen, dann wird sie im Sicherheitschip des Handys verschlüsselt.
async function bioSetup(){
  let st; try{ st = await bioPlug().status(); }catch(e){ st = {available:false}; }
  if(!st.available){ alert(st.reason==='keinFinger' ? 'Auf dem Handy ist noch kein Fingerabdruck eingerichtet. Einstellungen → Sicherheit und Datenschutz → Biometrie → Fingerabdrücke.' : 'Dieses Handy unterstützt kein sicheres Entsperren mit Fingerabdruck.'); return; }
  dialog(`<h3>Mit Fingerabdruck entsperren</h3>
    <p class="small muted" style="margin-top:-8px">Bestätige einmal deine PIN. Sie wird danach im Sicherheitschip des Handys verschlüsselt und nur nach deinem Fingerabdruck freigegeben. Kommt ein neuer Fingerabdruck im Handy dazu, brauchst du wieder die PIN.</p>
    <label class="f">PIN<input id="bp" type="password" inputmode="numeric" autocomplete="current-password"></label><p class="small neg" id="berr"></p>${acts(true)}`,
  ()=>{ const pin = val('bp');
    (async()=>{ if(!pin || !(await verifyPin(pin))){ alert('Die PIN ist falsch.'); return; }
      try{ const r = await bioPlug().enable({secret:bioEnc(pin)}); localStorage.setItem(BIO_KEY, r.data); render(); alert('Fertig. Ab jetzt entsperrst du die App mit deinem Fingerabdruck.'); }
      catch(e){ if(e?.code!=='CANCELED') alert('Fingerabdruck konnte nicht eingerichtet werden.'); } })(); });
}
async function bioUnlock(){
  const data = localStorage.getItem(BIO_KEY); if(!data) return;
  const msg = t => { const e=$('#pinmsg'); if(e){ e.textContent=t; e.className='small muted'; } };
  try{
    const r = await bioPlug().unlock({data}); msg('Entschlüssle …');
    await unlock(bioDec(r.secret));
    const ys=years(); if(!ys.includes(S.year)) S.year=ys.at(-1); render();
  }catch(e){
    if(e?.code==='INVALIDATED' || e?.code==='NOT_ENROLLED'){ localStorage.removeItem(BIO_KEY); msg('Die Fingerabdrücke im Handy haben sich geändert. Bitte mit PIN entsperren und den Fingerabdruck neu einrichten.'); }
    else if(e?.code==='LOCKOUT') msg('Zu viele Versuche mit dem Fingerabdruck. Bitte PIN verwenden.');
    else if(e?.code!=='CANCELED') msg('Fingerabdruck nicht erkannt. Bitte PIN verwenden.');
  }
}
var _renderLock13 = renderLock;
renderLock = function(){
  _renderLock13();
  if(!bioOn()) return;
  const f = $('#unlockf'); if(f && !$('#biobtn')) f.insertAdjacentHTML('afterend', `<button class="btn pri" id="biobtn" data-act="biounlock" style="width:100%;margin-top:10px;min-height:48px">${ICON.finger} Mit Fingerabdruck entsperren</button>`);
  if(!S.bioTried){ S.bioTried = true; setTimeout(bioUnlock, 250); }
};
var _lock13 = lock;
lock = function(){ S.bioTried = false; _lock13(); };
var _setPin13 = setPin;
setPin = async function(pin){ await _setPin13(pin); bioClear(); };
var _removePin13 = removePin;
removePin = async function(){ bioClear(); return _removePin13(); };

/* ---------- Symbole (statt Schriftzeichen) ---------- */
var svgI = d => `<svg class="ico" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
var ICON = {
  start: svgI('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>'),
  list: svgI('<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>'),
  budget: svgI('<circle cx="12" cy="12" r="9"/><path d="M12 3v9l6.4 6.4"/>'),
  stats: svgI('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  more: svgI('<path d="M4 6h16M4 12h16M4 18h16"/>'),
  bill: svgI('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>'),
  plan: svgI('<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>'),
  star: svgI('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'),
  bank: svgI('<path d="M3 10 12 4l9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>'),
  goal: svgI('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
  gear: svgI('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  repeat: svgI('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'),
  cal: svgI('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>'),
  finger: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" style="vertical-align:-4px;margin-right:4px"><path d="M7 11a5 5 0 0 1 10 0v2a14 14 0 0 1-1.5 6.5"/><path d="M12 11v3a10 10 0 0 1-2 6"/><path d="M4.5 8.5A8 8 0 0 1 19.6 9M4 13v-1M20 13.5a18 18 0 0 1-.6 3.5"/><path d="M9 13a11 11 0 0 1-1.4 5.5"/></svg>',
};
NAV2 = [
  ['Alltag', [['start',ICON.start,'Start'],['buchungen',ICON.list,'Buchungen'],['budget',ICON.budget,'Budget'],['statistik',ICON.stats,'Statistik'],['rechnungen',ICON.bill,'Rechnungen']]],
  ['Planung', [['home',ICON.plan,'Cockpit & Stufen'],['empfehlungen',ICON.plan,'Empfehlungen'],['budgetedit',ICON.cal,'Plan bearbeiten'],['jahr',ICON.cal,'Jahreskosten'],['wuensche',ICON.star,'Wünsche'],['prognose',ICON.plan,'Prognose']]],
  ['Vermögen & Kontrolle', [['konten',ICON.bank,'Konten & Schulden'],['ziele',ICON.goal,'Ziele & Reserve'],['analyse',ICON.stats,'Detail-Analyse'],['regeln',ICON.goal,'Regeln'],['abos',ICON.repeat,'Abos'],['daten',ICON.gear,'Daten & Sicherheit']]],
];
BOTTOM2 = [['start',ICON.start,'Start'],['buchungen',ICON.list,'Buchungen'],['budget',ICON.budget,'Budget'],['statistik',ICON.stats,'Statistik'],['mehr',ICON.more,'Mehr']];

/* ---------- Budget wie bei Wallet: pro Kategorie «noch übrig» ---------- */
function vBudgetW(){
  const ym = S.ym, m = C.m[ym];
  if(!m) return head('Budget '+ymLabel(ym)) + '<div class="wcard"><p class="muted">Für diesen Monat gibt es noch keinen Plan.</p><button class="btn pri" data-go="budgetedit">Plan erstellen</button></div>';
  const groups = ['fix','leben','freizeit','schulden','spar'];
  const rows = c => ({c, plan:m.plan[c.id]||0, ist:Math.max(0, C.ist[c.id]?.[ym]||0)});
  const isNow = ym===TODAY, dim = new Date(+ym.slice(0,4), +ym.slice(5), 0).getDate(), daysLeft = isNow ? dim - new Date().getDate() + 1 : (ym>TODAY?dim:0);
  const flex = D.cats.filter(c=>['leben','freizeit'].includes(c.group)).map(rows), fPlan = flex.reduce((s,x)=>s+x.plan,0), fIst = flex.reduce((s,x)=>s+x.ist,0), fLeft = fPlan - fIst;
  const card = g => { const list = D.cats.filter(c=>c.group===g && !c.archived).map(rows).filter(x=>x.plan>0 || x.ist>0); if(!list.length) return '';
    const P = list.reduce((s,x)=>s+x.plan,0), I = list.reduce((s,x)=>s+x.ist,0);
    return `<div class="wcard"><div class="row"><i class="gdot" style="background:${GROUPS[g].c}"></i><h3 class="sp">${GROUPS[g].n}</h3><span class="small muted num">${chf0(I)} / ${chf0(P)}</span></div>
      ${list.sort((a,b)=>(b.ist/(b.plan||1))-(a.ist/(a.plan||1))).map(x=>{ const p = x.plan ? x.ist/x.plan : (x.ist?2:0), left = x.plan - x.ist, col = p>1?'var(--bad)':p>0.85?'var(--warn)':GROUPS[g].c;
        return `<div class="brow3" data-go="budgetedit"><div class="row"><span class="sp nm">${esc(x.c.name)}</span><b class="num">${chf0(x.ist)}</b><span class="small muted num"> / ${chf0(x.plan)}</span></div>
          <div class="bar"><i style="width:${Math.min(100,p*100)}%;background:${col}"></i></div>
          <div class="small ${left<0?'neg':'muted'}">${x.plan?(left<0?`CHF ${chf0(-left)} zu viel`:`noch CHF ${chf0(left)}${isNow&&g!=='fix'&&g!=='spar'&&g!=='schulden'&&daysLeft?` · ${chf0(left/daysLeft)}/Tag`:''}`):'nicht geplant'}</div></div>`; }).join('')}</div>`; };
  return `<div class="row"><h2 class="sp">Budget</h2><button class="btn sm" data-go="budgetedit">Plan bearbeiten</button></div><p class="sub">${ymLabel(ym)} · mit den Pfeilen oben wechselst du den Monat</p>
  <div class="wcard bhero"><div class="small muted">Für Alltag & Freizeit noch übrig</div><b class="num ${fLeft<0?'neg':''}">CHF ${chf0(fLeft)}</b>
    <div class="bar big"><i style="width:${Math.min(100, fPlan?fIst/fPlan*100:0)}%;background:${fIst>fPlan?'var(--bad)':'var(--acc)'}"></i></div>
    <div class="row small muted"><span class="sp">ausgegeben CHF ${chf0(fIst)} von ${chf0(fPlan)}</span>${isNow&&daysLeft?`<span>${daysLeft} Tage übrig · CHF ${chf0(Math.max(0,fLeft)/daysLeft)}/Tag</span>`:''}</div></div>
  ${groups.map(card).join('')}
  <p class="small muted">Antippen öffnet den Plan zum Bearbeiten. Was ausgegeben wurde, kommt aus deinen Buchungen (Bank-Import, Fotos, von Hand); Überträge zwischen eigenen Konten zählen nicht.</p>`;
}

/* ---------- Statistik wie bei Wallet ---------- */
function vStatistik(){
  const per = S.sper || '6', n = +per, months = Array.from({length:n},(_,i)=>ymAdd(TODAY, i-n+1));
  const inc = ym => D.tx.filter(t=>t.d.startsWith(ym) && t.c==='_inc').reduce((s,t)=>s+(t.imp?t.sa:t.a),0);
  const out = ym => D.tx.filter(t=>t.d.startsWith(ym) && t.c!=='_inc' && t.c!==BK_TRANSFER).reduce((s,t)=>s+wOut(t),0);
  const data = months.map(ym=>({ym, i:r2(inc(ym)), o:r2(Math.max(0,out(ym)))})), I = data.reduce((s,x)=>s+x.i,0), O = data.reduce((s,x)=>s+x.o,0);
  const max = Math.max(1, ...data.map(x=>Math.max(x.i,x.o))), W=320, H=150, bw = Math.min(14, (W-20)/n/2-2), step=(W-20)/n;
  const bars = data.map((x,k)=>{ const cx = 10 + step*k + step/2, hi = x.i/max*(H-34), ho = x.o/max*(H-34);
    return `<g><title>${ymLabel(x.ym)}: Eingang CHF ${chf0(x.i)}, Ausgaben CHF ${chf0(x.o)}</title>
      <rect x="${(cx-bw-1).toFixed(1)}" y="${(H-20-hi).toFixed(1)}" width="${bw}" height="${hi.toFixed(1)}" rx="3" fill="var(--acc)"/>
      <rect x="${(cx+1).toFixed(1)}" y="${(H-20-ho).toFixed(1)}" width="${bw}" height="${ho.toFixed(1)}" rx="3" fill="var(--frei)"/>
      <rect x="${(cx-step/2).toFixed(1)}" y="0" width="${step.toFixed(1)}" height="${H}" fill="transparent"/>
      <text x="${cx.toFixed(1)}" y="${H-6}" font-size="10" text-anchor="middle" fill="var(--muted)">${MN[+x.ym.slice(5)-1].slice(0,3)}</text></g>`; }).join('');
  const cat = {}; for(const t of D.tx){ if(!months.some(ym=>t.d.startsWith(ym)) || ['_inc',BK_TRANSFER].includes(t.c)) continue; cat[t.c]=(cat[t.c]||0)+wOut(t); }
  const list = Object.entries(cat).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]), top = list[0]?.[1]||1;
  const chip = (v,l) => `<button class="chip ${per===v?'on':''}" data-act="sper" data-v="${v}">${l}</button>`;
  return `<div class="row"><h2 class="sp">Statistik</h2></div>
  <div class="chips">${chip('1','Dieser Monat')}${chip('3','3 Monate')}${chip('6','6 Monate')}${chip('12','12 Monate')}</div>
  <div class="wcard"><h3>Einnahmen und Ausgaben</h3><div class="wsub">ohne Überträge zwischen eigenen Konten</div>
    <div class="stats" style="grid-template-columns:1fr 1fr 1fr;border:0;margin:0 -4px">${kpi('Eingang',chf0(I),'','pos')}${kpi('Ausgaben',chf0(O))}${kpi('Differenz',(I-O>=0?'+':'')+chf0(I-O),'',I-O<0?'neg':'pos')}</div>
    ${n>1?`<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="Eingang und Ausgaben pro Monat">${bars}</svg>
    <div class="dleg" style="display:flex;gap:16px"><div><i style="background:var(--acc)"></i>Eingang</div><div><i style="background:var(--frei)"></i>Ausgaben</div></div>`:''}</div>
  ${n===1 ? wDonut(TODAY) : ''}
  <div class="wcard"><h3>Ausgaben nach Kategorie</h3><div class="wsub">${n===1?ymLabel(TODAY):`letzte ${n} Monate · Ø pro Monat in Klammern`}</div>
    ${list.map(([c,v])=>{ const g = c==='_offen'?'_offen':(D.cats.find(x=>x.id===c)?.group||'_offen');
      return `<div class="srow"><i class="gdot" style="background:${wGrpCol(g)}"></i><div class="sp"><div class="row"><span class="sp">${esc(bkName(c))}</span><b class="num">${chf0(v)}</b>${n>1?`<span class="small muted num" style="width:64px;text-align:right">(${chf0(v/n)})</span>`:''}</div>
        <div class="bar"><i style="width:${v/top*100}%;background:${wGrpCol(g)}"></i></div></div></div>`; }).join('') || '<p class="small muted">Noch keine Ausgaben in diesem Zeitraum.</p>'}
    <a class="wmore" data-go="analyse">Detail-Analyse: Händler und Vergleich</a></div>`;
}

/* ---------- Überall: interne Kennung «_transfer» lesbar anzeigen ---------- */
['vMonat','vAnalyse','vHome','vKonten','vJahr','vBudget','vEmpf'].forEach(n=>{ const f = window[n]; if(typeof f!=='function') return;
  window[n] = function(){ return f.apply(this, arguments).replace(/>(\s*)_transfer(\s*)</g, '>$1Übertrag (eigenes Konto)$2<').replace(/>(\s*)_offen(\s*)</g, '>$1Ohne Kategorie$2<'); }; });

/* ---------- Ansicht mit allen Seiten ---------- */
function render(){
  if(S.locked){ renderLock(); return; }
  if(!D){ renderWelcome(); return; }
  if(!D.flags?.cats1) applyUpgrades();
  if(!D.flags?.arch2) applyUpgrades2();
  if(!D.flags?.leute1) applyUpgrades3();
  D.bills ??= []; D.bal ??= {}; D.accMap ??= {};
  if(!S.v11){ S.v11=true; if(S.view==='home') S.view='start'; }
  if(NATIVE && !CK && !S.pinAsked && !$('#dlg').open){ S.pinAsked = true; setTimeout(()=>pinDialog('set'), 300); }
  calc();
  const a = id => `class="${S.view===id?'on':''}"`;
  $('#nav1').innerHTML = NAV2.map(([sec,items])=>`<div class="sec">${sec}</div>`+items.map(([id,i,n])=>`<a data-go="${id}" ${a(id)}><span class="i">${i}</span>${n}</a>`).join('')).join('');
  const inBottom = BOTTOM2.map(x=>x[0]);
  $('#nav2').innerHTML = BOTTOM2.map(([id,i,n])=>`<a data-go="${id}" class="${S.view===id||(id==='mehr'&&!inBottom.includes(S.view))||(id==='budget'&&S.view==='budgetedit')?'on':''}"><span class="i">${i}</span>${n}</a>`).join('');
  if(S.view==='budgetedit') S.bmode ??= 'monat';
  const bm = budgetMode();
  const monthV = ['monat','buchungen','analyse','budget'].includes(S.view) || (S.view==='budgetedit' && bm==='monat'), yearV = ['budgetedit','konten','regeln'].includes(S.view) && !monthV;
  $('#mnav').style.visibility = (monthV||yearV) ? 'visible':'hidden';
  $('#mlabel').textContent = monthV ? ymLabel(S.ym) : S.year;
  $('#fab').classList.toggle('hide', !['start','monat','buchungen'].includes(S.view));
  const V = {start:vStart, statistik:vStatistik, budget:vBudgetW, budgetedit:vBudget, rechnungen:vRechnungen, analyse:vAnalyse, prognose:vPrognose, buchungen:vBuchungen2, jahr:vJahr, empfehlungen:vEmpf, home:vHome, monat:vMonat, konten:vKonten, ziele:vZiele, wuensche:vWuensche, regeln:vRegeln, abos:vAbos, daten:vDaten2, mehr:vMehr3}[S.view] || vStart;
  $('#main').classList.toggle('wide', (S.view==='budgetedit' && budgetMode()==='jahr') || ['konten','regeln'].includes(S.view));
  $('#main').innerHTML = updateBanner() + backupBanner()
    + (S.undo ? `<div class="hint row"><span class="sp">✓ ${esc(S.undo.label)} übernommen.</span><button class="btn sm" data-act="undo">Rückgängig</button></div>` : '') + V();
}
function vMehr3(){
  const it = [['rechnungen',ICON.bill,'Rechnungen','Fotografieren, offen, bezahlt'],['wuensche',ICON.star,'Wünsche','Erlebnisse, Anschaffungen, Rangfolge'],['konten',ICON.bank,'Konten & Schulden','Kontostände, Schuldenplan, Vermögen'],['abos',ICON.repeat,'Abos','Laufende Kosten'],['jahr',ICON.cal,'Jahreskosten','Jährliche Rechnungen mit Monat'],['ziele',ICON.goal,'Ziele & Reserve','Notgroschen und Sparziele'],
    ['home',ICON.plan,'Cockpit & Stufen','Nettovermögen, Stufenplan, Fahrplan'],['empfehlungen',ICON.plan,'Empfehlungen','Was du als Nächstes tun solltest'],['budgetedit',ICON.cal,'Plan bearbeiten','Monat oder ganzes Jahr'],['monat',ICON.cal,'Monatsabschluss','Plan gegen Ist'],['prognose',ICON.plan,'Prognose','Was wäre wenn, 10–30 Jahre'],['regeln',ICON.goal,'Regeln','Ampel, 50/30/20'],['daten',ICON.gear,'Daten & Sicherheit','Backup, Excel, App-Sperre, Fingerabdruck']];
  return `<div class="row"><h2 class="sp">Mehr</h2></div><div class="wcard morelist">${it.map(([id,i,n,d])=>`<a data-go="${id}"><span class="i">${i}</span><span class="sp"><b>${n}</b><br><span class="small muted">${d}</span></span>›</a>`).join('')}</div>`;
}

/* ---------- Daten & Sicherheit: Fingerabdruck ---------- */
var _vDaten13 = vDaten2;
vDaten2 = function(){
  let h = _vDaten13();
  if(!(NATIVE && CK)) return h;
  const on = bioOn();
  h = h.replace('Gespeichert bleibt alles verschlüsselt; die PIN wird nie gespeichert.', on ? 'Gespeichert bleibt alles verschlüsselt. Für den Fingerabdruck liegt die PIN verschlüsselt im Sicherheitschip des Handys und wird nur nach deinem Fingerabdruck freigegeben.' : 'Gespeichert bleibt alles verschlüsselt; die PIN wird nie gespeichert.');
  h = h.replace('<button class="btn sm" data-act="locknow">', `<button class="btn sm ${on?'':'pri'}" data-act="${on?'biooff':'bioon'}">${ICON.finger}${on?'Fingerabdruck ausschalten':'Mit Fingerabdruck entsperren'}</button> <button class="btn sm" data-act="locknow">`);
  return h;
};

document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act]'); if(!a) return; const k = a.dataset.act;
  if(k==='biounlock'){ e.stopPropagation(); bioUnlock(); }
  else if(k==='bioon' && D){ e.stopPropagation(); bioSetup(); }
  else if(k==='biooff' && D){ e.stopPropagation(); if(confirm('Entsperren mit Fingerabdruck ausschalten?')){ bioClear(); render(); } }
  else if(k==='sper' && D){ e.stopPropagation(); S.sper = a.dataset.v; render(); }
}, true);

// Monat/Jahr wechseln: «Budget» und «Statistik» gehen monatsweise, «Plan bearbeiten» je nach Ansicht
function step(d){
  const monthly = ['monat','buchungen','analyse','budget'].includes(S.view) || (S.view==='budgetedit' && budgetMode()==='monat');
  if(d<0 && !S.showOld && D?.settings.viewFrom){ const lim=D.settings.viewFrom;
    if(monthly){ if(ymAdd(S.ym,d)<lim) return; } else if(String(+S.year+d)<lim.slice(0,4)) return; }
  if(monthly){ S.ym=ymAdd(S.ym,d); S.year=S.ym.slice(0,4); } else S.year=String(+S.year+d);
  render();
}
