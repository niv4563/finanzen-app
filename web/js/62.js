/* =====================================================================
   64. KATEGORIEN AUF DEUTSCH · AUTOMATISCHE ZUORDNUNG
   • Alle Kategorien deutsch – auch die Namen, die Wallet englisch liefert (Kategorien, Hauptkategorien,
     Kategorie in jeder Buchung). Übersetzt wird direkt beim Empfang, darum stimmen auch die internen
     Zuordnungen (Wallet-Kategorie → Budget) mit den deutschen Namen überein.
   • Automatische Zuordnung: Für Buchungen ohne Kategorie sucht die App die beste Kategorie aus
     1) deinen bisherigen Buchungen beim gleichen Händler (neuere zählen mehr, ähnlicher Betrag zählt mehr),
     2) deinen Regeln und festen Zuordnungen, 3) eingebautem Wissen über Schweizer Händler und Dienste,
     4) den Wörtern im Buchungstext (lernt aus allen alten Einträgen).
     Nur sichere Treffer werden selbst gesetzt; der Rest erscheint als Vorschlag.
     Alte Einträge, die vom üblichen Muster abweichen, werden zum Prüfen angezeigt.
   • Datenschutz: Es geht nichts ins Internet. Händlernamen würden sonst verraten, wo du einkaufst.
   ===================================================================== */
var DE_CAT = (()=>{ const m = {}, a = (de, ...en) => en.forEach(e=>m[e.toLowerCase()] = de);
  a('Essen & Getränke','Food & Drinks','Food & Drink'); a('Lebensmittel','Groceries'); a('Restaurant, Fast-Food','Restaurant, fast-food','Restaurant, fast food'); a('Bar, Café','Bar, cafe','Bar, café');
  a('Einkaufen','Shopping'); a('Kleidung & Schuhe','Clothes & shoes','Clothes & Shoes'); a('Schmuck, Accessoires','Jewels, accessories'); a('Gesundheit und Schönheit','Health and beauty');
  a('Kinder','Kids','Children'); a('Haushalt, Garten','Home, garden'); a('Haustiere, Tiere','Pets, animals'); a('Elektronik, Zubehör','Electronics, accessories'); a('Geschenke, Freude','Gifts, joy');
  a('Bürobedarf, Werkzeuge','Stationery, tools'); a('Freizeit','Free time'); a('Drogerie, Apotheke','Drug-store, chemist','Drugstore, chemist'); a('Möbel','Furniture');
  a('Wohnen','Housing'); a('Miete','Rent'); a('Hypothek','Mortgage'); a('Energie, Nebenkosten','Energy, utilities'); a('Wartung, Reparaturen','Maintenance, repairs'); a('Dienstleistungen','Services'); a('Sachversicherung','Property insurance');
  a('Transport','Transportation'); a('Öffentliche Verkehrsmittel','Public transport','Public transportation'); a('Taxi','Taxi'); a('Fernverkehr','Long distance'); a('Geschäftsreisen','Business trips');
  a('Fahrzeug','Vehicle'); a('Kraftstoff','Fuel'); a('Parken','Parking'); a('Fahrzeugwartung','Vehicle maintenance'); a('Mietwagen','Rentals','Rental'); a('Fahrzeugversicherung','Vehicle insurance'); a('Leasing','Leasing');
  a('Leben & Unterhaltung','Life & Entertainment','Life & entertainment'); a('Gesundheitsversorgung, Arzt','Health care, doctor'); a('Wellness, Schönheit','Wellness, beauty'); a('Aktiver Sport, Fitness','Active sport, fitness');
  a('Kultur-, Sportveranstaltungen','Culture, sport events'); a('Lebensereignisse','Life events'); a('Hobbys','Hobbies'); a('Bildung, persönliche Entwicklung','Education, development'); a('Bücher, Audio, Abonnements','Books, audio, subscriptions');
  a('TV, Streaming','TV, Streaming','TV, streaming'); a('Urlaub, Ausflüge, Hotels','Holiday, trips, hotels'); a('Wohltätigkeit, Geschenke','Charity, gifts'); a('Alkohol, Tabak','Alcohol, tobacco'); a('Lotterie, Glücksspiel','Lottery, gambling');
  a('Kommunikation, PC','Communication, PC'); a('Telefon, Handy','Phone, cell phone','Phone, mobile phone','Phone'); a('Internet','Internet'); a('Software, Apps, Spiele','Software, apps, games'); a('Postdienste','Postal services');
  a('Finanzausgaben','Financial expenses'); a('Steuern','Taxes'); a('Versicherungen','Insurances','Insurance'); a('Darlehen, Zinsen','Loan, interests','Loans, interests'); a('Geldstrafen','Fines'); a('Beratung','Advisory'); a('Gebühren','Charges, Fees','Charges, fees'); a('Unterhalt','Child Support','Child support'); a('Kinderbetreuung','Childcare');
  a('Investitionen','Investments'); a('Immobilien','Realty'); a('Fahrzeuge, Sachwerte','Vehicles, chattels'); a('Finanzinvestitionen','Financial investments'); a('Ersparnisse','Savings'); a('Sammlungen','Collections');
  a('Einkommen','Income'); a('Lohn, Gehalt, Rechnungen','Wage, invoices'); a('Zinsen, Dividenden','Interests, dividends'); a('Verkauf','Sale'); a('Mieteinnahmen','Rental income'); a('Zuschüsse, Beihilfen','Dues & grants');
  a('Verleihen, Vermietung','Lending, renting'); a('Schecks, Gutscheine, Essensmarken','Checks, coupons'); a('Rückerstattungen (Steuern, Einkauf)','Refunds (tax, purchase)'); a('Geschenke','Gifts');
  a('Sonstiges','Others','Other'); a('Fehlend','Missing'); a('Unbekannte Ausgaben','Unknown expense','Unknown expenses'); a('Krankenversicherung','Health insurance'); a('Übertrag','Transfer');
  a('Internet und TV','Internet; Handy');
  return m; })();
