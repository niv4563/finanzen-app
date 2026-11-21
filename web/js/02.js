    {t:'Schuldenfrei', ok: m.schuldenfrei, d:'Kreditkarte, Kredite und Ratenzahlungen vollständig abbezahlt.', how: when(x=>x.schuldenfrei)},
    {t:`Volle Reserve (${s.notMonate} Monate)`, ok: res >= C.reserveZiel, d:`CHF ${chf0(C.reserveZiel)} auf dem Reservekonto für Notfälle (Jobverlust, Reparaturen).`, how: na ? when(x=>(x.acc[na.id]?.end||0)>=C.reserveZiel) : 'Reservekonto unter Konten festlegen'},
    {t:'Sparquote erreicht', ok: incY>0 && sparY/incY >= s.spar/100, d:`Letzte 12 Monate: ${pct(incY?sparY/incY:NaN)} gespart / Schulden getilgt (Ziel ${s.spar} %).`, how:'Mehr in Sparen & Schuldenabbau budgetieren.'},
    {t:'Vorsorge ausschöpfen', ok: y3a >= s.max3a*0.9, d:`Säule 3a ${y}: CHF ${chf0(y3a)} von ${chf0(s.max3a)} – spart Steuern.`, how:'Monatlich ca. CHF '+chf0(s.max3a/12)+' in die Säule 3a.'},
    {t:'Vermögen aufbauen', ok: inv>0, d:'Langfristig investieren (z. B. ETF) und/oder Eigenheim-Kapital aufbauen.', how:'Kategorie «Investieren» im Budget nutzen, wenn die Stufen davor erfüllt sind.'},
  ];
  const lvl = st.findIndex(x=>!x.ok);   // nächster offener Schritt
  return {st, lvl: lvl<0 ? st.length : lvl, done: st.filter(x=>x.ok).length};
}

/* =====================================================================
   6b. EMPFEHLUNGEN – konkrete Massnahmen aus deinen Zahlen
   Priorität: 1 = dringend, 2 = wichtig, 3 = optimieren
   ===================================================================== */
