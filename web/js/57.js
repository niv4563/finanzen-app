/* =====================================================================
   65. VERSION 1.38.0 – KONTOTREND IN DIE ZUKUNFT, EXCEL AB JETZT
   • Excel-Import schlägt «ab jetzt» vor (z. B. November 2026 bis Dezember 2027).
   • Die Tabelle «Kontostand» (PostFinance, Sparkonto, Kreditkarte …) aus der Excel-Datei
     wird als geplanter Kontostand pro Konto übernommen – automatisch dem passenden Konto zugeordnet.
   • Analyse → Ausblick: Kontotrend pro Konto – bisher durchgezogen, Zukunft gestrichelt.
     Die Zukunft startet beim echten heutigen Stand und folgt den geplanten Veränderungen.
   • Gespeichert werden nur die Beträge (verschlüsselt wie alle Daten), nie die Datei.
   ===================================================================== */
xlsxRead = (prev => async function(buf){ const r = await prev(buf); S._xlSheets = r; return r; })(xlsxRead);

// Tabelle «Kontostand» in den Blättern finden (die vollständigste pro Blatt)
function xlBalPlans(){
  const out = {};
  for(const sh of S._xlSheets||[]){
    const hi = sh.rows.findIndex(r=>r && r.filter(v=>typeof v==='string' && XL_MON.some(rx=>rx.test(v.trim()))).length>=4); if(hi<0) continue;
    const H = sh.rows[hi], cols = []; H.forEach((v,i)=>{ if(typeof v!=='string') return; const m = XL_MON.findIndex(rx=>rx.test(v.trim())); if(m>=0 && !cols.some(c=>c.m===m)) cols.push({i, m}); });
    const first = Math.min(...cols.map(c=>c.i)), ym = (sh.name+' '+sh.rows.slice(0,hi).flat().filter(x=>typeof x==='string').join(' ')).match(/20\d{2}/g), year = ym ? ym.at(-1) : null; if(!year) continue;
    let cur = null, best = null;
    for(const r of sh.rows.slice(hi+1)){ if(!r) continue;
      const lab = r.slice(0, first).map(v=>typeof v==='string' ? v.trim() : '').filter(Boolean).at(-1); if(!lab) continue;
      if(/^kontostand$/i.test(lab)){ cur = []; continue; }
      if(!cur) continue;
      if(/^summe/i.test(lab)){ if(!best || cur.length >= best.length) best = cur; cur = null; continue; }
      const vals = {}; let any = false;
      for(const c of cols){ const v = r[c.i]; if(typeof v==='number' && isFinite(v)){ vals[year+'-'+String(c.m+1).padStart(2,'0')] = r2(v); any = true; } }
      // Zeilen mit vielen Fehlern (#REF!, leer) sind unzuverlässig: nur übernehmen, wenn mind. 70 % der Monate Zahlen sind
      if(any && Object.keys(vals).length >= cols.length*0.7) cur.push({lab, vals});
    }
    for(const x of best||[]) Object.assign(out[x.lab] ??= {}, x.vals);
  }
  return Object.entries(out).map(([lab, vals])=>({lab, vals}));
}
// Excel-Name → Konto (bestes Wort-Ergebnis, jedes Konto nur einmal)
function xlAccMatch(labs){
  const norm = s => bkNorm(String(s||'').replace(/postfinace/ig,'postfinance')), tok = s => fcTok(norm(s));
  const score = (lab, a) => { const L = tok(lab), A = tok(a.name); let s = norm(lab)===norm(a.name) ? 10 : 0;
    for(const w of L) s += A.some(v=>v===w || (v.length>=5 && w.length>=5 && v.slice(0,5)===w.slice(0,5))) ? 2 : -1;
    s -= A.filter(v=>!L.some(w=>v===w || (v.length>=5 && w.length>=5 && v.slice(0,5)===w.slice(0,5)))).length*0.5;
    if(a.main) s += 0.3; return s; };
  const accs = D.accounts.filter(a=>!a.archived), pairs = [];
  for(const lab of labs) for(const a of accs){ const s = score(lab, a); if(s>=1.4) pairs.push({lab, a, s}); }
  pairs.sort((x,y)=>y.s-x.s); const map = {}, used = new Set();
  for(const p of pairs){ if(map[p.lab] || used.has(p.a.id)) continue; map[p.lab] = p.a.id; used.add(p.a.id); }
  return map;
}
function xlBalApply(von, bis){
  const rows = xlBalPlans(); if(!rows.length) return;
  const learned = D.settings.xlAcc || {}, auto = xlAccMatch(rows.map(r=>r.lab).filter(l=>!learned[l])), map = {...auto, ...learned};
  D.balPlan ??= {}; let n = 0;
  for(const r of rows){ const id = map[r.lab]; if(!id || id==='_skip') continue; (D.balPlan[id] ??= {});
    for(const [m,v] of Object.entries(r.vals)) if(m>=von && m<=bis){ D.balPlan[id][m] = v; n++; } }
  D.settings.xlAcc = {...learned, ...auto};
  save(); render();
  const names = rows.filter(r=>map[r.lab]).map(r=>`${r.lab} → ${accName(map[r.lab])}`);
  if(n) setTimeout(()=>toastMsg(`Geplante Kontostände übernommen: ${names.length} Konten`), 2800);
}
document.addEventListener('click', e=>{ const a = e.target.closest('[data-act="xrange"]'); if(!a) return; e.stopPropagation(); e.preventDefault();
  const [v,b] = a.dataset.v.split('|'); const fv = $('#xvon'), fb = $('#xbis'); if(fv) fv.value = v; if(fb) fb.value = b; }, true);

