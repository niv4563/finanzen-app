/* =====================================================================
   69. 50 · 30 · 20 – ZIEL PRO JAHR UND % IN JEDEM MONAT
   • Bedarf = Grundbedürfnisse + Fixkosten · Wünsche = Persönliche Wünsche + Freizeit · Sparen = Sparen & Vorsorge
   • Ziel pro Jahr einstellbar (Standard 50 · 30 · 20). Ausnahme 2027: 50 · 20 · 30 (mehr sparen).
   • Monat: Karte mit geplant und effektiv gegenüber Ziel. Jahresübersicht: Zeilen mit % pro Monat.
   ===================================================================== */
var R3 = [
  {k:'bed', n:'Bedarf',  sub:'Grundbedürfnisse + Fixkosten', gs:['leben','fix'],   c:'var(--fix)',  up:false},
  {k:'wun', n:'Wünsche', sub:'Persönliche Wünsche + Freizeit', gs:['wunsch','frei'], c:'var(--frei)', up:false},
  {k:'spa', n:'Sparen',  sub:'Sparen & Vorsorge',              gs:['spar'],          c:'var(--spar)', up:true},
];
migrate = (prev => function(d){ const r = prev(d); try{ if(r){ r.flags ??= {}; r.settings ??= {};
  if(!r.flags.r532){ r.settings.r532 ??= {def:[50,30,20], '2027':[50,20,30]}; r.flags.r532 = true; } } }catch(e){} return r; })(migrate);
var rTgt = y => { const s = D.settings?.r532 || {}; return s[y] || s.def || [50,30,20]; };
var r3Of = c => R3.findIndex(b=>b.gs.includes(gSec(c).k));
// Anteile eines Monats: geplant (Budget) und effektiv (Buchungen), je vom Einkommen
function r3Month(ym){
  const m = C.m[ym]; if(!m) return null; const pl = [0,0,0], is = [0,0,0];
  for(const c of D.cats){ const i = r3Of(c); if(i<0) continue; pl[i] += m.plan?.[c.id]||0; is[i] += Math.max(0, C.ist[c.id]?.[ym]||0); }
  const inc = m.inc || 0, incI = (m.incIst!=null && m.incIst>0) ? m.incIst : inc;
  return {inc, pl, is, pp: pl.map(v=>inc? v/inc*100 : null), ip: is.map(v=>incI? v/incI*100 : null), hasIst: ym<=TODAY && is.some(v=>v>0)};
}
// gut = Bedarf/Wünsche höchstens Ziel, Sparen mindestens Ziel (2 Prozentpunkte Spielraum)
var r3Col = (i, p, t) => p==null ? '' : (R3[i].up ? p >= t-2 : p <= t+2) ? 'var(--ok)' : (R3[i].up ? p >= t-7 : p <= t+7) ? 'var(--warn)' : 'var(--bad)';
var p0 = v => v==null ? '–' : Math.round(v)+' %';

function r3Card(ym){
  const y = ym.slice(0,4), t = rTgt(y), r = r3Month(ym); if(!r) return '';
  const bar = i => { const pp = r.pp[i], ip = r.ip[i];
    return `<div class="r3row"><div class="r3h"><span><i class="gdot" style="background:${R3[i].c}"></i><b>${R3[i].n}</b> <span class="small muted">${R3[i].sub}</span></span>
        <span class="small">Ziel <b>${t[i]} %</b></span></div>
      <div class="r3bar"><i style="width:${Math.min(100,pp||0)}%;background:${r3Col(i,pp,t[i])}"></i><b style="left:${t[i]}%" title="Ziel ${t[i]} %"></b></div>
      <div class="r3v small"><span>geplant <b style="color:${r3Col(i,pp,t[i])}">${p0(pp)}</b> · CHF ${chf0(r.pl[i])}</span>${r.hasIst?`<span>effektiv <b style="color:${r3Col(i,ip,t[i])}">${p0(ip)}</b> · CHF ${chf0(r.is[i])}</span>`:''}</div></div>`; };
  const off = R3.map((b,i)=>{ const d = Math.round((r.pp[i]??0) - t[i]); return Math.abs(d)>2 ? `${b.n} ${d>0?'+':''}${d} %` : null; }).filter(Boolean);
  return `<div class="card mt r3card"><div class="row"><h3 class="sp" style="margin:0">Ziel ${t.join(' · ')} für ${y}</h3><button class="btn sm ghost" data-act="r532" data-y="${y}">Ziel ändern …</button></div>
    <p class="small muted" style="margin:4px 0 10px">Anteil vom Einkommen: Bedarf · Wünsche · Sparen. Der Strich zeigt das Ziel.</p>
    ${R3.map((b,i)=>bar(i)).join('')}
    <p class="small ${off.length?'':'muted'}" style="margin:8px 0 0">${off.length?`Abweichung vom Ziel: ${off.join(' · ')}. Muss-Beträge bleiben fix – angepasst wird bei Brauch und Will.`:'Das Budget entspricht dem Ziel.'}</p></div>`;
}
vBudgetMonat = (prev => function(tabs){ const h = prev(tabs); const i = h.indexOf('<details class="card mt bsec');
  return i<0 ? h : h.slice(0,i) + r3Card(S.ym) + h.slice(i); })(vBudgetMonat);

