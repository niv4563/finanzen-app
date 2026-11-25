/* =====================================================================
   70. REITER «KAUFEN» – KAUFLISTE MIT LEISTBAR-PRÜFUNG UND MITTEILUNG
   • Einkaufs- und Wunschliste an einem Ort (nutzt die bestehenden Wünsche, Typ «Anschaffung»).
   • Die App prüft regelmässig (beim Öffnen, beim Zurückkehren, alle 30 Min. solange offen, nach jeder Änderung),
     was jetzt leistbar ist: ohne Schulden, Reserve und Puffer anzutasten, nach Bedenkzeit.
   • Neu leistbar → Hinweis in der App und Mitteilung aufs Handy. Für später erwartete Daten plant die App
     die Mitteilung schon im Voraus (Android-Wecker, ohne Server).
   • «Preis vergleichen» öffnet toppreise.ch nur auf Knopfdruck – sonst geht nichts ins Internet.
   ===================================================================== */
TITLES.kaufen = 'Kaufen'; TITLES.budgetedit = 'Planen';
var KAUF_LS = KEY + '.kauf';
var kaufMem = (() => { try{ return JSON.parse(localStorage.getItem(KAUF_LS) || '{}'); }catch(e){ return {}; } })();
function kaufMemSave(){ try{ localStorage.setItem(KAUF_LS, JSON.stringify(kaufMem)); }catch(e){} }
var kaufItems = () => (D?.wishes||[]).filter(w=>!w.done && wtype(w)==='ding');
// Status eines Artikels aus der Wunsch-Planung
function kaufState(w){
  const p = w._p || {};
  if(p.ym && p.ym<=C.now && p.waitDays>0) return 'wait';
  if(p.ym && p.ym<=C.now) return 'now';
  if(p.ym) return 'soon';
  return 'no';
}
var kaufUrl = w => 'https://www.toppreise.ch/produktsuche?q=' + encodeURIComponent(w.name.slice(0, 80));
var isUrl = s => /^https:\/\/[^\s]+$/i.test(String(s||'').trim());

/* ---- Regelmässige Prüfung ---- */
function kaufCheck(force){
  if(!D || S.locked || !C?.m) return;
  const now = Date.now(); if(!force && kaufMem.at && now - kaufMem.at < 60000) return;
  const first = !kaufMem.st; const st = {}, fresh = [];
  for(const w of kaufItems()){ const s = kaufState(w); st[w.id] = s;
    if(!first && s==='now' && kaufMem.st[w.id]!=='now') fresh.push(w); }
  kaufMem.st = st; kaufMem.at = now;
  if(fresh.length){
    kaufMem.fresh = [...(kaufMem.fresh||[]).filter(f=>f.at > now), ...fresh.map(w=>({id:w.id, name:w.name, price:w.price, at: now + 65000}))];
    toastMsg(fresh.length===1 ? `Jetzt leistbar: ${fresh[0].name}` : `${fresh.length} Artikel auf deiner Kaufliste sind jetzt leistbar`);
  }
  kaufMemSave();
  if(fresh.length && NATIVE && D.settings.notify && D.settings.kaufNotify!==false) notifySync();
  kaufBadge();
}
setInterval(()=>kaufCheck(true), 30*60*1000);
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') setTimeout(()=>kaufCheck(true), 1500); });
save = (prev => function(){ const r = prev.apply(this, arguments); setTimeout(()=>kaufCheck(true), 300); return r; })(save);

// Mitteilungen: sofort (neu leistbar) und im Voraus (erwartetes Datum, Ende der Bedenkzeit)
notifyItems = (prev => function(){
  const out = prev.apply(this, arguments); if(D.settings.kaufNotify===false) return out;
  const det = !!D.settings.notifyDetail, now = Date.now(); let id = 1500;
  for(const f of (kaufMem.fresh||[]).filter(f=>f.at > now + 5000))
    out.push({id:id++, at:f.at, title: det ? 'Jetzt leistbar' : 'Finanzen', text: det ? `${f.name} (CHF ${chf0(f.price)}) liegt jetzt drin.` : 'Etwas auf deiner Kaufliste ist jetzt leistbar.'});
  const at9 = d => new Date(d+'T09:00:00').getTime();
  for(const w of kaufItems().slice(0, 30)){ const p = w._p||{}, s = kaufState(w); let d = null, t = '';
    if(s==='wait' && p.waitDays>0){ d = dAdd(todayIso(), p.waitDays); t = 'Bedenkzeit vorbei'; }
    else if(s==='soon' && p.ym > C.now){ d = p.ym + '-01'; t = 'Voraussichtlich leistbar'; }
    if(!d || at9(d) < now + 120000 || id > 1530) continue;
    out.push({id:id++, at:at9(d), title: det ? t : 'Finanzen', text: det ? `${w.name} (CHF ${chf0(w.price)}) – schau in der Kaufliste nach.` : 'Schau in deine Kaufliste – etwas könnte jetzt drinliegen.'});
  }
  return out.sort((a,b)=>a.at-b.at).slice(0, 55);
})(notifyItems);

