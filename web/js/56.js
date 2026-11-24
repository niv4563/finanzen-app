/* =====================================================================
   64. VERSION 1.37.0 – BUDGET AUS EXCEL: VON–BIS, AUTOMATISCHE ZUORDNUNG
   • Auch Blätter, die nicht im Januar beginnen (z. B. 2025 ab Juni).
   • Nur die Budgettabelle oben zählt; Kontroll- und Kontostandtabellen darunter werden
     übersprungen (ab «Kontostand Anfang Monat» bzw. «Regelprüfung»).
   • Zeitraum Von–Bis (z. B. Juni 2025 bis Oktober 2026), alle Jahresblätter in einem Schritt.
   • Zuordnung automatisch: frühere Zuordnungen, bekannte Begriffe, ähnliche Kategorienamen.
     Neue Kategorien kommen in die Gruppe der Spalte «Übergeordnet» (Fixe Ausgaben, Rückzahlung,
     Persönliche Ausgaben, Sparen). Die Zuordnung lässt sich vor dem Speichern ändern.
   • Gespeichert werden nur die Beträge (verschlüsselt wie alle Daten), nie die Datei.
   ===================================================================== */
var XL_MON = [/^jan/i,/^feb/i,/^(mär|mar|mrz|maer)/i,/^apr/i,/^mai/i,/^jun/i,/^jul/i,/^aug/i,/^sep/i,/^okt/i,/^nov/i,/^dez/i];
var XL_STOP = /^(regelpr[üu]fung|kontostand anfang)/i;
var XL_SKIP2 = /^(ausgaben|einnahmen|summe|differenz|einzahlung|zins|übergeordnet)\s*$/i;
function xlsxPlans2(sheets){
  const out = [];
  for(const sh of sheets){
    const hi = sh.rows.findIndex(r=>r && r.filter(v=>typeof v==='string' && XL_MON.some(rx=>rx.test(v.trim()))).length>=4); if(hi<0) continue;
    const H = sh.rows[hi], cols = []; H.forEach((v,i)=>{ if(typeof v!=='string') return; const m = XL_MON.findIndex(rx=>rx.test(v.trim())); if(m>=0 && !cols.some(c=>c.m===m)) cols.push({i, m}); });
    const first = Math.min(...cols.map(c=>c.i));
    const ym = (sh.name+' '+sh.rows.slice(0,hi).flat().filter(x=>typeof x==='string').join(' ')).match(/20\d{2}/g), year = ym ? ym.at(-1) : null; if(!year) continue;
    const pos = []; let sec = '';
    for(const r of sh.rows.slice(hi+1)){ if(!r) continue;
      const pre = r.slice(0, first).map(v=>typeof v==='string' ? v.trim() : '').filter(Boolean), lab = pre.at(-1);
      if(pre.length>=2) sec = pre.at(-2);
      if(pre.some(x=>XL_STOP.test(x))) break;
      if(!lab) continue;
      const vals = {}; let any = false;
      for(const c of cols){ const v = r[c.i]; if(typeof v==='number' && v){ vals[year+'-'+String(c.m+1).padStart(2,'0')] = r2(v); any = true; } }
      if(any) pos.push({lab, sec, vals});
    }
    if(pos.length) out.push({sheet:sh.name, year, pos, months:cols.map(c=>year+'-'+String(c.m+1).padStart(2,'0')).sort()});
  }
  return out;
}
var xlGroup = (lab, sec) => /fix/i.test(sec) ? 'fix' : /rückzahl|ruckzahl|kredit|schuld/i.test(sec+' '+lab) ? 'schulden' : /spar|anleg|vorsorge|invest|3a|säule/i.test(sec+' '+lab) ? 'spar'
  : /lebensmittel|coiffeur|körper|haushalt|gesundheit|kleidung|miete|versicherung/i.test(lab) ? (/fix/i.test(sec)?'fix':'leben') : 'freizeit';
