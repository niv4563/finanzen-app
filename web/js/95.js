/* =====================================================================
   95. KASTEN SCHÄTZEN (1.68.0)
   Beim Antippen eines Kastens im Geldfluss: «Schätzen». Pro Kategorie des Kastens
   stehen die bezahlten Beträge der Vorjahre, die letzten 12 Monate, bekannte
   Jahreskosten und Monatskosten (Daueraufträge, Abos). Daraus ein Betrag pro Monat,
   den man übernehmen oder ändern kann – gültig ab einem wählbaren Monat.
   ===================================================================== */

// Kategorien eines Kastens (Ausgaben, Empfänger, Sammel-Kasten, Konto)
function schCats(n){
  if(!n) return [];
  // nur Kosten: kein Einkommen, kein Sparen, keine Kartenabzahlung
  const ok = c => D.cats.some(x=>x.id===c && !x.archived && x.group!=='inc' && x.group!=='spar' && !isDebtC(x));
  let cs = [];
  if(n.t==='exp') cs = flExpCats(n);
  else if(isColl(n)) cs = n.cats || [];
  else if(n.t==='acc' || n.t==='pot'){ for(const e of flOut(n.id)){ const t = flN(e.t); if(e.mode==='kat') cs.push(...(e.cats||[])); if(t && t.t==='exp') cs.push(...flExpCats(t)); else if(t && (isExt(t) || isColl(t))) cs.push(...(t.cats||[])); } }
  if(isExt(n)) cs = n.cats || [];
  return [...new Set(cs)].filter(ok);
}

