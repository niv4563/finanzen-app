/* =====================================================================
   57. VERSION 1.33.0 – EIGENER ZEITRAUM (VON–BIS) FUNKTIONIERT ÜBERALL
   • Analyse: Von und Bis wählen, dann «Übernehmen». Vorher wurde schon beim ersten Datum
     neu gezeichnet – am PC verlor das Feld beim Tippen den Fokus, und ein «Von» nach dem «Bis»
     wurde still verworfen.
   • Buchungen: neu ebenfalls «Zeitraum» mit Von–Bis.
   • Während ein Datumsfeld offen ist, wird die Seite nicht im Hintergrund neu gezeichnet.
   • Der gewählte Zeitraum bleibt gespeichert.
   ===================================================================== */
// eigener Zeitraum: Beschriftung und Blättern um die gleiche Länge
perLabel = (prev => r => r.p === 'c' ? `${dShort(r.from)}${r.from.slice(0,4)!==r.to.slice(0,4)?' '+r.from.slice(0,4):''} – ${dShort(r.to)} ${r.to.slice(0,4)}` : prev(r))(perLabel);
perShift = (prev => (r, dir) => {
  if(r.p !== 'c') return prev(r, dir);
  const fm = r.from.slice(0,7), tm = r.to.slice(0,7);
  if(r.from.endsWith('-01') && r.to === mEnd(tm)){                // ganze Monate: um ganze Monate blättern
    const k = ymDiff(fm, tm) + 1, nf = ymAdd(fm, dir*k), nt = ymAdd(tm, dir*k); return {p:'c', from:nf+'-01', to:mEnd(nt)}; }
  const n = dDiff(r.from, r.to) + 1; return {p:'c', from:dAdd(r.from, dir*n), to:dAdd(r.to, dir*n)};
})(perShift);
apShift = (prev => function(dir){ const a = apGet(); if(a.p === 'c'){ S.ap = perShift(a, dir); return; } return prev(dir); })(apShift);
apPrev = (prev => function(a){ return a.p === 'c' ? perShift(a, -1) : prev(a); })(apPrev);
const okDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d||'') && +d.slice(0,4) >= 1990 && +d.slice(0,4) <= 2100 && !isNaN(new Date(d+'T12:00'));
const custRange = (f, t) => { if(!okDate(f) || !okDate(t)) return null; if(f > t) [f, t] = [t, f]; return {p:'c', from:f, to:t}; };
const custBox = (idF, idT, act, r) => `<div class="pscust"><label>Von<input type="date" id="${idF}" value="${r.from}"></label><span>–</span><label>Bis<input type="date" id="${idT}" value="${r.to}"></label>
  <button class="btn sm pri" type="button" data-act="${act}" style="align-self:flex-end">Übernehmen</button></div>`;

// Analyse: Übernehmen-Knopf statt sofortigem Neuzeichnen
perSheet = (prev => function(){
  return prev().replace(/<div class="pscust">[\s\S]*?<\/div>/, custBox('apfrom', 'apto', 'apcust', apGet()));
})(perSheet);
window.addEventListener('change', e => { if(e.target.id === 'apfrom' || e.target.id === 'apto' || e.target.id === 'bfrom' || e.target.id === 'bto') e.stopPropagation(); }, true);

// Buchungen: Zeitraum-Knopf und Von–Bis
vBuchungen2 = (prev => function(){
  let h = prev(); const r = S.bper || perRange('m');
  h = h.replace(/(<div class="bper"><div class="pspre">[\s\S]*?)(<\/div>)/, (m, a, b) => a + `<button class="${r.p==='c'?'on':''}" data-act="bcustopen">Zeitraum</button>` + b);
  if(r.p === 'c' || S.bCustOpen) h = h.replace(/(<div class="bper">[\s\S]*?<span class="psrange">[\s\S]*?<\/div>)/, m => m + custBox('bfrom', 'bto', 'bcust', r));
  return h;
})(vBuchungen2);

document.addEventListener('click', e => {
  const a = e.target.closest('[data-act="apcust"],[data-act="bcust"],[data-act="bcustopen"]'); if(!a || !D) return;
  e.stopPropagation(); e.preventDefault();
  if(a.dataset.act === 'bcustopen'){ S.bCustOpen = !S.bCustOpen; render(); return; }
  const isB = a.dataset.act === 'bcust', r = custRange($(isB ? '#bfrom' : '#apfrom')?.value, $(isB ? '#bto' : '#apto')?.value);
  if(!r){ toastMsg('Bitte Von und Bis wählen'); return; }
  if(isB){ S.bper = r; S.bCustOpen = false; } else S.ap = r;
  document.activeElement?.blur?.(); render();
}, true);
document.addEventListener('click', e => { if(e.target.closest('[data-act="bper"]')) S.bCustOpen = false; }, true);

// Nicht im Hintergrund neu zeichnen, solange ein Datumsfeld bearbeitet wird
render = (prev => function(){
  const ae = document.activeElement;
  if(ae && ae.type === 'date' && ae.closest('.pscust') && !S._forceRender){ S.needRender = true; return; }
  return prev.apply(this, arguments);
})(render);
document.addEventListener('focusout', e => { if(e.target?.type === 'date' && S.needRender) setTimeout(() => { if(document.activeElement?.type !== 'date' && S.needRender){ S.needRender = false; render(); } }, 400); });

// gewählten Analyse-Zeitraum merken
if(typeof UI_KEEP !== 'undefined' && !UI_KEEP.includes('ap')) UI_KEEP.push('ap');

// Sprache: «kein Backup» → «keine Sicherung» (nicht «kein Sicherung»)
DE_WORDS.unshift([/\bkein Backup\b/g, 'keine Sicherung'], [/\bKein Backup\b/g, 'Keine Sicherung'], [/\bein Backup\b/g, 'eine Sicherung'], [/\bEin Backup\b/g, 'Eine Sicherung'],
  [/\bdas Backup\b/g, 'die Sicherung'], [/\bDas Backup\b/g, 'Die Sicherung'], [/\bdein Backup\b/g, 'deine Sicherung'], [/\bvom Backup\b/g, 'von der Sicherung'], [/\bim Backup\b/g, 'in der Sicherung'],
  [/\bkein Sicherung\b/g, 'keine Sicherung'], [/\bNoch kein Sicherung\b/g, 'Noch keine Sicherung']);
