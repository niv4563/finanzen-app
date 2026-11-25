/* =====================================================================
   75. BUDGET FESTGESCHRIEBEN AB NOVEMBER 2026 · EINGEHALTEN JA/NEIN PRO KATEGORIE
   • Ab November 2026 ist das Budget so, wie es geplant wurde. Effektive Kosten ändern es nicht:
     – Einkommen im Budget = geplantes Einkommen (nicht das erhaltene)
     – Jahreskosten und Rückstellung sind pro Monat eingefroren (neue oder geänderte Jahreskosten
       kommen erst ins Budget, wenn du es bewusst übernimmst)
     – keine Aufforderung mehr «Effektiv weicht ab – Betrag prüfen»
     Von Hand ändern bleibt möglich.
   • Pro Kategorie und Monat: Budget eingehalten? Automatisch nach Betrag – oder du entscheidest selbst.
   ===================================================================== */
var FRZ_FROM = '2026-11';
var frzFrom = () => D?.bfrz?.from || FRZ_FROM;
var frzOn = ym => !!ym && ym >= frzFrom();
var ycSnap = cats => { const o = {}; for(const k in (cats||{})){ const v = Math.round((cats[k]||0)*100)/100; if(v) o[k] = v; } return o; };
var ycTot = o => Object.values(o||{}).reduce((a,b)=>a+(+b||0),0);

calc = (prev => function(){
  const res = prev.apply(this, arguments);
  try{ const R = res || C;
    if(D && R?.m){ D.bfrz ??= {from:FRZ_FROM, yc:{}}; const F = D.bfrz; F.yc ??= {}; let neu = false;
      for(const ym of (R.months || Object.keys(R.m))){ if(ym < F.from) continue; const m = R.m[ym]; if(!m) continue;
        if(!F.yc[ym]){ F.yc[ym] = ycSnap(m.yc?.cats); neu = true; }
        const snap = F.yc[ym]; m.ycLive = m.yc?.cats || {}; m.yc = {...(m.yc||{}), cats:{...snap}};
        for(const c of D.cats) m.plan[c.id] = r2((D.plan[c.id]?.[ym]||0) + (snap[c.id]||0));
        m.incB = m.incPlan || 0; }
      if(neu && !S._frzSave){ S._frzSave = true; setTimeout(()=>{ S._frzSave = false; try{ save(); }catch(e){} }, 400); } } }catch(e){}
  return res;
})(calc);

/* ---- Eingehalten ja/nein ---- */
var bokIsSpar = c => c.group==='spar';
var bokAuto = (c, ym) => { const pl = C.m[ym]?.plan?.[c.id]||0, ist = C.ist[c.id]?.[ym];
  if(bokIsSpar(c)) return ist==null ? null : ist >= pl - 0.5;
  if(ist==null) return ym < TODAY ? true : null; return ist <= pl + 0.5; };
var bokOf = (c, ym) => { const u = D.bok?.[ym]?.[c.id]; return u==null ? {v:bokAuto(c, ym), user:false} : {v:!!u, user:true}; };
var bokRel = (c, ym) => !!C.m[ym] && ym <= TODAY && c.id!=='rueck' && !c.archived && ((C.m[ym].plan?.[c.id]||0) > 0 || C.ist[c.id]?.[ym]!=null)
  && (ym < TODAY || C.ist[c.id]?.[ym]!=null || D.bok?.[ym]?.[c.id]!=null);   // laufender Monat: erst wenn etwas gebucht ist
function bokChip(c, ym){
  if(!bokRel(c, ym)) return ''; const s = bokOf(c, ym), run = ym===TODAY && !s.user;
  const cls = s.v===true ? 'ok' : s.v===false ? 'no' : 'open';
  const t = s.v===true ? (run ? 'Bisher eingehalten' : 'Eingehalten') : s.v===false ? (run ? 'Bisher überschritten' : 'Nicht eingehalten') : 'Offen';
  return `<button class="bokc ${cls}" data-act="bok" data-c="${c.id}" data-ym="${ym}" title="Antippen: selbst entscheiden">${t}<em>${s.user ? 'von dir' : 'automatisch'}</em></button>`;
}
function bokCount(ym){ const r = {yes:0, no:0, open:0, n:0, noList:[]};
  for(const c of D.cats){ if(!bokRel(c, ym)) continue; const s = bokOf(c, ym); r.n++;
    if(s.v===true) r.yes++; else if(s.v===false){ r.no++; r.noList.push(c); } else r.open++; }
  return r; }
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act="bok"]'); if(!a || !D) return; e.stopPropagation(); e.preventDefault();
  const c = D.cats.find(x=>x.id===a.dataset.c), ym = a.dataset.ym; if(!c) return;
  const pl = C.m[ym]?.plan?.[c.id]||0, ist = C.ist[c.id]?.[ym], au = bokAuto(c, ym), cur = D.bok?.[ym]?.[c.id];
  const auTxt = au===true ? 'eingehalten' : au===false ? (bokIsSpar(c) ? 'weniger gespart' : 'überschritten') : 'noch offen';
  const sel = v => (cur==null ? v==='auto' : (v==='yes') === !!cur && v!=='auto') ? ' pri' : '';
  dialog(`<h3>${esc(c.name)}</h3>
    <p class="small muted" style="margin-top:0">${ymLabel(ym)} · Budget <b class="num">CHF ${chf0(pl)}</b> · ${bokIsSpar(c)?'gespart':'ausgegeben'} <b class="num">CHF ${chf0(ist||0)}</b></p>
    <p class="small" style="margin:0 0 10px">Wurde das Budget eingehalten? Das Budget selbst bleibt so, wie du es geplant hast.</p>
    <div class="bokpick">
      <button class="btn${sel('yes')}" data-dlg="yes">Eingehalten</button>
      <button class="btn${sel('no')}" data-dlg="no">Nicht eingehalten</button>
      <button class="btn${sel('auto')}" data-dlg="auto">Automatisch nach Betrag <span class="small muted">(${auTxt})</span></button></div>
    <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button></div>`,
  k=>{ D.bok ??= {}; const o = (D.bok[ym] ??= {});
    if(k==='yes') o[c.id] = 1; else if(k==='no') o[c.id] = 0; else delete o[c.id];
    if(!Object.keys(o).length) delete D.bok[ym]; });
}, true);