// Bezahlte Beträge pro Kategorie und Monat (ein Durchgang über alle Buchungen)
function schPaid(){
  const by = {}, from = (+TODAY.slice(0,4) - 4) + '-01';
  for(const t of D.tx){ if(!t.d || t.planned || t.vorm || t.d < from) continue; const v = kSpend(t); if(!v) continue; const c = bhKey(t.c); if(!c || c==='_offen') continue;
    const ym = t.d.slice(0,7); (by[c] ??= {})[ym] = (by[c][ym]||0) + v; }
  const first = D.tx.reduce((a,t)=>t.d && !t.planned && !t.vorm && t.d < a ? t.d : a, '9999').slice(0,7);
  return {by, first};
}
function schCalc(cats){
  const P = schPaid(), Y = +TODAY.slice(0,4), R = bvorCalc(), rowOf = c => R.rows.find(x=>x.c===c);
  const ms12 = Array.from({length:12}, (_,i)=>ymAdd(TODAY, i-12));
  return cats.map(cid=>{ const c = D.cats.find(x=>x.id===cid), m = P.by[cid] || {};
    const yrs = []; for(let y = Y-3; y < Y; y++){ const s = `${y}-01`, e = `${y}-12`; if(P.first > e) continue;   // Jahr vor der ersten Buchung: nicht zählen
      const tot = Object.entries(m).filter(([k])=>k>=s && k<=e).reduce((a,[,v])=>a+v,0), full = P.first <= s;
      const mons = Object.entries(m).filter(([k,v])=>k>=s && k<=e && v>1).map(([k])=>+k.slice(5));
      yrs.push({y, tot, full, mons}); }
    const ytd = Object.entries(m).filter(([k])=>k>=`${Y}-01` && k<TODAY).reduce((a,[,v])=>a+v,0);
    const l12 = ms12.filter(x=>x>=P.first).reduce((a,x)=>a+(m[x]||0),0), n12 = ms12.filter(x=>x>=P.first).length;
    const kn = bvKnown(c), jk = kn.items.filter(i=>/^Jahreskosten/.test(i.w)), mk = kn.items.filter(i=>!/^Jahreskosten/.test(i.w));
    // Regelmässige Kosten, die erst im Lauf eines Jahres begonnen haben: nur über die Monate seit Beginn rechnen
    const cf = Object.keys(m).filter(k=>m[k]>1).sort()[0] || '9999';
    const startIn = y => { if(!cf.startsWith(y+'-')) return 0; const nm = 13 - +cf.slice(5,7); const paid = Object.keys(m).filter(k=>k.startsWith(y+'-') && m[k]>1).length; return nm >= 2 && nm <= 10 && paid >= nm*0.8 ? nm : 0; };
    const full = yrs.filter(x=>x.full && x.tot > 1 && !startIn(x.y)), last = yrs.filter(x=>x.full).slice(-1)[0];
    const opts = [];
    if(last && last.tot > 1){ const nm = startIn(last.y);
      opts.push(nm ? {k:'vj', l:`Vorjahr ${last.y} (ab ${MN[12-nm]})`, v:last.tot/nm, d:`CHF ${chf0(last.tot)} in ${nm} Monaten`} : {k:'vj', l:`Vorjahr ${last.y}`, v:last.tot/12, d:`CHF ${chf0(last.tot)} im Jahr ÷ 12`}); }
    else { const part = yrs.filter(x=>!x.full && x.tot > 1).slice(-1)[0];   // Vorjahr erst ab Mitte Jahr erfasst: auf 12 Monate hochrechnen
      if(part){ const nm = 13 - +P.first.slice(5,7); if(nm >= 4) opts.push({k:'vj', l:`Vorjahr ${part.y} (${nm} Mt.)`, v:part.tot/nm, d:`CHF ${chf0(part.tot)} in ${nm} Monaten`}); } }
    if(full.length >= 2) opts.push({k:'avg', l:`Ø ${full[0].y}–${full.at(-1).y}`, v:full.reduce((a,x)=>a+x.tot,0)/full.length/12, d:`${full.length} Jahre, Ø CHF ${chf0(full.reduce((a,x)=>a+x.tot,0)/full.length)} pro Jahr ÷ 12`});
    if(l12 > 1) opts.push({k:'l12', l:'Letzte 12 Monate', v:l12/(n12||12), d:`CHF ${chf0(l12)} in ${n12} Monaten`});
    if(kn.sum > 0.5) opts.push({k:'kn', l:'Jahres- & Monatskosten', v:kn.sum, d:kn.items.map(i=>`${i.n} ${chf0(i.v)}/Mt.`).join(' · ')});
    const row = rowOf(cid);
    // Schätzung: bekannte Preise zuerst; sonst bei Steuern und Einmaligem der höhere Wert aus Vorjahr und letzten 12 Monaten; sonst der Vorschlag aus den Zahlungen
    let est, why;
    if(kn.sum > 0.5 && !(isTaxC(c) && last && last.tot/12 > kn.sum*1.1)){ est = kn.sum; why = 'aus Jahres- und Monatskosten'; }
    else if(isTaxC(c) || row?.kind==='einmalig/jährlich'){ const cand = opts.filter(o=>o.k!=='kn').sort((a,b)=>b.v-a.v)[0]; est = cand?.v || 0; why = cand ? `${cand.l} – bei Steuern und Jahresrechnungen der höhere Wert, damit es reicht` : ''; }
    else if(row){ est = row.prop; why = row.kind==='regelmässig' ? 'Schnitt, die letzten 6 Monate zählen mehr' : 'Schnitt der letzten Monate'; }
    else { const o = opts[0]; est = o?.v || 0; why = o?.l || 'keine Zahlungen gefunden'; }
    const nx = geltAb(), cur = +(D.plan?.[cid]?.[nx]) || 0;
    if(!(est > 0.5) && cur){ est = cur; why = 'keine Zahlungen gefunden – Budget wie bisher'; }
    return {c:cid, name:c?.name || catName(cid), g:c ? gSec(c).n : '', tax:isTaxC(c), yrs, ytd, l12, n12, jk, mk, opts, est:r50(est), why, cur, basis:row?.basis || ''};
  });
}

