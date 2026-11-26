/* =====================================================================
   VERSION 1.58.0 – KONTOARTEN
   Sechs Arten statt fünf Gruppen:
     Gewöhnliche Konten · Sparkonten · Haushaltkonten (inkl. Haushalt-Sparkonto)
     Kreditkarten & Kredite (mit Jahreszins, Limite, Abrechnung, Fälligkeit, Gebühren)
     Investkonten · Langfristige Konten (Säule 3a, Freizügigkeit, Pensionskasse)
   Die Art wird aus dem Namen erkannt und lässt sich pro Konto ändern.
   ===================================================================== */
ACC_GRP = [
  ['alltag',   'Gewöhnliche Konten'],
  ['sparen',   'Sparkonten'],
  ['haushalt', 'Haushaltkonten'],
  ['karte',    'Kreditkarten & Kredite'],
  ['invest',   'Investkonten'],
  ['vorsorge', 'Langfristige Konten'],
];
var ACC_GRP_INFO = {
  alltag: 'Privatkonto, Lohnkonto, Bargeld – auch in Fremdwährung',
  sparen: 'Sparkonto, Reserve, Notgroschen, Rückstellungen',
  haushalt: 'Haushaltkonto und Haushalt-Sparkonto',
  karte: 'Kreditkarten, Kredite, Leasing, Ratenkäufe',
  invest: 'Depot, ETF, Aktien, Fonds, Krypto',
  vorsorge: 'Säule 3a, Freizügigkeit, Pensionskasse – gebunden bis zur Pension',
};
accGrp = function(a){
  if(a.grp && ACC_GRP.some(g=>g[0]===a.grp)) return a.grp;
  const n = String(a.name||'').toLowerCase(), t = a.wtype || wTypeOf('', a.name);
  if(/3a|säule|saule|saeule|vorsorge|pension|freizügig|freizuegig|viac|frankly|finpension/.test(n) || t==='vorsorge') return 'vorsorge';
  if(/invest|depot|anlage|aktie|etf|fonds|krypto|crypto|trading|wertschrift|börse|boerse/.test(n) || t==='anlage') return 'invest';
  if(/haushalt/.test(n)) return 'haushalt';
  if(/kreditkarte|karte|visa|master|amex|kredit|darlehen|leasing|powerpay|bob ?finance|cembra|raten/.test(n) || t==='karte' || t==='kredit' || a.kind==='debt') return 'karte';
  if(/spar|rückstell|ruckstell|reserve|notgroschen/.test(n) || t==='spar') return 'sparen';
  return 'alltag';
};
var isLoanAcc = a => /kredit(?!karte)|darlehen|leasing|powerpay|bob ?finance|cembra|raten/i.test(a.name||'') || a.wtype==='kredit';

// Bisherige eigene Wahl übernehmen: «Fremdwährung» gibt es nicht mehr, Haushalt und Invest sind eigene Arten
function accGrpMigrate(){
  if(!D || D.flags?.grp158) return;
  for(const a of D.accounts){
    if(a.grp==='fx') delete a.grp;
    else if(a.grp==='sparen' && /haushalt/i.test(a.name||'')) a.grp = 'haushalt';
    else if(a.grp==='vorsorge' && /invest|depot|anlage|aktie|etf|fonds|krypto|crypto|trading|wertschrift/i.test(a.name||'') && !/3a|säule|vorsorge|pension/i.test(a.name||'')) a.grp = 'invest';
  }
  (D.flags ??= {}).grp158 = 1; S.noDirty = true; save(); S.noDirty = false;
}
render = (prev => function(){ try{ accGrpMigrate(); }catch(e){} return prev.apply(this, arguments); })(render);

// Analyse › Investitionen: Invest- und langfristige Konten
vInvest = (prev => function(){
  const g = accGrp; accGrp = a => { const r = g(a); return r==='invest' ? 'vorsorge' : r; };
  try{ return prev.apply(this, arguments); } finally { accGrp = g; }
})(vInvest);