const ceil50 = v => Math.ceil(v/50)*50, floor50 = v => Math.floor(v/50)*50;
let RECS = [];
function fut12(){ return C.months.filter(m=>m>=C.now).slice(0,12); }
function addPlan(cat, ym, delta){ (D.plan[cat]??={}); const v = r2(((D.plan[cat][ym])||0)+delta); if(v>0) D.plan[cat][ym]=v; else delete D.plan[cat][ym]; }
function recommendations(){
  const n=C.now, F=fut12(), s=D.settings, R=[];
  const avg = f => F.reduce((t,m)=>t+f(C.m[m],m),0)/Math.max(1,F.length);
  const hasCat = id => D.cats.some(c=>c.id===id);
  const na = D.accounts.find(a=>a.notgroschen);

  // 1. Fehlbeträge im Budget
  const neg = F.filter(m=>C.m[m].rest < -0.5);
  if(neg.length) R.push({p:1, t:`Budget ausgleichen (${neg.length} ${neg.length>1?'Monate':'Monat'} mit Fehlbetrag)`,
    d:`${neg.map(m=>ymShortY(m)+': −'+chf0(-C.m[m].rest)).join(', ')}. Kürze in diesen Monaten «Freizeit & Wünsche» oder verschiebe einen Sparbetrag – sonst wird das Privatkonto belastet.`,
    act:{label:'Zum Budget', go:'budget', year:neg[0].slice(0,4)}});

  // 2. Guthabenkonto rutscht ins Minus
  for(const a of D.accounts.filter(a=>a.kind==='asset')){
    const m = F.find(m=>(C.m[m].acc[a.id]?.end??0) < -0.5);
    if(m) R.push({p:1, t:`${a.name} wird im ${ymLabel(m)} negativ`, d:`Prognose: CHF ${chf(C.m[m].acc[a.id].end)}. Erhöhe den Zufluss auf dieses Konto oder senke die Abgänge davor.`, act:{label:'Zu den Konten', go:'konten', year:m.slice(0,4)}});
  }

  // 3. Schulden mit Zins
  for(const a of D.accounts.filter(a=>a.kind==='debt'&&a.rate>0).sort((x,y)=>y.rate-x.rate)){
    const zins = F.reduce((t,m)=>t+(C.m[m].acc[a.id]?.interest||0),0), now = C.m[n].acc[a.id]?.start||0;
    if(zins < 1) continue;
    const payoff = firstFrom(n, x=>(x.acc[a.id]?.end??-1)>=-0.5);
    if(payoff && ymDiff(n,payoff)<=2){ R.push({p:3, t:`${a.name}: laut Plan im ${ymLabel(payoff)} abbezahlt`, d:`Danach keine neuen Schulden mehr machen: Kreditkarte jeden Monat vollständig zurückzahlen, Käufe aus dem Ersparten.`, act:{label:'Schuldenplan', go:'konten'}}); continue; }
    const extra = ceil50(-now/6);
    R.push({p:1, t:`${a.name} tilgen – kostet ca. CHF ${chf0(zins)} Zins in 12 Monaten`,
      d:`Aktuell CHF ${chf0(now)} bei ${a.rate} % Zins. Schulden mit dem höchsten Zins zuerst abbauen. Mit ca. CHF ${chf0(extra)}/Monat ist sie in rund 6 Monaten weg. Keine neuen Käufe auf Raten.`,
      gain:`spart bis CHF ${chf0(zins)}`, act:{label:'Schuldenplan', go:'konten'}});
  }

  // 4. Kreditkarte überzahlt → Geld ins Sparen umleiten
  const kk = D.accounts.find(a=>a.id==='kk'), kkCats = D.cats.filter(c=>c.acc==='kk');
  if(kk && kkCats.length){
    const months = F.filter(m=>{ const x=C.m[m].acc.kk; return x && x.start>=0 && x.inflow > x.out+1; });
    const over = months.reduce((t,m)=>t+C.m[m].acc.kk.inflow-C.m[m].acc.kk.out,0);
    const bal = C.m[n].acc.kk?.end||0;
    if(over > 100 && hasCat('sparen')) R.push({p:2, t:`Kreditkarte: CHF ${chf0(over)} zu viel eingeplant`,
      d:`Laut Plan zahlst du in ${months.length} Monaten mehr auf die Kreditkarte ein, als dort abgebucht wird (Abos + Ausgaben), das Guthaben wächst auf CHF ${chf0(C.m[F.at(-1)].acc.kk.end)}. Guthaben auf der Kreditkarte bringt nichts. Empfehlung: Rückzahlung auf den tatsächlichen Bedarf senken und die Differenz in «Sparen (Reserve)» leiten.${bal>s.kkGuthabenMax?` Zusätzlich das aktuelle Guthaben (CHF ${chf0(bal)}) bei PostFinance zurücküberweisen lassen.`:''} Falls du über die Karte Alltagsausgaben zahlst, diese stattdessen als Buchung «ab Kreditkarte» erfassen.`,
      gain:`+CHF ${chf0(over)} Reserve`,
      apply:()=>{ for(const m of months){ const x=C.m[m].acc.kk; let cut = x.inflow - x.out;
        for(const c of kkCats){ const v=(D.plan[c.id]?.[m])||0; const d=Math.min(v,cut); if(d>0){ addPlan(c.id,m,-d); addPlan('sparen',m,d); cut-=d; } } } }});
  }

  // 5. Reserve aufbauen
  if(na){
    const have = C.m[n].acc[na.id]?.end||0, target = C.reserveZiel;
    if(have < target){
      const hit = firstFrom(n, x=>(x.acc[na.id]?.end||0)>=target);
      const need = (target-have)/12, planned = avg(x=>x.acc[na.id]?.inflow||0);
      if(!hit || ymDiff(n,hit)>12){
        const d = ceil50(need - planned), minRest = Math.min(...F.map(m=>C.m[m].rest));
        R.push({p:1, t:`Reserve schneller aufbauen: +CHF ${chf0(d)}/Monat`,
          d:`Es fehlen CHF ${chf0(target-have)} bis zur Reserve von ${s.notMonate} Monaten. Geplant sind Ø CHF ${chf0(planned)}/Monat – ${hit?'voll erst im '+ymLabel(hit):'im Plan nicht erreicht'}. Mit CHF ${chf0(planned+d)}/Monat ist sie in 12 Monaten voll.${minRest<d?' Dafür an anderer Stelle kürzen (z. B. Freizeit) – der Restbetrag reicht nicht in allen Monaten.':''}`,
          gain: 'Reserve in 12 Monaten', apply: hasCat('sparen') ? ()=>F.forEach(m=>addPlan('sparen',m,d)) : null});
      } else R.push({p:3, t:`Reserve auf Kurs – voll ab ${ymLabel(hit)}`, d:`Weiter wie geplant in «${accName(na.id)}» sparen und die Reserve nur für echte Notfälle verwenden.`, act:{label:'Ziele', go:'ziele'}});
    }
  }

  // 6. Säule 3a
  if(hasCat('s3a')){
    const y=n.slice(0,4), ys=[...new Set(F.map(m=>m.slice(0,4)))];
    for(const yy of new Set([y,...ys])){
      const ms=C.months.filter(m=>m.startsWith(yy)); if(!ms.length) continue;
      const sum=ms.reduce((t,m)=>t+(C.m[m].cats.s3a||0),0);
      if(sum > s.max3a+0.5){ const ex=sum-s.max3a, last=[...ms].reverse().find(m=>(D.plan.s3a?.[m])||0);
        R.push({p:1, t:`Säule 3a ${yy}: CHF ${chf0(ex)} über dem Maximum`, d:`Geplant CHF ${chf0(sum)}, erlaubt sind CHF ${chf0(s.max3a)}. Der Überschuss ist nicht abzugsfähig und muss zurückgefordert werden. Betrag im ${ymLabel(last)} senken und ins Sparen umleiten.`,
          apply: last ? ()=>{ const d=Math.min(ex,(D.plan.s3a[last])||0); addPlan('s3a',last,-d); if(hasCat('sparen')) addPlan('sparen',last,d); } : null});
      } else if(yy===y && sum < s.max3a-200){ const gap=s.max3a-sum;
        R.push({p:2, t:`Säule 3a ${yy}: noch CHF ${chf0(gap)} Steuerabzug möglich`, d:`Einzahlung muss bis Ende Dezember gutgeschrieben sein (ca. 2 Wochen Vorlauf). Je nach Steuersatz sparst du ca. CHF ${chf0(gap*0.2)}–${chf0(gap*0.3)} Steuern. Nur einzahlen, wenn Reserve und Schuldenabbau nicht darunter leiden.`, gain:`ca. CHF ${chf0(gap*0.25)} Steuern`, act:{label:'Zum Budget', go:'budget', year:yy}});
      }
    }
  }

  // 7. Krankenkasse (Grundversicherung) – Wechselfrist
  if(hasCat('kv') && ['10','11'].includes(TODAY.slice(5))) R.push({p:2, t:'Krankenkasse jetzt vergleichen', d:`Du zahlst ca. CHF ${chf0(avg((x,m)=>x.cats.kv||0))}/Monat. Die Kündigung der Grundversicherung muss bis 30. November beim Versicherer sein. Prämien vergleichen (z. B. priminfo.admin.ch), Franchise und Modell (Hausarzt/Telmed) prüfen.`, gain:'oft mehrere 100 CHF/Jahr'});

  // 8. Bedarf zu hoch
  const bed = avg(x=>x.t.bedarf), inc = avg(x=>x.inc);
  if(inc>0 && bed/inc > s.fix/100){
    const top = D.cats.filter(c=>GROUPS[c.group].topf==='bedarf').map(c=>[c,avg(x=>x.cats[c.id]||0)]).sort((a,b)=>b[1]-a[1]).slice(0,3);
    R.push({p:2, t:`Bedarf senken: ${pct(bed/inc)} statt max. ${s.fix} %`, d:`Grösste Posten: ${top.map(([c,v])=>c.name+' (Ø '+chf0(v)+')').join(', ')}. Verträge prüfen (Miete, Versicherung, Handy/Internet).`});
  }

  // 9. Sparquote
  const sq = inc>0 ? avg(x=>x.t.spar)/inc : 0;
  if(inc>0 && sq < s.spar/100) R.push({p:2, t:`Sparquote erhöhen: ${pct(sq)} statt ${s.spar} %`, d:`Für ${s.spar} % fehlen ca. CHF ${chf0(inc*s.spar/100-avg(x=>x.t.spar))}/Monat. Am einfachsten: Dauerauftrag aufs Sparkonto gleich nach dem Lohneingang.`});

  // 10. Unverteilter Restbetrag → Dauerauftrag
  const minRest = Math.min(...F.map(m=>C.m[m].rest)), amt = floor50(minRest);
  if(amt>=50 && hasCat('sparen')) R.push({p:3, t:`CHF ${chf0(amt)}/Monat bleiben unverteilt`, d:`In jedem der nächsten 12 Monate bleibt mindestens CHF ${chf0(minRest)} übrig. Richte dafür einen Dauerauftrag ein, sonst wird das Geld leicht ausgegeben.`, gain:`+CHF ${chf0(amt*12)}/Jahr gespart`, apply:()=>F.forEach(m=>addPlan('sparen',m,amt))});

  // 11. Kategorien regelmässig überschritten
  const recent = C.months.filter(m=>m<=n).slice(-6);
  for(const c of D.cats){ const mm=recent.filter(m=>C.ist[c.id]?.[m]!=null), over=mm.filter(m=>C.ist[c.id][m]>((D.plan[c.id]?.[m])||0)+0.5);
    if(over.length>=2){ const avgIst=mm.reduce((t,m)=>t+C.ist[c.id][m],0)/mm.length;
      R.push({p:2, t:`«${c.name}» wird regelmässig überschritten`, d:`${over.length} von ${mm.length} Monaten über Budget, Ø Ist CHF ${chf0(avgIst)}. Entweder Ausgaben senken oder Budget realistisch auf ca. CHF ${chf0(ceil50(avgIst))} setzen und anderswo kürzen.`, act:{label:'Zum Budget', go:'budget'}}); } }

  // 12. Abos
  const ab = aboMonthly(null);
  if(ab > s.aboLimit){ const top=D.abos.filter(a=>a.active!==false&&a.price>0).sort((a,b)=>(b.interval==='J'?b.price/12:b.price)-(a.interval==='J'?a.price/12:a.price)).slice(0,3);
    R.push({p:3, t:`Abos um CHF ${chf0(ab-s.aboLimit)}/Monat senken`, d:`Aktuell CHF ${chf(ab)}/Monat. Grösste: ${top.map(a=>a.name).join(', ')}. Streaming-Dienste abwechselnd statt gleichzeitig abonnieren.`, gain:`CHF ${chf0((ab-s.aboLimit)*12)}/Jahr`, act:{label:'Abos', go:'abos'}}); }

  // 13. Sparziele nicht auf Kurs
  for(const g of D.goals.filter(g=>g.date)){
    const have=C.m[n].acc[g.acc]?.end||0; if(have>=g.target) continue;
    const left=Math.max(1,ymDiff(n,g.date)), req=(g.target-have)/left, pl=avg(x=>(x.acc[g.acc]?.inflow||0)-(x.acc[g.acc]?.out||0));
    if(pl < req-1){ const d=ceil50(req-pl), cat=D.cats.find(c=>c.acc===g.acc);
      R.push({p:2, t:`Ziel «${g.name}»: +CHF ${chf0(d)}/Monat nötig`, d:`Bis ${ymLabel(g.date)} fehlen CHF ${chf0(g.target-have)}. Geplant Ø CHF ${chf0(pl)}/Monat, nötig CHF ${chf0(req)}. Alternativ Zieldatum verschieben.`, apply: cat ? ()=>F.forEach(m=>addPlan(cat.id,m,d)) : null, act:{label:'Ziele', go:'ziele'}}); }
  }

  // 14. Danach: investieren
  const free = firstFrom(n, x=>x.schuldenfrei && na && (x.acc[na.id]?.end||0)>=C.reserveZiel);
  const inv = avg(x=>x.cats.invest||0);
  if(free && inv<1) R.push({p:3, t:`Ab ${ymLabel(free)}: Überschuss langfristig anlegen`, d:'Dann bist du laut Plan schuldenfrei und die Reserve ist voll. Geld, das du 5+ Jahre nicht brauchst, breit gestreut anlegen (z. B. Säule 3a mit Wertschriften oder ETF) statt auf dem Sparkonto liegen lassen.'});

  // Sicherheit
  if(!CK) R.push({p:2, t:'App-Sperre einrichten', d:'Ohne PIN sieht jede Person mit Zugriff auf dieses Gerät deine Finanzen. Mit der Sperre wird alles verschlüsselt gespeichert.', act:{label:'Einrichten', go:'daten'}});
  // 15. Routine
  if(C.m[TODAY] && !D.accounts.some(a=>C.m[TODAY].acc[a.id]?.istSet)) R.push({p:3, t:'Monatsabschluss machen', d:'Echte Kontostände für diesen Monat eintragen – dann stimmen Prognose, Reserve und Wünsche.', act:{label:'Zum Monat', go:'monat'}});
  if(!D.backupAt || (Date.now()-new Date(D.backupAt))/864e5 > 30) R.push({p:3, t:'Backup speichern', d:'Die Daten liegen nur auf diesem Gerät.', act:{label:'Backup', fn:'export'}});
  const okW = D.wishes.filter(w=>!w.done && w._p?.ym && w._p.ym<=n && !(w._p.waitDays>0));
  if(okW.length) R.push({p:3, t:`Wunsch leistbar: ${okW.map(w=>w.name).join(', ')}`, d:'Ohne Schulden und ohne die Reserve anzutasten.', act:{label:'Wünsche', go:'wuensche'}});

  RECS = R.sort((a,b)=>a.p-b.p); return RECS;
}

