/* =====================================================================
   93. ANORDNUNG BLEIBT · FLUSS-ASSISTENT PRO DRAHT · GILT AB (1.67.0)
   - Die Anordnung im Geldfluss ändert sich nur noch mit «Anordnen».
     Neue Kästchen bekommen einen freien Platz, bestehende bleiben, wo sie sind.
   - Fluss-Assistent: Betrag pro Draht selbst festlegen, Empfehlung nur auf Wunsch,
     Ergebnis rechnet sofort mit.
   - Änderungen aus Assistent und «Budget aus Zahlungen» gelten ab einem wählbaren
     Monat (Standard: Januar 2027).
   ===================================================================== */

/* ---------- Gilt ab ---------- */
var AP_DEF = '2027-01';
function geltAb(){ const nx = ymAdd(TODAY, 1), v = D?.settings?.geltAb || AP_DEF; return v > nx ? v : nx; }
function geltAbSet(ym){ (D.settings ??= {}).geltAb = ym; }
function geltAbOpts(sel){ const nx = ymAdd(TODAY, 1), o = []; for(let i=0; i<15; i++){ const m = ymAdd(nx, i); o.push(`<option value="${m}" ${m===sel?'selected':''}>${ymLabel(m)}</option>`); } return o.join(''); }

/* ---------- Anordnung nur auf Knopfdruck ---------- */
var flLayoutAll = flLayout;
flLayout = function(){
  const F = FL(); if(!F.nodes.length) return;
  const neu = F.nodes.filter(n=>!n.pl); if(!neu.length) return;
  if(neu.length === F.nodes.length){ flLayoutAll(); F.nodes.forEach(n=>n.pl = 1); return; }
  // Zielplatz aus der vollen Anordnung holen, alle anderen Kästchen zurück an ihren Platz
  const keep = F.nodes.map(n=>[n, n.x, n.y]), colh = F.colh, view = S.flView;
  flLayoutAll(); const tgt = new Map(F.nodes.map(n=>[n.id, {x:n.x, y:n.y}]));
  keep.forEach(([n, x, y])=>{ n.x = x; n.y = y; }); F.colh = colh; S.flView = view;
  const placed = F.nodes.filter(n=>n.pl), GAP = 18;
  const hit = (n, x, y) => placed.find(o=>o!==n && Math.abs(o.x - x) < FL_W + 24 && y < o.y + flHt(o) + GAP && y + flHt(n) + GAP > o.y);
  for(const n of neu){ const t = tgt.get(n.id);
    // gleiche Spalte wie in der vollen Anordnung: dort, wo die bestehenden Kästchen dieser Spalte heute stehen
    const peers = placed.filter(o=>tgt.get(o.id)?.x === t.x);
    let x = t.x, y = t.y;
    if(peers.length){ const xs = peers.map(o=>o.x).sort((a,b)=>a-b); x = xs[Math.floor(xs.length/2)];
      const above = peers.filter(o=>tgt.get(o.id).y <= t.y).sort((a,b)=>tgt.get(b.id).y - tgt.get(a.id).y)[0];
      y = above ? above.y + flHt(above) + GAP : Math.min(...peers.map(o=>o.y)); }
    for(let i=0, o; i<300 && (o = hit(n, x, y)); i++) y = o.y + flHt(o) + GAP;
    n.x = Math.round(x); n.y = Math.round(y); n.pl = 1; placed.push(n); }
};
// Was auf der Fläche steht, gilt als platziert (auch von Hand hinzugefügte Kästchen)
render = (prev => function(){
  try{ if(D?.flow?.nodes) D.flow.nodes.forEach(n=>{ if(!n.pl) n.pl = 1; });
    const K = PL(); if(K.kkNew && TODAY >= K.kkNew.from){ K.kkAmt = K.kkNew.amt; delete K.kkNew; } }catch(e){}
  return prev.apply(this, arguments); })(render);
