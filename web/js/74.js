/* =====================================================================
   76. AUFRÄUMEN & GÖNNEN
   • Menü von ~29 auf 15 Einträge: verwandte Seiten sind zu Bereichen mit Reitern zusammengelegt
     (Budget · Kommende Zahlungen · Gönnen · Analyse · Berater · Kategorien & Regeln).
   • Doppelte Karten entfernt (Spartipps, Prognose 12 Monate, «So solltest du dein Einkommen verteilen»,
     Sicher kommende Abgaben und Rückstellung im Budget).
   • Gönn-Topf: fester Betrag pro Monat, Rest wird mitgenommen, wird nie zum Kürzen vorgeschlagen.
   • Seite «Gönnen»: Gönn-Topf, was drinliegt (Erlebnisse vor Dingen), Monatsrückblick.
   • Budget: Hinweise auf Doppeltes (Abos doppelt abgezogen, Puffer neben Reserve, Freizeit-Abgrenzung).
   ===================================================================== */

/* ---------- Bereiche mit Reitern ---------- */
var HUBS = [
  {k:'budget', n:'Budget',              i:ICON.budget, tabs:[['budget','Übersicht'],['budgetedit','Planen']]},
  {k:'zahl',   n:'Kommende Zahlungen',  i:ICON.repeat, tabs:[['kommend','Alle'],['plaene','Geplant & Lohn'],['abos','Abos'],['jahr','Jahreskosten'],['rechnungen','Rechnungen']]},
  {k:'goenn',  n:'Gönnen',              i:ci(CI.heart), tabs:[['goennen','Gönn-Topf'],['kaufen','Kaufliste'],['wuensche','Erlebnisse & Wünsche']]},
  {k:'ana',    n:'Analyse',             i:ICON.stats,  tabs:[['statistik','Rückblick'],['analyse','Ausgaben'],['prognose','Ausblick & Was wäre wenn']]},
  {k:'rat',    n:'Berater',             i:ICON.goal,   tabs:[['coach','Übersicht'],['empfehlungen','Empfehlungen'],['assistent','Frag die App'],['regeln','Ampel-Regeln']]},
  {k:'kat',    n:'Kategorien & Regeln', i:ICON.list,   tabs:[['mbw','Ordnen'],['zuordnung','Zuordnen'],['autoregeln','Regeln']]},
];
var hubOf = v => HUBS.find(h=>h.tabs.some(t=>t[0]===v));
var hubLast = (() => { try{ return JSON.parse(localStorage.getItem(KEY+'.hub')||'{}'); }catch(e){ return {}; } })();
var hubGo = h => { const v = hubLast[h.k]; return h.tabs.some(t=>t[0]===v) ? v : h.tabs[0][0]; };
TITLES.goennen = 'Gönnen'; TITLES.kommend = 'Kommende Zahlungen';

// Menü neu
(() => {
  const all = {}; for(const [,items] of NAV4) for(const it of items) all[it[0]] ??= it;
  const it = (id, label) => [id, all[id]?.[1] || ICON.list, label || all[id]?.[2] || TITLES[id] || id];
  const hub = k => { const h = HUBS.find(x=>x.k===k); return ['@'+k, h.i, h.n]; };
  const fresh = [
    [null, [it('start','Startseite'), it('buchungen','Buchungen'), it('konten','Konten'), it('kalender','Kalender')]],
    ['Geld planen', [hub('budget'), hub('zahl'), it('ziele','Ziele & Reserve'), hub('goenn')]],
    ['Auswerten', [hub('ana'), hub('rat')]],
    ['Import & Ordnung', [it('import','Bankdateien'), hub('kat'), it('labels','Etiketten')]],
    ['Einstellungen', [it('daten','Daten & Sicherheit'), it('wallet','Wallet-Verbindung'), ...(all.pcverbinden ? [it('pcverbinden','PC verbinden')] : [])]],
  ];
  NAV4.length = 0; fresh.forEach(s=>NAV4.push(s));
  if(typeof navCol==='object'){ for(const k of ['Weitere','Import & Ordnung','Einstellungen']) if(!(k in navCol)) navCol[k] = k!=='Weitere'; try{ navSave(); }catch(e){} }
})();
// Unterleiste (Handy)
TABS.length = 0;
TABS.push(['start', ICON.start, 'Start', ['start','konten','kalender']],
  ['buchungen', ICON.list, 'Buchungen', ['buchungen','labels']],
  ['budget', ICON.budget, 'Budget', ['budget','budgetedit','katinfo','ziele','kommend','plaene','abos','jahr','rechnungen']],
  ['goennen', ci(CI.heart), 'Gönnen', ['goennen','kaufen','wuensche']]);

