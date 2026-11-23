/* =====================================================================
   61. VERSION 1.35.0 – FINANZ-BERATER: AUFGABEN, DIE WIRKLICH WIRKEN
   - Pro Woche feste Aufgaben (ändern sich nicht mehr bei jeder neuen Buchung).
   - Jede Aufgabe wird an deinen echten Buchungen geprüft: Ausgabengrenze, Zahlung
     auf die Karte, Sparen, Säule 3a, Rechnungen, Zuordnen.
   - Am Montag wird die letzte Woche ausgewertet (geschafft / nicht geschafft).
   - Abgehaktes geht beim Abgleich zwischen Geräten nicht mehr verloren.
   ===================================================================== */
var cHasSalary = () => (D.plans||[]).some(p=>p.type==='in' && !p.off) || (D.walletApi?.planned||[]).some(p=>p.v>0)
  || [1,2].every(i=>D.tx.filter(t=>t.d.startsWith(ymAdd(TODAY,-i)) && t.c==='_inc').reduce((s,t)=>s+inAmt(t),0) >= 500);
var cTrAmt = t => Math.abs(+t.ta || +t.a || +t.sa || 0);
// Geld, das in der Woche auf ein Konto übertragen wurde (Übertrag oder Einzahlung)
var cPaidTo = (acc, from, to) => D.tx.filter(t=>t.d>=from && t.d<=to && (
  (isTr(t) && (t.toAcc===acc || (t.acc===acc && sv(t)>0) || (t.bacc===acc && (+t.sa||0)>0))) ||
  (!isTr(t) && t.c!=='_inc' && (t.acc===acc || t.bacc===acc) && sv(t)>0))).reduce((s,t)=>s+cTrAmt(t),0);
var cSpentCat = (c, from, to) => D.tx.filter(t=>t.d>=from && t.d<=to && t.c===c).reduce((s,t)=>s+kSpend(t),0);