/* Empfohlene Verteilung des Einkommens (Wasserfall) */
function allocation(){
  const n=C.now, F=fut12(), s=D.settings, avg=f=>F.reduce((t,m)=>t+f(C.m[m]),0)/Math.max(1,F.length);
  const inc=avg(x=>x.inc), na=D.accounts.find(a=>a.notgroschen);
  const debt = -(C.m[n].schulden||0), resGap = na ? Math.max(0, C.reserveZiel-(C.m[n].acc[na.id]?.end||0)) : 0;
  const goalNeed = D.goals.reduce((t,g)=>{ const h=C.m[n].acc[g.acc]?.end||0; return t + (g.date&&h<g.target ? (g.target-h)/Math.max(1,ymDiff(n,g.date)) : 0); },0);
  const plan = {bedarf:avg(x=>x.t.bedarf), schulden:avg(x=>x.g.schulden), reserve:avg(x=>na?(x.acc[na.id]?.inflow||0):0), s3a:avg(x=>x.cats.s3a||0),
    ziele:avg(x=>x.g.spar)-avg(x=>na?(x.acc[na.id]?.inflow||0):0)-avg(x=>x.cats.s3a||0)-avg(x=>x.cats.invest||0), wunsch:avg(x=>x.t.wunsch), invest:avg(x=>x.cats.invest||0)};
  let left = inc; const rows=[];
  const take = (k,l,why,want) => { const v=Math.max(0,Math.min(left,want)); left-=v; rows.push({k,l,why,rec:v,plan:plan[k]}); };
  take('bedarf','Bedarf','Fixkosten + Lebenshaltung – zuerst gedeckt', plan.bedarf);
  take('schulden','Schulden tilgen', debt>DEBT_TOL?'in max. 12 Monaten schuldenfrei':'keine offenen Schulden', debt>DEBT_TOL ? Math.max(debt/12, 0) : 0);
  take('reserve','Reserve auffüllen', resGap>0?'in 12 Monaten voll':'Reserve voll', resGap/12);
  take('s3a','Säule 3a', 'Maximum ausschöpfen, spart Steuern', s.max3a/12);
  take('ziele','Sparziele', D.goals.length?'nötig für deine Zieldaten':'keine Ziele mit Datum', goalNeed);
  take('wunsch','Freizeit & Wünsche', `höchstens ${s.pers} % vom Einkommen`, Math.min(plan.wunsch, inc*s.pers/100));
  rows.push({k:'invest',l:'Investieren / Überschuss',why:'was übrig bleibt, langfristig anlegen',rec:Math.max(0,left),plan:plan.invest});
  return {inc, rows};
}

