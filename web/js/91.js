/* =====================================================================
   91. ÜBERSICHT · PLANEN · GELDFLUSS STIMMEN ÜBEREIN + BUDGET AUS ZAHLUNGEN (1.65.0)
   • Eine Quelle: das Budget (Planen). Übersicht und Geldfluss rechnen daraus.
     Die «Abstimmung» prüft für einen Monat, ob alle drei dasselbe sagen, und zeigt jede
     Abweichung mit Grund – «Alles abgleichen» behebt sie:
       – Budget-Kategorien, die im Geldfluss fehlen
       – Spar-Kategorien, die im Geldfluss als Ausgabe statt als Übertrag zählen
       – feste Überträge aufs Spar-/Vorsorgekonto, die im Budget fehlen (→ eigene Kategorie)
       – Abzahlung der Kreditkarte: Budget und Geldfluss gleich, nie doppelt
       – Einkommen im Geldfluss
   • Budget aus Zahlungen: schlägt für jede Kategorie einen Betrag aus den Buchungen der
     letzten 12 (bzw. 24) Monate vor – regelmässig (Schnitt), schwankend, oder einmalig/jährlich
     (z. B. Gemeinde-, Staats- und Bundessteuer → pro Monat zurücklegen), mit Aufschlüsselung.
   ===================================================================== */

/* ---------- Kreditkarte nie doppelt: Abzahlung fliesst über den Draht zur Karte ---------- */
var kkFlowOn = () => +PL().kkAmt > 0 && kkTot() > 0.5 && FL().nodes.some(n=>{ const a = flAccOf(n); return a && accGrp(a)==='karte' && flIn(n.id).some(e=>e.mode==='deckt'); });
flExpCats = (prev => function(n){ const r = prev(n); if(!kkFlowOn()) return r; return r.filter(c=>{ const x = D.cats.find(y=>y.id===c); return !x || !isDebtC(x); }); })(flExpCats);
flCoverage = (prev => function(ym){ const R = prev(ym); if(!kkFlowOn()) return R;
  const debt = R.miss.filter(m=>m.k==='cat' && isDebtC(D.cats.find(c=>c.id===m.c)||{}));
  if(debt.length){ R.miss = R.miss.filter(m=>!debt.includes(m)); R.ok += debt.reduce((a,m)=>a+m.v,0); R.pct = R.tot ? Math.round(R.ok/R.tot*100) : 100; }
  return R; })(flCoverage);
var kkPlanned = ym => FL().nodes.filter(n=>{ const a = flAccOf(n); return a && accGrp(a)==='karte'; }).reduce((s,n)=>s+kkExtra(flAccOf(n), ym),0);

