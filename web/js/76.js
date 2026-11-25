/* =====================================================================
   78. ANALYSE WIE WALLET – ALLE FUNKTIONEN
   • Zeitraum: Benutzerdefiniert · Wochen · Monate (ab Lohntag) · Jahre, mit Monats-/Jahresauswahl
   • Filter wie Wallet: Mein Filter (speichern), Suchen, Konten, Kategorien, Etiketten, Währungen,
     Eintragsarten, Betragsbereich, Überweisungen ein-/ausschliessen, Buchungsstatus, Zahlungsarten
   • Bericht: Spalten wählbar, Lupe = Buchungen dazu, alle Unterkategorien auf einmal
   • Cashflow-Vergleich: Cashflow · Ausgaben · Einnahmen
   • Erweiterte Diagramme: Typ, Diagrammart, Gruppieren nach, Granularität, «Meine Diagramme»
   • Investitionen: Vorsorge- und Anlagekonten mit Wert, Einzahlungen und Entwicklung
   • Wallet-Abgleich übernimmt neu Zahlungsart, Buchungsstatus und Etiketten der Buchungen
   ===================================================================== */

/* ---------- Wallet: Zahlungsart, Status, Etiketten mitnehmen ---------- */
var WB_PT = {cash:'Bargeld', debit_card:'Debitkarte', credit_card:'Kreditkarte', transfer:'Banküberweisung', voucher:'Gutschein', mobile_payment:'Mobile Zahlung', web_payment:'Online-Zahlung'};
wbList = (prev => function(j, k){ const r = prev(j, k);
  try{ if(k==='records' && D && Array.isArray(r)){ const M = (D.wmeta ??= {});
    for(const x of r){ if(!x?.id) continue; const lb = (x.labels||[]).map(l=>typeof l==='string'?l:l?.name).filter(Boolean).slice(0,10);
      const o = {}; if(x.paymentType) o.pt = String(x.paymentType).slice(0,20); if(x.recordState) o.st = String(x.recordState).slice(0,12); if(lb.length) o.lb = lb;
      if(Object.keys(o).length) M[String(x.id).slice(0,80)] = o; } } }catch(e){}
  return r; })(wbList);
var txMeta = t => (t.id||'').startsWith('wb_') ? (D.wmeta?.[t.id.slice(3)] || {}) : {};
function txPay(t){
  const m = txMeta(t); if(m.pt) return WB_PT[m.pt] || m.pt;
  const a = brAcc(bkAcc(t)), g = a ? accGrp(a) : 'alltag', n = (a?.name||'').toLowerCase();
  if(/bar|cash/.test(n)) return 'Bargeld'; if(g==='karte' || /kredit|visa|master/.test(n)) return 'Kreditkarte';
  if(isTr(t)) return 'Banküberweisung'; return 'Debitkarte';
}
var txTags = t => [...new Set([...(t.tags||[]), ...(txMeta(t).lb||[])])];
var txPending = t => !!(t.vorm || t.pending || txMeta(t).st==='uncleared');
var txCur = t => { const a = brAcc(bkAcc(t)); return a ? accCur(a) : 'CHF'; };

/* ---------- Filter ---------- */
var BF_DEF = () => ({q:'', acc:[], cat:[], tag:[], cur:[], typ:[], min:'', max:'', tr:'ex', st:'', pay:[]});
S.bf = (() => { try{ return {...BF_DEF(), ...JSON.parse(localStorage.getItem(KEY+'.bf')||'{}')}; }catch(e){ return BF_DEF(); } })();
var bfSave = () => { try{ localStorage.setItem(KEY+'.bf', JSON.stringify(S.bf)); }catch(e){} };
var bfCount = () => { const f = S.bf; return ['acc','cat','tag','cur','typ','pay'].filter(k=>f[k]?.length).length + (f.q?1:0) + (f.min!==''||f.max!==''?1:0) + (f.tr==='in'?1:0) + (f.st?1:0); };
brTop = (prev => t => isTr(t) ? 'Überweisungen' : prev(t))(brTop);
brIsInc = (prev => t => isTr(t) ? sv(t) > 0 : prev(t))(brIsInc);
var bfAccOk = t => { const f = S.bf, id = bkAcc(t); return f.acc.length ? f.acc.includes(id) : brStat(t); };
function bfOk(t){
  const f = S.bf;
  if(isTr(t) && f.tr!=='in' && !f.typ.includes('t')) return false;
  if(!bfAccOk(t)) return false;
  if(f.typ.length){ const k = isTr(t) ? 't' : brIsInc(t) ? 'i' : 'o'; if(!f.typ.includes(k)) return false; }
  if(f.cat.length && !f.cat.includes(brTop(t))) return false;
  if(f.tag.length && !txTags(t).some(g=>f.tag.includes(g))) return false;
  if(f.cur.length && !f.cur.includes(txCur(t))) return false;
  if(f.pay.length && !f.pay.includes(txPay(t))) return false;
  const v = Math.abs(sv(t)); if(f.min!=='' && v < +f.min) return false; if(f.max!=='' && v > +f.max) return false;
  if(f.st==='c' && txPending(t)) return false; if(f.st==='p' && !txPending(t)) return false;
  if(f.q){ const q = f.q.toLowerCase(); if(!(brSub(t)+' '+brTop(t)+' '+(t.n||'')+' '+(t.wc||'')+' '+txTags(t).join(' ')).toLowerCase().includes(q)) return false; }
  return true;
}
brTx = function(from, to){ const today = todayIso(), f = S.bf;
  return D.tx.filter(t=>t.d>=from && t.d<=to && t.d<=today && !t.del && (f.st==='p' || !(t.vorm||t.pending)) && bfOk(t)); };

