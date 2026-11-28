/* =====================================================================
   97. GELDFLUSS AUS DEM BUDGET (1.70.0)
   - «Aus Budget aufbauen»: der Geldfluss wird genau wie die Budgettabelle
     aufgebaut – Einkommen aufs Hauptkonto, jede Budget-Zeile ein eigenes Kästchen,
     gruppiert wie in der Tabelle: Übergeordnet · Fixe Ausgaben · Persönliche
     Ausgaben · Sparen / Anlagen. Sparen geht als Übertrag auf das passende Konto.
     Was nicht zugewiesen ist, bleibt als Restbetrag auf dem Hauptkonto.
   - Werte stimmen mit dem Budget überein (Prüfung pro Monat im Kopf der Seite),
     effektive Ausgaben aus Wallet und Bankdateien stehen in jedem Kästchen.
   - Unregelmässige Ausgaben (bekannt) = deine Wünsche: im Kästchen stehen die
     eingeplanten Wünsche; «Wünsche einplanen» legt pro Wunsch den Monat fest und
     setzt das Budget dieser Zeile auf die Summe.
   - Der bisherige Geldfluss lässt sich wiederherstellen.
   ===================================================================== */

// «Abos (über Kreditkarte)» o. ä. ist keine Schuld: nur Abzahlen, Raten, Schulden zählen
isDebtC = c => !!c && (c.group==='schulden' || (/kreditkarte|abzahl|schuld|kredit(?!karte)/i.test(c.name) && !/abo|einkauf|ausgaben|über kreditkarte/i.test(c.name) && !['leben','freizeit','wunsch','spar'].includes(c.group)));
var bfIsFix = c => c.group==='fix' || c.group==='schulden' || isDebtC(c) || isTaxC(c);
var BF_G = [
  {k:'ein',  n:'Übergeordnet',          c:'#5b6b82'},
  {k:'fix',  n:'Fixe Ausgaben',         c:'#2f9a5a'},
  {k:'pers', n:'Persönliche Ausgaben',  c:'#d9822b'},
  {k:'spar', n:'Sparen / Anlagen',      c:'#2f6fbf'},
];
var bfMonths = from => Array.from({length:12}, (_,i)=>ymAdd(from, i));
var isWishCat = c => !!c && /unreg|unregelm|wünsch|wuensch|anschaff/i.test(c.name) && !/unbekannt|unvorher|puffer/i.test(c.name);
var isBufCat = c => !!c && /unbekannt|unvorher|puffer/i.test(c.name);
function bfWishCat(){ const cs = D.cats.filter(c=>!c.archived && !c.wid && isWishCat(c)); return cs.find(c=>/unreg|bekannt/i.test(c.name)) || cs[0] || null; }

// Budget-Zeilen in der Reihenfolge der Tabelle
function bfCats(from){
  const ms = bfMonths(from), has = c => ms.some(m=>(+(D.plan?.[c.id]?.[m]) || 0) > 0.5);
  return D.cats.filter(c=>!c.archived && !c.wid && c.group!=='inc' && (has(c) || isWishCat(c) || isBufCat(c)) && !(c.id==='rueck' && !has(c)));
}
// Zielkonto einer Spar-Zeile
function bfSparAcc(c, main){
  const accs = D.accounts.filter(a=>!a.archived && a.id!==main), n = String(c.name||'').toLowerCase(), g = a => accGrp(a);
  if(c.acc && accs.some(a=>a.id===c.acc)) return c.acc;
  const by = (re, grp) => accs.find(a=>re.test(a.name.toLowerCase()) && (!grp || grp.includes(g(a))));
  if(/3a|säule|saeule|vorsorge/.test(n)) return (by(/3a|säule|vorsorge/) || accs.find(a=>g(a)==='vorsorge'))?.id;
  if(/invest|anlage|depot|etf|aktie/.test(n)) return (by(/invest|anlage|depot|etf/) || accs.find(a=>g(a)==='invest'))?.id;
  if(/eigenheim|wohnung|haus(?!halt)/.test(n)) return by(/eigenheim/)?.id || null;     // sonst eigener Topf (siehe bfBuild)
  return (by(/spar|reserve|notgroschen/, ['sparen']) || accs.find(a=>g(a)==='sparen'))?.id;
}

