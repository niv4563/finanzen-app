/* =====================================================================
   73. AUTOMATISCH ERKENNEN – ABOS, PREISÄNDERUNGEN, GEKÜNDIGTE ABOS, JAHRESKOSTEN, LOHN
   • Knopf «Automatisch erkennen» bei Abos (und bei Jahreskosten und geplanten Zahlungen).
   • Grundlage: deine Buchungen der letzten 15 Monate (regelmässig, ähnlicher Betrag, gleicher Empfänger).
   • Alles läuft auf dem Gerät. Was du nicht übernimmst, wird nicht nochmals vorgeschlagen.
   ===================================================================== */
var AUTO_ABO = /netflix|spotify|youtube|google|apple\.com|itunes|icloud|disney|paramount|crunchyroll|nord ?vpn|surfshark|expressvpn|microsoft|office ?365|adobe|amazon prime|prime video|audible|kindle|uber one|garmin|arlo|dropbox|openai|chatgpt|anthropic|claude|gemini|zattoo|teleboy|blue ?tv|dazn|\bsky\b|deezer|tidal|xbox|playstation|psn|nintendo|ea play|patreon|bumble|tinder|happn|hinge|parship|duolingo|headspace|\bcalm\b|strava|komoot|1password|bitwarden|proton|blick|nzz|tages-?anzeiger|tamedia|watson|republik|fitnesspark|update fitness|activ fitness|basefit|movemi|swisscom|\bsalt\b|sunrise|wingo|yallo|m-budget mobile|digital republic|quickline|init7|collectr|ebike flow/i;
var AUTO_NOT = /migros|coop|denner|lidl|aldi|volg|\bspar\b|landi|manor|shell|\bbp\b|avia|agrola|tamoil|socar|\bsbb\b|postauto|restaurant|mcdonald|burger|starbucks|kiosk|apotheke|twint|bancomat|atm|bargeld|miete|vermiet|krankenkasse|css|helsana|swica|sanitas|visana|concordia|assura|groupe mutuel|kpt|sympany|steuer|zinsen|kredit|leasing|raten/i;
var AUTO_CAT = /abo|abonn|streaming|software|app|medien|zeitung|fitness|cloud|unterhaltung|handy|mobil|internet|tv/i;
var autoKey = (t, k) => t + ':' + k;
var autoNo = () => (D.autoNo ??= {});
var aboTok = a => bkNorm(a.name||'').split(/\s+/).filter(w=>w.length>=3);
function aboHit(a, r){ if(a.key && a.key===r.key) return true; const k = r.key + ' ' + bkNorm(r.who);
  return aboTok(a).slice(0,2).some(w=>k.includes(w)); }
function autoAcc(key){ const cnt = {}; for(const t of D.tx) if(acMer(t)===key && t.acc) cnt[t.acc] = (cnt[t.acc]||0)+1;
  return Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0]?.[0] || mainAcc().id; }
