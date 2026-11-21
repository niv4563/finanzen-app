
/* =====================================================================
   19. VERSION 1.4 – MENÜ WIE WALLET, AUTOMATISCHE REGELN, WALLET-SCHNITTSTELLE, SCREENSHOTS
   ===================================================================== */

/* ---------- Seitenmenü links (wie Wallet): Gruppen einklappbar, auf dem Handy als Schublade ---------- */
var NAV4 = [
  [null, [['start',ICON.start,'Startseite'],['buchungen',ICON.list,'Buchungen'],['statistik',ICON.stats,'Statistik']]],
  ['Geplante Zahlungen', [['rechnungen',ICON.bill,'Rechnungen'],['abos',ICON.repeat,'Abos'],['jahr',ICON.cal,'Jahreskosten']]],
  ['Budgets & Ziele', [['budget',ICON.budget,'Budgets'],['budgetedit',ICON.cal,'Plan bearbeiten'],['ziele',ICON.goal,'Ziele & Reserve'],['wuensche',ICON.star,'Wünsche']]],
  ['Konten', [['konten',ICON.bank,'Konten & Schulden'],['analyse',ICON.stats,'Detail-Analyse']]],
  ['Planung', [['home',ICON.plan,'Cockpit & Stufen'],['empfehlungen',ICON.plan,'Empfehlungen'],['monat',ICON.cal,'Monatsabschluss'],['prognose',ICON.plan,'Prognose'],['regeln',ICON.goal,'Ampel-Regeln']]],
  ['Import', [['import',ICON.list,'Bankdateien'],['wallet',ICON.repeat,'Wallet-Verbindung'],['autoregeln',ICON.gear,'Automatische Regeln']]],
  ['Einstellungen', [['daten',ICON.gear,'Daten & Sicherheit']]],
];
var TITLES = {start:'Startseite', buchungen:'Buchungen', statistik:'Statistik', rechnungen:'Rechnungen', abos:'Abos', jahr:'Jahreskosten', budget:'Budgets', budgetedit:'Plan bearbeiten', ziele:'Ziele', wuensche:'Wünsche', konten:'Konten', analyse:'Analyse', home:'Cockpit', empfehlungen:'Empfehlungen', monat:'Monatsabschluss', prognose:'Prognose', regeln:'Regeln', import:'Import', wallet:'Wallet', autoregeln:'Automatische Regeln', daten:'Einstellungen', mehr:'Menü'};
var navCol = (()=>{ try{ return JSON.parse(localStorage.getItem(KEY+'.navcol')||'{}'); }catch(e){ return {}; } })();
function navSave(){ try{ localStorage.setItem(KEY+'.navcol', JSON.stringify(navCol)); }catch(e){} }
function drawer(open){ document.body.classList.toggle('drawer', open); }
(function navSetup(){
  const h = document.querySelector('header'); if(!h || $('#hamb')) return;
  h.insertAdjacentHTML('afterbegin', `<button class="ibtn hamb" id="hamb" data-act="drawer" aria-label="Menü">${ICON.more}</button>`);
  document.body.insertAdjacentHTML('beforeend', '<div id="scrim" data-act="drawerclose"></div>');
})();

