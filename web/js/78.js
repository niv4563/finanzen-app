/* =====================================================================
   80. MEIN PLAN – SCHNELL STABIL, OHNE AUF SPASS ZU VERZICHTEN (SCHWEIZ)
   Neue Seite «Mein Plan» (Menü › Geld planen) mit sechs Schritten:
   1 Kreditkarte stoppen   – Zins (12 %), Abzahlplan, «schuldenfrei am …», Warnung ohne Deckung
   2 Lohntag-Plan          – am Lohntag verteilen (Karte, Notgroschen, Steuern, 3a, Gönn-Topf),
                             als Daueraufträge anlegen, Mitteilung am Lohntag
   3 Notgroschen           – Ziel = 3 Monatsausgaben aus deinen echten Zahlen
   4 Steuern               – Rückstellung aus deinen bisherigen Steuerzahlungen (Wohnsitz 31.12.)
   5 Schweizer Fristen     – Krankenkasse 30.11. (mit Franchise-Rechner), Säule 3a 31.12.,
                             Prämienverbilligung Aargau 31.12., Steuererklärung; Abzüge sammeln + Datei
   6 Belohnung             – Meilensteine erhöhen den Gönn-Topf, Nettovermögen-Kurve
   Dazu: Erlebnisse mit Datum und Countdown auf der Seite «Gönnen».
   Alles wird nur auf dem Gerät berechnet. Budget wird nur auf deinen Tipp geändert.
   ===================================================================== */
var P3A_MAX = 7258, KK_ZINS = 12;
var PL = () => (D.settings.plan ??= {});
TITLES.plan = 'Mein Plan';
(() => { const s = NAV4.find(x=>x[0]==='Geld planen'); if(s && !s[1].some(i=>i[0]==='plan')) s[1].unshift(['plan', ICON.goal, 'Mein Plan']);
  if(TABS[0] && !TABS[0][3].includes('plan')) TABS[0][3].push('plan'); })();

/* ---------- Grundlagen ---------- */
var accBal = a => { const b = balAt(a.id, todayIso()); return b ?? accValRaw(a) ?? 0; };
var kkAccs = () => D.accounts.filter(a=>!a.archived && accGrp(a)==='karte');
var kkTot = () => r2(kkAccs().reduce((s,a)=>s+Math.max(0, -accBal(a)),0));
var kkZins = () => +PL().kkZins || KK_ZINS;
function kkSim(bal, amt){ const r = kkZins()/100/12; let m = 0, int = 0; if(amt <= bal*r) return {m:Infinity, int:Infinity};
  while(bal > 0.5 && m < 600){ const z = bal*r; int += z; bal = bal + z - amt; m++; } return {m, int:r2(int)}; }
var kkSuggest = () => { const t = kkTot(); return t ? Math.max(100, Math.ceil(t/12/50)*50) : 0; };
var kkAmt = () => +PL().kkAmt || kkSuggest();
function avgOut(n){ return noFilter(()=>{ const ps = Array.from({length:n},(_,i)=>_lmPeriod(-1-i)); const v = ps.map(p=>brSums(p.from,p.to).out).filter(x=>x>0); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : 0; }); }
var ntgAcc = () => D.accounts.find(a=>a.id===PL().ntgAcc) || D.accounts.find(a=>a.notgroschen && !a.archived);
function ntgInfo(){ const a = ntgAcc(), cur = a ? accBal(a) : 0, tgt = Math.max(1000, Math.round(avgOut(6)*3/100)*100), gap = Math.max(0, tgt-cur);
  return {a, cur, tgt, gap, mon: gap>0 ? Math.max(100, Math.ceil(gap/12/50)*50) : 0, ok: cur >= tgt}; }
var isTaxT = t => /steuer/i.test(brSub(t)+' '+brTop(t)+' '+(t.n||'')) && !/motorfahrzeug|mfz|hunde/i.test(brSub(t)+' '+(t.n||''));
function taxInfo(){
  const y = +todayIso().slice(0,4), by = {}; for(const t of D.tx){ if(isTr(t) || sv(t)>=0 || !isTaxT(t)) continue; const yy = +t.d.slice(0,4); if(yy>=y-2) by[yy] = (by[yy]||0) - sv(t); }
  const hist = Math.max(by[y-1]||0, by[y]||0), est = +PL().taxEst || Math.round(hist/100)*100;
  const nx = ymAdd(TODAY,1), budM = D.cats.filter(c=>!c.archived && /steuer/i.test(c.name) && !/motorfahrzeug/i.test(c.name)).reduce((s,c)=>s+(C.m[nx]?.plan?.[c.id]||0),0);
  return {by, est, mon: est ? Math.ceil(est/12/10)*10 : 0, budM, ok: est>0 && budM >= est/12 - 5, y};
}
var is3aAcc = a => /3a|säule|saule/i.test(a.name||'');
function p3aInfo(y){ y = y || +todayIso().slice(0,4); const accs = D.accounts.filter(a=>!a.archived && is3aAcc(a)), ids = new Set(accs.map(a=>a.id));
  const paid = r2(D.tx.filter(t=>t.d.startsWith(String(y)) && ids.has(bkAcc(t)) && sv(t)>0).reduce((s,t)=>s+sv(t),0));
  return {accs, paid, rest:Math.max(0, P3A_MAX-paid), ok: paid >= P3A_MAX-1}; }
