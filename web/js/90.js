/* =====================================================================
   90. PLANEN ⇄ GELDFLUSS UND FLUSS-ASSISTENT (1.64.0)
   • Planen → Geldfluss: Jede Änderung an Budget oder Einkommen führt die geplanten
     Überträge aus dem Geldfluss sofort nach (auch auf dem Handy).
   • Geldfluss → Planen: Unter «Budget › Planen» stehen die Überträge zwischen deinen
     Konten mit Betrag – direkt änderbar (nur dieser Monat oder ab diesem Monat).
     Ein geplanter Übertrag aus dem Geldfluss unter «Kommende Zahlungen» öffnet den Draht.
   • Fluss-Assistent: rechnet aus Einkommen, Budget, Kartenschuld, Notgroschen, Steuern und
     Säule 3a drei Varianten für die nächsten 24 Monate durch (Monat für Monat, mit Zins und
     Steuerersparnis), vergleicht sie mit heute und übernimmt die gewählte in Geldfluss
     und Budget. Alles nur auf dem Gerät gerechnet.
   ===================================================================== */

/* ---------- Schneller nachführen: flPlan während flSync pro Monat merken ---------- */
var flPlanMemo = null;
flPlan = (prev => function(ym){ if(flPlanMemo) return flPlanMemo[ym] ??= prev(ym); return prev(ym); })(flPlan);
flSync = (prev => function(){ const outer = !flPlanMemo; if(outer) flPlanMemo = {}; try{ return prev.apply(this, arguments); } finally { if(outer) flPlanMemo = null; } })(flSync);

/* ---------- Planen → Geldfluss ---------- */
var flSigOf = () => { const s = JSON.stringify([D.plan, D.income, (D.incSide||[]).map(x=>x.plan), PL().kkAmt||0, PL().kkZins||0]); let h = 5381; for(let i=0; i<s.length; i++) h = (h*33 ^ s.charCodeAt(i)) >>> 0; return s.length+':'+h; };
var flSig = null;
save = (prev => function(){ try{ if(D && D.flow?.nodes?.length){ const s = flSigOf(); if(flSig!==null && s!==flSig){ flpCache.k = null; flSync(); } flSig = s; } }catch(e){} return prev.apply(this, arguments); })(save);