// «Anordnen» und «Jetzt verbinden» ordnen alles neu
window.addEventListener('click', ev=>{ const a = ev.target.closest?.('[data-act="fllay"],[data-act="flsetup"]'); if(!a || !D) return; ev.stopPropagation(); ev.preventDefault();
  if(a.dataset.act==='fllay'){ flLayoutAll(); FL().nodes.forEach(n=>n.pl = 1); save(); render(); toastMsg('Neu angeordnet'); return; }
  try{ flAuto(); for(let i=0; i<3 && !syncCheck(TODAY).ok; i++) syncFix(); flLayoutAll(); FL().nodes.forEach(n=>n.pl = 1); save(); render(); toastMsg('Verbunden – Übersicht, Planen und Geldfluss stimmen überein'); }
  catch(e){ toastMsg('Konnte nicht verbinden: '+e.message); } }, true);

/* ---------- Drähte, die erst ab einem Monat gelten ---------- */
flPlan = (prev => function(ym){ const F = FL(), all = F.edges;
  if(!all.some(e=>e.from && ym < e.from)) return prev.apply(this, arguments);
  F.edges = all.filter(e=>!(e.from && ym < e.from)); try{ return prev.apply(this, arguments); } finally{ F.edges = all; } })(flPlan);

/* ---------- Abzahlbetrag der Kreditkarte ab einem Monat ---------- */
var kkAmtAt = ym => { const K = PL(); return K.kkNew && ym >= K.kkNew.from ? +K.kkNew.amt || 0 : +K.kkAmt || 0; };
var kkLeftAt = (owed, ym) => { const r = kkZins()/1200; let b = owed; for(let m = TODAY; m < ym && b > 0.5; m = ymAdd(m,1)) b = b*(1+r) - kkAmtAt(m); return Math.max(0, b); };
kkLeft = (prev => function(owed, amt, ym){ return PL().kkNew && amt === (+PL().kkAmt || 0) ? kkLeftAt(owed, ym) : prev(owed, amt, ym); })(kkLeft);
kkExtra = function(card, ym){ const amt = kkAmtAt(ym), tot = kkTot(); if(!amt || !tot || ym < TODAY) return 0;
  const share = kkOwed(card)/tot; if(!share) return 0; return r2(Math.min(amt, kkLeftAt(tot, ym)*(1+kkZins()/1200)) * share); };
kkFreeYm = (prev => function(){ if(!PL().kkNew) return prev(); const t = kkTot(); if(!t) return null;
  for(let i=1, m = ymAdd(TODAY,1); i<600; i++, m = ymAdd(m,1)) if(kkLeftAt(t, m) <= 0.5) return m; return null; })(kkFreeYm);

/* ---------- Budget auf 50 Franken genau ---------- */
var r50 = v => v > 0.5 ? Math.max(50, Math.round(v/50)*50) : 0;      // Budgetbeträge
var f50 = v => v > 0.5 ? Math.floor(v/50)*50 : 0;                    // Drähte aus der Rechnung: nie mehr als frei

/* ---------- Budget aus Zahlungen: gilt ab, auf 50 Franken ---------- */
bvorCalc = (prev => function(){ const R = prev(); R.nx = geltAb();
  for(const x of R.rows){ const p = r50(x.prop); if(p !== x.prop){ x.basis = String(x.basis||'').replace(`CHF ${chf0(x.prop)} zurücklegen`, `CHF ${chf0(p)} zurücklegen`); x.prop = p; }
    x.pre = Math.abs(x.prop - x.cur) > Math.max(20, x.cur*0.1) && x.kind!=='keine'; }
  return R; })(bvorCalc);
// Vorschläge des Assistenten auf 50 Franken (3a abgerundet, damit das Jahresmaximum hält)
aiVariants = (prev => function(B){ const X = prev(B);
  for(const v of X.V){ v.kk = r50(v.kk); v.ntg = r50(v.ntg); v.p3 = f50(v.p3);
    const F0 = Math.max(0, B.free); if(v.kk + v.ntg + v.p3 > F0){ v.ntg = Math.max(0, f50(F0 - v.kk - v.p3)); }
    v.rest = Math.max(0, r2(F0 - v.kk - v.ntg - v.p3)); v.sim = aiSim(B, v, v.order); }
  const d = B.debt > 0.5; let best = X.V.slice().sort((a,b)=>b.sim.wealth - a.sim.wealth)[0];
  if(d && best.k!=='s1' && X.V[0].sim.wealth >= best.sim.wealth - Math.max(300, best.sim.wealth*0.01)) best = X.V[0];
  X.best = best; return X; })(aiVariants);