/* ---- Ansicht ---- */
function vKaufen(){
  const m = C.m[C.now] || {}, items = kaufItems(), by = {now:[], wait:[], soon:[], no:[]};
  for(const w of items) by[kaufState(w)].push(w);
  const sum = l => l.reduce((t,w)=>t+(+w.price||0),0);
  const free = Math.max(0, m.frei||0);
  const why = !m.schuldenfrei ? `Zuerst Schulden abbauen (CHF ${chf0(-(m.schulden||0))}). Danach kommen deine Wünsche an die Reihe.`
    : (m.liquid||0) < C.reserveZiel ? `Zuerst die Reserve auffüllen (Ziel CHF ${chf0(C.reserveZiel)}).` : '';
  const ago = kaufMem.at ? Math.max(0, Math.round((Date.now()-kaufMem.at)/60000)) : null;
  const row = (w, s) => { const p = w._p||{}, months = p.ym && p.ym>C.now ? ymDiff(C.now, p.ym) : null;
    const when = s==='now' ? 'jetzt' : s==='wait' ? `in ${p.waitDays} T.` : s==='soon' ? (p.est?'ca. ':'')+ymShortY(p.ym) : '–';
    const sub = s==='now' ? 'Liegt drin – Reserve und Puffer bleiben unangetastet.'
      : s==='wait' ? `Leistbar – Bedenkzeit läuft noch ${p.waitDays} ${p.waitDays===1?'Tag':'Tage'}.`
      : s==='soon' ? `${months ? `In ${months} ${months===1?'Monat':'Monaten'}` : 'Bald'}${months ? ` · oder CHF ${chf0(w.price/months)} pro Monat zur Seite legen` : ''}`
      : (p.block==='schulden' ? 'Erst nach dem Schuldenabbau.' : 'Noch nicht absehbar.');
    return `<div class="kfrow k-${s}"><div class="kmain" data-act="editwish" data-id="${w.id}" role="button" tabindex="0">
        <b>${esc(w.name)}</b><span class="small muted">${sub}</span>${isUrl(w.note)?`<a class="link small" href="${esc(w.note.trim())}" target="_blank" rel="noopener noreferrer">Link öffnen</a>`:''}</div>
      <div class="kend"><b class="num">CHF ${chf0(w.price)}</b><span class="kwhen">${when}</span></div>
      <div class="kacts"><a class="btn sm ghost" href="${kaufUrl(w)}" target="_blank" rel="noopener noreferrer" title="Öffnet toppreise.ch mit dem Artikelnamen">Preis vergleichen</a>
        ${s==='now' || s==='wait' ? `<button class="btn sm pri" data-act="buywish" data-id="${w.id}">Gekauft</button>` : ''}</div></div>`; };
  const sec = (k, t, hint) => by[k].length ? `<section class="kcard"><div class="khead"><h3>${t}</h3><span class="small muted">${by[k].length} · CHF ${chf0(sum(by[k]))}</span></div>${hint?`<p class="small muted khint">${hint}</p>`:''}${by[k].map(w=>row(w,k)).join('')}</section>` : '';
  const nOn = NATIVE && D.settings.notify && D.settings.kaufNotify!==false;
  return `<div class="khero"><div><span class="small">Frei für Käufe</span><b class="num">CHF ${chf0(free)}</b><span class="small">${by.now.length ? `${by.now.length} ${by.now.length===1?'Artikel liegt':'Artikel liegen'} jetzt drin` : items.length ? 'Gerade liegt nichts drin' : 'Noch nichts auf der Liste'}</span></div>
      <button class="btn sm" data-act="kaufcheck">Jetzt prüfen</button></div>
    <form class="kadd" data-kadd="1" autocomplete="off"><input id="kname" placeholder="Was möchtest du kaufen?" aria-label="Artikel" enterkeyhint="next">
      <input id="kprice" inputmode="decimal" placeholder="CHF" aria-label="Preis CHF" enterkeyhint="done"><button class="btn pri" type="submit">Hinzufügen</button></form>
    ${why && items.length ? `<p class="khint2">${why}</p>` : ''}
    ${sec('now', 'Jetzt kaufbar')}
    ${sec('wait', 'Bedenkzeit läuft', 'Leistbar, aber noch nicht lange auf der Liste. Will ich das wirklich?')}
    ${sec('soon', 'Bald leistbar', 'In der Reihenfolge deiner Prioritäten. Das Datum rechnet mit deinem Budget.')}
    ${sec('no', 'Noch nicht absehbar')}
    ${items.length ? '' : `<section class="kcard kempty"><h3>Deine Kaufliste</h3><p class="small muted">Schreib oben hinein, was du dir kaufen möchtest – mit ungefährem Preis. Die App sagt dir, ab wann es drinliegt, und meldet sich, sobald es so weit ist.</p></section>`}
    <section class="kcard kset"><div class="khead"><h3>Melden, wenn etwas drinliegt</h3></div>
      ${NATIVE ? (D.settings.notify ? `<label class="chk"><input type="checkbox" id="kntf" ${D.settings.kaufNotify!==false?'checked':''}> Mitteilung aufs Handy, sobald ein Artikel leistbar wird oder die Bedenkzeit vorbei ist</label>`
        : `<p class="small muted">Mitteilungen sind ausgeschaltet.</p><button class="btn sm pri" data-act="kaufnotify">Mitteilungen einschalten</button>`)
        : `<p class="small muted">Mitteilungen gibt es in der Android-App. Hier siehst du den Stand bei jedem Öffnen.</p>`}
      <p class="small muted">${nOn ? 'Eingeschaltet. ' : ''}Geprüft ${ago==null ? 'noch nie' : ago<1 ? 'gerade eben' : `vor ${ago} Min.`} · beim Öffnen, alle 30 Minuten und nach jeder Änderung. Bedenkzeit: ${D.settings.wartefrist} Tage.</p>
      <p class="small"><a class="link" data-go="wuensche">Erlebnisse & Regelmässiges (Wünsche) ›</a></p></section>`;
}
render = (prev => function(){
  if(S.view==='kaufen' && D && !S.locked){ S.view = 'autoregeln'; try{ prev.apply(this, arguments); } finally { S.view = 'kaufen'; }
    $('header h1').textContent = TITLES.kaufen; $('#main').innerHTML = vKaufen();
    document.querySelectorAll('nav.side a, nav.bottom a').forEach(x=>x.classList.toggle('on', x.dataset.go==='kaufen'));
    $('#fab')?.classList.add('hide'); $('#mnav')?.style.setProperty('visibility','hidden'); try{ pvButton(); }catch(e){} kaufBadge(); return; }
  const r = prev.apply(this, arguments); kaufBadge(); setTimeout(()=>kaufCheck(false), 50); return r;
})(render);
function kaufBadge(){ const n = D && !S.locked ? kaufItems().filter(w=>kaufState(w)==='now').length : 0;
  document.querySelectorAll('[data-go="kaufen"]').forEach(a=>{ let b = a.querySelector('.kbadge'); if(!n){ b?.remove(); return; }
    if(!b){ b = document.createElement('span'); b.className = 'kbadge'; (a.querySelector('.i')||a).appendChild(b); } b.textContent = n; }); }
