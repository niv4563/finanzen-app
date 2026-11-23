/* =====================================================================
   47. VERSION 1.27.0 – RUHIGERE, ÜBERSICHTLICHERE OBERFLÄCHE
   • Startseite kurz: Saldo, Konten als ruhige Liste (volle Namen, keine bunten Kacheln),
     danach nur die wichtigsten Karten. Weitere Karten über «Startseite anpassen».
   • Menü neu geordnet: oben das Tägliche, Selteneres unter «Weitere» (eingeklappt).
   • Kleinere Knöpfe, einheitliche Abstände und Schriftgrössen.
   ===================================================================== */
/* ---------- Konten als Liste ---------- */
var _homeAccounts1270 = homeAccounts;
homeAccounts = function(){
  const prev = _homeAccounts1270(), box = document.createElement('div'); box.innerHTML = prev;
  const head = box.querySelector('.hsum')?.outerHTML || '';
  const accs = activeAccs().filter(a=>!a.archived);
  const by = {}; for(const a of accs) (by[accGrp(a)] ??= []).push(a);
  const row = a => { const v = accValRaw(a), c = accCur(a), dim = !inStats(a), col = a.color || wAccColor(a);
    const sym = (typeof CUR_SYM!=='undefined' && CUR_SYM[c]) || c, chfV = c!=='CHF' ? toChf(v, c) : null;
    return `<button class="arow ${dim?'dim':''}" data-act="baledit" data-id="${a.id}"><span class="adot" style="background:${col}">${ci(accIcon(a))}</span>
      <span class="aname">${esc(a.name)}${dim?'<small>zählt nicht</small>':''}</span>
      <span class="aval"><b class="num ${v<0?'neg':''}">${sym} ${signChf(v)}</b>${chfV!=null && isFinite(chfV)?`<small>≈ CHF ${signChf(chfV)}</small>`:''}</span></button>`; };
  const list = ACC_GRP.filter(([g])=>by[g]?.length).map(([g,l])=>`<div class="agh">${l}</div>${by[g].map(row).join('')}`).join('');
  return head + `<div class="alist">${list}</div>`;
};

/* ---------- Startseite: nur wichtige Karten, anpassbar ---------- */
var HOME_CARDS = [
  ['upcoming','Bevorstehende Zahlungen', x=>/Bevorstehende/.test(x)],
  ['recent','Letzte Einträge', x=>/Letzte Einträge/.test(x)],
  ['struct','Ausgabenstruktur', x=>/Ausgabenstruktur/.test(x)],
  ['coach','Finanz-Coach', x=>/Finanz-Coach/.test(x)],
  ['ki','Finanz-Assistent', x=>/Assistent|Prognose Monatsende/.test(x)],
  ['dash','Übersicht (Tachos)', x=>/^Übersicht/.test(x)],
  ['trend','Kontostand-Trend', x=>/Trend/.test(x)],
  ['wealth','Vermögen in CHF', x=>/Vermögen/.test(x)],
  ['leute','Unter Leuten', x=>/Unter Leuten/.test(x)],
];
var HOME_DEF = {upcoming:1, recent:1, struct:1, coach:1};
var homeOn = k => (D.homeCards ? !!D.homeCards[k] : !!HOME_DEF[k]);
function homeTidy(){
  const main = $('#main'); if(!main) return;
  main.querySelector('.hacc')?.remove();
  [...main.children].forEach(c=>{ if(c.classList.contains('row') && c.querySelector('[data-go="buchungen"]')) c.remove(); });
  const grid = main.querySelector('.agrid.home'); if(!grid) return;
  const cards = [...grid.children], placed = [];
  for(const [k,,m] of HOME_CARDS){ const c = cards.find(x=>!placed.includes(x) && m((x.querySelector('h3')?.textContent||'').trim())); if(!c) continue; placed.push(c);
    if(homeOn(k)) grid.appendChild(c); else c.remove(); }
  if(!$('#homeedit')) grid.insertAdjacentHTML('afterend', `<div class="homeedit"><button class="btn sm" id="homeedit" data-act="homeedit">Startseite anpassen</button></div>`);
}
function homeEditDialog(){
  dialog(`<h3>Startseite anpassen</h3><p class="small muted" style="margin-top:-6px">Welche Karten möchtest du unter den Konten sehen?</p>
    ${HOME_CARDS.map(([k,l])=>`<label class="li acl"><span class="sp">${l}</span><input type="checkbox" class="sw" id="hc_${k}" ${homeOn(k)?'checked':''}></label>`).join('')}${acts(true)}`,
  ()=>{ D.homeCards = {}; for(const [k] of HOME_CARDS) if($('#hc_'+k)?.checked) D.homeCards[k] = 1; });
}
document.addEventListener('click', e=>{ if(e.target.closest('[data-act="homeedit"]') && D){ e.stopPropagation(); homeEditDialog(); } }, true);
var _render1270 = render;
render = function(){ _render1270(); if(D && !S.locked && S.view==='start' && (S.stab||'konten')==='konten') homeTidy(); };

/* ---------- Menü neu ordnen ---------- */
(()=>{
  const all = {}; for(const [,items] of NAV4) for(const it of items) all[it[0]] ??= it;
  const take = (id, label) => { const it = all[id]; if(!it) return null; delete all[id]; return label ? [it[0], it[1], label] : it; };
  const sec = (name, ids) => [name, ids.map(x=>Array.isArray(x) ? take(x[0], x[1]) : take(x)).filter(Boolean)];
  const fresh = [
    sec(null, ['start','buchungen',['konten','Konten'],['statistik','Analyse'],'kalender']),
    sec('Geld planen', [['budget','Budgets'],['ziele','Ziele & Reserve'],['plaene','Geplante Zahlungen'],'rechnungen','coach','assistent']),
    sec('Import & Ordnung', [['import','Bankdateien'],'zuordnung','autoregeln','labels']),
  ];
  const sett = sec('Einstellungen', ['daten','wallet']);
  const rest = Object.values(all);
  if(rest.length) fresh.push(['Weitere', rest]);
  fresh.push(sett);
  NAV4.length = 0; fresh.filter(s=>s[1].length).forEach(s=>NAV4.push(s));
  if(typeof navCol==='object' && !('Weitere' in navCol)){ navCol['Weitere'] = true; try{ navSave(); }catch(e){} }
})();