/* ---------- Abstimmung ---------- */
var spAccOk = a => !/r[üu]ckstell|jahreskosten/i.test(a.name||'');
function syncCheck(ym){
  ym = ym || TODAY; const F = FL(), out = [], bud = c => +(D.plan?.[c]?.[ym]) || 0;
  const cats = D.cats.filter(c=>!c.archived && !c.wid && c.group!=='inc');
  const incPlan = (+D.income?.[ym]||0), incFlow = F.nodes.filter(n=>n.t==='inc').reduce((a,n)=>a+flIncomeOf(n, ym),0);
  const P = flPlan(ym), cov = flCoverage(ym);
  // 1. Einkommen
  if(Math.abs(incPlan - incFlow) > 1) out.push({k:'inc', t:'Einkommen fehlt im Geldfluss', d:`Planen: CHF ${chf0(incPlan)} · Geldfluss: CHF ${chf0(incFlow)}.`});
  // 2. Kategorien nicht verbunden
  const miss = cov.miss.filter(m=>m.k==='cat');
  if(miss.length) out.push({k:'cov', t:`${miss.length} Budget-Kategorie${miss.length===1?'':'n'} nicht im Geldfluss`, d:`${miss.slice(0,5).map(m=>m.t).join(', ')}${miss.length>5?' …':''} – zusammen CHF ${chf0(miss.reduce((a,m)=>a+m.v,0))}.`});
  // 3. Spar-Kategorien als Ausgabe
  const inExp = new Set(F.nodes.filter(n=>n.t==='exp').flatMap(n=>flExpCats(n)));
  const sparExp = cats.filter(c=>c.group==='spar' && inExp.has(c.id) && [0,1,2].some(i=>+(D.plan?.[c.id]?.[ymAdd(ym,i)])>0));
  if(sparExp.length) out.push({k:'spar', cats:sparExp.map(c=>c.id), t:`${sparExp.length} Spar-Kategorie${sparExp.length===1?' zählt':'n zählen'} im Geldfluss als Ausgabe`, d:`${sparExp.map(c=>c.name).join(', ')} – im Budget ist das Sparen, im Geldfluss sollte es ein Übertrag auf dein Konto sein.`});
  // 4. Feste Überträge aufs Spar-/Vorsorge-/Investkonto, die im Budget fehlen
  const fixS = F.edges.filter(e=>{ const f = flN(e.f), t = flN(e.t); if(!f || !t || f.t==='inc' || t.t!=='acc' || e.mode==='kat' || e.mode==='deckt') return false; const a = flAccOf(t); return a && ['sparen','vorsorge','invest'].includes(accGrp(a)) && (P.E[e.id]||0) > 0.5 && e.mode!=='rest'; });
  if(fixS.length) out.push({k:'fix', edges:fixS.map(e=>e.id), t:`${fixS.length} Übertr${fixS.length===1?'ag':'äge'} aufs Sparen ${fixS.length===1?'fehlt':'fehlen'} im Budget`, d:`${fixS.map(e=>`${flName(flN(e.f))} → ${flName(flN(e.t))} CHF ${chf0(P.E[e.id])}`).join(' · ')}. In Planen erscheint das Sparen dann nicht.`});
  // 5. Kreditkarte
  const debtC = cats.filter(isDebtC), kkx = kkPlanned(ym), kkBud = debtC.reduce((a,c)=>a+bud(c.id),0);
  if(kkFlowOn() && Math.abs(kkx - kkBud) > 1) out.push({k:'kk', t:'Abzahlung der Kreditkarte: Budget und Geldfluss verschieden', d:`Geldfluss: CHF ${chf0(kkx)} Abzahlung · Budget${debtC.length?` «${debtC.map(c=>c.name).join(', ')}»`:''}: CHF ${chf0(kkBud)}.`});
  else if(!kkFlowOn() && kkTot() > 0.5 && kkBud > 0.5 && +PL().kkAmt !== kkBud) out.push({k:'kk2', amt:kkBud, t:'Budget zum Abzahlen ist nicht im Geldfluss', d:`Im Budget stehen CHF ${chf0(kkBud)} fürs Abzahlen der Kreditkarte, im Geldfluss ist kein Abzahlbetrag gesetzt.`});
  // Summen
  const budTot = cats.reduce((a,c)=>a+bud(c.id),0), sparBud = cats.filter(c=>c.group==='spar').reduce((a,c)=>a+bud(c.id),0);
  const sm = flSum(ym, P);
  return {ym, list:out, ok:!out.length, incPlan, incFlow, budTot, sparBud, restPlan:incPlan - budTot, sm};
}
function syncFix(){
  const F = FL(), R = syncCheck(syncYm()), main = flpMain(), mn = () => flpAccNode(main) || flpEnsureAcc(main, 340, 220); let n = 0; F.since ||= TODAY;
  const months = (C?.months||[]).filter(m=>m>=TODAY);
  for(const x of R.list){
    if(x.k==='spar'){ for(const c of x.cats){ const cat = D.cats.find(y=>y.id===c), accs = D.accounts.filter(a=>!a.archived);
        const is3 = /3a|s[äa]ule|vorsorge/i.test(cat.name), inv = /invest|etf|aktie|fonds|depot|krypto/i.test(cat.name);
        let acc = accs.find(a=>a.id===cat.acc) || (is3 ? accs.find(a=>accGrp(a)==='vorsorge') : inv ? accs.find(a=>accGrp(a)==='invest') : null)
          || accs.filter(a=>accGrp(a)==='sparen' && spAccOk(a)).sort((a,b)=>accRate(b)-accRate(a))[0];
        if(!acc) continue; const t = flpEnsureAcc(acc.id, mn().x+330, mn().y-160); let e = F.edges.find(y=>y.f===mn().id && y.t===t.id);
        if(!e){ if(flCanLink(mn().id, t.id)) continue; e = {id:'e'+uid(), since:TODAY, f:mn().id, t:t.id, mode:'kat', cats:[]}; F.edges.push(e); }
        if(e.mode!=='kat'){ // fester Draht: Betrag kommt dann aus Budget = bisheriger Draht + Kategorie
          const extra = 'sp'+uid(); D.cats.push({id:extra, name:`Übertrag ${acc.name}`, group:'spar'}); D.plan[extra] = {};
          for(const m of months){ const v = flPlan(m).E[e.id] || 0; if(v) D.plan[extra][m] = r2(v); } e.mode = 'kat'; e.cats = [extra]; delete e.a; delete e.m; }
        if(!e.cats.includes(c)) e.cats.push(c); n++; } }
    if(x.k==='fix'){ for(const id of x.edges){ const e = flE(id); if(!e) continue; const t = flN(e.t), a = flAccOf(t), c = {id:'sp'+uid(), name:`Übertrag ${a?.name||flName(t)}`, group:'spar'};
        D.cats.push(c); D.plan[c.id] = {}; for(const m of months){ const v = flPlan(m).E[e.id] || 0; if(v) D.plan[c.id][m] = r2(v); }
        e.mode = 'kat'; e.cats = [c.id]; delete e.a; delete e.m; delete e.pct; n++; } }
    if(x.k==='kk'){ let c = D.cats.find(y=>!y.archived && !y.wid && isDebtC(y));
      if(!c){ c = {id:'kk'+uid(), name:'Kreditkarte abzahlen', group:'schulden'}; D.cats.push(c); }
      D.plan[c.id] ??= {}; for(const m of months){ const v = kkPlanned(m); if(v > 0.5) D.plan[c.id][m] = r2(v); else delete D.plan[c.id][m]; } n++; }
    if(x.k==='kk2'){ PL().kkAmt = r2(x.amt); n++; }
  }
  try{ calc(); }catch(e){}
  if(R.list.some(x=>x.k==='cov' || x.k==='inc')) flCoverFix(); else { flpCache.k = null; flSync(); save(); render(); }
  toastMsg(n || R.list.length ? 'Abgeglichen – Übersicht, Planen und Geldfluss stimmen überein' : 'Schon alles gleich');
}
var syncYm = () => S.view==='geldfluss' ? (flYm() < TODAY ? TODAY : flYm()) : (S.view==='budgetedit' || S.view==='budget') ? (S.ym && S.ym >= TODAY ? S.ym : TODAY) : TODAY;
function syncCardHtml(compact){
  if(!D?.flow?.nodes?.length) return ''; const R = syncCheck(syncYm());
  const nums = `<span>Einkommen <b>CHF ${chf0(R.incPlan)}</b></span><span>Budget <b>CHF ${chf0(R.budTot)}</b></span><span>davon Sparen <b>CHF ${chf0(R.sparBud)}</b></span><span>noch nicht verteilt <b class="${R.restPlan<-1?'neg':''}">CHF ${chf0(R.restPlan)}</b></span>`;
  if(R.ok) return `<div class="card synccard ok" id="synccard"><div class="row" style="gap:10px;align-items:center;flex-wrap:wrap"><b class="syncok">✓ Übersicht, Planen und Geldfluss stimmen überein · ${ymLabel(R.ym)}</b><span class="sp"></span><button class="btn sm" data-act="bvor">Budget aus Zahlungen</button></div>${compact?'':`<div class="syncnums small">${nums}</div>`}</div>`;
  return `<div class="card synccard" id="synccard"><div class="row" style="gap:10px;align-items:center;flex-wrap:wrap"><h3 style="margin:0">Abstimmung · ${ymLabel(R.ym)}: ${R.list.length} Abweichung${R.list.length===1?'':'en'}</h3><span class="sp"></span><button class="btn sm" data-act="bvor">Budget aus Zahlungen</button><button class="btn sm pri" data-act="syncfix">Alles abgleichen</button></div>
    <div class="syncnums small">${nums}</div>
    ${R.list.map(x=>`<div class="syncrow"><b>${esc(x.t)}</b><span class="small muted">${esc(x.d)}</span></div>`).join('')}
    <p class="small muted" style="margin:6px 0 0">Das Budget unter «Planen» ist die Grundlage. «Alles abgleichen» verbindet fehlende Kategorien, macht aus Spar-Kategorien Überträge, nimmt feste Überträge ins Budget auf und setzt die Abzahlung der Kreditkarte an beiden Orten gleich.</p></div>`;
}
render = (prev => function(){ const r = prev.apply(this, arguments);
  try{ if(D && !S.locked && S.view==='geldfluss') document.querySelector('#main .flcov')?.remove();
    if(D && !S.locked && ['budget','budgetedit','geldfluss'].includes(S.view) && !$('#synccard')){ const h = syncCardHtml(S.view==='budget'); if(h){ const m = $('#main'), tabs = m?.querySelector('.hubtabs'); tabs ? tabs.insertAdjacentHTML('afterend', h) : m?.insertAdjacentHTML('afterbegin', h); } } }catch(e){}
  return r; })(render);

