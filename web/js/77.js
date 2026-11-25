/* =====================================================================
   79. TIPPS AUS DEINEN ZAHLEN · GLOCKE RESPEKTIERT «EINGEHALTEN» · NAMEN WIE WALLET
   • Berater › Übersicht (und Analyse › Bericht): Tipps aus dem letzten Lohnmonat, berechnet aus deinen
     Buchungen – grösster Ausgabenblock, Kategorien deutlich über dem Schnitt, Buchungen ohne Kategorie,
     Kreditkarte, zwei Löhne im selben Monat, tiefste Ausgaben. Jeder Tipp mit Knopf zum Handeln.
   • Glocke und Mitteilungen: kein «Budget überschritten» mehr, wenn du die Kategorie als eingehalten
     markiert hast.
   • «Essen & Getränke» heisst wie in Wallet «Essen & Trinken».
   ===================================================================== */

/* ---------- Namen wie Wallet ---------- */
(() => {
  for(const k of ['food & drinks','food & drink','essen & getränke']) DE_CAT[k] = 'Essen & Trinken';
  if(typeof W_PGROUP==='object' && W_PGROUP['Essen & Getränke']) W_PGROUP['Essen & Trinken'] = W_PGROUP['Essen & Getränke'];
  if(typeof W_PNEED==='object' && W_PNEED['Essen & Getränke']) W_PNEED['Essen & Trinken'] = W_PNEED['Essen & Getränke'];
  if(typeof W_PARENT==='object') for(const k of Object.keys(W_PARENT)) if(W_PARENT[k]==='Essen & Getränke') W_PARENT[k] = 'Essen & Trinken';
  if(typeof W_PARENT==='object') W_PARENT['ESSEN & TRINKEN'] = 'Essen & Trinken';
})();
wParentOf = (prev => n => { const r = prev(n); return r==='Essen & Getränke' ? 'Essen & Trinken' : r; })(wParentOf);
migrate = (prev => function(d){ const r = prev(d); try{ const x = r || d;
  if(x?.cats) for(const c of x.cats){ if(c.wparent==='Essen & Getränke') c.wparent = 'Essen & Trinken'; if(c.wsub==='Essen & Getränke') c.wsub = 'Essen & Trinken'; if(c.wid && c.name==='Essen & Getränke') c.name = 'Essen & Trinken'; } }catch(e){} return r; })(migrate);

/* ---------- Glocke: «eingehalten» respektieren ---------- */
daily = (prev => function(ym=TODAY){ const d = prev(ym); try{
  if(d && S._bokQuiet && D.bok?.[ym]) return {...d, cats:(d.cats||[]).filter(x=>D.bok[ym][x.c.id]!==1)}; }catch(e){} return d; })(daily);
var bokQuiet = f => function(){ S._bokQuiet = true; try{ return f.apply(this, arguments); } finally { S._bokQuiet = false; } };
notices = bokQuiet(notices);
checkAlerts = bokQuiet(checkAlerts);