function cTaskGen(s, st){
  const T = [], wk = cWeek(), today = todayIso(), ym = TODAY, m = C.m?.[ym], b = s.b;
  for(const x of s.overdue.slice(0,1)) T.push({k:'bill', id:'bill'+x.id, ref:x.id, t:`Rechnung bezahlen: ${x.creditor}`, s:`CHF ${chf(x.amount)} – fällig seit ${dShort(x.due)}.`, go:'rechnungen'});
  const offen = D.tx.filter(t=>t.c==='_offen').length;
  if(offen) T.push({k:'offen', id:'offen', t:`${offen} Buchungen zuordnen`, s:'Mit Vorschlägen des Finanz-Assistenten – dauert 2 Minuten.', go:'assistent'});
  // 1. Budget, das diesen Monat zu schnell aufgebraucht wird
  const dim = +mEnd(ym).slice(8), day = +today.slice(8), left = dim - day + 1, weeksLeft = Math.max(1, left/7);
  const used = new Set();
  if(m){ const over = D.cats.filter(c=>!c.archived && ['leben','freizeit'].includes(c.group) && cCuttable(c.id) && (m.plan[c.id]||0)>0).map(c=>{
      const plan = m.plan[c.id], ist = Math.max(0, C.ist[c.id]?.[ym]||0); return {c, plan, ist, pace: ist/(plan*day/dim)}; })
      .filter(x=>x.pace>1.15 && x.ist>20).sort((a,b)=>(b.ist-b.plan*day/dim)-(a.ist-a.plan*day/dim));
    for(const x of over.slice(0,2)){ const rest = Math.max(0, x.plan-x.ist), cap = Math.max(0, Math.floor(rest/weeksLeft/5)*5); used.add(x.c.id);
      T.push({k:'cap', id:'bud'+x.c.id+ym, c:x.c.id, cap, t:`Diese Woche höchstens CHF ${cap} für ${x.c.name}`,
        s: rest>0 ? `Budget ${ymLabel(ym)}: noch CHF ${chf0(rest)} für ${left} Tage.` : `Budget ${ymLabel(ym)} schon um CHF ${chf0(x.ist-x.plan)} überschritten – diese Woche nichts mehr.`, go:'budget'}); } }
  // 2. Kategorie, die gegenüber früher gestiegen ist
  const top = b.trends.find(x=>x.d>=25 && x.B>0 && cCuttable(x.c) && !used.has(x.c));
  if(top){ const cap = Math.max(10, Math.round(top.B/4.35/5)*5);
    T.push({k:'cap', id:'cap'+top.c, c:top.c, cap, t:`Diese Woche höchstens CHF ${cap} für ${bkName(top.c)}`, s:`Früher im Schnitt CHF ${chf0(top.B)} pro Monat, zuletzt ${Math.round(top.d)} % mehr.`, go:'buchungen'}); }
  if(b.small.n>=20) T.push({k:'small', id:'small', max:5, t:'Höchstens 5 Käufe unter CHF 20 diese Woche', s:'Kleinbeträge summieren sich am stärksten.', go:'buchungen'});
  // 3. Schulden mit Zins
  if(st.cur.k==='costly' && s.costly[0]){ const d = s.costly[0], amt = Math.min(Math.ceil(d.bal), Math.max(50, Math.round(s.surplus*0.3/50)*50));
    T.push({k:'pay', id:'pay'+d.id, acc:d.id, amt, t:`CHF ${chf0(amt)} extra auf ${d.name} überweisen`, s:`${d.rate} % Zins: jeder Franken dort ist sicherer «Ertrag». Wird erkannt, sobald der Übertrag in den Buchungen steht.`, go:'konten'}); }
  // 4. Reserve aufbauen
  const sacc = D.accounts.find(x=>cType(x)==='spar' && !x.archived);
  if(['mini','reserve'].includes(st.cur.k) && sacc){ const amt = Math.max(50, Math.round(s.surplus*0.4/50)*50);
    T.push({k:'save', id:'save'+sacc.id, acc:sacc.id, amt, t:`CHF ${chf0(amt)} aufs ${sacc.name} legen`, s:`Reserve heute ${s.monthsRes.toFixed(1)} Monate – Ziel ${st.cur.k==='mini'?1:3}.`, go:'konten'}); }
  if(['mini','reserve'].includes(st.cur.k) && !(D.plans||[]).some(p=>/spar/i.test(p.name) && !p.off)) T.push({k:'autosave', id:'autosave', t:'Automatisches Sparen einrichten', s:'Unten bei Sparpotenzial «Einrichten» – direkt nach dem Lohn aufs Sparkonto.'});
  const can3a = Math.min(s.rest3a, Math.max(0, s.reserve + s.liquid - s.expenses*1.5));
  if(s.rest3a>0 && +TODAY.slice(5)>=10 && !s.costly.length && can3a>=200){ const amt = Math.floor(can3a/100)*100;
    T.push({k:'3a', id:'3a'+TODAY.slice(0,4), amt, base:s.paid3a, t:`Säule 3a: CHF ${chf0(amt)} einzahlen`, s:`Spart etwa CHF ${chf0(amt*s.cfg.tax/100)} Steuern. Die Reserve bleibt erhalten.`}); }
  if(!cHasSalary()) T.push({k:'lohn', id:'lohn', t:'Lohn als Dauerauftrag erfassen', s:'Damit Prognosen und «Bis zum Lohn» genau rechnen.', go:'plaene'});
  if(!(D.goals||[]).length) T.push({k:'goal', id:'goal', t:'Ein grosses Ziel festlegen', s:'Was willst du in 1–5 Jahren erreichen? Betrag und Datum eintragen.', act:'addgoal'});
  return T.slice(0,5);
}
// Prüfen an den echten Buchungen: done = geschafft, fail = verfehlt, sonst offen
function cTaskEval(x, wk){
  const end = dAdd(wk,6), today = todayIso(), to = today<end ? today : end, over = today>end, s = coachState();
  const r = {done:false, fail:false, prog:null, info:''};
  if(x.k==='bill'){ const bl = (D.bills||[]).find(y=>y.id===x.ref); r.done = !bl || bl.status!=='offen'; }
  else if(x.k==='offen') r.done = !D.tx.some(t=>t.c==='_offen');
  else if(x.k==='lohn') r.done = cHasSalary();
  else if(x.k==='goal') r.done = (D.goals||[]).length>0;
  else if(x.k==='autosave') r.done = (D.plans||[]).some(p=>/spar/i.test(p.name) && !p.off);
  else if(x.k==='cap'){ const v = cSpentCat(x.c, wk, to); r.prog = x.cap ? v/x.cap : (v>0?1.5:0); r.fail = v > x.cap + 0.5; r.done = over && !r.fail;
    r.info = `Diese Woche: CHF ${chf0(v)} von ${chf0(x.cap)}${!over && !r.fail ? ' – auf Kurs, Auswertung am Sonntagabend' : ''}.`; }
  else if(x.k==='small'){ const n = D.tx.filter(t=>t.d>=wk && t.d<=to && kSpend(t)>0 && kSpend(t)<20).length; r.prog = n/x.max; r.fail = n > x.max; r.done = over && !r.fail;
    r.info = `Bisher: ${n} von höchstens ${x.max}.`; }
  else if(x.k==='pay' || x.k==='save'){ const v = cPaidTo(x.acc, wk, to); r.prog = Math.min(1, v/x.amt); r.done = v >= x.amt*0.95; r.fail = over && !r.done;
    r.info = `Erkannt: CHF ${chf0(v)} von ${chf0(x.amt)}.`; }
  else if(x.k==='3a'){ const v = s.paid3a - (x.base||0); r.prog = Math.min(1, v/x.amt); r.done = v >= x.amt*0.95; r.info = `Seit Wochenbeginn eingezahlt: CHF ${chf0(Math.max(0,v))}.`; }
  const man = !!coachCfg().done[wk+'|'+x.id];
  if(man && !r.done){ r.done = true; r.fail = false; r.man = true; }
  return r;
}
// Aufgaben der Woche festhalten; neue Woche = alte auswerten
function cWeekTasks(){
  const cfg = coachCfg(), wk = cWeek();
  cfg.hist ??= {};
  if(cfg.wk?.w !== wk){
    if(cfg.wk?.w && cfg.wk.T?.length && !cfg.hist[cfg.wk.w]){ const res = cfg.wk.T.map(x=>({t:x.t, ok:cTaskEval(x, cfg.wk.w).done}));
      cfg.hist[cfg.wk.w] = {ok:res.filter(x=>x.ok).length, n:res.length, r:res}; }
    const keep = Object.keys(cfg.hist).sort().slice(-26); cfg.hist = Object.fromEntries(keep.map(k=>[k, cfg.hist[k]]));
    const s = coachState(); cfg.wk = {w:wk, T:cTaskGen(s, coachSteps(s))}; clearTimeout(cWeekTasks.t); cWeekTasks.t = setTimeout(()=>save(), 50);
  } else {
    // dringende neue Aufgaben (überfällige Rechnung, offene Zuordnung) dürfen dazukommen
    const s = coachState(), fresh = cTaskGen(s, coachSteps(s)).filter(x=>['bill','offen'].includes(x.k) && !cfg.wk.T.some(y=>y.id===x.id));
    if(fresh.length){ cfg.wk.T = [...fresh, ...cfg.wk.T].slice(0,6); clearTimeout(cWeekTasks.t); cWeekTasks.t = setTimeout(()=>save(), 50); }
  }
  return cfg.wk.T;
}
coachTasks = function(){ const wk = cWeek(); return cWeekTasks().map(x=>({...x, ...cTaskEval(x, wk)})); };
coachStreak = function(){ const h = coachCfg().hist||{}; let n = 0, w = dAdd(cWeek(),-7);
  for(let i=0;i<52;i++){ const x = h[w]; if(x && x.ok>0) n++; else break; w = dAdd(w,-7); } return n; };