/* ---------- Neue Seiten: «Alle kommenden Zahlungen» und «Gönnen» ---------- */
function vKommend(){
  return `<p class="sub">Alles, was in den nächsten 12 Monaten sicher abgeht – Rechnungen, geplante Zahlungen, Abos und Jahreskosten. Einzelheiten in den Reitern.</p>` + (typeof abgCard==='function' ? abgCard() : '');
}

// Gönn-Topf
var GOENN = 'goenn';
var goennCat = () => D.cats.find(c=>c.id===GOENN);
function goennStand(){
  const g = D.settings.goenn; if(!g || !goennCat()) return null;
  const pl = m => C.m[m]?.plan?.[GOENN] || 0, is = m => Math.max(0, C.ist[GOENN]?.[m] || 0);
  let carry = 0; for(const m of C.months.filter(m=>m>=g.from && m<TODAY)) carry += pl(m) - is(m);
  carry = Math.max(0, r2(carry));
  const p = pl(TODAY), i = is(TODAY);
  return {carry, plan:p, ist:i, avail:r2(carry + p - i), amt:g.amt, from:g.from, started: TODAY >= g.from};
}
function goennSuggest(){
  const nx = ymAdd(TODAY,1), m = C.m[nx]; if(!m) return {v:150, free:0};
  const out = D.cats.reduce((t,c)=>t+(m.plan?.[c.id]||0),0), free = r2((m.incB ?? m.incPlan ?? m.inc ?? 0) - out);
  const v = free >= 100 ? Math.min(floor50(free), Math.max(100, floor50((m.incPlan||0)*0.05))) : 150;
  return {v, free};
}
function goennDialog(src){
  const g = D.settings.goenn, s = goennSuggest(), nx = ymAdd(TODAY,1);
  const puf = D.cats.find(c=>c.id==='unbekannt' || /puffer|unvorher/i.test(c.name||'')), pufV = puf ? (C.m[nx]?.plan?.[puf.id]||0) : 0;
  const ms = [TODAY, ...Array.from({length:13},(_,i)=>ymAdd(TODAY,i+1))].filter(m=>C.m[m]);
  dialog(`<h3>Gönn-Topf ${g?'ändern':'einrichten'}</h3>
    <p class="small muted" style="margin-top:0">Ein fester Betrag jeden Monat, nur für dich – ohne schlechtes Gewissen. Was du nicht brauchst, nimmst du in den nächsten Monat mit. Der Berater schlägt nie vor, ihn zu kürzen.</p>
    <label class="f">Betrag pro Monat (CHF)<input id="gamt" inputmode="decimal" value="${g?.amt ?? s.v}"></label>
    <label class="f">Ab<select id="gfrom">${ms.map(m=>`<option value="${m}" ${(g?.from||nx)===m?'selected':''}>${ymLabel(m)}</option>`).join('')}</select></label>
    <label class="f">Woher kommt das Geld?<select id="gsrc">
      <option value="frei" ${src!=='puffer'?'selected':''}>Aus noch nicht verteiltem Geld${s.free>0?` (${ymShortY(nx)}: CHF ${chf0(s.free)} frei)`:''}</option>
      ${puf?`<option value="puffer" ${src==='puffer'?'selected':''}>Aus «${esc(puf.name)}» (${ymShortY(nx)}: CHF ${chf0(pufV)})</option>`:''}
      <option value="selbst">Nur festlegen – ich kürze selbst bei Brauch</option></select></label>
    <p class="small muted">Das ist eine bewusste Änderung am Budget. Fehlt Geld, kürze zuerst bei Brauch – Muss und Sparen bleiben.</p>
    <div class="acts">${g?'<button class="btn danger" data-dlg="del">Gönn-Topf beenden</button><span class="sp"></span>':''}<button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Speichern</button></div>`,
  k=>{
    const from = $('#gfrom').value, ms2 = C.months.filter(m=>m>=from);
    if(k==='del'){ for(const m of ms2) if(D.plan[GOENN]) delete D.plan[GOENN][m]; delete D.settings.goenn; return; }
    if(k!=='ok') return; const amt = r2(parseNum($('#gamt').value)||0), how = $('#gsrc').value;
    if(!(amt>0)){ toastMsg('Bitte einen Betrag eingeben.'); return false; }
    if(!goennCat()) D.cats.push({id:GOENN, name:'Gönn-Topf (für mich)', group:'freizeit', pw:true, need:'will', needUser:true, groupUser:true, keep:true, acc:null, protect:true});
    D.plan[GOENN] ??= {};
    for(const m of ms2){ const old = D.plan[GOENN][m]||0, add = amt - old; D.plan[GOENN][m] = amt;
      if(how==='puffer' && puf && add>0){ const v = D.plan[puf.id]?.[m]||0, x = Math.min(v, add); if(x>0) D.plan[puf.id][m] = r2(v - x); } }
    D.settings.goenn = {amt, from: D.settings.goenn?.from && D.settings.goenn.from < from ? D.settings.goenn.from : from};
    setTimeout(()=>toastMsg(`Gönn-Topf: CHF ${chf0(amt)} pro Monat ab ${ymLabel(from)}`), 50);
  });
}
document.addEventListener('click', e=>{ const a = e.target.closest('[data-act="goennset"]'); if(!a || !D) return; e.stopPropagation(); e.preventDefault(); goennDialog(a.dataset.src); }, true);
// nie zum Kürzen vorschlagen
cCuttable = (prev => id => id===GOENN || D.cats.find(c=>c.id===id)?.protect ? false : prev(id))(cCuttable);

