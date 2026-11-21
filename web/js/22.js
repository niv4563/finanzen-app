/* =====================================================================
   30. VERSION 1.11.0 – WOCHE · MONAT · JAHR, KATEGORIEN WIE IN WALLET (mit Hauptkategorien),
       AUTOMATISCHE REGELN AUS DEINEN WALLET-BUCHUNGEN
   ===================================================================== */

/* ---------- Zeitraum: Woche (Mo–So), Monat, Jahr – überall blätterbar ---------- */
var weekStart = d => { const w = (new Date(d+'T12:00').getDay()+6)%7; return dAdd(d,-w); };
function perRange(p, ref){
  ref = ref || todayIso();
  if(p==='wk'){ const f = weekStart(ref); return {p, from:f, to:dAdd(f,6)}; }
  if(p==='y'){ const y = ref.slice(0,4); return {p, from:y+'-01-01', to:y+'-12-31'}; }
  const ym = ref.slice(0,7); return {p:'m', from:ym+'-01', to:mEnd(ym)};
}
var perLabel = r => r.p==='wk' ? `Woche ${dShort(r.from)} – ${dShort(r.to)}` : r.p==='y' ? 'Jahr '+r.from.slice(0,4) : ymLabel(r.from.slice(0,7));
var perShift = (r, dir) => r.p==='wk' ? perRange('wk', dAdd(r.from, 7*dir)) : r.p==='y' ? perRange('y', (+r.from.slice(0,4)+dir)+'-06-01') : perRange('m', ymAdd(r.from.slice(0,7), dir)+'-01');
var _apSet1110 = apSet;
apSet = function(p){ if(p==='wk' || p==='m' || p==='y'){ S.ap = perRange(p, S.ap?.to && S.ap.to<todayIso() ? S.ap.to : todayIso()); return; } _apSet1110(p); };
apShift = function(dir){ const a = apGet(); if(['wk','m','y'].includes(a.p)){ S.ap = perShift(a, dir); return; } const n = dDiff(a.from,a.to)+1; a.from = dAdd(a.from, dir*n); a.to = dAdd(a.to, dir*n); };
apPrev = function(a){ if(['wk','m','y'].includes(a.p)) return perShift(a, -1); const n = dDiff(a.from,a.to)+1; return {from:dAdd(a.from,-n), to:dAdd(a.to,-n)}; };
// Zeitraum-Leiste der Statistik: zuerst Woche · Monat · Jahr, darunter die gleitenden Zeiträume
var _perSheet1110 = perSheet;
perSheet = function(){
  const a = apGet();
  return _perSheet1110().replace('<div class="pspre">', `<div class="pspre cal">${[['wk','Woche'],['m','Monat'],['y','Jahr']].map(([p,l])=>`<button class="${a.p===p?'on':''}" data-act="ap" data-p="${p}">${l}</button>`).join('')}</div><div class="pspre">`)
    .replace(/(<button class="psrange"[^>]*>)[^<]*/, (m,b)=>b+(['wk','m','y'].includes(a.p) ? perLabel(a) : `${dShort(a.from)} – ${dShort(a.to)}`)+' ▾');
};