function render(){
  if(S.locked){ document.body.classList.remove('drawer'); renderLock(); $('header h1').textContent='Finanzen'; return; }
  if(!D){ renderWelcome(); return; }
  if(!D.flags?.cats1) applyUpgrades();
  if(!D.flags?.arch2) applyUpgrades2();
  if(!D.flags?.leute1) applyUpgrades3();
  D.bills ??= []; D.bal ??= {}; D.accMap ??= {}; D.rules ??= [];
  if(!S.v11){ S.v11=true; if(S.view==='home') S.view='start'; }
  if(S.view==='mehr') S.view='start';
  if(NATIVE && !CK && !S.pinAsked && !$('#dlg').open){ S.pinAsked = true; setTimeout(()=>pinDialog('set'), 300); }
  calc();
  const liq = activeAccs().filter(a=>a.liquid||a.main).reduce((s,a)=>{ const b=bankBalance(a.id); return s + (b ? b.v : (C.m[C.now]?.acc[a.id]?.start ?? 0)); },0);
  $('#nav1').innerHTML = `<div class="dhead"><b>Finanzen</b><span class="small">Verfügbar CHF ${chf0(liq)}</span><button class="ibtn mini" data-act="navmini" title="Menü schmal/breit">‹</button></div>`
    + NAV4.map(([sec,items],gi)=>{ const col = sec && navCol[sec];
      return (sec ? `<div class="sec tog ${col?'col':''}" data-act="navtog" data-sec="${esc(sec)}"><span>${sec}</span><i>▾</i></div>` : '')
        + `<div class="grp ${col?'hide':''}">` + items.map(([id,i,n])=>`<a data-go="${id}" class="${S.view===id?'on':''}" title="${esc(n)}"><span class="i">${i}</span><span class="lbl">${n}</span></a>`).join('') + '</div>'; }).join('');
  $('#nav2').innerHTML = '';
  if(S.view==='budgetedit') S.bmode ??= 'monat';
  const bm = budgetMode();
  const monthV = ['monat','buchungen','analyse','budget'].includes(S.view) || (S.view==='budgetedit' && bm==='monat'), yearV = ['budgetedit','konten','regeln'].includes(S.view) && !monthV;
  $('#mnav').style.visibility = (monthV||yearV) ? 'visible':'hidden';
  $('#mlabel').textContent = monthV ? ymLabel(S.ym) : S.year;
  $('header h1').textContent = TITLES[S.view] || 'Finanzen';
  $('#fab').classList.toggle('hide', !['start','monat','buchungen'].includes(S.view));
  const V = {start:vStart, statistik:vStatistik, budget:vBudgetW, budgetedit:vBudget, rechnungen:vRechnungen, analyse:vAnalyse, prognose:vPrognose, buchungen:vBuchungen2, jahr:vJahr, empfehlungen:vEmpf, home:vHome, monat:vMonat, konten:vKonten, ziele:vZiele, wuensche:vWuensche, regeln:vRegeln, abos:vAbos, daten:vDaten2, import:vImport, wallet:vWallet, autoregeln:vAutoRegeln}[S.view] || vStart;
  $('#main').classList.toggle('wide', (S.view==='budgetedit' && budgetMode()==='jahr') || ['konten','regeln'].includes(S.view));
  $('#main').innerHTML = shotBanner() + updateBanner() + backupBanner() + wbBanner()
    + (S.undo ? `<div class="hint row"><span class="sp">✓ ${esc(S.undo.label)} übernommen.</span><button class="btn sm" data-act="undo">Rückgängig</button></div>` : '') + V();
  if(!S.wbAutoDone){ S.wbAutoDone = true; setTimeout(()=>wbSync({quiet:true, auto:true}), 2500); }
}

/* ---------- Import-Seite ---------- */
function vImport(){
  const n = D.tx.filter(t=>t.imp).length, last = D.tx.filter(t=>t.imp).map(t=>t.d).sort().at(-1);
  return `<div class="wcard"><h3>Bankdateien hochladen</h3><div class="wsub">${n} importierte Buchungen${last?' · neueste vom '+last.split('-').reverse().join('.'):''}</div>
    <p class="small">CSV-Datei so hochladen, wie sie von der Bank kommt (PostFinance Privatkonto, Sparkonto, Kreditkarte, Wallet-Export oder andere Banken). Mehrere Dateien auf einmal sind möglich; was schon da ist, wird übersprungen.</p>
    <button class="btn pri" data-act="bkimport">⬆ Bankdatei hochladen</button>
    <p class="small muted">PostFinance E-Finance → Konto → Kontobewegungen → Exportieren → CSV.</p></div>
  <div class="wcard"><h3>Wallet by BudgetBakers</h3><p class="small">Buchungen direkt aus Wallet übernehmen – einmalig alles oder laufend automatisch.</p><button class="btn" data-go="wallet">Wallet-Verbindung öffnen</button></div>
  <div class="wcard"><h3>Automatische Regeln</h3><p class="small">${D.rules.length} eigene Regeln · ${Object.keys(D.walletMap).length} gelernte Händler. Regeln ordnen Buchungen beim Import automatisch zu.</p><button class="btn" data-go="autoregeln">Regeln öffnen</button></div>`;
}

