/* =====================================================================
   36. VERSION 1.17.0 – VERTRÄGE & RECHNUNGEN AUTOMATISCH ERKENNEN
   Foto oder PDF hochladen → die App liest Betrag, Empfänger, Datum (QR-Code exakt, sonst Text) und erkennt:
   einmalige Rechnung, Abo oder wiederkehrende Zahlung (Prämie, Raten, Miete …) samt Rhythmus,
   Laufzeit und Kündigungsfrist. Alles passiert auf dem Gerät (PDF: Mozilla pdf.js, lokal in der App).
   ===================================================================== */
var PDFJS = null;
async function pdfLib(){
  if(PDFJS) return PDFJS;
  const m = await import(new URL('vendor/pdf/pdf.min.js', location.href).href);
  m.GlobalWorkerOptions.workerSrc = new URL('vendor/pdf/pdf.worker.min.js', location.href).href;
  return (PDFJS = m);
}
async function pdfPageCanvas(page, maxW=2200){
  const vp0 = page.getViewport({scale:1}), scale = Math.min(3, maxW/vp0.width), vp = page.getViewport({scale});
  const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,c.width,c.height);
  await page.render({canvas:c, canvasContext:ctx, viewport:vp}).promise; return c;
}
async function pdfRead(file, say){
  const lib = await pdfLib(), abs = p => new URL(p, location.href).href;
  const task = lib.getDocument({data:new Uint8Array(await file.arrayBuffer()), isEvalSupported:false, enableXfa:false, disableAutoFetch:true,
    cMapUrl:abs('vendor/pdf/cmaps/'), cMapPacked:true, standardFontDataUrl:abs('vendor/pdf/standard_fonts/')}), doc = await task.promise;
  try{
    let text = '', qr = null, first = null; const n = Math.min(doc.numPages, 8);
    for(let i=1; i<=n; i++){ say(`Lese Seite ${i} von ${n} …`); const p = await doc.getPage(i);
      const tc = await p.getTextContent(); text += tc.items.map(x=>(x.str||'')+(x.hasEOL?'\n':' ')).join('') + '\n';
      if(!qr && i<=3){ const c = await pdfPageCanvas(p); if(i===1) first = c; qr = await rcFindQR(c).catch(()=>null); } }
    if(text.replace(/\s/g,'').length < 40 && first){ say('Gescanntes PDF – lese den Text (ca. 10–20 Sekunden) …'); text = await rcOCR(first, say); }
    return {text, qr};
  } finally { try{ await task.destroy(); }catch(e){} }
}

