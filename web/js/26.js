/* =====================================================================
   34. VERSION 1.15.0 – FINANZ-COACH: Lebenslage-Check, Stufenplan, Wochenaufgaben, Schuldenplan,
       Sparpotenzial, Säule 3a, Ziele. Klar und direkt, gerechnet aus deinen eigenen Zahlen – im Gerät.
   ===================================================================== */
var C3A_MAX = {2025:7258, 2026:7258};                    // Maximalbetrag Säule 3a mit Pensionskasse (BSV)
var c3aMax = () => C3A_MAX[+TODAY.slice(0,4)] || 7258;
var coachCfg = () => (D.coach ??= {done:{}, tax:25, debtPay:null, cardFull:{}});
var cVal = a => { const v = accValRaw(a); return accCur(a)==='CHF' ? v : (toChf(v, accCur(a)) ?? 0); };
var cType = a => a.wtype || wTypeOf('', a.name);
var C_NOCUT = /gesund|arzt|apothek|medizin|kranken|versicher|steuer|wehrpflicht|miete|hypothek|zins|darlehen/i;
var cCuttable = id => { const c = D.cats.find(x=>x.id===id); return c && needOfCat(c)!=='muss' && !C_NOCUT.test(c.name); };
var _kTips1150 = kTips; kTips = function(){ return _kTips1150().filter(x=>!C_NOCUT.test(x.t.split(' ist ')[0])); };
var cWeek = (d=todayIso()) => weekStart(d);

/* ---------- Lage berechnen ---------- */
function coachState(){ return kCache('coach', ()=>{
  const cfg = coachCfg(), hist = kMonths(6), CM = kCatMonth(), f = kForecastMonth(), y = kForecastYear(), b = kBehaviour();
  const income = kMed(hist.map(h=>D.tx.filter(t=>t.d.startsWith(h) && t.c==='_inc').reduce((s,t)=>s+inAmt(t),0)));
  const expenses = kMed(hist.map(h=>Object.values(CM[h]||{}).reduce((s,v)=>s+v,0)));
  const accs = D.accounts.filter(a=>!a.archived);
  const liquid = accs.filter(a=>['konto','bar'].includes(cType(a)) && a.kind!=='debt').reduce((s,a)=>s+Math.max(0,cVal(a)),0);
  const reserve = accs.filter(a=>cType(a)==='spar' || a.notgroschen).reduce((s,a)=>s+Math.max(0,cVal(a)),0);
  const vorsorge = accs.filter(a=>cType(a)==='vorsorge').reduce((s,a)=>s+Math.max(0,cVal(a)),0);
  const debts = accs.map(a=>({a, v:cVal(a)})).filter(x=>x.v < -0.5).map(x=>{ const card = cType(x.a)==='karte', full = !!cfg.cardFull[x.a.id];
    return {id:x.a.id, name:x.a.name, bal:-x.v, card, full, rate: full ? 0 : (+x.a.rate || (card ? 12 : 0)), assumed: !full && !+x.a.rate && card}; });
  const costly = debts.filter(d=>d.rate>=5), debtTotal = debts.filter(d=>!d.full).reduce((s,d)=>s+d.bal,0);
  // Säule 3a: Einzahlungen dieses Jahr (Kategorie, Text oder Übertrag auf ein Vorsorgekonto)
  const yr = TODAY.slice(0,4), v3 = accs.filter(a=>cType(a)==='vorsorge').map(a=>a.id), re3 = /(^| )(3a|saule 3a|saeule 3a|vorsorge|viac|frankly|finpension|valuepension)( |$)/;
  const paid3a = cfg.paid3a?.[yr] ?? D.tx.filter(t=>t.d.startsWith(yr) && outAmt(t)>0 && (re3.test(bkNorm(bkName(t.c))) || re3.test(bkNorm(t.n||'')) || (t.imp && v3.includes(t.bacc) && t.sa>0))).reduce((s,t)=>s+(t.imp && v3.includes(t.bacc) ? t.sa : outAmt(t)),0);
  const rest3a = Math.max(0, c3aMax() - paid3a), overdue = (D.bills||[]).filter(x=>x.status==='offen' && x.due && x.due<todayIso());
  const rate = y.rate, monthsRes = expenses>0 ? (reserve + Math.max(0, liquid - expenses)) / expenses : 0;
  // Punkte (je 20)
  const P = {
    plus: f.hasHist ? (f.inc - f.est >= 0 && !overdue.length ? 20 : f.inc - f.est >= -200 ? 10 : 0) : 10,
    reserve: Math.round(Math.min(1, monthsRes/3)*20),
    debt: Math.round(income>0 ? Math.max(0, 1 - debtTotal/(income*3))*20 : (debtTotal?0:20)),
    save: Math.round(rate==null ? 0 : Math.max(0, Math.min(1, rate/20))*20),
    vors: Math.round(Math.min(1, paid3a/c3aMax())*20),
  };
  const score = Object.values(P).reduce((s,x)=>s+x,0);
  const surplus = Math.max(0, y.base);
  return {cfg, income, expenses, liquid, reserve, vorsorge, debts, costly, debtTotal, paid3a, rest3a, overdue, rate, monthsRes, P, score, surplus, f, y, b};
}); }