/* Buchungen: Woche · Monat · Jahr mit eigenen Pfeilen */
var _vBuch1110 = vBuchungen2;
vBuchungen2 = function(){
  const r = S.bper || perRange('m', S.ym+'-15'); S.bper = r;
  const keepYm = S.ym, txs = D.tx;
  // vorhandene Monats-Ansicht wiederverwenden: Buchungen im Zeitraum auf einen «Monat» abbilden
  D.tx = txs.filter(t=>t.d>=r.from && t.d<=r.to).map(t=>Object.assign(Object.create(Object.getPrototypeOf(t)), t, {d:'X'+t.d}));
  let h; try{ S.ym = 'X'; h = _vBuch1110(); } finally { D.tx = txs; S.ym = keepYm; }
  h = h.replace(/data-id="([^"]+)"/g, (m,id)=>m).replace(/>X(\d{4}-\d{2}-\d{2})</g, '>$1<');
  const nav = `<div class="bper"><div class="pspre">${[['wk','Woche'],['m','Monat'],['y','Jahr']].map(([p,l])=>`<button class="${r.p===p?'on':''}" data-act="bper" data-p="${p}">${l}</button>`).join('')}</div>
    <div class="psrow"><button class="psnav" data-act="bprev" aria-label="Zurück">‹</button><span class="psrange">${perLabel(r)}</span><button class="psnav" data-act="bnext" aria-label="Weiter">›</button></div></div>`;
  return nav + h.replace(/Keine Buchungen in [^<]*/, 'Keine Buchungen in diesem Zeitraum');
};
// Tages-Überschriften: «Heute», «Gestern», sonst Wochentag + Datum (auch mit dem Platzhalter-Präfix)
var _dayLabel1110 = dayLabel;
dayLabel = d => _dayLabel1110(String(d).replace(/^X/,''));
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act="bper"],[data-act="bprev"],[data-act="bnext"]'); if(!a || !D) return; e.stopPropagation();
  const r = S.bper || perRange('m');
  S.bper = a.dataset.act==='bper' ? perRange(a.dataset.p, r.p==='y' && a.dataset.p!=='y' ? (r.from.slice(0,4)===todayIso().slice(0,4) ? todayIso() : r.to) : r.to<todayIso() ? r.to : todayIso())
         : perShift(r, a.dataset.act==='bprev' ? -1 : 1);
  if(S.bper.p==='m') S.ym = S.bper.from.slice(0,7);
  render(); scrollTo(0,0);
}, true);

/* ---------- Wallet-Kategoriebaum (Standard-Struktur von Wallet) ---------- */
var W_TREE = {
  'Essen & Getränke': ['Bar, Café','Lebensmittel','Restaurant','Restaurant, Fast-Food'],
  'Einkaufen': ['Drogerie, Apotheke','Elektronik, Zubehör','Freizeit','Geschenke, Freude','Gesundheit und Schönheit','Haushalt, Garten','Haus und Garten','Kinder','Kleidung & Schuhe','Haustiere, Tiere','Schmuck, Accessoires','Bürobedarf, Werkzeuge','Möbel'],
  'Wohnen': ['Energie, Nebenkosten','Hypothek','Wartung, Reparaturen','Miete','Mieten','Dienstleistungen','Sachversicherung','Strom; Wasser','Gas','Gebäudeversicherung'],
  'Transport': ['Geschäftsreisen','Fernverkehr','Öffentliche Verkehrsmittel','Taxi'],
  'Fahrzeug': ['Kraftstoff','Leasing','Parken','Fahrzeugversicherung','Autoversicherung','Fahrzeugwartung'],
  'Leben & Unterhaltung': ['Aktiver Sport, Fitness','Alkohol, Tabak','Bücher, Audio, Abonnements','Wohltätigkeit, Geschenke','Kultur-, Sportveranstaltungen','Bildung, persönliche Entwicklung','Gesundheitsversorgung, Arzt','Hobbys','Urlaub, Ausflüge, Hotels','Lebensereignisse','Lotterie, Glücksspiel','TV, Streaming','Wellness, Schönheit','Unterhaltung, Spass','Kontaktlinsen'],
  'Kommunikation, PC': ['Internet','Internet; Handy','Telefon, Handy','Phone','Postdienste','Software, Apps, Spiele'],
  'Finanzausgaben': ['Beratung','Gebühren','Geldstrafen','Kinderbetreuung','Versicherungen','Darlehen, Zinsen','Steuern','Unterhalt','Krankenversicherung','Staat- / Bundessteuer','Gemeindesteuer','Wehrpflichtabgabe'],
  'Investitionen': ['Sammlungen','Finanzinvestitionen','Immobilien','Ersparnisse','Fahrzeuge, Sachwerte'],
  'Sonstiges': ['Fehlend','Unbekannte Ausgaben'],
};
var W_PARENT = (()=>{ const m = {}; for(const [p,l] of Object.entries(W_TREE)){ m[p.toUpperCase()] = p; l.forEach(n=>m[n.toUpperCase()] = p); } return m; })();
function wParentOf(name){
  const n = String(name||''), u = n.toUpperCase(); if(W_PARENT[u]) return W_PARENT[u];
  if(/steuer|abgabe|gebühr|zins|versicherung/i.test(n) && !/auto|fahrzeug|gebäude/i.test(n)) return 'Finanzausgaben';
  if(/auto|fahrzeug|benzin|tank|park/i.test(n)) return 'Fahrzeug';
  if(/gebäude|strom|wasser|gas|miete|hypothek|nebenkosten/i.test(n)) return 'Wohnen';
  if(/internet|handy|phone|telefon|software|abo/i.test(n)) return 'Kommunikation, PC';
  if(/arzt|gesund|linse|brille|zahn|fitness|sport|ferien|urlaub/i.test(n)) return 'Leben & Unterhaltung';
  return 'Sonstiges';
}
var W_PGROUP = {'Essen & Getränke':'leben','Einkaufen':'freizeit','Wohnen':'fix','Transport':'leben','Fahrzeug':'leben','Leben & Unterhaltung':'freizeit','Kommunikation, PC':'fix','Finanzausgaben':'fix','Investitionen':'spar','Sonstiges':'freizeit'};
var W_PNEED = {'Essen & Getränke':'brauch','Einkaufen':'will','Wohnen':'muss','Transport':'brauch','Fahrzeug':'brauch','Leben & Unterhaltung':'will','Kommunikation, PC':'muss','Finanzausgaben':'muss','Investitionen':'brauch','Sonstiges':'will'};
function wGroupNeed(name, parent){
  const n = String(name);
  if(/restaurant|bar, café|^essen/i.test(n)) return ['freizeit','will'];
  if(/darlehen|kredit/i.test(n)) return ['schulden','muss'];
  if(/gesundheitsversorgung|arzt|kontaktlinsen|krankenversicherung/i.test(n)) return ['fix','muss'];
  if(/drogerie|haushalt|kleidung|bildung/i.test(n)) return ['leben','brauch'];
  if(/taxi|fernverkehr|geschäftsreisen/i.test(n)) return ['freizeit','will'];
  if(/software|tv, streaming/i.test(n)) return ['freizeit','will'];
  return [W_PGROUP[parent]||'freizeit', W_PNEED[parent]||'will'];
}

