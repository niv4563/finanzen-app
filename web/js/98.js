/* =====================================================================
   98. MONATE GEZIELT ÄNDERN (1.71.0)
   • Draht im Geldfluss: Betrag «nur für einen Monat», «ab einem Monat für alle
     folgenden» oder «ganzes Jahr» – frühere Monate bleiben, wie sie waren.
     Gilt für jede Art (fest, Rest, deckt, Budget, Prozent).
   • «Einzelne Monate»: alle 12 Monate eines Jahres direkt eintragen, für jede Art,
     mit ‹ Jahr › zum Blättern. Leer = automatisch.
   • Kästchen-Dialog «Budget ändern» und «Budget › Planen»: gleiche Auswahl und
     ebenfalls einzelne Monate.
   ===================================================================== */

/* ---------- Stufen «ab Monat» für Drähte ---------- */
// e.as = { 'YYYY-MM': Betrag | null }  – ab diesem Monat gilt der Betrag (null = wieder automatisch)
var flStep = (e, ym) => { const a = e?.as; if(!a) return undefined; let k = null; for(const m in a) if(m<=ym && (k===null || m>k)) k = m; return k===null ? undefined : a[k]; };
flAmt = (e, ym) => { const s = flStep(e, ym); return Math.max(0, +(e.m?.[ym] ?? (s ?? e.a)) || 0); };
flPlan = (prev => function(ym){
  const tmp = [];
  for(const e of (D?.flow?.edges || [])){ if(!e.as || e.m?.[ym]!=null) continue; const s = flStep(e, ym); if(s==null) continue; (e.m ??= {})[ym] = s; tmp.push(e); }
  try{ return prev(ym); } finally { for(const e of tmp) delete e.m[ym]; }
})(flPlan);
var mgDropAs = (e, from) => { if(!e?.as) return; for(const k of Object.keys(e.as)) if(k>=from) delete e.as[k]; if(!Object.keys(e.as).length) delete e.as; };
// Andere Stellen, die «ab Monat» setzen, sollen nicht von alten Stufen überdeckt werden
window.addEventListener('change', ev=>{ const i = ev.target.closest?.('[data-fltr]'); if(!i || !D || i.dataset.fltr==='kk') return;
  if(S.fltrFwd!==false){ const e = flE(i.dataset.fltr); if(e) mgDropAs(e, flPlanYm()); } }, true);
if(typeof flTrQuick==='function') flTrQuick = (prev => function(e){ prev(e); const d = $('#dlg'), old = d.onclick;
  d.onclick = ev => { if(ev.target.closest?.('[data-dlg="ok"]') && $('#ftqf')?.checked) mgDropAs(e, TODAY); return old.call(d, ev); }; })(flTrQuick);
aiApply = (prev => function(){ const r = prev.apply(this, arguments); try{ const g = geltAb(); (D.flow?.edges||[]).forEach(e=>mgDropAs(e, g)); flSync(); save(); }catch(x){} return r; })(aiApply);

/* ---------- Bausteine ---------- */
var mgFmt = v => Math.abs(v - Math.round(v)) < 0.005 ? fmt0.format(Math.round(v)) : chf(v);
function mgLast(){ let l = ymAdd(TODAY, 23); const up = m => { if(m && m>l) l = m; };
  up(C?.months?.at?.(-1)); for(const c in (D.plan||{})) for(const m in D.plan[c]) up(m); for(const m in (D.income||{})) up(m); return l; }
function mgTargets(sc, F){
  if(sc==='one') return [F];
  if(sc==='year') return Array.from({length:12}, (_,i)=>F.slice(0,4)+'-'+String(i+1).padStart(2,'0'));
  const o = [], L = mgLast(); for(let m = F; m<=L; m = ymAdd(m,1)) o.push(m); return o;
}
var mgOpts = sel => { const o = []; for(let i=-12; i<=36; i++){ const m = ymAdd(TODAY, i); o.push(`<option value="${m}" ${m===sel?'selected':''}>${ymLabel(m)}</option>`); } return o.join(''); };
var mgScopeHtml = (F, def) => `<div class="mgsc"><label class="f mgm">Monat<select data-mgf>${mgOpts(F)}</select></label>
  <fieldset class="scope"><legend class="small muted">Gilt für</legend>
    <label><input type="radio" name="mgsc" value="one" ${def==='one'?'checked':''}> nur <span data-mgl>${ymLabel(F)}</span></label>
    <label><input type="radio" name="mgsc" value="fwd" ${def==='fwd'?'checked':''}> ab <span data-mgl>${ymLabel(F)}</span> und alle folgenden Monate</label>
    <label><input type="radio" name="mgsc" value="year" ${def==='year'?'checked':''}> ganzes Jahr <span data-mgy>${F.slice(0,4)}</span></label></fieldset>
  <p class="small muted mghint">Frühere Monate bleiben, wie sie sind.</p></div>`;
