
/* =====================================================================
   23. VERSION 1.5.0 – WALLET-KATEGORIEN AUTOMATISCH ZUORDNEN, ZUORDNUNGS-SEITE
   ===================================================================== */
// Wallet-Kategorien (deutsch und englisch) → Kategorien dieser App. Eigene Zuordnungen haben immer Vorrang.
var WB_DEF = (()=>{ const m = {}, add = (id, list) => list.forEach(n => m[n.toUpperCase()] = id);
  add('_transfer', ['TRANSFER','Transfer','Überweisung']);
  add('_inc', ['Einkommen','Lohn, Gehalt, Rechnungen','Zinsen, Dividenden','Rückerstattungen (Steuern, Einkauf)','Verleihen, Vermietung','Schecks, Gutscheine, Essensmarken','Income','Wage, invoices','Interests, dividends','Refunds (tax, purchase)','Lending, renting','Checks, coupons']);
  add('lebensmittel', ['Lebensmittel','Groceries']);
  add('restaurant', ['Restaurant','Bar, Café','Essen & Getränke','Restaurant, fast-food','Bar, cafe','Food & Drinks']);
  add('ferien', ['Urlaub, Ausflüge, Hotels','Geschäftsreisen','Fernverkehr','Holiday, trips, hotels','Business trips','Long distance']);
  add('arbeitsweg', ['Öffentliche Verkehrsmittel','Parken','Taxi','Transport','Kraftstoff','Fahrzeug','Fahrzeugwartung','Leasing','Public transport','Parking','Fuel','Vehicle','Vehicle maintenance']);
  add('kkabos', ['Software, Apps, Spiele','TV, Streaming','Bücher, Audio, Abonnements','Software, apps, games','Books, audio, subscriptions']);
  add('bank', ['Gebühren','Finanzausgaben','Darlehen, Zinsen','Charges, Fees','Financial expenses','Loan, interests']);
  add('haushalt_dro', ['Haushalt, Garten','Drogerie, Apotheke','Bürobedarf, Werkzeuge','Wartung, Reparaturen','Postdienste','Home, garden','Drug-store, chemist','Stationery, tools','Maintenance, repairs','Postal services']);
  add('gesundheit', ['Gesundheitsversorgung, Arzt','Kontaktlinsen','Health care, doctor']);
  add('coiffeur', ['Gesundheit und Schönheit','Wellness, Schönheit','Health and beauty','Wellness, beauty']);
  add('geschenke', ['Geschenke, Freude','Wohltätigkeit, Geschenke','Lebensereignisse','Gifts, joy','Charity, gifts','Life events']);
  add('swisscom', ['Internet; Handy','Phone','Kommunikation, PC','Internet','Phone, cell phone','Communication, PC']);
  add('kleidung', ['Kleidung & Schuhe','Schmuck, Accessoires','Clothes & shoes','Jewels, accessories']);
  add('wuensche', ['Elektronik, Zubehör','Einkaufen','Möbel','Electronics, accessories','Shopping','Furniture']);
  add('fitness', ['Aktiver Sport, Fitness','Active sport, fitness']);
  add('aktiv', ['Hobbys','Kultur-, Sportveranstaltungen','Unterhaltung, Spass','Leben & Unterhaltung','Alkohol, Tabak','Lotterie, Glücksspiel','Hobbies','Culture, sport events','Life & Entertainment','Alcohol, tobacco','Lottery, gambling']);
  add('kv', ['Krankenversicherung','Health insurance']);
  add('steuern', ['Staat- / Bundessteuer','Gemeindesteuer','Wehrpflichtabgabe','Steuern','Taxes']);
  add('miete', ['Miete','Mieten','Wohnen','Hypothek','Immobilien','Energie, Nebenkosten','Strom; Wasser','Gas','Rent','Mortgage','Housing','Energy, utilities']);
  add('rueck', ['Versicherungen','Gebäudeversicherung','Autoversicherung','Fahrzeugversicherung','Insurances','Vehicle insurance']);
  add('weiterbildung', ['Bildung, persönliche Entwicklung','Education, development']);
  add('invest', ['Finanzinvestitionen','Financial investments','Investments']);
  add('sparen', ['Ersparnisse','Savings']);
  add('unbekannt', ['Beratung','Dienstleistungen','Haustiere, Tiere','Kinder','Unterhalt','Sonstiges','Fehlend','Unbekannte Ausgaben','Others','Missing','Unknown expense']);
  return m; })();