// Im Aussehen-Dialog heisst die Auswahl «Kontoart», mit Erklärung
lookDialog = (prev => function(id){
  prev.apply(this, arguments);
  const s = $('#lkg'); if(!s) return; const l = s.closest('label');
  if(l && l.firstChild && l.firstChild.nodeType === 3) l.firstChild.textContent = 'Kontoart';
  s.innerHTML = ACC_GRP.map(([g,t])=>`<option value="${g}" ${s.value===g?'selected':''}>${t} – ${ACC_GRP_INFO[g]}</option>`).join('');
})(lookDialog);

/* ---------- Kreditkarten & Kredite: Angaben ---------- */
var dayIn = (ym, d) => ym + '-' + p2(Math.min(d, new Date(+ym.slice(0,4), +ym.slice(5,7), 0).getDate()));
var nextDayOf = (d, fromYm) => { if(!(d>=1 && d<=31)) return null; const t = todayIso();
  let x = dayIn(fromYm || TODAY, d); if(!fromYm && x < t) x = dayIn(ymAdd(TODAY, 1), d); return x; };
var cardFullOf = a => { try{ return !!coachCfg().cardFull[a.id]; }catch(e){ return false; } };

function kkDetDialog(id){
  const a = D.accounts.find(x=>x.id===id); if(!a) return;
  const loan = isLoanAcc(a), v = x => x==null || x==='' ? '' : String(x);
  dialog(`<h3>${esc(a.name)}</h3>
    <p class="small muted" style="margin-top:-6px">${loan ? 'Kredit / Leasing' : 'Kreditkarte'} – die Angaben stehen auf der Monatsrechnung bzw. im Vertrag.</p>
    <label class="f">Jahreszins %<input id="kd_rate" inputmode="decimal" value="${v(a.rate)}" placeholder="z. B. 12"></label>
    ${loan ? `
    <label class="f">Rate pro Monat CHF<input id="kd_inst" inputmode="decimal" value="${a.inst?chf(a.inst):''}" placeholder="z. B. 250"></label>
    <label class="f">Läuft bis (Monat)<input id="kd_end" type="month" value="${v(a.endYm)}"></label>
    <label class="f">Rate fällig am (Tag im Monat)<input id="kd_due" inputmode="numeric" value="${v(a.dueDay)}" placeholder="z. B. 30"></label>` : `
    <label class="f">Kreditlimite CHF<input id="kd_lim" inputmode="decimal" value="${a.limit?chf(a.limit):''}" placeholder="z. B. 5000"></label>
    <label class="f">Abrechnung am (Tag im Monat)<input id="kd_bill" inputmode="numeric" value="${v(a.billDay)}" placeholder="z. B. 20"></label>
    <label class="f">Zahlbar bis (Tag im Monat)<input id="kd_due" inputmode="numeric" value="${v(a.dueDay)}" placeholder="z. B. 10"></label>
    <label class="f">Jahresgebühr CHF<input id="kd_fee" inputmode="decimal" value="${a.fee?chf(a.fee):''}" placeholder="z. B. 100"></label>
    <label class="f">Gebühr Fremdwährung %<input id="kd_fx" inputmode="decimal" value="${v(a.fxFee)}" placeholder="z. B. 1.5"></label>
    <label class="chk"><input type="checkbox" id="kd_full" ${cardFullOf(a)?'checked':''}> Ich zahle jeden Monat den ganzen Betrag (dann fällt kein Zins an)</label>`}
    <label class="chk"><input type="checkbox" id="kd_rem" ${a.dueRemind!==false?'checked':''}> Mitteilung 3 Tage vor der Fälligkeit</label>
    <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Speichern</button></div>`,
  () => {
    const num = (id, lo, hi) => { const e = $('#'+id); if(!e) return undefined; const s = e.value.trim(); if(!s) return null; const n = parseNum(s); return isFinite(n) && n>=lo && n<=hi ? n : NaN; };
    const vals = {rate:num('kd_rate',0,40), limit:num('kd_lim',0,1e6), billDay:num('kd_bill',1,31), dueDay:num('kd_due',1,31), fee:num('kd_fee',0,10000), fxFee:num('kd_fx',0,10), inst:num('kd_inst',0,1e6)};
    const bad = Object.entries(vals).find(([k,x])=>Number.isNaN(x));
    if(bad){ toastMsg('Bitte eine gültige Zahl eingeben.'); return false; }
    for(const [k,x] of Object.entries(vals)){ if(x===undefined) continue; if(x===null) delete a[k]; else a[k] = (k==='billDay'||k==='dueDay') ? Math.round(x) : r2(x); }
    if(!a.rate) a.rate = 0;
    const end = $('#kd_end'); if(end){ if(end.value) a.endYm = end.value; else delete a.endYm; }
    a.dueRemind = !!$('#kd_rem')?.checked;
    const full = $('#kd_full'); if(full){ const cfg = coachCfg(); if(full.checked) cfg.cardFull[a.id] = true; else delete cfg.cardFull[a.id]; }
    if(typeof _kc !== 'undefined') _kc = {};
    toastMsg('Gespeichert');
  });
}