// Raster «Einzelne Monate» – G = {key, y, pend:{}, val(m)->Text, ph(m)->Text}
function mgGridHtml(G){ const y = G.y;
  return `<div class="mggrid" data-mgg="${G.key}"><div class="row mgyr"><b class="small sp">Einzelne Monate ${y}</b><button type="button" class="btn sm ghost" data-mgy="-1" aria-label="Jahr zurück">‹</button><button type="button" class="btn sm ghost" data-mgy="1" aria-label="Jahr vor">›</button></div>
    <div class="flmg">${MS.map((n,i)=>{ const m = y+'-'+String(i+1).padStart(2,'0'), v = G.pend[m] ?? G.val(m);
      return `<label class="${m===TODAY?'mgnow':''}"><span>${n} ’${y.slice(2)}</span><input data-mgc="${G.key}" data-m="${m}" inputmode="decimal" value="${esc(v)}" placeholder="${esc(G.ph(m))}"></label>`; }).join('')}</div>
    <p class="small muted" style="margin:2px 0 0">Gilt nur für den jeweiligen Monat. Leer = ${G.empty||'automatisch'}.</p></div>`; }
function mgWire(G){ // Eingaben merken, Jahr blättern
  const box = () => document.querySelector(`#dlgbody [data-mgg="${G.key}"]`);
  const bind = () => { const b = box(); if(!b) return;
    b.querySelectorAll('[data-mgc]').forEach(i=>i.addEventListener('input', ()=>{ G.pend[i.dataset.m] = i.value; G.dirty[i.dataset.m] = 1; }));
    b.querySelectorAll('[data-mgy]').forEach(x=>x.addEventListener('click', ev=>{ ev.preventDefault(); ev.stopPropagation(); G.y = String(+G.y + +x.dataset.mgy); b.outerHTML = mgGridHtml(G); bind(); })); };
  G.dirty ??= {}; bind();
}
function mgCheck(vals){ for(const [i, s] of vals){ if(s.trim()==='') continue; const v = parseNum(s); if(!isFinite(v) || v<0){ if(i) i.style.borderColor = 'var(--bad)'; return false; } } return true; }
function mgScopeWire(onMonth){ const s = document.querySelector('#dlgbody [data-mgf]'); if(!s) return;
  s.addEventListener('change', ()=>{ const F = s.value; document.querySelectorAll('#dlgbody [data-mgl]').forEach(x=>x.textContent = ymLabel(F)); document.querySelectorAll('#dlgbody span[data-mgy]').forEach(x=>x.textContent = F.slice(0,4)); onMonth?.(F); }); }
var mgSc = () => document.querySelector('#dlgbody input[name=mgsc]:checked')?.value || 'one';
var mgF = () => document.querySelector('#dlgbody [data-mgf]')?.value || TODAY;