/* ---------- Budget aus vergangenen Zahlungen ---------- */
// Bekannte Preise: Daueraufträge, Jahreskosten und Abos – genauer als der Schnitt aus Buchungen
var BV_F = {M:1, W:52/12, Q:1/3, H:1/6, J:1/12};
function bvKnown(c){ const items = [], same = x => x && bhKey(x)===c.id;
  for(const p of (D.plans||[])) if(p.type!=='in' && p.type!=='tr' && !p.off && !p.flow && same(p.cat) && (!p.end || p.end >= todayIso())) items.push({n:p.name||'Dauerauftrag', v:(+p.amount||0)*(BV_F[p.freq]||1), w:p.freq==='M'?'Dauerauftrag':'Dauerauftrag '+freqName(p.freq)});
  for(const y of (D.yearly||[])) if(same(y.cat)) items.push({n:y.name||'Jahreskosten', v:(+y.amount||0)/12, w:`Jahreskosten ${chf0(y.amount)}`});
  const aboCat = /(^|\s)abos?\b|abonnement|streaming/i.test(c.name);
  for(const a of (D.abos||[])) if(a.active!==false && (same(a.cat) || (aboCat && !a.cat))) items.push({n:a.name, v:aboMonthly(a), w:a.interval==='J'?`Abo ${chf0(a.price)}/Jahr`:'Abo'});
  return {items, sum:items.reduce((s,i)=>s+i.v,0)}; }