/* ---------- Stufenplan ---------- */
function coachSteps(s){
  const L = [
    {k:'plus', t:'Jeden Monat im Plus', ok: s.P.plus===20, d: s.f.hasHist ? `Dieser Monat: voraussichtlich ${kS0(s.f.inc-s.f.est)}.${s.overdue.length?` ${s.overdue.length} Rechnung(en) überfällig.`:''}` : 'Noch zu wenig Daten.'},
    {k:'mini', t:'Mini-Notgroschen: 1 Monat Ausgaben', ok: s.monthsRes>=1, d:`Reserve heute: ${s.monthsRes.toFixed(1)} Monate (CHF ${chf0(s.reserve)}). Ziel: CHF ${chf0(s.expenses)}.`},
    {k:'costly', t:'Teure Schulden abbauen', ok: !s.costly.length, d: s.costly.length ? `${s.costly.map(d=>`${d.name} CHF ${chf0(d.bal)} (${d.rate} %${d.assumed?' angenommen':''})`).join(', ')}.` : 'Keine Schulden mit hohem Zins.'},
    {k:'reserve', t:'Notgroschen: 3 Monate Ausgaben', ok: s.monthsRes>=3, d:`Ziel CHF ${chf0(s.expenses*3)} – fehlt CHF ${chf0(Math.max(0, s.expenses*3 - s.reserve - Math.max(0, s.liquid - s.expenses)))}.`},
    {k:'3a', t:`Säule 3a ausschöpfen (CHF ${chf0(c3aMax())})`, ok: s.rest3a<=0, d:`Dieses Jahr eingezahlt: CHF ${chf0(s.paid3a)}. Bis 31.12. noch CHF ${chf0(s.rest3a)} möglich.`},
    {k:'debt', t:'Alle Schulden weg', ok: s.debtTotal<1, d: s.debtTotal ? `Noch CHF ${chf0(s.debtTotal)} offen.` : 'Schuldenfrei.'},
    {k:'goals', t:'Ziele & Vermögen aufbauen', ok: false, d: (D.goals||[]).length ? `${D.goals.length} Ziel(e) – siehe unten.` : 'Lege ein grosses Ziel fest (z. B. Eigenheim, Familie, Reise).'},
  ];
  return {L, cur: L.find(x=>!x.ok) || L.at(-1)};
}