function cTasksCard(){
  const T = coachTasks(), streak = coachStreak(), cfg = coachCfg(), lw = cfg.hist?.[dAdd(cWeek(),-7)];
  const row = x => { const lock = x.done && !x.man, icon = x.done ? '✓' : x.fail ? '✕' : '';
    const link = x.go ? `data-go="${x.go}"` : x.act ? `data-act="${x.act}"` : `data-act="ctask" data-id="${esc(x.id)}"`;
    return `<div class="ctask ${x.done?'done':''} ${x.fail?'fail':''}"><button class="ccheck" data-act="ctask" data-id="${esc(x.id)}" ${lock?'disabled title="Automatisch erkannt"':''} aria-label="${x.done?'Erledigt':'Als erledigt markieren'}">${icon}</button>
      <div class="sp" ${link}><b>${esc(x.t)}</b><span class="small muted">${esc(x.s)}</span>${x.info?`<span class="small ${x.fail?'out':x.done?'in':''}">${esc(x.info)}</span>`:''}${x.man?'<span class="small muted">Von dir abgehakt</span>':''}
      ${x.prog!=null?`<div class="bar"><i style="width:${Math.min(100,x.prog*100)}%;background:${x.fail?'var(--bad)':'var(--ok)'}"></i></div>`:''}</div></div>`; };
  const done = T.filter(x=>x.done).length;
  return `<div class="xcard xw"><div class="ah"><div><h3>Deine Aufgaben diese Woche</h3><span class="small muted">${done} von ${T.length} geschafft${streak?` · ${streak} Woche${streak>1?'n':''} in Folge mindestens eine geschafft`:''}</span></div></div>
    ${T.map(row).join('')||'<p class="small muted">Diese Woche keine Aufgabe – alles im grünen Bereich.</p>'}
    <p class="small muted" style="margin:8px 0 0">Die App prüft die Aufgaben an deinen Buchungen. Was sie nicht sehen kann (z. B. Barzahlung), hakst du selbst ab.</p>
    ${lw?`<details class="mt"><summary class="small">Letzte Woche: ${lw.ok} von ${lw.n} geschafft</summary>${(lw.r||[]).map(y=>`<div class="small" style="margin:4px 0">${y.ok?'<span class="in">✓</span>':'<span class="out">✕</span>'} ${esc(y.t)}</div>`).join('')}</details>`:''}</div>`;
}
vCoach = (prev => function(){
  const h = prev(), a = h.indexOf('<div class="xcard xw"><div class="ah"><div><h3>Deine Aufgaben diese Woche'), b = h.indexOf('<div class="xcard xw"><div class="ah"><h3>Dein Weg');
  return a>=0 && b>a ? h.slice(0,a) + cTasksCard() + h.slice(b) : h;
})(vCoach);