function bfBuild(){
  const from = geltAb(), main = flpMain() || mainAcc()?.id; if(!main){ toastMsg('Zuerst ein Konto anlegen'); return; }
  const cats = bfCats(from); if(!cats.length){ toastMsg(`Für ${ymLabel(from)} gibt es noch kein Budget – zuerst unter «Budget › Planen» erfassen`); return; }
  if(D.flow?.nodes?.length) D.flowPrev = JSON.parse(JSON.stringify(D.flow));
  const id = p => p + uid(), F = {v:1, nodes:[], edges:[], since:TODAY, groups:BF_G.map(g=>({id:'g'+g.k, k:g.k, n:g.n, c:g.c})), grpDel:['konto'], grpHint:1, bf:from};
  const G = k => 'g' + k, add = n => (F.nodes.push(n), n);
  // Übergeordnet: Einkommen und Hauptkonto
  const mn = add({id:id('n'), t:'acc', ref:main, x:340, y:220, g:G('ein'), gm:1, ord:1, pl:1});
  const incs = [add({id:id('n'), t:'inc', ref:'lohn', x:40, y:220, g:G('ein'), gm:1, ord:0, pl:1})];
  (D.incSide||[]).filter(s=>Object.values(s.plan||{}).some(v=>+v>0)).forEach((s,i)=>incs.push(add({id:id('n'), t:'inc', ref:s.id, x:40, y:380+i*160, g:G('ein'), gm:1, ord:0.5, pl:1})));
  incs.forEach(n=>F.edges.push({id:id('e'), f:n.id, t:mn.id, mode:'rest'}));
  // Budget-Zeilen
  const sparTo = {};
  cats.forEach((c, i)=>{
    if(c.group==='spar'){ const a = bfSparAcc(c, main); if(a){ (sparTo[a] ??= {cats:[], ord:i}).cats.push(c.id); return; }
      // Ziel ohne eigenes Konto (z. B. Eigenheim): Topf auf dem Sparkonto
      const sa = D.accounts.find(x=>!x.archived && x.id!==main && accGrp(x)==='sparen' && !/haushalt/i.test(x.name)) || D.accounts.find(x=>!x.archived && x.id!==main && accGrp(x)==='sparen');
      if(sa){ const pn = add({id:id('n'), t:'pot', acc:sa.id, name:c.name.replace(/^sparen\s+/i,'') || c.name, start:0, startYm:TODAY, x:660, y:40, g:G('spar'), gm:1, ord:i, pl:1}); pn.ref = pn.id;
        F.edges.push({id:id('e'), f:mn.id, t:pn.id, mode:'kat', cats:[c.id]}); return; } }
    const n = add({id:id('n'), t:'exp', ref:'c:'+c.id, x:1000, y:40+i*150, ord:i, gm:1, pl:1});
    n.g = G(c.group==='spar' ? 'spar' : bfIsFix(c) ? 'fix' : 'pers');
    F.edges.push({id:id('e'), f:mn.id, t:n.id, mode:'deckt'});
  });
  for(const [a, s] of Object.entries(sparTo)){ const n = add({id:id('n'), t:'acc', ref:a, x:660, y:40, g:G('spar'), gm:1, ord:s.ord, pl:1});
    F.edges.push({id:id('e'), f:mn.id, t:n.id, mode:'kat', cats:s.cats}); }
  // Daueraufträge, die jetzt über den Geldfluss laufen, nicht doppelt rechnen
  for(const p of D.plans||[]) if(p.flow && !F.edges.some(e=>e.id===p.flow)) p.off = true;
  D.flow = F; S.flView = null; flLayoutAll(); F.nodes.forEach(n=>n.pl = 1); F.grpHint = 1;
  flSync(); save(); render();
  // nach dem ersten Zeichnen sind die Höhen der Kästchen bekannt: nochmals sauber anordnen
  setTimeout(()=>{ try{ flLayoutAll(); FL().nodes.forEach(n=>n.pl = 1); S.flView = null; save(); render(); }catch(e){} }, 60);
  const chk = bfCheck(from); toastMsg(chk.ok ? `Geldfluss aus dem Budget aufgebaut – stimmt mit dem Budget überein (${ymLabel(from)})` : `Aufgebaut – ${chk.diff.length} Abweichung${chk.diff.length===1?'':'en'}, siehe oben`);
}

