/* =====================================================================
   VERSION 1.58.1 – BERATER: PUNKTE ABARBEITEN
   1. Empfehlungen lassen sich als «Erledigt» abhaken oder auf später legen.
      Erledigtes verschwindet aus der Liste (unten «Erledigt» zum Zurückholen).
      Trifft ein erledigter Punkt nach 60 Tagen immer noch zu, kommt er wieder.
   2. Wochenaufgaben: Abhaken und wieder Aufheben bleibt auch über den Geräte-
      Abgleich erhalten (vorher kam ein aufgehobener Haken vom anderen Gerät zurück).
      Die ganze Zeile ist antippbar; «Öffnen ›» führt zur passenden Seite.
   ===================================================================== */
var recKey = r => String(r.t||'').toLowerCase().replace(/chf\s*[−\-]?[\d'’.,]+|[\d'’.,]+\s*%|[\d'’.,]+/g, '#').replace(/\s+/g, ' ').trim();
var recSt = () => (D.settings.recSt ??= {});   // key → {s:'done'|'later', d:Datum, t:Titel}
function recHidden(r){
  const x = recSt()[recKey(r)]; if(!x) return false;
  const days = x.s === 'later' ? 14 : 60;
  return dAdd(x.d, days) > todayIso();
}
recommendations = (prev => function(){
  const R = prev.apply(this, arguments);
  RECS = (R||[]).filter(r => !recHidden(r));
  return RECS;
})(recommendations);

recItem = (prev => function(r, i){
  const h = prev.apply(this, arguments);
  const k = esc(recKey(r));
  return h.replace(/<\/div><\/div><\/details>$/, `</div><div class="row recdone"><button class="btn sm" data-act="recdone" data-k="${k}" data-i="${i}">✓ Erledigt</button><button class="btn sm ghost" data-act="reclater" data-k="${k}" data-i="${i}">Später (2 Wochen)</button></div></div></details>`);
})(recItem);

vEmpf = (prev => function(){
  const h = prev.apply(this, arguments), st = recSt();
  const L = Object.entries(st).filter(([k,x]) => dAdd(x.d, x.s==='later'?14:60) > todayIso()).sort((a,b)=>b[1].d.localeCompare(a[1].d));
  if(!L.length) return h;
  const box = `<div class="card mt recdonebox"><details><summary><b>Erledigt und zurückgestellt</b> <span class="muted small">${L.length}</span></summary>
    ${L.map(([k,x])=>`<div class="li"><span class="sp">${x.s==='done'?'<span class="in">✓</span>':'<span class="muted">⏸</span>'} ${esc(x.t||k)}<br><span class="small muted">${x.s==='done'?'erledigt':'zurückgestellt'} am ${dShort(x.d)}${x.s==='later'?' · kommt am '+dShort(dAdd(x.d,14))+' wieder':''}</span></span>
      <button class="btn sm ghost" data-act="recundo" data-k="${esc(k)}">Wieder anzeigen</button></div>`).join('')}</details></div>`;
  const at = h.indexOf('<div class="card mt"><h3>So solltest du');
  return at >= 0 ? h.slice(0, at) + box + h.slice(at) : h + box;
})(vEmpf);

/* ---------- Wochenaufgaben: Abhaken mit Zeitstempel ---------- */
var cDoneTs = () => { const c = coachCfg(); c.doneTs ??= {}; c.undoneTs ??= {}; return c; };
function cTaskToggle(id){
  const c = cDoneTs(), key = cWeek()+'|'+id, now = Date.now();
  if(c.done[key]){ delete c.done[key]; c.undoneTs[key] = now; delete c.doneTs[key]; }
  else { c.done[key] = 1; c.doneTs[key] = now; delete c.undoneTs[key]; }
  const min = dAdd(cWeek(), -400);
  for(const m of [c.done, c.doneTs, c.undoneTs]) for(const k of Object.keys(m)) if(k < min) delete m[k];
}

// Läuft vor allen anderen Klick-Behandlungen (window, Capture-Phase)
window.addEventListener('click', e => {
  if(!D || S.locked || e.target.closest('.ctopen')) return;
  const b = e.target.closest('[data-act="ctask"],[data-act="recdone"],[data-act="reclater"],[data-act="recundo"]'); if(!b) return;
  const k = b.dataset.act;
  if(k === 'ctask'){
    if(b.disabled) return;
    e.stopPropagation(); e.preventDefault();
    cTaskToggle(b.dataset.id); _kc = {}; save(); render();
    toastMsg(coachCfg().done[cWeek()+'|'+b.dataset.id] ? 'Abgehakt' : 'Haken entfernt');
    return;
  }
  e.stopPropagation(); e.preventDefault();
  const st = recSt();
  if(k === 'recundo'){ delete st[b.dataset.k]; save(); render(); toastMsg('Wieder in der Liste'); return; }
  const r = (RECS||[])[+b.dataset.i];
  st[b.dataset.k] = {s: k==='recdone' ? 'done' : 'later', d: todayIso(), t: r ? r.t : ''};
  save(); render(); toastMsg(k==='recdone' ? 'Erledigt – gut gemacht' : 'In 2 Wochen wieder in der Liste');
}, true);

// Abgleich: neuere Aktion gewinnt (abhaken oder Haken entfernen), Empfehlungen ebenso
mergeData = (prev => function(local, remote){
  const out = prev(local, remote);
  try{
    const lc = local?.coach || {}, rc = remote?.coach || {};
    if(out && (lc.doneTs || rc.doneTs || lc.undoneTs || rc.undoneTs)){
      const done = {...(rc.done||{}), ...(lc.done||{})}, dTs = {...(rc.doneTs||{})}, uTs = {...(rc.undoneTs||{})};
      for(const [k,v] of Object.entries(lc.doneTs||{})) dTs[k] = Math.max(dTs[k]||0, v);
      for(const [k,v] of Object.entries(lc.undoneTs||{})) uTs[k] = Math.max(uTs[k]||0, v);
      for(const k of Object.keys(uTs)) if((uTs[k]||0) > (dTs[k]||0)) delete done[k]; else delete uTs[k];
      out.coach ??= {}; out.coach.done = done; out.coach.doneTs = dTs; out.coach.undoneTs = uTs;
    }
    const ls = local?.settings?.recSt, rs = remote?.settings?.recSt;
    if(out?.settings && (ls || rs)){
      const m = {...(rs||{})};
      for(const [k,x] of Object.entries(ls||{})) if(!m[k] || (x.d||'') >= (m[k].d||'')) m[k] = x;
      out.settings.recSt = m;
    }
  }catch(e){}
  return out;
})(mergeData);

// Ganze Aufgabenzeile antippbar machen: Text = abhaken, eigener Knopf «Öffnen ›» für die Seite
cTasksCard = (prev => function(){
  const t = document.createElement('template'); t.innerHTML = prev.apply(this, arguments);
  for(const row of t.content.querySelectorAll('.ctask')){
    const btn = row.querySelector('.ccheck'), sp = row.querySelector('.sp'); if(!btn || !sp) continue;
    const go = sp.getAttribute('data-go'), act = sp.getAttribute('data-act');
    if(go || (act && act !== 'ctask')){
      const o = document.createElement('button'); o.className = 'btn sm ctopen'; o.textContent = 'Öffnen ›';
      if(go) o.setAttribute('data-go', go); else o.setAttribute('data-act', act);
      sp.removeAttribute('data-go'); sp.removeAttribute('data-act'); sp.appendChild(o);
    }
    if(!btn.disabled){ sp.setAttribute('data-act', 'ctask'); sp.setAttribute('data-id', btn.getAttribute('data-id')); sp.classList.add('ctap'); }
  }
  const d = document.createElement('div'); d.appendChild(t.content); return d.innerHTML;
})(cTasksCard);
