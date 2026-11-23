/* =====================================================================
   59. VERSION 1.34.0 – GEPLANTES WIRD NUR ANGEDEUTET, NIE ABGEBUCHT
   • Nur was wirklich abgerechnet ist (Bank, Wallet, eigene Buchung von heute oder früher), zählt.
   • Rechnung «Schon bezahlt» bucht nichts mehr: Sie gilt als «angewiesen» (gestrichelt) und wird
     erst «bezahlt», wenn die Abbuchung von der Bank bzw. Wallet kommt.
   • Fotografierte Belege und Buchungen mit Datum in der Zukunft werden «vorgemerkt»:
     gestrichelt angezeigt, nicht abgezogen, nicht an Wallet geschickt. Kommt die echte Abbuchung
     (gleicher Betrag, ähnliches Datum), verschwindet die Vormerkung von selbst.
   • Bevorstehende Zahlungen (Budget, Daueraufträge, Rechnungen, Jahreskosten) sind gestrichelt.
   ===================================================================== */
const isReal = t => !!(t.imp || t.src === 'wallet' || t.src === 'csv');
const absAmt = t => Math.abs(t.imp ? (t.sa || 0) : (t.a || 0));

/* ---------- Vormerkungen ---------- */
function pendAdd(p){ (D.pend ??= []).push({id:'p'+uid(), at:new Date().toISOString(), ...p}); }
function pendSweep(){                                   // vorgemerkte Posten mit echter Abbuchung abgleichen
  if(!D) return false; let ch = false;
  // Buchungen mit Datum in der Zukunft (von Hand) → vormerken
  const today = todayIso();
  for(const t of [...D.tx]) if(!isReal(t) && !t.wpush && t.d > today && t.c !== BK_TRANSFER){
    D.tx = D.tx.filter(x=>x!==t); pendAdd({d:t.d, n:t.n||bkName(t.c), c:t.c, a:t.a, acc:t.acc, src:t.src||'hand'}); ch = true; }
  for(const p of [...(D.pend||[])]){
    const m = D.tx.find(t => isReal(t) && Math.abs(absAmt(t) - Math.abs(p.a)) < 0.06 && dDiff(p.d, t.d) >= -5 && dDiff(p.d, t.d) <= 20 && !t.pendOf);
    if(m){ m.pendOf = p.id; if(m.c === '_offen' && p.c && p.c !== '_inc') m.c = p.c; D.pend = D.pend.filter(x=>x!==p); ch = true; }
  }
  // angewiesene / offene Rechnungen: erst bezahlt, wenn die Abbuchung da ist
  for(const b of D.bills||[]){
    if(b.status !== 'angewiesen' && b.status !== 'offen') continue;
    const ref = b.paid || b.due || today;
    const m = D.tx.find(t => isReal(t) && Math.abs(absAmt(t) - Math.abs(b.amount)) < 0.06 && dDiff(ref, t.d) >= -10 && dDiff(ref, t.d) <= 30 && !t.billOf);
    if(m){ b.status = 'bezahlt'; b.paid = m.d; b.tx = m.id; m.billOf = b.id; if(m.c === '_offen' && b.cat && b.cat !== '_inc') m.c = b.cat; ch = true; }
  }
  return ch;
}
// «Schon bezahlt» bucht nichts mehr
billPaid = function(b){ b.status = 'angewiesen'; b.paid = todayIso(); pendSweep(); };

// Beleg-Foto: vormerken statt buchen
receiptDialog = function(r){
  const m = bkMerchant(r.vendor), cat = bkRuleCat(r.vendor+' '+r.text, m) || '';
  dialog(`<h3>Beleg erkannt</h3><p class="small muted" style="margin-top:-8px">Bitte kurz prüfen. Der Beleg wird nur <b>vorgemerkt</b> (gestrichelt) – abgezogen wird erst, wenn die Bank bzw. Wallet die Zahlung meldet.</p>
    <label class="f">Geschäft<input id="rv" value="${esc(r.vendor)}"></label>
    <div class="grid g2" style="gap:0 12px"><label class="f">Betrag CHF<input id="ra" inputmode="decimal" value="${r.amount?chf(r.amount):''}" style="font-size:20px;font-weight:650"></label>
    <label class="f">Datum<input id="rd" type="date" value="${r.date}"></label></div>
    <label class="f">Kategorie<select id="rk"><option value="">– bitte wählen –</option>${catOptions(cat||'')}</select></label>
    <details class="small"><summary class="muted">Erkannter Text</summary><pre style="white-space:pre-wrap;font-size:11px;max-height:160px;overflow:auto">${esc(r.text.slice(0,1500))}</pre></details>
    <div class="acts"><button class="btn" data-dlg="bill">Ist eine offene Rechnung</button><span class="sp"></span><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Vormerken</button></div>`,
  k=>{ const a = parseNum(val('ra')); if(!a || isNaN(a)){ $('#ra').style.borderColor='var(--bad)'; return false; }
    if(k==='bill'){ setTimeout(()=>billDialog({kind:'foto', creditor:val('rv'), amount:a, cat:val('rk')}),50); return; }
    const v = val('rv').trim()||'Beleg', c = val('rk'); if(c && c!=='_inc' && !D.walletMap[bkMerchant(v)]) D.walletMap[bkMerchant(v)] = c;
    pendAdd({d:val('rd')||todayIso(), n:v, c:c||'_offen', a, src:'foto'}); pendSweep(); toastMsg('Vorgemerkt – wird beim Abbuchen übernommen'); });
};