// Einnahmen, die regelmässig kommen (Lohn, Nebeneinkommen)
function autoIncome(){
  const since = dAdd(todayIso(), -460), by = {};
  for(const t of D.tx){ if(t.d<since || isTr(t)) continue; const v = inAmt(t); if(!v || v<100) continue; const k = acMer(t); if(!k || k.length<3) continue; (by[k] ??= []).push({d:t.d, v, n:t.n||t.text||''}); }
  const out = [];
  for(const [k, l0] of Object.entries(by)){ if(l0.length<3) continue; const l = l0.sort((a,b)=>a.d.localeCompare(b.d));
    const gaps = []; for(let i=1;i<l.length;i++){ const g = dDiff(l[i-1].d, l[i].d); if(g>3) gaps.push(g); } if(!gaps.length) continue;
    const gm = med(gaps); if(gm<24 || gm>37) continue; if(dDiff(l.at(-1).d, todayIso()) > 50) continue;
    const amt = r2(med(l.slice(-3).map(x=>x.v))), day = Math.round(med(l.map(x=>+x.d.slice(8))));
    if(out.some(o=>Math.abs(o.amount-amt) <= amt*0.05 && Math.abs(o.day-day) <= 3)) continue;   // gleiche Zahlung unter zwei Texten
    out.push({key:k, who:niceName(String(l.at(-1).n).split(' · ')[0].slice(0,40)), amount:amt, day, n:l.length, last:l.at(-1).d}); }
  return out.sort((a,b)=>b.amount-a.amount);
}
// Jährliche Zahlungen brauchen mehr Geschichte (bis 26 Monate zurück)
function autoYearly(){
  const today = todayIso(), since = dAdd(today, -800), by = {};
  for(const t of D.tx){ if(t.d<since || isTr(t)) continue; const v = kSpend(t); if(!v || v<20) continue; const k = acMer(t); if(!k || k.length<3) continue; (by[k] ??= []).push({d:t.d, v, c:t.c, n:t.n||t.text||''}); }
  const out = [];
  for(const [k, l0] of Object.entries(by)){ if(l0.length<2 || l0.length>4) continue; const m0 = med(l0.map(x=>x.v));
    const l = l0.filter(x=>Math.abs(x.v-m0) <= m0*0.3+5).sort((a,b)=>a.d.localeCompare(b.d)); if(l.length<2) continue;
    const gaps = []; for(let i=1;i<l.length;i++) gaps.push(dDiff(l[i-1].d, l[i].d)); if(!gaps.every(g=>g>=330 && g<=400)) continue;
    const last = l.at(-1).d; if(dDiff(last, today) > 400) continue;
    let next = dAdd(last, 365); while(next < today) next = dAdd(next, 365);
    const cc = {}; for(const x of l) if(x.c && x.c!=='_offen') cc[x.c] = (cc[x.c]||0)+1;
    out.push({key:k, who:niceName(String(l.at(-1).n).split(' · ')[0].slice(0,40)), cat:Object.entries(cc).sort((a,b)=>b[1]-a[1])[0]?.[0] || '_offen', amount:r2(l.at(-1).v), freq:'J', day:+last.slice(8), next, last, n:l.length}); }
  return out;
}
function autoFind(){
  const no = autoNo(), R0 = typeof rcAll==='function' ? rcAll() : [], R = [...R0, ...autoYearly().filter(y=>!R0.some(r=>r.key===y.key))], res = {abo:[], price:[], stale:[], year:[], inc:[]};
  const abos = D.abos||[];
  for(const r of R){
    const txt = r.key + ' ' + r.who, catN = catName?.(r.cat) || '';
    const ab = abos.find(a=>aboHit(a, r));
    if(ab){ const monthly = r.freq==='M' ? r.amount : r.freq==='J' ? r.amount/12 : r.freq==='Q' ? r.amount/3 : r.amount/6;
      const cur = ab.interval==='J' ? ab.price/12 : ab.price;
      if(ab.active!==false && Math.abs(monthly-cur) > Math.max(0.5, cur*0.05) && !no[autoKey('price', ab.id+':'+r.amount)])
        res.price.push({id:ab.id, name:ab.name, old:ab.price, interval:ab.interval, neu: ab.interval==='J' ? r2(monthly*12) : r2(monthly), r});
      continue; }
    if(AUTO_NOT.test(txt)) { if(r.freq!=='M' && r.amount>=50 && !no[autoKey('year', r.key)] && !(D.yearly||[]).some(y=>Math.abs(y.amount-(r.freq==='J'?r.amount:r.freq==='H'?r.amount*2:r.amount*4)) <= y.amount*0.15+5 || bkNorm(y.name).includes(r.key.split(' ')[0])))
        res.year.push(r); continue; }
    const known = AUTO_ABO.test(txt), likely = known || (r.freq==='M' && (AUTO_CAT.test(catN) || r.amount<=60));
    if(likely && !no[autoKey('abo', r.key)]) res.abo.push({...r, known});
    else if(!likely && r.freq!=='M' && r.amount>=50 && !no[autoKey('year', r.key)] && !(D.yearly||[]).some(y=>bkNorm(y.name).includes(r.key.split(' ')[0]))) res.year.push(r);
  }
  // Abos ohne Buchung seit langem → gekündigt?
  const since = dAdd(todayIso(), -460);
  for(const a of abos.filter(a=>a.active!==false && a.price>0)){
    const tk = aboTok(a).slice(0,2); if(!tk.length) continue;
    const hits = D.tx.filter(t=>t.d>=since && !isTr(t) && kSpend(t)>0 && tk.some(w=>acMer(t).includes(w))).map(t=>t.d).sort();
    if(hits.length<2) continue; const last = hits.at(-1), lim = a.interval==='J' ? 430 : 75;
    if(dDiff(last, todayIso()) > lim && !no[autoKey('stale', a.id+':'+last)]) res.stale.push({id:a.id, name:a.name, last});
  }
  for(const i of autoIncome()) if(!(D.plans||[]).some(p=>p.type==='in' && !p.off && Math.abs(Math.abs(p.amount)-i.amount) <= i.amount*0.15) && !no[autoKey('inc', i.key)]) res.inc.push(i);
  res.n = res.abo.length + res.price.length + res.stale.length + res.year.length + res.inc.length;
  return res;
}
var autoFreq = f => ({M:'monatlich', Q:'vierteljährlich', H:'halbjährlich', J:'jährlich'})[f] || freqName(f);
function autoDialog(only){
  const R = autoFind(); S._auto = R;
  const box = (id, on, main, sub, amt) => `<label class="autor"><input type="checkbox" data-auto="${id}" ${on?'checked':''}><span class="sp"><b>${main}</b><span class="small muted">${sub}</span></span>${amt?`<b class="num">${amt}</b>`:''}</label>`;
  const sec = (t, hint, rows) => rows.length ? `<div class="autos"><h4>${t}</h4>${hint?`<p class="small muted">${hint}</p>`:''}${rows.join('')}</div>` : '';
  const show = k => !only || only.includes(k);
  const html =
    (show('abo') ? sec('Neue Abos', 'Regelmässig gleicher Betrag beim gleichen Anbieter.', R.abo.map((r,i)=>box('abo:'+i, r.known, esc(r.who), `${autoFreq(r.freq)} · ${r.n}× gebucht · zuletzt ${dShort(r.last)}${r.known?'':' · bitte prüfen'}`, 'CHF '+chf(r.amount)))) : '')
    + (show('abo') ? sec('Preis geändert', 'Die letzten Buchungen weichen vom erfassten Preis ab.', R.price.map((p,i)=>box('price:'+i, true, esc(p.name), `bisher CHF ${chf(p.old)} → neu CHF ${chf(p.neu)} ${p.interval==='J'?'pro Jahr':'pro Monat'}`, ''))) : '')
    + (show('abo') ? sec('Nicht mehr gebucht – gekündigt?', 'Schon länger keine Zahlung mehr. Angehakt = als nicht mehr aktiv markieren.', R.stale.map((s,i)=>box('stale:'+i, false, esc(s.name), `zuletzt bezahlt am ${dShort(s.last)}`, ''))) : '')
    + (show('year') ? sec('Jahreskosten', 'Kommen einmal im Jahr (oder alle paar Monate). Angehakt = in die Jahreskosten, die App legt dafür monatlich zurück.', R.year.map((r,i)=>box('year:'+i, r.freq==='J', esc(r.who), `${autoFreq(r.freq)} · zuletzt ${dShort(r.last)} · nächste ~${dShort(r.next)}`, 'CHF '+chf(r.amount)))) : '')
    + (show('inc') ? sec('Lohn & regelmässige Einnahmen', 'Angehakt = als geplante Einnahme (für Ausblick und «Bis zum Lohn»).', R.inc.map((x,i)=>box('inc:'+i, x.amount>=1000, esc(x.who), `monatlich um den ${x.day}. · ${x.n}× erhalten · zuletzt ${dShort(x.last)}`, 'CHF '+chf(x.amount)))) : '');
  dialog(`<h3>Automatisch erkannt</h3>${html ? `<p class="small muted" style="margin-top:0">Aus deinen Buchungen der letzten 15 Monate. Was du nicht anhakst, wird nicht nochmals vorgeschlagen.</p>${html}
      <div class="acts"><button class="btn" data-dlg="cancel">Später</button><button class="btn pri" data-dlg="ok">Übernehmen</button></div>`
    : `<p>Nichts Neues gefunden – alles Regelmässige ist schon erfasst.</p><p class="small muted">Die App braucht dafür mindestens drei Zahlungen pro Monat-Rhythmus bzw. zwei pro Jahr beim gleichen Anbieter.</p><div class="acts"><button class="btn pri" data-dlg="cancel">OK</button></div>`}`,
  k=>{ if(k!=='ok') return; const on = new Set([...document.querySelectorAll('[data-auto]')].filter(x=>x.checked).map(x=>x.dataset.auto)), no = autoNo(); let n = 0;
    const all = [...document.querySelectorAll('[data-auto]')].map(x=>x.dataset.auto);
    for(const id of all){ const [t, i] = id.split(':'), take = on.has(id);
      if(t==='abo'){ const r = R.abo[+i]; if(take){ const iv = r.freq==='M' ? 'M' : 'J', price = r.freq==='M' ? r.amount : r.freq==='J' ? r.amount : r.freq==='Q' ? r2(r.amount*4) : r2(r.amount*2);
          D.abos.push({id:'a'+uid(), name:r.who, interval:iv, price, acc:autoAcc(r.key), active:true, key:r.key, auto:1}); n++; } else no[autoKey('abo', r.key)] = 1; }
      if(t==='price'){ const p = R.price[+i], a = D.abos.find(x=>x.id===p.id); if(take && a){ a.price = p.neu; a.key ??= p.r.key; n++; } else no[autoKey('price', p.id+':'+p.r.amount)] = 1; }
      if(t==='stale'){ const s = R.stale[+i], a = D.abos.find(x=>x.id===s.id); if(take && a){ a.active = false; n++; } else no[autoKey('stale', s.id+':'+s.last)] = 1; }
      if(t==='year'){ const r = R.year[+i]; if(take){ const amt = r.freq==='J' ? r.amount : r.freq==='H' ? r2(r.amount*2) : r2(r.amount*4);
          D.yearly.push({id:'y'+uid(), name:r.who, amount:amt, month:+r.next.slice(5,7), cat:r.cat==='_offen'?'':r.cat, mode:'verteilt', from:C.now}); try{ ensureRueck(); }catch(e){} n++; } else no[autoKey('year', r.key)] = 1; }
      if(t==='inc'){ const x = R.inc[+i]; if(take){ const d = ymAdd(TODAY,1)+'-'+String(Math.min(x.day,28)).padStart(2,'0');
          (D.plans ??= []).push({id:'p'+uid(), type:'in', name:x.who, amount:x.amount, freq:'M', start:d, day:x.day, acc:autoAcc(x.key), cat:'', match:x.key}); n++; } else no[autoKey('inc', x.key)] = 1; }
    }
    setTimeout(()=>toastMsg(n ? `${n} ${n===1?'Eintrag':'Einträge'} übernommen` : 'Nichts übernommen – wird nicht nochmals vorgeschlagen'), 50); });
}
document.addEventListener('click', e=>{ const a = e.target.closest('[data-act="autofind"]'); if(!a || !D) return; e.stopPropagation(); e.preventDefault();
  autoDialog(a.dataset.only ? a.dataset.only.split(',') : null); }, true);