// Abgleich zwischen Geräten: Abgehaktes und Wochenergebnisse zusammenführen
mergeData = (prev => function(local, remote){
  const out = prev(local, remote), lc = local?.coach, rc = remote?.coach;
  if(out && (lc || rc)){ out.coach ??= {};
    out.coach.done = {...(rc?.done||{}), ...(lc?.done||{}), ...(out.coach.done||{})};
    out.coach.hist = {...(rc?.hist||{}), ...(lc?.hist||{}), ...(out.coach.hist||{})}; }
  return out;
})(mergeData);

/* =====================================================================
   62. BUDGET: MONAT · QUARTAL · JAHR – BUDGETIERT UND EFFEKTIV
   Vergangene Monate: budgetiert und effektiv ausgegeben. Laufender Monat: ausgegeben und
   noch übrig. Kommende Monate: nur geplant (gestrichelt).
   ===================================================================== */
// Zeitraum pro Gerät merken (PC: Jahr, Handy: Monat) – nicht über den Abgleich teilen
var bLS = k => { try{ return localStorage.getItem('fin.'+k) || null; }catch(e){ return null; } };
var bLSset = (k,v) => { try{ localStorage.setItem('fin.'+k, v); }catch(e){} };
var bpm = () => S.bpm || bLS('bpm') || (window.innerWidth>=1000 ? 'y' : 'm');
var bMonths = () => { const ym = S.ym || TODAY, y = ym.slice(0,4), p = bpm();
  if(p==='y') return Array.from({length:12},(_,i)=>y+'-'+String(i+1).padStart(2,'0'));
  if(p==='q'){ const q0 = Math.floor((+ym.slice(5)-1)/3)*3; return [1,2,3].map(i=>y+'-'+String(q0+i).padStart(2,'0')); }
  return [ym]; };
var bLabel = () => { const ms = bMonths(), p = bpm(); return p==='y' ? 'Jahr '+ms[0].slice(0,4) : p==='q' ? `${Math.floor((+ms[0].slice(5)-1)/3)+1}. Quartal ${ms[0].slice(0,4)}` : ymLabel(ms[0]); };
// Monate ohne jede Buchung (vor dem Start der App) zählen nicht als «unter Budget»
var bHasData = ym => ym<=TODAY && D.tx.some(t=>t.d.startsWith(ym));
var bPlan = (c, ym) => C.m?.[ym]?.plan?.[c] || 0;
var bIst = (c, ym) => ym<=TODAY ? Math.max(0, C.ist?.[c]?.[ym] || 0) : 0;