/* ---------- Geldfluss → Planen: Überträge im Budget ---------- */
function flTrList(ym){
  const F = FL(), P = flPlan(ym);
  return F.edges.filter(e=>{ const f = flN(e.f), t = flN(e.t); return f && t && f.t!=='inc' && t.t!=='exp' && flSrcAcc(f) && flSrcAcc(t) && flSrcAcc(f)!==flSrcAcc(t); })
    .map(e=>({e, v:P.E[e.id]||0, x:(P.X||{})[e.id]||0}));
}
var flPlanYm = () => S.view==='budgetedit' && typeof budgetMode==='function' && budgetMode()!=='monat' ? (String(S.year)===TODAY.slice(0,4) ? TODAY : S.year+'-01') : (S.ym || TODAY);
function flPlanCardHtml(){
  if(!D?.flow?.nodes?.length) return ''; const ym = flPlanYm(), L = flTrList(ym), tot = kkTot();
  if(!L.length && !tot) return '';
  const row = ({e, v, x}) => { const f = flN(e.f), t = flN(e.t), ed = e.mode==='fix' || e.mode==='pct';
    const how = e.mode==='kat' ? `aus Budget «${(e.cats||[]).map(catName).join(', ')}»` : e.mode==='deckt' ? `deckt, was ${esc(flName(t))} bezahlt${x?` · davon ${chf0(x)} Abzahlung`:''}` : e.mode==='rest' ? 'Rest, der übrig bleibt' : e.mode==='pct' ? `${e.pct} % ${e.of==='inc'?'vom Einkommen':e.of==='need'?'vom Bedarf':'vom Zufluss'}` : (e.m?.[ym]!=null ? 'nur diesen Monat' : 'fest');
    return `<div class="fltrr"><span class="sp"><b>${esc(flName(f))} → ${esc(flName(t))}</b><span class="small muted">${how}</span></span>
      ${ed ? `<input class="fltri" data-fltr="${e.id}" inputmode="decimal" value="${e.mode==='pct' ? (e.pct??'') : chf(v)}" aria-label="${e.mode==='pct'?'Prozent':'Betrag'} ${esc(flName(f))} nach ${esc(flName(t))}">${e.mode==='pct'?'<span class="small">%</span>':''}` : `<b class="num">${chf0(v)}</b>`}</div>`; };
  const kk = tot ? `<div class="fltrr"><span class="sp"><b>Kreditkarte abzahlen</b><span class="small muted">offen CHF ${chf0(tot)}${(()=>{ const y = kkFreeYm(); return y ? ` · schuldenfrei im ${ymLabel(y)}` : ''; })()}</span></span><input class="fltri" data-fltr="kk" inputmode="decimal" value="${PL().kkAmt?chf(PL().kkAmt):''}" placeholder="0" aria-label="Abzahlbetrag pro Monat"></div>` : '';
  return `<div class="card" id="fltrcard"><div class="row" style="gap:8px;align-items:center;flex-wrap:wrap"><h3 style="margin:0">Überträge laut Geldfluss · ${ymLabel(ym)}</h3><span class="sp"></span>${NATIVE?'':'<button class="btn sm" data-go="geldfluss">Geldfluss</button>'}<button class="btn sm pri" data-act="flai">Fluss-Assistent</button></div>
    <p class="small muted" style="margin:4px 0 6px">Was du hier änderst, gilt auch im Geldfluss – und umgekehrt. Budget-Beträge oben fliessen direkt in die Drähte.</p>
    ${kk}${L.map(row).join('')}
    <label class="chk small" style="margin-top:6px"><input type="checkbox" id="fltrfwd" ${S.fltrFwd!==false?'checked':''}> Änderung gilt ab ${ymLabel(ym)} für alle folgenden Monate</label></div>`;
}
render = (prev => function(){ const r = prev.apply(this, arguments);
  try{ if(D && !S.locked){ if(flSig===null && D.flow?.nodes?.length) flSig = flSigOf();
    if(S.view==='budgetedit' && !$('#fltrcard')){ const h = flPlanCardHtml(); if(h){ const m = $('#main'), tabs = m?.querySelector('.hubtabs'); tabs ? tabs.insertAdjacentHTML('afterend', h) : m?.insertAdjacentHTML('afterbegin', h); } } } }catch(e){}
  return r; })(render);
document.addEventListener('change', ev=>{
  const i = ev.target.closest?.('[data-fltr]'), fw = ev.target.closest?.('#fltrfwd'); if(fw){ S.fltrFwd = fw.checked; return; } if(!i || !D) return;
  const s = i.value.trim(), v = s==='' ? 0 : parseNum(s); if(!isFinite(v) || v<0){ i.style.borderColor = 'var(--bad)'; return; }
  const ym = flPlanYm(), fwd = S.fltrFwd!==false;
  if(i.dataset.fltr==='kk'){ if(v) PL().kkAmt = r2(v); else delete PL().kkAmt; }
  else { const e = flE(i.dataset.fltr); if(!e) return;
    if(e.mode==='pct'){ if(v>100){ i.style.borderColor = 'var(--bad)'; return; } if(fwd) e.pct = v; else { (e.m ??= {})[ym] = flPlan(ym).E[e.id] * v / (e.pct||1); } }
    else if(fwd){ const keep = {}; for(let m = TODAY; m < ym; m = ymAdd(m,1)) keep[m] = e.m?.[m] ?? flAmt(e, m); e.a = r2(v); e.m = Object.fromEntries(Object.entries({...(e.m||{}), ...keep}).filter(([m])=>m<ym)); }
    else (e.m ??= {})[ym] = r2(v); }
  flpCache.k = null; flSync(); save(); render(); toastMsg('Im Geldfluss und im Budget angepasst');
});