// Monatsrückblick – das Positive zuerst
function rueckblick(ym){
  const m = C.m[ym]; if(!m) return null;
  const ist = c => Math.max(0, C.ist[c.id]?.[ym] || 0);
  const goenn = D.cats.filter(c=>c.group==='freizeit').reduce((t,c)=>t+ist(c),0);
  const top = D.cats.filter(c=>c.group==='freizeit' && ist(c)>0).sort((a,b)=>ist(b)-ist(a)).slice(0,3);
  const spar = D.cats.filter(c=>c.group==='spar').reduce((t,c)=>t+(m.cats?.[c.id]||0),0);
  const b = typeof bokCount==='function' ? bokCount(ym) : null;
  const na = D.accounts.find(a=>a.notgroschen), res = na ? (C.m[TODAY]?.acc?.[na.id]?.start ?? null) : null;
  const goals = (D.goals||[]).filter(g=>g.target>0 && g.acc).slice(0,2).map(g=>({n:g.name, p:Math.max(0, Math.min(1, (C.m[TODAY]?.acc?.[g.acc]?.start||0)/g.target))}));
  return {ym, goenn, top, spar, b, res, resZ:C.reserveZiel, goals};
}
function rueckCard(ym, dismiss){
  const r = rueckblick(ym); if(!r || (!r.goenn && !r.spar)) return '';
  const pill = (t, v, sub) => `<div class="rbk"><b class="num">${v}</b><span>${t}</span>${sub?`<em>${sub}</em>`:''}</div>`;
  return `<div class="card mt rbcard"><div class="row"><h3 class="sp" style="margin:0">Dein ${MN[+ym.slice(5)-1]}</h3>${dismiss?`<button class="ibtn mini" data-act="rbno" data-ym="${ym}" aria-label="Ausblenden">✕</button>`:''}</div>
    <div class="rbks">${pill('gegönnt', 'CHF '+chf0(r.goenn), r.top.map(c=>esc(c.name.replace(/\s*\(.*\)/,''))).join(', '))}${pill('gespart', 'CHF '+chf0(r.spar))}${r.b?.n?pill('Budgets eingehalten', r.b.yes+' von '+r.b.n):''}</div>
    ${r.res!=null && r.resZ>0 ? `<div class="small" style="margin-top:8px">Reserve: <b>${pct(Math.min(1, r.res/r.resZ))}</b> vom Ziel</div><div class="bar"><i style="width:${Math.min(100, r.res/r.resZ*100)}%;background:var(--ok)"></i></div>`:''}
    ${r.goals.map(g=>`<div class="small" style="margin-top:6px">${esc(g.n)}: <b>${pct(g.p)}</b></div><div class="bar"><i style="width:${g.p*100}%;background:var(--spar)"></i></div>`).join('')}</div>`;
}
document.addEventListener('click', e=>{ const a = e.target.closest('[data-act="rbno"]'); if(!a || !D) return; e.stopPropagation();
  try{ localStorage.setItem(KEY+'.rb', a.dataset.ym); }catch(e){} a.closest('.rbcard')?.remove(); }, true);