/* ---------- Fluss-Assistent ---------- */
// gleiche Rechnung wie 1.64, aber ab dem gewählten Startmonat
aiBase = (prev => function(){
  const nx = geltAb(), F = FL(), mainId = flpMain(), mn = flpAccNode(mainId);
  const inc = F.nodes.some(n=>n.t==='inc') ? F.nodes.filter(n=>n.t==='inc').reduce((a,n)=>a+flIncomeOf(n, nx),0) : (+D.income?.[nx]||0);
  let need = 0, want = 0, spar = 0; const bud = c => +(D.plan?.[c.id]?.[nx]) || 0;
  for(const c of D.cats.filter(c=>!c.archived && !c.wid && c.group!=='inc')){ const v = bud(c); if(!v || isTaxC(c) || isDebtC(c)) continue; const g = gSec(c).k;
    if(g==='spar') spar += v; else if(g==='wunsch' || g==='frei') want += v; else need += v; }
  const t = taxInfo(), tax = r50(Math.max(t.mon||0, t.budM||0)), nt = ntgInfo(), accs = D.accounts.filter(a=>!a.archived);
  const v3 = accs.filter(a=>accGrp(a)==='vorsorge' && (is3aAcc(a) || /^3a/.test(a.det?.vkind||'')));
  const spars = accs.filter(a=>accGrp(a)==='sparen').sort((a,b)=>accRate(b)-accRate(a));
  const free4 = a => !/r[üu]ckstell|jahreskosten|steuer|eigenheim|ferien|auto/i.test(a.name||'') && !a.det?.purpose;
  const ntgA = nt.a || spars.find(free4) || spars[0], restA = spars.find(a=>a!==ntgA && free4(a)) || ntgA;
  const free = inc - need - want - tax;
  const into = ids => { let s = 0; for(let i=0;i<12;i++){ const P = flPlan(ymAdd(nx,i)); F.edges.forEach(e=>{ const f = flN(e.f), t2 = flN(e.t); if(f && t2 && f.t!=='inc' && t2.t!=='exp' && ids.has(flSrcAcc(t2)) && flSrcAcc(f)!==flSrcAcc(t2)) s += (P.E[e.id]||0) - ((P.X||{})[e.id]||0); }); } return s/12; };
  const kkNow = kkAmtAt(nx), cur = {kk:kkNow, ntg:ntgA?into(new Set([ntgA.id])):0, p3:into(new Set(v3.map(a=>a.id))), tax};
  cur.rest = Math.max(0, free - cur.kk - cur.ntg - cur.p3);
  let shift = 0; for(let m = ymAdd(TODAY,1); m < nx; m = ymAdd(m,1)) shift++;
  const debt = shift ? kkLeftAt(kkTot(), nx) : kkTot();
  return {nx, from:nx, shift, inc, need, want, spar, tax, t, free, debt, nt, ntgA, restA, v3, max3:+D.settings?.max3a || P3A_MAX, p3paid:nx.slice(0,4)===TODAY.slice(0,4) ? p3aInfo().paid : 0, cur, mainId, mn};
})(aiBase);