function lastSalary(){ return noFilter(()=>{ const P = _lmPeriod(0), Pp = _lmPeriod(-1);
  const s = brTx(Pp.from, P.to).filter(t=>brIsInc(t) && !isTr(t) && sv(t)>=1000).sort((a,b)=>b.d.localeCompare(a.d)); return s[0] ? {d:s[0].d, v:sv(s[0])} : null; }); }

/* ---------- Lohntag-Plan ---------- */
function ltItems(){
  const out = [], kt = kkTot(), n = ntgInfo(), tx = taxInfo(), p3 = p3aInfo(), g = D.settings.goenn, card = kkAccs().sort((a,b)=>accBal(a)-accBal(b))[0];
  if(kt > 0) out.push({k:'kk', l:'Kreditkarte abzahlen', v:Math.min(kkAmt(), kt), to:card?.id, why:'12 % Zins sparen'});
  if(n.mon) out.push({k:'ntg', l:'Notgroschen', v:n.mon, to:n.a?.id, why:`bis CHF ${chf0(n.tgt)}`});
  if(tx.mon && !tx.ok) out.push({k:'tax', l:'Steuern zurücklegen', v:Math.max(0, tx.mon - tx.budM), to:(D.accounts.find(a=>!a.archived && /rückstell|ruckstell|steuer/i.test(a.name))||{}).id, why:`CHF ${chf0(tx.est)} pro Jahr`});
  if(p3.accs.length && !p3.ok) out.push({k:'p3a', l:'Säule 3a', v:+PL().p3aMon || Math.ceil(P3A_MAX/12/5)*5, to:p3.accs[0].id, why:'Steuern sparen'});
  if(g?.amt) out.push({k:'goenn', l:'Gönn-Topf (bleibt auf dem Konto)', v:g.amt, to:null, why:'für dich'});
  return out.filter(x=>x.v>0);
}
function ltCard(onStart){
  const s = lastSalary(); if(!s) return ''; const recent = dDiff(s.d, todayIso()) <= 4; if(onStart && !recent) return '';
  const it = ltItems(), done = (PL().ltDone ??= {})[s.d] || {}, sum = it.reduce((a,x)=>a+x.v,0), rest = r2(s.v - sum);
  if(onStart && it.every(x=>done[x.k])) return '';
  return `<div class="card mt ltcard"><div class="row"><h3 class="sp" style="margin:0">${recent?'Lohn ist da – so verteilst du ihn':'Lohntag-Plan'}</h3><span class="small muted">${dShort(s.d)} · CHF ${chf0(s.v)}</span></div>
    <p class="small muted" style="margin:4px 0 8px">Zuerst für dich vorsorgen, dann ist der Rest frei – ohne schlechtes Gewissen.</p>
    ${it.map(x=>`<label class="ltrow"><input type="checkbox" data-act="ltdone" data-d="${s.d}" data-k="${x.k}" ${done[x.k]?'checked':''}><span class="sp"><b>${x.l}</b><em>${esc(x.why)}${x.to?' → '+esc(accName(x.to)):''}</em></span><b class="num">CHF ${chf0(x.v)}</b></label>`).join('')}
    <div class="ltrow ltrest"><span class="sp"><b>Frei zum Leben</b><em>für Alltag, Freizeit und Spontanes</em></span><b class="num ${rest<0?'neg':'in'}">CHF ${chf0(rest)}</b></div>
    ${rest<0?`<p class="small neg" style="margin:6px 0 0">Mehr verplant als Lohn – Kreditkarten-Betrag oder Notgroschen etwas tiefer setzen.</p>`:''}
    <div class="row" style="gap:6px;margin-top:10px;flex-wrap:wrap"><button class="btn sm" data-act="ltplans">Als Daueraufträge anlegen</button>${onStart?'<button class="btn sm ghost" data-go="plan">Mein Plan</button>':''}</div></div>`;
}
function ltPlansDialog(){
  const it = ltItems().filter(x=>x.to), from = mainAcc()?.id, day = lmStart()===1 ? 1 : Math.min(28, lmStart()+1);
  if(!it.length){ toastMsg('Keine Überträge nötig – es fehlen Zielkonten (z. B. Sparkonto, Säule 3a).'); return; }
  const start = (() => { let d = todayIso().slice(0,8)+p2(day); if(d <= todayIso()) d = ymAdd(TODAY,1)+'-'+p2(day); return d; })();
  dialog(`<h3>Daueraufträge anlegen</h3><p class="small muted" style="margin-top:0">Monatlich am ${day}. ab ${dShort(start)} von «${esc(accName(from))}». Richte sie danach auch in deinem E-Banking ein – die App bucht nichts selbst.</p>
    ${it.map(x=>`<label class="ltrow"><input type="checkbox" class="ltp" value="${x.k}" checked><span class="sp"><b>${x.l}</b><em>→ ${esc(accName(x.to))}</em></span><b class="num">CHF ${chf0(x.v)}</b></label>`).join('')}
    <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Anlegen</button></div>`,
  k=>{ if(k!=='ok') return; const sel = new Set([...document.querySelectorAll('.ltp:checked')].map(i=>i.value)); let n = 0; D.plans ??= [];
    for(const x of it.filter(x=>sel.has(x.k))){ const name = 'Lohntag: '+x.l, ex = D.plans.find(p=>p.name===name);
      const np = {id:ex?.id||'p'+uid(), type:'tr', name, amount:x.v, freq:'M', start, day, acc:from, to:x.to, cat:BK_TRANSFER, match:''};
      if(ex) Object.assign(ex, np); else D.plans.push(np); n++; }
    setTimeout(()=>toastMsg(`${n} Daueraufträge angelegt (Kommende Zahlungen)`), 50); });
}