function bvorCalc(){
  const ms12 = Array.from({length:12}, (_,i)=>ymAdd(TODAY, i-12)), ms24 = Array.from({length:24}, (_,i)=>ymAdd(TODAY, i-24)), nx = ymAdd(TODAY,1);
  const by = {}, sub = {}, pays = {};
  for(const ym of ms24) for(const t of flMonthTx(ym)){ const v = kSpend(t); if(!v) continue; const c = bhKey(t.c); if(!c || c==='_offen') continue;
    ((by[c] ??= {})[ym] = (by[c][ym]||0) + v);
    if(ym >= ms12[0]){ const s = catName(t.c); ((sub[c] ??= {})[s] = (sub[c][s]||0) + v); (pays[c] ??= []).push({d:t.d, v, s}); } }
  const first = D.tx.reduce((a,t)=>t.d && !t.planned && !t.vorm && t.d < a ? t.d : a, '9999').slice(0,7);
  const av12 = ms12.filter(m=>m>=first), nA = av12.length || 1, out = [], seen = new Set();
  for(const c of D.cats.filter(c=>!c.archived && !c.wid && c.group!=='inc' && c.group!=='spar' && !isDebtC(c))){
    if(seen.has(c.id)) continue; seen.add(c.id);
    const v12 = av12.map(m=>by[c.id]?.[m]||0), v0 = ms24.slice(0,12).filter(m=>m>=first).map(m=>by[c.id]?.[m]||0), tot = v12.reduce((a,b)=>a+b,0), tot0 = v0.reduce((a,b)=>a+b,0);
    const cur = +(D.plan?.[c.id]?.[nx]) || 0, n = v12.filter(x=>x>1).length; if(tot < 20 && !cur && !(bvKnown(c).sum > 0.5)) continue;
    const share = n/nA, mx = Math.max(0, ...v12), lumpy = isTaxC(c) || n <= Math.max(2, nA/3) || (share < 0.75 && mx > 3*tot/nA);
    let prop, kind, basis;
    if(tot < 20){ prop = 0; kind = 'keine'; basis = `In den letzten ${nA} Monaten keine Zahlungen.`; }
    else if(lumpy){ const yr = nA >= 10 ? 12 : nA, base = isTaxC(c) && v0.length >= 10 && tot0 > tot*1.2 ? (tot+tot0)/2 : tot; prop = r10(base/yr); kind = 'einmalig/jährlich';
      const P = (pays[c.id]||[]).sort((a,b)=>a.d.localeCompare(b.d)), grp = {}; P.forEach(p=>{ const k = p.d.slice(0,7); grp[k] = (grp[k]||0) + p.v; });
      basis = `Bezahlt im ${Object.entries(grp).slice(-6).map(([m,v])=>`${MN[+m.slice(5)-1]} ${chf0(v)}`).join(', ')} → zusammen CHF ${chf0(tot)}${base!==tot?` (Vorjahr ${chf0(tot0)}, Schnitt beider Jahre)`:''}${yr<12?` in ${yr} Monaten`:''} – jeden Monat CHF ${chf0(prop)} zurücklegen`; }
    else if(share >= 0.75){ const l6a = v12.slice(-6), l6 = l6a.reduce((a,b)=>a+b,0)/(l6a.length||1); prop = r10(0.5*tot/nA + 0.5*l6); kind = 'regelmässig'; basis = `${n} von ${nA} Monaten · Ø CHF ${chf0(tot/nA)}, letzte 6 Monate Ø CHF ${chf0(l6)}`; }
    else { prop = r10(tot/nA); kind = 'schwankend'; basis = `${n} von ${nA} Monaten, CHF ${chf0(Math.min(...v12.filter(x=>x>1)))}–${chf0(mx)} · Ø CHF ${chf0(tot/nA)}`; }
    const kn = bvKnown(c);
    if(kn.sum > 0.5){ const hist = tot/nA; prop = r10(kn.sum); kind = 'Preis bekannt'; basis = `${kn.items.map(i=>`${i.n} ${chf0(i.v)}/Mt. (${i.w})`).join(' · ')}${tot>20?` · bisher bezahlt Ø CHF ${chf0(hist)}${hist > kn.sum*1.15 ? ' – mehr als die bekannten Preise, evtl. fehlt etwas' : ''}`:''}`; }
    const sb = Object.entries(sub[c.id]||{}).filter(([s])=>s!==c.name).sort((a,b)=>b[1]-a[1]);
    const diff = prop - cur, pre = Math.abs(diff) > Math.max(20, cur*0.1) && kind!=='keine';
    out.push({c:c.id, name:c.name, g:gSec(c).n, cur, prop, kind, basis, sub:sb, tot, pre, tax:isTaxC(c)});
  }
  // Einkommen: Lohn (Median) und Sonderzahlungen (z. B. 13. Monatslohn) im gleichen Monat wie letztes Jahr
  const inc = ms12.map(m=>flpIncAll(m)), med = kMed(inc.filter(x=>x>500)) || 0, incR = [];
  if(med){ for(let i=1;i<=12;i++){ const m = ymAdd(TODAY,i), last = inc[ms12.indexOf(ymAdd(m,-12))] ?? 0, bonus = last > med*1.4 ? last - med : 0, p = r10(med + bonus), cur = +(D.income?.[m])||0; incR.push({m, p, cur, bonus}); } }
  return {rows: out.sort((a,b)=>(b.pre-a.pre) || (b.tax-a.tax) || Math.abs(b.prop-b.cur) - Math.abs(a.prop-a.cur)), inc:incR, med, nx};
}
function bvorDialog(){
  const R = bvorCalc(), from = R.nx, incDiff = R.inc.some(x=>Math.abs(x.p-x.cur) > Math.max(50, x.cur*0.05));
  const dl = $('#dlg'); dl.classList.add('aiw'); dl.addEventListener('close', ()=>dl.classList.remove('aiw'), {once:true});
  const row = (x, i) => `<tr class="${x.tax?'bvtax':''}"><td><label class="chk" style="margin:0"><input type="checkbox" class="bvc" data-i="${i}" ${x.pre?'checked':''}> <b>${esc(x.name)}</b></label><span class="small muted bvg">${esc(x.g)} · ${x.kind}</span>
      <div class="small muted">${esc(x.basis)}</div>${x.sub.length?`<div class="small bvsub">${x.sub.slice(0,6).map(([s,v])=>`${esc(s)} <b>${chf0(v)}</b>`).join(' · ')}</div>`:''}</td>
    <td class="num">${x.cur?chf0(x.cur):'–'}</td><td class="num"><input class="bvi" data-i="${i}" inputmode="decimal" value="${chf0(x.prop).replace(/'/g,'')}" aria-label="Vorschlag ${esc(x.name)}"></td></tr>`;
  dialog(`<h3>Budget aus deinen Zahlungen</h3>
    <p class="small muted" style="margin-top:-6px">Aus deinen Buchungen der letzten 12 Monate (bei Steuern auch das Vorjahr; Monate vor deiner ersten Buchung zählen nicht). Regelmässiges: Schnitt mit mehr Gewicht auf den letzten 6 Monaten. Einmal oder wenige Male im Jahr (z. B. Gemeinde-, Staats- und Bundessteuer): Jahresbetrag geteilt durch 12 – so legst du jeden Monat gleich viel zurück. Angehakte Beträge gelten ab ${ymLabel(from)} in Planen, Übersicht und Geldfluss.</p>
    ${R.med ? `<label class="chk"><input type="checkbox" id="bvinc" ${incDiff?'checked':''}> <b>Einkommen</b> ab ${ymLabel(from)}: Lohn ca. CHF ${chf0(R.med)}${R.inc.some(x=>x.bonus)?` + Sonderzahlung im ${R.inc.filter(x=>x.bonus).map(x=>MN[+x.m.slice(5)-1]).join(', ')} (wie letztes Jahr)`:''} <span class="muted">· bisher geplant CHF ${chf0(R.inc[0]?.cur||0)}</span></label>` : ''}
    <div class="aitbl"><table><thead><tr><th>Kategorie</th><th class="num">Budget bisher</th><th class="num">Vorschlag / Monat</th></tr></thead><tbody>${R.rows.map(row).join('')}</tbody></table></div>
    <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn" data-dlg="ok">Angehakte übernehmen</button><button class="btn pri" data-dlg="all">Alle übernehmen</button></div>`,
  k=>{ dl.classList.remove('aiw'); if(k==='all'){ document.querySelectorAll('.bvc').forEach(x=>x.checked = true); const ib = $('#bvinc'); if(ib) ib.checked = true; } else if(k!=='ok') return; const months = (C?.months||[]).filter(m=>m>=from); let n = 0;
    for(const cb of document.querySelectorAll('.bvc:checked')){ const x = R.rows[+cb.dataset.i], v = parseNum(document.querySelector(`.bvi[data-i="${cb.dataset.i}"]`).value);
      if(!isFinite(v) || v<0) continue; D.plan[x.c] ??= {}; for(const m of months){ if(v) D.plan[x.c][m] = r2(v); else delete D.plan[x.c][m]; } n++; }
    if($('#bvinc')?.checked){ for(const x of R.inc) D.income[x.m] = x.p; n++; }
    try{ calc(); }catch(e){} save(); render(); setTimeout(()=>toastMsg(`${n} Beträge übernommen – Übersicht, Planen und Geldfluss sind nachgeführt`), 30); });
}