/* ---------- Zeitraum: Benutzerdefiniert · Wochen · Monate · Jahre ---------- */
S.bp = (() => { try{ return JSON.parse(localStorage.getItem(KEY+'.bp')||'null') || {m:'m', off:0}; }catch(e){ return {m:'m', off:0}; } })();
var bpSave = () => { try{ localStorage.setItem(KEY+'.bp', JSON.stringify(S.bp)); }catch(e){} };
var _lmPeriod = lmPeriod;
var monOf = d => { const w = (new Date(d+'T12:00').getDay()+6)%7; return dAdd(d, -w); };
var kw = d => { const x = new Date(d+'T12:00'); x.setDate(x.getDate()+3-((x.getDay()+6)%7)); const y1 = new Date(x.getFullYear(),0,4); return 1+Math.round(((x-y1)/864e5-3+((y1.getDay()+6)%7))/7); };
function bpPeriod(k){
  const p = S.bp, o = (p.off||0) + (k||0), t = todayIso();
  if(p.m==='w'){ const from = dAdd(monOf(t), 7*o), to = dAdd(from,6); return {from, to, l:'KW '+kw(from)+' · '+dShort(from)+' – '+dLong(to), s:'KW '+kw(from)}; }
  if(p.m==='y'){ const y = +t.slice(0,4)+o; return {from:y+'-01-01', to:y+'-12-31', l:'Jahr '+y, s:String(y)}; }
  if(p.m==='c' && p.from && p.to){ const n = dDiff(p.from,p.to)+1, from = dAdd(p.from, n*o), to = dAdd(p.to, n*o); return {from, to, l:dLong(from)+' – '+dLong(to), s:dShort(from)+'–'+dShort(to)}; }
  const P = _lmPeriod(o); return P;
}
lmPeriod = k => bpPeriod((k||0) - (S.lmOff||0));       // Bericht-Teile rufen lmPeriod(S.lmOff + i) auf
S.lmOff = 0;
var BP_M = [['c','Benutzerdefiniert'],['w','Wochen'],['m','Monate'],['y','Jahre']];
brHead = function(){
  const P = bpPeriod(0), s = lmStart(), n = bfCount();
  return `<div class="brhead"><button class="ibtn" data-act="bpnav" data-d="-1" aria-label="Früherer Zeitraum">‹</button>
    <button class="brpick" data-act="bppick" aria-label="Zeitraum wählen"><b>${P.l}</b><span>${BP_M.find(x=>x[0]===S.bp.m)?.[1]||'Monate'}${S.bp.m==='m' && s!==1?` · ab dem ${s}.`:''} ▾</span></button>
    <button class="ibtn" data-act="bpnav" data-d="1" aria-label="Späterer Zeitraum" ${S.bp.m!=='c' && (S.bp.off||0)>=0?'disabled':''}>›</button></div>
    <div class="brtools"><button class="btn sm ${n?'pri':''} brfbtn" data-act="bftoggle">Filter${n?` · ${n} aktiv`:''}</button>${n?'<button class="btn sm ghost" data-act="bfreset">Filter zurücksetzen</button>':''}</div>`;
};
function bpDialog(){
  const m = S._bpMode || S.bp.m, y0 = S._bpy || +todayIso().slice(0,4), s = lmStart(), cur = bpPeriod(0);
  const years = [...new Set(D.tx.map(t=>+t.d.slice(0,4)).filter(Boolean))].sort(); const ty = +todayIso().slice(0,4);
  let body = '';
  if(m==='m'){ body = `<div class="bpy"><button class="ibtn" data-act="bpy" data-d="-1">‹</button><b>${y0}</b><button class="ibtn" data-act="bpy" data-d="1" ${y0>=ty?'disabled':''}>›</button></div>
      <div class="bpgrid">${MN.map((n,i)=>{ const ym = y0+'-'+p2(i+1), off = bpOffForYm(ym), fut = off>0; return `<button class="${cur.from.slice(0,7)===ym && (S.bp.m==='m')?'on':''}" data-act="bpset" data-mode="m" data-off="${off}" ${fut?'disabled':''}>${n.slice(0,3)}${n.length>3?'.':''}</button>`; }).join('')}</div>
      ${s!==1?`<p class="small muted">Ein Monat läuft vom ${s}. bis zum ${s-1}. des Folgemonats.</p>`:''}`; }
  else if(m==='w'){ body = `<div class="bplist">${Array.from({length:16},(_,i)=>{ const from = dAdd(monOf(todayIso()), -7*i); return `<button class="${S.bp.m==='w' && (S.bp.off||0)===-i?'on':''}" data-act="bpset" data-mode="w" data-off="${-i}">KW ${kw(from)} · ${dShort(from)} – ${dShort(dAdd(from,6))}</button>`; }).join('')}</div>`; }
  else if(m==='y'){ body = `<div class="bpgrid">${(years.length?years:[ty]).filter(y=>y<=ty).reverse().map(y=>`<button class="${S.bp.m==='y' && ty+(S.bp.off||0)===y?'on':''}" data-act="bpset" data-mode="y" data-off="${y-ty}">${y}</button>`).join('')}</div>`; }
  else { body = `<label class="f">Von<input type="date" id="bpf" value="${S.bp.from||cur.from}"></label><label class="f">Bis<input type="date" id="bpt" value="${S.bp.to||cur.to}"></label>
      <button class="btn pri" data-act="bpcustom">Zeitraum anzeigen</button>`; }
  $('#dlgbody').innerHTML = `<h3>Zeitraum</h3><div class="sgm bpm">${BP_M.map(([k,l])=>`<button class="${k===m?'on':''}" data-act="bpmode" data-v="${k}">${l}</button>`).join('')}</div>${body}
    <div class="acts">${m==='m'?'<button class="btn ghost" data-act="lmset2">Lohntag ändern …</button><span class="sp"></span>':''}<button class="btn" data-dlg="cancel">Schliessen</button></div>`;
}
function bpOffForYm(ym){ const s = lmStart(), t = todayIso(); let cur = t.slice(0,7); if(+t.slice(8,10) < s) cur = ymAdd(cur,-1);
  return (+ym.slice(0,4) - +cur.slice(0,4))*12 + (+ym.slice(5) - +cur.slice(5)); }