function vGoennen(){
  const st = goennStand(), s = goennSuggest(), pm = ymAdd(TODAY,-1);
  let h = `<p class="sub">Geld, das du für dich ausgeben darfst – geplant, ohne schlechtes Gewissen. Erlebnisse mit Menschen machen meist länger glücklich als Dinge.</p>`;
  if(!st){
    h += `<div class="card gcard"><h3 style="margin:0 0 6px">Gönn-Topf einrichten</h3>
      <p class="small" style="margin:0 0 10px">Ein fester Betrag pro Monat nur für dich. Nicht Gebrauchtes wird mitgenommen – so kannst du auch auf Grösseres hinsparen. Vorschlag: <b>CHF ${chf0(s.v)}</b> pro Monat${s.free>0?` (im ${MN[+ymAdd(TODAY,1).slice(5)-1]} sind CHF ${chf0(s.free)} noch nicht verteilt)`:''}.</p>
      <button class="btn pri" data-act="goennset">Gönn-Topf einrichten</button></div>`;
  } else {
    h += `<div class="card gcard"><div class="row"><h3 class="sp" style="margin:0">Gönn-Topf</h3><button class="btn sm ghost" data-act="goennset">Ändern …</button></div>
      <div class="gbig"><b class="num">CHF ${chf0(Math.max(0, st.avail))}</b><span>${st.started ? 'verfügbar' : 'ab '+ymLabel(st.from)}</span></div>
      <div class="gline small"><span>Pro Monat <b class="num">${chf0(st.amt)}</b></span>${st.carry?`<span>Übertrag <b class="num">${chf0(st.carry)}</b></span>`:''}${st.started?`<span>Diesen Monat ausgegeben <b class="num">${chf0(st.ist)}</b></span>`:''}</div>
      ${st.avail<0?`<p class="small neg" style="margin:6px 0 0">CHF ${chf0(-st.avail)} mehr ausgegeben als im Topf – das gleicht sich nächsten Monat aus.</p>`:''}
      <p class="small muted" style="margin:8px 0 0">Buchungen mit der Kategorie «Gönn-Topf (für mich)» zählen hier.</p></div>`;
  }
  // Was liegt drin – Erlebnisse zuerst
  const ws = (D.wishes||[]).filter(w=>!w.done && w.price>0).sort((a,b)=>(wtype(a)==='ding')-(wtype(b)==='ding') || (a.prio||2)-(b.prio||2) || a.price-b.price).slice(0,8);
  if(ws.length){
    const av = st ? Math.max(0, st.avail) : 0, per = st?.amt || 0;
    h += `<div class="card mt"><h3 style="margin:0 0 8px">Was liegt drin?</h3>${ws.map(w=>{ const t = WTYPE[wtype(w)] || WTYPE.ding;
      const ok = st && w.price <= av, mo = st && !ok && per>0 ? Math.ceil((w.price-av)/per) : null;
      return `<div class="gw"><span class="gwi" aria-hidden="true">${t[1]}</span><div class="sp"><b>${esc(w.name)}</b><div class="small muted">${t[0]}</div></div>
        <div class="gwr"><b class="num">CHF ${chf0(w.price)}</b><div class="small ${ok?'in':'muted'}">${!st?'':ok?'liegt drin':mo?`in ${mo} ${mo===1?'Monat':'Monaten'}`:''}</div></div></div>`; }).join('')}
      <div class="row" style="gap:6px;margin-top:10px;flex-wrap:wrap"><button class="btn sm" data-go="wuensche">+ Erlebnis</button><button class="btn sm" data-go="kaufen">+ Anschaffung</button></div></div>`;
  } else h += `<div class="card mt"><h3 style="margin:0 0 6px">Was wünschst du dir?</h3><p class="small muted" style="margin:0 0 10px">Trag Erlebnisse und Anschaffungen ein – die App zeigt, wann sie drinliegen.</p><div class="row" style="gap:6px"><button class="btn sm" data-go="wuensche">+ Erlebnis</button><button class="btn sm" data-go="kaufen">+ Anschaffung</button></div></div>`;
  h += rueckCard(pm, false);
  return h;
}