document.addEventListener('click', ev=>{ const a = ev.target.closest('[data-act="syncfix"],[data-act="bvor"]'); if(!a || !D) return; ev.stopPropagation(); ev.preventDefault();
  if(a.dataset.act==='syncfix') return syncFix(); if($('#dlg').open) $('#dlg').close(); setTimeout(bvorDialog, 30); }, true);

/* =====================================================================
   SAMMEL-KASTEN (fiktiv): z. B. «Steuern» – alle Steuern zusammen.
   Jeden Monat fliesst das Budget der gewählten Kategorien hinein (auf dem Konto, wo das Geld
   liegt), hinaus gehen die echten Zahlungen (Gemeinde-, Staats-, Bundessteuer …) in den Monaten,
   in denen sie letztes Jahr fällig waren. Der Kasten zeigt Stand und ob es für die nächste
   Zahlung reicht.
   ===================================================================== */
var isColl = n => !!n && n.t==='pot' && !!n.virt;
function collDue(cats){ // erwartete Zahlungen der nächsten 12 Monate = gleiche Monate im letzten Jahr
  const m = {}; for(let i=1; i<=12; i++){ const ym = ymAdd(TODAY, i), last = ymAdd(ym, -12); const v = flSpend(cats, null, last); if(v > 1) m[ym] = r10(v); } return m; }