/* Fahrplan: Meilensteine mit Datum */
function roadmap(){
  const n=C.now, na=D.accounts.find(a=>a.notgroschen), L=[];
  const add=(t,ym,done,d='')=>L.push({t,ym,done,d});
  add('Schuldenfrei', C.m[n].schuldenfrei?n:firstFrom(n,x=>x.schuldenfrei), C.m[n].schuldenfrei, 'Kredite, Kreditkarte, Raten');
  add('Mini-Reserve (1 Monat)', firstFrom(n,x=>x.liquid>=C.bedarf), C.m[n].liquid>=C.bedarf, 'CHF '+chf0(C.bedarf));
  if(na){ const ok=(C.m[n].acc[na.id]?.end||0)>=C.reserveZiel; add(`Reserve voll (${D.settings.notMonate} Monate)`, ok?n:firstFrom(n,x=>(x.acc[na.id]?.end||0)>=C.reserveZiel), ok, 'CHF '+chf0(C.reserveZiel)); }
  for(const g of D.goals){ const ok=(C.m[n].acc[g.acc]?.end||0)>=g.target; add('Ziel: '+g.name, ok?n:firstFrom(n,x=>(x.acc[g.acc]?.end||0)>=g.target), ok, 'CHF '+chf0(g.target)+(g.date?' · geplant bis '+ymShortY(g.date):'')); }
  for(const w of D.wishes.filter(w=>!w.done)) add('Wunsch: '+w.name, w._p?.ym||null, false, 'CHF '+chf0(w.price)+(w._p?.est?' · geschätzt':''));
  return L.sort((a,b)=>(a.done===b.done?0:a.done?-1:1) || (a.ym||'9999').localeCompare(b.ym||'9999'));
}

const PR = {1:['Dringend','b'],2:['Wichtig','w'],3:['Optimieren','g']};
function recItem(r,i){
  const col = r.p===1?'var(--bad)':r.p===2?'var(--warn)':'var(--muted)';
  return `<details class="x"${r.p===1?' open':''}><summary><span class="pdot" style="background:${col}"></span><span class="sp" style="font-weight:600">${esc(r.t)}</span>${r.gain?`<span class="tag">${esc(r.gain)}</span>`:''}</summary>
    <div class="body">${esc(r.d)}<div class="row">${r.apply?`<button class="btn sm pri" data-act="recapply" data-i="${i}">Ins Budget übernehmen</button>`:''}${r.act?`<button class="btn sm" data-act="recgo" data-i="${i}">${esc(r.act.label)}</button>`:''}</div></div></details>`;
}
function vEmpf(){
  const R = recommendations(), A = allocation(), M = roadmap();
  const undo = '';
  const grp = (p,t) => { const l=R.map((r,i)=>[r,i]).filter(([r])=>r.p===p); return l.length?`<div class="card mt"><div class="row"><h3 class="sp" style="margin:0">${t}</h3><span class="muted small">${l.length}</span></div>${l.map(([r,i])=>recItem(r,i)).join('')}</div>`:''; };
  const rows = A.rows.map(r=>{ const d=r.plan-r.rec; const bad = (r.k==='wunsch'||r.k==='bedarf') ? d>1 : d<-1;
    return `<tr><td><b>${r.l}</b><div class="small muted" style="white-space:normal">${r.why}</div></td><td class="num">${chf0(r.rec)}</td><td class="num">${chf0(r.plan)}</td><td class="num ${Math.abs(d)<1?'':bad?'neg':'pos'}">${Math.abs(d)<1?'✓':(d>0?'+':'')+chf0(d)}</td></tr>`; }).join('');
  return undo + `<h2>Empfehlungen</h2><p class="sub">Was du als Nächstes tun solltest – berechnet aus deinem Budget. Antippen für Details.</p>
  <div class="card"><h3>Fahrplan zu deinen Zielen</h3>${track(M.filter(x=>!x.done))}</div>
  ${vAufbauCard()}
  ${grp(1,'Zuerst erledigen')}${grp(2,'Wichtig')}${grp(3,'Feinschliff')}
  ${!R.length?'<div class="card mt"><p class="muted">Alles im grünen Bereich – weiter so.</p></div>':''}
  <div class="card mt"><h3>So solltest du dein Einkommen verteilen</h3><p class="small muted" style="margin-top:-4px">Pro Monat, von oben nach unten: erst wenn ein Topf gedeckt ist, kommt der nächste. Ø Einkommen CHF ${chf0(A.inc)}.</p>
    <div class="tw" style="max-height:none"><table><tr><th>Topf</th><th>Empfohlen</th><th>Geplant</th><th>Diff.</th></tr>${rows}</table></div></div>`;
}