// Kommende Zahlungen: geplanter Übertrag aus dem Geldfluss öffnet den Draht
planDialog = (prev => function(i){ const p = i!=null ? D.plans?.[i] : null;
  if(p?.flow && !p.flowAdj){ const e = flE(p.flow); if(e){ if(!NATIVE) return flEdgeDialog(e.id, (p.start||'').slice(0,7) > TODAY ? p.start.slice(0,7) : TODAY); return flTrQuick(e); } }
  return prev(i); })(planDialog);
function flTrQuick(e){ const ym = TODAY, v = flPlan(ym).E[e.id] || 0, ed = e.mode==='fix';
  dialog(`<h3>${esc(flName(flN(e.f)))} → ${esc(flName(flN(e.t)))}</h3><p class="small muted" style="margin-top:-6px">Geplanter Übertrag aus dem Geldfluss.</p>
    ${ed ? `<label class="f">Betrag pro Monat (CHF)<input id="ftq" inputmode="decimal" value="${chf(v)}"></label><label class="chk"><input type="checkbox" id="ftqf" checked> ab ${ymLabel(ym)} für alle folgenden Monate</label>` : `<p class="small">CHF ${chf0(v)} in ${ymLabel(ym)} – ${e.mode==='kat'?'kommt aus dem Budget; dort ändern.':'wird automatisch berechnet; die Art änderst du im Geldfluss am PC.'}</p>`}
    <div class="acts"><button class="btn" data-dlg="cancel">Schliessen</button>${ed?'<button class="btn pri" data-dlg="ok">Speichern</button>':''}</div>`,
  k=>{ if(k!=='ok') return; const x = parseNum(val('ftq')); if(!isFinite(x) || x<0){ $('#ftq').style.borderColor = 'var(--bad)'; return false; }
    if($('#ftqf').checked){ e.a = r2(x); if(e.m) for(const m of Object.keys(e.m)) if(m>=ym) delete e.m[m]; } else (e.m ??= {})[ym] = r2(x);
    flSync(); toastMsg('Gespeichert – gilt auch im Geldfluss'); });
}