function kkCardHtml(){
  const accs = D.accounts.filter(a=>!a.archived && accGrp(a)==='karte'); if(!accs.length) return '';
  const rows = accs.map(a=>{
    const loan = isLoanAcc(a), bal = typeof accBal==='function' ? accBal(a) : (accValRaw(a)||0), owed = Math.max(0, -bal), full = cardFullOf(a);
    const zm = !full && a.rate ? owed * a.rate / 100 / 12 : 0, lim = a.limit || 0, p = lim ? Math.min(100, owed/lim*100) : 0;
    const due = nextDayOf(a.dueDay), bill = nextDayOf(a.billDay), miss = [];
    if(!a.rate && !full) miss.push('Zins'); if(!loan && !lim) miss.push('Limite'); if(!a.dueDay) miss.push(loan?'Fälligkeit':'Zahlbar bis');
    const facts = [
      a.rate ? `${a.rate} % Zins` : null,
      zm >= 0.5 ? `<b class="neg">ca. CHF ${chf0(zm)} Zins pro Monat</b>` : (full && owed ? 'wird jeden Monat ganz bezahlt' : null),
      loan && a.inst ? `Rate CHF ${chf0(a.inst)}${a.endYm?' bis '+ymLabel(a.endYm):''}` : null,
      bill ? `Abrechnung ${dShort(bill)}` : null,
      due ? `${loan?'Rate':'zahlbar'} bis ${dShort(due)}` : null,
      a.fee ? `Jahresgebühr CHF ${chf0(a.fee)}` : null,
      a.fxFee ? `${a.fxFee} % in Fremdwährung` : null,
    ].filter(Boolean);
    return `<div class="kkrow"><div class="kkh"><b>${esc(a.name)}</b><b class="num ${owed?'neg':''}">${owed?'− CHF '+chf(owed):'CHF '+signChf(bal)}</b></div>
      ${lim ? `<div class="kkbar" title="${Math.round(p)} % der Limite"><i style="width:${p}%" class="${p>80?'hi':p>50?'mid':''}"></i></div><div class="small muted">${Math.round(p)} % von CHF ${chf0(lim)} Limite genutzt · frei CHF ${chf0(Math.max(0,lim-owed))}</div>` : ''}
      ${facts.length ? `<div class="small">${facts.join(' · ')}</div>` : ''}
      ${miss.length ? `<div class="small muted">Fehlt noch: ${miss.join(', ')}</div>` : ''}
      <button class="btn sm mt" data-act="kkdet" data-id="${a.id}">Angaben ${miss.length?'ergänzen':'ändern'}</button></div>`;
  }).join('');
  const zt = accs.reduce((s,a)=>{ const owed = Math.max(0, -(typeof accBal==='function'?accBal(a):(accValRaw(a)||0))); return s + (!cardFullOf(a) && a.rate ? owed*a.rate/1200 : 0); }, 0);
  return `<div class="card" id="kkcard"><h3>Kreditkarten & Kredite</h3>
    ${zt >= 1 ? `<p class="small" style="margin-top:-4px">Zusammen kosten sie dich etwa <b class="neg">CHF ${chf0(zt)} Zins pro Monat</b> (CHF ${chf0(zt*12)} im Jahr).</p>` : ''}
    ${rows}</div>`;
}

