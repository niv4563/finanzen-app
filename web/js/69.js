/* =====================================================================
   71. NEUES DESIGN – BEDIENUNG
   • Handy: Unterleiste mit Start · Buchungen · Budget · Kaufen · Menü (das Menü öffnet die Schublade).
   • Die aktuelle Seite steht als data-view am <body> (für seitengenaue Stile).
   • Lange Erklärtexte sind auf dem Handy auf zwei Zeilen gekürzt – antippen zeigt alles.
   • Theme-Farbe der Statusleiste passt zum neuen Dunkelblau.
   ===================================================================== */
var TABS = [
  ['start', ICON.start, 'Start', ['start','konten','kalender']],
  ['buchungen', ICON.list, 'Buchungen', ['buchungen','labels']],
  ['budget', ICON.budget, 'Budget', ['budget','budgetedit','katinfo','mbw','plaene','jahr','ziele']],
  ['kaufen', ci(CI.cart), 'Kaufen', ['kaufen','wuensche']],
];
function tabsDraw(){
  const n2 = $('#nav2'); if(!n2) return;
  if(!D || S.locked){ n2.innerHTML = ''; return; }
  const v = S.view, inTab = TABS.some(t=>t[3].includes(v));
  n2.innerHTML = TABS.map(([id,i,n,vs])=>`<a data-go="${id}" class="${vs.includes(v)?'on':''}" aria-label="${n}"${vs.includes(v)?' aria-current="page"':''}><span class="i">${i}</span><span>${n}</span></a>`).join('')
    + `<button type="button" data-act="drawer" class="${inTab?'':'on'}" aria-label="Menü"><span class="i">${ICON.more}</span><span>Menü</span></button>`;
  try{ kaufBadge(); }catch(e){}
}
render = (prev => function(){
  const r = prev.apply(this, arguments);
  try{ document.body.dataset.view = (D && !S.locked) ? S.view : 'lock'; tabsDraw(); }catch(e){}
  return r;
})(render);
// Erklärtext antippen = ganz zeigen
document.addEventListener('click', e=>{ const p = e.target.closest('p.sub'); if(p && !e.target.closest('a,button')) p.classList.toggle('open'); });
// Statusleiste im Browser
(() => { const m = document.querySelector('meta[name="theme-color"]'); if(m) m.content = '#17325A'; })();
// Tippen auf einen Reiter schliesst die Schublade
document.addEventListener('click', e=>{ if(e.target.closest('nav.bottom [data-go]')) try{ drawer(false); }catch(x){} }, true);
// Handy: Monat in der Kopfzeile kurz («Nov. 2026»), damit der Seitentitel Platz hat
render = (prev => function(){ const r = prev.apply(this, arguments);
  try{ const l = $('#mlabel'); if(l && matchMedia('(max-width:820px)').matches){ const t = l.textContent.trim(), m = t.match(/^([A-Za-zÄÖÜäöü]+)\s+(\d{4})$/);
    if(m && m[1].length > 4) l.textContent = m[1].slice(0,3) + '. ' + m[2]; } }catch(e){} return r; })(render);
// Buchungen auf dem Handy: Suche, Konto und Von–Bis hinter «Suchen & Filter» (weniger Scrollen bis zur Liste)
render = (prev => function(){ const r = prev.apply(this, arguments);
  try{ if(D && !S.locked && S.view==='buchungen'){ const bp = document.querySelector('#main .bper'); const active = !!($('#fq')?.value || $('#facc')?.value);
    if(bp && !document.querySelector('.bfilt')) bp.insertAdjacentHTML('afterend', `<button type="button" class="btn sm ghost bfilt" data-act="bfilt" aria-expanded="${S.bfilt||active?'true':'false'}">${ICON.list}<span>Suchen & Filter${active?' · aktiv':''}</span></button>`);
    document.body.classList.toggle('bfilt-open', !!(S.bfilt || active)); } }catch(e){} return r; })(render);
document.addEventListener('click', e=>{ const a = e.target.closest('[data-act="bfilt"]'); if(!a) return; e.stopPropagation();
  S.bfilt = !document.body.classList.contains('bfilt-open'); document.body.classList.toggle('bfilt-open', S.bfilt); a.setAttribute('aria-expanded', String(S.bfilt)); if(S.bfilt) setTimeout(()=>$('#fq')?.focus(), 30); }, true);