// Knopf und Hinweis auf den Seiten Abos, Jahreskosten und geplante Zahlungen
render = (prev => function(){ const r = prev.apply(this, arguments);
  try{ const v = S.view, only = {abos:'abo', jahr:'year', plaene:'inc'}[v]; if(!D || S.locked || !only) return r;
    const R = autoFind(), cnt = only==='abo' ? R.abo.length+R.price.length+R.stale.length : only==='year' ? R.year.length : R.inc.length;
    const what = {abo:'Abos', year:'Jahreskosten', inc:'Lohn und regelmässige Einnahmen'}[only];
    const bar = `<div class="hint row autobar"><span class="sp">${cnt ? `<b>${cnt} ${cnt===1?'Vorschlag':'Vorschläge'}</b> aus deinen Buchungen erkannt.` : `${what} aus deinen Buchungen erkennen.`}</span><button class="btn sm ${cnt?'pri':''}" data-act="autofind" data-only="${only}">Automatisch erkennen</button></div>`;
    const m = $('#main'); const h2 = m.querySelector('h2'); const anchor = h2 ? h2.closest('.row') || h2 : null;
    (anchor && anchor.parentElement===m ? anchor : m.firstElementChild)?.insertAdjacentHTML('afterend', bar);
  }catch(e){} return r; })(render);
// Menü: Abos und Jahreskosten unter «Geld planen» (statt unter «Weitere»)
(() => { const g = NAV4.find(s=>s[0]==='Geld planen'); if(!g) return; const at = Math.max(0, g[1].findIndex(i=>i[0]==='plaene')) + 1;
  for(const id of ['jahr','abos']){ for(const s of NAV4){ const k = s[1].findIndex(i=>i[0]===id); if(k>=0 && s!==g){ const [it] = s[1].splice(k,1); g[1].splice(at, 0, it); } } }
  for(let i = NAV4.length-1; i>=0; i--) if(!NAV4[i][1].length) NAV4.splice(i,1); })();