// Seite «Konten»: Schalter nach Kontoart gruppiert, darunter die Kreditkarten-Angaben
cardAccCount = function(){
  const accs = activeAccs().filter(a=>!a.archived), by = {};
  for(const a of accs) (by[accGrp(a)] ??= []).push(a);
  const row = a => { const on = !a.nostats && !a.archived, v = accValRaw(a);
    return `<label class="li acl"><span class="sp"><b>${esc(a.name)}</b><br><span class="small muted">${accCur(a)} ${signChf(v)}</span></span>
      <input type="checkbox" class="sw" data-acc="${a.id}" ${on?'checked':''}></label>`; };
  return `<div class="card" id="acccount"><h3>Konten nach Art</h3>
    <p class="small muted" style="margin-top:-6px">Schalter = zählt im Saldo. Die Art änderst du beim Konto unter «Name, Farbe & Symbol ändern».</p>
    ${ACC_GRP.filter(([g])=>by[g]?.length).map(([g,l])=>`<div class="agh">${l}<small>${esc(ACC_GRP_INFO[g])}</small></div>${by[g].map(row).join('')}`).join('')}
    <p class="small muted mt">Saldo: <b>CHF ${signChf(accs.filter(inStats).reduce((s,a)=>s+(accVal(a)||0),0))}</b></p></div>`;
};
render = (prev => function(){
  const r = prev.apply(this, arguments);
  if(D && !S.locked && S.view==='konten' && !$('#kkcard')){ const h = kkCardHtml(); const c = $('#acccount'); if(h) c ? c.insertAdjacentHTML('afterend', h) : $('#main')?.insertAdjacentHTML('afterbegin', h); }
  return r;
})(render);

// Beim Konto selbst: direkter Weg zu den Angaben
balDialog = (prev => function(id){
  prev.apply(this, arguments);
  const a = D.accounts.find(x=>x.id===id);
  if(a && accGrp(a)==='karte') $('#dlgbody h3')?.insertAdjacentHTML('afterend', `<p class="small" style="margin:-4px 0 8px"><a class="link" data-act="kkdet" data-id="${id}">${isLoanAcc(a)?'Kredit':'Kreditkarte'}: Zins, ${isLoanAcc(a)?'Rate':'Limite'} und Fälligkeit</a></p>`);
})(balDialog);

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act="kkdet"]'); if(!b || !D) return; e.stopPropagation();
  if($('#dlg').open) $('#dlg').close(); kkDetDialog(b.dataset.id);
}, true);

// Mitteilung 3 Tage vor der Fälligkeit (Kreditkarte oder Kreditrate)
notifyItems = (prev => function(){ const out = prev.apply(this, arguments); try{
  const det = !!D.settings.notifyDetail, now = Date.now(); let id = 1700;
  for(const a of D.accounts.filter(a=>!a.archived && accGrp(a)==='karte' && a.dueDay && a.dueRemind!==false)){
    const owed = Math.max(0, -(typeof accBal==='function'?accBal(a):(accValRaw(a)||0))); if(!owed && !isLoanAcc(a)) continue;
    const first = nextDayOf(a.dueDay);
    for(let k=0; k<2 && id<1720; k++){ const due = k ? nextDayOf(a.dueDay, ymAdd(first.slice(0,7), 1)) : first, d = dAdd(due, -3), at = new Date(d+'T08:00:00').getTime();
      if(at > now+60000) out.push({id:id++, at, title:det?'Bald fällig':'Finanzen', text:det?`${a.name}: ${isLoanAcc(a)?'Rate':'Rechnung'} bis ${dShort(due)} bezahlen${!isLoanAcc(a)?' – am besten ganz, sonst kostet es Zins':''}.`:'Eine Zahlung wird bald fällig.'}); }
  }
}catch(e){} return out.sort((a,b)=>a.at-b.at).slice(0, 60); })(notifyItems);