// Stimmt der Geldfluss mit dem Budget? (Einkommen, jede Zeile, Restbetrag)
function bfCheck(ym){
  const P = flPlan(ym), F = FL(), inc = F.nodes.filter(n=>n.t==='inc').reduce((a,n)=>a+flIncomeOf(n, ym),0);
  const bud = c => +(D.plan?.[c.id]?.[ym]) || 0, cats = D.cats.filter(c=>!c.archived && !c.wid && c.group!=='inc');
  const sum = k => cats.filter(c=>k==='spar' ? c.group==='spar' : k==='fix' ? (c.group!=='spar' && bfIsFix(c)) : (c.group!=='spar' && !bfIsFix(c))).reduce((a,c)=>a+bud(c),0);
  const fix = sum('fix'), pers = sum('pers'), spar = sum('spar'), aus = fix + pers + spar, rest = inc - aus;
  // was der Geldfluss tatsächlich verteilt
  const main = F.nodes.find(n=>n.t==='acc' && n.ref===(flpMain() || mainAcc()?.id));
  const out = main ? flOut(main.id).reduce((a,e)=>a+(P.E[e.id]||0),0) : 0, inn = main ? flIn(main.id).reduce((a,e)=>a+(P.E[e.id]||0),0) : 0;
  const diff = []; if(main && Math.abs(out - aus) > 1) diff.push(`Geldfluss verteilt CHF ${chf0(out)}, Budget CHF ${chf0(aus)}`);
  if(main && Math.abs(inn - inc) > 1) diff.push(`Einkommen im Geldfluss CHF ${chf0(inn)} statt CHF ${chf0(inc)}`);
  return {ym, inc, fix, pers, spar, aus, rest, out, ok:!diff.length, diff};
}