document.addEventListener('submit', e=>{ const f = e.target.closest('[data-kadd]'); if(!f || !D) return; e.preventDefault();
  const name = $('#kname').value.trim(), price = parseNum($('#kprice').value);
  if(!name){ $('#kname').focus(); return; } if(!price || isNaN(price) || price<=0){ $('#kprice').focus(); toastMsg('Bitte einen Preis eingeben (ungefähr reicht).'); return; }
  D.wishes.push({id:'w'+uid(), name, price, prio:2, added:todayIso(), note:'', done:null, type:'ding', wc:'sonst'});
  save(); render(); toastMsg(`«${name}» ist auf der Kaufliste`); setTimeout(()=>$('#kname')?.focus(), 50); });
document.addEventListener('click', e=>{ const a = e.target.closest('[data-act="kaufcheck"],[data-act="kaufnotify"]'); if(!a || !D) return; e.stopPropagation();
  if(a.dataset.act==='kaufcheck'){ kaufCheck(true); render(); toastMsg('Kaufliste geprüft'); }
  else notifyToggle(true); }, true);
document.addEventListener('change', e=>{ if(e.target.id==='kntf' && D){ D.settings.kaufNotify = e.target.checked; save(); notifySync(); } });
// In der Android-App externe Seiten im Browser öffnen (nicht in der App)
document.addEventListener('click', e=>{ const a = e.target.closest('a[target="_blank"][href^="https://"]'); if(!a || !NATIVE) return; e.preventDefault(); e.stopPropagation(); location.href = a.href; }, true);
// Neue Wünsche aus der Kaufliste: Typ «Anschaffung» vorwählen
wishDialog = (prev => function(w){ if(!w && S.view==='kaufen') S.wtype = 'ding'; return prev(w); })(wishDialog);
// Menü: Kaufen ganz oben bei «Geld planen»
(() => { const g = NAV4.find(s=>s[0]==='Geld planen') || NAV4[0]; if(!NAV4.some(s=>s[1].some(i=>i[0]==='kaufen'))) g[1].unshift(['kaufen', CI.cart ? ci(CI.cart) : ICON.star, 'Kaufen']); })();
