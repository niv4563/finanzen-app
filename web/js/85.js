/* =====================================================================
   85. ANALYSE IM AUSSEHEN VON WALLET (1.60.0)
   • Filterleiste: Felder mit Symbolen, Auswahl-Pfeile, Betragsbereich mit Schieberegler
   • Zeitraum «‹ Diesen Monat ⇕ ›», Reiter mit Symbolen
   • Tabelle: runde Kategorie-Symbole, Lupe, Beträge mit CHF, farbige %-Pillen mit Pfeilen,
     Einnahmen und Ausgaben je mit eigener Kopfzeile, alle Hauptkategorien wie in Wallet
   Funktionen (Filter, Zeitraum, Lupe, Einstellungen) bleiben aus 76.js unverändert.
   ===================================================================== */

var AI = {
  filter:'<path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/>',
  sliders:'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/><path d="M4 12h2M10 12h10"/><circle cx="8" cy="12" r="2"/>',
  search:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  wallet:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14.5h2"/>',
  grid:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8" r="1.3"/>',
  cur:'<path d="M17 6.5A7 7 0 1 0 17 17.5"/><path d="M4 10.5h9M4 13.5h9"/>',
  types:'<path d="M7 4v12M3.5 12.5L7 16l3.5-3.5M17 20V8M13.5 11.5L17 8l3.5 3.5"/>',
  transfer:'<path d="M4 9h15M15 5l4 4-4 4M20 15H5M9 11l-4 4 4 4"/>',
  status:'<circle cx="12" cy="12" r="8"/><path d="M6.5 6.5l11 11"/>',
  card:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
  updown:'<path d="M8 10l4-4 4 4M8 14l4 4 4-4"/>',
  left:'<path d="M15 5l-7 7 7 7"/>', right:'<path d="M9 5l7 7-7 7"/>',
  lens:'<path d="M3 6h9M3 11h5M3 16h5"/><circle cx="15" cy="14" r="4"/><path d="M18 17l3 3"/>',
  save:'<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
  report:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/><path d="M12 3v2"/>',
  trend:'<path d="M3 17l5-5 4 3 8-8"/><path d="M3 21h18"/>',
  bars:'<path d="M5 20V10M10 20V5M15 20v-8M20 20v-4M3 20h18"/>',
  charts:'<path d="M3 20h18M4 16l4-6 4 3 5-7 3 3"/><path d="M5 20v-3M10 20v-5M15 20v-4M20 20v-6"/>',
  close:'<path d="M6 6l12 12M18 6L6 18"/>',
  minus:'<circle cx="12" cy="12" r="9" fill="currentColor" stroke="none"/><path d="M8 12h8" stroke="#fff"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
};
var aic = (n, cls='', st='') => `<svg class="aic ${cls}" viewBox="0 0 24 24" aria-hidden="true" ${st?`style="${st}"`:''}>${AI[n]||''}</svg>`;