/* ---------- Unregelmässige Ausgaben = Wünsche ---------- */
var bfWishes = () => (D.wishes||[]).filter(w=>!w.done && +w.price > 0 && wtype(w)!=='regel');
function bfWishSum(ym){ return bfWishes().filter(w=>w.flYm===ym).reduce((a,w)=>a+(+w.price||0),0); }
function wishPlanDialog(){
  const c = bfWishCat(); if(!c){ toastMsg('Keine Budget-Zeile für unregelmässige Ausgaben gefunden'); return; }
  const from = geltAb(), ms = bfMonths(from), W = bfWishes().sort(typeof wishOrder==='function' ? wishOrder : (a,b)=>(a.prio||2)-(b.prio||2));
  const dl = $('#dlg'); dl.classList.add('aiw'); dl.addEventListener('close', ()=>dl.classList.remove('aiw'), {once:true});
  const opt = (w) => `<option value="">noch offen</option>${ms.map(m=>`<option value="${m}" ${w.flYm===m?'selected':''}>${ymLabel(m)}</option>`).join('')}`;
  dialog(`<h3>Wünsche einplanen</h3>
    <p class="small muted" style="margin-top:-6px">Unregelmässige Ausgaben (bekannt) sind deine Wünsche. Wähle pro Wunsch den Monat – das Budget von «${esc(c.name)}» wird in jedem Monat auf die Summe der eingeplanten Wünsche gesetzt (auf 10 Franken). «Noch offen» zählt nicht.</p>
    ${W.length ? `<div class="aitbl"><table><thead><tr><th>Wunsch</th><th class="num">Preis</th><th>Monat</th></tr></thead><tbody>
      ${W.map(w=>`<tr><td><b>${esc(w.name)}</b>${w._p?.ym ? `<div class="small muted">leistbar ab ${ymLabel(w._p.ym)}</div>` : ''}</td><td class="num">${chf0(w.price)}</td><td><select class="sm" data-wpm="${w.id}">${opt(w)}</select></td></tr>`).join('')}</tbody></table></div>
      <div id="wpsum" class="aisum" style="margin-top:8px"></div>`
      : `<p>Noch keine Wünsche erfasst. Unter «Gönnen › Erlebnisse & Wünsche» oder in der Kaufliste kommen sie dazu.</p>`}
    <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button>${W.length ? '<button class="btn pri" data-dlg="ok">Einplanen</button>' : ''}</div>`,
  k=>{ if(k!=='ok') return;
    for(const s of document.querySelectorAll('[data-wpm]')){ const w = D.wishes.find(x=>x.id===s.dataset.wpm); if(!w) continue; if(s.value) w.flYm = s.value; else delete w.flYm; }
    D.plan[c.id] ??= {}; for(const m of ms){ const v = r50(bfWishSum(m)); if(v) D.plan[c.id][m] = v; else delete D.plan[c.id][m]; }
    flSync(); save(); render(); toastMsg(`Wünsche eingeplant – Budget «${c.name}» angepasst`); });
  const upd = () => { const el = $('#wpsum'); if(!el) return; const by = {};
    document.querySelectorAll('[data-wpm]').forEach(s=>{ if(!s.value) return; const w = D.wishes.find(x=>x.id===s.dataset.wpm); by[s.value] = (by[s.value]||0) + (+w?.price||0); });
    const e = Object.entries(by).sort(); el.innerHTML = e.length ? e.map(([m,v])=>`<span>${ymLabel(m)} <b>CHF ${chf0(r50(v))}</b></span>`).join('') : '<span>Noch nichts eingeplant</span>'; };
  dl.querySelectorAll('[data-wpm]').forEach(s=>s.addEventListener('change', upd)); upd();
}

// Kästchen: Wünsche bzw. Puffer zeigen
flNodeHtml = (prev => function(n, P, Fx){ let h = prev(n, P, Fx);
  try{ if(n.t==='exp' && String(n.ref).startsWith('c:')){ const c = D.cats.find(x=>x.id===n.ref.slice(2)), ym = flYm();
      if(c && c.id===bfWishCat()?.id){ const W = bfWishes(), inM = W.filter(w=>w.flYm===ym);
        const line = inM.length ? `${inM.length} Wunsch${inM.length===1?'':'e'} im ${ymLabel(ym)}: ${inM.slice(0,2).map(w=>esc(w.name)).join(', ')}${inM.length>2?' …':''}` : `${W.length} Wünsche · ${W.filter(w=>w.flYm).length} eingeplant`;
        h = h.replace(/<\/div>\s*$/, `<div class="fnwish small" data-act="flwish" role="button">${line} ›</div></div>`); }
      else if(isBufCat(c)) h = h.replace(/<\/div>\s*$/, `<div class="fnwish small muted">Puffer für Unvorhergesehenes</div></div>`); } }catch(e){}
  return h; })(flNodeHtml);
flNodeDialog = (prev => function(nid){ const r = prev.apply(this, arguments);
  try{ const n = flN(nid), c = n && String(n.ref).startsWith('c:') ? D.cats.find(x=>x.id===n.ref.slice(2)) : null;
    if(c && c.id===bfWishCat()?.id){ const ac = document.querySelector('#dlgbody .acts');
      ac?.insertAdjacentHTML('beforebegin', `<p class="small"><a class="link" data-act="flwish">Wünsche einplanen – pro Wunsch den Monat wählen ›</a></p>`); } }catch(e){}
  return r; })(flNodeDialog);

