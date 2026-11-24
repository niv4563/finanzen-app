/* =====================================================================
   68. VERSION 1.41.0 – ÜBERTRÄGE PLANEN, BESTÄTIGTES NIE DOPPELT
   • Geplante Zahlungen kennen drei Arten: Ausgabe · Einnahme · Übertrag (von Konto → auf Konto),
     z. B. monatlich CHF 600 aufs Sparkonto oder CHF 1'500 auf die Kreditkarte.
     Überträge ändern das Netto nicht, verschieben aber Geld zwischen den Konten (Kontotrend).
   • Ist eine geplante Zahlung schon gebucht (Bank, Wallet oder von Hand: gleicher Betrag ±10 %,
     ±7 Tage, gleiche Richtung), erscheint sie nicht mehr als «geplant» – weder bei den
     bevorstehenden Zahlungen noch im Kalender noch in der Prognose.
   ===================================================================== */
// ---------- bestätigt? ----------
var cfDir = x => x.tr || x.c===BK_TRANSFER ? 'tr' : x.v<0 ? 'in' : 'out';
var cfAmt = (t, dir) => dir==='tr' ? (isTr(t) ? cTrAmt(t) : 0) : dir==='in' ? (isTr(t) ? 0 : Math.max(0, sv(t))) : (isTr(t) ? 0 : Math.max(0, -sv(t)));
function cfConfirmed(x, used){
  const amt = Math.abs(x.v), dir = cfDir(x), today = todayIso(); if(!amt) return false;
  const t = D.tx.find(t=>!used.has(t.id) && t.d<=today && Math.abs(dDiff(t.d, x.d))<=7 && Math.abs(cfAmt(t,dir)-amt) <= Math.max(1, amt*0.1));
  if(t){ used.add(t.id); return true; } return false;
}
// nur geplante (nicht geschätzte) Posten in der Nähe von heute prüfen
var cfCheck = x => !x.est && !['bill','pend'].includes(x.k) && x.d <= dAdd(todayIso(), 5) && (x.plan || x.wp || x.k==='plan' || x.k==='inc' || x.k==='rec');
var wpTr = x => { if(!x.wp) return null; const p = (D.walletApi?.planned||[]).find(y=>y.id===x.wp); return p && (p.ty==='transfer' || p.to) ? p : null; };
upcoming = (prev => function(days=35){ const l = prev(days), used = new Set();
  return l.filter(x=>!(cfCheck({...x, k:x.k||(x.plan||x.wp?'plan':'')}) && cfConfirmed({...x, tr:x.tr||!!wpTr(x)}, used)))
    .map(x=>{ const p = wpTr(x); return p ? {...x, tr:true, c:BK_TRANSFER, sub:`Übertrag${p.acc?' · '+accName(p.acc):''}${p.to&&p.to!=='x'?' → '+accName(p.to):''}`} : x; }); })(upcoming);
fcEvents = (prev => function(until){ const F = prev(until), used = new Set(); F.list = F.list.filter(x=>!(cfCheck(x) && cfConfirmed(x, used))); return F; })(fcEvents);

// ---------- Überträge als Dauerauftrag ----------
planPaid = (prev => function(p, d){
  if(p.type!=='tr') return prev(p, d);
  const amt = Math.abs(p.amount);
  return D.tx.some(t=>isTr(t) && Math.abs(dDiff(d, t.d))<=6 && Math.abs(cTrAmt(t)-amt) <= amt*0.15+0.5 && (!p.to || t.toAcc===p.to || t.bacc===p.to || t.acc===p.acc || t.bacc===p.acc));
})(planPaid);
planOcc = (prev => function(from, to){ return prev(from, to).map(x=>{ const p = (D.plans||[]).find(y=>y.id===x.plan);
  return p?.type==='tr' ? {...x, c:BK_TRANSFER, tr:true, from:p.acc, to:p.to, sub:`Übertrag · ${accName(p.acc)} → ${accName(p.to)}`} : x; }); })(planOcc);