/* ---------- Draht-Dialog ---------- */
flEdgeDialog = (prev => function(eid, ymx){
  prev(eid, ymx); const e = flE(eid), sel = $('#flmode'), fix = $('#flfix'); if(!e || !sel || !fix) return;
  const F0 = ymx || flYm();
  $('#flmd')?.remove(); fix.hidden = true;
  const noOwn = (m, fn) => { const x = e.m?.[m]; if(x!=null) delete e.m[m]; try{ return fn(); } finally { if(x!=null) e.m[m] = x; } };
  const cur = m => flPlan(m).E[e.id] || 0;
  const autoAll = m => { const as = e.as; delete e.as; try{ return noOwn(m, ()=>cur(m)); } finally { if(as) e.as = as; } };
  const isFix = () => sel.value==='fix';
  const own = m => e.m?.[m]!=null || flStep(e, m)!=null;
  const mainVal = m => isFix() || own(m) ? chf(cur(m)) : '';
  let init = mainVal(F0), dirty = false;
  const lab = () => isFix() ? 'Betrag pro Monat (CHF)' : 'Eigener Betrag pro Monat (CHF) – leer = automatisch';
  fix.insertAdjacentHTML('afterend', `<div id="mgbox"><label class="f"><span id="mgal">${lab()}</span><input id="mga" inputmode="decimal" value="${init}" placeholder="${chf0(autoAll(F0))}"></label>
    ${mgScopeHtml(F0, 'fwd')}</div>`);
  const G = {key:'e', y:F0.slice(0,4), pend:{}, val:m => e.m?.[m]!=null ? mgFmt(+e.m[m]) : '', ph:m => chf0(noOwn(m, ()=>cur(m))), empty:'wie oben bzw. automatisch'};
  $('#mgbox').insertAdjacentHTML('afterend', `<details id="mgdet" open><summary class="small">Einzelne Monate</summary>${mgGridHtml(G)}</details>`);
  mgWire(G);
  const a = $('#mga'); a.addEventListener('input', ()=>{ dirty = true; });
  mgScopeWire(F => { if(!dirty){ init = mainVal(F); a.value = init; } a.placeholder = chf0(autoAll(F)); G.y = F.slice(0,4); const b = document.querySelector('#dlgbody [data-mgg="e"]'); if(b){ b.outerHTML = mgGridHtml(G); mgWire(G); } });
  const pv = () => { const p = $('#flpct'); if(p) p.hidden = sel.value!=='pct'; fix.hidden = true; $('#mgal').textContent = lab(); if(!dirty){ init = mainVal(mgF()); a.value = init; } };
  sel.onchange = pv;
  const d = $('#dlg'), old = d.onclick;
  d.onclick = ev => { if(!ev.target.closest?.('[data-dlg="ok"]')) return old.call(d, ev);
    const gs = Object.keys(G.dirty).map(m=>[document.querySelector(`#dlgbody [data-mgc="e"][data-m="${m}"]`), G.pend[m]]);
    if(!mgCheck([[a, a.value], ...gs])) return;
    const F = mgF(), sc = mgSc(), s = a.value.trim();
    if(dirty && s!==init){ const v = s==='' ? null : r2(parseNum(s));
      if(sc==='fwd'){ (e.as ??= {}); for(const k of Object.keys(e.as)) if(k>F) delete e.as[k]; e.as[F] = v;
        if(e.m) for(const k of Object.keys(e.m)) if(k>=F) delete e.m[k]; }
      else for(const m of mgTargets(sc, F)){ if(v==null){ if(e.m) delete e.m[m]; } else (e.m ??= {})[m] = v; } }
    for(const m of Object.keys(G.dirty)){ const t = (G.pend[m]||'').trim(); if(t==='') { if(e.m) delete e.m[m]; } else (e.m ??= {})[m] = r2(parseNum(t)); }
    const fa = $('#fla'); if(fa) fa.value = e.a!=null ? String(e.a) : '0';
    return old.call(d, ev); };
})(flEdgeDialog);

