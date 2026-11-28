/* =====================================================================
   86. GELDFLUSS-PLAN (1.61.0) – Verbindungen zwischen Konten im Stil von Grasshopper
   • Kästchen: Einkommen, Konten, Töpfe (z. B. Eigenheim, Auto auf dem Sparkonto),
     Ausgaben-Bereiche (5 Gruppen) oder einzelne Budget-Kategorien.
   • Drähte: wie viel pro Monat wohin fliesst – fester Betrag (pro Monat änderbar),
     «Rest» oder «deckt den Bedarf» (Budget bzw. was das Ziel weitergibt), oder aus Budget-Kategorien.
   • Plan vs. Ist: echte Überträge, Einnahmen und Ausgaben werden den Drähten zugeordnet.
     Fehlt Geld, schlägt die App einen Ausgleich vor (vormerken oder auf den nächsten Monat verschieben).
   • Grundlage: Überträge zwischen Konten werden zu geplanten Überträgen (D.plans, flow:…),
     damit Prognose, Kontotrend, Kalender und «Kommende Zahlungen» damit rechnen.
   • Bearbeiten nur in der PC-Version (Web). Alles wird auf dem Gerät gerechnet.
   ===================================================================== */
var FL_H = 24;                                    // Monate, die als geplante Überträge eingetragen werden
var FL = () => (D.flow ??= {v:1, nodes:[], edges:[]});
var flN = id => FL().nodes.find(n=>n.id===id);
var flE = id => FL().edges.find(e=>e.id===id);
var flIn = id => FL().edges.filter(e=>e.t===id);
var flOut = id => FL().edges.filter(e=>e.f===id);
var flGS = k => (typeof GS!=='undefined' ? GS : []).find(g=>g.k===k);
var flCatsOfGroup = k => D.cats.filter(c=>!c.archived && !c.wid && gSec(c).k===k);

/* ---------- Namen, Farben, Symbole ---------- */
function flName(n){
  if(!n) return '?';
  if(n.t==='acc') return accName(n.ref);
  if(n.t==='inc') return n.ref==='lohn' ? 'Lohn' : ((D.incSide||[]).find(s=>s.id===n.ref)?.name || 'Einkommen');
  if(n.t==='exp') return n.name || (n.ref.startsWith('g:') ? (flGS(n.ref.slice(2))?.n || 'Ausgaben') : catName(n.ref.slice(2)));
  return n.name || 'Topf';
}
var FL_T = {inc:{l:'Einkommen', c:'#d49b14'}, acc:{l:'Konto', c:'var(--acc)'}, pot:{l:'Topf', c:'#1aa39a'}, exp:{l:'Ausgaben', c:'#c4566a'}};
var FL_AK = {alltag:'Konto', sparen:'Sparkonto', haushalt:'Haushaltkonto', karte:'Karte / Kredit', invest:'Investkonto', vorsorge:'Vorsorge'};
var flKind = n => { if(n.t!=='acc') return FL_T[n.t].l; const a = D.accounts.find(x=>x.id===n.ref); return (a && FL_AK[accGrp(a)]) || 'Konto'; };
var flCol = n => n.t==='exp' && n.ref.startsWith('g:') ? (flGS(n.ref.slice(2))?.c || FL_T.exp.c) : FL_T[n.t].c;
var flSrcAcc = n => n ? (n.t==='acc' ? n.ref : n.t==='pot' ? n.acc : null) : null;   // auf welchem echten Konto liegt das Geld?

/* ---------- Planbeträge ---------- */
var flIncomeOf = (n, ym) => { const side = (D.incSide||[]).reduce((a,s)=>a+(+(s.plan?.[ym])||0),0);
  if(n.ref==='lohn') return Math.max(0, (+D.income?.[ym]||0) - side); return +((D.incSide||[]).find(s=>s.id===n.ref)?.plan?.[ym]) || 0; };
// Budget-Kategorien, die ein Ausgaben-Kästchen abdeckt (einzelne Kategorien mit eigenem Kästchen und mit Draht verknüpfte Spar-Kategorien fallen aus der Gruppe heraus)
function flExpCats(n){
  if(n.ref.startsWith('c:')) return [n.ref.slice(2)];
  const own = new Set(FL().nodes.filter(x=>x.t==='exp' && x.ref.startsWith('c:')).map(x=>x.ref.slice(2)));
  FL().edges.forEach(e=>(e.cats||[]).forEach(c=>own.add(c)));
  return flCatsOfGroup(n.ref.slice(2)).map(c=>c.id).filter(id=>!own.has(id));
}
var flBud = (cats, ym) => cats.reduce((a,c)=>a+(+(D.plan?.[c]?.[ym])||0),0);
var flAmt = (e, ym) => Math.max(0, +(e.m?.[ym] ?? e.a) || 0);

function flPlan(ym){
  const memo = {}, busy = new Set(), F = FL();
  const need = n => n.t==='exp' ? flBud(flExpCats(n), ym) : flOut(n.id).reduce((a,e)=>a+P(e),0);
  const avail = n => n.t==='inc' ? flIncomeOf(n, ym) : flIn(n.id).reduce((a,e)=>a+P(e),0);
  function P(e){
    if(memo[e.id]!=null) return memo[e.id]; if(busy.has(e.id)) return 0; busy.add(e.id);
    const f = flN(e.f), t = flN(e.t); let v = 0;
    if(!f || !t) v = 0;
    else if(e.m?.[ym]!=null) v = +e.m[ym] || 0;           // eigener Betrag für diesen Monat (auch bei Rest/Deckt/Budget)
    else if(e.mode==='fix') v = flAmt(e, ym);
    else if(e.mode==='kat') v = flBud(e.cats||[], ym);
    else if(e.mode==='deckt'){ const others = flIn(t.id).filter(x=>x.id!==e.id && x.mode!=='deckt'); v = need(t) - others.reduce((a,x)=>a+P(x),0);
      const dk = flIn(t.id).filter(x=>x.mode==='deckt'); if(dk.length>1) v = v/dk.length; }
    else if(e.mode==='rest'){ const others = flOut(f.id).filter(x=>x.id!==e.id && x.mode!=='rest'); v = avail(f) - others.reduce((a,x)=>a+P(x),0);
      const rs = flOut(f.id).filter(x=>x.mode==='rest'); if(rs.length>1) v = v/rs.length; }
    busy.delete(e.id); return memo[e.id] = Math.max(0, Math.round(v*100)/100);
  }
  const E = {}; F.edges.forEach(e=>E[e.id] = P(e));
  const N = {}; F.nodes.forEach(n=>{ const i = n.t==='inc' ? flIncomeOf(n, ym) : flIn(n.id).reduce((a,e)=>a+E[e.id],0), o = flOut(n.id).reduce((a,e)=>a+E[e.id],0);
    N[n.id] = {in:i, out:o, need:n.t==='exp' ? flBud(flExpCats(n), ym) : null}; });
  return {E, N};
}