/* ---------- Kategorien wie in Wallet übernehmen ---------- */
function wbCatList(){
  const by = new Map(), since = dAdd(todayIso(), -365);
  for(const t of D.tx){ if(t.src!=='wallet' || !t.wc) continue;
    const o = by.get(t.wc) || {key:t.wc, n:0, recent:0, out:0, inc:0, name:null, cur:t.c}; o.n++; if(t.d>=since) o.recent++;
    if((t.sa??-t.a)<0) o.out++; else o.inc++; by.set(t.wc, o); }
  // Schreibweise wie in Wallet (Schlüssel sind gross geschrieben)
  const nice = new Map(); for(const l of Object.values(W_TREE)) l.forEach(n=>nice.set(n.toUpperCase(), n)); Object.keys(W_TREE).forEach(p=>nice.set(p.toUpperCase(), p));
  return [...by.values()].map(o=>({...o, name: nice.get(o.key) || o.key.charAt(0)+o.key.slice(1).toLowerCase()}))
    .filter(o=>o.key!=='TRANSFER' && WB_DEF[o.key]!=='_inc' && WB_DEF[o.key]!=='_transfer' && o.out>=o.inc)
    .sort((a,b)=>b.n-a.n);
}
function wbCatDialog(){
  const list = wbCatList();
  if(!list.length){ alert('Es sind noch keine Buchungen aus Wallet in der App. Lade zuerst deinen Wallet-Export hoch (+ → Bankdatei hochladen) oder richte die Wallet-Verbindung ein.'); return; }
  // Vorschlag: gleichnamige Kategorie → diese. Sonst: die bisher zugeordnete Kategorie wird für die häufigste
  // Wallet-Kategorie umbenannt (Budget bleibt erhalten), alle weiteren werden neu angelegt.
  const claimed = new Set();
  const rows = list.map(o=>{
    const parent = wParentOf(o.name), same = D.cats.find(c=>!c.archived && c.name.toLowerCase()===o.name.toLowerCase());
    let map = '', ren = false;
    if(same && !claimed.has(same.id)){ map = same.id; }
    else { const prev = D.walletMap?.[o.key] || wbDefault(o.key); if(prev && D.cats.some(c=>c.id===prev) && !claimed.has(prev) && !list.some(x=>x!==o && x.n>o.n && (D.walletMap?.[x.key]||wbDefault(x.key))===prev && !D.cats.some(c=>c.name.toLowerCase()===x.name.toLowerCase()))){ map = prev; ren = true; } }
    if(map) claimed.add(map);
    return {...o, parent, map, ren, on: o.recent>0};
  });
  S.wcRows = rows;
  const parents = Object.keys(W_TREE);
  dialog(`<h3>Kategorien wie in Wallet</h3>
    <p class="small muted" style="margin-top:-8px">${rows.length} Wallet-Kategorien aus deinen Buchungen. Vorausgewählt sind die, die du im letzten Jahr benutzt hast. Wo eine Kategorie deiner Planung passt, wird sie umbenannt – das Budget bleibt erhalten. Einnahmen und Überträge bleiben wie bisher.</p>
    <div class="wbl">${parents.map(p=>{ const rs = rows.map((r,i)=>[r,i]).filter(([r])=>r.parent===p); if(!rs.length) return '';
      return `<div class="wcp"><b>${esc(p)}</b>${rs.map(([r,i])=>`<div class="wcr"><label class="chk" style="min-height:30px"><input type="checkbox" id="wco${i}" ${r.on?'checked':''}> ${esc(r.name)} <span class="small muted">${r.n}×</span></label>
        <select class="in" id="wcm${i}"><option value="">Neue Kategorie «${esc(r.name)}»</option>${D.cats.filter(c=>!c.archived).map(c=>`<option value="${c.id}" ${c.id===r.map?'selected':''}>${r.ren&&c.id===r.map?'Umbenennen: ':''}${esc(c.name)}</option>`).join('')}</select>
        <select class="in" id="wcp${i}" aria-label="Hauptkategorie">${parents.map(x=>`<option ${x===p?'selected':''}>${esc(x)}</option>`).join('')}</select></div>`).join('')}</div>`; }).join('')}</div>
    <label class="chk"><input type="checkbox" id="wcren" checked> Bestehende Kategorien auf den Wallet-Namen umbenennen</label>
    <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Übernehmen</button></div>`,
  k=>{ if(k==='ok') wbCatApply(); });
}
function wbCatApply(){
  const rows = S.wcRows||[], ren = $('#wcren').checked; let made = 0, renamed = 0, moved = 0;
  rows.forEach((r,i)=>{
    if(!$('#wco'+i)?.checked) return;
    const parent = $('#wcp'+i).value, target = $('#wcm'+i).value; let c = target ? D.cats.find(x=>x.id===target) : null;
    if(!c){ const [group, need] = wGroupNeed(r.name, parent);
      c = {id:'wc_'+r.key.toLowerCase().replace(/[^a-z0-9äöü]+/g,'_').slice(0,24)+'_'+uid().slice(0,4), name:r.name, group, need}; D.cats.push(c); made++; }
    else if(ren && c.name!==r.name && D.tx.filter(t=>t.wc===r.key).length >= D.tx.filter(t=>t.c===c.id && t.wc && t.wc!==r.key).length){ c.name = r.name; renamed++; }
    c.wparent = parent;
    D.walletMap[r.key] = c.id;
    for(const t of D.tx) if(t.wc===r.key && t.c!==c.id){ if(t.imp) setCat(t, c.id); else t.c = c.id; moved++; }
  });
  S.wcRows = null; calc(); save(); render();
  toastMsg(`Kategorien wie Wallet: ${made} neu, ${renamed} umbenannt, ${moved} Buchungen neu zugeordnet`);
}