/* Kategorie-Symbole (eigene Zeichnungen) und Farben */
var CI = {
  'Essen & Trinken':['#e5484d','<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2.5 1.5-3.5 4-3.5 7.5h3.5"/>'],
  'Einkaufen':['#3e9fe0','<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>'],
  'Wohnen':['#f0a12c','<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5M10 20v-5h4v5"/>'],
  'Transport':['#8792a2','<rect x="5" y="3.5" width="14" height="14" rx="3"/><path d="M5 11h14M8.5 17.5V20M15.5 17.5V20"/><circle cx="8.5" cy="14.3" r=".6"/><circle cx="15.5" cy="14.3" r=".6"/>'],
  'Fahrzeug':['#8e57d9','<path d="M4 16v-3.5L6.5 7h11L20 12.5V16z"/><path d="M4 12.5h16"/><circle cx="8" cy="16.5" r="1.6"/><circle cx="16" cy="16.5" r="1.6"/>'],
  'Leben & Unterhaltung':['#4fb35a','<circle cx="12" cy="5" r="2"/><path d="M12 8v7M8.5 10.5l3.5-1.5 3.5 1.5M10 21l2-6 2 6"/>'],
  'Kommunikation, PC':['#4b6bd8','<rect x="3" y="4.5" width="18" height="12" rx="1.5"/><path d="M9 20.5h6M12 16.5v4"/>'],
  'Finanzausgaben':['#18a497','<circle cx="12" cy="12" r="8"/><path d="M14.5 9a2.5 2 0 0 0-2.5-1.2c-1.5 0-2.5.8-2.5 1.9 0 2.6 5 1.4 5 4.2 0 1.1-1 1.9-2.5 1.9A2.6 2.2 0 0 1 9.5 15M12 6.5v1.3M12 16v1.5"/>'],
  'Investitionen':['#e0579b','<circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="4.5" r="1.4"/><circle cx="12" cy="19.5" r="1.4"/><circle cx="4.5" cy="12" r="1.4"/><circle cx="19.5" cy="12" r="1.4"/><path d="M12 6v3.8M12 14.2V18M6 12h3.8M14.2 12H18"/>'],
  'Sonstiges':['#8792a2','<path d="M5 7h14M5 12h14M5 17h14"/>'],
  'Unbekannt':['#9aa2ad','<path d="M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.2-1.5 2.4M12 18v.5"/>'],
  'Einkommen':['#f0b21a','<ellipse cx="12" cy="6.5" rx="6" ry="2.5"/><path d="M6 6.5v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4M6 10.5v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4M6 14.5v3c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-3"/>'],
  'Überweisungen':['#7a8796','<path d="M4 9h15M15 5l4 4-4 4M20 15H5M9 11l-4 4 4 4"/>'],
};
CI['Essen & Getränke'] = CI['Essen & Trinken'];
var catIco = name => { const c = CI[name] || ['#8792a2', '<circle cx="12" cy="12" r="3"/>']; return `<span class="brci" style="--c:${c[0]}"><svg viewBox="0 0 24 24" aria-hidden="true">${c[1]}</svg></span>`; };
var BR_ORDER_O = ['Essen & Trinken','Einkaufen','Wohnen','Transport','Fahrzeug','Leben & Unterhaltung','Kommunikation, PC','Finanzausgaben','Investitionen','Sonstiges','Unbekannt'];
var BR_ORDER_I = ['Einkommen'];

/* Veränderung als Pille wie Wallet: Vorzeichen = besser (ohne) / schlechter (−), Pfeil = Richtung des Betrags */
function brPill(cur, prev, goodUp){
  const a = Math.abs(cur), b = Math.abs(prev);
  if(a < 0.005 && b < 0.005) return `<span class="brpl z">${aic('minus','pm')}0%</span>`;
  let rel, up;
  if(goodUp === 'cf'){ rel = b < 0.005 ? 1 : (cur - prev)/b; up = cur >= prev; goodUp = true; }
  else { rel = b < 0.005 ? 1 : (a - b)/b; up = a >= b; }
  const p = Math.min(999, Math.round(Math.abs(rel)*100));
  if(p === 0) return `<span class="brpl z">${aic('minus','pm')}0%</span>`;
  const good = goodUp ? up : !up, deg = p < 10 ? 0 : p < 90 ? (up ? -45 : 45) : (up ? -90 : 90);
  return `<span class="brpl ${good?'g':'b'}">${aic('arrow','pa',`transform:rotate(${deg}deg)`)}${good?'':'−'}${p}%</span>`;
}