/* ---- Jahreskosten geändert: erst bewusst ins Budget übernehmen ---- */
function frzDiff(){
  const F = D?.bfrz; if(!F?.yc) return null; const start = TODAY > F.from ? TODAY : F.from;
  const ms = (C.months||[]).filter(m=>m>=start && C.m[m]?.ycLive);
  const d = ms.filter(m=>Math.abs(ycTot(C.m[m].ycLive) - ycTot(F.yc[m])) > 1);
  if(!d.length) return null; const m0 = d[0];
  return {m0, n:d.length, bud:ycTot(F.yc[m0]), live:ycTot(C.m[m0].ycLive)};
}
function frzCard(){
  const x = frzDiff(); if(!x) return ''; const nx = ymAdd(TODAY, 1);
  return `<div class="card mt frzcard"><h3 style="margin:0 0 4px">Jahreskosten haben sich geändert</h3>
    <p class="small" style="margin:0 0 10px">Im Budget ${ymLabel(x.m0)}: <b class="num">CHF ${chf0(x.bud)}</b> für Jahreskosten und Rückstellung. Nach den aktuellen Jahreskosten wären es <b class="num">CHF ${chf0(x.live)}</b>${x.n>1?` (${x.n} Monate betroffen)`:''}. Das Budget bleibt, bis du es übernimmst.</p>
    <div class="row" style="gap:6px;flex-wrap:wrap">${x.m0<=TODAY?`<button class="btn sm" data-act="frzsync" data-from="${TODAY}">Ab ${ymLabel(TODAY)} übernehmen</button>`:''}<button class="btn sm" data-act="frzsync" data-from="${x.m0>nx?x.m0:nx}">Ab ${ymLabel(x.m0>nx?x.m0:nx)} übernehmen</button></div></div>`;
}
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act="frzsync"]'); if(!a || !D?.bfrz) return; e.stopPropagation(); e.preventDefault();
  const from = a.dataset.from; let n = 0;
  for(const m of C.months.filter(m=>m>=from && m>=D.bfrz.from)){ const L = C.m[m]?.ycLive; if(!L) continue; D.bfrz.yc[m] = ycSnap(L); n++; }
  save(); render(); toastMsg(`Jahreskosten ab ${ymLabel(from)} ins Budget übernommen`);
}, true);

/* ---- Budgetansichten: geplantes Einkommen, Eingehalten-Markierung ---- */
var withPlanInc = f => function(){
  const sw = []; try{ for(const ym in (C?.m||{})){ const m = C.m[ym]; if(m && frzOn(ym) && m.incB!=null){ sw.push([m, m.inc]); m.inc = m.incB; } }
    return f.apply(this, arguments); } finally { for(const [m,v] of sw) m.inc = v; } };

