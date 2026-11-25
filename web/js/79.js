/* =====================================================================
   VERSION 1.56.1 – Berater: Knöpfe führen ans richtige Ziel
   «Schuldenplan» führte zu «Konten» oder auf dieselbe Seite. Neu ist
   «schulden» ein Sprungziel: Berater › Übersicht, beim Schuldenplan.
   ===================================================================== */
recommendations = (prev => function(){
  const R = prev.apply(this, arguments);
  for(const r of R||[]){
    if(r.act && r.act.label==='Schuldenplan') r.act.go = 'schulden';
    if(!r.act && /^Krankenkasse jetzt vergleichen/.test(r.t||'')) r.act = {label:'Franchise-Rechner', go:'plan'};
  }
  return R;
})(recommendations);

finTips = (prev => function(){
  const T = prev.apply(this, arguments);
  for(const x of T||[]) if(/^kk:/.test(x.key||'')) x.b = (x.b||[]).map(b => b[0]==='Schuldenplan' ? ['Abzahlen planen','go','plan'] : b);
  return T;
})(finTips);

/* Gleicher Zins wie im Berater: der bei der Karte hinterlegte, sonst 12 % */
kkZins = () => +PL().kkZins || +(kkAccs().find(a=>+a.rate>0)?.rate) || KK_ZINS;

/* «Schuldenplan öffnen» auf der Startseite zeigte auf Konten */
document.addEventListener('click', e => {
  const g = e.target.closest('a.wmore[data-go="konten"]');
  if(g && /Schuldenplan/.test(g.textContent)) g.dataset.go = 'schulden';
}, true);

render = (prev => function(){
  if(S.view === 'schulden'){
    S.view = 'coach'; const r = prev.apply(this, arguments);
    setTimeout(() => { const h = [...document.querySelectorAll('#main h3')].find(x=>x.textContent.trim()==='Schuldenplan');
      if(h) (h.closest('.xcard')||h).scrollIntoView({block:'start', behavior:'smooth'}); }, 60);
    return r;
  }
  return prev.apply(this, arguments);
})(render);