/* ---------- Zeitraum wie Wallet ---------- */
brHead = function(){
  const P = bpPeriod(0), m = S.bp.m, o = S.bp.off||0, n = bfCount();
  const name = m==='m' ? (o===0 ? 'Diesen Monat' : o===-1 ? 'Letzter Monat' : P.l)
    : m==='w' ? (o===0 ? 'Diese Woche' : o===-1 ? 'Letzte Woche' : P.l)
    : m==='y' ? (o===0 ? 'Dieses Jahr' : o===-1 ? 'Letztes Jahr' : P.l) : P.l;
  const sub = name !== P.l ? P.l : '';
  return `<div class="brhead w2"><button class="brnav" data-act="bpnav" data-d="-1" aria-label="Früherer Zeitraum">${aic('left')}</button>
    <button class="brpick w2" data-act="bppick" aria-label="Zeitraum wählen: ${esc(P.l)}"><span class="brpn"><b>${esc(name)}</b>${sub?`<small>${esc(sub)}</small>`:''}</span>${aic('updown','pud')}</button>
    <button class="brnav" data-act="bpnav" data-d="1" aria-label="Späterer Zeitraum" ${m!=='c' && o>=0?'disabled':''}>${aic('right')}</button></div>
    <div class="brtools w2"><button class="btn sm brfbtn ${n?'pri':''}" data-act="bftoggle">${aic('filter')} Filter${n?` · ${n}`:''}</button>${n?'<button class="btn sm ghost" data-act="bfreset">Zurücksetzen</button>':''}</div>`;
};