/* ---------- Schuldenplan (Lawine: höchster Zins zuerst) ---------- */
function debtPlan(debts, pay){
  const D2 = debts.filter(d=>!d.full).map(d=>({...d})).sort((a,b)=>b.rate-a.rate || a.bal-b.bal); if(!D2.length || pay<=0) return null;
  let m = 0, interest = 0; const done = {};
  while(D2.some(d=>d.bal>0.5) && m<600){ m++; let left = pay;
    for(const d of D2) if(d.bal>0.5){ const i = d.bal*d.rate/1200; d.bal += i; interest += i; }
    for(const d of D2){ if(d.bal<=0.5 || left<=0) continue; const p = Math.min(d.bal, left); d.bal -= p; left -= p; if(d.bal<=0.5 && !done[d.id]) done[d.id] = m; } }
  if(m>=600) return {never:true};
  return {months:m, interest, done, end:ymAdd(TODAY, m)};
}

/* ---------- Sparpotenzial ---------- */
function coachSavings(s){
  const out = [], b = s.b;
  for(const x of b.trends.filter(x=>x.d>=25 && x.B>0 && cCuttable(x.c)).slice(0,4)) out.push({t:`${bkName(x.c)} zurück auf früheres Niveau`, v:x.d, how:`Von CHF ${chf0(x.A)} auf ${chf0(x.B)} pro Monat.`});
  if(b.small.s>=60) out.push({t:'Kleinbeträge halbieren', v:b.small.s/2, how:`${Math.round(b.small.n)} Käufe unter CHF 20 pro Monat – Kaffee, Snacks, Kiosk.`});
  const tm = b.mbw.muss+b.mbw.brauch+b.mbw.will; if(tm && b.mbw.will/tm>0.3){ const ex = (b.mbw.will - tm*0.3)/3; if(ex>=20) out.push({t:'«Will»-Ausgaben auf 30 % senken', v:ex, how:'Restaurant, Shopping, Freizeit: fester Betrag pro Woche.'}); }
  const abo = (D.plans||[]).filter(p=>!p.off && p.type!=='in' && (p.freq||'M')==='M' && Math.abs(p.amount)<60).reduce((s2,p)=>s2+Math.abs(p.amount),0);
  if(abo>=30) out.push({t:'Abos prüfen und eines kündigen', v:Math.min(abo, 25), how:`Kleine Abos zusammen CHF ${chf0(abo)} pro Monat.`});
  return out;
}