var deCat = s => DE_CAT[String(s??'').trim().toLowerCase()] || null;
var trCat = s => deCat(s) || s;
var trKey = s => { const d = deCat(s); if(!d) return s; return s===String(s).toUpperCase() ? d.toUpperCase() : d; };

// Namen aus Wallet schon beim Empfang übersetzen (Kategorien, Hauptkategorien, Kategorie jeder Buchung)
function deWalk(o, d){
  if(!o || typeof o!=='object' || d>6) return;
  if(Array.isArray(o)){ for(const x of o) deWalk(x, d+1); return; }
  for(const k of ['category','group','envelopeGroup','parent']) if(o[k] && typeof o[k]==='object' && typeof o[k].name==='string') o[k].name = trCat(o[k].name);
  for(const k of ['parentName','categoryName']) if(typeof o[k]==='string') o[k] = trCat(o[k]);
  for(const v of Object.values(o)) if(v && typeof v==='object') deWalk(v, d+1);
}
wbGet = (prev => async function(path){
  const j = await prev(path);
  try{ if(/^categories/.test(String(path))) for(const c of wbList(j,'categories')) if(c && typeof c.name==='string') c.name = trCat(c.name); deWalk(j, 0); }catch(e){}
  return j;
})(wbGet);

// Bestehende Daten übersetzen (bei jedem Laden, ändert nur, was noch englisch ist)
function deCats(d){
  let n = 0;
  for(const c of d.cats||[]){ if(!c.nameUser){ const x = deCat(c.name); if(x && x!==c.name){ c.name = x; n++; } }
    if(c.wparent) c.wparent = trCat(c.wparent); if(c.wsub) c.wsub = trCat(c.wsub); }
  const w = d.walletApi; if(w?.catTops) w.catTops = [...new Set(w.catTops.map(trCat))];
  if(d.walletMap) for(const [k,v] of Object.entries(d.walletMap)){ const k2 = trKey(k); if(k2!==k && !(k2 in d.walletMap)) d.walletMap[k2] = v; }
  for(const t of d.tx||[]) if(t.wc){ const k2 = trKey(t.wc); if(k2!==t.wc){ t.wc = k2; n++; } }
  return n;
}
migrate = (prev => function(d){ const r = prev(d); try{ if(r) deCats(r); }catch(e){} return r; })(migrate);
// Anzeige: Hauptkategorien aus Wallet ebenfalls deutsch
if(typeof bkName==='function') bkName = (prev => id => trCat(prev(id)))(bkName);