var catUsable = id => id==='_inc' || id===BK_TRANSFER || D.cats.some(c=>c.id===id && !c.archived);
function wbDefault(key){ let id = WB_DEF[String(key||'').toUpperCase()]; if(!id) return null;
  if(id==='aktiv' && !catUsable('aktiv') && catUsable('leute')) id='leute';
  if(id==='rueck' && !catUsable('rueck')) id='unbekannt';
  return catUsable(id) ? id : (catUsable('unbekannt') ? 'unbekannt' : null); }

// Reihenfolge: gelernt/eigene Zuordnung → Wallet-Standard → eingebaute Text-Regeln
function bkRuleCat(text, merchant){
  if(D.walletMap?.[merchant]) return D.walletMap[merchant];
  const d = wbDefault(merchant); if(d) return d;
  for(const [rx,cat] of BK_RULES) if(rx.test(text) && D.cats.some(c=>c.id===cat && !c.archived)) return cat;
  return null;
}

// Zeilen lesen: bei Wallet-Exporten Notiz + Empfänger als Text, Fremdwährung in CHF umrechnen (ref_currency_amount)
function bkRowsFrom(rows, f){
  const out=[], H=f.H||[], ix = n => H.indexOf(n);
  const iNote = ix('note'), iPayee = ix('payee'), iRef = ix('ref currency amount'), iCur = ix('currency');
  for(const r of rows.slice(f.hi+1)){
    if(r.length < 2) continue;
    const d = csvDate(String(r[f.date]||'').replace(/^="?|"$/g,'')); if(!d) continue;
    let sa;
    if(f.amount>=0) sa = csvNum(r[f.amount]);
    else { const cr=csvNum(r[f.credit]), db=csvNum(r[f.debit]); sa = (isFinite(cr)?Math.abs(cr):0) - (isFinite(db)?Math.abs(db):0); }
    let idSa;
    if(f.wallet && iRef>=0 && iCur>=0 && String(r[iCur]||'').trim() && String(r[iCur]).trim().toUpperCase()!=='CHF'){ const v=csvNum(r[iRef]); if(isFinite(v) && v){ idSa = r2(sa); sa = v; } }
    if(!isFinite(sa) || !sa) continue;
    const legacy = String(f.text>=0 ? r[f.text] : r.filter((x,i)=>i!==f.date).join(' ')).replace(/\s+/g,' ').trim();
    let text = legacy, idText;
    if(f.wallet && (iNote>=0 || iPayee>=0)){
      const note = String(iNote>=0 ? r[iNote]||'' : '').replace(/\s+/g,' ').trim(), payee = String(iPayee>=0 ? r[iPayee]||'' : '').replace(/\s+/g,' ').trim();
      const generic = /^(buchung|reservation|booking)?$/i.test(note);
      text = [payee, generic ? '' : note].filter(Boolean).join(' · ') || note || payee;
      idText = legacy;   // Kennung wie bisher, damit nichts doppelt importiert wird
    }
    out.push({d, sa:r2(sa), idSa, text, idText, saldo: f.saldo>=0 ? csvNum(r[f.saldo]) : NaN,
      wcat: f.cat>=0 ? String(r[f.cat]||'').trim() : '', wacc: f.acc>=0 ? String(r[f.acc]||'').trim() : '',
      wtransfer: f.transfer>=0 ? /^(true|ja|1)$/i.test(String(r[f.transfer]).trim()) : false });
  }
  return out;
}