/* ---------- Wochenaufgaben ---------- */
function coachTasks(s, st){
  const T = [], wk = cWeek(), b = s.b, offen = D.tx.filter(t=>t.c==='_offen').length;
  for(const x of s.overdue.slice(0,1)) T.push({id:'bill'+x.id, t:`Rechnung bezahlen: ${x.creditor}`, s:`CHF ${chf(x.amount)} – fällig seit ${dShort(x.due)}.`, go:'rechnungen', auto:()=>x.status!=='offen'});
  if(!(D.plans||[]).some(p=>p.type==='in' && !p.off)) T.push({id:'lohn', t:'Lohn als Dauerauftrag erfassen', s:'Damit Prognosen und «Bis zum Lohn» genau rechnen.', go:'plaene', auto:()=>(D.plans||[]).some(p=>p.type==='in' && !p.off)});
  if(offen) T.push({id:'offen', t:`${offen} Buchungen zuordnen`, s:'Im Finanz-Assistenten mit KI-Vorschlägen – dauert 2 Minuten.', go:'assistent', auto:()=>!D.tx.some(t=>t.c==='_offen')});
  const top = b.trends.find(x=>x.d>=25 && x.B>0 && cCuttable(x.c));
  if(top){ const cap = Math.round(top.B/4.35/5)*5 || 20, spent = D.tx.filter(t=>t.d>=wk && t.c===top.c).reduce((s2,t)=>s2+kSpend(t),0);
    T.push({id:'cap'+top.c, t:`Diese Woche höchstens CHF ${cap} für ${bkName(top.c)}`, s:`Bisher diese Woche: CHF ${chf0(spent)}.`, prog:Math.min(1.5, spent/cap), auto:()=>false, manual:true}); }
  if(b.small.n>=20){ const cnt = D.tx.filter(t=>t.d>=wk && kSpend(t)>0 && kSpend(t)<20).length;
    T.push({id:'small', t:'Höchstens 5 Käufe unter CHF 20 diese Woche', s:`Bisher: ${cnt}.`, prog:Math.min(1.5, cnt/5), manual:true, auto:()=>false}); }
  if(st.cur.k==='costly' && s.costly[0]) T.push({id:'debt'+s.costly[0].id, t:`Extra-Zahlung auf ${s.costly[0].name}`, s:`Überweise diese Woche zusätzlich CHF ${chf0(Math.max(50, Math.round(s.surplus*0.3/50)*50))}.`, manual:true});
  if(['mini','reserve'].includes(st.cur.k) && !(D.plans||[]).some(p=>/spar/i.test(p.name))) T.push({id:'autosave', t:'Automatisches Sparen einrichten', s:'Dauerauftrag direkt nach dem Lohn aufs Sparkonto – unten im Coach mit einem Tipp.', auto:()=>(D.plans||[]).some(p=>/spar/i.test(p.name))});
  const can3a = Math.min(s.rest3a, Math.max(0, s.reserve + s.liquid - s.expenses*1.5));
  if(s.rest3a>0 && +TODAY.slice(5)>=10 && !s.costly.length && can3a>=200) T.push({id:'3a'+TODAY.slice(0,4), t:`Säule 3a: CHF ${chf0(Math.floor(can3a/100)*100)} bis 31.12. einzahlen`, s:`Spart etwa CHF ${chf0(Math.floor(can3a/100)*100*s.cfg.tax/100)} Steuern. Die Reserve bleibt dabei erhalten.`, manual:true});
  if(!(D.goals||[]).length) T.push({id:'goal', t:'Ein grosses Ziel festlegen', s:'Was willst du in 1–5 Jahren erreichen? Betrag und Datum eintragen.', act:'addgoal', auto:()=>(D.goals||[]).length>0});
  return T.slice(0,4).map(x=>({...x, done: !!s.cfg.done[wk+'|'+x.id] || !!x.auto?.()}));
}
function coachStreak(){ const cfg = coachCfg(); let n = 0, w = dAdd(cWeek(),-7);
  for(let i=0;i<52;i++){ if(Object.keys(cfg.done).some(k=>k.startsWith(w+'|'))) n++; else break; w = dAdd(w,-7); } return n; }