function openBp(){ S._bpy = +bpPeriod(0).from.slice(0,4); S._bpMode = S.bp.m; dialog('<div></div>', ()=>{}); bpDialog(); }

/* ---------- Filter-Seitenleiste ---------- */
function bfMulti(key, title, opts, ph){
  const f = S.bf[key]||[], sel = opts.filter(o=>f.includes(o[0]));
  return `<details class="bfm" ${S._bfOpen===key?'open':''} data-k="${key}"><summary><span class="bfl">${title}</span><span class="bfv">${sel.length? sel.map(o=>esc(o[1])).slice(0,2).join(', ')+(sel.length>2?` +${sel.length-2}`:'') : ph}</span></summary>
    <div class="bfopts">${opts.length?opts.map(([v,l])=>`<label><input type="checkbox" data-act="bfchk" data-k="${key}" value="${esc(v)}" ${f.includes(v)?'checked':''}> ${esc(l)}</label>`).join(''):'<span class="small muted">keine</span>'}</div></details>`;
}
function bfPanel(){
  const f = S.bf, saved = D.settings.bfSaved || [];
  const accs = D.accounts.filter(a=>!a.archived).map(a=>[a.id, a.name+(inStats(a)?'':' (ausgeschlossen)')]);
  const tops = [...new Set(D.tx.filter(t=>t.d>=dAdd(todayIso(),-730)).map(brTop))].sort().map(x=>[x,x]);
  const tags = [...new Set(D.tx.flatMap(txTags))].sort().map(x=>[x,'#'+x]);
  const curs = [...new Set(D.accounts.filter(a=>!a.archived).map(accCur))].sort().map(x=>[x,x]);
  const pays = Object.values(WB_PT).map(x=>[x,x]);
  return `<aside class="bfpanel card ${S.bfOpen?'open':''}" aria-label="Filter">
    <div class="row"><h3 class="sp" style="margin:0">Filter</h3><button class="ibtn mini bfclose" data-act="bftoggle" aria-label="Filter schliessen">✕</button></div>
    <label class="f">Mein Filter<div class="row" style="gap:6px"><select data-act="bfload" class="sp"><option value="">Filter auswählen</option>${saved.map((x,i)=>`<option value="${i}">${esc(x.n)}</option>`).join('')}</select>
      <button class="ibtn" data-act="bfsave" title="Aktuellen Filter speichern" aria-label="Aktuellen Filter speichern">💾</button></div></label>
    <label class="f">Suchen<input type="search" data-act="bfq" value="${esc(f.q)}" placeholder="Text, Händler, Kategorie"></label>
    ${bfMulti('acc','Konten', accs, 'Konten in der Statistik')}
    ${bfMulti('cat','Kategorien', tops, 'Alle Kategorien')}
    ${bfMulti('tag','Etiketten', tags, 'Alle')}
    ${bfMulti('cur','Währungen', curs, 'Alle Währungen')}
    ${bfMulti('typ','Eintragsarten', [['o','Ausgabe'],['i','Einnahme'],['t','Überweisung']], 'Alle Eintragsarten')}
    <div class="bfrange"><span class="bfl">Betragsbereich (CHF)</span><div class="row" style="gap:6px"><input inputmode="decimal" data-act="bfmin" value="${esc(f.min)}" placeholder="0" aria-label="Betrag von"><span>–</span><input inputmode="decimal" data-act="bfmax" value="${esc(f.max)}" placeholder="beliebig" aria-label="Betrag bis"></div></div>
    <label class="f">Überweisungen<select data-act="bfsel" data-k="tr"><option value="ex" ${f.tr!=='in'?'selected':''}>Überweisungen ausschliessen</option><option value="in" ${f.tr==='in'?'selected':''}>Überweisungen einbeziehen</option></select></label>
    <label class="f">Buchungsstatus<select data-act="bfsel" data-k="st"><option value="">Alle Buchungsstatus</option><option value="c" ${f.st==='c'?'selected':''}>Abgerechnet</option><option value="p" ${f.st==='p'?'selected':''}>Vorgemerkt</option></select></label>
    ${bfMulti('pay','Zahlungsarten', pays, 'Alle Zahlungsarten')}
    <button class="btn sm" data-act="bfreset" ${bfCount()?'':'disabled'}>Filter zurücksetzen</button>
    ${saved.length?`<details class="bfsaved"><summary class="small">Gespeicherte Filter verwalten</summary>${saved.map((x,i)=>`<div class="row small"><span class="sp">${esc(x.n)}</span><button class="link" data-act="bfdel" data-i="${i}">Löschen</button></div>`).join('')}</details>`:''}
  </aside>`;
}