/* ---------- Kästchen: «Budget ändern» ---------- */
budEditInject = function(cats){
  cats = cats.filter(c=>D.cats.some(x=>x.id===c)); if(!cats.length) return;
  const F0 = flYm() < TODAY ? TODAY : flYm(), cur = (c, m) => +(D.plan?.[c]?.[m]) || 0;
  const Gs = cats.length<=3 ? cats.map(c=>({key:'b'+c, c, y:F0.slice(0,4), pend:{}, val:m => cur(c,m) ? mgFmt(cur(c,m)) : '', ph:()=> '0', empty:'kein Budget'})) : [];
  const html = `<details class="flbud" open><summary class="small"><b>Budget ändern</b></summary>
    ${mgScopeHtml(F0, 'one')}
    ${cats.map(c=>`<label class="flbr"><span>${esc(catName(c))}</span><input data-flb="${c}" inputmode="decimal" value="${cur(c,F0)?chf(cur(c,F0)):''}" placeholder="0"></label>`).join('')}
    ${Gs.map(G=>`${cats.length>1?`<p class="small" style="margin:8px 0 0"><b>${esc(catName(G.c))}</b></p>`:''}${mgGridHtml(G)}`).join('')}
    <p class="small muted" style="margin:4px 0 0">Gleich wie unter «Budget › Planen». Muss-Kategorien nur bewusst ändern.</p></details>`;
  const ac = document.querySelector('#dlgbody .acts'); if(!ac) return; ac.insertAdjacentHTML('beforebegin', html);
  Gs.forEach(mgWire);
  const dirty = {}, init = {};
  document.querySelectorAll('#dlgbody [data-flb]').forEach(i=>{ init[i.dataset.flb] = i.value; i.addEventListener('input', ()=>dirty[i.dataset.flb] = 1); });
  mgScopeWire(F => { document.querySelectorAll('#dlgbody [data-flb]').forEach(i=>{ const c = i.dataset.flb; if(!dirty[c]){ i.value = cur(c,F) ? chf(cur(c,F)) : ''; init[c] = i.value; } });
    Gs.forEach(G=>{ G.y = F.slice(0,4); const b = document.querySelector(`#dlgbody [data-mgg="${G.key}"]`); if(b){ b.outerHTML = mgGridHtml(G); mgWire(G); } }); });
  const dl = $('#dlg'), old = dl.onclick;
  dl.onclick = ev => { if(ev.target.closest('[data-dlg="ok"]')){
      const ins = [...document.querySelectorAll('#dlgbody [data-flb]')], gv = Gs.flatMap(G=>Object.keys(G.dirty).map(m=>[document.querySelector(`#dlgbody [data-mgc="${G.key}"][data-m="${m}"]`), G.pend[m]]));
      if(!mgCheck([...ins.map(i=>[i, i.value]), ...gv])) return;
      const F = mgF(), ms = mgTargets(mgSc(), F);
      for(const i of ins){ const c = i.dataset.flb; if(!dirty[c] || i.value===init[c]) continue; const s = i.value.trim(), v = s==='' ? 0 : r2(parseNum(s));
        for(const m of ms){ (D.plan[c] ??= {}); if(v) D.plan[c][m] = v; else delete D.plan[c][m]; } }
      for(const G of Gs) for(const m of Object.keys(G.dirty)){ const t = (G.pend[m]||'').trim(), v = t==='' ? 0 : r2(parseNum(t)); (D.plan[G.c] ??= {}); if(v) D.plan[G.c][m] = v; else delete D.plan[G.c][m]; } }
    return old ? old.call(dl, ev) : undefined; };
};

/* ---------- Budget › Planen: einzelne Monate im Kategorie-Dialog ---------- */
budgetDialog = (prev => function(c, ym){ const r = prev.apply(this, arguments);
  try{ const isInc = c==='_inc', get = m => isInc ? (+D.income?.[m]||0) : (+D.plan?.[c]?.[m]||0);
    const ac = document.querySelector('#dlgbody .acts'); if(!ac || document.querySelector('#dlgbody [data-mgg]')) return r;
    const G = {key:'p', y:(ym||TODAY).slice(0,4), pend:{}, val:m => get(m) ? mgFmt(get(m)) : '', ph:()=>'0', empty:'kein Betrag'};
    (document.querySelector('#dlgbody .schlink') || ac).insertAdjacentHTML('beforebegin', `<details class="mgdet"><summary class="small">Einzelne Monate eintragen</summary>${mgGridHtml(G)}</details>`);
    mgWire(G);
    const d = $('#dlg'), old = d.onclick;
    d.onclick = ev => { const ok = ev.target.closest?.('[data-dlg="ok"]'), ks = Object.keys(G.dirty);
      if(ok && ks.length){ if(!mgCheck(ks.map(m=>[document.querySelector(`#dlgbody [data-mgc="p"][data-m="${m}"]`), G.pend[m]]))) return;
        const bv = $('#bv'); if(bv && (bv.value.trim()==='' || isNaN(parseNum(bv.value)))) bv.value = String(get(ym));
        const res = old.call(d, ev);
        for(const m of ks){ const t = (G.pend[m]||'').trim(), v = t==='' ? 0 : r2(parseNum(t));
          if(isInc){ if(v) D.income[m] = v; else delete D.income[m]; } else { (D.plan[c] ??= {}); if(v) D.plan[c][m] = v; else delete D.plan[c][m]; } }
        if(!d.open){ save(); render(); } return res; }
      return old.call(d, ev); };
  }catch(x){}
  return r; })(budgetDialog);