/* ---------- Filterleiste wie Wallet ---------- */
function bfField(key, title, icon, opts, ph){
  const f = S.bf[key]||[], sel = opts.filter(o=>f.includes(o[0]));
  const val = sel.length ? sel.map(o=>esc(o[1])).slice(0,2).join(', ')+(sel.length>2?` +${sel.length-2}`:'') : ph;
  return `<div class="bfg"><div class="bfh">${title}</div><details class="bfm w2" ${S._bfOpen===key?'open':''} data-k="${key}">
    <summary class="bfbox ${sel.length?'on':''}">${aic(icon)}<span class="bfv">${val}</span>${aic('updown','pud')}</summary>
    <div class="bfopts">${opts.length?opts.map(([v,l])=>`<label><input type="checkbox" data-act="bfchk" data-k="${key}" value="${esc(v)}" ${f.includes(v)?'checked':''}> ${key==='cat'?catIco(v):''}${esc(l)}</label>`).join(''):'<span class="small muted">keine</span>'}</div></details></div>`;
}
var bfMaxAmt = () => { const from = dAdd(todayIso(), -730); let m = 0; for(const t of D.tx) if(t.d>=from){ const v = Math.abs(sv(t)); if(v>m) m = v; } return Math.max(100, Math.ceil(m/100)*100); };
bfPanel = function(){
  const f = S.bf, saved = D.settings.bfSaved || [], mx = bfMaxAmt();
  const accs = D.accounts.filter(a=>!a.archived).map(a=>[a.id, a.name+(inStats(a)?'':' (ausgeschlossen)')]);
  const seen = new Set(D.tx.filter(t=>t.d>=dAdd(todayIso(),-730)).map(brTop));
  const tops = [...BR_ORDER_I, ...BR_ORDER_O, ...[...seen].filter(x=>!BR_ORDER_I.includes(x) && !BR_ORDER_O.includes(x)).sort()].filter(x=>seen.has(x) || BR_ORDER_O.includes(x)).map(x=>[x,x]);
  const tags = [...new Set(D.tx.flatMap(txTags))].sort().map(x=>[x,'#'+x]);
  const curs = [...new Set(D.accounts.filter(a=>!a.archived).map(accCur))].sort().map(x=>[x,x]);
  const pays = Object.values(WB_PT).map(x=>[x,x]);
  const lo = f.min==='' ? 0 : Math.min(mx, +f.min), hi = f.max==='' ? mx : Math.min(mx, +f.max);
  const sel = (k, icon, opts, cur) => `<label class="bfbox bfsel">${aic(icon)}<select data-act="bfsel" data-k="${k}" aria-label="${k==='tr'?'Überweisungen':'Buchungsstatus'}">${opts.map(([v,l])=>`<option value="${v}" ${cur===v?'selected':''}>${l}</option>`).join('')}</select>${aic('updown','pud')}</label>`;
  return `<aside class="bfpanel w2 card ${S.bfOpen?'open':''}" aria-label="Filter">
    <div class="bftop"><h2>Analyse</h2><button class="bfico bfclose" data-act="bftoggle" aria-label="Filter schliessen">${aic('close')}</button><span class="bfico bfdeco" aria-hidden="true">${aic('sliders')}</span></div>
    <div class="bfg"><div class="bfh">Mein Filter</div><div class="bfbox bfmy">${aic('filter')}<select data-act="bfload" aria-label="Gespeicherten Filter laden"><option value="">Filter auswählen</option>${saved.map((x,i)=>`<option value="${i}">${esc(x.n)}</option>`).join('')}</select><button class="bfsv" data-act="bfsave" title="Aktuellen Filter speichern" aria-label="Aktuellen Filter speichern">${aic('save')}</button></div></div>
    <div class="bfsep"></div>
    <div class="bfg"><div class="bfh">Suchen</div><label class="bfbox">${aic('search')}<input type="search" data-act="bfq" value="${esc(f.q)}" placeholder="Suchen" aria-label="Suchen"></label></div>
    ${bfField('acc','Konten','wallet', accs, 'Konten in der Statistik')}
    ${bfField('cat','Kategorien','grid', tops, 'Alle Kategorien')}
    ${bfField('tag','Etiketten','tag', tags, 'Alle')}
    ${bfField('cur','Währungen','cur', curs, 'Alle Währungen')}
    ${bfField('typ','Eintragsarten','types', [['o','Ausgabe'],['i','Einnahme'],['t','Überweisung']], 'Alle Eintragsarten')}
    <div class="bfg bfrng card2"><div class="row"><b class="sp">Betragsbereich</b><span class="small muted">CHF</span></div><div class="small muted">Absoluter Betrag in CHF</div>
      <div class="bfslide" style="--lo:${lo/mx*100}%;--hi:${hi/mx*100}%"><input type="range" min="0" max="${mx}" step="${mx>2000?10:1}" value="${lo}" data-act="bfrng" data-k="min" aria-label="Betrag von"><input type="range" min="0" max="${mx}" step="${mx>2000?10:1}" value="${hi}" data-act="bfrng" data-k="max" aria-label="Betrag bis"></div>
      <div class="row small muted"><span class="sp">0 CHF</span><span>${chf0(mx)} CHF</span></div>
      <div class="row bfnum"><input type="number" inputmode="decimal" min="0" data-act="bfmin" value="${esc(f.min)}" placeholder="0" aria-label="Betrag von"><input type="number" inputmode="decimal" min="0" data-act="bfmax" value="${esc(f.max)}" placeholder="${chf0(mx)}" aria-label="Betrag bis"></div></div>
    <div class="bfg"><div class="bfh">Überweisungen</div>${sel('tr','transfer',[['ex','Überweisungen ausschliessen'],['in','Überweisungen einbeziehen']], f.tr==='in'?'in':'ex')}</div>
    <div class="bfg"><div class="bfh">Buchungsstatus</div>${sel('st','status',[['','Alle Buchungsstatus'],['c','Abgerechnet'],['p','Vorgemerkt']], f.st||'')}</div>
    ${bfField('pay','Zahlungsarten','card', pays, 'Alle Zahlungsarten')}
    <button class="btn bfreset" data-act="bfreset" ${bfCount()?'':'disabled'}>Filter zurücksetzen</button>
    <button class="btn pri bfdone" data-act="bftoggle">Ergebnis anzeigen</button>
    ${saved.length?`<details class="bfsaved"><summary class="small">Gespeicherte Filter verwalten</summary>${saved.map((x,i)=>`<div class="row small"><span class="sp">${esc(x.n)}</span><button class="link" data-act="bfdel" data-i="${i}">Löschen</button></div>`).join('')}</details>`:''}
  </aside>`;
};

/* Schieberegler: beim Ziehen mitzeigen, beim Loslassen übernehmen */
document.addEventListener('input', e=>{
  const a = e.target.closest?.('[data-act="bfrng"]'); if(!a) return;
  const box = a.closest('.bfslide'), [r1, r2] = box.querySelectorAll('input'), mx = +r1.max;
  if(+r1.value > +r2.value){ if(a===r1) r1.value = r2.value; else r2.value = r1.value; }
  box.style.setProperty('--lo', (+r1.value/mx*100)+'%'); box.style.setProperty('--hi', (+r2.value/mx*100)+'%');
  const nums = box.parentElement.querySelectorAll('.bfnum input'); nums[0].value = +r1.value || ''; nums[1].value = +r2.value>=mx ? '' : r2.value;
}, true);
document.addEventListener('change', e=>{
  const a = e.target.closest?.('[data-act="bfrng"]'); if(!a || !D) return;
  const box = a.closest('.bfslide'), [r1, r2] = box.querySelectorAll('input'), mx = +r1.max;
  S.bf.min = +r1.value > 0 ? String(+r1.value) : ''; S.bf.max = +r2.value < mx ? String(+r2.value) : '';
  bfSave(); brRerender();
}, true);