/* ---------- Bericht: Einstellungen, Lupe, Spalten ---------- */
S.brCfg = (() => { try{ return {cols:6, pct:true, ...JSON.parse(localStorage.getItem(KEY+'.brcfg')||'{}')}; }catch(e){ return {cols:6, pct:true}; } })();
var brCfgSave = () => { try{ localStorage.setItem(KEY+'.brcfg', JSON.stringify(S.brCfg)); }catch(e){} };
brEA = (prev => function(){
  // Spaltenzahl: über die Länge des Ps-Arrays in prev nicht steuerbar → eigene Umsetzung
  const n = Math.max(1, Math.min(12, S.brCfg.cols||6)), Ps = Array.from({length:n},(_,i)=>lmPeriod((S.lmOff||0)-i)), Ss = Ps.map(p=>brSums(p.from, p.to)), open = S.brOpen || (S.brOpen = {});
  const keys = pre => { const all = new Set(); Ss.forEach(s=>Object.keys(s.top).filter(k=>k.startsWith(pre)).forEach(k=>all.add(k)));
    return [...all].sort((a,b)=>Math.abs(Ss[0].top[b]||0)-Math.abs(Ss[0].top[a]||0) || Math.abs(Ss[1]?.top[b]||0)-Math.abs(Ss[1]?.top[a]||0)); };
  const pc = (v, pv, inc) => S.brCfg.pct && pv!==undefined ? brPct(v, pv, inc) : '';
  const cell = (v, pv, inc, bold, k, i) => `<td class="num ${k?'brc':''}" ${k?`data-act="brlist" data-k="${esc(k)}" data-i="${i}"`:''}><div class="${bold?'brb':''} ${Math.abs(v)<0.5?'muted':''}">${inc||v<0.5?'':'−'}${chf(Math.abs(v))}</div>${pc(v, pv, inc)}</td>`;
  const head = `<tr><th><button class="ibtn mini" data-act="brcfg" title="Bericht einstellen" aria-label="Bericht einstellen">⚙</button></th>${Ps.map((p,i)=>`<th class="num ${i===0?'brcur':''}">${p.s}</th>`).join('')}</tr>`;
  const row = (k, inc) => { const name = k.slice(2), isO = !!open[k] || S.brCfg.allOpen;
    let r = `<tr class="brrow"><td><span data-act="bropen" data-k="${esc(k)}" class="brname"><span class="bri">${BR_ICON[name]||(name==='Überweisungen'?'⇄':'•')}</span>${esc(name)} <span class="brchev">${isO?'▾':'▸'}</span></span><button class="ibtn mini brlens" data-act="brlist" data-k="${esc(k)}" data-i="0" title="Buchungen anzeigen" aria-label="Buchungen ${esc(name)} anzeigen">🔍</button></td>${Ss.map((s,i)=>cell(s.top[k]||0, i<n-1 ? (Ss[i+1].top[k]||0) : undefined, inc, false, k, i)).join('')}</tr>`;
    if(isO){ const subs = new Set(); Ss.forEach(s=>Object.keys(s.sub[k]||{}).forEach(x=>subs.add(x)));
      [...subs].sort((a,b)=>(Ss[0].sub[k]?.[b]||0)-(Ss[0].sub[k]?.[a]||0)).forEach(sb=>{ r += `<tr class="brsub"><td>${esc(sb)}</td>${Ss.map((s,i)=>`<td class="num brc ${Math.abs(s.sub[k]?.[sb]||0)<0.5?'muted':''}" data-act="brlist" data-k="${esc(k)}" data-sub="${esc(sb)}" data-i="${i}">${chf(Math.abs(s.sub[k]?.[sb]||0))}</td>`).join('')}</tr>`; }); }
    return r; };
  const tot = (lab, f, inc) => `<tr class="brtot"><td><b>${lab}</b></td>${Ss.map((s,i)=>cell(f(s), i<n-1 ? f(Ss[i+1]) : undefined, inc, true)).join('')}</tr>`;
  const cfRow = `<tr class="brtot brcf"><td><b>Cashflow</b></td>${Ss.map((s,i)=>{ const v = s.inc - s.out; return `<td class="num"><div class="brb ${v>=0?'in':'neg'}">${v>=0?'+':'−'}${chf(Math.abs(v))}</div>${i<n-1?pc(v, Ss[i+1].inc-Ss[i+1].out, true):''}</td>`; }).join('')}</tr>`;
  const rest = Ss.slice(1), avg = rest.length ? rest.reduce((a,s)=>a+s.out,0)/rest.length : 0, low = Ss[0].out>0 && rest.length && rest.every(s=>Ss[0].out<=s.out);
  const cf0 = Ss[0].inc-Ss[0].out;
  return `<div class="card brsum"><div class="brk"><span>Einnahmen</span><b class="num in">${chf(Ss[0].inc)}</b></div><div class="brk"><span>Ausgaben</span><b class="num neg">${Ss[0].out>=0.5?'−':''}${chf(Ss[0].out)}</b></div><div class="brk"><span>Cashflow</span><b class="num ${cf0>=0?'in':'neg'}">${cf0>=0?'+':'−'}${chf(Math.abs(cf0))}</b></div>
    ${rest.length?`<p class="small muted" style="margin:8px 0 0;grid-column:1/-1">Ausgaben im Schnitt der ${rest.length} Zeiträume davor: CHF ${chf0(avg)}.${low?' <b class="in">Tiefster Wert seit '+n+' Zeiträumen.</b>':''}</p>`:''}</div>
    <div class="card ytable brtable mt"><table><thead>${head}</thead><tbody>
    ${tot('Gesamteinnahmen', s=>s.inc, true)}${keys('i:').map(k=>row(k, true)).join('')}
    ${tot('Gesamtausgaben', s=>s.out, false)}${keys('o:').map(k=>row(k, false)).join('')}
    ${cfRow}</tbody></table></div>
    <p class="small muted">Name antippen zeigt die Unterkategorien, 🔍 oder ein Betrag die Buchungen dazu. ⚙ stellt Spalten und Prozent ein.</p>`;
})(brEA);
function brListDialog(k, i, sub){
  const P = lmPeriod((S.lmOff||0) - (+i||0)), inc = k.startsWith('i:'), top = k.slice(2);
  const list = brTx(P.from, P.to).filter(t=>brTop(t)===top && brIsInc(t)===inc && (!sub || brSub(t)===sub)).sort((a,b)=>b.d.localeCompare(a.d));
  const sum = list.reduce((a,t)=>a+Math.abs(sv(t)),0);
  dialog(`<h3>${esc(sub||top)}</h3><p class="small muted" style="margin-top:0">${P.l} · ${list.length} Buchungen · CHF ${chf(sum)}</p>
    <div class="brlist">${list.slice(0,300).map(t=>`<div class="brld">${dShort(t.d)}</div>${bkTxRow(t)}`).join('') || '<p class="small muted">Keine Buchungen.</p>'}</div>
    <div class="acts"><button class="btn" data-dlg="cancel">Schliessen</button></div>`, ()=>{});
}