/* ---------- Kreditkarte ---------- */
function kkCard(){
  const t = kkTot(); if(!t) return stepCard(1, 'Kreditkarte stoppen', '<p class="small in" style="margin:0">Keine offene Kreditkarte – sehr gut. Zahle die Rechnung weiterhin jeden Monat ganz, dann fallen nie Zinsen an.</p>', true);
  const amt = kkAmt(), sim = kkSim(t, amt), zm = t*kkZins()/100/12, main = mainAcc(), mb = main ? accBal(main) : 0, end = isFinite(sim.m) ? ymAdd(TODAY, sim.m) : null;
  return stepCard(1, 'Kreditkarte stoppen', `
    <div class="brsum" style="padding:0;box-shadow:none;border:0"><div class="brk"><span>Offen</span><b class="num neg">CHF ${chf0(t)}</b></div><div class="brk"><span>Zins pro Monat ca.</span><b class="num neg">CHF ${chf0(zm)}</b></div><div class="brk"><span>Schuldenfrei</span><b class="num">${end?ymLabel(end):'nie'}</b></div></div>
    <p class="small" style="margin:8px 0">Mit <b>CHF ${chf0(amt)}</b> pro Monat bist du in ${isFinite(sim.m)?sim.m+' Monaten':'– Betrag zu tief –'} schuldenfrei und zahlst noch etwa CHF ${isFinite(sim.int)?chf0(sim.int):'–'} Zins (bei ${kkZins()} %). Keine Bank-Sparzinsen kommen da heran.</p>
    ${t > mb ? `<p class="small neg" style="margin:0 0 8px">Achtung: Die Karte (CHF ${chf0(t)}) ist höher als dein Privatkonto (CHF ${chf0(mb)}). Bis die Karte abbezahlt ist: im Alltag mit Debitkarte oder TWINT zahlen.</p>`:''}
    <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm pri" data-act="kkset">Abzahlbetrag festlegen</button><button class="btn sm ghost" data-go="coach">Schuldenplan</button></div>`, false);
}
function kkDialog(){
  const t = kkTot(), cat = D.cats.find(c=>!c.archived && c.group==='schulden' && /kredit/i.test(c.name)), nx = ymAdd(TODAY,1);
  const opts = [100,150,200,300,400,500,750,1000].filter(v=>v<=Math.max(t,100)).concat(kkSuggest()).filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b);
  dialog(`<h3>Kreditkarte abzahlen</h3><p class="small muted" style="margin-top:0">Offen: CHF ${chf0(t)} · Zins ${kkZins()} % pro Jahr.</p>
    <div class="kkopts">${opts.map(v=>{ const s = kkSim(t,v); return `<label class="ltrow"><input type="radio" name="kka" value="${v}" ${v===kkAmt()?'checked':''}><span class="sp"><b>CHF ${chf0(v)} pro Monat</b><em>${isFinite(s.m)?`schuldenfrei ${ymLabel(ymAdd(TODAY,s.m))} · Zins ca. CHF ${chf0(s.int)}`:'reicht nicht für die Zinsen'}</em></span></label>`; }).join('')}</div>
    <label class="f">Eigener Betrag (CHF)<input id="kkx" inputmode="decimal" placeholder="z. B. 350"></label>
    <label class="f">Zinssatz deiner Karte (%)<input id="kkz" inputmode="decimal" value="${kkZins()}"></label>
    ${cat?`<label class="chk"><input type="checkbox" id="kkb" checked> Ab ${ymLabel(nx)} auch im Budget bei «${esc(cat.name)}» eintragen (bewusste Änderung)</label>`:''}
    <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Speichern</button></div>`,
  k=>{ if(k!=='ok') return; const x = parseNum($('#kkx').value), r = document.querySelector('input[name=kka]:checked')?.value, v = x>0 ? x : +r;
    if(!(v>0)){ toastMsg('Bitte einen Betrag wählen.'); return false; } PL().kkAmt = r2(v); const z = parseNum($('#kkz').value); if(z>0 && z<30) PL().kkZins = z;
    if(cat && $('#kkb')?.checked){ D.plan[cat.id] ??= {}; const s = kkSim(t, v), last = isFinite(s.m) ? ymAdd(TODAY, s.m) : ymAdd(TODAY, 24);
      for(const m of C.months.filter(m=>m>=nx)) D.plan[cat.id][m] = m<=last ? r2(v) : 0; } });
}