/* Aufbauplan: verteilt das Geld ab einem Monat nach der Regel
   1. Kreditkarte vollständig zurückzahlen  2. Fehlbeträge aus Sparbeträgen decken
   3. Überschuss: Reserve auffüllen → Säule 3a bis Maximum → Investieren */
function aufbauplan(from){
  const s=D.settings, has=id=>D.cats.some(c=>c.id===id);
  if(has('invest')){ const ic=D.cats.find(c=>c.id==='invest');
    if(!ic.acc){ if(!D.accounts.some(a=>a.id==='anlage')) D.accounts.push({id:'anlage',name:'Anlagen / Depot',kind:'asset',rate:0,startYm:from,start:0,out:0,outM:{},abos:false}); ic.acc='anlage'; } }
  calc(); const months=C.months.filter(m=>m>=from);
  for(const y of new Set(months.map(m=>m.slice(0,4)))){   // Säule 3a aufs Maximum begrenzen
    let sum=C.months.filter(m=>m.startsWith(y)).reduce((t,m)=>t+((D.plan.s3a?.[m])||0),0);
    for(const m of months.filter(x=>x.startsWith(y)).reverse()){ if(sum<=s.max3a) break; const d=Math.min((D.plan.s3a?.[m])||0, sum-s.max3a); addPlan('s3a',m,-d); sum-=d; } }
  const kkCats=D.cats.filter(c=>c.acc==='kk'), na=D.accounts.find(a=>a.notgroschen), resCat=na && D.cats.find(c=>c.acc===na.id);
  for(const m of months){
    calc(); let x=C.m[m];
    if(kkCats.length && x.acc.kk){ const k=x.acc.kk; let need=Math.max(0, r2(-k.start + k.interest + k.out));
      const ord=[...kkCats].sort((a,b)=>(a.id==='rkk')-(b.id==='rkk'));   // Rückzahlung zuletzt: erhält den Rest
      ord.forEach((c,i)=>{ const v=(D.plan[c.id]?.[m])||0, nv = i===ord.length-1 ? need : Math.min(v,need); addPlan(c.id,m,nv-v); need-=nv; }); }
    calc(); x=C.m[m];
    if(x.rest<0){ let gap=-x.rest; for(const id of ['invest','sparen','eigenheim']){ const d=Math.min((D.plan[id]?.[m])||0,gap); if(d>0){ addPlan(id,m,-d); gap-=d; } } }
    calc(); x=C.m[m];
    let amt=floor50(x.rest); if(amt<50) continue;
    if(resCat){ const gap=C.reserveZiel-(x.acc[na.id]?.end||0); if(gap>0){ const d=Math.min(amt,ceil50(gap)); addPlan(resCat.id,m,d); amt-=d; } }
    if(amt>0 && has('s3a')){ const y=m.slice(0,4), ys=C.months.filter(z=>z.startsWith(y)).reduce((t,z)=>t+((D.plan.s3a?.[z])||0),0), d=Math.min(amt,Math.max(0,s.max3a-ys)); if(d>0){ addPlan('s3a',m,d); amt-=d; } }
    if(amt>0) addPlan(has('invest')?'invest':(resCat?.id||'sparen'), m, amt);
  }
  calc();
}
function vAufbauCard(){
  const from = ymAdd(C.now,1);
  return `<div class="card next mt"><h3>Aufbauplan erstellen</h3>
    <p class="small" style="margin:0 0 12px;max-width:70ch">Passt dein Budget ab ${ymLabel(from)} automatisch an: Kreditkarte zuerst vollständig zurückzahlen, dann jeden freien Franken in die Reserve, danach Säule 3a bis zum Maximum und den Rest investieren. Bedarf und Freizeit bleiben unverändert. Rückgängig machen ist möglich.</p>
    <button class="btn sm" data-act="aufbau">Aufbauplan ab ${ymShortY(from)} erstellen</button></div>`;
}
function applyRec(i){
  const r = RECS[i]; if(!r?.apply) return;
  const snap = JSON.stringify(D); r.apply(); save(); S.undo = {snap, label:'«'+r.t+'»'}; render();
}

/* =====================================================================
   7. ANSICHTEN
   ===================================================================== */