/* ---------- Automatische Regeln (wie Wallet): Bedingungen → Kategorie ---------- */
function ruleMatch(x){   // x: {text, sa, acc}
  const t = bkNorm(x.text);
  for(const r of D.rules||[]){
    if(r.off) continue;
    const terms = String(r.text||'').split(',').map(s=>bkNorm(s)).filter(Boolean);
    if(terms.length && !terms.some(w=>t.includes(w))) continue;
    if(!terms.length && !r.min && !r.max) continue;
    if(r.dir==='out' && x.sa>=0) continue;
    if(r.dir==='in' && x.sa<=0) continue;
    if(r.acc && r.acc!==x.acc) continue;
    const a = Math.abs(x.sa);
    if(r.min && a < r.min) continue;
    if(r.max && a > r.max) continue;
    return r;
  }
  return null;
}
var ruleCatName = c => c==='_skip' ? 'nicht übernehmen' : bkName(c);
function vAutoRegeln(){
  const learned = Object.entries(D.walletMap).sort();
  return `<div class="row"><p class="sub sp" style="margin:0">Regeln werden beim Import von oben nach unten geprüft – die erste passende gilt. Danach kommen die gelernten Händler und die eingebauten Regeln.</p></div>
  <div class="wcard"><div class="row"><h3 class="sp">Eigene Regeln</h3><button class="btn sm pri" data-act="ruleadd">+ Regel</button></div>
    ${D.rules.map((r,i)=>`<div class="rrow2 ${r.off?'off':''}"><div class="sp" data-act="ruleedit" data-i="${i}"><b>${esc(r.name||r.text||'Regel')}</b>
        <div class="small muted">${r.text?'Text enthält «'+esc(r.text)+'»':'jeder Text'}${r.dir==='out'?' · Ausgabe':r.dir==='in'?' · Einnahme':''}${r.acc?' · '+esc(accName(r.acc)):''}${r.min||r.max?` · CHF ${r.min||0}–${r.max||'∞'}`:''} → <b style="color:var(--ink)">${esc(ruleCatName(r.cat))}</b>${r.off?' · ausgeschaltet':''}</div></div>
      <button class="ibtn" data-act="ruleup" data-i="${i}" title="nach oben">↑</button><button class="ibtn" data-act="ruledn" data-i="${i}" title="nach unten">↓</button></div>`).join('') || '<p class="small muted">Noch keine eigenen Regeln. Beispiel: Text enthält «Migros, Coop, Denner» → Lebensmittel.</p>'}
    ${D.rules.length?'<a class="wmore" data-act="ruleapply">Regeln auf alle importierten Buchungen anwenden</a>':''}</div>
  <div class="wcard"><h3>Gelernte Händler (${learned.length})</h3><div class="wsub">Entstehen automatisch, wenn du eine Buchung zuordnest.</div>
    ${learned.map(([k,v])=>`<div class="li small"><span class="sp">${esc(k)}</span><span>${esc(ruleCatName(v))}</span><button class="ibtn" data-act="ruledel" data-k="${esc(k)}" title="Vergessen">✕</button></div>`).join('') || '<p class="small muted">Noch keine.</p>'}</div>`;
}
function ruleDialog(i){
  const isNew = i==null, r = isNew ? {text:'', dir:'out', acc:'', cat:'', name:''} : {...D.rules[i]};
  dialog(`<h3>${isNew?'Neue Regel':'Regel bearbeiten'}</h3>
    <label class="f">Name (optional)<input id="rn" value="${esc(r.name||'')}" placeholder="z. B. Einkäufe"></label>
    <label class="f">Text enthält (mehrere mit Komma)<input id="rt" value="${esc(r.text||'')}" placeholder="migros, coop, denner"></label>
    <div class="grid g2" style="gap:0 12px"><label class="f">Art<select id="rd"><option value="">Ausgabe und Einnahme</option><option value="out" ${r.dir==='out'?'selected':''}>nur Ausgabe</option><option value="in" ${r.dir==='in'?'selected':''}>nur Einnahme</option></select></label>
    <label class="f">Konto<select id="ra2"><option value="">alle Konten</option>${activeAccs().map(a=>`<option value="${a.id}" ${r.acc===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label>
    <label class="f">Betrag ab CHF<input id="rmin" inputmode="decimal" value="${r.min||''}"></label><label class="f">Betrag bis CHF<input id="rmax" inputmode="decimal" value="${r.max||''}"></label></div>
    <label class="f">Dann zuordnen zu<select id="rc"><option value="">– bitte wählen –</option><option value="${BK_TRANSFER}" ${r.cat===BK_TRANSFER?'selected':''}>Übertrag zwischen eigenen Konten</option><option value="_skip" ${r.cat==='_skip'?'selected':''}>nicht übernehmen (ignorieren)</option>${catOptions(r.cat)}</select></label>
    ${chk('roff', !!r.off, 'Regel ausschalten')}
    <p class="small neg" id="rerr"></p>${acts(isNew)}`,
  k=>{ if(k==='del'){ D.rules.splice(i,1); return; }
    const nr = {id:r.id||'r'+uid(), name:val('rn').trim(), text:val('rt').trim(), dir:val('rd'), acc:val('ra2'), cat:val('rc'), min:parseNum(val('rmin'))||0, max:parseNum(val('rmax'))||0, off:$('#roff').checked};
    if(!nr.cat){ $('#rerr').textContent='Bitte eine Kategorie wählen.'; return false; }
    if(!nr.text && !nr.min && !nr.max){ $('#rerr').textContent='Bitte einen Text oder einen Betrag angeben.'; return false; }
    if(isNew) D.rules.push(nr); else D.rules[i]=nr; });
}
function rulesApplyAll(){
  let n=0; const del=[];
  for(const t of D.tx){ if(!t.imp) continue; const r = ruleMatch({text:t.n, sa:t.sa, acc:t.bacc}); if(!r || r.cat===t.c) continue;
    if(r.cat==='_skip'){ del.push(t.id); continue; }
    t.c = r.cat; t.a = r.cat===BK_TRANSFER ? 0 : r.cat==='_inc' ? t.sa : -t.sa; n++; }
  if(del.length){ D.tx = D.tx.filter(t=>!del.includes(t.id)); del.forEach(markDel); }
  return n + del.length;
}

/* ---------- Import mit Regeln (ersetzt die Version aus 1.1) ---------- */
function bkApply(results, opt={}){
  const have = new Set(D.tx.map(t=>t.id)), snap = JSON.stringify(D), stat = {neu:0, doppelt:0, ersetzt:0, transfer:0, offen:0, rechnungen:0, regeln:0, ignoriert:0, files:[]};
  const added=[];
  for(const r of results){
    if(r.err){ stat.files.push(`${r.file}: ${r.err}`); continue; }
    const occ={}; let n=0, latest=null;
    for(const x of r.list){
      const accId = r.f.wallet ? D.accMap['wallet:'+(x.wacc||'Wallet')] : D.accMap[r.f.accKey];
      if(!accId) continue;
      const base = [accId, x.d, x.sa.toFixed(2), bkNorm(x.text).slice(0,60)].join('|'); occ[base]=(occ[base]||0)+1;
      const id = x.wid ? 'wb_'+String(x.wid).slice(0,80) : 'b_'+bkHash(base+'|'+occ[base]);
      if(!latest || x.d>=latest.d) latest = {d:x.d, saldo:x.saldo};
      if(have.has(id) || D.del?.includes(id)){ stat.doppelt++; continue; }
      const m = r.f.wallet && x.wcat ? x.wcat.toUpperCase().slice(0,40) : bkMerchant(x.text);
      if(D.walletMap?.[m]==='_skip'){ stat.ignoriert++; continue; }
      let c = null;
      const rule = ruleMatch({text:x.text+(x.wcat?' '+x.wcat:''), sa:x.sa, acc:accId});
      if(rule){ if(rule.cat==='_skip'){ stat.ignoriert++; continue; } c = rule.cat; stat.regeln++; }
      else if(x.wtransfer || BK_TRANSFER_RX.test(x.text)) c = BK_TRANSFER;
      else if(r.f.wallet && x.wcat && D.walletMap?.[x.wcat.toUpperCase().slice(0,40)]) c = D.walletMap[x.wcat.toUpperCase().slice(0,40)];
      if(!c) c = bkRuleCat(x.text, m);
      if(!c && x.sa>0 && /zins|zinsgutschrift/i.test(x.text)) c = '_inc';
      if(!c && x.sa>0) c = accId===mainAcc().id && (x.sa>=1500 || /lohn|gehalt|salaer|salär|salaire|lohnzahlung/i.test(x.text)) ? '_inc' : null;
      const t = {id, d:x.d, c:c||'_offen', a: c===BK_TRANSFER ? 0 : c==='_inc' ? x.sa : -x.sa, sa:x.sa, n:x.text.slice(0,140), wc:m, src:r.f.wallet?'wallet':'bank', imp:true, bacc:accId, acc:mainAcc().id};
      D.tx.push(t); have.add(id); added.push(t); n++; stat.neu++;
    }
    if(latest && isFinite(latest.saldo) && !r.f.wallet) D.bal[D.accMap[r.f.accKey]] = {d:latest.d, v:latest.saldo};
    stat.files.push(`${r.file}: ${n} neu (${r.f.bank}${r.f.isCard?', Kreditkarte':''})`);
  }
  const imp = D.tx.filter(t=>t.imp);
  for(const t of added){ if(t.c===BK_TRANSFER) continue;
    const p = imp.find(u=>u!==t && u.bacc!==t.bacc && Math.abs(u.sa + t.sa)<0.01 && Math.abs(new Date(u.d)-new Date(t.d))<=4*864e5);
    if(p){ t.c=BK_TRANSFER; t.a=0; if(p.c!==BK_TRANSFER){ p.c=BK_TRANSFER; p.a=0; } } }
  for(const t of added) if(t.c===BK_TRANSFER){ t.a=0; stat.transfer++; }
  for(const t of added){ if(t.sa>=0 || t.c===BK_TRANSFER) continue;
    const m = D.tx.find(u=>!u.imp && !u.matched && Math.abs(Math.abs(u.a)-Math.abs(t.sa))<0.01 && Math.abs(new Date(u.d)-new Date(t.d))<=10*864e5);
    if(m){ if(t.c==='_offen' && m.c && m.c!=='_offen') t.c=m.c; if(m.bill) t.bill=m.bill; D.tx=D.tx.filter(u=>u!==m); markDel(m.id); stat.ersetzt++; } }
  for(const b of D.bills.filter(b=>b.status==='offen')){
    const key = bkNorm(b.creditor).split(' ').filter(w=>w.length>3)[0] || '', ref = String(b.ref||'').replace(/\D/g,'').slice(-6);
    const t = added.find(t=>t.sa<0 && Math.abs(-t.sa-b.amount)<0.01 && (!key || bkNorm(t.n).includes(key) || (ref && t.n.replace(/\D/g,'').includes(ref)) || Math.abs(new Date(t.d)-new Date(b.due||t.d))<=7*864e5));
    if(t){ b.status='bezahlt'; b.paid=t.d; b.tx=t.id; if(t.c==='_offen' && b.cat && b.cat!=='_inc') t.c=b.cat; stat.rechnungen++; } }
  stat.offen = added.filter(t=>t.c==='_offen').length;
  save(); calc(); checkAlerts?.();
  if(opt.quiet){ if(stat.neu){ S.wbMsg = `Wallet: ${stat.neu} neue Buchungen übernommen${stat.offen?`, ${stat.offen} ohne Kategorie`:''}.`; safeRender(); } return stat; }
  S.undo = stat.neu ? {snap, label:`Import: ${stat.neu} Buchungen`} : null;
  S.view='buchungen'; render();
  dialog(`<h3>Import abgeschlossen</h3>
    <div class="list">${stat.files.map(x=>`<div class="li small">${esc(x)}</div>`).join('')}</div>
    <div class="stats mt" style="grid-template-columns:1fr 1fr">${kpi('Neu',stat.neu)}${kpi('Schon vorhanden',stat.doppelt,'übersprungen')}${kpi('Überträge',stat.transfer,'zählen nicht als Ausgabe')}${kpi('Ohne Kategorie',stat.offen,stat.offen?'bitte zuordnen':'alles zugeordnet')}</div>
    ${stat.regeln?`<p class="small">✓ ${stat.regeln} Buchungen über deine automatischen Regeln zugeordnet.</p>`:''}
    ${stat.ignoriert?`<p class="small">${stat.ignoriert} Buchungen laut Regel nicht übernommen.</p>`:''}
    ${stat.ersetzt?`<p class="small">✓ ${stat.ersetzt} von Hand erfasste Buchungen/Belege durch die Bankbuchung ersetzt – nichts doppelt.</p>`:''}
    ${stat.rechnungen?`<p class="small">✓ ${stat.rechnungen} offene Rechnungen als bezahlt erkannt.</p>`:''}
    <div class="acts">${stat.offen?'<button class="btn" data-dlg="map">Jetzt zuordnen</button>':''}<button class="btn pri" data-dlg="cancel">Fertig</button></div>`,
  k=>{ if(k==='map'){ setTimeout(mapDialog,50); } });
  const bad = results.filter(r=>r.err && r.rows); if(bad.length) setTimeout(()=>csvDialog(bad[0].rows), 400);
  return stat;
}

/* ---------- Wallet-Schnittstelle (direkt, nur in der Android-App) ----------
   Der Token liegt nur in deinen verschlüsselten App-Daten. Die App liest nur (GET) und schreibt nichts in Wallet. */
var WB_BASE = 'https://rest.budgetbakers.com/wallet/v1/api/';
async function wbGet(path){
  const tok = D.walletApi?.token; if(!tok) throw new Error('Kein Token eingetragen.');
  const r = await plug('CapacitorHttp').request({url: WB_BASE+path, method:'GET', headers:{Authorization:'Bearer '+tok, Accept:'application/json'}, responseType:'json', connectTimeout:15000, readTimeout:30000});
  if(r.status===401 || r.status===403) throw new Error('Wallet lehnt den Token ab. Prüfe den Token und dein Premium-Abo.');
  if(r.status===409) throw new Error('Wallet bereitet die Daten noch vor. Bitte in ein paar Minuten nochmals versuchen.');
  if(r.status===429) throw new Error('Zu viele Anfragen an Wallet – bitte später nochmals.');
  if(r.status<200 || r.status>=300) throw new Error('Wallet antwortet mit Fehler '+r.status+'.');
  return typeof r.data==='string' ? JSON.parse(r.data) : r.data;
}
var wbList = (j, k) => Array.isArray(j) ? j : (j?.[k] || j?.items || j?.data || []);
async function wbSync(opt={}){
  if(!D || !NATIVE || !D.walletApi?.token || S.wbBusy) return;
  const w = D.walletApi;
  if(opt.auto && (w.auto===false || (w.last && Date.now()-new Date(w.last) < 30*60*1000))) return;
  S.wbBusy = true; if(!opt.quiet) render();
  try{
    const accs = wbList(await wbGet('accounts?limit=200'), 'accounts'), accName2 = {};
    accs.forEach(a=>{ if(a?.id) accName2[a.id] = String(a.name||a.id).slice(0,60); });
    const from = opt.from || (w.last ? new Date(new Date(w.last).getTime()-10*864e5).toISOString().slice(0,10) : (w.since || ymAdd(TODAY,-2)+'-01'));
    let all = [], offset = 0;
    for(let page=0; page<(opt.from?120:20); page++){
      const j = await wbGet(`records?limit=200&offset=${offset}&recordDate=gte.${from}`), recs = wbList(j,'records');
      all = all.concat(recs); if(j?.nextOffset==null || !recs.length) break; offset = j.nextOffset;
    }
    const list = all.filter(r=>r && r.id && r.recordDate).map(r=>{ let v = +(r.amount?.value ?? r.amount); if(r.recordType==='expense' && v>0) v=-v;
      const aid = r.accountId || r.account?.id || '', an = accName2[aid] || r.account?.name || 'Wallet';
      return {wid:r.id, d:String(r.recordDate).slice(0,10), sa:r2(v), text:[r.counterParty||r.payee, r.note].filter(Boolean).join(' · ') || (r.category?.name||'Wallet'), saldo:NaN,
        wcat:String(r.category?.name||'').slice(0,80), wacc:an, wtransfer: r.recordType==='transfer' || !!r.transfer}; }).filter(x=>x.d && isFinite(x.sa) && x.sa);
    // Konten zuordnen (einmalig)
    const unknown = [...new Set(list.map(x=>x.wacc))].filter(n=>!(('wallet:'+n) in D.accMap));
    if(unknown.length){
      if(opt.quiet){ S.wbMsg = 'Wallet: neue Konten gefunden – bitte unter «Wallet-Verbindung» zuordnen.'; w.pendingAccs = unknown; save(); return; }
      await new Promise(res=>{ dialog(`<h3>Wallet-Konten zuordnen</h3><p class="small muted" style="margin-top:-8px">Nur beim ersten Mal. Welches Konto in der App entspricht welchem Wallet-Konto?</p>
        ${unknown.map((n,i)=>`<label class="f">Wallet: «${esc(n)}»<select id="wk${i}">${activeAccs().map(a=>`<option value="${a.id}" ${a.id===bkGuessAcc(n,{})?'selected':''}>${esc(a.name)}</option>`).join('')}<option value="_skip">nicht übernehmen</option></select></label>`).join('')}${acts(true)}`,
        ()=>{ unknown.forEach((n,i)=>{ const v=val('wk'+i); if(v!=='_skip') D.accMap['wallet:'+n]=v; else D.accMap['wallet:'+n]=''; }); setTimeout(res,30); });
        $('#dlg').addEventListener('close', ()=>setTimeout(res,60), {once:true}); });
      w.pendingAccs = [];
    }
    // was schon aus einer Bankdatei da ist, nicht doppelt übernehmen
    const bankTx = D.tx.filter(t=>t.imp && t.src==='bank');
    let fromBank = 0;
    const fresh = list.filter(x=>{ const acc = D.accMap['wallet:'+x.wacc]; if(!acc) return false;
      const dup = bankTx.some(t=>t.bacc===acc && Math.abs(t.sa-x.sa)<0.01 && Math.abs(new Date(t.d)-new Date(x.d))<=2*864e5); if(dup) fromBank++; return !dup; });
    const st = bkApply([{file:'Wallet', f:{wallet:true, bank:'Wallet', accKey:'wallet'}, list:fresh}], {quiet: !!opt.quiet});
    w.last = new Date().toISOString(); w.err = null; w.n = st?.neu||0; w.checked = all.length; w.fromBank = fromBank; save();
  }catch(e){ w.err = e.message || String(e); w.errAt = new Date().toISOString(); save(); if(!opt.quiet) alert(w.err); }
  finally{ S.wbBusy = false; if(!opt.quiet) render(); }
}
function wbBanner(){
  if(S.wbMsg){ const m=S.wbMsg; return `<div class="hint row"><span class="sp">${esc(m)}</span><button class="btn sm" data-act="wbmsgok">OK</button></div>`; }
  return '';
}
function vWallet(){
  const w = D.walletApi || {}, on = !!w.token;
  if(!NATIVE) return `<div class="wcard"><h3>Wallet-Verbindung</h3><p class="small">Die direkte Verbindung zu Wallet gibt es nur in der Android-App. Hier im Browser kannst du einen Wallet-Export (CSV) unter «Bankdateien» hochladen.</p></div>`;
  const maps = Object.entries(D.accMap).filter(([k])=>k.startsWith('wallet:'));
  return `<div class="wcard"><h3>Wallet by BudgetBakers ${on?'<span class="tag g">verbunden</span>':''}</h3>
    <p class="small">Die App holt deine Buchungen direkt aus Wallet – automatisch beim Öffnen (höchstens alle 30 Minuten) oder auf Knopfdruck. Sie liest nur und ändert nichts in Wallet. Was du schon per Bankdatei importiert hast, wird nicht doppelt übernommen.</p>
    ${on ? `<div class="stats" style="grid-template-columns:1fr 1fr;border:0;margin:0 -4px">${kpi('Letzter Abgleich', w.last?new Date(w.last).toLocaleString('de-CH',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'noch nie', w.last?`${w.n||0} neu · ${w.checked||0} geprüft`:'')}${kpi('Schon aus Bankdatei', w.fromBank||0, 'übersprungen')}</div>
      ${w.err?`<p class="small neg">Letzter Fehler: ${esc(w.err)}</p>`:''}
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn pri" data-act="wbsync" ${S.wbBusy?'disabled':''}>${S.wbBusy?'Lädt …':'Jetzt abgleichen'}</button><button class="btn" data-act="wbfull">Alles übernehmen …</button></div>
      ${chk('wbauto', w.auto!==false, 'Automatisch abgleichen, wenn ich die App öffne')}
      ${maps.length?`<details class="small mt"><summary class="muted">Konten-Zuordnung (${maps.length})</summary>${maps.map(([k,v])=>`<div class="li small"><span class="sp">${esc(k.slice(7))}</span><span>${v?esc(accName(v)):'nicht übernehmen'}</span><button class="ibtn" data-act="wbaccdel" data-k="${esc(k)}" title="neu zuordnen">✕</button></div>`).join('')}</details>`:''}
      <p class="small"><a class="link" data-act="wboff">Verbindung trennen (Token löschen)</a></p>`
    : `<ol class="small" style="padding-left:18px;margin:6px 0 10px"><li>Am PC <b>web.budgetbakers.com</b> öffnen und anmelden (Wallet Premium nötig).</li><li><b>Einstellungen → API Tokens</b> → neuen Token erstellen und kopieren.</li><li>Hier einfügen und «Verbinden» tippen.</li></ol>
      <label class="f">API-Token<input id="wbtok" type="password" autocomplete="off" spellcheck="false" placeholder="Token einfügen"></label>
      <label class="f">Beim ersten Mal übernehmen ab<input id="wbsince" type="date" value="${ymAdd(TODAY,-2)}-01"></label>
      <button class="btn pri" data-act="wbconnect">Verbinden</button>
      <p class="small muted">Der Token wird nur verschlüsselt in deinen App-Daten gespeichert (wie deine Buchungen) und nur an rest.budgetbakers.com geschickt. Er steckt auch in deinem verschlüsselten Backup.</p>`}</div>`;
}

/* ---------- Screenshots für kurze Zeit erlauben ---------- */
function shotsSet(allow){
  if(!NATIVE) return;
  plug('Screen').setSecure({secure: !allow}).catch(()=>{});
  clearTimeout(S.shotTimer); S.shotsUntil = allow ? Date.now()+10*60*1000 : 0;
  if(allow) S.shotTimer = setTimeout(()=>{ shotsSet(false); if(D) render(); }, 10*60*1000);
}
function shotBanner(){
  if(!S.shotsUntil || S.shotsUntil < Date.now()) return '';
  return `<div class="hint row" style="background:color-mix(in srgb,var(--warn) 16%,var(--card))"><span class="sp"><b>Screenshots erlaubt</b> bis ${new Date(S.shotsUntil).toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'})}. Danach wieder gesperrt.</span><button class="btn sm" data-act="shotsoff">Jetzt sperren</button></div>`;
}
var _lock14 = lock;
lock = function(){ if(S.shotsUntil) shotsSet(false); _lock14(); };
var _vDaten14 = vDaten2;
vDaten2 = function(){
  let h = _vDaten14();
  if(!(NATIVE && CK)) return h;
  return h.replace('<div class="grid g2">', `<div class="grid g2"><div class="card"><h3>Screenshots</h3><p class="small muted">Zum Schutz deiner Daten sind Screenshots in der App gesperrt. Wenn du einen brauchst (z. B. um ein Problem zu zeigen), erlaube sie für 10 Minuten. Danach – und beim Sperren der App – sind sie automatisch wieder gesperrt.</p>
    ${S.shotsUntil>Date.now()?'<button class="btn" data-act="shotsoff">Screenshots wieder sperren</button>':'<button class="btn" data-act="shotson">Screenshots 10 Minuten erlauben</button>'}</div>`);
};

/* ---------- Ereignisse ---------- */
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act],[data-go]'); if(!a) return;
  if(a.dataset.go && document.body.classList.contains('drawer')){ drawer(false); return; }
  const k = a.dataset.act; if(!k) return;
  const H = {
    drawer: ()=>{ if(window.innerWidth>820){ document.body.classList.toggle('navmini'); } else drawer(!document.body.classList.contains('drawer')); },
    drawerclose: ()=>drawer(false),
    navmini: ()=>{ if(window.innerWidth>820) document.body.classList.toggle('navmini'); else drawer(false); },
    navtog: ()=>{ const s=a.dataset.sec; navCol[s]=!navCol[s]; navSave(); render(); },
    ruleadd: ()=>ruleDialog(null),
    ruleedit: ()=>ruleDialog(+a.dataset.i),
    ruleup: ()=>{ const i=+a.dataset.i; if(i>0){ [D.rules[i-1],D.rules[i]]=[D.rules[i],D.rules[i-1]]; save(); render(); } },
    ruledn: ()=>{ const i=+a.dataset.i; if(i<D.rules.length-1){ [D.rules[i+1],D.rules[i]]=[D.rules[i],D.rules[i+1]]; save(); render(); } },
    ruleapply: ()=>{ const n=rulesApplyAll(); save(); render(); alert(n?`${n} Buchungen neu zugeordnet.`:'Keine Änderungen – alles passt schon.'); },
    wbconnect: ()=>{ const t=val('wbtok').trim(); if(t.length<10){ alert('Bitte den Token aus Wallet einfügen.'); return; }
      D.walletApi = {token:t, since:val('wbsince')||ymAdd(TODAY,-2)+'-01', auto:true}; save(); wbSync({from:D.walletApi.since}); },
    wbsync: ()=>wbSync({}),
    wbfull: ()=>dialog(`<h3>Alles aus Wallet übernehmen</h3><p class="small muted" style="margin-top:-8px">Holt alle Buchungen ab dem gewählten Datum. Doppelte werden übersprungen. Bei vielen Jahren kann das eine Minute dauern.</p>
        <label class="f">Ab Datum<input id="wbf" type="date" value="2015-01-01"></label>${acts(true)}`, ()=>{ const f=val('wbf')||'2015-01-01'; setTimeout(()=>wbSync({from:f}),50); }),
    wboff: ()=>{ if(confirm('Wallet-Verbindung trennen? Der Token wird gelöscht; übernommene Buchungen bleiben.')){ delete D.walletApi; save(); render(); } },
    wbaccdel: ()=>{ delete D.accMap[a.dataset.k]; save(); render(); },
    wbmsgok: ()=>{ S.wbMsg=null; render(); },
    shotson: ()=>{ shotsSet(true); render(); },
    shotsoff: ()=>{ shotsSet(false); render(); },
  };
  if(H[k] && (D || ['drawer','drawerclose','navmini'].includes(k))){ e.stopPropagation(); H[k](); }
}, true);
document.addEventListener('change', e=>{ if(e.target.id==='wbauto' && D?.walletApi){ D.walletApi.auto = e.target.checked; save(); } });
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible' && D && CK) wbSync({quiet:true, auto:true}); });
// Wischen nach links schliesst das Menü
(function(){ let x0=null; document.addEventListener('touchstart', e=>{ if(document.body.classList.contains('drawer')) x0=e.touches[0].clientX; }, {passive:true});
  document.addEventListener('touchend', e=>{ if(x0!=null && e.changedTouches[0].clientX < x0-60) drawer(false); x0=null; }, {passive:true}); })();

// Zurück-Taste: zuerst Menü bzw. Dialog schliessen, dann zur Startseite, dann App minimieren
function initNative(){
  if(!NATIVE) return;
  const AppP = plug('App');
  ['file','csvfile'].forEach(id=>$('#'+id)?.removeAttribute('accept'));
  AppP.addListener('backButton', ()=>{
    if($('#dlg').open) $('#dlg').close();
    else if(document.body.classList.contains('drawer')) drawer(false);
    else if(!S.locked && D && S.view!=='start'){ S.view='start'; render(); scrollTo(0,0); }
    else AppP.minimizeApp();
  });
  AppP.addListener('pause', ()=>{ S.hiddenAt = Date.now(); S.bgAt = S.bgAt || Date.now(); if($('#dlg').open && CK) $('#dlg').close(); });
  AppP.addListener('resume', ()=>{ const t = S.bgAt || S.hiddenAt; if(CK && D && t && Date.now()-t > bgLockMs()) lock(); else { S.hiddenAt = null; S.lastAct = Date.now(); } S.bgAt = null; checkUpdate(false); });
  setTimeout(()=>checkUpdate(false), 1500);
}