// ---------- Kontotrend pro Konto ----------
var ktAt = (a, d) => D.bal?.[a.id] ? (balAt(a.id, d) ?? accVal(a)) : accVal(a);
function ktSeries(nFut){
  const today = todayIso(), now = TODAY, plan = D.balPlan||{}, main = mainAcc?.();
  const pastM = Array.from({length:6},(_,i)=>ymAdd(now, i-6)), futM = Array.from({length:nFut},(_,i)=>ymAdd(now, i));
  const accs = D.accounts.filter(a=>!a.archived && inStats(a) && accCur(a)==='CHF');
  const fc = main && !plan[main.id] ? fcSeries(mEnd(futM.at(-1))) : null;
  const rows = accs.map(a=>{
    const vNow = accVal(a), past = pastM.map(m=>ktAt(a, mEnd(m))), P = plan[a.id] || {};
    const base = P[now] ?? P[ymAdd(now,-1)];
    let src = 'flat', last = null;
    const fut = futM.map(m=>{
      if(P[m]!=null){ src = 'plan'; last = base!=null ? vNow + (P[m] - base) : P[m]; return last; }
      if(last!=null) return last;                                  // nach dem Ende der Planung: letzter geplanter Stand
      if(fc && a.id===main.id){ src = 'prog'; const e = mEnd(m), p = [...fc.pts].reverse().find(x=>x.d<=e); return p ? vNow + (p.v - fc.start) : vNow; }
      return vNow; });
    return {a, vNow, past, fut, src, end:fut.at(-1)};
  }).filter(r=>Math.abs(r.vNow)>=1 || r.src==='plan' || r.past.some(v=>Math.abs(v)>=1));
  return {pastM, futM, rows, today};
}
function cardAccTrend(){
  const hz = +(S.ohz||'90'), nFut = hz<=30 ? 2 : hz<=90 ? 4 : 13, K = ktSeries(nFut);
  if(!K.rows.length) return '';
  const top = K.rows.slice().sort((x,y)=>(y.src==='plan')-(x.src==='plan') || Math.abs(y.vNow)-Math.abs(x.vNow)).slice(0,6);
  const labels = [...K.pastM.map(m=>ymShort(m)), 'Heute', ...K.futM.map(m=>ymShort(m))];
  const tips = [...K.pastM.map(m=>'Ende '+ymLabel(m)), 'Heute', ...K.futM.map(m=>'Ende '+ymLabel(m)+' · Prognose')];
  const np = K.pastM.length, series = [];
  for(const r of top){ const col = wAccColor(r.a);
    series.push({name:r.a.name, color:col, values:[...r.past.map(v=>Math.round(v)), Math.round(r.vNow), ...K.futM.map(()=>null)]});
    series.push({name:r.a.name+' (Prognose)', color:col, dash:true, values:[...K.pastM.map(()=>null), Math.round(r.vNow), ...r.fut.map(v=>Math.round(v))]}); }
  const srcTxt = {plan:'Plan aus Excel', prog:'Prognose (Rechnungen, Daueraufträge, Lohn, Budget)', flat:'keine Planung – bleibt gleich'};
  const hasPlan = top.some(r=>r.src==='plan');
  return `<div class="xcard xw"><div class="ah"><div><h3>Kontotrend in die Zukunft</h3><span class="small muted">Pro Konto · bisher durchgezogen, Zukunft gestrichelt</span></div></div>
    ${chart({label:'Kontostand pro Konto: bisher und Prognose', h:240, labels, tips, series})}
    <div class="ktleg">${top.map(r=>`<div class="ktrow"><i style="background:${wAccColor(r.a)}"></i><span class="sp"><b>${esc(r.a.name)}</b><span class="small muted">${srcTxt[r.src]}</span></span>
      <span class="num small">${signChf(Math.round(r.vNow))}</span><span class="num small bplan ${r.end<0?'out':''}">→ ${signChf(Math.round(r.end))}</span></div>`).join('')}</div>
    <p class="small muted" style="margin:6px 0 0">Rechts: heute → Ende ${ymLabel(K.futM.at(-1))}. ${hasPlan?'Mit Plan aus Excel startet die Zukunft beim echten Stand von heute und folgt den geplanten Veränderungen.':'Geplante Kontostände kommen aus deiner Excel-Planung: Budget → «Excel-Datei wählen».'}</p></div>`;
}
cardOutlook = (prev => function(){ const h = prev(), k = cardAccTrend(), i = h.indexOf('<div class="xcard xw"><div class="ah"><h3>Monat für Monat');
  return !k ? h : i>=0 ? h.slice(0,i) + k + h.slice(i) : h + k; })(cardOutlook);
