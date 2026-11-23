/* =====================================================================
   58. VERSION 1.33.0 – BUDGET AUS EXCEL AB EINEM MONAT, MEHRERE JAHRE AUF EINMAL
   • «Budget aus Excel übernehmen»: alle Jahresblätter (z. B. 2026 und 2027) in einem Schritt,
     und erst ab einem gewählten Monat (z. B. ab November 2026). Frühere Monate bleiben unverändert.
   • Die Zuordnung Excel-Zeile → Kategorie gilt für alle Blätter gemeinsam.
   • Die Datei selbst wird nicht gespeichert, nur die Beträge (verschlüsselt wie alle Daten).
   ===================================================================== */
xlsxPlanImport = async function(file){
  let plans; try{ plans = xlsxPlans(await xlsxRead(await file.arrayBuffer())); }catch(e){ alert('Excel konnte nicht gelesen werden: '+(e.message||e)); return; }
  if(!plans.length){ alert('In dieser Excel-Datei wurde keine Tabelle mit den Monaten Jan–Dez gefunden.'); return; }
  // pro Jahr das beste Blatt vorschlagen (z. B. «Budget» vor «Optimierung»)
  const best = {}; plans.forEach((p,i)=>{ const sc = p.pos.length + (/budget|plan/i.test(p.sheet)?50:0) + (/original|ist/i.test(p.sheet)?10:0); if(!best[p.year] || sc > best[p.year].sc) best[p.year] = {i, sc}; });
  const chosen = new Set(Object.values(best).map(b=>b.i));
  const start = TODAY;                                               // Standard: ab dem laufenden Monat
  dialog(`<h3>Budget aus Excel übernehmen</h3>
    <p class="small muted" style="margin-top:-8px">Wähle die Blätter und ab welchem Monat das Budget gelten soll. Frühere Monate bleiben, wie sie sind.</p>
    ${plans.map((p,i)=>`<label class="li acl"><span class="sp"><b>${esc(p.sheet)}</b> · Jahr ${esc(p.year)} · ${p.pos.length} Zeilen</span><input type="checkbox" class="sw xsh" data-i="${i}" ${chosen.has(i)?'checked':''}></label>`).join('')}
    <label class="f">Ab Monat<input type="month" id="xstart" value="${start}"></label>${acts(true)}`,
  ()=>{ const sel = [...document.querySelectorAll('.xsh:checked')].map(x=>plans[+x.dataset.i]), st = val('xstart');
    if(!sel.length || !/^\d{4}-\d{2}$/.test(st)) return false;
    setTimeout(()=>xlsxMapMulti(sel, st), 60); });
};
function xlsxMapMulti(sel, start){
  const guess = lab => { if(XL_SKIP.test(lab)) return '_skip'; for(const [rx,id] of XL_MAP) if(rx.test(lab) && (id==='_inc' || D.cats.some(c=>c.id===id))) return id; const n=bkNorm(lab); return D.cats.find(c=>n.includes(bkNorm(c.name).split(' ')[0]))?.id || '_new'; };
  const labs = [...new Set(sel.flatMap(p=>p.pos.map(x=>x.lab)))];
  const months = p => Array.from({length:12},(_,k)=>p.year+'-'+String(k+1).padStart(2,'0'));
  const total = lab => sel.reduce((s,p)=>s+p.pos.filter(x=>x.lab===lab).reduce((t,x)=>t+x.vals.reduce((a,v,k)=>a+(months(p)[k]>=start?v:0),0),0),0);
  dialog(`<h3>Zuordnung prüfen</h3><p class="small muted" style="margin-top:-8px">Gilt ab ${ymLabel(start)} für: ${sel.map(p=>esc(p.sheet)).join(', ')}. Summen- und Kontrollzeilen sind schon ausgeblendet. Beträge = Summe ab ${ymLabel(start)}.</p>
    ${labs.map((l,i)=>`<label class="f"><span><b style="color:var(--ink)">${esc(l)}</b> · CHF ${chf0(total(l))}</span><select id="xm${i}">
      <option value="_skip" ${guess(l)==='_skip'?'selected':''}>– nicht übernehmen –</option><option value="_new" ${guess(l)==='_new'?'selected':''}>Neue Kategorie anlegen</option>${catOptions(guess(l))}</select></label>`).join('')}
    ${chk('xzero',true,'Kategorien, die nicht in der Datei vorkommen, ab '+ymLabel(start)+' auf 0 setzen')}${acts(true)}`,
  ()=>{
    const snap = JSON.stringify(D), map = {};
    labs.forEach((l,i)=>{ let id = val('xm'+i); if(id==='_new'){ id='c'+uid(); D.cats.push({id, name:l.replace(/\s*\(.*$/,'').slice(0,40), group:/spar|invest|3a|säule/i.test(l)?'spar':/schuld|kredit/i.test(l)?'schulden':/miete|steuer|versicherung|swisscom/i.test(l)?'fix':'freizeit', acc:null, keep:true}); } map[l] = id; });
    const touched = new Set(), allMs = new Set();
    for(const p of sel){
      const ms = months(p).filter(m=>m>=start); if(!ms.length) continue; ms.forEach(m=>allMs.add(m));
      const sums = {}, inc = {};
      for(const x of p.pos){ const id = map[x.lab]; if(!id || id==='_skip') continue;
        months(p).forEach((m,k)=>{ if(m<start) return; if(id==='_inc') inc[m] = (inc[m]||0) + x.vals[k]; else { (sums[id] ??= {}); sums[id][m] = (sums[id][m]||0) + x.vals[k]; } }); }
      if(Object.values(inc).some(v=>v)) for(const m of ms) D.income[m] = r2(inc[m]||0);
      for(const id in sums){ touched.add(id); const c = D.cats.find(c=>c.id===id); if(c) c.archived = false;
        for(const m of ms){ (D.plan[id] ??= {}); const v = sums[id][m]||0; if(v) D.plan[id][m] = r2(v); else delete D.plan[id][m]; } }
    }
    if($('#xzero').checked) for(const c of D.cats){ if(touched.has(c.id) || c.id==='rueck' || c.id==='leute' || !D.plan[c.id]) continue; for(const m of allMs) delete D.plan[c.id][m]; }
    S.undo = {snap, label:'Budget ab '+ymLabel(start)+' aus Excel'}; S.year = start.slice(0,4); S.view = 'budget'; S.bmode = 'jahr';
    toastMsg('Budget ab '+ymLabel(start)+' übernommen');
  });
}
// Knopf auch auf der Budget-Seite
document.addEventListener('click', async e=>{ const a = e.target.closest('[data-act="xlsxplan2"]'); if(!a || !D) return; e.stopPropagation();
  const f = await bkPick('.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', false); if(f[0]) xlsxPlanImport(f[0]); }, true);
vBudgetW = (prev => function(){ const h = prev(); return h + `<div class="card mt"><h3>Budget aus Excel übernehmen</h3><p class="small muted">Deine Excel-Planung einlesen – z. B. ab November für dieses und nächstes Jahr.</p><button class="btn" data-act="xlsxplan2">Excel-Datei wählen</button></div>`; })(vBudgetW);