/* ---------- Anzeige: gestrichelt ---------- */
function pendRow(p){
  return `<div class="wrow plan" data-act="pendopen" data-id="${p.id}"><span class="wic" style="background:var(--muted)">${ci(p.c ? catIcon({c:p.c}) : CI.tag)}</span>
    <div class="wmid"><b>${esc(p.n)}</b><span>Vorgemerkt · ${esc(bkName(p.c||'_offen'))}</span></div>
    <div class="wend"><b class="num">(−${chf(Math.abs(p.a))})</b><span class="${p.d<todayIso()?'late':''}">${p.d<todayIso()?'noch nicht abgebucht · ':''}${dShort(p.d)}</span></div></div>`;
}
upcoming = (prev => function(days=35){
  const l = prev(days), today = todayIso(), until = dAdd(today, days);
  for(const b of D.bills||[]) if(b.status==='angewiesen' && !l.some(x=>x.billId===b.id)) l.push({d:b.paid||today, n:b.creditor, sub:'angewiesen · wartet auf Abbuchung', v:b.amount, c:b.cat, go:'rechnungen', billId:b.id});
  for(const p of D.pend||[]) if(p.d<=until) l.push({d:p.d, n:p.n, sub:'vorgemerkt', v:p.a, c:p.c, go:'buchungen'});
  return l.sort((a,b)=>a.d.localeCompare(b.d));
})(upcoming);
upRow = (prev => x => prev(x).replace('<div class="wrow"', '<div class="wrow plan"').replace(/(<b class="num [^"]*">)([^<]*)(<\/b>)/, '$1($2)$3'))(upRow);
vBuchungen2 = (prev => function(){
  const h = prev(), l = (D.pend||[]).slice().sort((a,b)=>a.d.localeCompare(b.d));
  if(!l.length) return h;
  const box = `<div class="card pendbox"><h3>Vorgemerkt – noch nicht abgebucht</h3><p class="small muted" style="margin-top:-6px">Zählt nicht im Kontostand. Wird übernommen, sobald die Bank bzw. Wallet die Zahlung meldet.</p>${l.map(pendRow).join('')}</div>`;
  return h.replace(/(<div class="bper">[\s\S]*?<\/div><\/div>)/, '$1' + box);
})(vBuchungen2);
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act="pendopen"]'); if(!a || !D) return; e.stopPropagation();
  const p = (D.pend||[]).find(x=>x.id===a.dataset.id); if(!p) return;
  dialog(`<h3>Vorgemerkt</h3><p><b>${esc(p.n)}</b> · CHF ${chf(Math.abs(p.a))} · ${dShort(p.d)}</p>
    <p class="small muted">Wird automatisch übernommen, sobald die Abbuchung von der Bank bzw. Wallet kommt. Bei Barzahlung ohne Wallet-Eintrag kannst du sie selbst buchen.</p>
    <div class="acts"><button class="btn danger" data-dlg="del">Vormerkung löschen</button><span class="sp"></span><button class="btn" data-dlg="cancel">Schliessen</button><button class="btn" data-dlg="book">Jetzt buchen (bar bezahlt)</button></div>`,
  k=>{ if(k==='del'){ D.pend = D.pend.filter(x=>x!==p); markDel?.(p.id); }
    if(k==='book'){ D.pend = D.pend.filter(x=>x!==p); D.tx.push({id:uid(), d:p.d>todayIso()?todayIso():p.d, c:p.c||'_offen', a:p.a, n:p.n, acc:p.acc||mainAcc().id, src:'hand'}); calc(); } });
}, true);

/* ---------- Abgleich nach jeder Änderung und bei Wallet-/Bank-Daten ---------- */
save = (prev => function(){ try{ if(D && pendSweep()) calc?.(); }catch(e){} return prev.apply(this, arguments); })(save);
// Rechnungsliste: «angewiesen» statt «offen»
render = (prev => function(){
  prev.apply(this, arguments);
  if(S.view === 'rechnungen' && D) for(const b of D.bills||[]) if(b.status==='angewiesen'){ const el = document.querySelector(`[data-id="${b.id}"] .small.muted`); if(el && !el.dataset.aw){ el.dataset.aw = 1; el.textContent = 'angewiesen ' + dShort(b.paid||todayIso()) + ' · wartet auf Abbuchung'; el.closest('[data-id]')?.classList.add('plan'); } }
})(render);