/* ---------- Cashflow-Vergleich: Cashflow · Ausgaben · Einnahmen ---------- */
brCash = (prev => function(){
  let h = prev(); const m = S.brCmp || 'cf'; if(m==='cf') return h.replace('<h3 style="margin:0 0 6px">Verlauf im Vergleich</h3>', `<div class="row"><h3 class="sp" style="margin:0 0 6px">Verlauf im Vergleich</h3></div>${brCmpSeg()}`);
  // eigene Vergleichsgrafik für Ausgaben bzw. Einnahmen
  const off = S.lmOff||0, P = lmPeriod(off), Pp = lmPeriod(off-1), n = dDiff(P.from, P.to)+1, yb = {from:yearBack(P.from), to:yearBack(P.to)};
  const S0 = brSums(P.from, P.to), S1 = brSums(Pp.from, Pp.to), S2 = brSums(yb.from, yb.to), last = todayIso(), key = m==='in' ? 'i' : 'o';
  const cum = (s, from) => { let c = 0; return Array.from({length:n},(_,i)=>{ const d = dAdd(from,i); if(d>last) return null; c += s.days[d]?.[key]||0; return r2(c); }); };
  const days = Array.from({length:n},(_,i)=>dAdd(P.from,i));
  const card = `<div class="card mt brcmp"><div class="row"><h3 class="sp" style="margin:0 0 6px">Verlauf im Vergleich</h3></div>${brCmpSeg()}<p class="small muted" style="margin:0 0 6px">${m==='in'?'Einnahmen':'Ausgaben'} aufsummiert ab Beginn des Zeitraums.</p>
    ${chart({h:230, labels:days.map((d,i)=>'Tag '+(i+1)), tips:days.map(dShort), series:[{kind:'area', name:'Aktueller Zeitraum', color:C_BAL, values:cum(S0, P.from)},{kind:'line', name:'Vorheriger Zeitraum', color:C_PREV, values:cum(S1, Pp.from)},{kind:'line', name:'Vor einem Jahr', color:C_YEAR, values:cum(S2, yb.from)}], label:'Vergleich'})}
    ${legend([[C_BAL,'Aktueller Zeitraum'],[C_PREV,'Vorheriger Zeitraum'],[C_YEAR,'Vor einem Jahr']])}</div>`;
  const i = h.lastIndexOf('<div class="card mt"><h3 style="margin:0 0 6px">Verlauf im Vergleich</h3>'); return i<0 ? h + card : h.slice(0,i) + card;
})(brCash);
var brCmpSeg = () => `<div class="sgm brcmpseg">${[['cf','Cashflow'],['out','Ausgaben'],['in','Einnahmen']].map(([v,l])=>`<button class="${(S.brCmp||'cf')===v?'on':''}" data-act="brcmp" data-v="${v}">${l}</button>`).join('')}</div>`;