/* ---------- Ausgabenstruktur nach Hauptkategorie (wie Wallet) oder Kategorie ---------- */
var catMain = id => { if(id==='_offen') return 'Ohne Kategorie'; const c = D.cats.find(x=>x.id===id); return c?.wparent || GROUPS[c?.group]?.n || 'Sonstiges'; };
var _cardStructure1110 = cardStructure;
cardStructure = function(a){
  if(segV('sg','cat')!=='main') return _cardStructure1110(a).replace('<div class="ah"><h3>Ausgabenstruktur</h3></div>', `<div class="ah"><h3>Ausgabenstruktur</h3></div>${seg('sg',[['cat','Kategorien'],['main','Hauptkategorien']],'cat')}`);
  const l = afTx(a.from, a.to).filter(t=>t.c!=='_inc' && !isTr(t)), by = {};
  for(const t of l){ const k = catMain(t.c); by[k] = (by[k]||0) + outAmt(t); }
  const parts = Object.entries(by).filter(([,v])=>v>0.004).sort((x,y)=>y[1]-x[1]).map(([n,v],i)=>({n, v, c:i<8?CAT_COL[i]:'#8a96a3'})), tot = parts.reduce((s,x)=>s+x.v,0);
  return `<div class="xcard xw"><div class="ah"><h3>Ausgabenstruktur</h3></div>${seg('sg',[['cat','Kategorien'],['main','Hauptkategorien']],'cat')}
    <div class="struct"><div class="sd">${donut(parts, parts[0]?.n||'Ausgaben', parts[0]?'CHF '+chf0(parts[0].v):'–', 170)}</div>
      <div class="dleg2">${parts.map(p=>`<div><i style="background:${p.c}"></i><span class="sp">${esc(p.n)}</span><b class="num">${chf0(p.v)}</b><em>${tot?Math.round(p.v/tot*100):0}%</em></div>`).join('')||'<p class="small muted">Keine Ausgaben im Zeitraum.</p>'}</div></div></div>`;
};