/* ---------- Erkennen: einmalig, Abo oder wiederkehrend ---------- */
var FREQ_RX = [
  ['W', /w[öo]chentlich|pro woche|je woche|\/\s*woche|weekly/i],
  ['M', /monatlich|pro monat|je monat|im monat|\/\s*(monat|mt\.?|mon\.?)\b|mtl\.|monatsbeitrag|monatspr[äa]mie|monatsmiete|monthly|per month|\/\s*mo\b/i],
  ['Q', /viertelj[äa]hrlich|pro quartal|je quartal|quartalsweise|quarterly/i],
  ['H', /halbj[äa]hrlich|pro semester|semestriell|halbjahres/i],
  ['J', /j[äa]hrlich|pro jahr|je jahr|\/\s*jahr|jahresbeitrag|jahrespr[äa]mie|jahresgeb[üu]hr|jahresabo|jahresrechnung|annual|yearly|per year/i],
];
var KW_ABO = /\babo\b|abonnement|mitgliedschaft|mitgliederbeitrag|subscription|streaming|lizenz|premium|plus-abo|netflix|spotify|disney|youtube|apple|google one|icloud|swisscom|sunrise|salt|digitec plus|fitness|movemi/i;
var KW_REC = /vertrag|police|versicherung|pr[äa]mie|krankenkasse|laufzeit|k[üu]ndigungsfrist|mindestlaufzeit|leasing|miete|mietzins|nebenkosten|akonto|ratenzahlung|teilzahlung|\brate\b|abschlag|dauerauftrag|lastschriftverfahren|lsv|ebill/i;
var KW_INV = /rechnung|faktura|zahlbar|f[äa]llig|zahlungsfrist|iban|qr-rechnung|einzahlungsschein|referenz|kundennummer|vertragsnummer/i;
function rcDates(text){ const out = []; const rx = /\b(\d{1,2})\.\s?(\d{1,2})\.\s?(20\d{2})\b/g; let m; while((m = rx.exec(text))) out.push(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`); return out; }
function rcClassify(text, b){
  const t = (' '+String(text||'').replace(/\s+/g,' ')+' ').replace(/ae/g,'ä').replace(/oe/g,'ö').replace(/ue/g,'ü').replace(/Ae/g,'Ä').replace(/Oe/g,'Ö').replace(/Ue/g,'Ü'), why = [];
  // Betrag direkt beim Rhythmus («CHF 49.90 pro Monat»)
  let amount = b.amount || 0, freq = null;
  const pm = t.match(/(?:chf|fr\.?|sfr\.?)\s*([\d'’]{1,7}(?:[.,]\d{2})?)\s*(?:\.[-–]|[-–])?\s*(?:\/|pro|je|per|im)\s*(monat|jahr|quartal|woche|mt\.?)/i) || t.match(/([\d'’]{1,7}[.,]\d{2})\s*(?:chf|fr\.?)?\s*(?:\/|pro|je|per)\s*(monat|jahr|quartal|woche)/i);
  if(pm){ const v = parseFloat(pm[1].replace(/['’]/g,'').replace(',','.')); if(v>0 && v<100000){ if(!b.amount) amount = v; freq = {m:'M',j:'J',q:'Q',w:'W'}[pm[2][0].toLowerCase()]; why.push(`«${pm[0].trim()}» im Text`); } }
  if(!freq) for(const [f, rx] of FREQ_RX){ const m = t.match(rx); if(m){ freq = f; why.push(`«${m[0].trim()}» im Text`); break; } }
  const abo = KW_ABO.test(t), rec = KW_REC.test(t), inv = KW_INV.test(t) || b.kind==='qr';
  // Raten: «Rate 3 von 12»
  const rate = t.match(/rate\s*(\d{1,2})\s*(?:von|\/)\s*(\d{1,2})/i);
  // Laufzeit / Kündigung
  const endM = t.match(/(?:laufzeit|g[üu]ltig|vertragsdauer|befristet)[^.]{0,40}?bis\s*(?:zum\s*)?(\d{1,2})\.\s?(\d{1,2})\.\s?(20\d{2})/i);
  const end = endM ? `${endM[3]}-${endM[2].padStart(2,'0')}-${endM[1].padStart(2,'0')}` : null;
  const ntc = t.match(/k[üu]ndigungsfrist[^.]{0,30}?(\d{1,2})\s*(monat|monate|woche|wochen|tag|tage)/i);
  const notice = ntc ? {n:+ntc[1], u:ntc[2][0].toLowerCase()} : null;
  // Verlauf: gleicher Empfänger früher schon bezahlt?
  const key = bkMerchant(b.creditor||''), nk = bkNorm(key);
  const pastBills = (D.bills||[]).filter(x=>x.id!==b.id && bkMerchant(x.creditor||'')===key && key && key!=='OHNE TEXT');
  const pastTx = nk.length>=4 ? D.tx.filter(x=>x.d>=dAdd(todayIso(),-430) && kSpend(x)>0 && bkNorm((x.n||'')+' '+(x.wc||'')).includes(nk)) : [];
  const months = new Set([...pastTx.map(x=>x.d.slice(0,7)), ...pastBills.map(x=>(x.due||x.added||'').slice(0,7))].filter(Boolean));
  if(!freq && months.size>=3){ const ms = [...months].sort(), gaps = ms.slice(1).map((m,i)=>ymDiff(ms[i], m)), g = kMed(gaps);
    freq = g<=1.5 ? 'M' : g<=4 ? 'Q' : g<=8 ? 'H' : 'J'; why.push(`schon ${months.size}× bezahlt (${freqName(freq)})`); }
  else if(months.size>=1) why.push(`${months.size}× früher bezahlt`);
  if(rate) why.push(`Rate ${rate[1]} von ${rate[2]}`);
  if(abo) why.push('Abo/Mitgliedschaft im Text'); else if(rec) why.push('Vertrag/Prämie im Text');
  // Entscheid
  let type = 'einmalig';
  if(rate) type = 'raten';
  else if(abo && (freq || months.size>=2)) type = 'abo';
  else if(freq || (rec && months.size>=1) || months.size>=3) type = 'wiederkehrend';
  if(type!=='einmalig' && !freq) freq = 'M';
  const conf = type==='einmalig' ? (inv && !rec && !abo ? 'sicher' : 'wahrscheinlich') : (why.length>=2 ? 'sicher' : 'wahrscheinlich');
  // Ende bei Raten berechnen
  let rEnd = end; if(rate && !rEnd){ const left = +rate[2] - +rate[1], step = {M:1,Q:3,H:6,J:12}[freq]||1; rEnd = ymAdd((b.due||todayIso()).slice(0,7), left*step) + '-28'; }
  return {type, freq, amount, end:rEnd, notice, conf, why, inv, rate: rate ? {n:+rate[1], of:+rate[2]} : null};
}
// Spätestes Kündigungsdatum aus Laufzeitende und Frist
function cancelBy(end, notice){ if(!end || !notice) return null; const d = new Date(end+'T12:00');
  if(notice.u==='m') d.setMonth(d.getMonth()-notice.n); else if(notice.u==='w') d.setDate(d.getDate()-7*notice.n); else d.setDate(d.getDate()-notice.n);
  return d.toISOString().slice(0,10); }

/* ---------- Dialog: erkannt → speichern als Rechnung, Abo oder Dauerauftrag ---------- */
function docDialog(b, text){
  const r = rcClassify(text||'', b), due = b.due || rcDates(text||'').filter(d=>d>=todayIso()).sort()[0] || dAdd(todayIso(), 30);
  const cat = b.cat || bkRuleCat((b.creditor||'')+' '+(text||'').slice(0,400), bkMerchant(b.creditor||'')) || '';
  let type = r.type;
  const L = {einmalig:['Einmalige Rechnung','wird einmal bezahlt'], abo:['Abo','läuft weiter, bis du kündigst'], wiederkehrend:['Wiederkehrend','z. B. Prämie, Miete, Nebenkosten'], raten:['Raten','fester Betrag bis abbezahlt']};
  const body = () => `<h3>${b.kind==='qr'?'QR-Rechnung erkannt ✓':'Dokument erkannt'}</h3>
    <p class="small muted" style="margin-top:-8px">Die App schlägt vor: <b>${L[r.type][0]}</b>${r.type!=='einmalig'?' · '+freqName(r.freq):''} <span class="kpill ${r.conf==='sicher'?'hi':''}">${r.conf}</span>${r.why.length?'<br>Weil: '+r.why.map(esc).join(' · '):''}</p>
    <div class="dtype">${Object.entries(L).map(([k,[n,d]])=>`<button type="button" data-dlg="t:${k}" class="${type===k?'on':''}"><b>${n}</b><span>${d}</span></button>`).join('')}</div>
    <label class="f">Empfänger<input id="dc" value="${esc(b.creditor||'')}"></label>
    <div class="grid g2" style="gap:0 12px"><label class="f">Betrag CHF<input id="da" inputmode="decimal" value="${r.amount?chf(r.amount):''}"></label>
      <label class="f">${b.kind==='qr'||r.inv?'Zahlbar bis':'Erste Zahlung'}<input id="dd" type="date" value="${due}"></label>
      <label class="f dfreq">Rhythmus<select id="df">${FREQ.map(([k,l])=>`<option value="${k}" ${r.freq===k?'selected':''}>${l}</option>`).join('')}</select></label>
      <label class="f dend">Endet am (optional)<input id="de" type="date" value="${r.end||''}"></label></div>
    <label class="f">Kategorie<select id="dk"><option value="">– bitte wählen –</option>${catOptions(cat)}</select></label>
    <label class="f dnot">Kündigungsfrist (optional)<select id="dn"><option value="">–</option>${[[1,'m','1 Monat'],[2,'m','2 Monate'],[3,'m','3 Monate'],[6,'m','6 Monate'],[30,'t','30 Tage'],[4,'w','4 Wochen']].map(([n,u,l])=>`<option value="${n}${u}" ${r.notice&&r.notice.n===n&&r.notice.u===u?'selected':''}>${l}</option>`).join('')}</select></label>
    ${b.ref?`<p class="small muted">Referenz: ${esc(b.ref)}${b.no?' · Rechnung '+esc(b.no):''}</p>`:''}
    ${b.kind==='qr'||r.inv?chk('dbill', true, 'Diese Rechnung als offen erfassen (Erinnerung und Abgleich mit der Bank)'):''}
    ${text?`<details class="small"><summary class="muted">Erkannter Text</summary><pre style="white-space:pre-wrap;font-size:11px;max-height:160px;overflow:auto">${esc(String(text).slice(0,2000))}</pre></details>`:''}
    <p class="small neg" id="derr"></p>
    <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Speichern</button></div>`;
  const vis = () => { const rec = type!=='einmalig'; document.querySelectorAll('#dlgbody .dfreq,#dlgbody .dend,#dlgbody .dnot').forEach(x=>x.style.display = rec?'':'none'); };
  dialog(body(), k=>{
    if(k.startsWith('t:')){ type = k.slice(2); document.querySelectorAll('.dtype button').forEach(x=>x.classList.toggle('on', x.dataset.dlg===k)); vis(); return false; }
    const a = parseNum(val('da')), cr = val('dc').trim() || 'Rechnung', d = val('dd') || todayIso(), c = val('dk'), f = val('df'), e = val('de') || undefined;
    if(!a || isNaN(a)){ $('#derr').textContent = 'Bitte den Betrag prüfen.'; $('#da').style.borderColor = 'var(--bad)'; return false; }
    const nv = val('dn'), notice = nv ? {n:parseInt(nv), u:nv.slice(-1)} : null, withBill = $('#dbill') ? $('#dbill').checked : false;
    if(c && c!=='_inc'){ const m = bkMerchant(cr); if(!D.walletMap[m]) D.walletMap[m] = c; }
    const bill = {...b, id:'r'+uid(), status:'offen', added:todayIso(), creditor:cr, amount:a, due:d, cat:c};
    if(type==='einmalig'){ D.bills.push(bill); toastMsg('Rechnung gespeichert – du wirst vor dem Fälligkeitsdatum erinnert'); return; }
    // wiederkehrend / Abo / Raten → Dauerauftrag (bestehenden zum gleichen Empfänger aktualisieren)
    const match = bkNorm(bkMerchant(cr)), ex = (D.plans||[]).find(p=>!p.off && p.type!=='in' && (bkNorm(p.match||'')===match || bkNorm(p.name)===bkNorm(cr)));
    const step = {W:0, M:1, Q:3, H:6, J:12}[f], nm = f==='W' ? null : ymAdd(d.slice(0,7), step), start = withBill ? (f==='W' ? dAdd(d,7) : nm+'-'+String(Math.min(+d.slice(8), +mEnd(nm).slice(8))).padStart(2,'0')) : d;
    const plan = {id:ex?.id || 'p'+uid(), type:'out', name:cr, amount:a, freq:f, start, day:+d.slice(8), acc:ex?.acc || mainAcc().id, cat:c, match, end:e, kind:type, notice: notice || undefined, cancelBy: cancelBy(e, notice) || undefined};
    const old = ex ? Math.abs(ex.amount) : null;
    (D.plans ??= []); if(ex) Object.assign(ex, plan); else D.plans.push(plan);
    if(withBill) D.bills.push(bill);
    toastMsg(ex ? (old && Math.abs(old-a)>=0.01 ? `${cr}: Betrag aktualisiert (vorher CHF ${chf(old)})` : `${cr}: Dauerauftrag aktualisiert`) : `${L[type][0]} gespeichert: ${cr}, CHF ${chf(a)} ${freqName(f)}`);
  });
  vis();
}

/* ---------- Einstieg: Foto oder PDF ---------- */
async function rcHandle(file){
  dialog(`<h3>Erkennung läuft …</h3><p class="small muted" id="rcst">Dokument wird vorbereitet …</p><p class="small muted">Alles passiert auf deinem Gerät. Das Dokument wird nicht gespeichert und nirgendwohin geschickt.</p><div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button></div>`, ()=>{});
  const say = t => { const e = $('#rcst'); if(e) e.textContent = t; };
  try{
    let text = '', raw = null;
    if(/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name||'')){ const r = await pdfRead(file, say); text = r.text; raw = r.qr; }
    else { const canvas = await rcImage(file); say('Suche QR-Code …'); raw = await rcFindQR(canvas).catch(()=>null);
      if(!raw){ say('Kein QR-Code gefunden – lese den Text (erstes Mal ca. 10–20 Sekunden) …'); text = await rcOCR(canvas, say); } }
    const qb = raw ? rcParseQR(raw) : null;
    $('#dlg').close();
    if(qb) return docDialog(qb, text);
    const t = (' '+text.replace(/\s+/g,' ')+' ').replace(/ae/g,'ä').replace(/oe/g,'ö').replace(/ue/g,'ü'), looksDoc = KW_INV.test(t) || KW_REC.test(t) || KW_ABO.test(t) || FREQ_RX.some(([,rx])=>rx.test(t));
    if(looksDoc) return docDialog({kind:'doc', creditor:rcVendor(text), amount:rcAmount(text)}, text);
    receiptDialog({amount:rcAmount(text), date:rcDate(text), vendor:rcVendor(text), text});      // Kassenzettel → Ausgabe
  }catch(e){ say('Erkennung fehlgeschlagen: '+(e.message||e)+' Du kannst die Werte auch von Hand erfassen.'); }
}
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act="rcphoto"]'); if(!a || !D) return; e.stopPropagation(); e.preventDefault();
  dialog(`<h3>Rechnung, Vertrag oder Beleg</h3><p class="small muted" style="margin-top:-8px">Die App erkennt selbst, ob es eine einmalige Rechnung, ein Abo oder eine wiederkehrende Zahlung ist. PDF (z. B. aus dem E-Mail) oder Foto – der QR-Code wird exakt gelesen.</p>
    <div class="acts" style="justify-content:stretch;flex-wrap:wrap"><button class="btn pri" data-dlg="cam" style="flex:1">📷 Foto aufnehmen</button><button class="btn" data-dlg="file" style="flex:1">📄 PDF oder Bild wählen</button></div><div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button></div>`,
  k=>{ S.extUntil = Date.now()+10*60000; (async()=>{ const f = await bkPick(k==='cam' ? 'image/*' : 'image/*,application/pdf,.pdf', false, k==='cam'); if(f[0]) rcHandle(f[0]); })(); });
}, true);

/* ---------- Daueraufträge: Art, Laufzeit, Kündigung anzeigen; Glocke erinnert an Kündigungsfrist ---------- */
var _vPlaene1170 = vPlaene;
vPlaene = function(){
  let h = _vPlaene1170();
  for(const p of D.plans||[]){ const tags = [p.kind==='abo'?'Abo':p.kind==='raten'?'Raten':'', p.end?'bis '+dShort(p.end):'', p.cancelBy?'kündbar bis '+dShort(p.cancelBy):''].filter(Boolean).join(' · ');
    if(tags) h = h.replace(`<b>${esc(p.name)}</b><span>`, `<b>${esc(p.name)}</b><span>${esc(tags)} · `); }
  return h.replace('<p class="sub">', '<p class="sub">Tipp: Vertrag oder Rechnung als PDF/Foto über das Plus-Menü hochladen – die App legt den Dauerauftrag selbst an. ');
};
var _notices1170 = notices;
notices = function(){
  const out = _notices1170(), today = todayIso(), seen = D.flags?.seen || {};
  for(const p of D.plans||[]){ if(p.off || !p.cancelBy) continue; const n = dDiff(today, p.cancelBy);
    if(n>=0 && n<=30){ const k = 'kb'+p.id+p.cancelBy; out.unshift({k, lvl:n<=7?'bad':'warn', t:`Kündigungsfrist: ${p.name}`, s:`Wenn du kündigen willst: spätestens ${dShort(p.cancelBy)} (${n===0?'heute':'in '+n+' Tagen'})`, go:'plaene', seen:!!seen[k]}); } }
  return out;
};
var _fabSheet1170 = fabSheet;
fabSheet = function(){ _fabSheet1170(); const b = document.querySelector('#dlgbody [data-sheet="rcphoto"]');
  if(b) b.querySelector('.sp').innerHTML = '<b>Rechnung, Vertrag oder Beleg</b><span>Foto oder PDF – erkennt Abo, einmalig oder wiederkehrend</span>'; };