/* ---------- Seite ---------- */
function vCoach(){
  const s = coachState(), st = coachSteps(s), T = coachTasks(s, st), streak = coachStreak(), sav = coachSavings(s), savSum = sav.reduce((x,y)=>x+y.v,0);
  const lvl = s.score>=80?['Sehr gut','in']:s.score>=60?['Gut','in']:s.score>=40?['Ausbaufähig','warn']:['Kritisch','out'];
  const pay = s.cfg.debtPay ?? Math.max(100, Math.round(s.surplus*0.6/50)*50), dp = debtPlan(s.debts, pay);
  const rateNew = s.income>0 && s.rate!=null ? s.rate + savSum/s.income*100 : null;
  const autoSave = Math.max(50, Math.round(s.surplus*0.5/50)*50);
  // Fazit – klar und direkt
  const msg = st.cur.k==='plus' ? `Zuerst muss jeder Monat im Plus enden. Diesen Monat fehlen voraussichtlich CHF ${chf0(Math.max(0,s.f.est-s.f.inc))}.`
    : st.cur.k==='mini' ? `Du hast keinen Puffer für Unerwartetes. Baue zuerst CHF ${chf0(s.expenses)} Reserve auf – das schützt dich vor neuen Schulden.`
    : st.cur.k==='costly' ? `Deine teuerste Baustelle sind Schulden mit Zins: CHF ${chf0(s.costly.reduce((x,d)=>x+d.bal,0))}. Jeder Franken, den du dort abzahlst, bringt dir ${s.costly[0].rate} % sicheren «Ertrag».`
    : st.cur.k==='reserve' ? `Guter Stand. Jetzt die Reserve auf 3 Monate (CHF ${chf0(s.expenses*3)}) ausbauen.`
    : st.cur.k==='3a' ? `Nutze die Säule 3a: noch CHF ${chf0(s.rest3a)} bis 31.12. – das spart dir rund CHF ${chf0(s.rest3a*s.cfg.tax/100)} Steuern.`
    : st.cur.k==='debt' ? `Fast geschafft: Restschulden CHF ${chf0(s.debtTotal)} abbauen.` : 'Die Basis steht. Jetzt geht es um deine grossen Ziele und Vermögensaufbau.';
  return `<p class="sub">Dein Coach rechnet aus deinen echten Zahlen, was dich finanziell am meisten weiterbringt – und gibt dir jede Woche konkrete Aufgaben. Alles bleibt auf dem Gerät.</p>
  <div class="agrid">
  <div class="xcard xw coachtop"><div class="cring" style="--p:${s.score}"><b>${s.score}</b><span>von 100</span></div>
    <div class="cmain"><span class="small muted">Deine finanzielle Lage</span><h2 class="${lvl[1]}">${lvl[0]}</h2><p>${msg}</p></div></div>
  <div class="xcard xw"><div class="ah"><h3>5 Säulen</h3><span class="small muted">je 20 Punkte</span></div>
    ${[['plus','Monat im Plus'],['reserve','Notgroschen'],['debt','Schulden'],['save','Sparquote'],['vors','Vorsorge 3a']].map(([k,l])=>`<div class="cpil"><span>${l}</span><div class="bar"><i style="width:${s.P[k]*5}%;background:${s.P[k]>=16?'var(--ok)':s.P[k]>=8?'#eda100':'#e34948'}"></i></div><b class="num">${s.P[k]}</b></div>`).join('')}
    <div class="kgrid mt"><div><span>Einkommen typisch</span><b class="num">CHF ${chf0(s.income)}</b></div><div><span>Ausgaben typisch</span><b class="num">CHF ${chf0(s.expenses)}</b></div>
      <div><span>Sparquote</span><b class="num">${s.rate==null?'–':Math.round(s.rate)+' %'}</b></div><div><span>Reserve</span><b class="num">${s.monthsRes.toFixed(1)} Mt.</b></div></div></div>

  <div class="xcard xw"><div class="ah"><div><h3>Deine Aufgaben diese Woche</h3><span class="small muted">${streak?`🔥 ${streak} Woche${streak>1?'n':''} in Folge dran geblieben`:'Hake ab, was du erledigt hast'}</span></div></div>
    ${T.map(x=>`<div class="ctask ${x.done?'done':''}"><button class="ccheck" data-act="ctask" data-id="${esc(x.id)}" aria-label="Erledigt">${x.done?'✓':''}</button>
      <div class="sp" ${x.go?`data-go="${x.go}"`:x.act?`data-act="${x.act}"`:''}><b>${esc(x.t)}</b><span class="small muted">${esc(x.s)}</span>${x.prog!=null?`<div class="bar"><i style="width:${Math.min(100,x.prog*100)}%;background:${x.prog>1?'#e34948':'var(--ok)'}"></i></div>`:''}</div></div>`).join('')||'<p class="small muted">Alles erledigt – stark!</p>'}</div>

  <div class="xcard xw"><div class="ah"><h3>Dein Weg</h3><span class="small muted">Schritt für Schritt</span></div>
    ${st.L.map((x,i)=>`<div class="cstep ${x.ok?'ok':x===st.cur?'cur':''}"><i>${x.ok?'✓':i+1}</i><div><b>${esc(x.t)}</b><span class="small muted">${esc(x.d)}</span></div></div>`).join('')}</div>

  ${s.debts.length?`<div class="xcard xw"><div class="ah"><div><h3>Schuldenplan</h3><span class="small muted">Höchster Zins zuerst (Lawinen-Methode)</span></div></div>
    ${s.debts.map(d=>`<div class="krow"><span>${esc(d.name)}<em>${d.full?'wird jeden Monat ganz bezahlt – kein Zins':d.rate?`${d.rate} % Zins${d.assumed?' (angenommen – beim Konto eintragen)':''}`:'ohne Zins'}${dp?.done?.[d.id]?` · weg im ${ymLabel(ymAdd(TODAY,dp.done[d.id]))}`:''}</em></span><b class="num out">−${chf0(d.bal)}</b></div>
      ${d.card?`<label class="chk small" style="margin:4px 0 8px"><input type="checkbox" data-cfull="${d.id}" ${d.full?'checked':''}> Ich zahle diese Karte jeden Monat ganz</label>`:''}`).join('')}
    ${s.debtTotal>0?`<div class="row mt" style="align-items:center;gap:10px"><label class="small" for="cpay">Pro Monat für Schulden</label><input class="in" id="cpay" inputmode="numeric" value="${pay}" style="width:110px"><span class="small muted">CHF</span></div>
      ${dp?.never?'<p class="small out">Mit diesem Betrag wirst du die Schulden nie los – die Zinsen sind höher. Bitte mehr einsetzen.</p>':dp?`<div class="kgrid mt"><div><span>Schuldenfrei</span><b>${ymLabel(dp.end)}</b><em>in ${dp.months} Monaten</em></div><div><span>Zinsen bis dahin</span><b class="num out">CHF ${chf0(dp.interest)}</b></div></div>
        <p class="small muted">Jede zusätzliche CHF 100 pro Monat: schuldenfrei ${(()=>{ const d2 = debtPlan(s.debts, pay+100); const dm = d2&&!d2.never ? dp.months-d2.months : 0; return d2&&!d2.never ? `${dm} Monat${dm===1?'':'e'} früher, CHF ${chf0(dp.interest-d2.interest)} weniger Zins` : '–'; })()}.</p>`:''}`:''}</div>`:''}

  <div class="xcard xw"><div class="ah"><div><h3>Sparpotenzial</h3><span class="small muted">Aus deinem Kaufverhalten</span></div><b class="num in">+${chf0(savSum)} / Mt.</b></div>
    ${sav.map(x=>`<div class="krow"><span>${esc(x.t)}<em>${esc(x.how)}</em></span><b class="num in">+${chf0(x.v)}</b></div>`).join('')||'<p class="small muted">Kein auffälliges Sparpotenzial – deine Ausgaben sind stabil.</p>'}
    ${savSum?`<p class="small" style="margin:10px 0 0">Umgesetzt: <b>CHF ${chf0(savSum*12)} pro Jahr</b>${rateNew!=null?` – Sparquote von ${Math.round(s.rate)} % auf <b>${Math.round(rateNew)} %</b>`:''}.</p>`:''}
    <div class="csave mt"><div><b>Automatisch sparen</b><span class="small muted">CHF ${chf0(autoSave)} jeden Monat direkt nach dem Lohn aufs Sparkonto – was du nicht siehst, gibst du nicht aus.</span></div>
      ${(D.plans||[]).some(p=>/spar/i.test(p.name)&&!p.off)?'<span class="small in">✓ eingerichtet</span>':`<button class="btn sm pri" data-act="cautosave" data-v="${autoSave}">Einrichten</button>`}</div></div>

  <div class="xcard"><div class="ah"><div><h3>Säule 3a ${TODAY.slice(0,4)}</h3><span class="small muted">Maximum CHF ${chf0(c3aMax())} (mit Pensionskasse)</span></div></div>
    <div class="cpil"><span>Eingezahlt</span><div class="bar"><i style="width:${Math.min(100,s.paid3a/c3aMax()*100)}%;background:var(--ok)"></i></div><b class="num">${chf0(s.paid3a)}</b></div>
    ${s.rest3a>0?`<p class="small">Noch <b>CHF ${chf0(s.rest3a)}</b> bis 31.12. – spart etwa <b>CHF ${chf0(s.rest3a*s.cfg.tax/100)}</b> Steuern (bei ${s.cfg.tax} % Grenzsteuersatz).</p>
      <p class="small muted">Wichtig: Nur einzahlen, wenn der Notgroschen steht – das Geld ist bis zur Pension gebunden. Ab 2026 lassen sich verpasste Jahre nachzahlen.</p>
      <button class="btn sm" data-act="c3arem" data-v="${Math.round(s.rest3a)}">Erinnerung am 15.12. setzen</button>`:'<p class="small in">✓ Maximum für dieses Jahr erreicht.</p>'}
    <details class="mt"><summary class="small">Angaben anpassen</summary>
      <div class="row" style="gap:8px;align-items:center;margin-top:6px"><label class="small">Eingezahlt ${TODAY.slice(0,4)}</label><input class="in" id="c3paid" inputmode="decimal" value="${chf(s.paid3a)}" style="width:110px"></div>
      <div class="row" style="gap:8px;align-items:center;margin-top:6px"><label class="small">Grenzsteuersatz %</label><input class="in" id="ctax" inputmode="numeric" value="${s.cfg.tax}" style="width:70px"></div></details></div>

  <div class="xcard"><div class="ah"><div><h3>Grosse Ziele</h3><span class="small muted">Eigenheim, Familie, Reise …</span></div><button class="btn sm pri" data-act="addgoal">+ Ziel</button></div>
    ${(D.goals||[]).map(g=>{ const acc = D.accounts.find(a=>a.id===g.acc), have = acc ? Math.max(0, cVal(acc)) : 0, rest = Math.max(0, g.target-have);
      const left = g.date ? Math.max(1, ymDiff(TODAY, g.date)) : null, need = left ? rest/left : null, avail = Math.max(0, s.surplus - (dp&&!dp.never&&s.debtTotal?pay:0));
      const st2 = rest<=0 ? ['erreicht','in'] : need==null ? ['ohne Datum',''] : need<=avail*0.6 ? ['realistisch','in'] : need<=avail ? ['knapp','warn'] : ['so nicht erreichbar','out'];
      const when = need==null && avail>0 && rest>0 ? ymLabel(ymAdd(TODAY, Math.ceil(rest/(avail*0.6)))) : null;
      return `<div class="cgoal" data-act="editgoal" data-id="${g.id}"><div class="row"><b class="sp">${esc(g.name)}</b><span class="small ${st2[1]}">${st2[0]}</span></div>
        <div class="bar"><i style="width:${Math.min(100, g.target?have/g.target*100:0)}%;background:var(--acc)"></i></div>
        <span class="small muted">CHF ${chf0(have)} von ${chf0(g.target)}${need!=null&&rest>0?` · nötig CHF ${chf0(need)} pro Monat bis ${ymLabel(g.date)}`:''}${when?` · mit 60 % deines Überschusses erreichbar ca. ${when}`:''}</span></div>`; }).join('')||'<p class="small muted">Noch kein Ziel. Der Coach rechnet dir aus, ab wann es realistisch ist und wie viel du pro Monat brauchst.</p>'}
    <p class="small muted" style="margin:8px 0 0">Verfügbarer Überschuss: etwa CHF ${chf0(s.surplus)} pro Monat${s.debtTotal&&dp&&!dp.never?`, davon CHF ${chf0(pay)} für Schulden`:''}.</p></div>
  </div>
  <p class="small muted mt">Der Coach ersetzt keine Finanz- oder Steuerberatung. Die Zahlen sind Schätzungen aus deinen Buchungen.</p>`;
}
function cardCoachTeaser(){
  const s = coachState(), st = coachSteps(s);
  return `<div class="xcard kteaser" data-go="coach"><div class="ah"><h3>Finanz-Coach · ${s.score}/100</h3><span class="small muted">›</span></div>
    <p class="small" style="margin:0">Nächster Schritt: <b>${esc(st.cur.t)}</b></p><p class="small muted" style="margin:4px 0 0">${coachTasks(s, st).filter(x=>!x.done).length} offene Aufgabe(n) diese Woche</p></div>`;
}