var AI_L = [
  {k:'kk', l:'Kreditkarte abzahlen', show:B=>B.debt > 0.5 || B.cur.kk > 0},
  {k:'ntg', l:'Notgroschen', show:B=>!!B.ntgA},
  {k:'p3', l:'Säule 3a', show:B=>B.v3.length > 0},
  {k:'tax', l:'Steuern zurücklegen', show:()=>true},
];
function aiWire(B, k){ const m = accName(B.mainId) || 'Hauptkonto';
  const to = k==='kk' ? (D.accounts.find(a=>!a.archived && accGrp(a)==='karte' && kkOwed(a))?.name || 'Kreditkarte')
    : k==='ntg' ? B.ntgA?.name : k==='p3' ? B.v3[0]?.name : k==='tax' ? 'Budget Steuern' : (B.restA?.name || 'Sparkonto');
  return `${m} → ${to || '–'}`; }
function aiRecWhy(B, X, k){ const s = X.best.sim;
  if(k==='kk') return `Kartenzins ${kkZins()} % – jeder abbezahlte Franken bringt mehr als ein Sparkonto.${s.free ? ` Schuldenfrei im ${ymLabel(s.free)}.` : ''}`;
  if(k==='ntg') return B.nt.ok ? 'Notgroschen ist schon voll.' : `Ziel CHF ${chf0(B.nt.tgt)} (3 Monatsausgaben), heute CHF ${chf0(B.nt.cur)}.${s.full ? ` Voll im ${ymLabel(s.full)}.` : ''}`;
  if(k==='p3') return `Maximum CHF ${chf0(B.max3)} pro Jahr, spart rund 15–25 % Steuern; Geld bis zur Pension gebunden.`;
  if(k==='tax') return `Geschätzt aus deinen Steuerzahlungen: CHF ${chf0(B.t.mon || B.tax)} pro Monat.`;
  return ''; }
function aiOwnRes(B, a){ const sim = aiSim(B, a, ['ntg','p3','rest']); return sim; }