/* ---------- Einnahmen & Ausgaben wie Wallet ---------- */
brEA = function(){
  const n = Math.max(1, Math.min(12, S.brCfg.cols||6)), Ps = Array.from({length:n},(_,i)=>lmPeriod((S.lmOff||0)-i)), Ss = Ps.map(p=>brSums(p.from, p.to)), open = S.brOpen || (S.brOpen = {});
  const fc = S.bf.cat || [];
  const keys = (pre, order) => { const all = new Set(); Ss.forEach(s=>Object.keys(s.top).filter(k=>k.startsWith(pre)).forEach(k=>all.add(k.slice(2))));
    const extra = [...all].filter(x=>!order.includes(x)).sort((a,b)=>Math.abs(Ss[0].top[pre+b]||0)-Math.abs(Ss[0].top[pre+a]||0));
    return [...order.filter(x=>all.has(x) || pre==='o:'), ...extra].filter(x=>!fc.length || fc.includes(x)).map(x=>pre+x); };
  const pct = S.brCfg.pct;
  const val = (v, bold, out) => `<span class="brv ${bold?'brb':''}">${out && Math.abs(v)>=0.005?'−':''}${chf(Math.abs(v))} <small>CHF</small></span>`;
  const cell = (v, pv, inc, k, i) => `<td class="num brc" ${k?`data-act="brlist" data-k="${esc(k)}" data-i="${i}"`:''}><div class="brcw">${k && Math.abs(v)>=0.005?`<span class="brlz" aria-hidden="true">${aic('lens')}</span>`:''}<div>${val(v, false, !inc)}${pct && pv!==undefined ? brPill(v, pv, inc) : ''}</div></div></td>`;
  const tcell = (v, pv, inc, cf) => `<td class="num"><div class="brcw"><div>${cf ? `<span class="brv brb ${v>=0?'in':'neg'}">${v>=0?'+':'−'}${chf(Math.abs(v))} <small>CHF</small></span>` : val(v, true, !inc)}${pct && pv!==undefined ? brPill(v, pv, cf ? 'cf' : inc) : ''}</div></div></td>`;
  const lab = p => S.bp.m==='m' && lmStart()===1 && p.ym ? ymLabel(p.ym) : p.s;
  const head = `<tr class="brhd"><th></th>${Ps.map((p,i)=>`<th class="num ${i===0?'brcur':''}">${esc(lab(p))}</th>`).join('')}</tr>`;
  const row = (k, inc) => { const name = k.slice(2), isO = !!open[k] || S.brCfg.allOpen, z = Math.abs(Ss[0].top[k]||0) < 0.005;
    let r = `<tr class="brrow ${z?'brz':''}"><td><span data-act="bropen" data-k="${esc(k)}" class="brname" role="button" aria-expanded="${isO}">${catIco(name)}<span class="brnm">${esc(name)}</span><span class="brchev">${isO?'▾':'▸'}</span></span></td>${Ss.map((s,i)=>cell(s.top[k]||0, i<n-1 ? (Ss[i+1].top[k]||0) : undefined, inc, k, i)).join('')}</tr>`;
    if(isO){ const subs = new Set(); Ss.forEach(s=>Object.keys(s.sub[k]||{}).forEach(x=>subs.add(x)));
      [...subs].sort((a,b)=>(Ss[0].sub[k]?.[b]||0)-(Ss[0].sub[k]?.[a]||0)).forEach(sb=>{ r += `<tr class="brsub"><td>${esc(sb)}</td>${Ss.map((s,i)=>{ const v = s.sub[k]?.[sb]||0; return `<td class="num brc ${Math.abs(v)<0.005?'muted':''}" data-act="brlist" data-k="${esc(k)}" data-sub="${esc(sb)}" data-i="${i}">${!inc && Math.abs(v)>=0.005?'−':''}${chf(Math.abs(v))}</td>`; }).join('')}</tr>`; }); }
    return r; };
  const tot = (l, f, inc) => `<tr class="brtot"><td><b>${l}</b></td>${Ss.map((s,i)=>tcell(f(s), i<n-1 ? f(Ss[i+1]) : undefined, inc)).join('')}</tr>`;
  const cfRow = `<tr class="brtot brcf"><td><b>Cashflow</b></td>${Ss.map((s,i)=>tcell(s.inc-s.out, i<n-1 ? Ss[i+1].inc-Ss[i+1].out : undefined, true, true)).join('')}</tr>`;
  const rest = Ss.slice(1), avg = rest.length ? rest.reduce((a,s)=>a+s.out,0)/rest.length : 0, low = Ss[0].out>0 && rest.length && rest.every(s=>Ss[0].out<=s.out);
  return `<div class="brcfgrow"><button class="bfico" data-act="brcfg" title="Bericht einstellen" aria-label="Bericht einstellen">${aic('sliders')}</button></div>
    <div class="ytable brtable w2"><table>
    <thead>${head}</thead><tbody>${tot('Gesamteinnahmen', s=>s.inc, true)}${keys('i:', BR_ORDER_I).map(k=>row(k, true)).join('')}</tbody>
    <tbody class="brgap"><tr><td colspan="${n+1}"></td></tr></tbody>
    <tbody>${head}${tot('Gesamtausgaben', s=>s.out, false)}${keys('o:', BR_ORDER_O).map(k=>row(k, false)).join('')}</tbody>
    <tbody class="brgap"><tr><td colspan="${n+1}"></td></tr></tbody>
    <tbody>${cfRow}</tbody></table></div>
    ${rest.length?`<p class="small muted">Ausgaben im Schnitt der ${rest.length} Zeiträume davor: CHF ${chf0(avg)}.${low?' <b class="in">Tiefster Wert seit '+n+' Zeiträumen.</b>':''}</p>`:''}
    <p class="small muted">Kategorie antippen zeigt die Unterkategorien, ein Betrag die Buchungen dazu. Grüne Prozent = besser als im Zeitraum davor, rote = schlechter.</p>`;
};