/* ---------- Erweiterte Diagramme ---------- */
var EX_TYP = [['bal','Kontostand'],['out','Ausgaben'],['in','Einnahmen'],['cf','Cashflow']], EX_ART = [['line','Linie'],['bar','Balken'],['area','Fläche'],['pie','Kreis']];
var EX_GRP = [['none','Keine'],['top','Hauptkategorie'],['cat','Kategorie'],['acc','Konto'],['tag','Etikett'],['pay','Zahlungsart']], EX_GRAN = [['d','Tag'],['w','Woche'],['m','Monat'],['y','Jahr']];
S.ex = (() => { try{ return {typ:'bal', art:'line', grp:'none', gran:'d', ...JSON.parse(localStorage.getItem(KEY+'.ex')||'{}')}; }catch(e){ return {typ:'bal', art:'line', grp:'none', gran:'d'}; } })();
var exSave = () => { try{ localStorage.setItem(KEY+'.ex', JSON.stringify(S.ex)); }catch(e){} };
function exBuckets(from, to, g){
  const out = []; if(g==='d') for(let d=from; d<=to; d=dAdd(d,1)) out.push({from:d, to:d, l:dShort(d)});
  else if(g==='w') for(let d=monOf(from); d<=to; d=dAdd(d,7)) out.push({from:d<from?from:d, to:dAdd(d,6)>to?to:dAdd(d,6), l:'KW '+kw(d)});
  else if(g==='m'){ let ym = from.slice(0,7); while(ym<=to.slice(0,7)){ out.push({from:ym+'-01'<from?from:ym+'-01', to:mEnd(ym)>to?to:mEnd(ym), l:MN[+ym.slice(5)-1].slice(0,3)+' '+ym.slice(2,4)}); ym = ymAdd(ym,1); } }
  else for(let y=+from.slice(0,4); y<=+to.slice(0,4); y++) out.push({from:Math.max(+from.slice(0,4),y)===y && from>y+'-01-01'?from:y+'-01-01', to:to<y+'-12-31'?to:y+'-12-31', l:String(y)});
  return out.filter(b=>b.from<=todayIso());
}
function exGroupOf(t, g){ if(g==='top') return brTop(t); if(g==='cat') return brSub(t); if(g==='acc') return accName(bkAcc(t)); if(g==='tag') return txTags(t)[0] || 'ohne Etikett'; if(g==='pay') return txPay(t); return 'Summe'; }
function brExt(){
  const x = S.ex, P = lmPeriod(S.lmOff||0), end = P.to < todayIso() ? P.to : todayIso();
  if((x.gran==='d' && dDiff(P.from,end)>120)) x.gran = 'w';
  const B = exBuckets(P.from, end, x.gran), saved = D.settings.exSaved || [];
  const sel = (k, opts, lab) => `<label class="f">${lab}<select data-act="exset" data-k="${k}">${opts.map(([v,l])=>`<option value="${v}" ${x[k]===v?'selected':''}>${l}</option>`).join('')}</select></label>`;
  let ser = [], tot = {};
  if(x.typ==='bal'){
    const accs = (S.bf.acc.length ? D.accounts.filter(a=>S.bf.acc.includes(a.id)) : D.accounts.filter(a=>inStats(a))).filter(a=>!a.archived && D.bal?.[a.id] && accCur(a)==='CHF');
    const groups = x.grp==='acc' ? accs.map(a=>[a.name, [a]]) : [['Kontostand', accs]];
    ser = groups.map(([n, as], i)=>({name:n, values:B.map(b=>r2(as.reduce((s,a)=>s+(balAt(a.id, b.to)??0),0)))}));
    groups.forEach(([n,as])=>tot[n] = as.reduce((s,a)=>s+(balAt(a.id,end)??0),0));
  } else {
    const list = brTx(P.from, end).filter(t=> x.typ==='cf' ? true : x.typ==='in' ? brIsInc(t) : !brIsInc(t));
    const per = {}; for(const t of list){ const g = exGroupOf(t, x.grp), v = x.typ==='out' ? -sv(t) : sv(t);
      tot[g] = (tot[g]||0) + v; const bi = B.findIndex(b=>t.d>=b.from && t.d<=b.to); if(bi<0) continue; ((per[g] ??= Array(B.length).fill(0)))[bi] += v; }
    const ord = Object.keys(tot).sort((a,b)=>Math.abs(tot[b])-Math.abs(tot[a])), top = ord.slice(0,7), other = ord.slice(7);
    ser = top.map(g=>({name:g, values:per[g].map(r2)}));
    if(other.length){ const v = Array(B.length).fill(0); other.forEach(g=>per[g].forEach((y,i)=>v[i]+=y)); ser.push({name:'Andere', values:v.map(r2)}); tot['Andere'] = other.reduce((s,g)=>s+tot[g],0); other.forEach(g=>delete tot[g]); }
  }
  ser.forEach((s,i)=>s.color = CAT_COL[i % CAT_COL.length]);
  let viz = '';
  if(x.art==='pie'){ const parts = Object.entries(tot).filter(([,v])=>Math.abs(v)>=0.5).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).map(([n,v],i)=>({n, v:Math.abs(v), c:CAT_COL[i%CAT_COL.length]}));
    const sum = parts.reduce((a,p)=>a+p.v,0);
    viz = parts.length ? `<div class="exPie">${donut(parts, EX_TYP.find(t=>t[0]===x.typ)[1], 'CHF '+chf0(sum), 170)}<div class="exPl">${parts.map(p=>`<div><i style="background:${p.c}"></i><span>${esc(p.n)}</span><b class="num">${chf(p.v)}</b><em>${pct(p.v/(sum||1))}</em></div>`).join('')}</div></div>` : '<p class="small muted">Keine Daten im Zeitraum.</p>'; }
  else { const kind = x.art==='bar' ? 'bar' : x.art==='area' && ser.length===1 ? 'area' : 'line';
    viz = chart({h:280, labels:B.map(b=>b.l), series:ser.map(s=>({...s, kind})), label:'Erweitertes Diagramm'}) + legend(ser.map(s=>[s.color, s.name])); }
  return `<div class="card exctl"><div class="exrow">
      <label class="f">Meine Diagramme<div class="row" style="gap:6px"><select data-act="exload" class="sp"><option value="">Wählen Sie Ihr Diagramm</option>${saved.map((s,i)=>`<option value="${i}">${esc(s.n)}</option>`).join('')}</select><button class="ibtn" data-act="exsave" title="Diagramm speichern" aria-label="Diagramm speichern">💾</button></div></label>
      ${sel('typ', EX_TYP, 'Typ')}${sel('art', EX_ART, 'Diagrammart')}${sel('grp', x.typ==='bal' ? [['none','Keine'],['acc','Konto']] : EX_GRP, 'Gruppieren nach')}${sel('gran', EX_GRAN, 'Granularität')}</div>
      ${saved.length?`<details class="bfsaved"><summary class="small">Gespeicherte Diagramme verwalten</summary>${saved.map((s,i)=>`<div class="row small"><span class="sp">${esc(s.n)}</span><button class="link" data-act="exdel" data-i="${i}">Löschen</button></div>`).join('')}</details>`:''}</div>
    <div class="card mt">${viz}</div>`;
}