function vBudgetP(){
  const ms = bMonths(), p = bpm(), past = ms.filter(m=>m<TODAY && bHasData(m)), cur = ms.includes(TODAY), fut = ms.filter(m=>m>TODAY), el = ms.filter(m=>m<=TODAY && bHasData(m));
  const dim = +mEnd(TODAY).slice(8), daysLeft = dim - +todayIso().slice(8) + 1;
  const sum = (f, list) => list.reduce((s,m)=>s+f(m),0);
  const groups = ['fix','leben','freizeit','schulden','spar'];
  const rowOf = c => { const PB = sum(m=>bPlan(c.id,m), el), PF = sum(m=>bPlan(c.id,m), fut), IE = sum(m=>bIst(c.id,m), el), PBpast = sum(m=>bPlan(c.id,m), past), IEpast = sum(m=>bIst(c.id,m), past);
    return {c, PB, PF, IE, PBpast, IEpast}; };
  const flexRows = D.cats.filter(c=>['leben','freizeit'].includes(c.group) && !c.archived).map(rowOf);
  const all = D.cats.filter(c=>!c.archived && groups.includes(c.group)).map(rowOf);
  const T = {PB:sum(x=>x, all.map(x=>x.PB)), PF:sum(x=>x, all.map(x=>x.PF)), IE:sum(x=>x, all.map(x=>x.IE))};
  const inc = {P:sum(m=>C.m?.[m]?.incPlan||0, el), F:sum(m=>C.m?.[m]?.incPlan||0, fut), I:sum(m=>Math.max(0, C.ist?._inc?.[m]||0), el)};
  const fLeft = cur ? flexRows.reduce((s,x)=>s + bPlan(x.c.id,TODAY) - bIst(x.c.id,TODAY), 0) : null;
  const chip = (v,l) => `<button class="chip ${p===v?'on':''}" data-act="bpm" data-v="${v}">${l}</button>`;
  const vw = S.bview || bLS('bview') || (p==='y' && window.innerWidth>=1000 ? 't' : 'l');
  const nav = `<div class="row bpnav" style="align-items:center;gap:8px;flex-wrap:wrap"><div class="chips sp" style="padding:0">${chip('m','Monat')}${chip('q','Quartal')}${chip('y','Jahr')}</div>
    <div class="row" style="gap:4px;align-items:center"><button class="btn sm ghost" data-act="bpstep" data-d="-1" aria-label="Zurück">‹</button><b class="small" style="min-width:110px;text-align:center">${bLabel()}</b><button class="btn sm ghost" data-act="bpstep" data-d="1" aria-label="Weiter">›</button></div></div>
    ${p!=='m'?`<div class="chips mt" style="padding:0"><button class="chip ${vw==='l'?'on':''}" data-act="bview" data-v="l">Liste</button><button class="chip ${vw==='t'?'on':''}" data-act="bview" data-v="t">Monate einzeln</button></div>`:''}`;
  const status = x => { const parts = [];
    if(past.length && (x.PBpast || x.IEpast)){ const d = x.PBpast - x.IEpast; parts.push(Math.abs(d)<1 ? 'genau im Budget' : d>0 ? `<span class="in">CHF ${chf0(d)} unter Budget</span>` : `<span class="neg">CHF ${chf0(-d)} über Budget</span>`); }
    if(cur){ const pl = bPlan(x.c.id,TODAY), is = bIst(x.c.id,TODAY), l = pl - is;
      if(pl || is) parts.push((p==='m'?'':ymShort(TODAY)+': ') + (pl ? (l<0 ? `<span class="neg">CHF ${chf0(-l)} zu viel</span>` : `noch CHF ${chf0(l)}${['leben','freizeit'].includes(x.c.group)&&daysLeft?` · ${chf0(l/daysLeft)}/Tag`:''}`) : 'nicht budgetiert')); }
    if(x.PF) parts.push(`<span class="bplan">CHF ${chf0(x.PF)} geplant${fut.length>1?` (${fut.length} Mt.)`:''}</span>`);
    return parts.join(' · '); };
  const bar = x => { const scale = Math.max(1, x.PB + x.PF, x.IE), col = x.IE > x.PB + 0.5 && x.PB ? 'var(--bad)' : !x.PB && x.IE ? 'var(--warn)' : x.PB && x.IE > x.PB*0.85 ? 'var(--warn)' : 'var(--ok)';
    return `<div class="bbar"><i class="bi" style="width:${x.IE/scale*100}%;background:${col}"></i>${x.PF?`<i class="bf" style="left:${x.PB/scale*100}%;width:${x.PF/scale*100}%"></i>`:''}${x.PB&&(x.PF||x.IE)?`<b class="bm" style="left:${Math.min(99.5,x.PB/scale*100)}%"></b>`:''}</div>`; };
  const card = g => { const list = all.filter(x=>x.c.group===g && (x.PB || x.PF || x.IE)); if(!list.length) return '';
    const G = list.reduce((a,x)=>({PB:a.PB+x.PB, PF:a.PF+x.PF, IE:a.IE+x.IE}), {PB:0,PF:0,IE:0});
    return `<div class="wcard"><div class="row"><i class="gdot" style="background:${GROUPS[g].c}"></i><h3 class="sp">${GROUPS[g].n}</h3><span class="small muted num">${el.length?`${chf0(G.IE)} / ${chf0(G.PB)}`:''}${G.PF?` <span class="bplan">+${chf0(G.PF)}</span>`:''}</span></div>
      ${list.sort((a,b)=>(b.IE-b.PB)-(a.IE-a.PB)).map(x=>`<div class="brow3" data-act="budedit" data-c="${x.c.id}" data-ym="${ms.find(m=>m>=TODAY)||ms[0]}"><div class="row"><span class="sp nm">${esc(x.c.name)}</span>
        ${el.length?`<span class="small muted">effektiv</span> <b class="num">${chf0(x.IE)}</b><span class="small muted num"> / budgetiert ${chf0(x.PB)}</span>`:`<span class="small muted">geplant</span> <b class="num bplan">${chf0(x.PF)}</b>`}</div>
        ${bar(x)}<div class="small muted">${status(x)}</div></div>`).join('')}</div>`; };
  const table = () => { const head = `<tr><th>Kategorie</th>${ms.map(m=>`<th class="${m===TODAY?'cur':''} ${m>TODAY?'bfut':''}">${ymShort(m)}</th>`).join('')}<th>Total</th></tr>`;
    const cell = (c,m) => { const pl = bPlan(c,m), is = bIst(c,m); if(m>TODAY || !bHasData(m)) return m>TODAY ? `<td class="num bfut">${pl?`<span class="bplan">${chf0(pl)}</span>`:'–'}</td>` : `<td class="num muted" title="keine Buchungen">·</td>`;
      if(!pl && !is) return `<td class="num ${m===TODAY?'cur':''}">–</td>`;
      return `<td class="num ${m===TODAY?'cur':''} ${is>pl+0.5?'over':''}" title="budgetiert ${chf0(pl)} · effektiv ${chf0(is)}"><b>${chf0(is)}</b><br><span class="small muted">${chf0(pl)}</span></td>`; };
    let rows = `<tr class="yinc"><td>Einkommen</td>${ms.map(m=>{ const pl = C.m?.[m]?.incPlan||0, is = Math.max(0, C.ist?._inc?.[m]||0); return m>TODAY ? `<td class="num bfut"><span class="bplan">${pl?chf0(pl):'–'}</span></td>` : !bHasData(m) ? `<td class="num muted">·</td>` : `<td class="num ${m===TODAY?'cur':''}"><b>${chf0(is)}</b><br><span class="small muted">${chf0(pl)}</span></td>`; }).join('')}<td class="num tot"><b>${chf0(inc.I)}</b><br><span class="small muted">${chf0(inc.P)}${inc.F?` <span class="bplan">+${chf0(inc.F)}</span>`:''}</span></td></tr>`;
    for(const g of groups){ const list = all.filter(x=>x.c.group===g && (x.PB||x.PF||x.IE)); if(!list.length) continue;
      rows += `<tr class="ygrp"><td><span class="dot" style="background:${GROUPS[g].c}"></span>${GROUPS[g].n}</td>${ms.map(()=>'<td></td>').join('')}<td></td></tr>`;
      for(const x of list) rows += `<tr class="ycat" data-act="budedit" data-c="${x.c.id}" data-ym="${ms.find(m=>m>=TODAY)||ms[0]}"><td>${esc(x.c.name)}</td>${ms.map(m=>cell(x.c.id,m)).join('')}<td class="num tot"><b>${chf0(x.IE)}</b><br><span class="small muted">${chf0(x.PB)}${x.PF?` <span class="bplan">+${chf0(x.PF)}</span>`:''}</span></td></tr>`; }
    return `<div class="card btable mt"><p class="small muted" style="margin:0 0 6px">Oben fett: effektiv ausgegeben · darunter: budgetiert · gestrichelt: geplant (kommende Monate)</p><div class="tw"><table>${head}${rows}</table></div></div>`; };
  const hero = `<div class="wcard bhero">${el.length?`<div class="kgrid"><div><span>Budgetiert${fut.length?' bis heute':''}</span><b class="num">CHF ${chf0(T.PB)}</b></div><div><span>Effektiv ausgegeben</span><b class="num ${T.IE>T.PB+0.5?'neg':''}">CHF ${chf0(T.IE)}</b></div>
      <div><span>${T.PB>=T.IE?'Unter Budget':'Über Budget'}</span><b class="num ${T.PB>=T.IE?'in':'neg'}">CHF ${chf0(Math.abs(T.PB-T.IE))}</b></div>${T.PF?`<div><span>Noch geplant</span><b class="num bplan">CHF ${chf0(T.PF)}</b></div>`:''}</div>`
      :`<div class="kgrid"><div><span>Geplante Ausgaben</span><b class="num bplan">CHF ${chf0(T.PF)}</b></div><div><span>Geplantes Einkommen</span><b class="num bplan">CHF ${chf0(inc.F)}</b></div></div>`}
    ${el.length?`<p class="small muted" style="margin:8px 0 0">Einkommen: erhalten CHF ${chf0(inc.I)} von budgetiert ${chf0(inc.P)}${inc.F?` · noch geplant CHF ${chf0(inc.F)}`:''}.</p>`:''}
    ${cur && fLeft!=null?`<p class="small" style="margin:6px 0 0">Für Alltag & Freizeit im ${ymLabel(TODAY)} noch <strong class="${fLeft<0?'neg':''}">CHF ${chf0(fLeft)}</strong>${daysLeft&&fLeft>0?` · ${daysLeft} Tage · CHF ${chf0(fLeft/daysLeft)}/Tag`:''}.</p>`:''}</div>`;
  const noPlan = !ms.some(m=>C.m?.[m]);
  return `<div class="row"><h2 class="sp">Budget</h2><button class="btn sm" data-go="budgetedit">Plan bearbeiten</button></div>${nav}
    ${noPlan?`<div class="wcard"><p class="muted">Für diesen Zeitraum gibt es noch keinen Plan.</p><button class="btn pri" data-go="budgetedit">Plan erstellen</button></div>`:
    hero + (p!=='m' && vw==='t' ? table() : groups.map(card).join(''))}
    <p class="small muted">Effektiv = was wirklich abgebucht ist (Bank, Wallet, eigene Buchungen bis heute). Geplantes zählt nie als Ausgabe. Antippen öffnet den Betrag zum Ändern.</p>
    <div class="card mt"><h3>Budget aus Excel übernehmen</h3><p class="small muted">Deine Excel-Planung einlesen – z. B. ab November für dieses und nächstes Jahr.</p><button class="btn" data-act="xlsxplan2">Excel-Datei wählen</button></div>`;
}
vBudgetW = vBudgetP;
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act]'); if(!a || !D) return; const k = a.dataset.act;
  if(k==='bpm'){ e.stopPropagation(); S.bpm = a.dataset.v; bLSset('bpm', S.bpm); render(); }
  else if(k==='bview'){ e.stopPropagation(); S.bview = a.dataset.v; bLSset('bview', S.bview); render(); }
  else if(k==='bpstep'){ e.stopPropagation(); const n = bpm()==='y' ? 12 : bpm()==='q' ? 3 : 1; S.ym = ymAdd(bMonths()[0], +a.dataset.d*n); S.year = S.ym.slice(0,4); render(); }
}, true);
// Pfeile oben: im Quartal / Jahr um ein ganzes Quartal / Jahr blättern
step = (prev => function(d){ if(S.view==='budget' && D && bpm()!=='m'){ S.ym = ymAdd(bMonths()[0], d*(bpm()==='y'?12:3)); S.year = S.ym.slice(0,4); render(); return; } return prev(d); })(step);
render = (prev => function(){ const r = prev.apply(this, arguments); try{ if(D && S.view==='budget' && bpm()!=='m'){ const l = $('#mlabel'); if(l) l.textContent = bLabel(); } }catch(e){} return r; })(render);