/* ---------- Automatische Zuordnung ---------- */
// Eingebautes Wissen: Schweizer Händler und Dienste → passende Kategorie (Text ist normalisiert: klein, ohne Akzente)
var AC_KNOW = [
  [/\bmigros (fitness|fitnesspark)|activ fitness|update fitness|movemi|basefit|kieser|clever fit|crossfit|kletterhalle|hallenbad|fitnesscenter|fitness park/, [/fitness|sport/]],
  [/\bmigros do it|do it garden|\bobi\b|hornbach|bauhaus|jumbo|ikea|pfister|conforama|coop bau|landi|qualipet|fressnapf|maxi bazar|\bdepot\b|micasa|interio/, [/haushalt|haus|garten/, /mobel/]],
  [/coop pronto|mcdonald|burger king|starbucks|subway|\bkfc\b|holy cow|tibits|dean david|vapiano|restaurant|ristorante|pizzeria|trattoria|kebab|sushi|take ?away|just eat|uber eats|smood|eat ch|bistro|brasserie|baeckerei|backerei|confiserie|sprungli|kafi|cafe\b/, [/restaurant/, /essen|getranke/]],
  [/\bmigros\b|\bcoop\b|denner|\baldi\b|\blidl\b|\bvolg\b|\bspar\b|alnatura|farmy|globus delicatessa|manor food|\bprimo\b|\bvisavis\b|topcc|aligro/, [/^lebensmittel/, /lebensmittel/]],
  [/\bsbb\b|\bcff\b|\bffs\b|\bzvv\b|postauto|\bbls\b|\brbs\b|\bvbz\b|bernmobil|\btpg\b|fairtiq|libero|a welle|ostwind|\btnw\b|\bvbl\b|easyride|aargau verkehr|\bavag\b|regionalbus/, [/offentliche verkehr/, /arbeitsweg/, /verkehr|transport/]],
  [/\bshell\b|\bbp\b|\bavia\b|agrola|migrol|socar|tamoil|\beni\b|ruedi russel|tankstelle|tankstell/, [/kraftstoff|treibstoff|benzin/, /fahrzeug/, /arbeitsweg/]],
  [/parking|parkhaus|parkuhr|easypark|parkingpay|parkplatz/, [/parken/, /fahrzeug/, /arbeitsweg/]],
  [/zalando|\bh m\b|hennes|\bzara\b|\bc a\b|ochsner|dosenbach|vogele|bershka|pull bear|uniqlo|primark|snipes|about you|tally weijl|\bmango\b|esprit|calida|schild|\bpkz\b|globus mode|vero moda|jack jones|chicoree/, [/kleidung/]],
  [/galaxus|digitec|\bbrack\b|interdiscount|media ?markt|\bfust\b|apple store|microspot|conrad|steg electronics|melectronics/, [/elektronik/, /wunsche|anschaffung/, /einkaufen/]],
  [/amavita|sun ?store|coop vitality|apotheke|pharmacie|pharmacy|drogerie|\bdm\b|muller|\bbenu\b|topwell|rotpunkt/, [/drogerie|apotheke/, /haushalt/, /gesundheit/]],
  [/swisscom|\bsalt\b|sunrise|wingo|yallo|quickline|\bupc\b|init7|m budget mobile|digital republic|\blebara\b/, [/internet und tv/, /internet|telefon|handy|kommunikation/]],
  [/serafe/, [/serafe/, /tv streaming|internet und tv/, /gebuhr/]],
  [/netflix|spotify|disney|apple com|itunes|google play|youtube|amazon prime|prime video|\bsky\b|blue\b|teleboy|zattoo|dazn|audible|microsoft|adobe|openai|chatgpt|anthropic|claude ai|icloud|dropbox/, [/tv streaming/, /\babo/, /software|apps/]],
  [/\bcss\b|helsana|swica|sanitas|concordia|visana|assura|\bkpt\b|groupe mutuel|atupri|\bokk\b|\begk\b|sympany|aquilana|krankenkasse/, [/krankenversicherung|krankenkasse/, /versicherung/]],
  [/mobiliar|\baxa\b|zurich versicherung|allianz|generali|helvetia|baloise|smile direct|vaudoise|\btcs\b|emmental versicherung|versicherung/, [/versicherung/]],
  [/steuerverwaltung|steueramt|steuerbezug|kantonale steuer|gemeindesteuer|bundessteuer|steuerrechnung/, [/steuer/]],
  [/zahnarzt|dental|arztpraxis|\bpraxis\b|spital|klinik|physio|optiker|fielmann|visilab|kontaktlinsen|labor|medbase|santemed|hausarzt|notfall/, [/gesundheit|arzt/]],
  [/ticketcorner|starticket|eventfrog|ticketmaster|\bkino\b|pathe|kitag|cinema|museum|theater|konzert|zoo\b|europa park|alpamare/, [/kultur|veranstaltung/, /freizeit|hobby/]],
  [/booking com|airbnb|easyjet|swiss intl|edelweiss|\bhotel\b|expedia|ryanair|lufthansa|flixbus|trivago|hostel|bergbahn|skipass/, [/urlaub|ferien|reise/]],
  [/coiffeur|friseur|barber|haarstudio|kosmetik|nagelstudio|beauty/, [/coiffeur|korperpflege|schonheit/]],
  [/kontofuhrung|kontogebuhr|jahresgebuhr|kartengebuhr|spesen|bankgebuhr|preis fur|sollzins/, [/bank|gebuhr/]],
  [/die post|\bpost ch\b|\bdpd\b|\bdhl\b|\bups\b|planzer/, [/postdienst/]],
  [/orell fussli|ex libris|thalia|weltbild|udemy|coursera|klubschule|\bbfh\b|fhnw|hochschule|edurail|\beth\b/, [/weiterbildung|bildung/, /bucher/]],
];
var acText = t => bkNorm((t.n||'')+' '+(t.text||''));
var acMer = t => bkNorm(typeof merchant==='function' ? merchant(t.n||t.text||'') : (t.n||'')).replace(/\bohne text\b/,'');
var acIn = t => t.c==='_inc' || (t.imp ? t.sa>0 : t.a<0);
var acOk = id => id && id!=='_offen' && id!==BK_TRANSFER && (id==='_inc' || D.cats.some(c=>c.id===id && !c.archived));
var _acc = {}; function acCache(n, fn){ const key = D.tx.length+'|'+(D.savedAt||'')+'|'+D.cats.length; if(_acc[n]?.key!==key) _acc[n] = {key, v:fn()}; return _acc[n].v; }
function acModel(){ return acCache('m', ()=>{
  const by = {}, now = Date.now(), use = {};
  for(const t of D.tx){ if(!acOk(t.c) || isTr(t)) continue; const k = acMer(t); const age = Math.max(0, (now - Date.parse(t.d))/864e5);
    if(age<=400) use[t.c] = (use[t.c]||0)+1;
    if(!k) continue; const key = k+'|'+(acIn(t)?'in':'out'), w = 0.25 + Math.exp(-age/365), o = by[key] ??= {n:0, c:{}, amt:{}};
    o.n++; o.c[t.c] = (o.c[t.c]||0)+w; (o.amt[t.c] ??= []).push(Math.abs(t.sa ?? t.a)); }
  return {by, use};
}); }
function acResolve(pats){
  const M = acModel(), cats = D.cats.filter(c=>!c.archived && c.id!=='rueck');
  for(const rx of pats){ const hit = cats.filter(c=>rx.test(bkNorm(c.name))); if(hit.length) return hit.sort((a,b)=>(M.use[b.id]||0)-(M.use[a.id]||0))[0].id; }
  return null;
}
// Beste Kategorie für eine Buchung: {c, p (0–1), src}
function acBest(t){
  const inc = acIn(t), out = [], M = acModel(), key = acMer(t), amt = Math.abs(t.sa ?? t.a) || 0;
  // 1. eigene alte Buchungen beim gleichen Händler
  const dir = '|'+(inc?'in':'out'), h = key && (M.by[key+dir] || M.by[key.split(' ')[0]+dir]);
  if(h){ const sc = Object.entries(h.c).map(([c,w])=>{ const a = h.amt[c].slice().sort((x,y)=>x-y), med = a[a.length>>1]||amt, sim = amt&&med ? 1/(1+Math.abs(Math.log(amt/med))) : 1; return {c, w:w*(0.5+0.5*sim)}; }).filter(x=>acOk(x.c)).sort((a,b)=>b.w-a.w);
    const tot = sc.reduce((s,x)=>s+x.w,0); if(sc[0]) out.push({c:sc[0].c, p:(sc[0].w/tot)*(h.n/(h.n+1)), src:`wie ${h.n} frühere Buchung${h.n>1?'en':''} bei diesem Händler`}); }
  // 2. Regeln und feste Zuordnungen
  try{ const r = bkRuleCat(t.n||t.text||'', String(t.wc||acMer(t)).toUpperCase()); if(acOk(r) && (r==='_inc')===inc) out.push({c:r, p:0.9, src:'deine Regel bzw. Zuordnung'}); }catch(e){}
  // 3. eingebautes Händlerwissen (nur Ausgaben)
  if(!inc){ const tx = acText(t); for(const [rx, pats] of AC_KNOW) if(rx.test(tx)){ const c = acResolve(pats); if(c){ out.push({c, p:0.8, src:'bekannter Händler'}); break; } } }
  // 4. Wörter im Text (aus allen alten Einträgen gelernt)
  try{ const k = kPredict(t); if(k && acOk(k.c) && (k.c==='_inc')===inc) out.push({c:k.c, p:Math.min(0.85, k.p), src:'ähnliche Buchungstexte'}); }catch(e){}
  if(!out.length) return null;
  const agg = {}; for(const x of out){ const a = agg[x.c] ??= {c:x.c, p:0, src:[]}; a.p = 1 - (1-a.p)*(1-x.p); a.src.push(x.src); }
  const best = Object.values(agg).sort((a,b)=>b.p-a.p)[0], rival = Object.values(agg).filter(x=>x!==best).sort((a,b)=>b.p-a.p)[0];
  if(rival) best.p *= 1 - rival.p*0.5;   // widersprechen sich die Quellen, sinkt die Sicherheit
  return {c:best.c, p:best.p, src:best.src.join(' · ')};
}
var AC_AUTO = 0.75;
function acAssign(t, c){ if(t.imp) setCat(t, c); else t.c = c; t.ai = 2;
  const wid = t.wpush || (String(t.id||'').startsWith('wb_') ? t.id.slice(3) : null);
  if(wid && D.walletApi?.token){ D.walletApi.pushQ ??= {patch:{}, del:[]}; D.walletApi.pushQ.patch[wid] = 1; } }