/* ---------- Notgroschen, Steuern ---------- */
function ntgCard(){ const n = ntgInfo(), p = Math.min(1, n.cur/(n.tgt||1));
  return stepCard(3, 'Notgroschen', `<p class="small" style="margin:0 0 6px">Ziel: 3 Monatsausgaben = <b>CHF ${chf0(n.tgt)}</b> (aus deinen letzten 6 Monaten). ${n.a?`Auf «${esc(n.a.name)}»: CHF ${chf0(n.cur)}.`:'Noch kein Konto gewählt.'}</p>
    <div class="bar"><i style="width:${p*100}%;background:var(--ok)"></i></div>
    <p class="small muted" style="margin:6px 0 8px">${n.ok?'Erreicht – Unerwartetes bringt dich nicht mehr aus dem Tritt.':`Noch CHF ${chf0(n.gap)} – mit CHF ${chf0(n.mon)} pro Monat in etwa ${Math.ceil(n.gap/n.mon)} Monaten. Erst wenn die Kreditkarte weg ist, lohnt sich mehr.`}</p>
    <label class="f" style="margin:0">Konto für den Notgroschen<select data-act="ntgsel">${D.accounts.filter(a=>!a.archived && accGrp(a)!=='karte').map(a=>`<option value="${a.id}" ${n.a?.id===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label>`, n.ok); }
function taxCard(){ const t = taxInfo(), yrs = Object.keys(t.by).sort();
  return stepCard(4, 'Steuern zurücklegen', `<p class="small" style="margin:0 0 6px">Massgebend ist dein Wohnsitz am 31. Dezember – du zahlst also für das ganze Jahr im Kanton Aargau. Die Rechnung kommt erst im Folgejahr; monatlich zurücklegen verhindert eine Lücke.</p>
    ${yrs.length?`<p class="small muted" style="margin:0 0 6px">Bisher bezahlt: ${yrs.map(y=>`${y}: CHF ${chf0(t.by[y])}`).join(' · ')}</p>`:''}
    <div class="brsum" style="padding:0;box-shadow:none;border:0"><div class="brk"><span>Geschätzt pro Jahr</span><b class="num">${t.est?'CHF '+chf0(t.est):'–'}</b></div><div class="brk"><span>Nötig pro Monat</span><b class="num">${t.mon?'CHF '+chf0(t.mon):'–'}</b></div><div class="brk"><span>Im Budget ${MN[+ymAdd(TODAY,1).slice(5)-1].slice(0,3)}.</span><b class="num ${t.ok?'in':'neg'}">CHF ${chf0(t.budM)}</b></div></div>
    <div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn sm" data-act="taxset">Schätzung anpassen</button></div>
    <p class="small muted" style="margin:6px 0 0">Genauer wird es mit dem Steuerrechner des Kantons Aargau oder deiner letzten Steuerrechnung.</p>`, t.ok); }

/* ---------- Schweizer Fristen ---------- */
function fristen(){
  const t = todayIso(), y = +t.slice(0,4), p3 = p3aInfo(y), done = (PL().fristDone ??= {}), dn = (yy,k) => !!done[yy]?.[k];
  const kkY = t > y+'-11-30' ? y+1 : y, decY = y;
  return [
    {k:'kk', y:kkY, due:kkY+'-11-30', from:kkY+'-10-01', t:'Krankenkasse: Prämien vergleichen, Franchise prüfen', d:'Die Grundversicherung lässt sich nur auf Ende Jahr wechseln; die Kündigung muss bis 30. November bei der Kasse sein. Prämien für nächstes Jahr kommen jeweils Ende September.', b:[['Franchise-Rechner','franchise']]},
    {k:'p3a', y:decY, due:decY+'-12-31', from:decY+'-09-01', t:`Säule 3a: bis CHF ${chf0(P3A_MAX)} einzahlen`, d: p3.accs.length ? `Dieses Jahr eingezahlt: CHF ${chf0(p3.paid)} – noch CHF ${chf0(p3.rest)} möglich. Gutschrift muss bis 31.12. auf dem 3a-Konto sein. Seit 2026 kann man fehlende Jahre (ab 2025) nachzahlen.` : 'Lege unter Konten dein 3a-Konto an (Name mit «3a»), dann rechnet die App mit.', auto:p3.ok},
    {k:'ipv', y:decY, due:decY+'-12-31', from:decY+'-09-01', t:`Prämienverbilligung Aargau ${decY+1} prüfen`, d:'Nur bei bescheidenem Einkommen. Anmeldung jedes Jahr bei der SVA Aargau bis 31. Dezember – danach verfällt der Anspruch. Ob du Anspruch hast, zeigt der Rechner auf der Seite der SVA Aargau.'},
    {k:'st', y:decY, due:(decY+1)+'-03-31', from:(decY+1)+'-01-15', t:`Steuererklärung ${decY} (Aargau)`, d:'Abgabe in der Regel bis Ende März, Fristverlängerung ist möglich. Die App sammelt die Abzüge fürs ganze Jahr.', b:[['Abzüge ansehen','abzuege']]},
  ].map(f=>({...f, done: f.auto || dn(f.y, f.k), days: dDiff(t, f.due), soon: t >= f.from}))
   .sort((a,b)=>(a.done-b.done) || a.due.localeCompare(b.due));
}
function fristCard(){ const F = fristen(), open = F.filter(f=>!f.done);
  return stepCard(5, 'Schweizer Fristen', F.map(f=>`<div class="fr ${f.done?'done':f.soon&&f.days<=30?'hot':''}"><label class="frc"><input type="checkbox" data-act="frdone" data-k="${f.k}" data-y="${f.y}" ${f.done?'checked':''} ${f.auto?'disabled':''} aria-label="${esc(f.t)} erledigt"></label>
    <div class="sp"><b>${esc(f.t)}</b><div class="small muted">${dLong(f.due)} · ${f.done?'erledigt':f.days<0?'vorbei':f.days===0?'heute':'noch '+f.days+' Tage'}</div><p class="small" style="margin:4px 0 6px">${esc(f.d)}</p>
    ${(f.b||[]).map(([l,a])=>`<button class="btn sm" data-act="${a}">${l}</button>`).join(' ')}</div></div>`).join(''), !open.length); }
function franchiseDialog(){
  const y = +todayIso().slice(0,4), from = dAdd(todayIso(),-365), pl = PL();
  const hk = r2(D.tx.filter(t=>t.d>=from && !isTr(t) && sv(t)<0 && /gesundheit|arzt|apothek|spital|medizin|therap|physio|labor|brille|optik/i.test(brSub(t)+' '+brTop(t)+' '+(t.n||'')) && !/krankenkasse|prämie|praemie|versicherung/i.test(brSub(t)) && !/krankenkasse|prämie|praemie|css|helsana|swica|sanitas|visana|concordia|assura|kpt|sympany|mutuel|atupri|egk|ökk|zahn|fitness|kosmetik|coiffeur|drogerie/i.test((t.n||'')+' '+(t.wc||''))).reduce((s,t)=>s-sv(t),0));
  const calc = (prem, F, K) => 12*prem + Math.min(K, F) + Math.min(Math.max(0, K-F)*0.1, 700);
  const body = () => { const a = parseNum($('#fp1')?.value)||0, b = parseNum($('#fp2')?.value)||0, K = parseNum($('#fk')?.value)||0; if(!(a>0 && b>0)){ $('#fres').innerHTML = '<span class="muted">Prämien eintragen (aus der Prämienübersicht deiner Kasse).</span>'; return; }
    const c1 = calc(a,300,K), c2 = calc(b,2500,K), be = (()=>{ for(let k=0;k<=10000;k+=50) if(calc(a,300,k) < calc(b,2500,k)) return k; return null; })();
    $('#fres').innerHTML = `Franchise 300: <b>CHF ${chf0(c1)}</b> pro Jahr · Franchise 2500: <b>CHF ${chf0(c2)}</b> pro Jahr.<br><b class="${c1<c2?'':'in'}">${c1<c2?'Franchise 300':'Franchise 2500'} ist bei CHF ${chf0(K)} Kosten günstiger (CHF ${chf0(Math.abs(c1-c2))} pro Jahr).</b>${be!=null?`<br><span class="muted">Ab etwa CHF ${chf0(be)} Arztkosten pro Jahr lohnt sich 300.</span>`:''} <span class="muted">Mit 2500 sollte der Notgroschen die Franchise decken.</span>`;
    pl.prem300 = a; pl.prem2500 = b; };
  dialog(`<h3>Franchise-Rechner</h3><p class="small muted" style="margin-top:0">Gesundheitskosten der letzten 12 Monate aus deinen Buchungen (ohne Prämien, Zahnarzt): CHF ${chf0(hk)}.</p>
    <label class="f">Monatsprämie mit Franchise 300 (CHF)<input id="fp1" inputmode="decimal" value="${pl.prem300||''}"></label>
    <label class="f">Monatsprämie mit Franchise 2500 (CHF)<input id="fp2" inputmode="decimal" value="${pl.prem2500||''}"></label>
    <label class="f">Erwartete Arztkosten pro Jahr (CHF)<input id="fk" inputmode="decimal" value="${Math.round(hk)}"></label>
    <p class="small" id="fres"></p><p class="small muted">Gerechnet mit Selbstbehalt 10 % bis CHF 700. Prämien vergleichen z. B. auf priminfo.admin.ch.</p>
    <div class="acts"><button class="btn" data-dlg="cancel">Schliessen</button></div>`, ()=>{ save(); });
  ['fp1','fp2','fk'].forEach(id=>$('#'+id)?.addEventListener('input', body)); body();
}

/* ---------- Steuer-Abzüge sammeln ---------- */
var ABZ = [
  ['p3a', 'Säule 3a', null],
  ['weg', 'Arbeitsweg (ÖV)', /arbeitsweg|öffentlich|oev|öv\b|sbb|halbtax|generalabo|\bga\b|zvv|a-welle|libero|bus|bahn/i],
  ['wb', 'Weiterbildung', /weiterbild|kurs\b|kurse|\bcas\b|\bmas\b|studium|schul|bildung|fachbuch|seminar|eduRail|bfh|fhnw/i],
  ['sp', 'Spenden', /spende|hilfswerk|unicef|caritas|heks|rotes kreuz|stiftung/i],
  ['kh', 'Krankheitskosten', /arzt|apothek|spital|zahnarzt|therap|physio|brille|optik|labor/i],
];
function abzYear(y){ const out = {};
  const p3 = p3aInfo(y); out.p3a = {sum:p3.paid, list:D.tx.filter(t=>t.d.startsWith(String(y)) && p3.accs.some(a=>a.id===bkAcc(t)) && sv(t)>0)};
  for(const [k,,rx] of ABZ.slice(1)){ const list = D.tx.filter(t=>t.d.startsWith(String(y)) && !isTr(t) && sv(t)<0 && rx.test(brSub(t)+' '+brTop(t)+' '+(t.n||'')+' '+(t.wc||''))); out[k] = {sum:r2(list.reduce((s,t)=>s-sv(t),0)), list}; }
  return out; }
function abzDialog(y){
  y = y || (+todayIso().slice(5,7) <= 4 ? +todayIso().slice(0,4)-1 : +todayIso().slice(0,4)); const A = abzYear(y);
  dialog(`<h3>Steuer-Abzüge ${y}</h3><p class="small muted" style="margin-top:0">Aus deinen Buchungen gesammelt – prüfe jeden Posten, bevor du ihn in die Steuererklärung übernimmst. Belege (z. B. 3a-Bescheinigung) brauchst du trotzdem.</p>
    <div class="row" style="gap:6px;margin-bottom:8px"><button class="btn sm" data-act="abzy" data-y="${y-1}">‹ ${y-1}</button>${y<+todayIso().slice(0,4)?`<button class="btn sm" data-act="abzy" data-y="${y+1}">${y+1} ›</button>`:''}</div>
    ${ABZ.map(([k,l])=>`<details class="bfm"><summary><span class="bfl">${l}</span><span class="bfv">CHF ${chf(A[k].sum)} · ${A[k].list.length} Buchungen</span></summary><div class="bfopts">${A[k].list.slice(0,80).map(t=>`<div class="row small"><span>${dShort(t.d)}</span><span class="sp">${esc(brSub(t))} ${esc(t.n||'')}</span><b class="num">${chf(Math.abs(sv(t)))}</b></div>`).join('')||'<span class="small muted">keine</span>'}</div></details>`).join('')}
    <div class="acts"><button class="btn" data-dlg="cancel">Schliessen</button><button class="btn pri" data-act="abzdl" data-y="${y}">Als Datei speichern</button></div>`, ()=>{});
}
function abzFile(y){ const A = abzYear(y), row = t => `<tr><td>${t.d.split('-').reverse().join('.')}</td><td>${esc(brSub(t))}</td><td>${esc(t.n||'')}</td><td style="text-align:right">${chf(Math.abs(sv(t)))}</td></tr>`;
  const html = `<!DOCTYPE html><html lang="de-CH"><head><meta charset="utf-8"><title>Steuer-Abzüge ${y}</title><style>body{font:14px system-ui,sans-serif;margin:32px;color:#111}h1{font-size:20px}h2{font-size:16px;margin-top:24px}table{border-collapse:collapse;width:100%}td{border-bottom:1px solid #ddd;padding:4px 6px}.t{font-weight:700}</style></head><body>
  <h1>Steuer-Abzüge ${y} – Übersicht aus der Finanzen-App</h1><p>Erstellt am ${new Date().toLocaleDateString('de-CH')}. Zum Drucken oder «Als PDF speichern» im Browser öffnen. Alle Posten vor der Übernahme prüfen.</p>
  ${ABZ.map(([k,l])=>`<h2>${l}: CHF ${chf(A[k].sum)}</h2><table>${A[k].list.map(row).join('')||'<tr><td>keine Buchungen</td></tr>'}</table>`).join('')}</body></html>`;
  download(`Steuer-Abzuege-${y}.html`, html, 'text/html'); }

/* ---------- Belohnung & Nettovermögen ---------- */
function milestones(){ const y = +todayIso().slice(0,4), n = ntgInfo(), t = taxInfo(), p3 = p3aInfo(y), kt = kkTot(), had = PL().kkHad;
  if(kt > 300) PL().kkHad = true;
  return [
    {k:'kk0', l:'Kreditkarte schuldenfrei', ok: had && kt <= 1},
    {k:'ntg', l:'Notgroschen voll', ok:n.ok},
    {k:'p3a'+y, l:`Säule 3a ${y} voll`, ok:p3.ok},
    {k:'tax', l:'Steuern laufend zurückgelegt', ok:t.ok},
  ]; }
function msCheck(){ const ms = (PL().ms ??= {}), rw = +PL().reward || 50, on = PL().rewardOn !== false, fresh = [];
  if(!PL().msInit){ for(const m of milestones()) if(m.ok) ms[m.k] = todayIso(); PL().msInit = 1; save(); return fresh; }   // Ausgangslage: schon Erreichtes nicht belohnen
  for(const m of milestones()){ if(m.k==='kk0' && kkTot() > 300) delete ms.kk0;
    if(m.ok && !ms[m.k]){ ms[m.k] = todayIso(); fresh.push(m);
      if(on && goennCat() && D.settings.goenn){ const nx = ymAdd(TODAY,1); D.plan[GOENN] ??= {}; for(const mm of C.months.filter(x=>x>=nx)) D.plan[GOENN][mm] = r2((D.plan[GOENN][mm]||0) + rw); D.settings.goenn.amt = r2((D.settings.goenn.amt||0) + rw); } } }
  if(fresh.length){ save(); setTimeout(()=>toastMsg(`Geschafft: ${fresh.map(m=>m.l).join(', ')}${on && goennCat() ? ` – Gönn-Topf +CHF ${rw}/Monat` : ''}`), 300); }
  return fresh; }
function rewardCard(){ const M = milestones(), ms = PL().ms || {}, rw = +PL().reward || 50, on = PL().rewardOn !== false;
  const accs = D.accounts.filter(a=>!a.archived && D.bal?.[a.id] && accCur(a)==='CHF'), end = todayIso();
  const months = Array.from({length:13},(_,i)=>{ const d = mEnd(ymAdd(end.slice(0,7), i-12)); return d > end ? end : d; });
  const nw = months.map(d=>r2(accs.reduce((s,a)=>s+(balAt(a.id,d)??0),0))), ch = nw.at(-1) - nw[0];
  return stepCard(6, 'Belohnung & Fortschritt', `<div class="msl">${M.map(m=>`<div class="ms ${m.ok?'ok':''}"><span aria-hidden="true">${m.ok?'★':'☆'}</span>${esc(m.l)}${ms[m.k]?` <em>${dShort(ms[m.k])}</em>`:''}</div>`).join('')}</div>
    <label class="chk" style="margin:8px 0"><input type="checkbox" data-act="rwon" ${on?'checked':''}> Pro Meilenstein Gönn-Topf um CHF <input class="rwin" data-act="rwamt" inputmode="decimal" value="${rw}" aria-label="Belohnung in CHF"> pro Monat erhöhen</label>
    ${!goennCat()?'<p class="small muted" style="margin:0 0 8px">Richte zuerst unter «Gönnen» deinen Gönn-Topf ein.</p>':''}
    ${accs.length?`<h4 style="margin:10px 0 2px">Nettovermögen <span class="small ${ch>=0?'in':'neg'}">${ch>=0?'+':'−'}CHF ${chf0(Math.abs(ch))} in 12 Monaten</span></h4>
    ${chart({h:180, labels:months.map(d=>MN[+d.slice(5,7)-1].slice(0,3)), series:[{kind:'area', name:'Nettovermögen', color:C_BAL, values:nw}], label:'Nettovermögen'})}
    <p class="small muted" style="margin:4px 0 0">Alle CHF-Konten inkl. Sparkonto und 3a, minus Kreditkarte.</p>`:''}`, M.every(m=>m.ok)); }

/* ---------- Seite «Mein Plan» ---------- */
function stepCard(n, title, body, ok){ return `<details class="card mt plstep ${ok?'ok':''}" ${S._plOpen?.[n]===false?'':'open'} data-n="${n}"><summary><span class="pln">${ok?'✓':n}</span><h3 style="margin:0" class="sp">${title}</h3></summary><div class="plb">${body}</div></details>`; }
function vPlan(){
  try{ msCheck(); }catch(e){}
  const steps = [kkTot()<=1, ltItems().length>0 && (D.plans||[]).some(p=>/^Lohntag:/.test(p.name)), ntgInfo().ok, taxInfo().ok, fristen().every(f=>f.done || !f.soon), milestones().every(m=>m.ok)];
  const n = steps.filter(Boolean).length;
  return `<p class="sub">Dein Weg zu schneller Stabilität – ohne auf Spass zu verzichten. Reihenfolge nach Wirkung.</p>
    <div class="card plhead"><div class="row"><b class="sp">${n} von 6 Schritten erledigt</b><span class="small muted">nächster: ${['Kreditkarte','Lohntag-Plan','Notgroschen','Steuern','Fristen','Belohnung'][steps.indexOf(false)] || '–'}</span></div><div class="bar"><i style="width:${n/6*100}%;background:var(--ok)"></i></div></div>
    ${kkCard()}${stepCard(2, 'Lohntag-Plan', ltCard(false) || '<p class="small muted" style="margin:0">Noch kein Lohn erkannt.</p>', steps[1])}${ntgCard()}${taxCard()}${fristCard()}${rewardCard()}
    <p class="small muted">Alles wird nur auf dem Gerät berechnet. Die App bucht nichts selbst und ändert das Budget nur, wenn du es antippst. Keine Finanzberatung.</p>`;
}
CUSTOM_V.plan = vPlan;
render = (prev => function(){ prev.apply(this, arguments);
  try{ if(!D || S.locked) return; const main = $('#main'); if(!main) return;
    if(S.view==='plan'){ drawCharts(); const h1 = $('header h1'); if(h1) h1.textContent = 'Mein Plan'; }
    if(S.view==='start' && !main.querySelector('.ltcard,.plmini')){ let h = ltCard(true);
      if(!h){ const kt = kkTot(), F = fristen().filter(f=>!f.done && f.soon && f.days>=0 && f.days<=30);
        if(kt>0 || F.length) h = `<div class="card mt plmini"><div class="row"><h3 class="sp" style="margin:0">Mein Plan</h3><button class="btn sm ghost" data-go="plan">Öffnen</button></div>
          ${kt>0?`<p class="small" style="margin:6px 0 0">Kreditkarte: CHF ${chf0(kt)} offen – kostet ca. CHF ${chf0(kt*kkZins()/1200)} Zins pro Monat.</p>`:''}
          ${F.map(f=>`<p class="small ${f.days<=7?'neg':''}" style="margin:4px 0 0">${esc(f.t)} – noch ${f.days} Tage</p>`).join('')}</div>`; }
      if(h){ const g = main.querySelector('.agrid.home'); g ? g.insertAdjacentHTML('beforebegin', h) : main.insertAdjacentHTML('afterbegin', h); } }
  }catch(e){ console.error(e); } })(render);

/* ---------- Gönnen: Erlebnisse mit Datum und Countdown ---------- */
vGoennen = (prev => function(){ let h = prev(); try{
  const st = goennStand(), av = st ? Math.max(0, st.avail) : 0, per = st?.amt || 0;
  const ex = (D.wishes||[]).filter(w=>!w.done && wtype(w)==='erlebnis').sort((a,b)=>(a.when||'9999').localeCompare(b.when||'9999'));
  if(ex.length) h += `<div class="card mt"><h3 style="margin:0 0 6px">Erlebnisse planen</h3><p class="small muted" style="margin:0 0 6px">Mit Datum weisst du, wie viel du bis dahin zur Seite legen musst – und freust dich länger darauf.</p>
    ${ex.map(w=>{ const d = w.when ? dDiff(todayIso(), w.when) : null, mo = d!=null ? Math.max(1, Math.ceil(d/30)) : null, need = Math.max(0, (w.price||0) - av), pm = mo ? Math.ceil(need/mo/10)*10 : 0;
      return `<div class="gw"><span class="gwi" aria-hidden="true">🎟</span><div class="sp"><b>${esc(w.name)}</b><div class="small muted">${w.when?`${dLong(w.when)} · ${d>0?'in '+d+' Tagen':d===0?'heute':'vorbei'}${need>0&&d>0?` · CHF ${chf0(pm)} pro Monat zurücklegen${per&&pm<=per?' (passt in den Gönn-Topf)':''}`:' · liegt drin'}`:'noch ohne Datum'}</div></div>
        <button class="btn sm ghost" data-act="exwhen" data-id="${w.id}">${w.when?'Datum ändern':'Datum planen'}</button></div>`; }).join('')}</div>`;
}catch(e){ console.error(e); } return h; })(vGoennen);
CUSTOM_V.goennen = vGoennen;

/* ---------- Bedienung ---------- */
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act="ltplans"],[data-act="kkset"],[data-act="taxset"],[data-act="franchise"],[data-act="abzuege"],[data-act="abzy"],[data-act="abzdl"],[data-act="exwhen"]'); if(!a || !D) return; e.stopPropagation(); e.preventDefault();
  const act = a.dataset.act;
  if(act==='ltplans') ltPlansDialog();
  else if(act==='kkset') kkDialog();
  else if(act==='franchise') franchiseDialog();
  else if(act==='abzuege') abzDialog();
  else if(act==='abzy') abzDialog(+a.dataset.y);
  else if(act==='abzdl'){ abzFile(+a.dataset.y); toastMsg('Datei gespeichert – zum Drucken oder als PDF öffnen.'); }
  else if(act==='taxset'){ const t = taxInfo(); dialog(`<h3>Steuern pro Jahr</h3><p class="small muted" style="margin-top:0">Kanton, Gemeinde und Bund zusammen. ${t.est?`Aktuell geschätzt: CHF ${chf0(t.est)}.`:''} Leer lassen = aus deinen Zahlungen schätzen.</p>
    <label class="f">Betrag (CHF)<input id="txe" inputmode="decimal" value="${PL().taxEst||''}"></label><div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Speichern</button></div>`,
    k=>{ if(k!=='ok') return; const v = parseNum($('#txe').value); if(v>0) PL().taxEst = r2(v); else delete PL().taxEst; }); }
  else if(act==='exwhen'){ const w = D.wishes.find(x=>x.id===a.dataset.id); if(!w) return;
    dialog(`<h3>${esc(w.name)}</h3><label class="f">Wann?<input type="date" id="exd" value="${w.when||''}" min="${todayIso()}"></label><div class="acts">${w.when?'<button class="btn" data-dlg="del">Ohne Datum</button><span class="sp"></span>':''}<button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Speichern</button></div>`,
    k=>{ if(k==='del'){ delete w.when; return; } if(k!=='ok') return; const v = $('#exd').value; if(v) w.when = v; }); }
}, true);
document.addEventListener('change', e=>{
  const a = e.target.closest?.('[data-act="ltdone"],[data-act="frdone"],[data-act="ntgsel"],[data-act="rwon"],[data-act="rwamt"]'); if(!a || !D) return; const act = a.dataset.act, P = PL();
  if(act==='ltdone'){ ((P.ltDone ??= {})[a.dataset.d] ??= {})[a.dataset.k] = a.checked ? 1 : 0; const keys = Object.keys(P.ltDone).sort(); while(keys.length > 12) delete P.ltDone[keys.shift()]; }
  else if(act==='frdone'){ ((P.fristDone ??= {})[a.dataset.y] ??= {})[a.dataset.k] = a.checked ? 1 : 0; }
  else if(act==='ntgsel'){ P.ntgAcc = a.value; }
  else if(act==='rwon'){ P.rewardOn = a.checked; }
  else if(act==='rwamt'){ const v = parseNum(a.value); if(v>=0 && v<=1000) P.reward = r2(v); }
  save(); const y = scrollY; render(); scrollTo(0,y);
}, true);
document.addEventListener('toggle', e=>{ const d = e.target; if(d?.classList?.contains('plstep')){ (S._plOpen ??= {})[d.dataset.n] = d.open; } }, true);

/* ---------- Mitteilungen: Lohntag und Fristen ---------- */
notifyItems = (prev => function(){ const out = prev.apply(this, arguments); try{
  const det = !!D.settings.notifyDetail, now = Date.now(), at = d => new Date(d+'T08:00:00').getTime(); let id = 1600;
  const s = lmStart(), t = todayIso(); let pd = t.slice(0,8)+p2(s); if(pd <= t) pd = ymAdd(TODAY,1)+'-'+p2(s);
  if(at(pd) > now+60000 && ltItems().length) out.push({id:id++, at:at(pd), title:det?'Lohntag':'Finanzen', text:det?'Lohn sollte heute kommen – Verteilung in «Mein Plan» ansehen.':'Heute ist Lohntag – schau in deinen Plan.'});
  for(const f of fristen().filter(f=>!f.done)) for(const b of [14, 2]){ const d = dAdd(f.due, -b); if(at(d) > now+60000 && id < 1630) out.push({id:id++, at:at(d), title:det?'Frist in '+b+' Tagen':'Finanzen', text:det?f.t:'Eine Frist läuft bald ab – schau in deinen Plan.'}); }
}catch(e){} return out.sort((a,b)=>a.at-b.at).slice(0, 60); })(notifyItems);

/* ---------- Tipps: Frist & Plan ---------- */
finTips = (prev => function(){ const out = prev.apply(this, arguments); try{
  for(const f of fristen().filter(f=>!f.done && f.soon && f.days>=0 && f.days<=21)) out.unshift({key:'fr:'+f.k+f.y, lvl:f.days<=7?'bad':'warn', t:`${f.t} – noch ${f.days} Tage`, d:f.d, b:[['Mein Plan','go','plan']], id:f.y+''});
}catch(e){} return out; })(finTips);