/* ---- Einmalige Aktualisierung (Nov 2026): fehlende Kategorien, Jahreskosten, Aufräumen ---- */
function applyUpgrades(){
  if(!D || D.flags?.cats1) return;
  const has = id => D.cats.find(c=>c.id===id);
  const add = (id,name,group) => { if(!has(id)) D.cats.push({id,name,group,acc:null,keep:true}); };
  // 1. fehlende Kategorien
  add('gesundheit','Gesundheitskosten (Franchise, Zahnarzt, Apotheke)','leben');
  add('kleidung','Kleidung & Schuhe','leben');
  add('haushalt_dro','Haushalt & Drogerie','leben');
  add('restaurant','Restaurant & Take-away','freizeit');
  add('geschenke','Geschenke & Anlässe','freizeit');
  add('weiterbildung','Weiterbildung','freizeit');
  add('bank','Bank- & Kontogebühren','fix');
  // 2. klarere Namen
  const ren = {coiffeur:'Coiffeur & Körperpflege', kkabos:'Abos (über Kreditkarte)', unbekannt:'Unvorhergesehenes (Puffer)', aktiv:'Freizeit & Hobbys'};
  for(const [id,n] of Object.entries(ren)) if(has(id)) has(id).name=n;
  // 3. abbezahlte / leere Kategorien archivieren (Verlauf bleibt erhalten)
  for(const id of ['bob','powerpay','rschulden','bekannt']) if(has(id)) has(id).archived=true;
  // 4. Jahreskosten (Schätzungen) – monatlich zurücklegen
  const from = ymAdd(TODAY,1);
  const yl = [['y_haftpflicht','Privathaftpflicht & Hausrat (Schätzung – Police prüfen)',250,6],['y_serafe','Serafe Radio/TV-Abgabe (ab 2027 CHF 312)',312,4],['y_velo','Velo-/E-Bike-Service (Schätzung)',150,3]];
  for(const [id,name,amount,month] of yl) if(!D.yearly.some(x=>x.id===id)) D.yearly.push({id,name,amount,month,cat:'',mode:'verteilt',from});
  calc(); ensureRueck();
  // 5. Budget für neue Kategorien aus dem Puffer «Unvorhergesehenes» umschichten (Gesamtbudget bleibt gleich)
  calc();
  const alloc = [['restaurant',100],['gesundheit',60],['kleidung',50],['geschenke',30],['haushalt_dro',25],['bank',5]];
  for(const m of C.months.filter(m=>m>=from)){
    const u=(D.plan.unbekannt?.[m])||0; if(!u) continue;
    let avail = Math.max(0, u - 90 - (C.m[m].yc.cats.rueck||0)), moved=0;
    for(const [id,v] of alloc){ const x=Math.min(v,avail); if(x>0){ (D.plan[id]??={})[m]=x; avail-=x; moved+=x; } }
    moved += Math.min(u-moved, C.m[m].yc.cats.rueck||0);
    D.plan.unbekannt[m] = r2(Math.max(0,u-moved));
  }
  D.flags = {...(D.flags||{}), cats1:true}; save(); calc();
  S.upgraded = true;
}
function applyUpgrades2(){
  if(!D || D.flags?.arch2) return;
  for(const id of ['kredit','powerpay']){ const a=D.accounts.find(x=>x.id===id); if(a) a.archived=true; }
  for(const id of ['bob','powerpay','rschulden']){ const c=D.cats.find(x=>x.id===id); if(c) c.archived=true; }
  D.settings.viewFrom = D.settings.viewFrom || '2026-10';
  D.flags={...(D.flags||{}), arch2:true}; save();
}
function applyUpgrades3(){
  if(!D || D.flags?.leute1) return;
  D.settings.leuteBudget ??= 200; D.settings.leuteZiel ??= 4; D.acts ??= [];
  const from = ymAdd(TODAY,1); D.settings.leuteFrom ||= from;
  if(!D.cats.some(c=>c.id==='leute')) D.cats.push({id:'leute',name:'Unter Leuten (Treffen, Ausgang, Kurse, Verein)',group:'freizeit',acc:null,keep:true});
  calc();
  // Geld kommt aus Restaurant, Puffer und – falls nötig – Ferien. Gesamtbudget bleibt gleich.
  const src = [['restaurant',40],['aktiv',0],['unbekannt',50],['ferien',250]];
  for(const m of C.months.filter(m=>m>=from)){
    let need = D.settings.leuteBudget - ((D.plan.leute?.[m])||0);
    for(const [id,min] of src){ if(need<=0) break; const v=(D.plan[id]?.[m])||0, x=Math.round(Math.max(0,Math.min(v-min,need))); if(x>0){ D.plan[id][m]=r2(v-x); need-=x; (D.plan.leute??={})[m]=r2(((D.plan.leute?.[m])||0)+x); } }
  }
  D.flags={...(D.flags||{}), leute1:true}; save(); S.upgradedLeute=true;
}
function render(){
  if(S.locked){ renderLock(); return; }
  if(!D){ renderWelcome(); return; }
  if(!D.flags?.cats1) applyUpgrades();
  if(!D.flags?.arch2) applyUpgrades2();
  if(!D.flags?.leute1) applyUpgrades3();
  if(NATIVE && !CK && !S.pinAsked && !$('#dlg').open){ S.pinAsked = true; setTimeout(()=>pinDialog('set'), 300); }
  calc();
  const a = id => `class="${S.view===id?'on':''}"`;
  $('#nav1').innerHTML = NAV.map(([sec,items])=>`<div class="sec">${sec}</div>`+items.map(([id,i,n])=>`<a data-go="${id}" ${a(id)}><span class="i">${i}</span>${n}</a>`).join('')).join('');
  const moreViews = ['analyse','prognose','empfehlungen','buchungen','jahr','konten','ziele','regeln','abos','daten','mehr'];
  $('#nav2').innerHTML = BOTTOM.map(([id,i,n])=>`<a data-go="${id}" class="${S.view===id||(id==='mehr'&&moreViews.includes(S.view))?'on':''}"><span class="i">${i}</span>${n}</a>`).join('');
  const bm = budgetMode();
  const monthV = ['monat','buchungen','analyse'].includes(S.view) || (S.view==='budget' && bm==='monat'), yearV = ['budget','konten','regeln'].includes(S.view) && !monthV;
  $('#mnav').style.visibility = (monthV||yearV) ? 'visible':'hidden';
  $('#mlabel').textContent = monthV ? ymLabel(S.ym) : S.year;
  $('#fab').classList.toggle('hide', !['home','monat','buchungen'].includes(S.view));
  const V = {analyse:vAnalyse, prognose:vPrognose, buchungen:vBuch, jahr:vJahr, empfehlungen:vEmpf, home:vHome, monat:vMonat, budget:vBudget, konten:vKonten, ziele:vZiele, wuensche:vWuensche, regeln:vRegeln, abos:vAbos, daten:vDaten, mehr:vMehr}[S.view] || vHome;
  $('#main').classList.toggle('wide', (S.view==='budget' && budgetMode()==='jahr') || ['konten','regeln'].includes(S.view));
  $('#main').innerHTML = updateBanner() + syncBanner() + backupBanner() + (S.upgradedLeute ? `<div class="hint row"><span class="sp">✓ Neu: Topf «Unter Leuten» mit CHF ${chf0(C.m[ymAdd(TODAY,1)]?.plan.leute||0)} pro Monat (aus Restaurant, Puffer und Ferien – Gesamtbudget unverändert) und Ziel ${D.settings.leuteZiel} Aktivitäten pro Monat. Wünsche gibt es jetzt als Erlebnis, Regelmässig oder Anschaffung.</span><button class="btn sm" data-act="okleute">OK</button></div>` : '') + (S.upgraded ? `<div class="hint row"><span class="sp">✓ Kategorien ergänzt: Gesundheit, Kleidung, Haushalt, Restaurant, Geschenke, Weiterbildung, Bankgebühren – dazu 3 Jahreskosten. Das Geld kommt aus «Unvorhergesehenes», dein Gesamtbudget bleibt gleich. Beträge sind Schätzungen: bitte im Budget anpassen.</span><button class="btn sm" data-act="okupg">OK</button></div>` : '') + (S.undo ? `<div class="hint row"><span class="sp">✓ ${esc(S.undo.label)} übernommen – Budget angepasst.</span><button class="btn sm" data-act="undo">Rückgängig</button></div>` : '') + V();
}
function syncBanner(){ const w=D.walletSync; if(!w?.err || !S.server?.wallet || S.view==='buchungen') return '';
  return `<div class="banner"><span class="sp">Wallet-Synchronisierung fehlgeschlagen: ${esc(w.err)}</span><button class="btn sm" data-go="buchungen">Ansehen</button></div>`; }