function acRun(){
  if(!D || S.locked || D.settings.acAuto===false) return 0;
  let n = 0; const done = [];
  for(const t of D.tx){ if(t.c!=='_offen' || t.acNo) continue; const r = acBest(t); if(r && r.p>=AC_AUTO){ acAssign(t, r.c); t.acSrc = r.src; n++; done.push(t.id); } }
  if(n){ D.acLast = {at:new Date().toISOString(), ids:done.slice(-300)}; calc(); save(); if(typeof wbPushSoon==='function') wbPushSoon(); toastMsg(`${n} Buchung${n>1?'en':''} automatisch zugeordnet`); }
  return n;
}
var ACT = null;
save = (prev => function(){ const r = prev.apply(this, arguments); if(!ACT) ACT = setTimeout(()=>{ ACT = null; try{ acRun(); }catch(e){} }, 1500); return r; })(save);
// Alte Einträge prüfen: weicht eine Buchung deutlich vom üblichen Muster beim gleichen Händler ab?
function acSuspects(){ return acCache('s', ()=>{
  const M = acModel(), from = dAdd(todayIso(), -730), out = [];
  for(const t of D.tx){ if(t.d<from || !acOk(t.c) || isTr(t) || t.acOk) continue; const k = acMer(t), h = k && M.by[k+'|'+(acIn(t)?'in':'out')]; if(!h || h.n<4) continue;
    const tot = Object.values(h.c).reduce((s,w)=>s+w,0), best = Object.entries(h.c).sort((a,b)=>b[1]-a[1])[0];
    if(best[0]!==t.c && acOk(best[0]) && best[1]/tot>=0.8) out.push({t, c:best[0], share:best[1]/tot, n:h.n}); }
  return out.sort((a,b)=>b.t.d.localeCompare(a.t.d)).slice(0,60);
}); }
function acCard(){
  const open = D.tx.filter(t=>t.c==='_offen'), sug = open.map(t=>({t, r:acBest(t)})).filter(x=>x.r).sort((a,b)=>b.r.p-a.r.p);
  const sus = acSuspects(), last = (D.acLast?.ids||[]).map(id=>D.tx.find(t=>t.id===id)).filter(t=>t && t.ai===2).slice(-8).reverse();
  S.acSug = sug; S.acSus = sus;
  const row = (t, c, extra, act, i) => `<div class="krow"><span>${esc(niceName(t.n||t.text||'Ohne Text'))}<em>${dShort(t.d)} · CHF ${chf(Math.abs(sv(t)))}${extra?' · '+esc(extra):''}</em></span><span class="kpill">${esc(bkName(c))}</span>${act?`<button class="ibtn" data-act="${act}" data-i="${i}" aria-label="Übernehmen">✓</button>`:''}<button class="ibtn" data-act="edittx" data-id="${t.id}" aria-label="Öffnen">✎</button></div>`;
  return `<div class="card aczu"><div class="row"><h3 class="sp" style="margin:0">Automatische Zuordnung</h3>
      <label class="small"><input type="checkbox" class="acauto" ${D.settings.acAuto===false?'':'checked'}> automatisch</label></div>
    <p class="small muted">Sucht für jede Buchung ohne Kategorie die beste Kategorie: aus deinen früheren Buchungen beim gleichen Händler, deinen Regeln, bekannten Schweizer Händlern und ähnlichen Buchungstexten. Sichere Treffer setzt die App selbst. Alles bleibt auf dem Gerät.</p>
    ${last.length?`<details class="small"><summary>Zuletzt automatisch zugeordnet (${(D.acLast?.ids||[]).length})</summary>${last.map(t=>row(t, t.c, t.acSrc)).join('')}<button class="btn sm ghost mt" data-act="acundo">Diese Zuordnung rückgängig machen</button></details>`:''}
    ${sug.length?`<h4 class="mt">Vorschläge (${sug.length} ohne Kategorie)</h4>${sug.slice(0,10).map((x,i)=>row(x.t, x.r.c, `${Math.round(x.r.p*100)} % · ${x.r.src}`, 'acone', i)).join('')}
      ${sug.filter(x=>x.r.p>=0.5).length?`<button class="btn sm mt" data-act="acall">${sug.filter(x=>x.r.p>=0.5).length} wahrscheinliche übernehmen</button>`:''}`:open.length?'':'<p class="small">Alle Buchungen haben eine Kategorie.</p>'}
    ${sus.length?`<h4 class="mt">Bitte prüfen: weicht vom Üblichen ab (${sus.length})</h4><p class="small muted">Beim gleichen Händler war es sonst fast immer eine andere Kategorie.</p>
      ${sus.slice(0,10).map((x,i)=>row(x.t, x.c, `bisher ${bkName(x.t.c)} · sonst ${Math.round(x.share*100)} % von ${x.n}`, 'acfix', i)).join('')}
      <div class="row mt" style="gap:6px"><button class="btn sm" data-act="acfixall">Alle ${Math.min(sus.length,60)} ändern</button><button class="btn sm ghost" data-act="acokall">Alle so lassen</button></div>`:''}
  </div>`;
}
vZuordnung = (prev => function(){ return acCard() + prev(); })(vZuordnung);
cardKiCats = (prev => function(){ return acCard(); })(cardKiCats);
document.addEventListener('change', e=>{ const el = e.target; if(!el?.classList?.contains('acauto') || !D) return; D.settings.acAuto = el.checked; save(); if(el.checked) acRun(); render(); });
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act]'); if(!a || !D) return; const k = a.dataset.act, i = +a.dataset.i;
  const fin = msg => { calc(); save(); if(typeof wbPushSoon==='function') wbPushSoon(); if(msg) toastMsg(msg); render(); };
  if(k==='acone'){ e.stopPropagation(); const x = S.acSug?.[i]; if(x && x.t.c==='_offen'){ acAssign(x.t, x.r.c); x.t.acSrc = x.r.src; } fin(); }
  else if(k==='acall'){ e.stopPropagation(); let n = 0; for(const x of S.acSug||[]) if(x.r.p>=0.5 && x.t.c==='_offen'){ acAssign(x.t, x.r.c); x.t.acSrc = x.r.src; n++; } fin(n+' Buchungen zugeordnet'); }
  else if(k==='acfix'){ e.stopPropagation(); const x = S.acSus?.[i]; if(x){ acAssign(x.t, x.c); x.t.acOk = 1; } fin(); }
  else if(k==='acfixall'){ e.stopPropagation(); if(!confirm(`${(S.acSus||[]).length} Buchungen in die übliche Kategorie verschieben?`)) return; let n = 0; for(const x of S.acSus||[]){ acAssign(x.t, x.c); x.t.acOk = 1; n++; } fin(n+' Buchungen geändert'); }
  else if(k==='acundo'){ e.stopPropagation(); let n = 0; for(const id of D.acLast?.ids||[]){ const t = D.tx.find(x=>x.id===id); if(t && t.ai===2){ acAssign(t, '_offen'); t.ai = 0; t.acNo = 1; n++; } } D.acLast = null; fin(n+' Zuordnungen zurückgenommen'); }
  else if(k==='acokall'){ e.stopPropagation(); for(const x of S.acSus||[]) x.t.acOk = 1; fin(); }
}, true);
// Was du von Hand änderst, wird nie mehr automatisch überschrieben oder als Abweichung gemeldet
txDialog = (prev => function(t, preset={}, onDone){ return prev(t, preset, x=>{ if(x){ x.acOk = 1; if(x.ai===2 && x.c!=='_offen') x.ai = 0; if(x.c==='_offen') x.acNo = 1; } onDone?.(x); }); })(txDialog);