aiDialog = function(){
  if(!FL().nodes.length){ toastMsg('Zuerst den Geldfluss aufbauen (Budget › Geldfluss)'); return; }
  const dl = $('#dlg'); dl.classList.add('aiw'); dl.addEventListener('close', ()=>dl.classList.remove('aiw'), {once:true});
  const B = aiBase(), X = aiVariants(B), best = X.best, cols = [X.cur, ...X.V], showRec = !!S.aiRec;
  const rec = {kk:best.kk, ntg:best.ntg, p3:best.p3, tax:r50(B.tax)};
  const own = Object.assign({kk:B.cur.kk, ntg:B.cur.ntg, p3:B.cur.p3, tax:B.tax}, S.aiOwn?.from===B.from ? S.aiOwn : {});
  const lines = AI_L.filter(L=>L.show(B));
  const f = v => v>0.5 ? chf0(v) : '–', ym = y => y ? ymLabel(y) : '–';
  const row = L => `<div class="aiown" data-ail="${L.k}"><span class="sp"><b>${esc(aiWire(B, L.k))}</b><span class="small muted">${esc(L.l)} · heute CHF ${chf0(L.k==='tax' ? (B.t.budM||0) : B.cur[L.k]||0)}</span>
      <span class="small airec" ${showRec?'':'hidden'}>Empfehlung <b>CHF ${chf0(r50(rec[L.k]))}</b> – ${esc(aiRecWhy(B, X, L.k))} <button type="button" class="lnk" data-air="${L.k}">übernehmen</button></span></span>
      <input class="aiin" data-ai="${L.k}" inputmode="decimal" value="${own[L.k] > 0.5 ? r50(own[L.k]) : ''}" placeholder="0" aria-label="${esc(L.l)} pro Monat"></div>`;
  const th = c => `<th class="num aicol ${c.k===best.k?'best':''}">${esc(c.l)}${c.k===best.k?'<span class="aibest">Empfohlen</span>':''}${c.k==='cur' ? '' : `<br><button type="button" class="lnk" data-aiv="${c.k}">in meine Verteilung</button>`}</th>`;
  const rows = [['Kreditkarte abzahlen', c=>f(c.kk)], ['Notgroschen', c=>f(c.ntg)], ['Säule 3a', c=>f(c.p3)], ['Steuern zurücklegen', ()=>f(B.tax)], ['Rest aufs Sparkonto', c=>f(c.rest)]];
  const res = [['Kreditkarte schuldenfrei', c=>B.debt>0.5 ? (c.sim.free ? ym(c.sim.free) : '<span class="neg">nicht absehbar</span>') : 'keine Schuld'], ['Notgroschen voll', c=>B.nt.ok ? 'schon voll' : (c.sim.full ? ym(c.sim.full) : '<span class="neg">nicht in 2 Jahren</span>')], ['Kartenzins bezahlt', c=>'CHF '+chf0(c.sim.int)], ['Vermögen wächst in 24 Monaten um', c=>'<b>CHF '+chf0(c.sim.wealth)+'</b>']];
  dialog(`<h3>Fluss-Assistent</h3>
    <p class="small muted" style="margin-top:-6px">Du legst fest, wie viel über jeden Draht fliesst. Dein Budget für Leben, Wünsche und Freizeit bleibt gleich – verteilt wird nur, was übrig ist. Rechnet nur auf dem Gerät.</p>
    <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px"><label class="small" for="aifrom">Gilt ab</label><select id="aifrom" class="sm">${geltAbOpts(B.from)}</select>
      <span class="sp"></span><label class="chk small"><input type="checkbox" id="airec" ${showRec?'checked':''}> Empfehlung zeigen</label></div>
    <div class="aisum"><span>Einkommen <b>CHF ${chf0(B.inc)}</b></span><span>Grundbedarf & Fixkosten <b>CHF ${chf0(B.need)}</b></span><span>Wünsche & Freizeit <b>CHF ${chf0(B.want)}</b></span><span>zu verteilen <b class="${B.free+B.tax<0?'neg':''}">CHF ${chf0(B.free + B.tax)}</b></span></div>
    ${B.free + B.tax <= 0 ? `<p class="small neg">Das Budget verplant schon mehr als das Einkommen (${ymLabel(B.from)}). Zuerst bei Wünschen oder Freizeit etwas kürzen.</p>` : ''}
    <h4 class="flph">Deine Verteilung pro Monat</h4>
    ${lines.map(row).join('')}
    <div class="aiown airest"><span class="sp"><b>${esc(aiWire(B, 'rest'))}</b><span class="small muted">Rest – alles, was nicht verteilt ist</span></span><b class="num" id="airestv"></b></div>
    ${showRec ? `<p class="small" style="margin:6px 0"><button type="button" class="btn sm" data-air="all">Alle Empfehlungen übernehmen</button> <span class="muted">Empfohlen: «${esc(best.l)}» – ${esc(best.d)}</span></p>` : ''}
    <h4 class="flph">Ergebnis mit deiner Verteilung</h4><div id="aires" class="aisum"></div>
    <details class="aidet" ${S.aiDet?'open':''}><summary>Varianten vergleichen</summary>
    <div class="aitbl"><table><thead><tr><th>pro Monat</th>${cols.map(th).join('')}</tr></thead><tbody>
      ${rows.map(([l,fn])=>`<tr><td>${l}</td>${cols.map(c=>`<td class="num ${c.k===best.k?'best':''}">${fn(c)}</td>`).join('')}</tr>`).join('')}
      <tr class="aisep"><td colspan="${cols.length+1}">Ergebnis</td></tr>
      ${res.map(([l,fn])=>`<tr><td>${l}</td>${cols.map(c=>`<td class="num ${c.k===best.k?'best':''}">${fn(c)}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>
    <h4 class="flph">Warum «${esc(best.l)}» empfohlen ist</h4><ul class="small aiwhy">${aiWhy(B, X).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>
    <p class="small muted">Übernehmen ändert Geldfluss, Abzahlbetrag und die passenden Budget-Kategorien ab ${ymLabel(B.from)}; vorher bleibt alles wie jetzt. Die App bucht nichts selbst. Keine Anlageberatung.</p>
    <div class="acts"><button class="btn" data-dlg="cancel">Schliessen</button><button class="btn pri" data-dlg="ok" id="aiok">Meine Verteilung übernehmen</button></div>`,
  k=>{ if(k!=='ok') return; const a = aiRead(B); if(a.rest < -0.5){ toastMsg('Mehr verteilt, als frei ist – einen Betrag kürzen'); return false; }
    $('#dlg').classList.remove('aiw'); S.aiOwn = {...a, from:B.from};
    const v = {k:'own', l:'Deine Verteilung', ...a, order:['ntg','p3','rest']}; v.sim = aiOwnRes(B, v); setTimeout(()=>aiApply(B, v), 20); });
  const upd = () => { const a = aiRead(B), sim = aiOwnRes(B, a), c = X.cur.sim, rv = $('#airestv');
    if(rv){ rv.textContent = 'CHF ' + chf0(a.rest); rv.classList.toggle('neg', a.rest < -0.5); }
    const ok = $('#aiok'); if(ok) ok.disabled = a.rest < -0.5 || B.free + B.tax <= 0;
    const el = $('#aires'); if(!el) return;
    el.innerHTML = (a.rest < -0.5 ? `<span class="neg">CHF ${chf0(-a.rest)} mehr verteilt, als frei ist</span>` : '')
      + (B.debt > 0.5 ? `<span>Kreditkarte schuldenfrei <b>${sim.free ? ymLabel(sim.free) : 'nicht absehbar'}</b></span>` : '')
      + (B.ntgA && !B.nt.ok ? `<span>Notgroschen voll <b>${sim.full ? ymLabel(sim.full) : 'nicht in 2 Jahren'}</b></span>` : '')
      + (B.debt > 0.5 ? `<span>Kartenzins <b>CHF ${chf0(sim.int)}</b></span>` : '')
      + `<span>Vermögen in 24 Monaten <b>+ CHF ${chf0(sim.wealth)}</b> <span class="muted">(heute ${chf0(c.wealth)}${showRec ? ` · Empfehlung ${chf0(best.sim.wealth)}` : ''})</span></span>`; };
  const fill = o => { for(const L of lines){ const i = document.querySelector(`.aiin[data-ai="${L.k}"]`); if(i && o[L.k] != null) i.value = o[L.k] > 0.5 ? r50(o[L.k]) : ''; } upd(); };
  dl.querySelectorAll('.aiin').forEach(i=>{ i.addEventListener('input', upd); i.addEventListener('change', ()=>{ const v = parseFloat(String(i.value).replace(/['’\s]/g,'').replace(',','.')); if(isFinite(v) && v > 0) i.value = r50(v); upd(); }); });
  $('#aifrom')?.addEventListener('change', ev=>{ S.aiOwn = {...aiRead(B), from:ev.target.value}; geltAbSet(ev.target.value); save(); dl.close(); setTimeout(aiDialog, 30); });
  $('#airec')?.addEventListener('change', ev=>{ S.aiOwn = {...aiRead(B), from:B.from}; S.aiRec = ev.target.checked; dl.close(); setTimeout(aiDialog, 30); });
  dl.querySelector('.aidet')?.addEventListener('toggle', ev=>{ S.aiDet = ev.target.open; });
  dl.querySelectorAll('[data-air]').forEach(b=>b.addEventListener('click', ev=>{ ev.preventDefault(); ev.stopPropagation(); const k = b.dataset.air; fill(k==='all' ? rec : {[k]:rec[k]}); }));
  dl.querySelectorAll('[data-aiv]').forEach(b=>b.addEventListener('click', ev=>{ ev.preventDefault(); ev.stopPropagation(); const v = X.V.find(x=>x.k===b.dataset.aiv); if(v) fill({kk:v.kk, ntg:v.ntg, p3:v.p3, tax:B.tax}); }));
  upd();
};
function aiRead(B){ const num = k => { const i = document.querySelector(`.aiin[data-ai="${k}"]`); if(!i) return k==='tax' ? B.tax : 0; const v = parseFloat(String(i.value).replace(/['’\s]/g,'').replace(',','.')); return isFinite(v) && v > 0 ? r50(v) : 0; };
  const a = {kk:num('kk'), ntg:num('ntg'), p3:num('p3'), tax:num('tax')}; a.rest = r2(B.free + B.tax - a.tax - a.kk - a.ntg - a.p3); return a; }

aiApply = function(B, v){
  const F = FL(); F.since ||= TODAY; const from = B.from || ymAdd(TODAY,1), ms = v.sim.m, main = flpAccNode(B.mainId) || flpEnsureAcc(B.mainId, 340, 220);
  const pre = []; for(let m = TODAY; m < from; m = ymAdd(m,1)) pre.push(m);
  const preE = pre.map(m=>flPlan(m).E || {});
  // Kreditkarte: bis zum Startmonat wie bisher, danach der neue Betrag
  const K = PL();
  if(v.kk > 0.5){ if(from <= ymAdd(TODAY,1)){ K.kkAmt = r50(v.kk); delete K.kkNew; } else if(Math.abs(r50(v.kk) - (+K.kkAmt||0)) > 0.5) K.kkNew = {from, amt:r50(v.kk)}; else delete K.kkNew; }
  else if(B.debt <= 0.5){ delete K.kkAmt; delete K.kkNew; }
  else if(K.kkAmt) K.kkNew = {from, amt:0};
  const setFlow = (acc, keys) => { if(!acc) return; const amt = ms.map(r=>f50([].concat(keys).reduce((a,k)=>a+r[k],0)));
    if(!amt.some(x=>x>0.5) && !F.edges.some(e=>e.f===main.id && flN(e.t)?.ref===acc.id)) return;
    const n = flpEnsureAcc(acc.id, main.x+330, main.y-160); let e = F.edges.find(x=>x.f===main.id && x.t===n.id);
    if(e && e.mode==='rest') return;
    if(e && e.mode==='kat' && e.cats?.length){ const c = e.cats[0]; D.plan[c] ??= {}; ms.forEach((r,i)=>{ if(amt[i]>0.5) D.plan[c][r.ym] = amt[i]; else delete D.plan[c][r.ym]; }); return; }
    const isNew = !e;
    if(!e){ if(flCanLink(main.id, n.id)) return; e = {id:'e'+uid(), since:TODAY, f:main.id, t:n.id, mode:'fix', a:0}; F.edges.push(e); }
    e.mode = 'fix'; e.m = {}; pre.forEach((m,i)=>{ e.m[m] = isNew ? 0 : r2(preE[i][e.id] || 0); });
    ms.forEach((r,i)=>e.m[r.ym] = amt[i]); e.a = f50(amt.slice(-12).reduce((x,y)=>x+y,0)/12); };
  setFlow(B.ntgA, B.restA===B.ntgA ? ['ntg','rest'] : 'ntg'); for(const a of B.v3.slice(0,1)) setFlow(a, 'p3');
  // Rest: ein Draht «Rest» ab dem Startmonat fängt auf, was übrig bleibt
  if(B.restA && B.restA !== B.ntgA && !flOut(main.id).some(e=>e.mode==='rest')){ const n = flpEnsureAcc(B.restA.id, main.x+330, main.y+160), e = F.edges.find(x=>x.f===main.id && x.t===n.id);
    if(e) setFlow(B.restA, 'rest');
    else if(!flCanLink(main.id, n.id)) F.edges.push({id:'e'+uid(), since:from, from, f:main.id, t:n.id, mode:'rest'}); }
  // Steuern: Budget ab Startmonat
  const tv = r50(v.tax ?? B.tax), c = D.cats.find(x=>!x.archived && !x.wid && isTaxC(x));
  if(c && Math.abs(tv - (+D.plan?.[c.id]?.[from] || 0)) > 5){ D.plan[c.id] ??= {}; for(const m of (C?.months||[]).filter(m=>m>=from)){ if(tv > 0.5) D.plan[c.id][m] = r50(tv); else delete D.plan[c.id][m]; } }
  flLayout(); flpCache.k = null; flSync(); save(); render(); toastMsg(`«${v.l}» ab ${ymLabel(from)} übernommen – Geldfluss und Budget angepasst`);
};