// Import (wie 1.4) + vorhandene, noch nicht zugeordnete Buchungen bei erneutem Hochladen verbessern
function catFor(x, accId, m){
  const rule = ruleMatch({text:x.text+(x.wcat?' '+x.wcat:''), sa:x.sa, acc:accId});
  if(rule) return {c:rule.cat, rule:true};
  if(x.wtransfer || BK_TRANSFER_RX.test(x.text)) return {c:BK_TRANSFER};
  let c = bkRuleCat(x.text, m);
  if(!c && x.wcat) c = bkRuleCat(x.text, x.wcat.toUpperCase().slice(0,40));
  if(!c && x.sa>0 && /zins|zinsgutschrift/i.test(x.text)) c = '_inc';
  if(!c && x.sa>0) c = accId===mainAcc().id && (x.sa>=1500 || /lohn|gehalt|salaer|salär|salaire|lohnzahlung/i.test(x.text)) ? '_inc' : null;
  return {c};
}
var setCat = (t, c) => { t.c = c; t.a = c===BK_TRANSFER ? 0 : c==='_inc' ? t.sa : -t.sa; };
function bkApply(results, opt={}){
  const byId = new Map(D.tx.map(t=>[t.id,t])), snap = JSON.stringify(D), stat = {neu:0, doppelt:0, ersetzt:0, transfer:0, offen:0, rechnungen:0, regeln:0, ignoriert:0, verbessert:0, files:[]};
  const added=[], bankIdx = new Map();   // für Wallet: was schon aus einer Bankdatei da ist, nicht doppelt übernehmen
  for(const t of D.tx) if(t.imp && t.src==='bank'){ const k=t.bacc+'|'+t.sa.toFixed(2); (bankIdx.get(k) || bankIdx.set(k,[]).get(k)).push(t.d); }
  for(const r of results){
    if(r.err){ stat.files.push(`${r.file}: ${r.err}`); continue; }
    const occ={}; let n=0, latest=null;
    for(const x of r.list){
      const accId = r.f.wallet ? D.accMap['wallet:'+(x.wacc||'Wallet')] : D.accMap[r.f.accKey];
      if(!accId) continue;
      const base = [accId, x.d, (x.idSa ?? x.sa).toFixed(2), bkNorm(x.idText ?? x.text).slice(0,60)].join('|'); occ[base]=(occ[base]||0)+1;
      const id = x.wid ? 'wb_'+String(x.wid).slice(0,80) : 'b_'+bkHash(base+'|'+occ[base]);
      if(!latest || x.d>=latest.d) latest = {d:x.d, saldo:x.saldo};
      const m = r.f.wallet && x.wcat ? x.wcat.toUpperCase().slice(0,40) : bkMerchant(x.text);
      const ex = byId.get(id);
      if(ex || D.del?.includes(id)){ stat.doppelt++;
        if(ex && ex.imp){ let ch=false;
          if(x.text && ex.n!==x.text.slice(0,140) && x.idText!=null && ex.n===String(x.idText).slice(0,140)){ ex.n = x.text.slice(0,140); ch=true; }
          if(ex.c==='_offen'){ const k = catFor(x, accId, m); if(k.c && k.c!=='_skip'){ setCat(ex, k.c); ch=true; } }
          if(ch) stat.verbessert++; }
        continue; }
      if(D.walletMap?.[m]==='_skip'){ stat.ignoriert++; continue; }
      if(r.f.wallet && !x.wid && (bankIdx.get(accId+'|'+x.sa.toFixed(2))||[]).some(d=>Math.abs(new Date(d)-new Date(x.d))<=2*864e5)){ stat.doppelt++; continue; }
      const k = catFor(x, accId, m);
      if(k.c==='_skip'){ stat.ignoriert++; continue; }
      if(k.rule) stat.regeln++;
      const c = k.c;
      const t = {id, d:x.d, c:c||'_offen', a: c===BK_TRANSFER ? 0 : c==='_inc' ? x.sa : -x.sa, sa:x.sa, n:x.text.slice(0,140), wc:m, src:r.f.wallet?'wallet':'bank', imp:true, bacc:accId, acc:mainAcc().id};
      D.tx.push(t); byId.set(id,t); added.push(t); n++; stat.neu++;
    }
    if(latest && isFinite(latest.saldo) && !r.f.wallet) D.bal[D.accMap[r.f.accKey]] = {d:latest.d, v:latest.saldo};
    stat.files.push(`${r.file}: ${n} neu (${r.f.bank}${r.f.isCard?', Kreditkarte':''})`);
  }
  const imp = D.tx.filter(t=>t.imp);
  for(const t of added){ if(t.c===BK_TRANSFER || t.src==='wallet') continue;   // Wallet kennzeichnet Überträge selbst
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
  S.undo = (stat.neu||stat.verbessert) ? {snap, label:`Import: ${stat.neu} Buchungen`} : null;
  S.view='buchungen'; render();
  dialog(`<h3>Import abgeschlossen</h3>
    <div class="list">${stat.files.map(x=>`<div class="li small">${esc(x)}</div>`).join('')}</div>
    <div class="stats mt" style="grid-template-columns:1fr 1fr">${kpi('Neu',stat.neu)}${kpi('Schon vorhanden',stat.doppelt,'übersprungen')}${kpi('Überträge',stat.transfer,'zählen nicht als Ausgabe')}${kpi('Ohne Kategorie',stat.offen,stat.offen?'bitte zuordnen':'alles zugeordnet')}</div>
    ${stat.verbessert?`<p class="small">✓ ${stat.verbessert} schon vorhandene Buchungen nachträglich zugeordnet bzw. mit besserem Text versehen.</p>`:''}
    ${stat.regeln?`<p class="small">✓ ${stat.regeln} Buchungen über deine automatischen Regeln zugeordnet.</p>`:''}
    ${stat.ignoriert?`<p class="small">${stat.ignoriert} Buchungen laut Regel nicht übernommen.</p>`:''}
    ${stat.ersetzt?`<p class="small">✓ ${stat.ersetzt} von Hand erfasste Buchungen/Belege durch die Bankbuchung ersetzt – nichts doppelt.</p>`:''}
    ${stat.rechnungen?`<p class="small">✓ ${stat.rechnungen} offene Rechnungen als bezahlt erkannt.</p>`:''}
    <div class="acts">${stat.offen?'<button class="btn" data-dlg="map">Jetzt zuordnen</button>':''}<button class="btn pri" data-dlg="cancel">Fertig</button></div>`,
  k=>{ if(k==='map'){ S.view='zuordnung'; setTimeout(render,30); } });
  const bad = results.filter(r=>r.err && r.rows); if(bad.length) setTimeout(()=>csvDialog(bad[0].rows), 400);
  return stat;
}

// Bereits importierte Wallet-Buchungen ohne Kategorie mit den Wallet-Standards zuordnen
function wbApplyDefaults(){
  let n=0;
  for(const t of D.tx){ if(t.c!=='_offen' || !t.wc) continue;
    const c = D.walletMap?.[t.wc] || wbDefault(t.wc); if(!c || c==='_skip') continue;
    if(t.imp) setCat(t, c); else t.c = c; n++; }
  return n;
}

/* ---------- Seite «Kategorien zuordnen»: jede Wahl wird sofort gespeichert ---------- */
function vZuordnung(){
  const all = !!S.zAll, open = D.tx.filter(t=>t.wc && (all || t.c==='_offen'));
  const g = {}; for(const t of open){ (g[t.wc] ??= {n:0, s:0, ex:t.n, c:t.c}); g[t.wc].n++; g[t.wc].s += Math.abs(t.sa ?? t.a); }
  const list = Object.entries(g).sort((a,b)=>b[1].n-a[1].n);
  const nOpen = D.tx.filter(t=>t.c==='_offen').length;
  const opts = sel => `<option value="">– wählen –</option><option value="${BK_TRANSFER}" ${sel===BK_TRANSFER?'selected':''}>Übertrag zwischen eigenen Konten</option><option value="_skip">nicht übernehmen (löschen)</option>${catOptions(sel)}`;
  return `<div class="row"><p class="sub sp" style="margin:0">Eine Zeile pro Wallet-Kategorie bzw. Händler. Deine Wahl gilt sofort für alle bisherigen und künftigen Buchungen.</p></div>
  <div class="chips mt">${`<button class="chip ${all?'':'on'}" data-act="zall" data-v="0">Ohne Kategorie (${nOpen})</button><button class="chip ${all?'on':''}" data-act="zall" data-v="1">Alle</button>`}</div>
  ${nOpen && list.some(([w])=>wbDefault(w)) ? `<div class="hint row"><span class="sp">Für viele Wallet-Kategorien gibt es eine passende Kategorie in der App.</span><button class="btn sm pri" data-act="zauto">Automatisch zuordnen</button></div>` : ''}
  <div class="wcard">${list.slice(0,150).map(([w,x],i)=>`<div class="zrow"><div class="sp"><b>${esc(w)}</b><div class="small muted">${x.n}× · CHF ${chf0(x.s)} · ${esc(String(x.ex||'').slice(0,60))}</div></div>
      <select class="in zsel" data-w="${esc(w)}">${opts(D.walletMap[w] || (all && x.c!=='_offen' ? x.c : '') || '')}</select></div>`).join('') || '<p class="small muted">Alles zugeordnet. 👍</p>'}</div>`;
}
var _render150 = render;
render = function(){
  if(S.view==='zuordnung' && !S.locked && D){ const keep = S.view; S.view = 'autoregeln'; _render150(); S.view = keep;
    $('header h1').textContent = 'Kategorien zuordnen'; $('#main').innerHTML = shotBanner() + vZuordnung();
    document.querySelectorAll('nav.side a').forEach(a=>a.classList.toggle('on', a.dataset.go==='zuordnung')); return; }
  _render150();
};
document.addEventListener('change', e=>{
  const s = e.target.closest?.('.zsel'); if(!s || !D) return;
  const w = s.dataset.w, v = s.value; if(!v) return;
  if(v==='_skip'){ if(!confirm(`Alle Buchungen von «${w}» löschen und künftig nicht mehr übernehmen?`)){ s.value=''; return; }
    const del = D.tx.filter(t=>t.wc===w).map(t=>t.id); D.tx = D.tx.filter(t=>t.wc!==w); del.forEach(markDel); }
  else D.tx.forEach(t=>{ if(t.wc===w){ if(t.imp) setCat(t, v); else t.c = v; } });
  D.walletMap[w] = v; save(); calc();
  const y = scrollY; render(); scrollTo(0, y);
});
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act]'); if(!a || !D) return; const k = a.dataset.act;
  if(k==='mapcats' || k==='mapall'){ e.stopPropagation(); S.zAll = k==='mapall'; S.view='zuordnung'; render(); scrollTo(0,0); }
  else if(k==='zall'){ e.stopPropagation(); S.zAll = a.dataset.v==='1'; render(); }
  else if(k==='zauto'){ e.stopPropagation(); const n = wbApplyDefaults(); save(); calc(); render(); alert(n ? `${n} Buchungen zugeordnet.` : 'Nichts zuzuordnen.'); }
}, true);
NAV4.find(s=>s[0]==='Import')?.[1].splice(2, 0, ['zuordnung', ICON.list, 'Kategorien zuordnen']);
TITLES.zuordnung = 'Kategorien zuordnen';