/* ---------- Fluss-Assistent ---------- */
var r10 = v => Math.max(0, Math.round(v/10)*10);
var isTaxC = c => /steuer/i.test(c.name) && !/motorfahrzeug|hunde/i.test(c.name);
var isDebtC = c => c.group==='schulden' || /kreditkarte|abzahl|schuld|kredit(?!karte)/i.test(c.name);
function aiBase(){
  const nx = ymAdd(TODAY, 1), F = FL(), mainId = flpMain(), mn = flpAccNode(mainId);
  const inc = F.nodes.some(n=>n.t==='inc') ? F.nodes.filter(n=>n.t==='inc').reduce((a,n)=>a+flIncomeOf(n, nx),0) : (+D.income?.[nx]||0);
  let need = 0, want = 0, spar = 0; const bud = c => +(D.plan?.[c.id]?.[nx]) || 0;
  for(const c of D.cats.filter(c=>!c.archived && !c.wid && c.group!=='inc')){ const v = bud(c); if(!v || isTaxC(c) || isDebtC(c)) continue; const g = gSec(c).k;
    if(g==='spar') spar += v; else if(g==='wunsch' || g==='frei') want += v; else need += v; }
  const t = taxInfo(), tax = Math.max(t.mon||0, t.budM||0), nt = ntgInfo(), accs = D.accounts.filter(a=>!a.archived);
  const v3 = accs.filter(a=>accGrp(a)==='vorsorge' && (is3aAcc(a) || /^3a/.test(a.det?.vkind||'')));
  const spars = accs.filter(a=>accGrp(a)==='sparen').sort((a,b)=>accRate(b)-accRate(a));
  const free4 = a => !/r[üu]ckstell|jahreskosten|steuer|eigenheim|ferien|auto/i.test(a.name||'') && !a.det?.purpose;
  const ntgA = nt.a || spars.find(free4) || spars[0], restA = spars.find(a=>a!==ntgA && free4(a)) || ntgA;
  const free = inc - need - want - tax;
  // heute: was fliesst laut Geldfluss in Notgroschen, 3a und andere Sparkonten (Schnitt der nächsten 12 Monate)
  const into = ids => { let s = 0; for(let i=1;i<=12;i++){ const P = flPlan(ymAdd(TODAY,i)); F.edges.forEach(e=>{ const f = flN(e.f), t2 = flN(e.t); if(f && t2 && f.t!=='inc' && t2.t!=='exp' && ids.has(flSrcAcc(t2)) && flSrcAcc(f)!==flSrcAcc(t2)) s += (P.E[e.id]||0) - ((P.X||{})[e.id]||0); }); } return s/12; };
  const cur = {kk:+PL().kkAmt||0, ntg:ntgA?into(new Set([ntgA.id])):0, p3:into(new Set(v3.map(a=>a.id))), tax};
  cur.rest = Math.max(0, free - cur.kk - cur.ntg - cur.p3);
  return {nx, inc, need, want, spar, tax, t, free, debt:kkTot(), nt, ntgA, restA, v3, max3:+D.settings?.max3a || P3A_MAX, p3paid:p3aInfo().paid, cur, mainId, mn};
}
// Monat für Monat: Kartenschuld (mit Zins), Notgroschen bis Ziel, Säule 3a bis Maximum pro Jahr, Rest
function aiSim(B, a, order){
  const r = kkZins()/1200, out = {m:[], int:0, tax3:0, free:null, full:null, p3:0};
  let debt = B.debt, ntg = B.nt.cur, ntgT = B.nt.tgt, paidY = B.p3paid, rest = 0, ym = B.nx;
  const rN = accRate(B.ntgA||{})/1200, rR = accRate(B.restA||{})/1200;
  for(let i=0; i<24; i++, ym = ymAdd(ym,1)){
    if(ym.endsWith('-01')) paidY = 0;
    let pool = {kk:a.kk, ntg:a.ntg, p3:a.p3, rest:a.rest}, row = {ym, kk:0, ntg:0, p3:0, rest:0};
    // Karte
    if(debt > 0.5){ const z = debt*r; out.int += z; const pay = Math.min(pool.kk, debt+z); debt = debt + z - pay; row.kk = pay; pool.kk -= pay; if(debt <= 0.5 && !out.free) out.free = ymAdd(ym,1); }
    let spare = pool.kk; pool.kk = 0;
    // frei gewordenes Geld fliesst in der Reihenfolge der Variante weiter
    const take = (k, v) => { if(k==='ntg'){ const room = Math.max(0, ntgT-ntg), x = Math.min(v, room); ntg += x; row.ntg += x; if(ntg >= ntgT-0.5 && !out.full) out.full = ymAdd(ym,1); return v-x; }
      if(k==='p3'){ const room = Math.max(0, B.max3 - paidY), x = B.v3.length ? Math.min(v, room) : 0; paidY += x; out.p3 += x; out.tax3 += x*0.2; row.p3 += x; return v-x; }
      rest += v; row.rest += v; return 0; };
    spare += take('ntg', pool.ntg); spare += take('p3', pool.p3); take('rest', pool.rest);
    for(const k of order){ if(spare < 0.5) break; spare = take(k, spare); }
    if(spare > 0) take('rest', spare);
    ntg *= 1 + rN; rest *= 1 + rR; out.m.push(row);
  }
  if(ntg >= ntgT-0.5 && !out.full) out.full = B.nx;
  out.wealth = (ntg - B.nt.cur) + out.p3 + rest + (B.debt - debt) - 0 + out.tax3;
  out.debtEnd = debt; return out;
}
function aiVariants(B){
  const F = Math.max(0, B.free), d = B.debt > 0.5, full = B.nt.ok, cap3 = B.v3.length ? B.max3/12 : 0, sug = kkSuggest();
  const V = [];
  { const kk = d ? Math.min(F, Math.max(sug, r10(F*0.7))) : 0, R = F-kk, ntg = full ? 0 : r10(R*0.7);
    V.push({k:'s1', l:'Schulden zuerst', d:'Kreditkarte so schnell wie möglich weg, dann Notgroschen, dann Säule 3a.', kk, ntg, p3:0, rest:Math.max(0,R-ntg), order:['ntg','p3','rest']}); }
  { const kk = d ? Math.min(F, sug) : 0, R = F-kk, ntg = full ? 0 : r10(R*0.5), p3 = Math.min(r10(cap3), r10(R*0.3));
    V.push({k:'s2', l:'Ausgewogen', d:'Karte in rund einem Jahr weg, gleichzeitig Notgroschen und etwas Säule 3a.', kk, ntg, p3, rest:Math.max(0,R-ntg-p3), order:['ntg','p3','rest']}); }
  { const kk = d ? Math.min(F, sug) : 0, R = F-kk, p3 = Math.min(r10(cap3), R), R2 = R-p3, ntg = full ? 0 : r10(R2*0.7);
    V.push({k:'s3', l:'Steuern sparen', d:'Säule 3a voll ausschöpfen (spart Steuern), Karte in rund einem Jahr, dann Notgroschen.', kk, ntg, p3, rest:Math.max(0,R2-ntg), order:['p3','ntg','rest']}); }
  V.forEach(v=>v.sim = aiSim(B, v, v.order));
  const cur = {k:'cur', l:'Heute', d:'So, wie Geldfluss und Budget jetzt eingestellt sind.', ...B.cur}; cur.sim = aiSim(B, cur, ['rest']);
  let best = V.slice().sort((a,b)=>b.sim.wealth - a.sim.wealth)[0];
  // Bei Kartenschuld: «Schulden zuerst», wenn es höchstens wenig schlechter ist – schneller frei, weniger Risiko
  if(d && best.k!=='s1' && V[0].sim.wealth >= best.sim.wealth - Math.max(300, best.sim.wealth*0.01)) best = V[0];
  return {V, cur, best};
}
function aiWhy(B, X){
  const w = [], best = X.best, s = best.sim, c = X.cur.sim;
  if(B.debt > 0.5) w.push(`Die Kreditkarte kostet ${kkZins()} % Zins – jeder abbezahlte Franken bringt mehr als jedes Sparkonto.${s.free?` Mit «${best.l}» ist sie im ${ymLabel(s.free)} weg${c.free && c.free!==s.free ? ` (heute: ${ymLabel(c.free)})` : !c.free ? ' (heute: nicht absehbar)' : ''}.`:''}`);
  if(!B.nt.ok) w.push(`Der Notgroschen (Ziel CHF ${chf0(B.nt.tgt)} = 3 Monatsausgaben) schützt davor, dass die Karte bei einer Überraschung wieder wächst.${s.full?` Voll im ${ymLabel(s.full)}.`:''}`);
  if(B.v3.length) w.push(`Säule 3a spart je nach Einkommen rund 15–25 % Steuern, das Geld ist aber bis zur Pension gebunden. Geschätzte Steuerersparnis in 2 Jahren: CHF ${chf0(s.tax3)}.`);
  const gain = s.wealth - c.wealth; if(gain > 20) w.push(`Gegenüber heute stehst du in 24 Monaten um rund CHF ${chf0(gain)} besser da – bei gleichem Budget für Leben, Wünsche und Freizeit.`);
  return w;
}
function aiDialog(){
  if(!FL().nodes.length){ toastMsg('Zuerst den Geldfluss aufbauen (Budget › Geldfluss)'); return; }
  const dl = $('#dlg'); dl.classList.add('aiw'); dl.addEventListener('close', ()=>dl.classList.remove('aiw'), {once:true});
  const B = aiBase(), X = aiVariants(B), cols = [X.cur, ...X.V], pick = S.aiPick || X.best.k;
  const f = v => v>0.5 ? chf0(v) : '–', ym = y => y ? ymLabel(y) : '–';
  const rows = [['Kreditkarte abzahlen', c=>f(c.kk)], ['Notgroschen', c=>f(c.ntg)], ['Säule 3a', c=>f(c.p3)], ['Steuern zurücklegen', c=>f(B.tax)], ['Rest aufs Sparkonto', c=>f(c.rest)]];
  const res = [['Kreditkarte schuldenfrei', c=>B.debt>0.5 ? (c.sim.free ? ym(c.sim.free) : '<span class="neg">nicht absehbar</span>') : 'keine Schuld'], ['Notgroschen voll', c=>B.nt.ok ? 'schon voll' : (c.sim.full ? ym(c.sim.full) : '<span class="neg">nicht in 2 Jahren</span>')], ['Kartenzins bezahlt', c=>'CHF '+chf0(c.sim.int)], ['Steuern gespart (3a, geschätzt)', c=>'CHF '+chf0(c.sim.tax3)], ['Vermögen wächst in 24 Monaten um', c=>'<b>CHF '+chf0(c.sim.wealth)+'</b>']];
  const th = c => `<th class="num aicol ${c.k===X.best.k?'best':''}">${c.k==='cur' ? 'Heute' : `<label><input type="radio" name="aip" value="${c.k}" ${pick===c.k?'checked':''}> ${esc(c.l)}</label>`}${c.k===X.best.k?'<span class="aibest">Empfohlen</span>':''}</th>`;
  dialog(`<h3>Fluss-Assistent</h3>
    <p class="small muted" style="margin-top:-6px">Rechnet nur auf dem Gerät, Monat für Monat für die nächsten 24 Monate. Dein Budget für Leben, Wünsche und Freizeit bleibt gleich – verteilt wird nur, was übrig ist.</p>
    <div class="aisum"><span>Einkommen <b>CHF ${chf0(B.inc)}</b></span><span>Grundbedarf & Fixkosten <b>CHF ${chf0(B.need)}</b></span><span>Wünsche & Freizeit <b>CHF ${chf0(B.want)}</b></span><span>Steuern <b>CHF ${chf0(B.tax)}</b></span><span>frei zu verteilen <b class="${B.free<0?'neg':''}">CHF ${chf0(B.free)}</b></span></div>
    ${B.free <= 0 ? `<p class="small neg">Das Budget verplant schon mehr als das Einkommen (${ymLabel(B.nx)}). Zuerst bei Wünschen oder Freizeit etwas kürzen – dann kann der Assistent verteilen.</p>` : ''}
    <div class="aitbl"><table><thead><tr><th>pro Monat</th>${cols.map(th).join('')}</tr></thead><tbody>
      ${rows.map(([l,fn])=>`<tr><td>${l}</td>${cols.map(c=>`<td class="num ${c.k===X.best.k?'best':''}">${fn(c)}</td>`).join('')}</tr>`).join('')}
      <tr class="aisep"><td colspan="${cols.length+1}">Ergebnis</td></tr>
      ${res.map(([l,fn])=>`<tr><td>${l}</td>${cols.map(c=>`<td class="num ${c.k===X.best.k?'best':''}">${fn(c)}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>
    <p class="small muted" style="margin:6px 0">${X.V.map(v=>`<b>${esc(v.l)}:</b> ${esc(v.d)}`).join('<br>')}</p>
    <h4 class="flph">Warum «${esc(X.best.l)}»</h4><ul class="small aiwhy">${aiWhy(B, X).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
    <p class="small muted">Wird Geld frei (Karte bezahlt, Notgroschen voll), fliesst es automatisch zum nächsten Ziel. Übernehmen ändert Geldfluss, Abzahlbetrag und die passenden Budget-Kategorien ab ${ymLabel(B.nx)}. Die App bucht nichts selbst. Keine Anlageberatung.</p>
    <div class="acts"><button class="btn" data-dlg="cancel">Schliessen</button><button class="btn pri" data-dlg="ok" ${B.free<=0?'disabled':''}>Gewählte Variante übernehmen</button></div>`,
  k=>{ $('#dlg').classList.remove('aiw'); if(k!=='ok') return; const sel = document.querySelector('input[name=aip]:checked')?.value || X.best.k; S.aiPick = sel; const v = X.V.find(x=>x.k===sel); if(v) setTimeout(()=>aiApply(B, v), 20); });
}
function aiApply(B, v){
  const F = FL(); F.since ||= TODAY; const ms = v.sim.m, main = flpAccNode(B.mainId) || flpEnsureAcc(B.mainId, 340, 220);
  if(v.kk > 0) PL().kkAmt = r2(v.kk); else if(B.debt <= 0.5) delete PL().kkAmt;
  // Übertrag Monat für Monat setzen – über eine Budget-Kategorie (dann auch in Planen) oder fest auf dem Draht
  const setFlow = (acc, keys) => { if(!acc) return; const amt = ms.map(r=>r2([].concat(keys).reduce((a,k)=>a+r[k],0))); if(!amt.some(x=>x>0.5) && !F.edges.some(e=>e.f===main.id && flN(e.t)?.ref===acc.id)) return;
    const n = flpEnsureAcc(acc.id, main.x+330, main.y-160); let e = F.edges.find(x=>x.f===main.id && x.t===n.id);
    if(e && e.mode==='rest') return;   // Rest-Draht nimmt ohnehin alles Übrige
    if(e && e.mode==='kat' && e.cats?.length){ const c = e.cats[0]; D.plan[c] ??= {}; ms.forEach((r,i)=>{ if(amt[i]>0.5) D.plan[c][r.ym] = amt[i]; else delete D.plan[c][r.ym]; });
      return; }
    if(!e){ if(flCanLink(main.id, n.id)) return; e = {id:'e'+uid(), since:TODAY, f:main.id, t:n.id, mode:'fix', a:0}; F.edges.push(e); }
    const now = flPlan(TODAY).E[e.id] || 0; e.mode = 'fix'; e.m = {[TODAY]:r2(now)}; ms.forEach((r,i)=>e.m[r.ym] = amt[i]); e.a = r10(amt.slice(-12).reduce((x,y)=>x+y,0)/12); };
  setFlow(B.ntgA, B.restA===B.ntgA ? ['ntg','rest'] : 'ntg'); for(const a of B.v3.slice(0,1)) setFlow(a, 'p3');
  // Rest: ein Draht «Rest» vom Hauptkonto aufs Sparkonto fängt alles auf, was übrig bleibt
  if(B.restA && !flOut(main.id).some(e=>e.mode==='rest')){ const n = flpEnsureAcc(B.restA.id, main.x+330, main.y+160); let e = F.edges.find(x=>x.f===main.id && x.t===n.id);
    if(e && B.restA===B.ntgA){ /* gleiches Konto: der Rest ist im festen Draht schon enthalten */ }
    else if(e) e.mode = 'rest'; else if(!flCanLink(main.id, n.id)) F.edges.push({id:'e'+uid(), since:TODAY, f:main.id, t:n.id, mode:'rest'}); }
  // Steuern: Budget nachziehen, wenn zu tief
  if(B.t.mon > (B.t.budM||0) + 5){ const c = D.cats.find(x=>!x.archived && !x.wid && isTaxC(x)); if(c){ D.plan[c.id] ??= {}; for(const m of (C?.months||[]).filter(m=>m>=B.nx)) D.plan[c.id][m] = r10(B.t.mon); } }
  flLayout(); flpCache.k = null; flSync(); save(); render(); toastMsg(`«${v.l}» übernommen – Geldfluss und Budget angepasst`);
}

/* ---------- Knöpfe ---------- */
vGeldfluss = (prev => function(){ let h = prev(); if(NATIVE || !FL().nodes.length) return h;
  return h.replace('<button class="btn sm" data-act="fladd">+ Kästchen</button>', '<button class="btn sm pri" data-act="flai">Fluss-Assistent</button><button class="btn sm" data-act="fladd">+ Kästchen</button>')
    .replace('<p class="small muted">Kästchen und Drähte bearbeitest du am PC.', '<button class="btn sm pri" data-act="flai" style="margin:0 8px 8px 0">Fluss-Assistent</button><p class="small muted">Kästchen und Drähte bearbeitest du am PC.'); })(vGeldfluss);
CUSTOM_V.geldfluss = vGeldfluss;
document.addEventListener('click', ev=>{ const a = ev.target.closest('[data-act="flai"]'); if(!a || !D) return; ev.stopPropagation(); ev.preventDefault(); if($('#dlg').open) $('#dlg').close(); setTimeout(aiDialog, 30); }, true);