function collDialog(nid, preset){
  const F = FL(), n = nid ? flN(nid) : null, name = n?.name || preset?.name || 'Steuern';
  const sel = new Set(n?.cats || preset?.cats || D.cats.filter(c=>!c.archived && !c.wid && isTaxC(c)).map(c=>c.id));
  const accs = D.accounts.filter(a=>!a.archived && accGrp(a)!=='karte'), defA = n?.acc || (accs.find(a=>/steuer|r[üu]ckstell/i.test(a.name)) || accs.find(a=>a.id===flpMain()) || accs[0])?.id;
  const nx = ymAdd(TODAY,1), bud = c => +(D.plan?.[c]?.[nx]) || 0;
  const list = D.cats.filter(c=>!c.archived && !c.wid && c.group!=='inc' && c.group!=='spar').sort((a,b)=>(sel.has(b.id)-sel.has(a.id)) || (bud(b.id)>0)-(bud(a.id)>0) || a.name.localeCompare(b.name));
  dialog(`<h3>${n ? esc(n.name) : 'Sammel-Kasten'}</h3>
    <p class="small muted" style="margin-top:-6px">Ein Kasten nur zum Zurücklegen – z. B. <b>Steuern</b>: Jeden Monat kommt der Budgetbetrag hinein, die Rechnungen (Gemeinde-, Staats-, Bundessteuer …) werden daraus bezahlt. Der Kasten zeigt, ob es für die nächste Zahlung reicht. Er ist kein eigenes Konto – das Geld liegt auf dem gewählten Konto.</p>
    <div class="adgrid"><label class="f">Name<input id="cxn" value="${esc(name)}" placeholder="z. B. Steuern"></label>
    <label class="f">Geld liegt auf<select id="cxa">${accs.map(a=>`<option value="${a.id}" ${a.id===defA?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label>
    <label class="f">Schon zurückgelegt (CHF)<input id="cxs" inputmode="decimal" value="${n?.start?chf(n.start):''}" placeholder="0"></label></div>
    <h4 class="flph">Was daraus bezahlt wird</h4><p class="small muted" style="margin:0 0 4px">Das Budget dieser Kategorien fliesst jeden Monat in den Kasten.</p>
    <div class="xcl">${list.map(c=>`<label class="chk"><input type="checkbox" class="cxc" value="${c.id}" ${sel.has(c.id)?'checked':''}> ${esc(c.name)} <span class="muted small">${bud(c.id)?'CHF '+chf0(bud(c.id))+'/Mt.':''}</span></label>`).join('')}</div>
    ${n ? acts(false, 'Kasten entfernen') : `<div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Kasten anlegen</button></div>`}`,
  k=>{ if(k==='cancel') return;
    if(k==='del'){ const outs = flOut(n.id).map(e=>e.t); F.edges = F.edges.filter(e=>e.f!==n.id && e.t!==n.id); F.nodes = F.nodes.filter(x=>x!==n && !(outs.includes(x.id) && isExt(x) && x.coll)); flCoverFix(); return; }
    if(k!=='ok') return; const nm = $('#cxn').value.trim(), cats = [...document.querySelectorAll('.cxc:checked')].map(i=>i.value), st = parseNum($('#cxs').value||'0');
    if(!nm){ $('#cxn').style.borderColor = 'var(--bad)'; return false; } if(!cats.length){ toastMsg('Bitte mindestens eine Kategorie wählen.'); return false; }
    collSave(n, nm.slice(0,40), cats, $('#cxa').value, isFinite(st) ? st : 0); });
}
function collSave(n, name, cats, acc, start){
  const F = FL(); F.since ||= TODAY; const main = flpAccNode(flpMain()) || flpEnsureAcc(flpMain(), 340, 220);
  if(!n){ n = {id:'n'+uid(), t:'pot', ref:'', virt:1, x:main.x+360, y:main.y+200}; n.ref = n.id; F.nodes.push(n); }
  Object.assign(n, {name, cats, acc, start, startYm:n.startYm || TODAY});
  // Kategorien gehören nur noch diesem Kasten: aus anderen Spar-Drähten, Einzel-Kästchen und Empfängern lösen
  for(const e of F.edges) if(e.cats && e.t!==n.id) e.cats = e.cats.filter(c=>!cats.includes(c));
  for(const c of cats){ const own = F.nodes.find(x=>x.t==='exp' && x.ref==='c:'+c); if(own){ F.edges = F.edges.filter(e=>e.t!==own.id); F.nodes = F.nodes.filter(x=>x!==own); } }
  let pay = F.nodes.find(x=>isExt(x) && x.coll===n.id) || F.nodes.find(x=>isExt(x) && (x.cats||[]).some(c=>cats.includes(c)));
  for(const x of F.nodes.filter(x=>isExt(x) && x!==pay)) x.cats = (x.cats||[]).filter(c=>!cats.includes(c));
  if(!pay){ const id = uid(); pay = {id:'n'+id, t:'exp', ref:'x:'+id, ext:/steuer/i.test(name)?'steuern':'anderes', name:/steuer/i.test(name)?'Steueramt':`${name} bezahlen`, det:{}, x:n.x+360, y:n.y}; F.nodes.push(pay); }
  Object.assign(pay, {cats, abos:[], coll:n.id});
  // hinein: Budget der Kategorien vom Hauptkonto; hinaus: Zahlungen wie letztes Jahr
  F.edges = F.edges.filter(e=>!(e.t===n.id) && !(e.t===pay.id));
  F.edges.push({id:'e'+uid(), since:TODAY, f:main.id, t:n.id, mode:'kat', cats:[...cats]});
  F.edges.push({id:'e'+uid(), since:TODAY, f:n.id, t:pay.id, mode:'fix', a:0, m:collDue(cats)});
  flLayout(); flpCache.k = null; flSync(); save(); render(); toastMsg(`Kasten «${name}» angelegt`);
}
flNodeDialog = (prev => function(nid){ const n = flN(nid); if(isColl(n)) return collDialog(nid); return prev(nid); })(flNodeDialog);
// Stand, nächste Zahlung und ob es reicht
function collInfo(n){
  const s = flPot(n), outE = flOut(n.id); let bal = s.eff, next = null, short = 0;
  for(let i=1, ym=ymAdd(TODAY,1); i<=12; i++, ym=ymAdd(ym,1)){ const P = flPlan(ym); bal += flIn(n.id).reduce((a,e)=>a+(P.E[e.id]||0),0); const o = outE.reduce((a,e)=>a+(P.E[e.id]||0),0);
    if(o > 1 && !next) next = {ym, v:o, bal}; bal -= o; if(bal < -1 && !short) short = {ym, v:-bal}; }
  return {eff:s.eff, next, short};
}
flNodeHtml = (prev => function(n, P, Fx){ let h = prev(n, P, Fx); if(!isColl(n)) return h; const I = collInfo(n);
  h = h.replace(`class="fnode fn-pot"`, `class="fnode fn-pot fn-coll"`).replace(/<span class="fnk">[^<]*<\/span>/, '<span class="fnk">Kasten · zurücklegen</span>');
  return h.replace(/<div class="fnv2">Stand ca\.[\s\S]*?<\/div>/, `<div class="fnv2">Stand ca. CHF ${chf0(I.eff)}${I.next?`<br>nächste Zahlung ${MN[+I.next.ym.slice(5)-1]} ca. ${chf0(I.next.v)}`:''}</div><div class="fnv2 ${I.short?'neg':'pos'}">${I.short?`fehlt im ${ymLabel(I.short.ym)} CHF ${chf0(I.short.v)}`:'reicht ✓'}</div>`); })(flNodeHtml);
// Summen: Zurücklegen im Kasten ist eine Ausgabe (wie im Budget), nicht Sparen; Zahlungen aus dem Kasten nicht doppelt
flSum = (prev => function(ym, P){ const s = prev(ym, P), F = FL();
  for(const e of F.edges){ const f = flN(e.f), t = flN(e.t), v = P.E[e.id]||0; if(isColl(t)){ s.toSave -= v; s.toExp += v; } if(isColl(f) && t?.t==='exp') s.toExp -= v; }
  return s; })(flSum);
flAddDialog = (prev => function(){ prev(); const s = $('#flt'); if(!s) return;
  s.insertAdjacentHTML('afterbegin', '<option value="coll">Sammel-Kasten zum Zurücklegen (z. B. Steuern)</option>');
  const o = s.onchange; s.onchange = () => { if(s.value==='coll'){ $('#dlg').close(); setTimeout(()=>collDialog(null), 40); return; } o && o(); }; s.value = 'pot'; })(flAddDialog);

/* =====================================================================
   ANORDNUNG: jede Spalte mit Überschrift, Konten nach Art, Ausgaben nach Quelle gruppiert
   ===================================================================== */
var FL_ORD = {alltag:0, haushalt:1, karte:2, sparen:3, invest:4, vorsorge:5};
flLayout = function(){
  const F = FL(); if(!F.nodes.length) return; const depth = {};
  const visit = (id, d) => { if((depth[id] ?? -1) >= d || d > 12) return; depth[id] = d; flOut(id).forEach(e=>visit(e.t, d+1)); };
  F.nodes.filter(n=>n.t==='inc').forEach(n=>visit(n.id, 0));
  F.nodes.forEach(n=>{ if(n.t!=='exp' && depth[n.id]==null) depth[n.id] = n.t==='inc' ? 0 : 1; });
  const last = Math.max(1, ...F.nodes.filter(n=>n.t!=='exp').map(n=>depth[n.id])) + 1;
  F.nodes.forEach(n=>{ if(n.t==='exp') depth[n.id] = last; });
  const cols = {}; F.nodes.forEach(n=>(cols[depth[n.id]] ??= []).push(n));
  const hOf = n => n.t==='exp' ? 150 : n.t==='inc' ? 110 : 175, X = c => 40 + c*360, GAP = 18, GG = 36;
  const rank = n => n.t==='acc' ? (FL_ORD[accGrp(flAccOf(n)||{})] ?? 0) : n.t==='pot' ? (isColl(n) ? 7 : 6) : 0;
  const srcOf = n => { const es = flIn(n.id).map(e=>flN(e.f)).filter(Boolean); return es.find(p=>p.t!=='inc' && !isColl(p)) || es[0] || null; };
  const spanOf = l => l.reduce((a,n)=>a+hOf(n)+GAP, 0);
  const ex = cols[last] || [], exGroups = new Set(ex.map(n=>srcOf(n)?.id)).size;
  const H = Math.max(spanOf(ex) + GG*Math.max(0, exGroups-1), ...Object.keys(cols).map(c=>spanOf(cols[c])));
  for(const c of Object.keys(cols).map(Number).sort((a,b)=>a-b)){
    let items;
    if(c===last) items = cols[c].map(n=>{ const s = srcOf(n); return {n, g:s ? s.y : 1e6, s:s?.id || '', e:isExt(n) ? 1 : 0, a:flBud(flExpCats(n), TODAY)}; })
      .sort((a,b)=>a.g-b.g || a.s.localeCompare(b.s) || a.e-b.e || b.a-a.a);
    else items = cols[c].map(n=>{ const ps = flIn(n.id).map(e=>flN(e.f)).filter(p=>p && depth[p.id] < c); return {n, r:rank(n), g:ps.length ? ps.reduce((a,p)=>a+p.y,0)/ps.length : 1e6, s:''}; })
      .sort((a,b)=>a.r-b.r || a.g-b.g);
    const span = spanOf(items.map(i=>i.n)) + (c===last ? GG*Math.max(0, new Set(items.map(i=>i.s)).size-1) : 0);
    let y = 40 + (c===last ? 0 : Math.min(160, Math.max(0, (H - span)/4))), prev = null;
    for(const it of items){ if(c===last && prev!==null && it.s!==prev) y += GG; it.n.x = X(c); it.n.y = Math.round(y); y += hOf(it.n) + GAP; prev = it.s; }
  }
  F.colh = Object.keys(cols).map(Number).sort((a,b)=>a-b).map(c=>({x:X(c), t: c===0 ? 'Einkommen' : c===last ? 'Ausgaben & Empfänger' : c===1 ? 'Konten' : c===2 ? 'Weitere Konten & Kästen' : 'Weitere Konten (Stufe '+c+')'}));
  S.flView = null;
};
flAuto = (prev => function(){ prev(); try{ flLayout(); save(); render(); }catch(e){} })(flAuto);
flFit = function(){ const c = $('#flc'), F = FL(); if(!c || !F.nodes.length) return;
  const xs = F.nodes.map(n=>n.x), ys = F.nodes.map(n=>n.y), x0 = Math.min(...xs)-30, y0 = Math.min(...ys)-70, x1 = Math.max(...xs)+260, y1 = Math.max(...ys)+190;
  // an die Breite anpassen (lesbar), nach unten verschieben mit Ziehen oder Mausrad
  const z = Math.max(0.55, Math.min(1.1, c.clientWidth/(x1-x0), Math.max(c.clientHeight/(y1-y0), 0.55))); S.flView = {z, x:Math.max(-x0*z + (c.clientWidth-(x1-x0)*z)/2, -x0*z + 6), y:-y0*z + 6}; flApplyView(); };
vGeldfluss = (prev => function(){ let h = prev(); if(NATIVE || !FL().nodes.length) return h; const F = FL();
  if(F.colh?.length){ const top = Math.min(...F.nodes.map(n=>n.y)) - 46; h = h.replace(/(<div class="flw" id="flw"[^>]*>)/, `$1${F.colh.map(c=>`<div class="flcolh" style="left:${c.x}px;top:${top}px">${esc(c.t)}</div>`).join('')}`); }
  h = h.replace('<div class="flc" id="flc">', '<p class="small muted flwlg">Drähte: <b>fest</b> = gleicher Betrag · <b>Rest</b> = was übrig bleibt · <b>⇆</b> = so viel, wie dort gebraucht wird · <b>Budget</b> = aus Budget-Kategorien · dicker = mehr Geld · gestrichelt = Zukunft</p><div class="flc" id="flc">')
    .replace('<button class="btn sm" data-act="fladd">+ Kästchen</button>', '<button class="btn sm" data-act="flcoll">+ Kasten (z. B. Steuern)</button><button class="btn sm" data-act="fladd">+ Kästchen</button>');
  return h; })(vGeldfluss);
CUSTOM_V.geldfluss = vGeldfluss;
// Drahtbeschriftung «fest» / «Budget»
flWires = (prev => function(P, Fx){ let h = prev(P, Fx);
  for(const e of FL().edges.filter(e=>e.mode==='fix' || e.mode==='kat')) h = h.replace(new RegExp(`(data-e="${e.id}"[\\s\\S]*?<b>)([^<]*)(</b>)`), (m, a, b, c) => /fest|Budget/.test(b) ? m : `${a}${b} ${e.mode==='fix'?'fest':'Budget'}${c}`);
  return h; })(flWires);

/* =====================================================================
   FÜR ALLE: ohne Geldfluss bieten Übersicht und Planen das Einrichten an
   ===================================================================== */
syncCardHtml = (prev => function(compact){ if(D?.flow?.nodes?.length) return prev(compact);
  if(!D?.accounts?.some(a=>!a.archived)) return '';
  return `<div class="card synccard" id="synccard"><div class="row" style="gap:10px;align-items:center;flex-wrap:wrap"><span class="sp"><b>Übersicht, Planen und Geldfluss verbinden</b><br><span class="small muted">Baut aus deinen Konten, Daueraufträgen und dem Budget einen Geldfluss auf. Danach stimmen alle drei überein – Änderungen an einem Ort gelten überall.</span></span>
    <button class="btn sm" data-act="bvor">Budget aus Zahlungen</button><button class="btn sm pri" data-act="flsetup">Jetzt verbinden</button></div></div>`; })(syncCardHtml);
document.addEventListener('click', ev=>{ const a = ev.target.closest('[data-act="flsetup"],[data-act="flcoll"]'); if(!a || !D) return; ev.stopPropagation(); ev.preventDefault();
  if(a.dataset.act==='flcoll') return collDialog(null);
  try{ flAuto(); for(let i=0; i<3 && !syncCheck(TODAY).ok; i++) syncFix(); flLayout(); save(); render(); toastMsg('Verbunden – Übersicht, Planen und Geldfluss stimmen überein'); }catch(e){ toastMsg('Konnte nicht verbinden: '+e.message); } }, true);