vBudgetJahr = (prev => function(tabs){
  const h = prev(tabs), y = S.year, ms = vis(C.months.filter(m=>m.startsWith(y))); if(!ms.length) return h;
  const t = rTgt(y), cur = m => m===TODAY?'cur':'', R = Object.fromEntries(ms.map(m=>[m, r3Month(m)]));
  const yIncP = ms.reduce((s,m)=>s+(R[m]?.inc||0),0), yIncI = ms.filter(m=>R[m]?.hasIst).reduce((s,m)=>s+(C.m[m].incIst>0?C.m[m].incIst:R[m].inc),0);
  let rows = `<tr class="ygrp r3head"><td>Ziel ${t.join(' · ')} <a class="link small" data-act="r532" data-y="${y}">ändern</a></td>${ms.map(m=>`<td class="${cur(m)}"></td>`).join('')}<td class="tot"></td></tr>`;
  R3.forEach((b,i)=>{
    const yp = yIncP ? ms.filter(m=>R[m]?.inc>0).reduce((s,m)=>s+R[m].pl[i],0)/yIncP*100 : null, yi = yIncI ? ms.filter(m=>R[m]?.hasIst).reduce((s,m)=>s+R[m].is[i],0)/yIncI*100 : null;
    const cell = (pp, ip, has) => `<span class="r3p" style="color:${r3Col(i,pp,t[i])}">${p0(pp)}</span>${has?`<span class="r3i" style="color:${r3Col(i,ip,t[i])}">eff. ${p0(ip)}</span>`:''}`;
    rows += `<tr class="ycat r3"><td><i class="gdot" style="background:${b.c}"></i>${b.n} <span class="small muted">Ziel ${t[i]} %</span></td>${ms.map(m=>{ const r = R[m]; return `<td class="num ${cur(m)}" title="${b.sub}">${r?cell(r.pp[i], r.ip[i], r.hasIst):''}</td>`; }).join('')}<td class="num tot">${cell(yp, yi, yi!=null)}</td></tr>`;
  });
  // nach der Zeile «Differenz» einfügen
  const k = h.indexOf('<tr class="yrest ydiff">'); if(k<0) return h; const e = h.indexOf('</tr>', k) + 5;
  return h.slice(0,e) + rows + h.slice(e);
})(vBudgetJahr);

// Ziel ändern
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act="r532"]'); if(!a || !D) return; e.stopPropagation(); e.preventDefault();
  const y = a.dataset.y, t = rTgt(y), s = (D.settings.r532 ??= {def:[50,30,20]}), own = !!s[y];
  dialog(`<h3>Ziel für ${y}</h3><p class="small muted">Anteil vom Einkommen. Zusammen 100 %.</p>
    <div class="grid g3" style="gap:0 10px">${R3.map((b,i)=>`<label class="f">${b.n} %<input id="r3_${i}" inputmode="numeric" value="${t[i]}"></label>`).join('')}</div>
    <fieldset class="scope"><legend class="small muted">Gilt für</legend>
      <label><input type="radio" name="r3s" value="y" ${own?'checked':''}> nur ${y} (Ausnahme)</label>
      <label><input type="radio" name="r3s" value="d" ${own?'':'checked'}> alle Jahre ohne eigene Ausnahme</label></fieldset>
    ${own?`<p class="small"><a class="link" data-dlg="r3del">Ausnahme ${y} entfernen (wieder ${(s.def||[50,30,20]).join(' · ')})</a></p>`:''}
    ${acts(true)}`,
  k=>{ if(k==='r3del'){ delete s[y]; return; }
    const v = [0,1,2].map(i=>Math.round(parseFloat(String(val('r3_'+i)).replace(',','.'))||0));
    if(v.some(x=>x<0) || v[0]+v[1]+v[2]!==100){ toastMsg(`Zusammen müssen es 100 % sein (jetzt ${v[0]+v[1]+v[2]} %).`); return false; }
    if(document.querySelector('input[name="r3s"]:checked')?.value==='y') s[y] = v; else { s.def = v; delete s[y]; } });
}, true);