function xlAuto(lab, sec){
  if(XL_SKIP.test(lab) || XL_SKIP2.test(lab)) return '_skip';
  const learned = D.settings?.xlMap?.[lab]; if(learned && (learned==='_skip' || learned==='_inc' || D.cats.some(c=>c.id===learned && !c.deleted))) return learned;
  for(const [rx,id] of XL_MAP) if(rx.test(lab) && (id==='_inc' || D.cats.some(c=>c.id===id))) return id;
  // ähnlicher Name (Wort für Wort), bevorzugt in der passenden Gruppe
  const XW = ['ausgaben','diverse','andere','aktivitaten','unreg','sonstige','weitere'], toks = fcTok(lab).filter(w=>!XW.includes(w)), g = xlGroup(lab, sec);
  let best = null, bs = 0;
  for(const c of D.cats.filter(c=>!c.deleted && !['_inc','_offen','_tr'].includes(c.id))){ const ct = fcTok(c.name).filter(w=>!XW.includes(w)); let s = 0;
    for(const w of toks) if(ct.some(v=>v===w || (v.length>=5 && w.length>=5 && v.slice(0,5)===w.slice(0,5)))) s += 2;
    if(s && c.group===g) s += 1; if(s>bs){ bs = s; best = c; } }
  return bs>=2 ? best.id : '_new';
}
xlsxPlanImport = async function(file){
  let plans; try{ plans = xlsxPlans2(await xlsxRead(await file.arrayBuffer())); }catch(e){ alert('Excel konnte nicht gelesen werden: '+(e.message||e)); return; }
  if(!plans.length){ alert('In dieser Excel-Datei wurde keine Budgettabelle mit Monaten gefunden.'); return; }
  const allM = plans.flatMap(p=>p.months).sort(), first = allM[0], last = allM.at(-1);
  // Vorschlag: ab dem laufenden Monat bis zum Ende der Datei (wenn sie in die Zukunft reicht), sonst die ganze Datei
  const fut = last >= TODAY, vonDef = fut ? (first > TODAY ? first : TODAY) : first, bisDef = last;
  const rows = []; for(const p of plans) for(const x of p.pos) if(!rows.some(y=>y.lab===x.lab)) rows.push({lab:x.lab, sec:x.sec});
  const sumIn = (lab, von, bis) => plans.reduce((s,p)=>s+p.pos.filter(x=>x.lab===lab).reduce((t,x)=>t+Object.entries(x.vals).reduce((a,[m,v])=>a+(m>=von&&m<=bis?v:0),0),0),0);
  const mapping = rows.map(r=>({...r, id:xlAuto(r.lab, r.sec)}));
  const nNew = mapping.filter(m=>m.id==='_new').length, nSkip = mapping.filter(m=>m.id==='_skip').length, nOk = mapping.length - nNew - nSkip;
  const opt = m => `<select id="xa${mapping.indexOf(m)}"><option value="_skip" ${m.id==='_skip'?'selected':''}>– nicht übernehmen –</option><option value="_new" ${m.id==='_new'?'selected':''}>Neue Kategorie (${GROUPS[xlGroup(m.lab,m.sec)]?.n||''})</option><option value="_inc" ${m.id==='_inc'?'selected':''}>Einkommen</option>${catOptions(['_skip','_new','_inc'].includes(m.id)?'':m.id)}</select>`;
  dialog(`<h3>Budget aus Excel übernehmen</h3>
    <p class="small muted" style="margin-top:-8px">Blätter wählen und den Zeitraum. Monate ausserhalb bleiben, wie sie sind.</p>
    ${plans.map((p,i)=>`<label class="li acl"><span class="sp"><b>${esc(p.sheet)}</b> · ${ymShort(p.months[0])} ${p.months[0].slice(0,4)} – ${ymShort(p.months.at(-1))} ${p.year} · ${p.pos.length} Zeilen</span><input type="checkbox" class="sw xsh2" data-i="${i}" checked></label>`).join('')}
    <div class="grid g2" style="gap:0 12px"><label class="f">Von<input type="month" id="xvon" value="${vonDef}" min="${first}" max="${last}"></label><label class="f">Bis<input type="month" id="xbis" value="${bisDef}" min="${first}" max="${last}"></label></div>
    <div class="chips" style="padding:0;margin:-2px 0 6px">${fut?`<button type="button" class="chip" data-act="xrange" data-v="${first>TODAY?first:TODAY}|${last}">Ab jetzt</button>`:''}${first<TODAY?`<button type="button" class="chip" data-act="xrange" data-v="${first}|${ymAdd(TODAY,-1)<last?ymAdd(TODAY,-1):last}">Nur Vergangenheit</button>`:''}<button type="button" class="chip" data-act="xrange" data-v="${first}|${last}">Ganze Datei</button></div>
    <p class="small muted" style="margin-top:-4px">Monate vor «Von» und nach «Bis» bleiben, wie sie sind.</p>
    <div class="card" style="padding:10px 12px;margin:8px 0"><b>Zuordnung automatisch</b><p class="small muted" style="margin:4px 0 0">${nOk} Zeilen zu bestehenden Kategorien · ${nNew} neue Kategorien · ${nSkip} Summen- und Kontrollzeilen ausgelassen</p>
      <details class="mt"><summary class="small">Zuordnung ansehen oder ändern</summary>
      ${mapping.map(m=>`<label class="f"><span><b style="color:var(--ink)">${esc(m.lab)}</b>${m.sec?` <span class="muted">· ${esc(m.sec)}</span>`:''} · CHF ${chf0(sumIn(m.lab, vonDef, bisDef))}</span>${opt(m)}</label>`).join('')}</details></div>
    ${chk('xzero2',true,'Andere Kategorien im gewählten Zeitraum auf 0 setzen (die Excel-Datei gilt als vollständig)')}${xlBalPlans().length?chk('xbal',true,'Geplante Kontostände übernehmen (Kontotrend in die Zukunft)'):''}${acts(true)}`,
  ()=>{
    const sel = [...document.querySelectorAll('.xsh2:checked')].map(x=>plans[+x.dataset.i]); let von = val('xvon'), bis = val('xbis');
    if(!sel.length || !/^\d{4}-\d{2}$/.test(von) || !/^\d{4}-\d{2}$/.test(bis)) return false;
    if(von>bis) [von,bis] = [bis,von];
    const map = {}; mapping.forEach((m,i)=>{ map[m.lab] = $('#xa'+i)?.value || m.id; });
    const zero = $('#xzero2').checked, bal = !!$('#xbal')?.checked;
    setTimeout(()=>{ xlsxApply2(sel, von, bis, map, mapping, zero); if(bal) xlBalApply(von, bis); }, 30);
  });
};
function xlsxApply2(sel, von, bis, map, mapping, zero){
  const snap = JSON.stringify(D);
  D.settings.xlMap ??= {};
  // nur Zeilen mit Beträgen im gewählten Zeitraum anlegen (z. B. keine Kategorien aus 2025, wenn ab November 2026 übernommen wird)
  const inRange = lab => sel.some(p=>p.pos.some(x=>x.lab===lab && Object.entries(x.vals).some(([m,v])=>m>=von && m<=bis && v)));
  for(const m of mapping){ let id = map[m.lab];
    if(id==='_new' && !inRange(m.lab)){ map[m.lab] = '_skip'; continue; }
    if(id==='_new'){ const ex = D.cats.find(c=>bkNorm(c.name)===bkNorm(m.lab.replace(/\s*\(.*$/,'')));
      if(ex) id = ex.id; else { id = 'c'+uid(); D.cats.push({id, name:m.lab.replace(/[,…\s]+$/,'').slice(0,40), group:xlGroup(m.lab, m.sec), acc:null, keep:true}); } }
    map[m.lab] = id; D.settings.xlMap[m.lab] = id; }
  const touched = new Set(), months = new Set(), sums = {}, inc = {};
  for(const p of sel) for(const x of p.pos){ const id = map[x.lab]; if(!id || id==='_skip') continue;
    for(const [m,v] of Object.entries(x.vals)){ if(m<von || m>bis) continue; months.add(m);
      if(id==='_inc') inc[m] = (inc[m]||0) + v; else { (sums[id] ??= {}); sums[id][m] = (sums[id][m]||0) + v; } } }
  for(const p of sel) for(const m of p.months) if(m>=von && m<=bis) months.add(m);
  for(const m of months) if(inc[m]) D.income[m] = r2(inc[m]);
  for(const id in sums){ touched.add(id); const c = D.cats.find(c=>c.id===id); if(c) c.archived = false; (D.plan[id] ??= {});
    for(const m of months){ const v = sums[id][m]||0; if(v) D.plan[id][m] = r2(v); else delete D.plan[id][m]; } }
  if(zero) for(const c of D.cats){ if(touched.has(c.id) || c.id==='rueck' || c.id==='leute' || !D.plan[c.id]) continue; for(const m of months) delete D.plan[c.id][m]; }
  calc();
  S.undo = {snap, label:`Budget ${ymLabel(von)} – ${ymLabel(bis)} aus Excel`};
  S.view = 'budget'; S.ym = bis; S.year = bis.slice(0,4); S.bpm = 'y';
  save(); render();
  toastMsg(`Budget ${ymLabel(von)} – ${ymLabel(bis)} übernommen (${months.size} Monate, ${touched.size} Kategorien)`);
}