/* ---------- Tipps aus deinen Zahlen ---------- */
function noFilter(f){ const keep = S.bf; S.bf = BF_DEF(); try{ return f(); } finally { S.bf = keep; } }
function tipPeriods(){
  const t = todayIso(); let k = 0; const P0 = _lmPeriod(0); if(dDiff(t, P0.to) > 2) k = -1;   // laufender Monat noch zu jung → letzter ganzer
  return Array.from({length:6},(_,i)=>_lmPeriod(k-i)).map(p=>({...p, k}));
}
function finTips(){
  if(!D?.tx?.length) return [];
  return noFilter(() => {
    const Ps = tipPeriods(), Ss = Ps.map(p=>brSums(p.from, p.to)), S0 = Ss[0], rest = Ss.slice(1).filter(s=>s.out>0), out = [];
    const id = Ps[0].from, nm = Ps[0].s, no = D.settings.tipNo || {}, add = x => { if(!no[x.key+'|'+id]) out.push(x); };
    if(S0.out < 1 && S0.inc < 1) return out;
    const outK = Object.entries(S0.top).filter(([k,v])=>k.startsWith('o:') && v>0).sort((a,b)=>b[1]-a[1]);
    // 1) grösster Ausgabenblock
    if(outK.length && S0.out>0){ const [k,v] = outK[0], sh = v/S0.out;
      if(sh >= 0.35) add({key:'big', lvl:'info', t:`${k.slice(2)}: ${pct(sh)} deiner Ausgaben`, d:`Im ${nm} waren es CHF ${chf0(v)} von CHF ${chf0(S0.out)}. Schau, welche Posten darin stecken – oft lassen sich Versicherungen, Gebühren oder Raten vergleichen oder zusammenlegen.`, b:[['Posten ansehen', 'tiplist', k]]}); }
    // 2) Kategorien deutlich über dem Schnitt
    if(rest.length >= 2){ let n = 0;
      for(const [k,v] of outK){ if(k==='o:Unbekannt' || k==='o:Überweisungen' || out.some(x=>x.key==='big' && x.b[0][2]===k)) continue; const avg = rest.reduce((a,s)=>a+(s.top[k]||0),0)/rest.length;
        if(v - avg >= 100 && v >= avg*1.3){ add({key:'up:'+k, lvl:'warn', t:`${k.slice(2)} deutlich über dem Schnitt`, d:`CHF ${chf0(v)} im ${nm} – sonst im Schnitt CHF ${chf0(avg)} (+${Math.round((v/(avg||1)-1)*100)} %). Einmalig oder neu wiederkehrend?`, b:[['Posten ansehen', 'tiplist', k]]}); if(++n>=2) break; } } }
    // 3) ohne Kategorie
    const unk = S0.top['o:Unbekannt']||0; if(unk >= 20) add({key:'unk', lvl:'warn', t:`CHF ${chf0(unk)} ohne Kategorie`, d:`Diese Buchungen fehlen in Budget und Auswertung. Ein paar Tipps genügen – die App lernt für die nächsten Male.`, b:[['Jetzt zuordnen', 'go', 'zuordnung']]});
    // 4) Kreditkarte
    for(const a of D.accounts.filter(a=>!a.archived && accGrp(a)==='karte' && inStats(a))){ const b = balAt(a.id, todayIso()) ?? accValRaw(a), b30 = balAt(a.id, dAdd(todayIso(),-30));
      if(b < -300){ const grow = b30!=null && b < b30 - 100;
        add({key:'kk:'+a.id, lvl:grow?'bad':'warn', t:`${a.name}: CHF ${chf0(-b)} offen`, d:`${grow?`In 30 Tagen um CHF ${chf0(b30-b)} gewachsen. `:''}Das ist der Hauptgrund für einen tiefen Kontostand. Kreditkartenzinsen sind hoch – zuerst abzahlen lohnt sich meist mehr als Sparen.`, b:[['Schuldenplan', 'go', 'coach']]}); } }
    // 5) zwei Löhne im selben Monat
    const sal = brTx(Ps[0].from, Ps[0].to).filter(t=>brIsInc(t) && sv(t)>=1000).sort((a,b)=>a.d.localeCompare(b.d));
    if(sal.length>=2 && rest.length){ const avgI = Ss.slice(1).reduce((a,s)=>a+s.inc,0)/Math.max(1,Ss.length-1);
      if(S0.inc > avgI*1.3) add({key:'2sal', lvl:'info', t:`Zwei Lohneingänge im ${nm}`, d:`${sal.map(t=>dShort(t.d)+' CHF '+chf0(sv(t))).join(' und ')}. Die Einnahmen sind darum ausnahmsweise CHF ${chf0(S0.inc-avgI)} höher als üblich – nicht als dauerhaft einplanen. Wenn der Lohn manchmal einen Tag früher kommt, hilft ein anderer Lohntag.`, b:[['Lohntag prüfen', 'tiplm', '']]}); }
    // 6) positiv: tiefste Ausgaben
    if(rest.length>=3 && S0.out>0 && rest.every(s=>S0.out<=s.out)) add({key:'low', lvl:'ok', t:'Tiefste Ausgaben seit Monaten', d:`CHF ${chf0(S0.out)} im ${nm} – weniger als in jedem der ${rest.length} Monate davor. Gönn dir bewusst etwas davon.`, b:[['Gönnen', 'go', 'goennen']]});
    return out.map(x=>({...x, id}));
  });
}
function tipCard(max){
  let T = []; try{ T = finTips(); }catch(e){ console.error(e); } if(!T.length) return '';
  const ic = {bad:'⚠', warn:'!', info:'ℹ', ok:'✓'};
  return `<div class="card mt tipcard"><h3 style="margin:0 0 4px">Tipps aus deinen Zahlen</h3><p class="small muted" style="margin:0 0 8px">Aus deinem letzten Lohnmonat, nur auf dem Gerät berechnet.</p>
    ${T.slice(0, max||8).map(x=>`<div class="tip ${x.lvl}"><span class="tipi" aria-hidden="true">${ic[x.lvl]||'•'}</span><div class="sp"><b>${esc(x.t)}</b><p class="small" style="margin:2px 0 6px">${esc(x.d)}</p>
      <div class="row" style="gap:6px;flex-wrap:wrap">${x.b.map(([l,a,v])=>a==='go' ? `<button class="btn sm" data-go="${esc(v)}">${l}</button>` : `<button class="btn sm" data-act="${a}" data-v="${esc(v)}">${l}</button>`).join('')}<button class="btn sm ghost" data-act="tipno" data-k="${esc(x.key)}" data-id="${x.id}">Erledigt</button></div></div></div>`).join('')}</div>`;
}
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act="tiplist"],[data-act="tipno"],[data-act="tiplm"]'); if(!a || !D) return; e.stopPropagation(); e.preventDefault();
  const act = a.dataset.act;
  if(act==='tipno'){ (D.settings.tipNo ??= {})[a.dataset.k+'|'+a.dataset.id] = 1; save(); render(); return; }
  if(act==='tiplm'){ lmDialogOpen(); return; }
  if(act==='tiplist'){ const P = tipPeriods()[0]; S.bp = {m:'m', off:P.k}; S.bf = BF_DEF(); bfSave(); bpSave(); S.view = 'bericht'; S.brSeg = 'ea'; render(); setTimeout(()=>brListDialog(a.dataset.v, 0), 60); }
}, true);
// einblenden: Berater › Übersicht oben, Analyse › Bericht (Einnahmen & Ausgaben) unten
render = (prev => function(){ prev.apply(this, arguments);
  try{ if(!D || S.locked) return; const main = $('#main'); if(!main || main.querySelector('.tipcard')) return;
    if(S.view==='coach'){ const c = tipCard(8); if(c){ const t = main.querySelector(':scope > .hubtabs'); t ? t.insertAdjacentHTML('afterend', c) : main.insertAdjacentHTML('afterbegin', c); } }
    else if(S.view==='bericht' && (S.brSeg||'ea')==='ea' && !bfCount()){ const c = tipCard(4); const m = main.querySelector('.brmain'); if(c && m) m.insertAdjacentHTML('beforeend', c); }
  }catch(e){ console.error(e); } })(render);