/* ---------- Doppeltes im Budget ---------- */
function dupFinds(){
  const out = [], no = D.settings.dupNo || {}, nx = ymAdd(TODAY,1), m = C.m[nx]; if(!m) return out;
  const abAcc = D.accounts.filter(a=>a.abos && !a.archived), abM = typeof aboMonthly==='function' ? aboMonthly(null) : 0;
  const abCat = D.cats.find(c=>!c.archived && /\babo/i.test(c.name||'') && (m.plan?.[c.id]||0)>0);
  if(!no.abo && abAcc.length && abM>0 && abCat) out.push({k:'abo', t:'Abos werden doppelt abgezogen',
    d:`Im Budget steht «${esc(abCat.name)}» mit CHF ${chf0(m.plan[abCat.id])}. Zusätzlich zieht der Ausblick die Abo-Liste (CHF ${chf0(abM)}/Monat) nochmals vom Konto ab. Das Budget bleibt gleich – nur der Ausblick wird richtig.`,
    b:[['dupabo','Abo-Liste nur zur Übersicht']]});
  const puf = D.cats.find(c=>!c.archived && (c.id==='unbekannt' || /puffer|unvorher/i.test(c.name||'')) && (m.plan?.[c.id]||0)>0);
  const res = D.cats.find(c=>!c.archived && c.group==='spar' && (c.id==='sparen' || /reserve|notgroschen/i.test(c.name||'')));
  if(!no.puf && puf && res) out.push({k:'puf', t:'Puffer und Reserve – zwei Töpfe für Unerwartetes',
    d:`«${esc(puf.name)}» (CHF ${chf0(m.plan[puf.id])}/Monat) und «${esc(res.name)}» decken beide Unerwartetes. Einer reicht: Unerwartetes zahlt die Reserve, der Puffer kann in den Gönn-Topf oder in die Reserve.`,
    b:[...(goennCat()?[]:[['goennpuf','Puffer → Gönn-Topf']]), ['dupres',`Puffer → «${esc(res.name)}» ab ${ymShortY(nx)}`]], res:res.id, puf:puf.id});
  const fz = D.cats.filter(c=>!c.archived && c.group==='freizeit' && !c.pw && !c.wid && (m.plan?.[c.id]||0)>0 && /hobby|freizeit|leute|restaurant|ausgang/i.test(c.name||''));
  if(!no.frz && fz.length>=3) out.push({k:'frz', t:'Freizeit klar abgrenzen',
    d:`${fz.map(c=>'«'+esc(c.name)+'»').join(', ')} überschneiden sich. Faustregel: <b>Unter Leuten</b> = alles mit anderen (Treffen, Ausgang, Essen zu zweit) · <b>Restaurant</b> = allein unterwegs, Take-away · <b>Hobbys</b> = Kurse, Sport, Material. Nichts wird automatisch verschoben.`, b:[]});
  return out;
}
function dupCard(){
  const f = dupFinds(); if(!f.length) return '';
  return `<div class="card mt dupcard"><h3 style="margin:0 0 6px">Doppeltes im Budget</h3>${f.map(x=>`<div class="dupi"><b>${x.t}</b><p class="small" style="margin:4px 0 8px">${x.d}</p>
    <div class="row" style="gap:6px;flex-wrap:wrap">${x.b.map(([a,l])=>`<button class="btn sm" data-act="${a}" data-k="${x.k}">${l}</button>`).join('')}<button class="btn sm ghost" data-act="dupno" data-k="${x.k}">${x.b.length?'So lassen':'Verstanden'}</button></div></div>`).join('')}</div>`;
}
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act="dupno"],[data-act="dupabo"],[data-act="dupres"],[data-act="goennpuf"]'); if(!a || !D) return; e.stopPropagation(); e.preventDefault();
  const act = a.dataset.act;
  if(act==='goennpuf'){ goennDialog('puffer'); return; }
  if(act==='dupno'){ (D.settings.dupNo ??= {})[a.dataset.k] = 1; save(); render(); return; }
  if(act==='dupabo'){ for(const x of D.accounts) if(x.abos) x.abos = false; save(); render(); toastMsg('Abo-Liste zählt nur noch zur Übersicht'); return; }
  if(act==='dupres'){ const f = dupFinds().find(x=>x.k==='puf'); if(!f) return; const nx = ymAdd(TODAY,1); let n = 0;
    if(!confirm('Puffer ab '+ymLabel(nx)+' in die Reserve verschieben? Das ist eine bewusste Änderung am Budget.')) return;
    for(const m of C.months.filter(m=>m>=nx)){ const v = D.plan[f.puf]?.[m]||0; if(!v) continue; D.plan[f.puf][m] = 0; (D.plan[f.res] ??= {})[m] = r2((D.plan[f.res][m]||0) + v); n++; }
    save(); render(); toastMsg(`Puffer in ${n} Monaten in die Reserve verschoben`); }
}, true);