function schDialog(nid, cs, title){
  const n = nid ? flN(nid) : null, cats = cs || schCats(n);
  if(!cats.length){ toastMsg('Dieser Kasten hat keine Budget-Kategorien – zuerst Kategorien zuordnen'); return; }
  const dl = $('#dlg'); dl.classList.add('aiw'); dl.addEventListener('close', ()=>dl.classList.remove('aiw'), {once:true});
  const rows = schCalc(cats), from = geltAb(), Y = +TODAY.slice(0,4), fm = schPaid().first;
  const yrCell = (x, y) => { const r = x.yrs.find(z=>z.y===y); return r ? `<td class="num">${r.tot>1?chf0(r.tot):'–'}</td>` : '<td class="num muted">–</td>'; };
  const ys = [Y-3, Y-2, Y-1].filter(y=>rows.some(x=>x.yrs.some(z=>z.y===y)));
  const tr = (x, i) => `<tr class="${x.tax?'bvtax':''}"><td><b>${esc(x.name)}</b><span class="small muted bvg">${esc(x.g)}</span>
      ${x.jk.length?`<div class="small">Jahreskosten: ${x.jk.map(j=>`${esc(j.n)} <b>${chf0(j.v*12)}</b>/Jahr`).join(' · ')}</div>`:''}
      ${x.mk.length?`<div class="small">Monatskosten: ${x.mk.map(j=>`${esc(j.n)} <b>${chf0(j.v)}</b>/Mt.`).join(' · ')}</div>`:''}
      ${x.yrs.filter(r=>r.mons.length && r.mons.length<=4).slice(-1).map(r=>`<div class="small muted">${r.y} bezahlt im ${r.mons.map(mm=>MN[mm-1]).join(', ')}</div>`).join('')}
      <div class="small schopts">${x.opts.map(o=>`<button type="button" class="lnk" data-schv="${i}" data-v="${r50(o.v)}" title="${esc(o.d)}">${esc(o.l)}: ${chf0(r50(o.v))}</button>`).join(' · ')}</div>
      <div class="small muted">Schätzung ${esc(x.why)}</div></td>
    ${ys.map(y=>yrCell(x, y)).join('')}<td class="num">${x.l12>1?chf0(x.l12):'–'}</td><td class="num">${x.cur?chf0(x.cur):'–'}</td>
    <td class="num"><input class="bvi" data-schi="${i}" inputmode="decimal" value="${x.est||''}" placeholder="0" aria-label="Schätzung ${esc(x.name)} pro Monat"></td></tr>`;
  const sum = () => [...document.querySelectorAll('[data-schi]')].reduce((a,i)=>a + (parseNum(i.value)||0), 0);
  dialog(`<h3>Schätzen: ${esc(title || flName(n))}</h3>
    <p class="small muted" style="margin-top:-6px">Betrag pro Monat ${cats.length===1 ? '' : `für jede Kategorie ${n ? 'in diesem Kasten ' : ''}`}– aus deinen Zahlungen der Vorjahre und der letzten 12 Monate, bekannten Jahreskosten (÷ 12) und Monatskosten (Daueraufträge, Abos). Tippe auf einen Wert, um ihn zu übernehmen, oder trag selbst etwas ein. Ein leeres Feld lässt das Budget, wie es ist. Auf 10 Franken gerundet.</p>
    <div class="row" style="gap:8px;align-items:center;margin-bottom:8px"><label class="small" for="schfrom">Gilt ab</label><select id="schfrom" class="sm">${geltAbOpts(from)}</select></div>
    <div class="aitbl"><table><thead><tr><th>Kategorie</th>${ys.map(y=>`<th class="num">${y}${fm.startsWith(y+'-') && fm.slice(5,7)!=='01' ? `<br><span class="small muted">ab ${MN[+fm.slice(5,7)-1]}</span>` : ''}</th>`).join('')}<th class="num">letzte 12 Mt.</th><th class="num">Budget bisher</th><th class="num">Schätzung / Monat</th></tr></thead>
    <tbody>${rows.map(tr).join('')}</tbody><tfoot><tr><td><b>Zusammen pro Monat</b></td>${ys.map(()=>'<td></td>').join('')}<td></td><td class="num">${chf0(rows.reduce((a,x)=>a+x.cur,0))}</td><td class="num"><b id="schsum"></b></td></tr></tfoot></table></div>
    <p class="small muted">Übernehmen setzt das Budget dieser Kategorien ab dem gewählten Monat für alle folgenden Monate – Planen, Übersicht und Geldfluss rechnen gleich damit.</p>
    <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Schätzung übernehmen</button></div>`,
  k=>{ if(k!=='ok') return; const f = $('#schfrom')?.value || from, ms = (C?.months||[]).filter(m=>m>=f); let ch = 0;
    for(const i of document.querySelectorAll('[data-schi]')){ const x = rows[+i.dataset.schi], s = i.value.trim(); if(s==='') continue;   // leer = Budget bleibt
      const v = parseNum(s); if(!isFinite(v) || v < 0){ i.style.borderColor = 'var(--bad)'; return false; }
      const val = r50(v), same = ms.every(m=>Math.abs((+(D.plan?.[x.c]?.[m])||0) - val) < 0.005); if(same) continue;
      for(const m of ms){ D.plan[x.c] ??= {}; if(val) D.plan[x.c][m] = val; else delete D.plan[x.c][m]; } ch++; }
    if(!ch){ toastMsg('Nichts geändert'); return; }
    geltAbSet(f); flSync(); save(); render(); toastMsg(`Schätzung für ${ch} Kategorie${ch===1?'':'n'} ab ${ymLabel(f)} übernommen`); });
  const upd = () => { const el = $('#schsum'); if(el) el.textContent = 'CHF ' + chf0(sum()); };
  dl.querySelectorAll('[data-schi]').forEach(i=>{ i.addEventListener('input', upd); i.addEventListener('change', ()=>{ const v = parseNum(i.value); if(isFinite(v) && v > 0) i.value = r50(v); upd(); }); });
  dl.querySelectorAll('[data-schv]').forEach(b=>b.addEventListener('click', ev=>{ ev.preventDefault(); ev.stopPropagation(); const i = dl.querySelector(`[data-schi="${b.dataset.schv}"]`); if(i){ i.value = b.dataset.v; upd(); } }));
  upd();
}