/* ---------- Investitionen ---------- */
function vInvest(){
  const P = lmPeriod(S.lmOff||0), end = P.to < todayIso() ? P.to : todayIso(), from12 = dAdd(end, -365);
  const accs = D.accounts.filter(a=>!a.archived && accGrp(a)==='vorsorge');
  if(!accs.length) return `<div class="card"><h3 style="margin:0 0 6px">Investitionen</h3><p class="small muted" style="margin:0">Keine Vorsorge- oder Anlagekonten gefunden. Ein Konto gilt als Investition, wenn es unter Konten › Aussehen der Gruppe «Vorsorge & Anlagen» zugeordnet ist (z. B. Säule 3a, Depot).</p></div>`;
  const rows = accs.map(a=>{ const v = balAt(a.id, end) ?? accValRaw(a), v0 = balAt(a.id, from12), c = accCur(a);
    const ein = D.tx.filter(t=>bkAcc(t)===a.id && t.d>from12 && t.d<=end && sv(t)>0).reduce((s,t)=>s+sv(t),0), aus = D.tx.filter(t=>bkAcc(t)===a.id && t.d>from12 && t.d<=end && sv(t)<0).reduce((s,t)=>s-sv(t),0);
    const perf = v0!=null && v!=null ? r2(v - v0 - ein + aus) : null;
    return {a, v, v0, c, ein, aus, perf}; });
  const tot = rows.filter(r=>r.c==='CHF').reduce((s,r)=>s+(r.v||0),0), totEin = rows.filter(r=>r.c==='CHF').reduce((s,r)=>s+r.ein,0), totPerf = rows.filter(r=>r.c==='CHF' && r.perf!=null).reduce((s,r)=>s+r.perf,0);
  const months = Array.from({length:13},(_,i)=>mEnd(ymAdd(end.slice(0,7), i-12))).map(d=>d>end?end:d);
  const ser = rows.filter(r=>r.c==='CHF' && D.bal?.[r.a.id]).map((r,i)=>({name:r.a.name, kind:'bar', color:CAT_COL[i%CAT_COL.length], values:months.map(d=>r2(balAt(r.a.id,d)??0))}));
  return `<div class="card brsum"><div class="brk"><span>Wert heute</span><b class="num">CHF ${chf(tot)}</b></div><div class="brk"><span>Einzahlungen 12 Monate</span><b class="num">CHF ${chf(totEin)}</b></div><div class="brk"><span>Wertentwicklung 12 Monate</span><b class="num ${totPerf>=0?'in':'neg'}">${totPerf>=0?'+':'−'}CHF ${chf(Math.abs(totPerf))}</b></div></div>
    ${ser.length?`<div class="card mt"><h3 style="margin:0 0 6px">Entwicklung der letzten 12 Monate</h3>${chart({h:240, labels:months.map(d=>MN[+d.slice(5,7)-1].slice(0,3)), series:ser, label:'Investitionen pro Monat'})}${legend(ser.map(s=>[s.color, s.name]))}</div>`:''}
    <div class="card mt"><h3 style="margin:0 0 6px">Konten</h3>${rows.map(r=>`<div class="bracc"><span class="brdot" style="background:${r.a.color||wAccColor(r.a)}"></span><div class="sp"><b>${esc(r.a.name)}</b><div class="small muted">Einzahlungen 12 Mt. ${chf(r.ein)}${r.perf!=null?` · Wertentwicklung <span class="${r.perf>=0?'in':'neg'}">${r.perf>=0?'+':'−'}${chf(Math.abs(r.perf))}</span>`:''}</div></div><div class="gwr"><b class="num">${chf(r.v)} ${r.c!=='CHF'?r.c:''}</b></div></div>`).join('')}
    <p class="small muted" style="margin:8px 0 0">Wertentwicklung = Wert heute − Wert vor 12 Monaten − Einzahlungen + Bezüge. Kurse werden nicht aus dem Internet geladen; der Wert kommt aus Wallet bzw. deinem eingetragenen Stand.</p></div>`;
}
(() => { const h = HUBS.find(x=>x.k==='ana'); if(h && !h.tabs.some(t=>t[0]==='invest')) h.tabs.push(['invest','Investitionen']); })();
TITLES.invest = 'Investitionen';
CUSTOM_V.invest = () => brHead().replace(/<div class="brtools">[\s\S]*<\/div>$/, '') + vInvest();

/* ---------- Bericht-Seite zusammensetzen ---------- */
vBericht = function(){
  const sg = S.brSeg || 'ea';
  let main = brHead() + `<div class="sgm brseg">${[['ea','Einnahmen & Ausgaben'],['kt','Kontostandtrend'],['cf','Cashflow'],['ex','Erweiterte Diagramme']].map(([v,l])=>`<button class="${v===sg?'on':''}" data-act="brseg" data-v="${v}">${l}</button>`).join('')}</div>`;
  try{ main += sg==='kt' ? brKonto() : sg==='cf' ? brCash() : sg==='ex' ? brExt() : brEA(); }catch(e){ console.error(e); main += '<div class="card">Bericht konnte nicht berechnet werden.</div>'; }
  main += `<p class="small muted">Ohne Filter zählen wie bei Wallet nur Konten in der Statistik. Überweisungen zählen nur, wenn du sie im Filter einbeziehst.</p>`;
  return `<div class="brlay">${bfPanel()}<div class="brmain">${main}</div></div>`;
};
CUSTOM_V.bericht = vBericht;
render = (prev => function(){ prev.apply(this, arguments); try{ if(S.view==='invest' && D && !S.locked) drawCharts(); }catch(e){} })(render);