/* ---------- Doppelte Karten entfernen ---------- */
var DUP_CARDS = {
  assistent: [/^Spartipps/, /^Prognose 12 Monate/],
  empfehlungen: [/^So solltest du dein Einkommen verteilen/],
  budgetedit: [/^Sicher kommende Abgaben/, /^Rückstellung Jahreskosten/],
};
function dupStrip(){
  const pats = DUP_CARDS[S.view]; if(!pats) return; const main = $('#main'); if(!main) return;
  main.querySelectorAll('h3, h2, summary h3').forEach(h=>{ const t = (h.textContent||'').trim(); if(!pats.some(p=>p.test(t))) return;
    const box = h.closest('.xcard, details.card, .card, .wcard, section'); if(box && box!==main) box.remove(); });
  if(S.view==='assistent' && !main.querySelector('.dupmove')) main.insertAdjacentHTML('beforeend', `<p class="small muted dupmove">Prognosen stehen unter <a class="link" data-go="prognose">Analyse › Ausblick</a>, Spartipps im <a class="link" data-go="coach">Berater › Übersicht</a>.</p>`);
  if(S.view==='budgetedit' && !main.querySelector('.dupmove')) main.insertAdjacentHTML('beforeend', `<p class="small muted dupmove">Jahreskosten, Rückstellung und alle kommenden Abgaben: <a class="link" data-go="kommend">Kommende Zahlungen ›</a></p>`);
}