upRow = (prev => x => { const h = prev(x); return x.tr || x.c===BK_TRANSFER ? h.replace(/(<b class="num )(in|out)(">)\(([−+])?/, '$1$3(⇄ ') : h; })(upRow);

planDialog = function(i){
  const isNew = i==null, p = isNew ? {type:'out', name:'', amount:'', cat:'', acc:mainAcc().id, to:'', freq:'M', start:todayIso(), day:+todayIso().slice(8), match:''} : {...D.plans[i]};
  const accOpt = sel => activeAccs().filter(a=>!a.archived).map(a=>`<option value="${a.id}" ${a.id===sel?'selected':''}>${esc(a.name)}</option>`).join('');
  const seg = (t,l) => `<button class="${p.type===t?'on':''}" data-dlg="t:${t}">${l}</button>`;
  const vis = () => { $('#pcatl').style.display = p.type==='out' ? '' : 'none'; $('#ptol').style.display = p.type==='tr' ? '' : 'none'; $('#paccl').firstChild.textContent = p.type==='tr' ? 'Von Konto' : 'Konto';
    $('#pn').placeholder = p.type==='tr' ? 'z. B. Sparen, Kreditkarte begleichen' : p.type==='in' ? 'z. B. Lohn' : 'z. B. Miete, Krankenkasse'; };
  dialog(`<h3>${isNew?'Neue geplante Zahlung':'Geplante Zahlung bearbeiten'}</h3>
    <div class="sgm">${seg('out','Ausgabe')}${seg('in','Einnahme')}${seg('tr','Übertrag')}</div>
    <label class="f">Name<input id="pn" value="${esc(p.name)}"></label>
    <div class="grid g2" style="gap:0 12px"><label class="f">Betrag CHF<input id="pa" inputmode="decimal" value="${p.amount===''?'':chf(Math.abs(p.amount))}"></label>
      <label class="f">Rhythmus<select id="pf">${FREQ.map(([k,l])=>`<option value="${k}" ${p.freq===k?'selected':''}>${l}</option>`).join('')}</select></label>
      <label class="f">Erste Zahlung<input id="ps" type="date" value="${p.start}"></label>
      <label class="f" id="paccl">Konto<select id="pacc">${accOpt(p.acc)}</select></label></div>
    <label class="f" id="ptol">Auf Konto<select id="pto"><option value="">– wählen –</option>${accOpt(p.to)}</select></label>
    <label class="f" id="pcatl">Kategorie<select id="pc"><option value="">– wählen –</option>${catOptions(p.cat).replace(/<option value="_inc"[^>]*>[^<]*<\/option>/,'')}</select></label>
    <label class="f">Erkennen am Buchungstext (optional, mit Komma)<input id="pm" value="${esc(p.match||'')}" placeholder="z. B. css, krankenkasse"></label>
    <label class="f">Endet am (optional)<input id="pe" type="date" value="${p.end||''}"></label>
    ${chk('poff', !!p.off, 'Pausiert')}<p class="small neg" id="perr"></p>${acts(isNew)}`,
  k=>{
    if(k.startsWith('t:')){ p.type = k.slice(2); document.querySelectorAll('#dlgbody .sgm button').forEach(b=>b.classList.toggle('on', b.dataset.dlg===k)); vis(); return false; }
    if(k==='del'){ D.plans.splice(i,1); return; }
    const a = parseNum(val('pa')); if(!val('pn').trim() || !isFinite(a) || !a){ $('#perr').textContent = 'Bitte Name und Betrag angeben.'; return false; }
    if(p.type==='tr' && (!val('pto') || val('pto')===val('pacc'))){ $('#perr').textContent = 'Bitte ein anderes Zielkonto wählen.'; return false; }
    const np = {...(isNew?{}:D.plans[i]), id:p.id||'p'+uid(), type:p.type, name:val('pn').trim(), amount:Math.abs(a), freq:val('pf'), start:val('ps')||todayIso(), day:+(val('ps')||todayIso()).slice(8),
      acc:val('pacc'), to:p.type==='tr'?val('pto'):undefined, cat:p.type==='out'?val('pc'):p.type==='tr'?BK_TRANSFER:'', match:val('pm').trim(), end:val('pe')||undefined, off:$('#poff').checked||undefined};
    (D.plans ??= []); if(isNew) D.plans.push(np); else D.plans[i] = np; });
  vis();
};
// Liste: Überträge neutral anzeigen und nicht in die Monatssummen rechnen
vPlaene = (prev => function(){
  const tr = (D.plans||[]).map((p,i)=>({p,i})).filter(x=>x.p.type==='tr');
  let h = prev();
  const perMonth = p => Math.abs(p.amount) * ({W:52/12, M:1, Q:1/3, H:1/6, J:1/12}[p.freq]||1);
  const trOut = tr.filter(x=>!x.p.off).reduce((s,x)=>s+perMonth(x.p),0);
  h = h.replace(/(<span>Ausgaben pro Monat<\/span><b class="num out">−)([^<]*)(<\/b>)/, (m,a,b,c)=>a+chf(Math.max(0, parseNum(b)-trOut))+c);
  for(const {p,i} of tr){ const re = new RegExp(`(data-act="planedit" data-i="${i}">[\\s\\S]*?<span class="wic" style="background:)[^"]*("[\\s\\S]*?<span>)([^<]*)(</span></div>[\\s\\S]*?<b class="num )out(">)−`);
    h = h.replace(re, (m,a,b,c,d,e)=>`${a}var(--muted)${b}${freqName(p.freq)} · Übertrag ${esc(accName(p.acc))} → ${esc(accName(p.to))}${p.off?' · pausiert':''}${d}${e}⇄ `); }
  return h.replace('<h3>Daueraufträge</h3>', '<h3>Geplante Zahlungen</h3>')
    .replace('Feste Zahlungen und Einnahmen mit Datum.', 'Feste Ausgaben, Einnahmen und Überträge zwischen deinen Konten mit Datum. Ist eine Zahlung schon gebucht, gilt sie als erledigt und erscheint nicht doppelt.');
})(vPlaene);

// Kontotrend: geplante Überträge verschieben Geld zwischen den Konten (ohne Excel-Plan)
ktSeries = (prev => function(nFut){
  const K = prev(nFut), plans = (D.plans||[]).filter(p=>p.type==='tr' && !p.off), wtr = (D.walletApi?.planned||[]).filter(p=>(p.ty==='transfer' || p.to) && p.acc && p.to && p.to!=='x');
  // täglichen Konsum nach bisherigem Zahlverhalten auf die Konten verteilen (z. B. 60 % mit der Kreditkarte)
  const main = mainAcc?.(), mainRow = K.rows.find(r=>r.a.id===main?.id);
  if(mainRow && mainRow.src==='prog'){
    const by = {}; let tot = 0; for(const t of D.tx){ if(t.d < ymAdd(TODAY,-6)+'-01') continue; const v = bhDaily(t); if(!v) continue; const a = t.bacc||t.acc; by[a] = (by[a]||0)+v; tot += v; }
    const F = fcEvents(mEnd(K.futM.at(-1))), spend = m => (F.bud.find(b=>b.ym===m)?.tot||0);   // nur täglicher Konsum; feste Kosten bleiben beim Konto, von dem sie abgehen
    const sp = K.futM.map(spend);
    for(const r of K.rows){ if(r.src==='plan' || r.a.id===main.id || !tot) continue; const sh = (by[r.a.id]||0)/tot; if(sh<0.05) continue; let cum = 0;
      r.fut = r.fut.map((v,i)=>{ cum += sh*sp[i]; return v - cum; }); r.end = r.fut.at(-1); r.src = 'prog';
      let c2 = 0; mainRow.fut = mainRow.fut.map((v,i)=>{ c2 += sh*sp[i]; return v + c2; }); mainRow.end = mainRow.fut.at(-1); }
  }
  if(!plans.length && !wtr.length) return K;
  const wOcc = (p, from, to) => wbPlannedOcc(from, to).filter(x=>x.wp===p.id).length;
  for(const r of K.rows){ if(r.src==='plan') continue; let cum = 0, touched = false;
    r.fut = r.fut.map((v,i)=>{ const m = K.futM[i], from = i===0 ? dAdd(todayIso(),1) : m+'-01';
      for(const p of plans){ if(p.acc!==r.a.id && p.to!==r.a.id) continue; const n = planDates(p, from, mEnd(m)).filter(d=>!planPaid(p,d)).length; if(!n) continue;
        cum += (p.to===r.a.id ? 1 : -1) * n * Math.abs(p.amount); touched = true; }
      for(const p of wtr){ if(p.acc!==r.a.id && p.to!==r.a.id) continue; const n = wOcc(p, from, mEnd(m)); if(!n) continue;
        cum += (p.to===r.a.id ? 1 : -1) * n * Math.abs(p.v); touched = true; }
      return v + cum; });
    if(touched){ r.end = r.fut.at(-1); if(r.src==='flat') r.src = 'prog'; } }
  return K;
})(ktSeries);