/* ---------- Effektiv: Buchungen den Drähten zuordnen ---------- */
var flMonthTx = ym => D.tx.filter(t=>t.d && t.d.startsWith(ym) && !t.planned && !t.vorm);
function flTrMatrix(ym){
  const L = flMonthTx(ym), M = {}, add = (a,b,v) => { if(!a || !b || a===b) return; const k = a+'>'+b; M[k] = (M[k]||0)+v; };
  for(const t of L) if(isTr(t) && !t.imp && t.ta && t.acc && t.toAcc) add(t.acc, t.toAcc, +t.ta);
  const outs = L.filter(t=>isTr(t) && t.imp && (+t.sa||0)<0), ins = L.filter(t=>isTr(t) && t.imp && (+t.sa||0)>0), used = new Set();
  for(const o of outs){ const A = bkAcc(o), v = Math.abs(+o.sa);
    if(o.toAcc){ add(A, o.toAcc, v); continue; }
    const p = ins.find(i=>!used.has(i) && bkAcc(i)!==A && Math.abs(Math.abs(+i.sa)-v)<0.02 && Math.abs(dDiff(i.d, o.d))<=3);
    if(p){ used.add(p); add(A, bkAcc(p), v); } }
  return M;
}
var flSpend = (cats, acc, ym) => { const S2 = new Set(cats); return flMonthTx(ym).reduce((a,t)=>{ const v = kSpend(t); return v && S2.has(bhKey(t.c)) && (!acc || bkAcc(t)===acc) ? a+v : a; },0); };
var flIncIn = (acc, ym) => flMonthTx(ym).reduce((a,t)=>t.c==='_inc' && bkAcc(t)===acc ? a+Math.max(0, sv(t)) : a, 0);

function flEff(ym, plan){
  plan ||= flPlan(ym);
  const M = flTrMatrix(ym), out = {}, F = FL();
  // Überträge zwischen zwei echten Konten auf die Drähte mit derselben Strecke verteilen (nach Plananteil)
  const byPair = {};
  for(const e of F.edges){ const f = flN(e.f), t = flN(e.t); if(!f || !t) continue;
    if(f.t==='inc'){ const A = flSrcAcc(t); const same = F.edges.filter(x=>flN(x.f)?.t==='inc' && flSrcAcc(flN(x.t))===A), tot = same.reduce((a,x)=>a+plan.E[x.id],0);
      out[e.id] = flIncIn(A, ym) * (tot ? plan.E[e.id]/tot : 1/same.length); continue; }
    if(t.t==='exp'){ out[e.id] = flSpend(flExpCats(t), flSrcAcc(f), ym); continue; }
    const A = flSrcAcc(f), B = flSrcAcc(t);
    if(A && A===B){ out[e.id] = null; continue; }                // innerhalb desselben Kontos (Topf): nur Plan
    (byPair[A+'>'+B] ??= []).push(e); }
  for(const [k, es] of Object.entries(byPair)){ const tot = es.reduce((a,x)=>a+plan.E[x.id],0), have = M[k]||0;
    const spendCats = es.flatMap(x=>x.cats||[]), viaCat = spendCats.length ? flSpend(spendCats, k.split('>')[0], ym) : 0;
    es.forEach(e=>out[e.id] = (have + viaCat) * (tot ? plan.E[e.id]/tot : 1/es.length)); }
  return out;
}
var flDay = e => e.day || Math.min(28, (lmStart()===1 ? 1 : lmStart()+1));
function flState(e, ym, p, f){
  const t = flN(e.t), isExp = t?.t==='exp';
  if(ym > TODAY) return 'plan';
  if(f==null) return 'intern';
  if(ym < (e.since || FL().since || '0000-00')) return f >= p - 1 ? 'ok' : 'vor';   // vor dem Geldfluss-Plan: nur zeigen, kein Ausgleich
  if(isExp) return f > p + 1 ? 'over' : (ym < TODAY ? 'ok' : 'run');
  if(f >= p - 1) return 'ok';
  if(e.ack?.[ym]) return 'ack';
  const due = ym+'-'+p2(Math.min(flDay(e), +mEnd(ym).slice(8)));
  return ym < TODAY || dAdd(due, 5) < todayIso() ? 'short' : 'wait';
}

/* ---------- Töpfe: Stand und Ziel ---------- */
function flPot(n){
  const from = n.startYm || TODAY, base = +n.start || 0; let eff = base, plan = base;
  for(let ym = from; ym <= TODAY; ym = ymAdd(ym,1)){ const P = flPlan(ym), Fx = ym===TODAY ? null : flEff(ym, P);
    for(const e of flIn(n.id)){ const v = P.E[e.id]; plan += v; eff += Fx && Fx[e.id]!=null ? Fx[e.id] : v; }
    for(const e of flOut(n.id)){ const v = P.E[e.id]; plan -= v; eff -= Fx && Fx[e.id]!=null ? Fx[e.id] : v; } }
  let goal = null;
  if(n.target>0){ let s = eff; if(s >= n.target) goal = TODAY;
    else for(let i=1, ym=ymAdd(TODAY,1); i<=360; i++, ym=ymAdd(ym,1)){ const P = flPlan(ym); s += flIn(n.id).reduce((a,e)=>a+P.E[e.id],0) - flOut(n.id).reduce((a,e)=>a+P.E[e.id],0); if(s >= n.target){ goal = ym; break; } } }
  return {eff, plan, goal};
}