vBudgetMonat = (prev => function(tabs){
  let h = prev(tabs); const ym = S.ym; if(!C.m[ym] || !D) return h;
  try{
    if(frzOn(ym)){
      h = h.split('<span class="small" style="color:var(--warn)">Effektiv weicht ab – Betrag prüfen</span>').join('');
      h = h.replace('<h3 style="margin:0 0 6px">So verteilt sich dein Einkommen</h3>', `<h3 style="margin:0 0 2px">So verteilt sich dein Einkommen</h3><p class="small muted" style="margin:0 0 8px">Geplantes Budget – bleibt fest, auch wenn effektive Kosten oder Lohn anders ausfallen. Ändern nur von Hand.</p>`);
    }
    if(ym <= TODAY){
      const parts = h.split('<div class="brow2');
      for(let i=1;i<parts.length;i++){ const mm = parts[i].match(/data-c="([^"]+)"/), c = mm && D.cats.find(x=>x.id===mm[1]);
        if(!c) continue; const ch = bokChip(c, ym); if(ch) parts[i] = parts[i].replace('<div class="bist">', '<div class="bist">'+ch); }
      h = parts.join('<div class="brow2');
      const r = bokCount(ym);
      if(r.n){ const card = `<div class="card mt bokcard"><div class="row"><h3 class="sp" style="margin:0">Budget eingehalten?</h3><b class="num">${r.yes} von ${r.n}</b></div>
        <div class="bokbar"><i class="ok" style="width:${r.yes/r.n*100}%"></i><i class="no" style="width:${r.no/r.n*100}%"></i></div>
        <p class="small ${r.no?'':'muted'}" style="margin:8px 0 0">${r.no?`${ym===TODAY?'Bisher überschritten':'Nicht eingehalten'}: ${r.noList.map(c=>esc(c.name)).join(', ')}.`:ym===TODAY?'Bisher hältst du alle Budgets ein.':'Alle Budgets eingehalten.'}${r.open?` ${r.open} noch offen.`:''}</p>
        <p class="small muted" style="margin:4px 0 0">Bei jeder Kategorie die Markierung antippen, um selbst zu entscheiden.</p></div>`;
        const i = h.indexOf('<details class="card mt bsec'); h = i<0 ? h + card : h.slice(0,i) + card + h.slice(i); }
    }
    const fc = frzCard(); if(fc){ const j = h.indexOf('<div class="card mt bflow"'); h = j<0 ? h + fc : h.slice(0,j) + fc + h.slice(j); }
  }catch(e){ console.error(e); }
  return h;
})(vBudgetMonat);
vBudgetMonat = withPlanInc(vBudgetMonat);

vBudgetJahr = (prev => function(tabs){
  let h = prev(tabs); if(!D) return h;
  try{
    h = h.replace(/<td class="num click([^"]*)" data-act="budedit"([^>]*?)data-c="([^"]+)" data-ym="([^"]+)"/g, (all, cls, mid, cid, ym) => {
      const c = D.cats.find(x=>x.id===cid); if(!c) return all; let k = cls.replace(/\bover\b/, '');
      if(bokRel(c, ym)){ const s = bokOf(c, ym); if(s.v===false) k += ' bkno'; else if(s.v===true && ym<TODAY) k += ' bkok'; if(s.user) k += ' bku'; }
      return `<td class="num click${k}" data-act="budedit"${mid}data-c="${cid}" data-ym="${ym}"`; });
    const y = S.year, ms = vis(C.months.filter(m=>m.startsWith(y))), cur = m => m===TODAY ? 'cur' : '';
    if(ms.some(m=>m<=TODAY)){ let ty = 0, tn = 0;
      const tds = ms.map(m=>{ if(m>TODAY) return `<td class="${cur(m)}"></td>`; const r = bokCount(m); ty += r.yes; tn += r.n;
        return `<td class="num ${cur(m)} ${r.no?'neg':'in'}" title="${r.no?'Nicht eingehalten: '+r.noList.map(c=>c.name).join(', ').replace(/"/g,''):'alle eingehalten'}">${r.n?r.yes+'/'+r.n:'–'}</td>`; }).join('');
      const row = `<tr class="ycat bokrow"><td>Budget eingehalten <span class="small muted">Kategorien</span></td>${tds}<td class="num tot">${tn?ty+'/'+tn:''}</td></tr>`;
      const k = h.indexOf('<tr class="yinc ytog yout"'); if(k>=0) h = h.slice(0,k) + row + h.slice(k); }
    const fc = frzCard(); if(fc){ const j = h.indexOf('<div class="card ytable"'); if(j>=0) h = h.slice(0,j) + fc + h.slice(j); }
    if(ms.some(frzOn)) h = h.replace('Muss-Beträge (fix) sind grau.', 'Muss-Beträge (fix) sind grau. Ab November 2026 bleibt das Budget wie geplant – effektive Kosten ändern es nicht. Rot = nicht eingehalten.');
  }catch(e){ console.error(e); }
  return h;
})(vBudgetJahr);
vBudgetJahr = withPlanInc(vBudgetJahr);

// Seite Jahreskosten: Hinweis, wenn das Budget noch die alten Beträge hat
vJahr = (prev => function(){ const h = prev.apply(this, arguments); try{ const fc = frzCard(); if(fc && typeof h==='string') return fc + h; }catch(e){} return h; })(vJahr);

// Finanz-Berater: kein Vorschlag mehr, das Budget an die effektiven Kosten anzupassen
vEmpf = (prev => function(){ const h = prev.apply(this, arguments);
  return typeof h==='string' ? h.replace(/Entweder Ausgaben senken oder Budget realistisch auf ca\. CHF [^ ]+ setzen und anderswo kürzen\./g, 'Ausgaben senken – das Budget bleibt wie geplant.') : h; })(vEmpf);
