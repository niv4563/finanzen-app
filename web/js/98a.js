/* =====================================================================
   98a. FLÜSSIGER UND EINHEITLICHER (1.72.0)
   • Abstimmung: Kategorien ohne Budget im Monat (CHF 0) sind keine Abweichung mehr –
     damit sagen die Prüfzeile im Geldfluss und die Abstimmung dasselbe.
   • Geldfluss: Abstimmung kompakt (Details aufklappbar), «Ausgleich nötig» und
     «Optimieren» stehen unter dem Plan – der Plan ist sofort sichtbar.
   • Budget › Planen: Ein Betrag direkt im Feld gilt für den gezeigten Monat;
     danach fragt eine Meldung, ob er auch für alle folgenden Monate gelten soll.
   • Überall gleich vorgewählt: «nur dieser Monat».
   ===================================================================== */

/* ---------- Abstimmung: CHF 0 ist keine Lücke ---------- */
flCoverage = (prev => function(ym){ const R = prev(ym);
  try{ const z = R.miss.filter(m=>m.k==='cat' && !(Math.abs(+m.v||0) > 0.5)); if(z.length){ R.miss = R.miss.filter(m=>!z.includes(m)); } }catch(e){}
  return R; })(flCoverage);

/* ---------- Meldung mit Knopf ---------- */
function toastAct(msg, label, fn, ms = 8000){
  let el = $('#toasta'); if(!el){ el = document.createElement('div'); el.id = 'toasta'; el.setAttribute('role','status'); document.body.appendChild(el); }
  el.innerHTML = `<span>${esc(msg)}</span><button type="button" class="btn sm">${esc(label)}</button><button type="button" class="ibtn" aria-label="Schliessen">✕</button>`;
  const [b, x] = el.querySelectorAll('button'); el.classList.add('on'); clearTimeout(el._t);
  const off = () => el.classList.remove('on'); el._t = setTimeout(off, ms);
  b.onclick = () => { off(); try{ fn(); }catch(e){} }; x.onclick = off;
}

/* ---------- Planen: Feld ändern → «auch für alle folgenden Monate?» ---------- */
window.addEventListener('change', e=>{
  const el = e.target, c = el?.dataset?.cell, ym = el?.dataset?.ym; if(!c || !ym || !D) return;
  const v = parseNum(el.value||'0'); if(isNaN(v) || v<0) return;
  const name = c==='_inc' || c==='_lohn' ? 'Lohn' : c.startsWith('_is:') ? ((D.incSide||[]).find(x=>x.id===c.slice(4))?.name || 'Nebeneinkommen') : catName(c);
  setTimeout(()=>{
    const ms = mgTargets('fwd', ym).filter(m=>m>ym); if(!ms.length) return;
    toastAct(`${name}: CHF ${chf0(v)} gilt für ${ymLabel(ym)}.`, `Auch ab ${ymLabel(ymAdd(ym,1))} für alle folgenden`, ()=>{
      for(const m of ms){
        if(c==='_lohn') setLohn(m, v);
        else if(c.startsWith('_is:')){ const s = (D.incSide||[]).find(x=>x.id===c.slice(4)); if(s) setSide(s, m, v); }
        else if(c==='_inc') D.income[m] = v;
        else { (D.plan[c] ??= {}); if(v) D.plan[c][m] = v; else delete D.plan[c][m]; } }
      save(); render(); toastMsg(`${name}: CHF ${chf0(v)} ab ${ymLabel(ym)} für alle folgenden Monate`); });
  }, 30);
}, true);

/* ---------- Geldfluss: Plan zuerst ---------- */
render = (prev => function(){ const r = prev.apply(this, arguments);
  try{ if(D && !S.locked && S.view==='geldfluss'){
      const m = $('#main'), flc = $('#flc');
      if(m && flc){ const after = [...m.querySelectorAll(':scope > .flissues, :scope > .flopt')]; let at = flc; for(const x of after){ at.insertAdjacentElement('afterend', x); at = x; } }
      const sc = $('#synccard');
      if(sc && !sc.classList.contains('ok') && !sc.querySelector('.syncmore')){
        const rows = [...sc.querySelectorAll(':scope > .syncrow, :scope > p.small.muted, :scope > .syncnums')];
        if(rows.length){ const d = document.createElement('details'); d.className = 'syncmore'; d.innerHTML = '<summary class="small">Was weicht ab?</summary>'; rows.forEach(x=>d.appendChild(x)); sc.appendChild(d); }
      } } }catch(e){}
  return r; })(render);

/* ---------- «1 Wunsch» statt «1 Wünsche» ---------- */
flNodeHtml = (prev => function(){ const h = prev.apply(this, arguments); return typeof h==='string' ? h.replace(/(^|[^\d])1 Wünsche ·/g, '$11 Wunsch ·') : h; })(flNodeHtml);

/* ---------- Draht: vorgewählt «nur dieser Monat» ---------- */
flEdgeDialog = (prev => function(){ const r = prev.apply(this, arguments); const o = document.querySelector('#dlgbody input[name=mgsc][value="one"]'); if(o) o.checked = true; return r; })(flEdgeDialog);