/* ---------- Grundlage: Überträge als geplante Überträge eintragen ---------- */
function flSync(){
  if(!D) return; D.plans ??= [];
  const F = FL(), keep = new Set(F.edges.map(e=>e.id));
  // übernommene Daueraufträge wieder einschalten, wenn ihr Draht gelöscht wurde
  for(const p of D.plans) if(p.flowOff && !keep.has(p.flowOff)){ p.off = false; delete p.flowOff; }
  D.plans = D.plans.filter(p=>!p.flow || (p.flowAdj && keep.has(p.flow)));
  const wpl = (D.walletApi?.planned||[]).filter(p=>(p.ty==='transfer' || p.to) && p.acc && p.to);
  for(const e of F.edges){ const f = flN(e.f), t = flN(e.t); if(!f || !t || f.t==='inc' || t.t==='exp') continue;
    const A = flSrcAcc(f), B = flSrcAcc(t); if(!A || !B || A===B) continue;
    if(wpl.some(p=>p.acc===A && p.to===B)){ e.wallet = 1; continue; } delete e.wallet;
    const day = flDay(e), months = []; for(let i=0, ym=TODAY; i<FL_H; i++, ym=ymAdd(ym,1)) months.push([ym, flPlan(ym).E[e.id]]);
    if(TODAY+'-'+p2(Math.min(day, +mEnd(TODAY).slice(8))) < todayIso()) months[0][1] = 0;   // Termin diesen Monat schon vorbei: offene Beträge zeigt der Geldfluss als «Ausgleich»
    let i = 0, seg = 0;
    while(i < months.length){ let j = i; while(j+1 < months.length && Math.abs(months[j+1][1]-months[i][1])<0.01) j++;
      const amt = months[i][1], last = j===months.length-1;
      if(amt > 0.004){ const s = months[i][0], st = s+'-'+p2(Math.min(day, +mEnd(s).slice(8)));
        D.plans.push({id:'fl'+e.id+'_'+(seg++), type:'tr', name:`Geldfluss: ${flName(f)} → ${flName(t)}`, amount:amt, freq:'M', start:st, ...(last?{}:{end:mEnd(months[j][0])}), day, acc:A, to:B, cat:BK_TRANSFER, match:'', flow:e.id}); }
      i = j+1; } }
}
var flSave = () => { flSync(); save(); render(); };

/* ---------- Aus der aktuellen Logik aufbauen ---------- */
function flAuto(){
  const F = {v:1, nodes:[], edges:[]}, id = p => p+uid(), from3 = ymAdd(TODAY,-3)+'-01';
  const accs = D.accounts.filter(a=>!a.archived), cnt = {};
  for(const t of D.tx) if(t.d>=from3 && t.c==='_inc' && sv(t)>0){ const a = bkAcc(t); cnt[a] = (cnt[a]||0)+sv(t); }
  const main = Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0] || mainAcc()?.id;
  const inc = {id:id('n'), t:'inc', ref:'lohn', x:40, y:220}; F.nodes.push(inc);
  (D.incSide||[]).filter(s=>Object.values(s.plan||{}).some(v=>+v>0)).forEach((s,i)=>F.nodes.push({id:id('n'), t:'inc', ref:s.id, x:40, y:380+i*160}));
  const mn = {id:id('n'), t:'acc', ref:main, x:340, y:220}; F.nodes.push(mn);
  F.nodes.filter(n=>n.t==='inc').forEach(n=>F.edges.push({id:id('e'), f:n.id, t:mn.id, mode:'rest'}));
  // weitere Konten: Sparen, Haushalt, Karte, Vorsorge, Invest
  let y = 40; const accNode = {}; accNode[main] = mn;
  for(const a of accs){ if(a.id===main) continue; const g = typeof accGrp==='function' ? accGrp(a) : '';
    if(!['sparen','haushalt','karte','vorsorge','invest'].includes(g) && !(D.plans||[]).some(p=>p.type==='tr' && !p.off && p.to===a.id)) continue;
    const n = {id:id('n'), t:'acc', ref:a.id, x:660, y}; y += 160; F.nodes.push(n); accNode[a.id] = n;
    const pl = (D.plans||[]).filter(p=>p.type==='tr' && !p.off && !p.flow && p.acc===main && p.to===a.id);
    const sc = D.cats.filter(c=>!c.archived && !c.wid && c.group==='spar' && c.acc===a.id).map(c=>c.id);
    if(pl.length) pl.forEach(p=>F.edges.push({id:id('e'), f:mn.id, t:n.id, mode:'fix', a:+p.amount||0, day:+p.day||undefined, adopt:p.id}));
    else if(sc.length) F.edges.push({id:id('e'), f:mn.id, t:n.id, mode:'kat', cats:sc});
    else if(g==='karte' || g==='haushalt') F.edges.push({id:id('e'), f:mn.id, t:n.id, mode:'deckt'}); }
  // Ausgaben-Bereiche: vom Konto, das sie meistens bezahlt
  let ye = 40;
  for(const g of (typeof GS!=='undefined' ? GS : [])){ const n = {id:id('n'), t:'exp', ref:'g:'+g.k, x:1000, y:ye};
    const cats = new Set(flCatsOfGroup(g.k).map(c=>c.id)); F.edges.forEach(e=>(e.cats||[]).forEach(c=>cats.delete(c)));
    if(!cats.size || ![0,1,2].some(i=>flBud([...cats], ymAdd(TODAY,i)) > 0)) continue;
    const pay = {}; for(const t of D.tx) if(t.d>=from3 && cats.has(bhKey(t.c))){ const v = kSpend(t); if(v) pay[bkAcc(t)] = (pay[bkAcc(t)]||0)+v; }
    const src = Object.keys(pay).filter(a=>accNode[a] || accs.some(x=>x.id===a)).sort((a,b)=>pay[b]-pay[a])[0] || main;
    if(!accNode[src]){ const a = accs.find(x=>x.id===src); if(!a) continue; accNode[src] = {id:id('n'), t:'acc', ref:src, x:660, y}; y += 160; F.nodes.push(accNode[src]);
      if(src!==main) F.edges.push({id:id('e'), f:mn.id, t:accNode[src].id, mode:'deckt'}); }
    F.nodes.push(n); ye += 160; F.edges.push({id:id('e'), f:accNode[src].id, t:n.id, mode:'deckt'}); }
  // übernommene Daueraufträge nicht doppelt rechnen
  for(const e of F.edges) if(e.adopt){ const p = D.plans.find(x=>x.id===e.adopt); if(p){ p.off = true; p.flowOff = e.id; } }
  F.since = TODAY; D.flow = F; S.flView = null; flSave();
  toastMsg('Geldfluss aus deinen Konten, Daueraufträgen und dem Budget aufgebaut');
}