/* ---------- Aktionen ---------- */
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act]'); if(!a || !D) return; const k = a.dataset.act, cfg = D && coachCfg();
  const H = {
    ctask:()=>{ const key = cWeek()+'|'+a.dataset.id; if(cfg.done[key]) delete cfg.done[key]; else cfg.done[key] = 1;
      const keep = Object.keys(cfg.done).filter(x=>x>=dAdd(cWeek(),-400)); cfg.done = Object.fromEntries(keep.map(x=>[x,1])); save(); },
    cautosave:()=>{ const v = +a.dataset.v, pd = nextPayday(), day = pd ? Math.min(28, +pd.d.slice(8)+1) : 26, start = TODAY+'-'+String(day).padStart(2,'0');
      const sacc = D.accounts.find(x=>cType(x)==='spar' && !x.archived), scat = D.cats.find(c=>c.group==='spar' && !c.archived && /spar/i.test(c.name)) || D.cats.find(c=>c.group==='spar' && !c.archived);
      (D.plans ??= []).push({id:'p'+uid(), type:'out', name:'Sparen (automatisch)', amount:v, freq:'M', start:start<todayIso()?ymAdd(TODAY,1)+start.slice(7):start, day, acc:mainAcc().id, cat:scat?.id||'', match:sacc?bkNorm(sacc.name):'spar'});
      save(); toastMsg(`Dauerauftrag CHF ${chf0(v)} angelegt – richte ihn auch bei deiner Bank ein`); },
    c3arem:()=>{ const yr = TODAY.slice(0,4); if(!(D.bills||[]).some(b=>b.id==='b3a'+yr)){ (D.bills ??= []).push({id:'b3a'+yr, creditor:'Säule 3a Einzahlung', amount:+a.dataset.v, due:yr+'-12-15', status:'offen', cat:''}); save(); }
      toastMsg('Erinnerung am 15.12. gesetzt (Rechnungen & Glocke)'); },
  };
  if(!H[k]) return; e.stopPropagation(); H[k](); _kc = {}; render();
}, true);
document.addEventListener('change', e=>{ if(!D) return; const cfg = coachCfg(), id = e.target.id;
  if(e.target.dataset?.cfull){ cfg.cardFull[e.target.dataset.cfull] = e.target.checked || undefined; if(!e.target.checked) delete cfg.cardFull[e.target.dataset.cfull]; }
  else if(id==='cpay'){ const v = parseNum(e.target.value); cfg.debtPay = v>0 ? v : null; }
  else if(id==='c3paid'){ const v = parseNum(e.target.value); (cfg.paid3a ??= {})[TODAY.slice(0,4)] = isFinite(v) ? v : undefined; }
  else if(id==='ctax'){ const v = parseNum(e.target.value); cfg.tax = v>0 && v<60 ? v : 25; }
  else return;
  _kc = {}; save(); render(); });

/* ---------- Einbinden ---------- */
NAV4[0][1].splice(1, 0, ['coach', ICON.goal, 'Finanz-Coach']);
TITLES.coach = 'Finanz-Coach';
FAB_VIEWS.push('coach');
var _vStart1150 = vStart;
vStart = function(){ const h = _vStart1150(); try{ return (S.stab||'konten')==='konten' ? h.replace('<div class="agrid home">', `<div class="agrid home">${cardCoachTeaser()}`) : h; }catch(e){ return h; } };
var _render1150 = render;
render = function(){
  if(S.view==='coach' && !S.locked && D){ S.view = 'autoregeln'; _render1150(); S.view = 'coach';
    $('header h1').textContent = TITLES.coach; $('#main').innerHTML = vCoach();
    document.querySelectorAll('nav.side a').forEach(x=>x.classList.toggle('on', x.dataset.go==='coach'));
    $('#fab')?.classList.remove('hide'); $('#mnav')?.style.setProperty('visibility','hidden'); bellUpdate(); drawCharts(); return; }
  _render1150();
};