/* ---------- Bedienung ---------- */
var brRerender = () => { const y = scrollY; render(); scrollTo(0, y); };
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act]'); if(!a || !D) return; const act = a.dataset.act;
  const H = {
    bpnav(){ S.bp.off = (S.bp.off||0) + +a.dataset.d; if(S.bp.m!=='c') S.bp.off = Math.min(0, S.bp.off); bpSave(); brRerender(); },
    bppick(){ openBp(); },
    bpmode(){ S._bpMode = a.dataset.v; bpDialog(); },
    bpy(){ S._bpy = (S._bpy||+todayIso().slice(0,4)) + +a.dataset.d; bpDialog(); },
    bpset(){ S.bp = {m:a.dataset.mode, off:+a.dataset.off}; bpSave(); $('#dlg').close(); brRerender(); },
    bpcustom(){ const f = $('#bpf').value, t = $('#bpt').value; if(!f || !t){ toastMsg('Bitte beide Daten wählen.'); return; }
      S.bp = {m:'c', off:0, from:f<=t?f:t, to:f<=t?t:f}; bpSave(); $('#dlg').close(); brRerender(); },
    lmset2(){ $('#dlg').close(); setTimeout(lmDialogOpen, 50); },
    bftoggle(){ S.bfOpen = !S.bfOpen; brRerender(); },
    bfreset(){ S.bf = BF_DEF(); bfSave(); brRerender(); },
    bfsave(){ dialog(`<h3>Filter speichern</h3><label class="f">Name<input id="bfn" placeholder="z. B. Nur Kreditkarte"></label><div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Speichern</button></div>`,
      k=>{ if(k!=='ok') return; const n = $('#bfn').value.trim(); if(!n){ toastMsg('Bitte einen Namen eingeben.'); return false; } (D.settings.bfSaved ??= []).push({n:n.slice(0,40), f:JSON.parse(JSON.stringify(S.bf))}); }); },
    bfdel(){ D.settings.bfSaved?.splice(+a.dataset.i, 1); save(); brRerender(); },
    brlist(){ brListDialog(a.dataset.k, a.dataset.i, a.dataset.sub); },
    brcfg(){ const c = S.brCfg; dialog(`<h3>Bericht einstellen</h3>
      <label class="f">Anzahl Zeiträume<select id="brc1">${[3,6,9,12].map(n=>`<option ${c.cols===n?'selected':''}>${n}</option>`).join('')}</select></label>
      <label class="chk"><input type="checkbox" id="brc2" ${c.pct?'checked':''}> Veränderung in % anzeigen</label>
      <label class="chk"><input type="checkbox" id="brc3" ${c.allOpen?'checked':''}> Alle Unterkategorien aufklappen</label>
      <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Übernehmen</button></div>`,
      k=>{ if(k!=='ok') return; S.brCfg = {cols:+$('#brc1').value, pct:$('#brc2').checked, allOpen:$('#brc3').checked}; brCfgSave(); }); },
    brcmp(){ S.brCmp = a.dataset.v; brRerender(); },
    exsave(){ dialog(`<h3>Diagramm speichern</h3><label class="f">Name<input id="exn" placeholder="z. B. Ausgaben nach Konto"></label><div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Speichern</button></div>`,
      k=>{ if(k!=='ok') return; const n = $('#exn').value.trim(); if(!n){ toastMsg('Bitte einen Namen eingeben.'); return false; } (D.settings.exSaved ??= []).push({n:n.slice(0,40), x:{...S.ex}}); }); },
    exdel(){ D.settings.exSaved?.splice(+a.dataset.i, 1); save(); brRerender(); },
  };
  if(H[act] && (a.tagName!=='SELECT' && a.tagName!=='INPUT')){ e.stopPropagation(); e.preventDefault(); H[act](); }
}, true);
document.addEventListener('change', e=>{
  const a = e.target.closest?.('[data-act]'); if(!a || !D) return; const act = a.dataset.act;
  if(act==='bfchk'){ const k = a.dataset.k, v = a.value, arr = new Set(S.bf[k]||[]); a.checked ? arr.add(v) : arr.delete(v); S.bf[k] = [...arr]; S._bfOpen = k; bfSave(); brRerender(); }
  else if(act==='bfsel'){ S.bf[a.dataset.k] = a.value; bfSave(); brRerender(); }
  else if(act==='bfmin' || act==='bfmax'){ const v = a.value.trim().replace(/['’\s]/g,'').replace(',', '.'); S.bf[act==='bfmin'?'min':'max'] = v==='' || isNaN(+v) ? '' : String(+v); bfSave(); brRerender(); }
  else if(act==='bfq'){ S.bf.q = a.value.trim(); bfSave(); brRerender(); }
  else if(act==='bfload'){ const x = D.settings.bfSaved?.[+a.value]; if(x){ S.bf = {...BF_DEF(), ...x.f}; bfSave(); brRerender(); } }
  else if(act==='exset'){ S.ex[a.dataset.k] = a.value; if(a.dataset.k==='typ' && a.value==='bal' && !['none','acc'].includes(S.ex.grp)) S.ex.grp = 'none'; exSave(); brRerender(); }
  else if(act==='exload'){ const x = D.settings.exSaved?.[+a.value]; if(x){ S.ex = {...S.ex, ...x.x}; exSave(); brRerender(); } }
}, true);
document.addEventListener('keydown', e=>{ const a = e.target.closest?.('[data-act="bfq"]'); if(a && e.key==='Enter'){ e.preventDefault(); a.blur(); } }, true);
function lmDialogOpen(){ const b = document.createElement('button'); b.dataset.act = 'lmset'; b.style.display = 'none'; document.body.appendChild(b); b.click(); b.remove(); }
