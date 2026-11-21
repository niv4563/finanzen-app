
/* =====================================================================
   15. VERSION 1.1 – BANKDATEIEN, RECHNUNGEN, START WIE WALLET, EXCEL-PLAN
   ===================================================================== */
var NAV2 = [
  ['Alltag', [['start','◉','Start'],['buchungen','≡','Buchungen'],['rechnungen','▣','Rechnungen'],['budget','▦','Budget']]],
  ['Planung', [['home','◎','Cockpit & Stufen'],['empfehlungen','✦','Empfehlungen'],['monat','▤','Monat'],['jahr','◷','Jahreskosten'],['wuensche','★','Wünsche'],['prognose','↗','Prognose']]],
  ['Vermögen & Kontrolle', [['konten','◫','Konten & Schulden'],['ziele','◎','Ziele & Reserve'],['analyse','◐','Ausgaben-Analyse'],['regeln','✓','Regeln'],['abos','↻','Abos'],['daten','⚙','Daten & Backup']]],
];
var BOTTOM2 = [['start','◉','Start'],['buchungen','≡','Buchungen'],['budget','▦','Budget'],['wuensche','★','Wünsche'],['mehr','☰','Mehr']];
var BK_TRANSFER = '_transfer';
var bkName = id => id===BK_TRANSFER ? 'Übertrag (eigenes Konto)' : catName(id);
var bkAcc = t => t.bacc || t.acc;

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
  $('#nav2').innerHTML = BOTTOM2.map(([id,i,n])=>`<a data-go="${id}" class="${S.view===id||(id==='mehr'&&!inBottom.includes(S.view))?'on':''}"><span class="i">${i}</span>${n}</a>`).join('');
  const bm = budgetMode();
  const monthV = ['monat','buchungen','analyse'].includes(S.view) || (S.view==='budget' && bm==='monat'), yearV = ['budget','konten','regeln'].includes(S.view) && !monthV;
  $('#mnav').style.visibility = (monthV||yearV) ? 'visible':'hidden';
  $('#mlabel').textContent = monthV ? ymLabel(S.ym) : S.year;
  $('#fab').classList.toggle('hide', !['start','monat','buchungen'].includes(S.view));
  const V = {start:vStart, rechnungen:vRechnungen, analyse:vAnalyse, prognose:vPrognose, buchungen:vBuchungen2, jahr:vJahr, empfehlungen:vEmpf, home:vHome, monat:vMonat, budget:vBudget, konten:vKonten, ziele:vZiele, wuensche:vWuensche, regeln:vRegeln, abos:vAbos, daten:vDaten2, mehr:vMehr2}[S.view] || vStart;
  $('#main').classList.toggle('wide', (S.view==='budget' && budgetMode()==='jahr') || ['konten','regeln'].includes(S.view));
  $('#main').innerHTML = updateBanner() + backupBanner()
    + (S.upgradedLeute ? `<div class="hint row"><span class="sp">✓ Neu: Topf «Unter Leuten» mit CHF ${chf0(C.m[ymAdd(TODAY,1)]?.plan.leute||0)} pro Monat und Ziel ${D.settings.leuteZiel} Aktivitäten pro Monat.</span><button class="btn sm" data-act="okleute">OK</button></div>` : '')
    + (S.undo ? `<div class="hint row"><span class="sp">✓ ${esc(S.undo.label)} übernommen.</span><button class="btn sm" data-act="undo">Rückgängig</button></div>` : '') + V();
}

/* ---------- Kontostand «wie bei der Bank» ---------- */
// Anker = bekannter Stand an einem Datum (aus Bankdatei mit Saldo oder von Hand). Danach zählen importierte Buchungen.
function bankBalance(accId){
  const an = D.bal?.[accId]; if(!an) return null;
  let v = an.v; for(const t of D.tx) if(t.imp && t.bacc===accId && t.d > an.d) v += t.sa;
  return {v:r2(v), d:an.d, since: D.tx.filter(t=>t.imp && t.bacc===accId && t.d>an.d).length};
}
function balDialog(accId){
  const a = D.accounts.find(x=>x.id===accId), b = bankBalance(accId);
  dialog(`<h3>${esc(a.name)} – Kontostand</h3>
    <p class="small muted" style="margin-top:-8px">Trag den Stand ein, den deine Bank heute anzeigt (Schulden mit Minus). Danach rechnet die App mit jeder importierten Buchung weiter – wie Wallet.</p>
    <label class="f">Stand CHF<input id="bv2" inputmode="decimal" value="${b?chf(b.v):''}"></label>
    <label class="f">Stand per<input id="bd2" type="date" value="${todayIso()}"></label>${acts(true)}`,
  ()=>{ const v=parseNum(val('bv2')); if(isNaN(v)||val('bv2').trim()==='') return false;
    D.bal[accId]={d:val('bd2')||todayIso(), v};
    const ym=(val('bd2')||todayIso()).slice(0,7); if(C.m[ym]?.acc[accId] && (val('bd2')||'').endsWith('-01')) (D.ist[accId]??={})[ym]=v; });
}