/* ---------- Seite: Knöpfe und Prüfung ---------- */
vGeldfluss = (prev => function(){ let h = prev(); if(NATIVE) return h; const F = FL();
  if(!F.nodes.length) return h.replace('<button class="btn pri" data-act="flauto">', '<button class="btn pri" data-act="flbudget">Aus dem Budget aufbauen (wie Budgettabelle)</button><button class="btn" data-act="flauto">');
  const ym = flYm(), c = bfCheck(ym);
  const mi = `<button class="flmi" data-act="flbudget"><b>Aus dem Budget aufbauen</b><span>jede Budget-Zeile ein Kästchen, gruppiert wie die Tabelle</span></button>${D.flowPrev ? '<button class="flmi" data-act="flprev"><b>Vorherigen Geldfluss wiederherstellen</b><span>den Stand vor dem letzten Aufbau</span></button>' : ''}`;
  h = h.replace(/(<details class="flmenu"><summary class="btn sm ghost">Mehr<\/summary><div class="flmp">)/, `$1${mi}`);
  const chk = `<div class="flbf small ${c.ok?'ok':'bad'}"><span>${c.ok ? '✓ Stimmt mit dem Budget' : '⚠ ' + c.diff.map(esc).join(' · ')}</span><span>Fixe Ausgaben <b>CHF ${chf0(c.fix)}</b></span><span>Persönliche Ausgaben <b>CHF ${chf0(c.pers)}</b></span><span>Sparen / Anlagen <b>CHF ${chf0(c.spar)}</b></span><span>Restbetrag (nicht zugewiesen) <b class="${c.rest<0?'neg':''}">CHF ${chf0(c.rest)}</b></span></div>`;
  return h.replace('<div class="flacts">', chk + '<div class="flacts">'); })(vGeldfluss);
CUSTOM_V.geldfluss = vGeldfluss;
document.addEventListener('click', ev=>{ const a = ev.target.closest('[data-act="flbudget"],[data-act="flprev"],[data-act="flwish"]'); if(!a || !D) return; ev.stopPropagation(); ev.preventDefault();
  a.closest('details.flmenu')?.removeAttribute('open'); const act = a.dataset.act;
  if(act==='flwish'){ $('#dlg')?.open && $('#dlg').close(); setTimeout(wishPlanDialog, 30); return; }
  if(act==='flprev'){ dialog(`<h3>Vorherigen Geldfluss wiederherstellen?</h3><p>Der jetzige Geldfluss wird durch den Stand vor dem letzten «Aus dem Budget aufbauen» ersetzt. Dein Budget bleibt, wie es ist.</p><div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Wiederherstellen</button></div>`,
    k=>{ if(k!=='ok') return; const cur = D.flow; D.flow = D.flowPrev; D.flowPrev = cur; S.flView = null; flSync(); save(); render(); toastMsg('Vorheriger Geldfluss wiederhergestellt'); }); return; }
  if(!FL().nodes.length) return bfBuild();
  dialog(`<h3>Geldfluss aus dem Budget aufbauen?</h3><p>Jede Budget-Zeile ab ${ymLabel(geltAb())} wird ein Kästchen, gruppiert wie deine Budgettabelle: <b>Übergeordnet</b> (Einkommen, Hauptkonto, Restbetrag), <b>Fixe Ausgaben</b>, <b>Persönliche Ausgaben</b> und <b>Sparen / Anlagen</b> (als Übertrag aufs passende Konto).</p>
    <p class="small muted">Der jetzige Geldfluss wird ersetzt – unter «Mehr» lässt er sich wiederherstellen. Dein Budget bleibt unverändert.</p>
    <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Aufbauen</button></div>`, k=>{ if(k==='ok') setTimeout(bfBuild, 30); });
}, true);