function backupBanner(){
  const last = D.backupAt ? new Date(D.backupAt) : null, days = last ? (Date.now()-last)/864e5 : 999;
  if(days < 30 || S.view==='daten') return '';
  return `<div class="banner"><span class="sp">${last?'Letztes Backup vor '+Math.floor(days)+' Tagen.':'Noch kein Backup gemacht.'} Die Daten liegen nur auf diesem Gerät.</span><button class="btn sm" data-act="export">Backup speichern</button></div>`;
}
function wipeAll(){ [KEY,ENC_KEY,TOK_KEY,FAIL_KEY,KEY+'.sync'].forEach(k=>localStorage.removeItem(k)); CK=null; SALT=null; TOKEN=null; SYNCCODE=null; D=null; C=null; S.locked=false; render(); }
function renderWelcome(){
  $('#nav1').innerHTML=''; $('#nav2').innerHTML=''; $('#mnav').style.visibility='hidden'; $('#fab').classList.add('hide');
  $('#main').innerHTML = `<div class="welcome"><h2>Willkommen</h2><p class="muted">Deine Daten bleiben auf diesem Gerät. Nichts wird hochgeladen.</p>
  <div class="card"><h3>Start</h3><p class="small muted">Importiere <b>Finanzen_Daten.json</b> (aus deiner Excel) oder ein Backup.</p>
  <div class="row">${document.getElementById('seed')?'<button class="btn pri" data-act="seed">Mit meinen Daten starten</button>':''}<button class="btn ${document.getElementById('seed')?'':'pri'}" data-act="import">Daten importieren …</button><button class="btn" data-act="blank">Leer beginnen</button></div></div></div>`;
}
const head = (t, sub, btns='') => `<div class="row"><h2 class="sp">${t}</h2>${btns}</div>${sub?`<p class="sub">${sub}</p>`:''}`;
const kpi = (l,v,s='',cls='') => `<div class="stat"><div class="l">${l}</div><div class="v num ${cls}">${v}</div>${s?`<div class="s">${s}</div>`:''}</div>`;