/* ---------- Reiter mit Symbolen ---------- */
vBericht = function(){
  const sg = S.brSeg || 'ea';
  const tabs = [['ea','Einnahmen & Ausgaben','report'],['kt','Kontostandtrend','trend'],['cf','Cashflow','bars'],['ex','Erweiterte Diagramme','charts']];
  let main = brHead() + `<div class="brtabs" role="tablist">${tabs.map(([v,l,ic])=>`<button role="tab" aria-selected="${v===sg}" class="${v===sg?'on':''}" data-act="brseg" data-v="${v}">${aic(ic)}<span>${l}</span></button>`).join('')}</div>`;
  try{ main += sg==='kt' ? brKonto() : sg==='cf' ? brCash() : sg==='ex' ? brExt() : brEA(); }catch(e){ console.error(e); main += '<div class="card">Bericht konnte nicht berechnet werden.</div>'; }
  main += `<p class="small muted">Ohne Filter zählen wie bei Wallet nur Konten in der Statistik. Überweisungen zählen nur, wenn du sie im Filter einbeziehst.</p>`;
  return `<div class="brlay w2">${bfPanel()}<div class="brmain">${main}</div></div>`;
};
CUSTOM_V.bericht = vBericht;

/* Handy: Filter als Blatt über der Seite – Hintergrund nicht mitscrollen */
render = (prev => function(){ const r = prev.apply(this, arguments);
  try{ document.body.classList.toggle('bfsheet', S.view==='bericht' && !!S.bfOpen && innerWidth < 1000); }catch(e){} return r; })(render);