/* ---------- Ansicht ---------- */
var flYm = () => S.flYm || TODAY;
var flCanEdit = () => !NATIVE;
function flSum(ym, P){
  const F = FL(), inc = F.nodes.filter(n=>n.t==='inc').reduce((a,n)=>a+flIncomeOf(n, ym),0);
  const toExp = F.edges.filter(e=>flN(e.t)?.t==='exp').reduce((a,e)=>a+P.E[e.id],0);
  const toSave = F.edges.filter(e=>{ const t = flN(e.t), f = flN(e.f); if(!t || !f || t.t==='exp' || f.t==='inc') return false; const g = t.t==='pot' ? 'pot' : (typeof accGrp==='function' ? accGrp(D.accounts.find(a=>a.id===t.ref)||{}) : ''); return ['pot','sparen','vorsorge','invest'].includes(g); }).reduce((a,e)=>a+P.E[e.id],0);
  return {inc, toExp, toSave};
}
function flNodeHtml(n, P, Fx){
  const v = P.N[n.id] || {in:0,out:0}, ed = flCanEdit();
  let body = '';
  if(n.t==='inc') body = `<div class="fnv"><b>CHF ${chf0(v.in)}</b><span>geplant im Monat</span></div>`;
  else if(n.t==='exp'){ const eff = flIn(n.id).reduce((a,e)=>a+(Fx[e.id]||0),0), cats = flExpCats(n).length;
    body = `<div class="fnv"><b>CHF ${chf0(v.need)}</b><span>Budget · ${cats} Kategorie${cats===1?'':'n'}</span></div>${flYm()<=TODAY?`<div class="fnv2 ${eff>v.need+1?'neg':''}">effektiv CHF ${chf0(eff)}</div>`:''}`; }
  else { const bal = n.t==='acc' ? accBal(D.accounts.find(a=>a.id===n.ref)||{}) : null, d = v.in - v.out, hasIn = flIn(n.id).length;
    body = `<div class="fnio"><span>rein</span><b>${chf0(v.in)}</b><span>raus</span><b>${chf0(v.out)}</b></div>
      ${hasIn && d < -1 ? `<div class="fnv2 neg">${chf0(-d)} mehr verplant als rein</div>` : d > 1 && n.t==='acc' && flOut(n.id).length ? `<div class="fnv2">bleibt ${chf0(d)}</div>` : ''}
      ${n.t==='pot' ? (()=>{ const s = flPot(n); return `<div class="fnv2">Stand ca. CHF ${chf0(s.eff)}${n.target?` · Ziel ${chf0(n.target)}${s.goal?` ${s.goal===TODAY?'erreicht':'im '+ymLabel(s.goal)}`:''}`:''}</div>`; })()
        : bal!=null && isFinite(bal) ? `<div class="fnv2 muted">Stand heute CHF ${chf0(bal)}</div>` : ''}`; }
  return `<div class="fnode fn-${n.t}" data-n="${n.id}" style="left:${n.x}px;top:${n.y}px;--nc:${flCol(n)}">
    ${n.t!=='inc'?'<span class="fpin" data-pin="in" title="Eingang"></span>':''}
    <div class="fnh" ${ed?'data-drag="1"':''}><span class="fnk">${esc(flKind(n))}</span><button class="fnb" data-act="flnode" data-n="${n.id}" aria-label="${esc(flName(n))} bearbeiten">⋯</button></div>
    <div class="fnn">${esc(flName(n))}</div>${body}
    ${n.t!=='exp'?`<span class="fpin out" data-pin="out" title="${ed?'Ziehen, um zu verbinden':'Ausgang'}"></span>`:''}</div>`;
}
var FL_SC = {vor:'#8e98a6', ok:'#2e9d5b', run:'var(--muted)', plan:'var(--muted)', short:'#d98a1c', over:'#d9534f', ack:'#8e98a6', wait:'var(--muted)', intern:'#1aa39a'};
var FL_SL = {ok:'✓', run:'läuft', plan:'geplant', short:'fehlt', over:'über Budget', ack:'so gelassen', wait:'kommt noch', intern:'intern', vor:'vor dem Plan'};
function flWires(P, Fx){
  const ym = flYm(), mx = Math.max(100, ...Object.values(P.E));
  return FL().edges.map(e=>{ const f = flN(e.f), t = flN(e.t); if(!f || !t) return '';
    const p = P.E[e.id], ef = Fx[e.id], st = flState(e, ym, p, ef), w = 1.6 + 7*Math.sqrt(p/mx);
    const x1 = f.x + 220, y1 = f.y + 46, x2 = t.x, y2 = t.y + 46, dx = Math.max(60, Math.abs(x2-x1)*0.5);
    const d = `M${x1},${y1} C${x1+dx},${y1} ${x2-dx},${y2} ${x2},${y2}`, mxp = (x1+x2)/2, myp = (y1+y2)/2;
    const lab = `${chf0(p)}${e.mode==='rest'?' Rest':e.mode==='deckt'?' ⇆':''}`, sub = ef!=null && ym<=TODAY ? (st==='ok'?'✓':`${chf0(ef)} / ${chf0(p)}`) : FL_SL[st];
    return `<g class="fw st-${st}" data-act="fledge" data-e="${e.id}"><path class="fwh" d="${d}"/><path class="fwl ${ym>TODAY?'dash':''}" d="${d}" style="stroke:${FL_SC[st]};stroke-width:${w}"/>
      <foreignObject x="${mxp-70}" y="${myp-19}" width="140" height="38"><div class="fwt st-${st}"><b>${lab}</b><span>${sub}</span></div></foreignObject></g>`; }).join('');
}
function flIssues(){
  const out = [];
  for(const ym of [ymAdd(TODAY,-2), ymAdd(TODAY,-1), TODAY]){ const P = flPlan(ym), Fx = flEff(ym, P);
    for(const e of FL().edges){ const st = flState(e, ym, P.E[e.id], Fx[e.id]); if(st==='short' || st==='over') out.push({e, ym, p:P.E[e.id], f:Fx[e.id], st}); } }
  return out;
}
function vGeldfluss(){
  if(NATIVE) return `<div class="card"><h3>Geldfluss</h3><p class="small muted">Den Geldfluss-Plan bearbeitest du in der PC-Version. Die geplanten Überträge daraus siehst du hier unter «Kommende Zahlungen».</p></div>`;
  const F = FL(), ym = flYm();
  if(!F.nodes.length) return `<div class="card flintro"><h3>Geldfluss-Plan</h3>
    <p>Zeichne, wie dein Geld fliesst: vom Lohn aufs Privatkonto, von dort aufs Sparkonto, in Töpfe wie Eigenheim oder Auto und in die Ausgaben. Auf jedem Draht steht, wie viel pro Monat fliesst – jeden Monat auch anders.</p>
    <p class="small muted">Die App ordnet deine echten Überträge und Ausgaben den Drähten zu und zeigt, wo etwas fehlt. Überträge zwischen Konten werden zu geplanten Überträgen für Prognose und Kontotrend.</p>
    <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn pri" data-act="flauto">Aus meinen Konten und dem Budget aufbauen</button><button class="btn" data-act="fladd">Leer beginnen</button></div></div>`;
  const P = flPlan(ym), Fx = flEff(ym, P), sm = flSum(ym, P), iss = flIssues(), V = S.flView || {x:0, y:0, z:1};
  const narrow = innerWidth < 900;
  const list = narrow ? `<div class="card fllist"><h3>Alle Verbindungen · ${ymLabel(ym)}</h3>${F.edges.map(e=>{ const p = P.E[e.id], f = Fx[e.id], st = flState(e, ym, p, f);
      return `<div class="flli" data-act="fledge" data-e="${e.id}" role="button"><div class="sp"><b>${esc(flName(flN(e.f)))} → ${esc(flName(flN(e.t)))}</b><span class="small muted">Plan CHF ${chf0(p)}${f==null||ym>TODAY?'':` · effektiv CHF ${chf0(f)}`}</span></div><span class="flst st-${st}">${FL_SL[st]}</span></div>`; }).join('')}</div>` : `<div class="card fllist"><h3>Alle Verbindungen · ${ymLabel(ym)}</h3><div class="ytable"><table><thead><tr><th>Von</th><th>Nach</th><th class="num">Plan</th><th class="num">Effektiv</th><th></th></tr></thead><tbody>
    ${F.edges.map(e=>{ const p = P.E[e.id], f = Fx[e.id], st = flState(e, ym, p, f); return `<tr data-act="fledge" data-e="${e.id}" class="flrow"><td>${esc(flName(flN(e.f)))}</td><td>${esc(flName(flN(e.t)))}</td><td class="num">${chf0(p)}</td><td class="num">${f==null||ym>TODAY?'–':chf0(f)}</td><td><span class="flst st-${st}">${FL_SL[st]}</span></td></tr>`; }).join('')}</tbody></table></div></div>`;
  return `<div class="flbar card"><button class="brnav" data-act="flym" data-d="-1" aria-label="Monat zurück">‹</button><b class="flm">${ymLabel(ym)}</b><button class="brnav" data-act="flym" data-d="1" aria-label="Monat vor">›</button>
      <div class="flsum"><span>Einkommen <b>CHF ${chf0(sm.inc)}</b></span><span>in Ausgaben <b>CHF ${chf0(sm.toExp)}</b></span><span>gespart <b>CHF ${chf0(sm.toSave)}</b></span>${sm.inc?`<span>Sparquote <b>${Math.round(sm.toSave/sm.inc*100)} %</b></span>`:''}</div>
      ${!narrow?`<span class="sp"></span><button class="btn sm" data-act="fladd">+ Kästchen</button><button class="btn sm ghost" data-act="flfit">Einpassen</button><button class="btn sm ghost" data-act="flrebuild">Neu aufbauen</button>`:''}</div>
    ${iss.length?`<div class="card flissues"><h3>Ausgleich nötig (${iss.length})</h3>${iss.slice(0,6).map(x=>`<div class="row flis"><span class="sp">${x.st==='short'?'Fehlt':'Über Budget'}: <b>${esc(flName(flN(x.e.f)))} → ${esc(flName(flN(x.e.t)))}</b> · ${ymLabel(x.ym)} · CHF ${chf0(x.f||0)} statt ${chf0(x.p)}</span><button class="btn sm" data-act="fledge" data-e="${x.e.id}" data-ym="${x.ym}">Ansehen</button></div>`).join('')}</div>`:''}
    ${narrow ? `<p class="small muted">Kästchen und Drähte bearbeitest du am PC. Hier siehst du alle Verbindungen und kannst ausgleichen.</p>` :
    `<div class="flc" id="flc"><div class="flw" id="flw" style="transform:translate(${V.x}px,${V.y}px) scale(${V.z})"><svg class="fls" width="4000" height="3000">${flWires(P, Fx)}</svg>${F.nodes.map(n=>flNodeHtml(n, P, Fx)).join('')}</div>
      <div class="flhelp small">Kästchen am Kopf verschieben · vom Punkt rechts zum Punkt links eines anderen Kästchens ziehen = verbinden · Draht antippen = Betrag · Hintergrund ziehen = Ansicht verschieben · Mausrad = Zoom</div>
      <div class="flzoom"><button class="btn sm" data-act="flzoom" data-d="1.15" aria-label="Vergrössern">+</button><button class="btn sm" data-act="flzoom" data-d="0.87" aria-label="Verkleinern">−</button></div></div>`}
    ${list}`;
}