/* ---- 7.1 Cockpit ---- */
function track(M){
  const n=C.now;
  const st=[{t:'Du bist hier',ym:n,done:true,today:true}, ...M];
  return `<div class="track">${st.map(x=>`<div class="stn ${x.done?'done':''} ${x.today?'today':''} ${!x.ym&&!x.done?'miss':''}"><span class="pt"></span>
    <div class="dt">${x.today?'Heute':x.done?'erreicht':x.ym?ymShortY(x.ym):'offen'}</div><div class="nm">${esc(x.t)}</div></div>`).join('')}</div>`;
}
function vHome(){
  const n=C.now, m=C.m[n], L=ladder(), R=recommendations();
  const na = D.accounts.find(a=>a.notgroschen), res = na ? (m.acc[na.id]?.end||0) : 0;
  const past12 = vis(C.months).filter(x=>x<=n).slice(-12), incY = past12.reduce((t,x)=>t+C.m[x].inc,0), sparY = past12.reduce((t,x)=>t+C.m[x].t.spar,0);
  const nx = L.st[L.lvl], top = R.filter(r=>r.p<=2).slice(0,3);
  const roadmapAll = roadmap().filter(x=>!x.done);
  return `<h2>Grüezi</h2><p class="sub">Stand ${ymLabel(n)}. Alles basiert auf deinem Budget und den erfassten Buchungen.</p>
  <div class="hero">
    <div class="card"><div class="muted small">Nettovermögen (Guthaben minus Schulden)</div>
      <div class="big num ${m.netto<0?'neg':''}">CHF ${chf0(m.netto)}</div>
      <div class="facts">
        <div><span class="small muted">Reserve</span><b class="num">${na?pct(res/(C.reserveZiel||1)):'–'}</b><span class="small muted">${chf0(res)} von ${chf0(C.reserveZiel)}</span></div>
        <div><span class="small muted">Schulden</span><b class="num ${m.schuldenfrei?'pos':'neg'}">${m.schuldenfrei?'keine':chf0(-m.schulden)}</b><span class="small muted">${m.schulden<-0.5&&m.schuldenfrei?'Rest '+chf(-m.schulden)+' begleichen':m.schuldenfrei?'weiter so':(()=>{const f=firstFrom(n,x=>x.schuldenfrei);return f?'schuldenfrei ab '+ymLabel(f):'Schuldenplan unter Konten'})()}</span></div>
        <div><span class="small muted">Sparquote 12 Mt.</span><b class="num">${pct(incY?sparY/incY:NaN)}</b><span class="small muted">Ziel ${D.settings.spar} %</span></div>
        <div><span class="small muted">Diesen Monat übrig</span><b class="num ${m.rest<0?'neg':''}">${chf0(m.rest)}</b><span class="small muted">Restbetrag</span></div>
      </div></div>
    <div class="card next"><div class="small">Nächster Schritt · ${L.done} von ${L.st.length} Stufen erfüllt</div>
      <div class="level">${L.st.map(x=>`<i class="${x.ok?'on':''}" style="background:${x.ok?'#fff':'rgba(255,255,255,.28)'}"></i>`).join('')}</div>
      ${nx?`<h3 style="font-size:22px;margin:14px 0 6px;letter-spacing:-.01em">${esc(nx.t)}</h3><p class="small" style="margin:0 0 6px">${esc(nx.d)}</p><p style="margin:0 0 14px">${esc(nx.how)}</p>`:'<h3 style="font-size:22px;margin:14px 0">Alle Stufen erreicht 🎉</h3>'}
      <button class="btn sm" data-go="empfehlungen">Empfehlungen ansehen</button></div>
  </div>
  <div class="grid g2 mt"><div>${leuteCard(true)}</div><div>${dailyCard()||''}</div></div>
  <div class="card mt"><div class="row"><h3 class="sp" style="margin:0">Fahrplan zu deinen Zielen</h3><a class="link" data-go="empfehlungen">Details</a></div>
    ${track(roadmapAll)}</div>
  <div class="grid g2 mt">
    <div class="card"><div class="row"><h3 class="sp" style="margin:0">Das solltest du angehen</h3><a class="link" data-go="empfehlungen">Alle ${R.length}</a></div>
      <div class="list">${top.map(r=>`<div class="li" style="cursor:pointer" data-go="empfehlungen"><span class="pdot" style="background:${r.p===1?'var(--bad)':'var(--warn)'}"></span><span class="sp">${esc(r.t)}</span></div>`).join('')||'<p class="muted">Nichts Dringendes – gut so.</p>'}</div></div>
    ${quickCard()}
  </div>
  <div class="grid g2 mt">
    <div class="card"><div class="row"><h3 class="sp" style="margin:0">Deine Wünsche – leistbar ab</h3><a class="link" data-go="wuensche">Alle</a></div>
      <div class="list">${openWishes().slice(0,5).map(w=>{const p=w._p||{}; const now=p.ym&&p.ym<=n;
        return `<div class="li" style="cursor:pointer" data-go="wuensche"><span class="sp">${esc(w.name)}<br><span class="small muted num">CHF ${chf0(w.price)}</span></span><b class="${now?'pos':p.ym?'':'neg'}" style="color:${now?'':p.ym?'var(--acc)':''}">${!p.ym?'nicht absehbar':now?'jetzt':(p.est?'ca. ':'')+ymLabel(p.ym)}</b></div>`}).join('')||'<p class="muted small">Noch keine Wünsche. Nutze den Check oben und speichere sie.</p>'}</div></div>
    <div class="card"><h3>Nettovermögen über die Zeit</h3>${lineChart()}</div>
  </div>
  <details class="card mt"><summary><h3>Alle Stufen zur finanziellen Stabilität</h3></summary>
    <div style="margin-top:8px">${L.st.map((x,i)=>`<div class="step ${x.ok?'done':''} ${i===L.lvl?'now':''}"><div class="n">${x.ok?'✓':i+1}</div><div class="sp"><div class="t">${x.t}</div><div class="d">${x.d}</div>${!x.ok?`<div class="d">${x.how}</div>`:''}</div></div>`).join('')}</div></details>`;
}

/* ---- 7.2 Monat ---- */
function vMonat(){
  const ym=S.ym, m=C.m[ym];
  if(!m) return head('Monat')+`<div class="card">Für ${ymLabel(ym)} gibt es noch kein Budget. <button class="btn sm" data-act="newyear" data-y="${ym.slice(0,4)}">Jahr ${ym.slice(0,4)} anlegen</button></div>`;
  const main = mainAcc(), ma = main && m.acc[main.id], s=D.settings, inc=m.inc||1;
  const seg = (v,c,l) => v>0 ? `<div style="width:${Math.min(100,v/inc*100)}%;background:${c}" title="${l}: ${pct(v/inc)}"></div>` : '';
  const rules = checkMonth(ym);
  let catRows='';
  for(const [g,G] of Object.entries(GROUPS)){
    const rows = D.cats.filter(c=>c.group===g).map(c=>{
      const plan=m.plan[c.id]||0, ist=C.ist[c.id]?.[ym];
      if(!plan && ist==null) return '';
      const used = ist??0, p = plan>0 ? used/plan : (used>0?1.5:0);
      const col = ist==null ? 'var(--line)' : p>1.001 ? 'var(--bad)' : p>0.85 ? 'var(--warn)' : G.c;
      return `<div class="citem" data-act="addtx" data-c="${c.id}"><div class="top"><span class="sp">${esc(c.name)}</span>
        <span class="num ${ist!=null&&p>1.001?'neg':''}">${ist==null?'<span class="muted">Plan</span> ':chf(ist)+' / '}${chf(plan)}</span></div>
        <div class="bar"><i style="width:${Math.min(100,p*100)}%;background:${col}"></i></div></div>`; }).join('');
    if(rows) catRows += `<div class="small muted" style="margin-top:12px;font-weight:600"><span class="dot" style="background:${G.c}"></span>${G.n} · CHF ${chf0(m.g[g])}</div>${rows}`;
  }
  const list = D.tx.filter(t=>t.d.startsWith(ym)).sort((a,b)=>b.d.localeCompare(a.d));
  const txHtml = list.map(t=>`<div class="li"><div class="sp"><div>${esc(catName(t.c))}${isMove(t)?` <span class="tag g">ab ${esc(accName(t.acc))}</span>`:''}</div><div class="small muted">${t.d.split('-').reverse().join('.')}${t.n?' · '+esc(t.n):''}</div></div>
    <b class="num ${t.c==='_inc'?'pos':''}">${chf(t.a)}</b><button class="ibtn" data-act="edittx" data-id="${t.id}" title="Bearbeiten">✎</button></div>`).join('');
  const close = D.accounts.filter(a=>m.acc[a.id]).map(a=>{const x=m.acc[a.id];