/* ---------- Render: eigene Seiten, Reiter, Menü-Markierung ---------- */
var CUSTOM_V = {goennen:vGoennen, kommend:vKommend};
render = (prev => function(){
  const v = S.view;
  if(CUSTOM_V[v] && D && !S.locked){ S.view = 'autoregeln'; try{ prev.apply(this, arguments); } finally { S.view = v; }
    let html = ''; try{ html = CUSTOM_V[v](); }catch(e){ console.error(e); html = '<div class="card">Diese Seite konnte nicht angezeigt werden.</div>'; }
    $('#main').innerHTML = html; $('#fab')?.classList.add('hide'); $('#mnav')?.style.setProperty('visibility','hidden');
    try{ document.body.dataset.view = v; tabsDraw(); }catch(e){}
  } else prev.apply(this, arguments);
  try{ if(D && !S.locked) hubDecorate(); }catch(e){ console.error(e); }
})(render);
function hubDecorate(){
  const v = S.view, h = hubOf(v), main = $('#main');
  if(h){ if(hubLast[h.k]!==v){ hubLast[h.k] = v; try{ localStorage.setItem(KEY+'.hub', JSON.stringify(hubLast)); }catch(e){} }
    $('header h1').textContent = h.n;
    if(main && !main.querySelector(':scope > .hubtabs')) main.insertAdjacentHTML('afterbegin', `<div class="hubtabs" role="tablist" aria-label="${esc(h.n)}">${h.tabs.map(([id,l])=>`<a role="tab" data-go="${id}" class="${id===v?'on':''}" aria-selected="${id===v}">${l}</a>`).join('')}</div>`); }
  // Menü: Bereiche zeigen auf den zuletzt benutzten Reiter
  document.querySelectorAll('#nav1 a[data-go^="@"]').forEach(a=>{ const hb = HUBS.find(x=>'@'+x.k===a.dataset.go); if(!hb) return;
    a.dataset.hub = hb.k; a.dataset.go = hubGo(hb); a.classList.toggle('on', hb===h); });
  document.querySelectorAll('#nav1 a[data-hub]').forEach(a=>{ const hb = HUBS.find(x=>x.k===a.dataset.hub); if(hb){ a.dataset.go = hubGo(hb); a.classList.toggle('on', hb===h); } });
  dupStrip();
  if(v==='budgetedit' && main && !main.querySelector('.dupcard')){ const d = dupCard(); if(d){ const f = main.querySelector('.bflow'); if(f) f.insertAdjacentHTML('beforebegin', d); else main.insertAdjacentHTML('beforeend', d); } }
  if(v==='start' && main && !main.querySelector('.rbcard') && +TODAY_D() <= 10){ const pm = ymAdd(TODAY,-1); let no = ''; try{ no = localStorage.getItem(KEY+'.rb')||''; }catch(e){}
    if(no!==pm){ const c = rueckCard(pm, true); const g = main.querySelector('.agrid.home'); if(c){ if(g) g.insertAdjacentHTML('beforebegin', c); else main.insertAdjacentHTML('afterbegin', c); } } }
  kaufBadge();
}
var TODAY_D = () => new Date().getDate();
// Badge «liegt drin» auch am Reiter Gönnen
kaufBadge = (prev => function(){ prev(); const n = D && !S.locked ? kaufItems().filter(w=>kaufState(w)==='now').length : 0;
  document.querySelectorAll('[data-go="goennen"], #nav1 a[data-hub="goenn"]').forEach(a=>{ let b = a.querySelector('.kbadge'); if(!n){ b?.remove(); return; }
    if(!b){ b = document.createElement('span'); b.className = 'kbadge'; (a.querySelector('.i')||a).appendChild(b); } b.textContent = n; }); })(kaufBadge);
// Alte Ziele, die es nicht mehr im Menü gibt
document.addEventListener('click', e=>{ const a = e.target.closest('[data-go="home"],[data-go="monat"]'); if(!a || !D) return;
  if(a.closest('#nav1, #nav2')) return; e.stopPropagation(); e.preventDefault(); S.view = a.dataset.go==='home' ? 'coach' : 'budgetedit'; render(); }, true);