/* ---------- Bankdateien einlesen (unverändert, wie von der Bank geladen) ---------- */
var BK_RULES = [
  [/migros|coop|denner|aldi|lidl|volg|\bspar\b|landi|lebensmittel|bäckerei|baeckerei|metzgerei/i,'lebensmittel'],
  [/swisscom|\bsalt\b|sunrise|wingo|yallo|quickline/i,'swisscom'],
  [/\bsbb\b|postauto|\bbls\b|zvv|libero|a-welle|tnw|ostwind|bernmobil|velokeller|parking|parkhaus/i,'arbeitsweg'],
  [/movemi|fitness|update fitness|activ fitness|basefit/i,'fitness'],
  [/steuer|steueramt|kantonale steuer/i,'steuern'],
  [/helsana|swica|\bcss\b|sanitas|concordia|visana|\bkpt\b|assura|sympany|atupri|groupe mutuel|\böKK\b|oekk|\begk\b/i,'kv'],
  [/apotheke|amavita|sun ?store|zahnarzt|arztpraxis|\barzt\b|spital|praxis|medbase|dropa/i,'gesundheit'],
  [/coiffeur|barber|friseur|haarstudio/i,'coiffeur'],
  [/zalando|h&m|\bc&a\b|zara|manor|ochsner|dosenbach|vögele|bershka|uniqlo/i,'kleidung'],
  [/restaurant|mcdonald|burger king|starbucks|kebab|pizzeria|take ?away|\bcaf[eé]\b|subway|uber ?eats|just ?eat|smood|bistro|imbiss/i,'restaurant'],
  [/netflix|spotify|disney|apple\.com|itunes|google \*|youtube|prime video|microsoft|chatgpt|openai|anthropic|claude/i,'kkabos'],
  [/digitec|galaxus|brack|interdiscount|media ?markt|fust|ikea|jumbo|hornbach|bauhaus|do ?it/i,'wuensche'],
  [/drogerie|müller|mueller|\bdm\b|tchibo|depot/i,'haushalt_dro'],
  [/gebühr|gebuehr|kontoführung|kontofuehrung|jahresbeitrag karte|preis für/i,'bank'],
  [/serafe|billag/i,'rueck'],
];
var BK_TRANSFER_RX = /übertrag|uebertrag|kontoübertrag|eigenes konto|eigene konten|zwischen eigenen|saldo.*kreditkarte|kreditkarte.*(saldo|zahlung|einzahlung|rechnung)|einzahlung kreditkarte|zahlung kreditkarte|lsv.*(visa|mastercard)|ihre zahlung.*danke|zahlungseingang.*danke/i;
var bkNorm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
function bkHash(s){ let h=0x811c9dc5; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,0x01000193); } return (h>>>0).toString(36); }
function bkMerchant(text){
  let s=String(text||'');
  s=s.replace(/\b\d{2}-\d{3,7}-\d\b/g,' ').replace(/^(twint\s+zahlung an|twint\s+zahlung von|zahlung an|gutschrift von|gutschrift|lastschrift|belastung|kauf\/dienstleistung|kauf\/online-shopping|online-shopping|einkauf|bargeldbezug|bezug|twint|e-finance|auftrag debit direct|debit direct|zahlung|giro post|giro bank|bankauftrag|dauerauftrag)\s*/i,'')
       .replace(/\bvom\s*\d{1,2}\.\d{1,2}\.\d{2,4}/ig,'').replace(/kartennummer:?\s*[x\d* ]+/ig,'').replace(/\b(ch|li)\d{2}[\d a-z]{12,}/ig,'')
       .replace(/\b\d{2}\.\d{2}\.\d{2,4}\b/g,'').replace(/\b\d{2}:\d{2}\b/g,'').replace(/mitteilungen?:.*$/i,'').replace(/[*#]/g,' ').replace(/\s+/g,' ').trim();
  const w=s.split(/[ ,;:]/).filter(x=>x.length>1 && !/^\d+([.,]\d+)?$/.test(x) && !/^(ag|gmbh|sa|ch|schweiz|switzerland|zurich|zuerich|zürich)$/i.test(x));
  return (w.slice(0,2).join(' ')||'Ohne Text').toUpperCase().slice(0,40);
}
function bkRuleCat(text, merchant){
  if(D.walletMap?.[merchant]) return D.walletMap[merchant];
  for(const [rx,cat] of BK_RULES) if(rx.test(text) && D.cats.some(c=>c.id===cat && !c.archived)) return cat;
  return null;
}
function bkFindHeader(rows){
  const isH = r => { const j=r.map(c=>bkNorm(c)).join('|'); return /(^|\|)(datum|date|buchungsdatum|transaktionsdatum|valuta|record date|buchung)(\||$)/.test(j) && /(betrag|amount|gutschrift|lastschrift|belastung|debit|credit|soll|haben)/.test(j); };
  return rows.findIndex(r=>r.length>=3 && isH(r));
}
function bkDetect(rows){
  const hi = bkFindHeader(rows); if(hi<0) return null;
  const H = rows[hi].map(h=>bkNorm(h)), meta = rows.slice(0,hi).map(r=>r.join(' ')).join('\n');
  const col = (...res) => { for(const re of res){ const i=H.findIndex(h=>re.test(h)); if(i>=0) return i; } return -1; };
  const f = { hi, H,
    date: col(/^(datum|buchungsdatum|transaktionsdatum|date|record date|buchung)$/, /datum|date/),
    text: col(/avisierungstext|buchungsdetails|buchungstext|beschreibung|description|haendler|händler|merchant|text|note|payee|empfaenger/),
    amount: col(/^(betrag|amount|betrag in chf|amount in chf|betrag chf)$/),
    credit: col(/gutschrift|credit|haben|eingang/), debit: col(/lastschrift|belastung|debit|soll|ausgang/),
    saldo: col(/saldo|balance|kontostand/), cat: col(/^(category|kategorie)$/), acc: col(/^(account|konto)$/), type: col(/^(type|bewegungstyp|typ)$/),
    transfer: col(/^transfer$/), wallet: H.includes('account') && H.includes('category') && H.includes('amount') };
  if(f.date<0 || (f.amount<0 && f.credit<0 && f.debit<0)) return null;
  const idm = meta.match(/(?:konto|iban|kontonummer)\s*:?[;\s="]*((?:ch|li)\d{2}[\d a-z]{10,})/i) || meta.match(/(?:kartenkonto|karte|kartennummer)\s*:?[;\s="]*([\dx* ]{8,})/i);
  f.accKey = idm ? 'id:'+idm[1].replace(/[\s"=]/g,'').toUpperCase() : 'kopf:'+bkHash(H.join('|'));
  f.isCard = /karte|card|visa|mastercard/i.test(meta) || /buchungsdetails/.test(H.join(' '));
  f.isSaving = /spar/i.test(meta);
  f.bank = /postfinance|e-finance/i.test(meta+rows.slice(-6).map(r=>r.join(' ')).join(' ')) ? 'PostFinance' : f.wallet ? 'Wallet' : 'Bank';
  return f;
}
function bkRowsFrom(rows, f){
  const out=[];
  for(const r of rows.slice(f.hi+1)){
    if(r.length < 2) continue;
    const d = csvDate(String(r[f.date]||'').replace(/^="?|"$/g,'')); if(!d) continue;
    let sa;
    if(f.amount>=0) sa = csvNum(r[f.amount]);
    else { const cr=csvNum(r[f.credit]), db=csvNum(r[f.debit]); sa = (isFinite(cr)?Math.abs(cr):0) - (isFinite(db)?Math.abs(db):0); }
    if(!isFinite(sa) || !sa) continue;
    const text = String(f.text>=0 ? r[f.text] : r.filter((x,i)=>i!==f.date).join(' ')).replace(/\s+/g,' ').trim();
    out.push({d, sa:r2(sa), text, saldo: f.saldo>=0 ? csvNum(r[f.saldo]) : NaN,
      wcat: f.cat>=0 ? String(r[f.cat]||'').trim() : '', wacc: f.acc>=0 ? String(r[f.acc]||'').trim() : '',
      wtransfer: f.transfer>=0 ? /true|ja|1/i.test(r[f.transfer]) : false });
  }
  return out;
}
async function bkReadFile(file){
  const buf = await file.arrayBuffer();
  let txt = new TextDecoder('utf-8').decode(buf);
  if(/�/.test(txt) || /Ã[¤¶¼©]/.test(txt)) txt = new TextDecoder('windows-1252').decode(buf);
  return txt;
}
async function bkImportFiles(files){
  const results=[];
  for(const file of files){
    try{
      const rows = parseCSV(await bkReadFile(file)), f = bkDetect(rows);
      if(!f){ results.push({file:file.name, err:'Format nicht erkannt – Spalten bitte von Hand zuordnen.', rows}); continue; }
      results.push({file:file.name, f, list:bkRowsFrom(rows,f)});
    }catch(e){ results.push({file:file.name, err:'Datei konnte nicht gelesen werden ('+(e.message||e)+').'}); }
  }
  // Konten zuordnen, die noch unbekannt sind (einmalig, wird gemerkt)
  const ask=[];
  for(const r of results.filter(r=>r.f)){
    if(r.f.wallet){ for(const n of new Set(r.list.map(x=>x.wacc||'Wallet'))){ const k='wallet:'+n; if(!D.accMap[k] && !ask.some(x=>x.k===k)) ask.push({k, label:'Wallet-Konto «'+n+'»', guess:bkGuessAcc(n,r.f)}); } }
    else if(!D.accMap[r.f.accKey] && !ask.some(x=>x.k===r.f.accKey)) ask.push({k:r.f.accKey, label:`${r.f.bank}-Datei «${r.file}»${r.f.accKey.startsWith('id:')?' · '+r.f.accKey.slice(3).replace(/^(.{4}).*(.{4})$/,'$1 … $2'):''}`, guess:bkGuessAcc(r.file,r.f)});
  }
  const go = () => bkApply(results);
  if(!ask.length) return go();
  const opts = sel => activeAccs().map(a=>`<option value="${a.id}" ${a.id===sel?'selected':''}>${esc(a.name)}</option>`).join('');
  dialog(`<h3>Zu welchem Konto gehört die Datei?</h3><p class="small muted" style="margin-top:-8px">Nur beim ersten Mal – danach erkennt die App das Konto selbst.</p>
    ${ask.map((x,i)=>`<label class="f">${esc(x.label)}<select id="ak${i}">${opts(x.guess)}</select></label>`).join('')}${acts(true)}`,
  ()=>{ ask.forEach((x,i)=>{ D.accMap[x.k]=val('ak'+i); }); setTimeout(go,30); });
}
function bkGuessAcc(name, f){
  const n=bkNorm(name);
  if(f?.isCard || /karte|card|visa|master/.test(n)) return D.accounts.find(a=>a.kind==='debt' && /karte|card|kk/i.test(a.id+a.name))?.id || mainAcc().id;
  if(f?.isSaving || /spar/.test(n)) return D.accounts.find(a=>a.notgroschen)?.id || D.accounts.find(a=>/spar/i.test(a.name))?.id || mainAcc().id;
  return mainAcc().id;
}
function bkApply(results){
  const have = new Set(D.tx.map(t=>t.id)), snap = JSON.stringify(D), stat = {neu:0, doppelt:0, ersetzt:0, transfer:0, offen:0, rechnungen:0, files:[]};
  const added=[];
  for(const r of results){
    if(r.err){ stat.files.push(`${r.file}: ${r.err}`); continue; }
    const occ={}; let n=0, latest=null;
    for(const x of r.list){
      const accId = r.f.wallet ? D.accMap['wallet:'+(x.wacc||'Wallet')] : D.accMap[r.f.accKey];
      if(!accId) continue;
      const base = [accId, x.d, x.sa.toFixed(2), bkNorm(x.text).slice(0,60)].join('|'); occ[base]=(occ[base]||0)+1;
      const id = 'b_'+bkHash(base+'|'+occ[base]);
      if(!latest || x.d>=latest.d) latest = {d:x.d, saldo:x.saldo};
      if(have.has(id)){ stat.doppelt++; continue; }
      const m = r.f.wallet && x.wcat ? x.wcat.toUpperCase().slice(0,40) : bkMerchant(x.text);
      if(D.walletMap?.[m]==='_skip'){ continue; }
      let c = null;
      if(x.wtransfer || BK_TRANSFER_RX.test(x.text)) c = BK_TRANSFER;
      else if(r.f.wallet && x.wcat && D.walletMap?.[x.wcat]) c = D.walletMap[x.wcat];
      if(!c) c = bkRuleCat(x.text, m);
      if(!c && x.sa>0 && /zins|zinsgutschrift/i.test(x.text)) c = '_inc';
      if(!c && x.sa>0) c = accId===mainAcc().id && (x.sa>=1500 || /lohn|gehalt|salaer|salär|salaire|lohnzahlung/i.test(x.text)) ? '_inc' : null;
      const t = {id, d:x.d, c:c||'_offen', a: c==='_inc' ? x.sa : -x.sa, sa:x.sa, n:x.text.slice(0,140), wc:m, src:r.f.wallet?'wallet':'bank', imp:true, bacc:accId, acc:mainAcc().id};
      D.tx.push(t); have.add(id); added.push(t); n++; stat.neu++;
    }
    if(latest && isFinite(latest.saldo)) D.bal[r.f.wallet?D.accMap['wallet:'+(r.list[0]?.wacc||'Wallet')]:D.accMap[r.f.accKey]] = {d:latest.d, v:latest.saldo};
    stat.files.push(`${r.file}: ${n} neu (${r.f.bank}${r.f.isCard?', Kreditkarte':''})`);
  }
  // Überträge zwischen eigenen Konten paarweise erkennen (gleicher Betrag, umgekehrtes Vorzeichen, ±4 Tage)
  const imp = D.tx.filter(t=>t.imp);
  for(const t of added){ if(t.c===BK_TRANSFER) continue;
    const p = imp.find(u=>u!==t && u.bacc!==t.bacc && Math.abs(u.sa + t.sa)<0.01 && Math.abs(new Date(u.d)-new Date(t.d))<=4*864e5);
    if(p){ t.c=BK_TRANSFER; t.a=0; if(p.c!==BK_TRANSFER){ p.c=BK_TRANSFER; p.a=0; } } }
  for(const t of added) if(t.c===BK_TRANSFER){ t.a=0; stat.transfer++; }
  // Von Hand erfasste Buchungen oder fotografierte Belege durch die Bankbuchung ersetzen (keine Doppelzählung)
  for(const t of added){ if(t.sa>=0 || t.c===BK_TRANSFER) continue;
    const win = 10*864e5, m = D.tx.find(u=>!u.imp && !u.matched && Math.abs(Math.abs(u.a)-Math.abs(t.sa))<0.01 && Math.abs(new Date(u.d)-new Date(t.d))<=win);
    if(m){ if(t.c==='_offen' && m.c && m.c!=='_offen') t.c=m.c; if(m.bill) t.bill=m.bill; D.tx=D.tx.filter(u=>u!==m); markDel(m.id); stat.ersetzt++; } }
  // Offene Rechnungen als bezahlt erkennen
  for(const b of D.bills.filter(b=>b.status==='offen')){
    const key = bkNorm(b.creditor).split(' ').filter(w=>w.length>3)[0] || '', ref = String(b.ref||'').replace(/\D/g,'').slice(-6);
    const t = added.find(t=>t.sa<0 && Math.abs(-t.sa-b.amount)<0.01 && (!key || bkNorm(t.n).includes(key) || (ref && t.n.replace(/\D/g,'').includes(ref)) || Math.abs(new Date(t.d)-new Date(b.due||t.d))<=7*864e5));
    if(t){ b.status='bezahlt'; b.paid=t.d; b.tx=t.id; if(t.c==='_offen' && b.cat && b.cat!=='_inc') t.c=b.cat; stat.rechnungen++; } }
  stat.offen = added.filter(t=>t.c==='_offen').length;
  save(); calc(); checkAlerts?.();
  S.undo = stat.neu ? {snap, label:`Import: ${stat.neu} Buchungen`} : null;
  S.view='buchungen'; render();
  dialog(`<h3>Import abgeschlossen</h3>
    <div class="list">${stat.files.map(x=>`<div class="li small">${esc(x)}</div>`).join('')}</div>
    <div class="stats mt" style="grid-template-columns:1fr 1fr">${kpi('Neu',stat.neu)}${kpi('Schon vorhanden',stat.doppelt,'übersprungen')}${kpi('Überträge',stat.transfer,'zählen nicht als Ausgabe')}${kpi('Ohne Kategorie',stat.offen,stat.offen?'bitte zuordnen':'alles zugeordnet')}</div>
    ${stat.ersetzt?`<p class="small">✓ ${stat.ersetzt} von Hand erfasste Buchungen/Belege durch die Bankbuchung ersetzt – nichts doppelt.</p>`:''}
    ${stat.rechnungen?`<p class="small">✓ ${stat.rechnungen} offene Rechnungen als bezahlt erkannt.</p>`:''}
    <div class="acts">${stat.offen?'<button class="btn" data-dlg="map">Jetzt zuordnen</button>':''}<button class="btn pri" data-dlg="cancel">Fertig</button></div>`,
  k=>{ if(k==='map'){ setTimeout(mapDialog,50); } });
  const bad = results.filter(r=>r.err && r.rows); if(bad.length) setTimeout(()=>csvDialog(bad[0].rows), 400);
}
// Zuordnen nach Händler: einmal wählen, gilt für alle bisherigen und künftigen Buchungen dieses Händlers
function mapDialog(){
  const open = D.tx.filter(t=>t.wc && (t.c==='_offen' || S.mapAll));
  const groups = [...new Set(open.map(t=>t.wc))].sort((a,b)=>open.filter(t=>t.wc===b).length-open.filter(t=>t.wc===a).length).slice(0,60);
  if(!groups.length){ alert('Alle Buchungen haben eine Kategorie.'); return; }
  const sum = w => open.filter(t=>t.wc===w).reduce((s,t)=>s+Math.abs(t.sa??t.a),0), ex = w => open.find(t=>t.wc===w)?.n||'';
  dialog(`<h3>Kategorien zuordnen</h3><p class="small muted" style="margin-top:-8px">Einmal pro Händler wählen – die App merkt es sich und ordnet künftige Buchungen selbst zu.</p>
    ${groups.map((w,i)=>`<label class="f"><span><b style="color:var(--ink)">${esc(w)}</b> · ${open.filter(t=>t.wc===w).length}× · CHF ${chf0(sum(w))}<br><span class="small">${esc(ex(w).slice(0,70))}</span></span>
      <select id="mp${i}"><option value="">– später –</option><option value="${BK_TRANSFER}" ${D.walletMap[w]===BK_TRANSFER?'selected':''}>Übertrag zwischen eigenen Konten</option>${catOptions(D.walletMap[w]||'')}</select></label>`).join('')}${acts(true)}`,
  ()=>{ groups.forEach((w,i)=>{ const v=val('mp'+i); if(!v) return; D.walletMap[w]=v;
      D.tx.forEach(t=>{ if(t.wc!==w) return; t.c=v; if(t.imp) t.a = v===BK_TRANSFER ? 0 : v==='_inc' ? t.sa : -t.sa; }); }); });
}

/* ---------- Rechnungen & Belege fotografieren (QR-Rechnung exakt, Kassenzettel per Texterkennung – alles auf dem Gerät) ---------- */
function bkLoadScript(src){ return new Promise((res,rej)=>{ if(document.querySelector(`script[data-src="${src}"]`)) return res();
  const s=document.createElement('script'); s.src=src; s.dataset.src=src; s.onload=()=>res(); s.onerror=()=>rej(new Error('Erkennung nicht verfügbar (Datei '+src+' fehlt).')); document.head.appendChild(s); }); }
async function rcImage(file){
  const url = URL.createObjectURL(file);
  try{ const img = await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>rej(new Error('Bild kann nicht geöffnet werden.')); i.src=url; });
    const k = Math.min(1, 2200/Math.max(img.width,img.height)), c=document.createElement('canvas'); c.width=Math.round(img.width*k); c.height=Math.round(img.height*k);
    c.getContext('2d').drawImage(img,0,0,c.width,c.height); return c; } finally { setTimeout(()=>URL.revokeObjectURL(url),1000); }
}
async function rcFindQR(canvas){
  if('BarcodeDetector' in window){ try{ const det=new BarcodeDetector({formats:['qr_code']}); const r=await det.detect(canvas); const q=r.find(x=>/^SPC/.test(x.rawValue)); if(q) return q.rawValue; }catch(e){} }
  await bkLoadScript('vendor/jsQR.js');
  for(const size of [canvas.width, 1400, 900]){
    const k=Math.min(1,size/canvas.width), c=document.createElement('canvas'); c.width=Math.round(canvas.width*k); c.height=Math.round(canvas.height*k);
    const g=c.getContext('2d'); g.drawImage(canvas,0,0,c.width,c.height);
    const r = window.jsQR(g.getImageData(0,0,c.width,c.height).data, c.width, c.height, {inversionAttempts:'attemptBoth'});
    if(r?.data && /^SPC/.test(r.data)) return r.data;
  }
  return null;
}
// Swiss QR-Code (SPC 0200): Zeilen gemäss Swiss Payment Standards
function rcParseQR(raw){
  const L = raw.replace(/\r/g,'').split('\n');
  if(L[0]!=='SPC') return null;
  const amount = parseFloat(L[18]||''), bill = {kind:'qr', iban:L[3]||'', creditor:L[5]||'', amount:isFinite(amount)?amount:0, cur:L[19]||'CHF',
    ref:L[28]||'', msg:L[29]||'', info:L[31]||''};
  const s1 = bill.info.match(/\/11\/(\d{6})/), terms = bill.info.match(/\/40\/(?:[\d.]+:)?(\d+)/);
  if(s1){ const d=new Date(2000+ +s1[1].slice(0,2), +s1[1].slice(2,4)-1, +s1[1].slice(4,6)); if(terms) d.setDate(d.getDate()+ +terms[1]); else d.setDate(d.getDate()+30); bill.due=d.toISOString().slice(0,10); }
  const inv = bill.info.match(/\/10\/([^/]+)/); if(inv) bill.no=inv[1];
  return bill;
}
async function rcOCR(canvas, say){
  await bkLoadScript('vendor/tesseract/tesseract.min.js');
  const abs = p => new URL(p, location.href).href;
  const w = await window.Tesseract.createWorker('deu', 1, {workerPath:abs('vendor/tesseract/worker.min.js'), corePath:abs('vendor/tesseract/'), langPath:abs('vendor/tesseract/lang'), workerBlobURL:false, gzip:true, cacheMethod:'none',
    logger:m=>{ if(m.status) say(`Texterkennung: ${m.status==='recognizing text'?'lese Text':m.status} ${m.progress?Math.round(m.progress*100)+' %':''}`); }});
  try{ const r = await w.recognize(canvas); return r.data.text||''; } finally { await w.terminate(); }
}
function rcAmount(text){
  const lines=text.split(/\n+/).map(x=>x.trim()).filter(Boolean), key=/(^|\s)(total|summe|gesamt|zu bezahlen|zahlbetrag|rechnungsbetrag|betrag|bar|karte|twint|visa|mastercard|debit)/i, vals=[];
  lines.forEach((ln,i)=>{ const rx=/(\d{1,3}(?:['’ ]\d{3})*[.,]\d{2})(?!\d)/g; let m; while((m=rx.exec(ln))){ const v=parseFloat(m[1].replace(/['’ ]/g,'').replace(',','.')); if(v>0 && v<100000) vals.push({v, s:(/total|summe|zu bezahlen|zahlbetrag|rechnungsbetrag/i.test(ln)?20:0)+(key.test(ln)?8:0)+(i>0&&/total|summe/i.test(lines[i-1])?6:0)+(/mwst|mwst\.|tva|iva|rabatt|rückgeld|rueckgeld|gegeben/i.test(ln)?-15:0)}); } });
  vals.forEach(x=>{ if(vals.filter(y=>y.v===x.v).length>1) x.s+=5; }); vals.sort((a,b)=>b.s-a.s || b.v-a.v); return vals[0]?.v || 0;
}
function rcDate(text){ let m=text.match(/\b(\d{1,2})[.\/](\d{1,2})[.\/](20\d{2}|\d{2})\b/); if(m){ const y=m[3].length===2?'20'+m[3]:m[3]; return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`; } return todayIso(); }
function rcVendor(text){ const bad=/rechnung|quittung|beleg|kasse|datum|zeit|mwst|chf|total|betrag|filiale|tel\.?|www\.|uid|che-/i;
  return (text.split(/\n+/).map(x=>x.trim()).find(x=>x.length>=3 && x.length<=40 && /[A-Za-zÄÖÜäöü]{3}/.test(x) && !bad.test(x))||'').replace(/[^\wÄÖÜäöüéè&.\- ]/g,'').trim(); }
async function rcHandle(file){
  dialog(`<h3>Erkennung läuft …</h3><p class="small muted" id="rcst">Bild wird vorbereitet …</p><p class="small muted">Alles passiert auf deinem Gerät. Das Foto wird nicht gespeichert und nirgendwohin geschickt.</p><div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button></div>`, ()=>{});
  const say = t => { const e=$('#rcst'); if(e) e.textContent=t; };
  try{
    const canvas = await rcImage(file); say('Suche QR-Code …');
    const raw = await rcFindQR(canvas).catch(()=>null);
    if(raw){ const b=rcParseQR(raw); if(b){ $('#dlg').close(); return billDialog(b); } }
    say('Kein QR-Code gefunden – lese den Text (erstes Mal ca. 10–20 Sekunden) …');
    const text = await rcOCR(canvas, say);
    $('#dlg').close();
    receiptDialog({amount:rcAmount(text), date:rcDate(text), vendor:rcVendor(text), text});
  }catch(e){ say('Erkennung fehlgeschlagen: '+(e.message||e)+' Du kannst die Werte auch von Hand erfassen.'); }
}
function billDialog(b){
  const isNew = !b.id; b = {id:'r'+uid(), status:'offen', added:todayIso(), due: b.due||new Date(Date.now()+30*864e5).toISOString().slice(0,10), cat: b.cat || bkRuleCat(b.creditor, bkMerchant(b.creditor)) || '', ...b};
  dialog(`<h3>${isNew?(b.kind==='qr'?'QR-Rechnung erkannt ✓':'Rechnung erfassen'):'Rechnung'}</h3>
    ${b.kind==='qr'?'<p class="small pos" style="margin-top:-8px">Betrag, Empfänger und Referenz stammen direkt aus dem QR-Code – exakt.</p>':''}
    <label class="f">Empfänger<input id="bc" value="${esc(b.creditor)}"></label>
    <div class="grid g2" style="gap:0 12px"><label class="f">Betrag CHF<input id="ba" inputmode="decimal" value="${b.amount?chf(b.amount):''}"></label>
    <label class="f">Zahlbar bis<input id="bd" type="date" value="${esc(b.due)}"></label></div>
    <label class="f">Kategorie<select id="bk"><option value="">– bitte wählen –</option>${catOptions(b.cat)}</select></label>
    ${b.ref?`<p class="small muted">Referenz: ${esc(b.ref)}${b.no?' · Rechnung '+esc(b.no):''}${b.iban?' · '+esc(b.iban):''}</p>`:''}
    ${b.msg?`<p class="small muted">Mitteilung: ${esc(b.msg)}</p>`:''}
    <div class="acts">${isNew?'':'<button class="btn danger" data-dlg="del">Löschen</button><span class="sp"></span>'}
      ${b.status==='offen'?'<button class="btn" data-dlg="paid">Schon bezahlt</button>':''}<button class="btn pri" data-dlg="ok">${isNew?'Als offen speichern':'Speichern'}</button></div>`,
  k=>{ if(k==='del'){ D.bills=D.bills.filter(x=>x.id!==b.id); markDel(b.id); return; }
    const a=parseNum(val('ba')); if(!a||isNaN(a)){ $('#ba').style.borderColor='var(--bad)'; return false; }
    Object.assign(b,{creditor:val('bc').trim()||'Rechnung', amount:a, due:val('bd'), cat:val('bk')});
    if(b.cat && b.cat!=='_inc'){ const m=bkMerchant(b.creditor); if(!D.walletMap[m]) D.walletMap[m]=b.cat; }
    if(isNew) D.bills.push(b);
    if(k==='paid') billPaid(b); });
}
function billPaid(b){
  b.status='bezahlt'; b.paid=todayIso();
  if(!b.tx){ const t={id:uid(), d:todayIso(), c:b.cat||'_offen', a:b.amount, n:b.creditor+(b.no?' · Rechnung '+b.no:''), acc:mainAcc().id, src:'rechnung', bill:b.id}; D.tx.push(t); b.tx=t.id; }
}
function receiptDialog(r){
  const m = bkMerchant(r.vendor), cat = bkRuleCat(r.vendor+' '+r.text, m) || '';
  dialog(`<h3>Beleg erkannt</h3><p class="small muted" style="margin-top:-8px">Bitte kurz prüfen – Texterkennung kann sich bei Kassenzetteln irren.</p>
    <label class="f">Geschäft<input id="rv" value="${esc(r.vendor)}"></label>
    <div class="grid g2" style="gap:0 12px"><label class="f">Betrag CHF<input id="ra" inputmode="decimal" value="${r.amount?chf(r.amount):''}" style="font-size:20px;font-weight:650"></label>
    <label class="f">Datum<input id="rd" type="date" value="${r.date}"></label></div>
    <label class="f">Kategorie<select id="rk"><option value="">– bitte wählen –</option>${catOptions(cat||'')}</select></label>
    <label class="f">Bezahlt mit<select id="rp">${activeAccs().filter(a=>a.main||a.kind==='debt'||a.liquid).map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></label>
    <details class="small"><summary class="muted">Erkannter Text</summary><pre style="white-space:pre-wrap;font-size:11px;max-height:160px;overflow:auto">${esc(r.text.slice(0,1500))}</pre></details>
    <div class="acts"><button class="btn" data-dlg="bill">Ist eine offene Rechnung</button><span class="sp"></span><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Als Ausgabe buchen</button></div>`,
  k=>{ const a=parseNum(val('ra')); if(!a||isNaN(a)){ $('#ra').style.borderColor='var(--bad)'; return false; }
    if(k==='bill'){ setTimeout(()=>billDialog({kind:'foto', creditor:val('rv'), amount:a, cat:val('rk')}),50); return; }
    const v=val('rv').trim()||'Beleg', c=val('rk'); if(c && c!=='_inc' && !D.walletMap[bkMerchant(v)]) D.walletMap[bkMerchant(v)]=c;
    D.tx.push({id:uid(), d:val('rd')||todayIso(), c:c||'_offen', a, n:v, acc:mainAcc().id, src:'foto', pay:val('rp')}); calc(); checkAlerts?.(); });
}

/* ---------- Ansichten ---------- */
function bkTxRow(t){
  const out = t.imp ? t.sa : (t.c==='_inc' ? t.a : -t.a), tr = t.c===BK_TRANSFER;
  const icon = tr?'⇄':t.c==='_inc'?'↓':t.c==='_offen'?'?':(D.cats.find(c=>c.id===t.c)?.name||'·').slice(0,1).toUpperCase();
  const grp = D.cats.find(c=>c.id===t.c)?.group, col = tr?'var(--muted)':t.c==='_offen'?'var(--warn)':t.c==='_inc'?'var(--ok)':(GROUPS[grp]?.c||'var(--acc)');
  return `<div class="txr" data-act="${t.c==='_offen'?'mapcats':'edittx'}" data-id="${t.id}"><span class="txi" style="background:${col}">${icon}</span>
    <div class="sp"><div class="txt">${esc(t.wc && t.imp ? t.wc : (t.n||bkName(t.c)))}</div><div class="small muted">${esc(bkName(t.c))} · ${esc(accName(bkAcc(t)))}${t.src==='foto'?' · 📷':t.src==='rechnung'?' · Rechnung':''}</div></div>
    <b class="num ${tr?'muted':out>0?'pos':''}">${out>0?'+':''}${chf(out)}</b></div>`;
}
function bkActions(){
  return `<div class="bkact"><button class="btn pri" data-act="bkimport">⬆ Bankdatei hochladen</button><button class="btn" data-act="rcphoto">📷 Rechnung / Beleg</button><button class="btn" data-act="addtx">+ Buchung</button></div>`;
}
function vStart(){
  const n=C.now, m=C.m[TODAY]||C.m[n], ms=TODAY;
  const accs = activeAccs().filter(a=>!['rueck','anlage'].includes(a.id) || bankBalance(a.id));
  const cards = accs.map(a=>{ const b=bankBalance(a.id), plan=C.m[n]?.acc[a.id];
    return `<div class="acard" data-act="baledit" data-id="${a.id}"><span class="small">${esc(a.name)}</span>
      <b class="num ${(b?b.v:plan?.start??0)<-0.5?'neg':''}">${b?chf(b.v):plan?chf0(plan.start):'–'}</b>
      <span class="small muted">${b?'laut Bank · '+b.d.split('-').reverse().join('.'):'Plan · Stand eintragen'}</span></div>`; }).join('');
  const tx = [...D.tx].filter(t=>t.d<=todayIso()).sort((a,b)=>b.d.localeCompare(a.d)||(b.imp?1:0)-(a.imp?1:0)).slice(0,12);
  const days = {}; tx.forEach(t=>(days[t.d]??=[]).push(t));
  const open = D.bills.filter(b=>b.status==='offen').sort((a,b)=>(a.due||'').localeCompare(b.due||''));
  const soon = open.filter(b=>b.due && b.due<=new Date(Date.now()+14*864e5).toISOString().slice(0,10)), soonSum = soon.reduce((s,b)=>s+b.amount,0);
  const mb = bankBalance(mainAcc().id), unm = D.tx.filter(t=>t.c==='_offen').length;
  const cats = m ? D.cats.filter(c=>['leben','freizeit','fix'].includes(c.group) && (C.ist[c.id]?.[ms]||0)>0).map(c=>({c, ist:C.ist[c.id][ms], plan:m.plan[c.id]||0})).sort((a,b)=>b.ist-a.ist).slice(0,6) : [];
  const spent = D.tx.filter(t=>t.d.startsWith(ms) && t.c!=='_inc' && t.c!==BK_TRANSFER && t.c!=='_offen' || (t.d.startsWith(ms) && t.c==='_offen')).reduce((s,t)=>s+(t.imp?-t.sa:t.a),0);
  const incM = D.tx.filter(t=>t.d.startsWith(ms) && t.c==='_inc').reduce((s,t)=>s+(t.imp?t.sa:t.a),0);
  const warn = [];
  if(unm) warn.push(`<div class="hint row"><span class="sp"><b>${unm} Buchungen ohne Kategorie.</b> Einmal pro Händler zuordnen – danach geht es automatisch.</span><button class="btn sm" data-act="mapcats">Zuordnen</button></div>`);
  if(soon.length) warn.push(`<div class="hint row" style="${mb&&mb.v<soonSum?'background:color-mix(in srgb,var(--bad) 12%,var(--card))':''}"><span class="sp"><b>${soon.length} Rechnung${soon.length>1?'en':''} in den nächsten 14 Tagen fällig: CHF ${chf0(soonSum)}.</b>${mb?(mb.v<soonSum?` Auf dem ${esc(mainAcc().name)} sind nur CHF ${chf0(mb.v)} – Geld rechtzeitig umbuchen.`:` Dein ${esc(mainAcc().name)} deckt das.`):''}</span><button class="btn sm" data-go="rechnungen">Ansehen</button></div>`);
  return `<div class="row"><h2 class="sp">Grüezi</h2></div><p class="sub">${new Date().toLocaleDateString('de-CH',{weekday:'long',day:'numeric',month:'long'})}</p>
  <div class="acards">${cards}</div>
  ${bkActions()}
  ${warn.join('')}
  <div class="grid g2 mt">
    <div class="card"><div class="row"><h3 class="sp" style="margin:0">Letzte Buchungen</h3><a class="link" data-go="buchungen">Alle</a></div>
      ${tx.length?Object.entries(days).map(([d,l])=>`<div class="dayh">${new Date(d).toLocaleDateString('de-CH',{weekday:'short',day:'numeric',month:'short'})}</div>${l.map(bkTxRow).join('')}`).join(''):'<p class="muted small">Noch keine Buchungen. Lade eine Bankdatei hoch oder erfasse eine Ausgabe.</p>'}</div>
    <div class="grid" style="align-content:start">
      <div class="card"><h3>${MN[+ms.slice(5)-1]}</h3>
        <div class="stats" style="grid-template-columns:1fr 1fr 1fr;border:0">${kpi('Eingang',chf0(incM),'erfasst','pos')}${kpi('Ausgaben',chf0(spent),'erfasst')}${kpi('Budget übrig',chf0((m?.t.bedarf||0)+(m?.t.wunsch||0)-spent),'Bedarf + Freizeit', ((m?.t.bedarf||0)+(m?.t.wunsch||0)-spent)<0?'neg':'')}</div>
        ${cats.map(x=>{ const p=x.plan?x.ist/x.plan:1.5, col=p>1?'var(--bad)':p>0.85?'var(--warn)':'var(--ok)'; return `<div class="drow" data-go="budget"><span class="sp">${esc(x.c.name)}</span><span class="small muted num">${chf0(x.ist)} / ${chf0(x.plan)}</span><div class="bar" style="flex-basis:100%"><i style="width:${Math.min(100,p*100)}%;background:${col}"></i></div></div>`; }).join('')||'<p class="small muted">Sobald Buchungen da sind, siehst du hier, wo das Geld hingeht.</p>'}</div>
      <div class="card"><div class="row"><h3 class="sp" style="margin:0">Offene Rechnungen</h3><a class="link" data-go="rechnungen">Alle</a></div>
        ${open.slice(0,4).map(b=>billRow(b)).join('')||'<p class="small muted">Keine offenen Rechnungen. Fotografiere eine QR-Rechnung – Betrag und Empfänger werden exakt übernommen.</p>'}</div>
      ${leuteCard(true)}
    </div>
  </div>
  <p class="small muted mt"><a class="link" data-go="home">Cockpit mit Stufenplan, Fahrplan und Empfehlungen öffnen →</a></p>`;
}
function billRow(b){
  const late = b.status==='offen' && b.due && b.due<todayIso(), days = b.due ? Math.round((new Date(b.due)-new Date(todayIso()))/864e5) : null;
  return `<div class="li" data-act="billedit" data-id="${b.id}" style="cursor:pointer"><span class="mchip" style="${late?'background:color-mix(in srgb,var(--bad) 14%,var(--card));color:var(--bad)':''}">${b.due?esc(b.due.slice(8,10)+'.'+b.due.slice(5,7)):'–'}</span>
    <div class="sp"><b>${esc(b.creditor)}</b><div class="small muted">${b.status==='bezahlt'?'bezahlt '+(b.paid||'').split('-').reverse().join('.'):late?'überfällig':days===0?'heute fällig':'in '+days+' Tagen fällig'} · ${esc(bkName(b.cat||'_offen'))}</div></div>
    <b class="num">${chf(b.amount)}</b>${b.status==='offen'?`<button class="btn sm" data-act="billpaid" data-id="${b.id}">Bezahlt</button>`:''}</div>`;
}
function vRechnungen(){
  const open = D.bills.filter(b=>b.status==='offen').sort((a,b)=>(a.due||'').localeCompare(b.due||'')), done = D.bills.filter(b=>b.status!=='offen').sort((a,b)=>(b.paid||'').localeCompare(a.paid||'')).slice(0,30);
  const sum = open.reduce((s,b)=>s+b.amount,0), late = open.filter(b=>b.due && b.due<todayIso());
  const by30 = open.filter(b=>b.due && b.due<=new Date(Date.now()+30*864e5).toISOString().slice(0,10)).reduce((s,b)=>s+b.amount,0), mb=bankBalance(mainAcc().id);
  return head('Rechnungen', 'QR-Rechnung fotografieren: Betrag, Empfänger und Referenz werden exakt aus dem QR-Code gelesen. Kassenzettel werden per Texterkennung gelesen. Alles bleibt auf deinem Gerät.', '<button class="btn sm pri" data-act="rcphoto">📷 Fotografieren</button><button class="btn sm" data-act="billnew">+ Von Hand</button>') + `
  <div class="stats">${kpi('Offen',chf0(sum),open.length+' Rechnungen')}${kpi('Fällig in 30 Tagen',chf0(by30),mb?'Konto: CHF '+chf0(mb.v):'Kontostand unbekannt', mb&&mb.v<by30?'neg':'')}${kpi('Überfällig',late.length,late.length?'bitte bezahlen':'keine', late.length?'neg':'pos')}</div>
  <div class="card mt"><h3>Offen</h3><div class="list">${open.map(billRow).join('')||'<p class="muted small">Keine offenen Rechnungen.</p>'}</div></div>
  ${done.length?`<details class="card mt"><summary><h3>Bezahlt (${done.length})</h3></summary><div class="list">${done.map(billRow).join('')}</div></details>`:''}
  <p class="small muted">Beim nächsten Bank-Import erkennt die App die Zahlung und setzt die Rechnung automatisch auf «bezahlt». Was du von Hand als bezahlt markierst, wird beim Import durch die Bankbuchung ersetzt – nichts zählt doppelt.</p>`;
}
function vBuchungen2(){
  const ym=S.ym, q=(S.q||'').toLowerCase(), fa=S.facc||'';
  const list=D.tx.filter(t=>t.d.startsWith(ym) && (!fa||bkAcc(t)===fa) && (!q || (bkName(t.c)+' '+(t.n||'')+' '+(t.wc||'')).toLowerCase().includes(q))).sort((a,b)=>b.d.localeCompare(a.d));
  const out=list.filter(t=>t.c!=='_inc'&&t.c!==BK_TRANSFER).reduce((s,t)=>s+(t.imp?-t.sa:t.a),0), inc=list.filter(t=>t.c==='_inc').reduce((s,t)=>s+(t.imp?t.sa:t.a),0);
  const unm=D.tx.filter(t=>t.c==='_offen').length, days={}; list.slice(0,S.txShow||150).forEach(t=>(days[t.d]??=[]).push(t));
  const fmts = '<p class="small muted" style="margin:8px 0 0">So holst du die Datei: <b>PostFinance E-Finance</b> → Konto → Kontobewegungen → Exportieren → CSV. Für Sparkonto und Kreditkarte gleich. Du kannst mehrere Dateien auf einmal wählen und Zeiträume ruhig doppelt hochladen.</p>';
  return head('Buchungen '+ymLabel(ym), 'Alles, was auf deinen Konten passiert: aus Bankdateien, Fotos und von Hand.', '<button class="btn sm" data-act="addtx">+ Buchung</button>') + `
  ${bkActions()}${fmts}
  ${unm?`<div class="hint row mt"><span class="sp"><b>${unm} Buchungen ohne Kategorie.</b></span><button class="btn sm" data-act="mapcats">Zuordnen</button></div>`:''}
  <div class="card mt"><div class="row" style="margin-bottom:6px"><input class="in" id="fq" placeholder="Suchen …" value="${esc(S.q||'')}" style="flex:1;min-width:140px">
    <select class="in" id="facc"><option value="">Alle Konten</option>${activeAccs().map(a=>`<option value="${a.id}" ${a.id===fa?'selected':''}>${esc(a.name)}</option>`).join('')}</select></div>
    <div class="row small muted"><span class="sp">${list.length} Buchungen</span><span>Ausgaben <b class="num" style="color:var(--ink)">CHF ${chf(out)}</b>${inc?` · Eingang <b class="num pos">CHF ${chf(inc)}</b>`:''}</span></div>
    ${Object.entries(days).map(([d,l])=>`<div class="dayh">${new Date(d).toLocaleDateString('de-CH',{weekday:'short',day:'numeric',month:'long'})}</div>${l.map(bkTxRow).join('')}`).join('')||'<p class="muted">Keine Buchungen in diesem Monat.</p>'}
    ${list.length>(S.txShow||150)?`<div class="row mt"><span class="sp"></span><button class="btn sm" data-act="txmore">Weitere anzeigen</button></div>`:''}</div>
  <details class="card mt"><summary><h3>Gelernte Zuordnungen (${Object.keys(D.walletMap).length})</h3></summary>
    <div class="list">${Object.entries(D.walletMap).sort().map(([k,v])=>`<div class="li small"><span class="sp">${esc(k)}</span><span>${esc(v==='_skip'?'ignorieren':bkName(v))}</span><button class="ibtn" data-act="ruledel" data-k="${esc(k)}" title="Vergessen">✕</button></div>`).join('')||'<p class="small muted">Noch keine.</p>'}</div>
    <p class="small"><a class="link" data-act="mapall">Alle Händler neu zuordnen</a></p></details>`;
}
function vDaten2(){
  return vDaten().replace('<div class="grid g2">', `<div class="grid g2"><div class="card"><h3>Budget aus Excel übernehmen</h3><p class="small muted">Excel-Datei mit Monaten Jan–Dez wählen (z. B. «Finanzplanung 2026/2027»). Die App erkennt Jahr, Lohn und Positionen und fragt dich, welche Position zu welcher Kategorie gehört.</p><button class="btn" data-act="xlsxplan">Excel-Plan einlesen …</button></div>`);
}
function vMehr2(){
  return head('Mehr') + `<div class="card morelist">${[['rechnungen','▣','Rechnungen','Fotografieren, offen, bezahlt'],['home','◎','Cockpit & Stufen','Nettovermögen, Stufenplan, Fahrplan'],['empfehlungen','✦','Empfehlungen & Fahrplan','Was du als Nächstes tun solltest'],['monat','▤','Monat','Plan vs. Ist, Monatsabschluss'],['analyse','◔','Ausgaben-Analyse','Vergleich, Händler, Budget-Vorschlag'],['prognose','↗','Prognose & Szenarien','Was wäre wenn, 10–30 Jahre'],['jahr','◷','Jahreskosten','Jährliche Rechnungen mit Monat'],['konten','◫','Konten & Schulden','Kontostände, Schuldenplan, Vermögen'],['ziele','◎','Ziele & Reserve','Notgroschen und eigene Sparziele'],['regeln','✓','Regeln','Ampel, 50/30/20, Einstellungen'],['abos','↻','Abos','Laufende Kosten'],['daten','⚙','Daten & Backup','Excel-Plan, Sichern, laden, exportieren']]
    .map(([id,i,n,d])=>`<a data-go="${id}"><span class="i">${i}</span><span class="sp"><b>${n}</b><br><span class="small muted">${d}</span></span>›</a>`).join('')}</div>`;
}

/* ---------- Excel-Plan einlesen (ohne Fremdbibliothek: ZIP + XML direkt im Browser) ---------- */
async function xlsxRead(buf){
  const u8=new Uint8Array(buf), dv=new DataView(buf); let eocd=-1;
  for(let i=u8.length-22;i>=Math.max(0,u8.length-66000);i--) if(dv.getUint32(i,true)===0x06054b50){ eocd=i; break; }
  if(eocd<0) throw new Error('Keine Excel-Datei (.xlsx).');
  const cnt=dv.getUint16(eocd+10,true); let p=dv.getUint32(eocd+16,true); const files={};
  for(let k=0;k<cnt;k++){ const method=dv.getUint16(p+10,true), csize=dv.getUint32(p+20,true), nl=dv.getUint16(p+28,true), xl=dv.getUint16(p+30,true), cl=dv.getUint16(p+32,true), off=dv.getUint32(p+42,true);
    const name=new TextDecoder().decode(u8.subarray(p+46,p+46+nl)); files[name]={method,csize,off}; p+=46+nl+xl+cl; }
  const get = async name => { const f=files[name]; if(!f) return null; const lnl=dv.getUint16(f.off+26,true), lxl=dv.getUint16(f.off+28,true), data=u8.subarray(f.off+30+lnl+lxl, f.off+30+lnl+lxl+f.csize);
    if(f.method===0) return new TextDecoder().decode(data);
    const s=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')); return await new Response(s).text(); };
  const P=new DOMParser(), xml=async n=>{ const t=await get(n); return t?P.parseFromString(t,'application/xml'):null; };
  const ss=[], sst=await xml('xl/sharedStrings.xml'); if(sst) for(const si of sst.getElementsByTagNameNS('*','si')) ss.push([...si.getElementsByTagNameNS('*','t')].map(t=>t.textContent).join(''));
  const wb=await xml('xl/workbook.xml'), rel=await xml('xl/_rels/workbook.xml.rels'), rmap={};
  for(const r of rel.getElementsByTagNameNS('*','Relationship')) rmap[r.getAttribute('Id')]=r.getAttribute('Target').replace(/^\/?(xl\/)?/,'xl/');
  const sheets=[];
  for(const s of wb.getElementsByTagNameNS('*','sheet')){ const rid=s.getAttribute('r:id')||s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'), doc=await xml(rmap[rid]); if(!doc) continue;
    const rows=[]; for(const r of doc.getElementsByTagNameNS('*','row')){ const row=[]; for(const c of r.getElementsByTagNameNS('*','c')){ const ref=c.getAttribute('r'), col=ref.replace(/\d+/g,'').split('').reduce((a,ch)=>a*26+ch.charCodeAt(0)-64,0)-1, t=c.getAttribute('t');
        const v=c.getElementsByTagNameNS('*','v')[0]?.textContent, is=c.getElementsByTagNameNS('*','is')[0]?.textContent;
        row[col] = t==='s' ? ss[+v] : t==='inlineStr' ? is : t==='str' ? v : v!=null && v!=='' ? +v : undefined; } rows.push(row); }
    sheets.push({name:s.getAttribute('name'), rows}); }
  return sheets;
}
var XL_MONTHS = ['jan','feb','m','apr','mai','jun','jul','aug','sep','okt','nov','dez'];
function xlsxPlans(sheets){
  const out=[];
  for(const sh of sheets){ const hi = sh.rows.findIndex(r=>r && r.filter(v=>typeof v==='string' && /^(jan|feb|mär|mrz|maer|apr|mai|jun|jul|aug|sep|okt|nov|dez)/i.test(v.trim())).length>=12);
    if(hi<0) continue; const H=sh.rows[hi], first=H.findIndex(v=>typeof v==='string' && /^jan/i.test(v.trim()));
    const ym = (sh.name+' '+sh.rows.slice(0,hi).flat().filter(x=>typeof x==='string').join(' ')).match(/20\d{2}/g);
    const year = ym ? ym.at(-1) : TODAY.slice(0,4), pos=[];
    for(const r of sh.rows.slice(hi+1)){ if(!r) continue; const lab = r.slice(0,first).filter(v=>typeof v==='string' && v.trim()).at(-1); const vals=r.slice(first,first+12).map(v=>typeof v==='number'?r2(v):0);
      if(!lab || !vals.some(v=>v)) continue; pos.push({lab:lab.trim(), vals}); }
    if(pos.length) out.push({sheet:sh.name, year, pos});
  }
  return out;
}
function xlsxBest(pl){ let b=0; pl.forEach((p,i)=>{ const sc=p.pos.length+(/budget/i.test(p.sheet)?50:0)+ +p.year/1000; const sb=pl[b].pos.length+(/budget/i.test(pl[b].sheet)?50:0)+ +pl[b].year/1000; if(sc>sb) b=i; }); return b; }
var XL_MAP = [[/nettoeinkommen|einkommen|lohn|netto/i,'_inc'],[/miete|wohnkosten/i,'miete'],[/steuer/i,'steuern'],[/kranken/i,'kv'],[/movemi|fitness/i,'fitness'],[/arbeitsweg|velokeller/i,'arbeitsweg'],[/swisscom|handy|internet/i,'swisscom'],[/lebensmittel/i,'lebensmittel'],[/altschuld|alte kreditkarte|kreditkarten.?altschuld/i,'rkk'],[/kreditkarte.*abo|abos/i,'kkabos'],[/kreditkarte/i,'rkk'],[/coiffeur|persönlich/i,'coiffeur'],[/unregelm.*unbekannt|unbekannt/i,'unbekannt'],[/unregelm.*bekannt/i,'bekannt'],[/ferien/i,'ferien'],[/eigenheim/i,'eigenheim'],[/investier/i,'invest'],[/säule|saeule|3a/i,'s3a'],[/sparen/i,'sparen'],[/weiterbildung/i,'weiterbildung'],[/bobfinance/i,'bob'],[/powerpay/i,'powerpay'],[/unter leuten/i,'leute'],[/restaurant/i,'restaurant'],[/gesundheit/i,'gesundheit'],[/kleidung/i,'kleidung']];
var XL_SKIP = /gesamt|total|restbetrag|überschuss|ueberschuss|fehlbetrag|kontostand|abweichung|anfang monat|ende monat|sparen \/ investieren|frei \(|auszahlungen|geldabflüsse|zahlungsabflüsse|ausgaben inkl|anfangsbest|bestände|bestaende|bestandsreihe|endstand|optimiert/i;
async function xlsxPlanImport(file){
  let plans; try{ plans = xlsxPlans(await xlsxRead(await file.arrayBuffer())); }catch(e){ alert('Excel konnte nicht gelesen werden: '+(e.message||e)); return; }
  if(!plans.length){ alert('In dieser Excel-Datei wurde keine Tabelle mit den Monaten Jan–Dez gefunden.'); return; }
  const pick = plans.length>1 ? null : 0;
  if(pick===null){ dialog(`<h3>Welches Blatt übernehmen?</h3>${plans.map((p,i)=>`<label class="f" style="color:var(--ink)"><input type="radio" name="xs" value="${i}" ${i===xlsxBest(plans)?'checked':''} style="display:inline;width:auto;margin-right:6px">${esc(p.sheet)} – Jahr ${p.year} (${p.pos.length} Positionen)</label>`).join('')}${acts(true)}`,
    ()=>{ const i=+document.querySelector('input[name=xs]:checked').value; setTimeout(()=>xlsxMapDialog(plans[i]),50); }); return; }
  xlsxMapDialog(plans[0]);
}
function xlsxMapDialog(p){
  const guess = lab => { if(XL_SKIP.test(lab)) return '_skip'; for(const [rx,id] of XL_MAP) if(rx.test(lab) && (id==='_inc' || D.cats.some(c=>c.id===id))) return id; const n=bkNorm(lab); return D.cats.find(c=>n.includes(bkNorm(c.name).split(' ')[0]))?.id || '_new'; };
  dialog(`<h3>Budget ${esc(p.year)} aus «${esc(p.sheet)}»</h3><p class="small muted" style="margin-top:-8px">Prüfe die Zuordnung. Summen- und Kontrollzeilen sind schon ausgeblendet. Monatswerte werden für ${esc(p.year)} übernommen.</p>
    <label class="f">Jahr<input id="xy" value="${esc(p.year)}" inputmode="numeric"></label>
    ${p.pos.map((x,i)=>`<label class="f"><span><b style="color:var(--ink)">${esc(x.lab)}</b> · Jahr CHF ${chf0(x.vals.reduce((a,b)=>a+b,0))}</span><select id="xm${i}">
      <option value="_skip" ${guess(x.lab)==='_skip'?'selected':''}>– nicht übernehmen –</option><option value="_new" ${guess(x.lab)==='_new'?'selected':''}>Neue Kategorie anlegen</option>${catOptions(guess(x.lab))}</select></label>`).join('')}
    ${chk('xzero',true,'Kategorien, die nicht in der Datei vorkommen, für dieses Jahr auf 0 setzen')}
    ${chk('xleute',D.cats.some(c=>c.id==='leute'),'Topf «Unter Leuten» behalten (CHF '+(D.settings.leuteBudget||200)+'/Monat, aus Puffer und Ferien finanziert)')}${acts(true)}`,
  ()=>{ const y=val('xy').trim(); if(!/^20\d{2}$/.test(y)) return false;
    const snap=JSON.stringify(D), ms=Array.from({length:12},(_,i)=>y+'-'+String(i+1).padStart(2,'0')), used=new Set(), sums={}, inc=Array(12).fill(0);
    p.pos.forEach((x,i)=>{ let id=val('xm'+i); if(id==='_skip') return;
      if(id==='_new'){ id='c'+uid(); D.cats.push({id, name:x.lab.replace(/\s*\(.*$/,'').slice(0,40), group:/spar|invest|3a|säule/i.test(x.lab)?'spar':/schuld|kredit/i.test(x.lab)?'schulden':/miete|steuer|versicherung|swisscom/i.test(x.lab)?'fix':'freizeit', acc:null, keep:true}); }
      if(id==='_inc'){ x.vals.forEach((v,k)=>inc[k]+=v); return; }
      used.add(id); (sums[id]??=Array(12).fill(0)); x.vals.forEach((v,k)=>sums[id][k]+=v); const c=D.cats.find(c=>c.id===id); if(c) c.archived=false; });
    if(inc.some(v=>v)) ms.forEach((m,k)=>D.income[m]=r2(inc[k]));
    for(const c of D.cats){ if(c.id==='rueck') continue; const s=sums[c.id];
      if(s) ms.forEach((m,k)=>{ (D.plan[c.id]??={}); if(s[k]) D.plan[c.id][m]=r2(s[k]); else delete D.plan[c.id][m]; });
      else if($('#xzero').checked && c.id!=='leute' && D.plan[c.id]) ms.forEach(m=>delete D.plan[c.id][m]); }
    if($('#xleute')?.checked && !used.has('leute')){ for(const m of ms){ (D.plan.leute??={})[m]=0; let need=(D.settings.leuteBudget||200);
        for(const [id,min] of [['unbekannt',200],['ferien',150],['restaurant',40]]){ if(need<=0) break; const v=(D.plan[id]?.[m])||0, x=Math.max(0,Math.min(v-min,need)); if(x>0){ D.plan[id][m]=r2(v-x); need-=x; (D.plan.leute??={})[m]=r2(((D.plan.leute?.[m])||0)+x); } } } }
    else if(!$('#xleute')?.checked && D.plan.leute) ms.forEach(m=>delete D.plan.leute[m]);
    S.undo={snap, label:'Budget '+y+' aus Excel'}; S.year=y; S.view='budget'; S.bmode='jahr'; });
}

/* ---------- Ereignisse ---------- */
function bkPick(accept, multiple, capture){ return new Promise(res=>{ const i=document.createElement('input'); i.type='file'; i.accept=NATIVE&&!capture?'':accept; if(multiple) i.multiple=true; if(capture) i.setAttribute('capture','environment');
  i.onchange=()=>res([...i.files]); i.click(); }); }
document.addEventListener('click', async e=>{
  const a=e.target.closest('[data-act]'); if(!a || !D) return; const k=a.dataset.act, id=a.dataset.id;
  const H = {
    bkimport: async()=>{ const f=await bkPick('.csv,text/csv,text/plain,.txt',true); if(f.length) bkImportFiles(f); },
    rcphoto: ()=>dialog(`<h3>Rechnung oder Beleg</h3><p class="small muted" style="margin-top:-8px">QR-Rechnung: den QR-Code gut sichtbar und scharf fotografieren. Kassenzettel: flach hinlegen, ganzer Zettel im Bild.</p>
        <div class="acts" style="justify-content:stretch"><button class="btn pri" data-dlg="cam" style="flex:1">📷 Foto aufnehmen</button><button class="btn" data-dlg="file" style="flex:1">🖼 Bild wählen</button></div><div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button></div>`,
      k2=>{ (async()=>{ const f=await bkPick('image/*',false,k2==='cam'); if(f[0]) rcHandle(f[0]); })(); }),
    billnew: ()=>billDialog({kind:'hand', creditor:'', amount:0}),
    billedit: ()=>{ if(e.target.closest('[data-act="billpaid"]')) return; const b=D.bills.find(x=>x.id===id); if(b) billDialog(b); },
    billpaid: ()=>{ const b=D.bills.find(x=>x.id===id); if(b){ billPaid(b); save(); render(); } },
    baledit: ()=>balDialog(id),
    mapall: ()=>{ S.mapAll=true; mapDialog(); S.mapAll=false; },
    ruledel: ()=>{ delete D.walletMap[a.dataset.k]; save(); render(); },
    xlsxplan: async()=>{ const f=await bkPick('.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',false); if(f[0]) xlsxPlanImport(f[0]); },
  };
  if(H[k]){ e.stopPropagation(); H[k](); }
}, true);
document.addEventListener('change', e=>{ if(e.target.id==='facc'){ S.facc=e.target.value; render(); } });

// Zurück-Taste führt zur neuen Startseite
function initNative(){
  if(!NATIVE) return;
  const AppP = plug('App');
  ['file','csvfile'].forEach(id=>$('#'+id)?.removeAttribute('accept'));   // Android-Dateiauswahl: Backups aus Mail/Drive haben oft keinen passenden Typ
  AppP.addListener('backButton', ()=>{
    if($('#dlg').open) $('#dlg').close();
    else if(!S.locked && D && S.view!=='start'){ S.view='start'; render(); scrollTo(0,0); }
    else AppP.minimizeApp();
  });
  AppP.addListener('pause', ()=>{ S.hiddenAt = Date.now(); if($('#dlg').open && CK) $('#dlg').close(); });
  AppP.addListener('resume', ()=>{ if(CK && D && S.hiddenAt && Date.now()-S.hiddenAt > lockAfterMs()) lock(); checkUpdate(false); });
  setTimeout(()=>checkUpdate(false), 1500);
}