/* ---------- Dialoge ---------- */
function flEdgeDialog(eid, ymx){
  const e = flE(eid); if(!e) return; const f = flN(e.f), t = flN(e.t), ym = ymx || flYm(), P = flPlan(ym), Fx = flEff(ym, P), p = P.E[e.id], ef = Fx[e.id], st = flState(e, ym, p, ef);
  const ed = flCanEdit(), toExp = t.t==='exp', months = Array.from({length:12}, (_,i)=>ymAdd(ym>TODAY?ym:TODAY, i));
  const modes = [['fix','Fester Betrag'], ['rest', f.t==='inc'?'Ganzes Einkommen bzw. Rest':'Was übrig bleibt (Rest)'], ['deckt', toExp?'Deckt das Budget':'Deckt, was das Ziel weitergibt'], ...(e.cats?.length?[['kat','Aus Budget-Kategorien']]:[])];
  const miss = Math.max(0, p - (ef||0)), nx = ymAdd(ym,1);
  const auto = m => { const x = e.m?.[m]; if(x!=null) delete e.m[m]; const v = flPlan(m).E[e.id]; if(x!=null) e.m[m] = x; return v; };
  const fixBox = `<div id="flfix" ${e.mode==='fix'?'':'hidden'}><label class="f">Betrag pro Monat (CHF)<input id="fla" inputmode="decimal" value="${e.a!=null?chf(e.a):''}" placeholder="z. B. 600"></label></div>
    <details id="flmd" ${Object.keys(e.m||{}).length?'open':''}><summary class="small">Einzelne Monate anders</summary><div class="flmg">${months.map(m=>`<label><span>${ymLabel(m).replace(/ 20/,' ’')}</span><input data-flm="${m}" inputmode="decimal" value="${e.m?.[m]!=null?chf(e.m[m]):''}" placeholder="${chf0(auto(m))}"></label>`).join('')}</div>
    <p class="small muted">Leer = wie oben bzw. automatisch. Ein eigener Betrag gilt nur für diesen Monat.</p></details>`;
  dialog(`<h3>${esc(flName(f))} → ${esc(flName(t))}</h3>
    <div class="flstat st-${st}"><span>${ymLabel(ym)}</span><b>Plan CHF ${chf0(p)}</b>${ym<=TODAY&&ef!=null?`<b>Effektiv CHF ${chf0(ef)}</b>`:''}<span class="flst st-${st}">${FL_SL[st]}</span></div>
    ${st==='short'?`<div class="card2 flfix2"><b>Es fehlen CHF ${chf0(miss)}.</b> Wie ausgleichen?
      <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px"><button class="btn sm pri" data-dlg="adj-now">CHF ${chf0(miss)} als Übertrag vormerken</button><button class="btn sm" data-dlg="adj-next">Auf ${ymLabel(nx)} verschieben</button><button class="btn sm ghost" data-dlg="adj-ok">So lassen</button></div>
      <p class="small muted" style="margin:6px 0 0">Die App bucht nichts selbst – vorgemerkte Überträge erscheinen unter «Kommende Zahlungen», bis die Überweisung in deinen Buchungen auftaucht.</p></div>`:''}
    ${st==='over'?`<p class="small neg">Mehr ausgegeben als budgetiert (CHF ${chf0((ef||0)-p)}). Ausgleich: weniger ausgeben bis Monatsende oder das Budget unter «Budget › Planen» anpassen.</p>`:''}
    ${e.wallet?'<p class="small muted">Dieser Übertrag ist auch in Wallet als geplante Zahlung erfasst – die App rechnet mit dem Wallet-Eintrag.</p>':''}
    ${ed?`<label class="f">Art<select id="flmode">${modes.map(([v,l])=>`<option value="${v}" ${e.mode===v?'selected':''}>${l}</option>`).join('')}</select></label>
    ${fixBox}
    ${e.mode==='kat'?`<p class="small muted">Betrag aus dem Budget: ${(e.cats||[]).map(c=>esc(catName(c))).join(', ')}. Ändern unter «Budget › Planen».</p>`:''}
    ${toExp?'':`<label class="f">Tag im Monat<input id="flday" inputmode="numeric" value="${flDay(e)}"></label>`}
    ${acts(false, 'Verbindung löschen')}`:`<div class="acts"><button class="btn" data-dlg="cancel">Schliessen</button></div>`}`,
  k=>{ if(k==='cancel') return;
    if(k==='del'){ FL().edges = FL().edges.filter(x=>x.id!==e.id); flSync(); return; }
    if(k==='adj-ok'){ (e.ack ??= {})[ym] = 1; flSync(); return; }
    if(k==='adj-next'){ const P2 = flPlan(nx); (e.m ??= {})[nx] = Math.round((P2.E[e.id] + miss)*100)/100; (e.ack ??= {})[ym] = 1; flSync(); toastMsg(`CHF ${chf0(miss)} auf ${ymLabel(nx)} verschoben`); return; }
    if(k==='adj-now'){ const A = flSrcAcc(f), B = flSrcAcc(t), d = dAdd(todayIso(), 1);
      (D.plans ??= []).push({id:'fl'+e.id+'_adj'+uid(), type:'tr', name:`Ausgleich ${ymLabel(ym)}: ${flName(f)} → ${flName(t)}`, amount:miss, freq:'M', start:d, end:d, day:+d.slice(8), acc:A, to:B, cat:BK_TRANSFER, match:'', flow:e.id, flowAdj:1});
      (e.ack ??= {})[ym] = 1; save(); toastMsg(`Ausgleich CHF ${chf0(miss)} vorgemerkt – bitte im E-Banking überweisen`); return; }
    if(k!=='ok') return;
    const mode = val('flmode'); e.mode = mode;
    if(mode==='fix'){ const a = parseNum(val('fla')); if(isNaN(a)){ $('#fla').style.borderColor = 'var(--bad)'; return false; } e.a = a; }
    const keepPast = Object.fromEntries(Object.entries(e.m||{}).filter(([m])=>!document.querySelector(`[data-flm="${m}"]`)));
    e.m = keepPast; document.querySelectorAll('[data-flm]').forEach(i=>{ const v = i.value.trim(); if(v!==''){ const n = parseNum(v); if(!isNaN(n)) e.m[i.dataset.flm] = n; } });
    if(!toExp){ const d = parseInt(val('flday')); if(d>=1 && d<=31) e.day = d; }
    flSync(); });
  const sel = $('#flmode'); if(sel) sel.onchange = () => { $('#flfix').hidden = sel.value!=='fix'; };
}
function flNodeDialog(nid){
  const n = flN(nid); if(!n) return; const ed = flCanEdit(), isPot = n.t==='pot', isExp = n.t==='exp';
  const cats = isExp ? flExpCats(n) : [];
  dialog(`<h3>${esc(flName(n))}</h3><p class="small muted" style="margin-top:0">${esc(flKind(n))}${n.t==='acc'?' · echtes Konto':''}</p>
    ${isPot||isExp?`<label class="f">Name<input id="flnn" value="${esc(n.name||'')}" placeholder="${esc(flName(n))}"></label>`:''}
    ${isPot?`<label class="f">Liegt auf Konto<select id="flpa">${D.accounts.filter(a=>!a.archived).map(a=>`<option value="${a.id}" ${a.id===n.acc?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label>
      <label class="f">Schon drin (CHF)<input id="flps" inputmode="decimal" value="${n.start?chf(n.start):''}" placeholder="0"></label>
      <label class="f">Ziel (CHF, optional)<input id="flpt" inputmode="decimal" value="${n.target?chf(n.target):''}" placeholder="z. B. 80000"></label>
      ${(()=>{ const s = flPot(n); return `<p class="small">Stand ca. CHF ${chf0(s.eff)}${n.target?` · Ziel ${s.goal?(s.goal===TODAY?'erreicht':'erreicht im '+ymLabel(s.goal)):'mit den geplanten Beträgen nicht erreichbar'}`:''}</p>`; })()}`:''}
    ${isExp?`<p class="small"><b>Budget ${ymLabel(flYm())}: CHF ${chf0(flBud(cats, flYm()))}</b></p><p class="small muted">${cats.map(c=>esc(catName(c))).join(' · ')||'keine Kategorien'}</p>`:''}
    ${n.t==='inc'?`<p class="small">Geplant ${ymLabel(flYm())}: <b>CHF ${chf0(flIncomeOf(n, flYm()))}</b> – aus «Budget › Planen».</p>`:''}
    ${ed?acts(false, 'Kästchen entfernen'):`<div class="acts"><button class="btn" data-dlg="cancel">Schliessen</button></div>`}`,
  k=>{ if(k==='cancel') return;
    if(k==='del'){ const F = FL(); F.edges = F.edges.filter(e=>e.f!==n.id && e.t!==n.id); F.nodes = F.nodes.filter(x=>x.id!==n.id); flSync(); return; }
    if(k!=='ok') return;
    if(isPot||isExp){ const nm = val('flnn').trim(); if(nm) n.name = nm; else delete n.name; }
    if(isPot){ n.acc = val('flpa'); const s = parseNum(val('flps')), t = parseNum(val('flpt')); n.start = isNaN(s)?0:s; n.startYm ||= TODAY; n.target = isNaN(t)?0:t; }
    flSync(); });
}
function flAddDialog(){
  const F = FL(), have = new Set(F.nodes.map(n=>n.t+':'+n.ref)), accs = D.accounts.filter(a=>!a.archived && !have.has('acc:'+a.id));
  const incs = [['lohn','Lohn'], ...(D.incSide||[]).map(s=>[s.id, s.name])].filter(([r])=>!have.has('inc:'+r));
  const grps = (typeof GS!=='undefined'?GS:[]).filter(g=>!have.has('exp:g:'+g.k));
  const cats = D.cats.filter(c=>!c.archived && !c.wid && !have.has('exp:c:'+c.id));
  dialog(`<h3>Kästchen hinzufügen</h3>
    <label class="f">Was<select id="flt"><option value="pot">Topf (z. B. Eigenheim, Auto, Ferien)</option>${accs.length?'<option value="acc">Konto</option>':''}${grps.length?'<option value="grp">Ausgaben-Bereich</option>':''}${cats.length?'<option value="cat">Einzelne Budget-Kategorie</option>':''}${incs.length?'<option value="inc">Einkommen</option>':''}</select></label>
    <div data-flk="pot"><label class="f">Name<input id="flpn" list="flpsug" placeholder="z. B. Eigenheim"><datalist id="flpsug"><option value="Eigenheim"><option value="Auto"><option value="Ferien"><option value="Notgroschen"><option value="Steuern"><option value="Haus & Unterhalt"></datalist></label>
      <label class="f">Liegt auf Konto<select id="flpa2">${D.accounts.filter(a=>!a.archived).map(a=>`<option value="${a.id}" ${typeof accGrp==='function'&&accGrp(a)==='sparen'?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label>
      <label class="f">Ziel (CHF, optional)<input id="flpt2" inputmode="decimal" placeholder="z. B. 80000"></label></div>
    <div data-flk="acc" hidden><label class="f">Konto<select id="fla2">${accs.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></label></div>
    <div data-flk="grp" hidden><label class="f">Bereich<select id="flg2">${grps.map(g=>`<option value="${g.k}">${esc(g.n)}</option>`).join('')}</select></label></div>
    <div data-flk="cat" hidden><label class="f">Kategorie<select id="flc2">${cats.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label><p class="small muted">Die Kategorie wird dann nicht mehr im Bereich mitgezählt.</p></div>
    <div data-flk="inc" hidden><label class="f">Einkommen<select id="fli2">${incs.map(([r,l])=>`<option value="${r}">${esc(l)}</option>`).join('')}</select></label></div>
    <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Hinzufügen</button></div>`,
  k=>{ if(k!=='ok') return; const ty = val('flt'), V = S.flView || {x:0,y:0,z:1}, c = $('#flc'), cx = c ? (c.clientWidth/2 - V.x)/V.z - 110 : 300, cy = c ? (c.clientHeight/2 - V.y)/V.z - 50 : 200;
    const n = {id:'n'+uid(), x:Math.round(cx), y:Math.round(cy)};
    if(ty==='pot'){ const nm = val('flpn').trim(); if(!nm){ $('#flpn').style.borderColor = 'var(--bad)'; return false; } const t = parseNum(val('flpt2')); Object.assign(n, {t:'pot', ref:n.id, name:nm, acc:val('flpa2'), start:0, startYm:TODAY, target:isNaN(t)?0:t}); }
    else if(ty==='acc') Object.assign(n, {t:'acc', ref:val('fla2')});
    else if(ty==='grp') Object.assign(n, {t:'exp', ref:'g:'+val('flg2')});
    else if(ty==='cat') Object.assign(n, {t:'exp', ref:'c:'+val('flc2')});
    else Object.assign(n, {t:'inc', ref:val('fli2')});
    FL().since ||= TODAY; FL().nodes.push(n); flSync(); });
  const s = $('#flt'); s.onchange = () => document.querySelectorAll('[data-flk]').forEach(d=>d.hidden = d.dataset.flk!==s.value);
}
// Darf von a nach b verbunden werden? (keine Schleifen, Einkommen nur als Quelle, Ausgaben nur als Ziel)
function flCanLink(a, b){
  const A = flN(a), B = flN(b); if(!A || !B || a===b) return 'Ein Kästchen kann nicht mit sich selbst verbunden werden.';
  if(B.t==='inc') return 'Einkommen ist immer der Anfang.'; if(A.t==='exp') return 'Ausgaben sind immer das Ende.';
  if(FL().edges.some(e=>e.f===a && e.t===b)) return 'Diese Verbindung gibt es schon.';
  const seen = new Set(), st = [b]; while(st.length){ const x = st.pop(); if(x===a) return 'Das ergäbe einen Kreis – Geld würde im Kreis fliessen.'; if(seen.has(x)) continue; seen.add(x); flOut(x).forEach(e=>st.push(e.t)); }
  return '';
}

/* ---------- Bedienung: Ziehen, Verbinden, Zoomen ---------- */
var flDrag = null;
function flWorld(ev){ const c = $('#flc').getBoundingClientRect(), V = S.flView || {x:0,y:0,z:1}; return {x:(ev.clientX - c.left - V.x)/V.z, y:(ev.clientY - c.top - V.y)/V.z}; }
function flApplyView(){ const w = $('#flw'), V = S.flView || {x:0,y:0,z:1}; if(w) w.style.transform = `translate(${V.x}px,${V.y}px) scale(${V.z})`; }
function flFit(){ const c = $('#flc'), F = FL(); if(!c || !F.nodes.length) return;
  const xs = F.nodes.map(n=>n.x), ys = F.nodes.map(n=>n.y), x0 = Math.min(...xs)-30, y0 = Math.min(...ys)-30, x1 = Math.max(...xs)+260, y1 = Math.max(...ys)+170;
  const z = Math.max(0.35, Math.min(1.2, Math.min(c.clientWidth/(x1-x0), c.clientHeight/(y1-y0)))); S.flView = {z, x:-x0*z + (c.clientWidth-(x1-x0)*z)/2, y:-y0*z + 10}; flApplyView(); }
document.addEventListener('pointerdown', ev=>{
  if(S.view!=='geldfluss' || !flCanEdit() || ev.button!==0) return; const c = ev.target.closest?.('#flc'); if(!c) return;
  if(ev.target.closest('button,[data-act="fledge"],.flzoom')) return;
  const pin = ev.target.closest('[data-pin="out"]'), head = ev.target.closest('[data-drag]'), node = ev.target.closest('.fnode');
  if(pin && node){ const n = flN(node.dataset.n), svg = $('#flw svg'); flDrag = {k:'link', from:n.id, x1:n.x+220, y1:n.y+46};
    svg.insertAdjacentHTML('beforeend', '<path id="fltmp" class="fwl tmp" d=""/>'); }
  else if(head && node){ const n = flN(node.dataset.n), p = flWorld(ev); flDrag = {k:'move', n, el:node, dx:p.x-n.x, dy:p.y-n.y, moved:false}; }
  else if(!node){ const V = S.flView || (S.flView = {x:0,y:0,z:1}); flDrag = {k:'pan', sx:ev.clientX, sy:ev.clientY, vx:V.x, vy:V.y}; }
  if(flDrag){ c.setPointerCapture?.(ev.pointerId); ev.preventDefault(); }
});
document.addEventListener('pointermove', ev=>{
  if(!flDrag) return; const p = $('#flc') ? flWorld(ev) : null; if(!p) return;
  if(flDrag.k==='move'){ flDrag.n.x = Math.round(p.x - flDrag.dx); flDrag.n.y = Math.round(p.y - flDrag.dy); flDrag.moved = true; flDrag.el.style.left = flDrag.n.x+'px'; flDrag.el.style.top = flDrag.n.y+'px';
    if(!flDrag.P){ flDrag.P = flPlan(flYm()); flDrag.Fx = flEff(flYm(), flDrag.P); } $('#flw svg').innerHTML = flWires(flDrag.P, flDrag.Fx); }
  else if(flDrag.k==='link'){ const x1 = flDrag.x1, y1 = flDrag.y1, dx = Math.max(60, Math.abs(p.x-x1)*0.5); $('#fltmp')?.setAttribute('d', `M${x1},${y1} C${x1+dx},${y1} ${p.x-dx},${p.y} ${p.x},${p.y}`); }
  else if(flDrag.k==='pan'){ S.flView.x = flDrag.vx + ev.clientX - flDrag.sx; S.flView.y = flDrag.vy + ev.clientY - flDrag.sy; flApplyView(); }
});
document.addEventListener('pointerup', ev=>{
  if(!flDrag) return; const d = flDrag; flDrag = null;
  if(d.k==='move' && d.moved){ save(); }
  if(d.k==='link'){ $('#fltmp')?.remove(); const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.fnode'); if(!el) return;
    const to = el.dataset.n, why = flCanLink(d.from, to); if(why){ toastMsg(why); return; }
    const t = flN(to), f = flN(d.from), e = {id:'e'+uid(), since:TODAY, f:d.from, t:to, mode: t.t==='exp' ? 'deckt' : f.t==='inc' ? 'rest' : 'fix', a:0};
    FL().edges.push(e); flSync(); save(); render(); if(e.mode==='fix') setTimeout(()=>flEdgeDialog(e.id), 30); }
});
document.addEventListener('wheel', ev=>{
  if(S.view!=='geldfluss') return; const c = ev.target.closest?.('#flc'); if(!c) return; ev.preventDefault();
  const V = S.flView || (S.flView = {x:0,y:0,z:1}), r = c.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top, z = Math.max(0.3, Math.min(2, V.z * (ev.deltaY<0 ? 1.1 : 0.91)));
  V.x = mx - (mx - V.x) * z / V.z; V.y = my - (my - V.y) * z / V.z; V.z = z; flApplyView();
}, {passive:false});
document.addEventListener('click', ev=>{
  const a = ev.target.closest('[data-act^="fl"]'); if(!a || !D) return; const act = a.dataset.act;
  if(!['flauto','fladd','flrebuild','flym','flfit','flzoom','fledge','flnode'].includes(act)) return; ev.stopPropagation(); ev.preventDefault();
  if(act==='flauto') return flAuto();
  if(act==='fladd') return flAddDialog();
  if(act==='flrebuild'){ dialog(`<h3>Neu aufbauen?</h3><p>Der Geldfluss wird aus deinen Konten, Daueraufträgen und dem Budget neu aufgebaut. Deine Kästchen, Töpfe und Beträge hier gehen verloren.</p><div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn danger" data-dlg="ok">Neu aufbauen</button></div>`,
    k=>{ if(k!=='ok') return; D.flow = {v:1, nodes:[], edges:[]}; flSync(); setTimeout(flAuto, 30); }); return; }
  if(act==='flym'){ S.flYm = ymAdd(flYm(), +a.dataset.d); render(); return; }
  if(act==='flfit') return flFit();
  if(act==='flzoom'){ const V = S.flView || (S.flView = {x:0,y:0,z:1}), c = $('#flc'), z = Math.max(0.3, Math.min(2, V.z * +a.dataset.d)), mx = c.clientWidth/2, my = c.clientHeight/2;
    V.x = mx - (mx - V.x) * z / V.z; V.y = my - (my - V.y) * z / V.z; V.z = z; flApplyView(); return; }
  if(act==='fledge') return flEdgeDialog(a.dataset.e, a.dataset.ym);
  if(act==='flnode') return flNodeDialog(a.dataset.n);
}, true);

/* ---------- Einbinden: Budget › Geldfluss (nur PC-Version) ---------- */
TITLES.geldfluss = 'Geldfluss';
CUSTOM_V.geldfluss = vGeldfluss;
if(!NATIVE){ const h = HUBS.find(x=>x.k==='budget'); if(h && !h.tabs.some(t=>t[0]==='geldfluss')) h.tabs.push(['geldfluss','Geldfluss']); }
render = (prev => function(){ const r = prev.apply(this, arguments);
  try{ if(S.view==='geldfluss' && !S.flView && $('#flc')) flFit(); }catch(e){} return r; })(render);