// Link «Schätzen» in jedem Kasten-Dialog
function schLink(nid){ const n = flN(nid); if(!n || !flCanEdit() || n.t==='inc' || !schCats(n).length) return;
  const ac = document.querySelector('#dlgbody .acts'); if(!ac || document.querySelector('#dlgbody .schlink')) return;
  ac.insertAdjacentHTML('beforebegin', `<p class="small schlink"><a class="link" data-act="flsch" data-id="${esc(nid)}">Schätzen – aus Vorjahren, Jahres- und Monatskosten ›</a></p>`); }
flNodeDialog = (prev => function(nid){ const r = prev.apply(this, arguments); try{ schLink(nid); }catch(e){} return r; })(flNodeDialog);
extDialog = (prev => function(nid){ const r = prev.apply(this, arguments); try{ schLink(nid); }catch(e){} return r; })(extDialog);
collDialog = (prev => function(nid){ const r = prev.apply(this, arguments); try{ if(nid) schLink(nid); }catch(e){} return r; })(collDialog);
window.addEventListener('click', ev=>{ const a = ev.target.closest?.('[data-act="flsch"]'); if(!a || !D) return; ev.stopPropagation(); ev.preventDefault();
  const id = a.dataset.id; $('#dlg')?.close(); setTimeout(()=>schDialog(id), 30); }, true);

// 1.69: auch für eine einzelne Budget-Kategorie (Budget › Übersicht und Planen, Kategorie-Übersicht)
var schCatOk = c => { const x = D.cats.find(y=>y.id===c); return !!x && !x.archived && x.group!=='inc' && x.group!=='spar' && !isDebtC(x) && x.id!=='rueck'; };
budgetDialog = (prev => function(c, ym){ const r = prev.apply(this, arguments);
  try{ const ac = document.querySelector('#dlgbody .acts'); if(ac && schCatOk(c) && !document.querySelector('#dlgbody .schlink'))
    ac.insertAdjacentHTML('beforebegin', `<p class="small schlink"><a class="link" data-act="catsch" data-c="${esc(c)}">Schätzen – aus Vorjahren, Jahres- und Monatskosten ›</a></p>`); }catch(e){}
  return r; })(budgetDialog);
vKat = (prev => function(){ let h = prev(); const c = S.katId;
  if(schCatOk(c)) h = h.replace(/(<p class="small"><a class="link" data-act="katback">)/, `<p class="small"><button class="btn sm" data-act="catsch" data-c="${esc(c)}">Budget schätzen – aus Vorjahren, Jahres- und Monatskosten</button></p>$1`);
  return h; })(vKat);
window.addEventListener('click', ev=>{ const a = ev.target.closest?.('[data-act="catsch"]'); if(!a || !D) return; ev.stopPropagation(); ev.preventDefault();
  const c = a.dataset.c; $('#dlg')?.close(); setTimeout(()=>schDialog(null, [c], catName(c)), 30); }, true);