/* ---------- Automatische Regeln aus deinen Wallet-Buchungen ableiten ---------- */
var R_GENERIC = /^(OHNE TEXT|BUCHUNG|RESERVATION|TWINT|KAUF|ZAHLUNG|GUTSCHRIFT|LASTSCHRIFT|E-BANKING|AUFTRAG|DAUERAUFTRAG|KARTEN NR|NR\.?|CH|SCHWEIZ)$/;
function rulesFromWallet(){
  const by = new Map(), have = new Set((D.rules||[]).flatMap(r=>String(r.text||'').split(',').map(s=>bkNorm(s)).filter(Boolean)));
  for(const t of D.tx){ if(t.src!=='wallet' || !t.n || t.c==='_offen') continue;
    const payee = String(t.n).split(' · ')[0], m = bkMerchant(payee).replace(/\bKARTEN NR\.?\b/g,'').replace(/\bXXXX\d+\b/g,'').trim();
    if(m.length<3 || R_GENERIC.test(m) || /^\d/.test(m)) continue;
    const o = by.get(m) || {m, n:0, cats:{}, out:0, ex:payee}; o.n++; o.cats[t.c] = (o.cats[t.c]||0)+1; if((t.sa??-t.a)<0) o.out++; by.set(m, o); }
  const out = [];
  for(const o of by.values()){
    const [cat, k] = Object.entries(o.cats).sort((a,b)=>b[1]-a[1])[0];
    if(o.n<2 || k/o.n<0.9 || cat==='_offen') continue;
    const text = bkNorm(o.m); if(!text || have.has(text)) continue;
    out.push({m:o.m, text, cat, n:o.n, share:k/o.n, dir: o.out===o.n ? 'out' : o.out===0 ? 'in' : '', ex:o.ex});
  }
  return out.sort((a,b)=>b.n-a.n);
}
function rulesWalletDialog(){
  const list = rulesFromWallet(); S.rwList = list;
  if(!list.length){ alert('Keine neuen Regeln gefunden. Dafür braucht es Wallet-Buchungen in der App, bei denen derselbe Händler immer gleich zugeordnet ist.'); return; }
  dialog(`<h3>Regeln aus deinen Wallet-Buchungen</h3>
    <p class="small muted" style="margin-top:-8px">Wallet gibt die eigenen Regeln nicht heraus. Darum leitet die App sie aus deinen Buchungen ab: ${list.length} Händler waren immer (mindestens 90 %) derselben Kategorie zugeordnet. Vorgewählt sind die eindeutigen (mindestens 3× und 95 %). Die Regeln gelten für Bankdateien wie PostFinance – bei Wallet-Importen hat Wallets eigene Kategorie Vorrang.</p>
    <div class="wbl">${list.map((r,i)=>`<label class="chk wrr"><input type="checkbox" id="rw${i}" ${r.n>=3 && r.share>=0.95?'checked':''}><span class="sp"><b>«${esc(r.text)}»</b> → ${esc(r.cat===BK_TRANSFER?'Übertrag':bkName(r.cat))}<br><span class="small muted">${r.n}× · ${Math.round(r.share*100)} % · ${r.dir==='out'?'nur Ausgaben':r.dir==='in'?'nur Einnahmen':'Ausgaben und Einnahmen'}</span></span></label>`).join('')}</div>
    <label class="chk"><input type="checkbox" id="rwapply" checked> Sofort auf alle Buchungen ohne Kategorie anwenden</label>
    <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Regeln übernehmen</button></div>`,
  k=>{ if(k!=='ok') return; let n = 0;
    (S.rwList||[]).forEach((r,i)=>{ if(!$('#rw'+i)?.checked) return; (D.rules ??= []).push({id:'r'+uid(), name:niceName(r.m), text:r.text, dir:r.dir, acc:'', cat:r.cat, min:0, max:0, off:false, src:'wallet', bankOnly:true}); n++; });
    let fixed = 0; if($('#rwapply').checked) for(const t of D.tx){ if(t.c!=='_offen' || !t.imp) continue; const r = ruleMatch({text:t.n, sa:t.sa, acc:t.bacc}); if(r){ setCat(t, r.cat); fixed++; } }
    S.rwList = null; calc(); toastMsg(`${n} Regeln übernommen${fixed?`, ${fixed} Buchungen zugeordnet`:''}`); });
}

