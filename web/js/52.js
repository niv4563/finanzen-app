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
  render();                                   // wird verschoben, solange ein Datumsfeld den Fokus hat
}, true);
