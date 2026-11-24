/* =====================================================================
   67. VERSION 1.40.0 – PROGNOSE OHNE DOPPELZÄHLUNGEN, NETTO ÜBER ALLE KONTEN
   Fehler bisher:
   - Feste Kosten aus dem Budget UND die gleiche geplante Zahlung aus Wallet (z. B. Miete) wurden
     beide abgezogen.
   - Konsum mit der Kreditkarte wurde gezählt und die Begleichung der Karte vom Konto nochmals;
     Überträge aufs Sparkonto zählten als Ausgabe.
   - Der Lohn wurde nicht geschätzt, sobald irgendeine kleine Einnahme geplant war; das Einkommen
     aus deiner Budgetplanung wurde nicht verwendet.
   Neu:
   - Die Prognose rechnet netto über alle Konten in der Statistik (Guthaben minus Schulden).
     Überträge zwischen eigenen Konten (Sparen, Kreditkarte begleichen, Säule 3a) sind neutral.
   - Feste Kosten zählen einmal: eine geplante Zahlung (Wallet oder Dauerauftrag) ersetzt die
     Schätzung aus dem Budget (gleiche Kategorie, ähnlicher Name oder Betrag, ±20 Tage).
   - Einkommen pro Monat: geplante Einnahmen; fehlt etwas, das Einkommen aus deiner Budgetplanung,
     sonst der Schnitt der letzten Monate – abzüglich dem, was diesen Monat schon eingegangen ist.
   ===================================================================== */
// Netto: alle Konten, die in die Statistik zählen (CHF) – Schulden negativ
fcLiquidAccs = () => D.accounts.filter(a=>!a.archived && inStats(a) && accCur(a)==='CHF');
var FC_TR_NAME = /übertrag|umbuchung|überweisung an mich|eigenes konto|sparkonto|sparen|säule|3a|kreditkarte|rückzahlung|einzahlung|depot|anlegen|invest/i;
var fcIsMove = x => {
  if(x.wp){ const p = (D.walletApi?.planned||[]).find(y=>y.id===x.wp); if(p && (p.ty==='transfer' || p.to)) return true; }
  const g = x.c ? (D.cats.find(c=>c.id===bhKey(x.c))?.group || '') : '';
  if(['schulden','spar'].includes(g) || x.c===BK_TRANSFER || x.c==='rueck') return true;
  if(x.plan){ const p = (D.plans||[]).find(y=>y.id===x.plan); if(p && ['schulden','spar'].includes(D.cats.find(c=>c.id===p.cat)?.group)) return true; }
  return (x.k==='plan' || x.k==='inc') && x.v>0 && FC_TR_NAME.test(x.n||'');
};
// typisches Monatseinkommen: Budget (Excel) – sonst Median der letzten 3 vollen Monate
function fcIncomeExp(ym){
  const bud = +(D.income?.[ym]) || C.m?.[ym]?.incPlan || 0; if(bud>0) return {v:bud, src:'Budget'};
  const ms = [1,2,3].map(i=>{ const m = ymAdd(TODAY,-i); let s = D.tx.filter(t=>t.d.startsWith(m) && t.c==='_inc').reduce((a,t)=>a+inAmt(t),0);
    if(s<500) s = D.tx.filter(t=>t.d.startsWith(m) && !isTr(t) && sv(t)>=1000).reduce((a,t)=>a+sv(t),0); return s; }).sort((a,b)=>a-b);
  return {v:ms[1]||0, src:'Ø letzte Monate'};
}
var fcIncDay = () => { const l = D.tx.filter(t=>t.c==='_inc' && inAmt(t)>=500 && t.d>=ymAdd(TODAY,-4)+'-01').map(t=>+t.d.slice(8)).sort((a,b)=>a-b); return l.length ? l[Math.floor(l.length/2)] : 25; };

fcEvents = (prev => function(until){
  const F = prev(until), today = todayIso(), tmr = dAdd(today,1);
  // 1. Überträge zwischen eigenen Konten sind netto neutral
  for(const x of F.list) if(!x.gone && fcIsMove(x)) { x.gone = true; x.move = true; }
  // 2. feste Kosten / Jahreskosten aus dem Budget nur, wenn keine geplante Zahlung dafür da ist
  const real = F.list.filter(x=>!x.gone && !x.est && x.v>0);
  for(const y of F.list){ if(y.gone || !y.est || !['fix','yearly'].includes(y.k)) continue;
    const hit = real.find(x=>Math.abs(dDiff(x.d,y.d))<=20 && ((x.c && bhKey(x.c)===y.c) || fcNameMatch(x.n, y.n) || Math.abs(x.v-y.v) <= Math.max(15, y.v*0.15)));
    if(hit){ y.gone = true; hit.repl ??= {n:y.n, v:y.v, k:y.k}; } }
  // 3. Einkommen: alte Schätzung ersetzen
  for(const x of F.list) if(x.k==='inc' && x.est) x.gone = true;
  const day = fcIncDay();
  for(let ym=TODAY; ym<=until.slice(0,7); ym=ymAdd(ym,1)){
    const exp = fcIncomeExp(ym); if(exp.v<=0) continue;
    const got = ym===TODAY ? D.tx.filter(t=>t.d.startsWith(ym) && t.c==='_inc').reduce((a,t)=>a+inAmt(t),0) : 0;
    const planned = -F.list.filter(x=>!x.gone && x.v<0 && x.d.startsWith(ym)).reduce((a,x)=>a+x.v,0);
    const miss = exp.v - got - planned; if(miss < Math.max(100, exp.v*0.1)) continue;
    let d = ym+'-'+String(Math.min(day, +mEnd(ym).slice(8))).padStart(2,'0'); if(d<tmr) d = tmr; if(d>until || d.slice(0,7)!==ym) continue;
    F.list.push({d, n:'Einkommen', sub:`Schätzung · ${exp.src} ${ymShort(ym)}: CHF ${chf0(exp.v)}${got?` (schon erhalten ${chf0(got)})`:''}`, v:-miss, c:'_inc', k:'inc', est:true, go:'budget'});
  }
  F.list = F.list.filter(x=>!x.gone).sort((a,b)=>a.d.localeCompare(b.d));
  return F;
})(fcEvents);

// Texte: «Netto» statt «verfügbar»
cardOutlook = (prev => function(){ return prev().replace(/(\d+) Rechnung(en ersetzen| ersetzt) eine Schätzung\./, (x,n)=>`${n} geplante Zahlung${+n>1?'en ersetzen':' ersetzt'} eine Schätzung aus dem Budget.`).replace('<span>Heute verfügbar</span>', '<span>Netto heute</span>').replace('Verfügbar: bisher und Prognose', 'Netto (alle Konten): bisher und Prognose')
  .replace('<span class="small muted">Bisher durchgezogen, Prognose gestrichelt</span></div></div>', '<span class="small muted">Netto über alle Konten (Guthaben minus Schulden) · bisher durchgezogen, Prognose gestrichelt</span></div></div>')
  .replace('Je mehr Rechnungen du scannst, desto genauer.</p>', 'Je mehr Rechnungen du scannst, desto genauer. Überträge zwischen deinen Konten (Sparen, Kreditkarte begleichen) zählen nicht, feste Kosten nur einmal.</p>'); })(cardOutlook);
