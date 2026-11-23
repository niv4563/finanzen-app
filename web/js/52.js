/* =====================================================================
   60. VERSION 1.34.0 – EIGENER ZEITRAUM OHNE «ÜBERNEHMEN»-KNOPF
   Von–Bis gilt automatisch, sobald beide Daten gültig sind. Neu aufgebaut wird erst, wenn das
   Datumsfeld verlassen wird – so geht beim Tippen nichts verloren.
   ===================================================================== */
const noApplyBtn = h => h.replace(/\s*<button class="btn sm pri" type="button" data-act="(apcust|bcust)"[^>]*>[^<]*<\/button>/g, '');
perSheet = (prev => function(){ return noApplyBtn(prev()); })(perSheet);
vBuchungen2 = (prev => function(){ return noApplyBtn(prev()); })(vBuchungen2);
window.addEventListener('change', e => {
  const id = e.target.id; if(!D || !['apfrom','apto','bfrom','bto'].includes(id)) return;
  const isB = id[0] === 'b', r = custRange($(isB ? '#bfrom' : '#apfrom')?.value, $(isB ? '#bto' : '#apto')?.value);
  if(!r) return;
  if(isB){ S.bper = r; S.bCustOpen = true; } else S.ap = r;
  // am PC wird getippt: erst neu aufbauen, wenn das Feld verlassen wird (sonst geht das Tippen verloren)
  if(Date.now() - (S._dateKey||0) < 2500){ S._dateWait = true; return; }
  render();
}, true);
document.addEventListener('keydown', e => { if(e.target?.type === 'date' && e.target.closest('.pscust')) S._dateKey = Date.now(); }, true);
document.addEventListener('focusout', e => {
  if(e.target?.type !== 'date' || !S._dateWait) return;
  setTimeout(() => { const ae = document.activeElement; if(ae?.type === 'date' && ae.closest('.pscust')) return; S._dateWait = false; S._dateKey = 0; render(); }, 300);
}, true);