/* ---------- Knöpfe: Import-Seite, Regeln-Seite, Zuordnungs-Seite ---------- */
var _render1110 = render;
render = function(){
  _render1110();
  if(!D || S.locked) return;
  if(S.view==='buchungen') $('#mnav')?.style.setProperty('visibility','hidden');
  const box = (id, act, title, sub) => `<div class="wnote" id="${id}" data-act="${act}"><span class="wic" style="background:var(--acc)">${ci(CI.tag)}</span><span class="sp"><b>${title}</b><br><span class="small muted">${sub}</span></span>›</div>`;
  if(['import','zuordnung','mbw'].includes(S.view) && !$('#wbcatbox')) $('#main')?.insertAdjacentHTML('afterbegin', box('wbcatbox','wbcats','Kategorien wie in Wallet übernehmen','Namen, Hauptkategorien, Zuordnung aller Wallet-Buchungen'));
  if(['import','autoregeln'].includes(S.view) && !$('#wbrulebox')) $('#main')?.insertAdjacentHTML('afterbegin', box('wbrulebox','wbrules','Regeln aus Wallet-Buchungen ableiten','Händler, die in Wallet immer gleich zugeordnet waren'));
};
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act="wbcats"],[data-act="wbrules"]'); if(!a || !D) return; e.stopPropagation();
  a.dataset.act==='wbcats' ? wbCatDialog() : rulesWalletDialog();
}, true);

// Aus Wallet abgeleitete Regeln nur auf Bankdateien anwenden – bei Wallet-Buchungen zählt Wallets eigene Kategorie
var _catFor1110 = catFor;
catFor = function(x, accId, m){
  if(!x.wcat || !(D.rules||[]).some(r=>r.bankOnly)) return _catFor1110(x, accId, m);
  const keep = D.rules; D.rules = keep.filter(r=>!r.bankOnly);
  try{ return _catFor1110(x, accId, m); } finally { D.rules = keep; }
};
