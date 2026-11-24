/* =====================================================================
   65. GEPLANTE ZAHLUNGEN NUR AUS ECHTEN WIEDERHOLUNGEN · VERKNÜPFUNGEN · BETRÄGE AUSBLENDEN
   • Geplante bzw. bevorstehende Zahlungen enthalten keine Schätzungen aus dem Budget mehr. Neben
     deinen eigenen geplanten Zahlungen, Rechnungen und Vormerkungen erscheinen nur Kosten, die in
     deinen bisherigen Buchungen regelmässig vorkamen (monatlich, vierteljährlich, halbjährlich, jährlich).
   • Verknüpfungen: Kategorie-Übersicht (Budget, effektiv, geplante Zahlungen, wiederkehrende Kosten,
     Händler, Buchungen); geplante Zahlung zeigt die passenden Buchungen; Buchung zeigt Kategorie,
     Budget und zugehörige geplante Zahlung.
   • Beträge ausblenden (pro Gerät), um Finanzen mit anderen zu besprechen.
   ===================================================================== */

/* ---------- Wiederkehrende Kosten aus den bisherigen Buchungen ---------- */
var RC_F = {M:{lo:24, hi:37, n:3, step:1}, Q:{lo:80, hi:100, n:2, step:3}, H:{lo:165, hi:200, n:2, step:6}, J:{lo:340, hi:390, n:2, step:12}};
var med = a => { const s = a.slice().sort((x,y)=>x-y); return s.length ? s[s.length>>1] : 0; };
function rcAll(){ return acCache('rc', ()=>{
  const today = todayIso(), since = dAdd(today, -460), by = {};
  for(const t of D.tx){ if(t.d<since || isTr(t)) continue; const v = kSpend(t); if(!v || v<5) continue; const k = acMer(t); if(!k || k.length<3) continue; (by[k] ??= []).push({d:t.d, v, c:t.c, n:t.n||t.text||''}); }
  const out = [];
  for(const [k, l0] of Object.entries(by)){
    if(l0.length<2) continue; const m0 = med(l0.map(x=>x.v));
    const l = l0.filter(x=>Math.abs(x.v-m0) <= m0*0.25+2).sort((a,b)=>a.d.localeCompare(b.d)); if(l.length<2) continue;
    const gaps = []; for(let i=1;i<l.length;i++){ const g = dDiff(l[i-1].d, l[i].d); if(g>3) gaps.push(g); } if(!gaps.length) continue;
    const gm = med(gaps), f = Object.keys(RC_F).find(x=>gm>=RC_F[x].lo && gm<=RC_F[x].hi); if(!f || l.length<RC_F[f].n) continue;
    if(gaps.filter(g=>Math.abs(g-gm)<=gm*0.4).length/gaps.length < 0.7) continue;
    const last = l.at(-1).d; if(dDiff(last, today) > gm*2.5) continue;     // seit längerem nicht mehr – vermutlich beendet
    const day = med(l.map(x=>+x.d.slice(8))); let ym = last.slice(0,7), d;
    const at = m => m+'-'+String(Math.min(day, +mEnd(m).slice(8))).padStart(2,'0');
    do { ym = ymAdd(ym, RC_F[f].step); d = at(ym); } while(d < dAdd(today,-5));
    const cc = {}; for(const x of l) if(x.c && x.c!=='_offen') cc[x.c] = (cc[x.c]||0)+1;
    const cat = Object.entries(cc).sort((a,b)=>b[1]-a[1])[0]?.[0] || '_offen', amount = r2(med(l.slice(-3).map(x=>x.v)));
    out.push({key:k, who:niceName(String(l.at(-1).n).split(' · ')[0].slice(0,40)), cat, amount, freq:f, day, next:d, last, n:l.length});
  }
  return out.sort((a,b)=>b.amount-a.amount);
}); }
// schon als geplante Zahlung erfasst (eigene oder aus Wallet)?
function rcCovered(r){
  const ok = (amt, cat, name) => Math.abs(Math.abs(amt)-r.amount) <= r.amount*0.25+2 && ((cat && (cat===r.cat || bhKey(cat)===bhKey(r.cat))) || bkNorm(name||'').includes(r.key.split(' ')[0]));
  return (D.plans||[]).some(p=>!p.off && p.type!=='in' && p.type!=='tr' && (ok(p.amount, p.cat, p.name+' '+(p.match||''))))
    || (D.walletApi?.planned||[]).some(p=>ok(p.v, p.cat && D.cats.find(c=>c.wid===p.cat)?.id, p.n));
}
var rcOpen = () => rcAll().filter(r=>!rcCovered(r));
function rcOcc(from, until){
  const out = [];
  for(const r of rcOpen()){ let ym = r.next.slice(0,7), k = 0;
    while(k++<40){ const d = ym+'-'+String(Math.min(r.day, +mEnd(ym).slice(8))).padStart(2,'0'); if(d>until) break;
      if(d>=from) out.push({d, n:r.who, sub:`wiederkehrend · ${freqName(r.freq)} · ${bkName(r.cat)}`, v:r.amount, c:r.cat==='_offen'?null:r.cat, go:'plaene', est:true, rc:r.key});
      ym = ymAdd(ym, RC_F[r.freq].step); } }
  return out;
}
// Bevorstehende Zahlungen: keine Schätzungen aus dem Budget, dafür erkannte Wiederholungen
upcoming = (prev => function(days=35){
  const today = todayIso(), until = dAdd(today, days), l = prev(days).filter(x=>x.go!=='budget');
  for(const x of rcOcc(dAdd(today,-3), until))
    if(!l.some(y=>Math.abs(dDiff(y.d,x.d))<=6 && (Math.abs(Math.abs(y.v)-x.v) <= x.v*0.2+1 || (y.c && y.c===x.c)))) l.push(x);
  return l.sort((a,b)=>a.d.localeCompare(b.d));
})(upcoming);
// Sicher kommende Abgaben: ebenfalls ohne Budget-Schätzungen
if(typeof ABG_K==='object'){ delete ABG_K.fix; ABG_K.rck = 'wiederkehrend'; }
if(typeof abgCard==='function') abgCard = (prev => function(){
  const real = fcEvents;
  fcEvents = function(until){ const F = real(until); F.list = F.list.filter(x=>x.k!=='fix');
    for(const x of rcOcc(dAdd(todayIso(),1), until)) if(!F.list.some(y=>y.v>0 && Math.abs(dDiff(y.d,x.d))<=6 && Math.abs(y.v-x.v)<=x.v*0.2+1)) F.list.push({...x, k:'rck'});
    F.list.sort((a,b)=>a.d.localeCompare(b.d)); return F; };
  try{ return prev(); } finally { fcEvents = real; }
})(abgCard);

/* ---------- Seite «Geplante Zahlungen» ---------- */
var _aboSug = aboSuggest;
aboSuggest = function(){ if(S._noSug) return []; return rcOpen().map(r=>({name:bkName(r.cat), who:r.who, match:r.key, amount:r.amount, type:'out', cat:r.cat, day:r.day, n:r.n})); };
function planLastTx(p, n=1){
  const amt = Math.abs(p.amount), words = String(p.match||'').split(',').map(s=>bkNorm(s)).filter(Boolean), nm = bkNorm(p.name||'');
  return D.tx.filter(t=>{ const v = Math.abs(t.imp ? t.sa : t.a); if(Math.abs(v-amt) > amt*0.15+0.5) return false;
    if(p.type==='in' ? (t.imp ? t.sa<0 : t.c!=='_inc') : (t.imp ? t.sa>0 : t.c==='_inc')) return false;
    const tn = bkNorm(t.n||t.text||''); return (p.cat && (t.c===p.cat || bhKey(t.c)===p.cat)) || words.some(w=>tn.includes(w)) || (nm.length>=4 && tn.includes(nm)); })
    .sort((a,b)=>b.d.localeCompare(a.d)).slice(0, n);
}
vPlaene = (prev => function(){
  S._noSug = true; let h; try{ h = prev(); } finally { S._noSug = false; }
  (D.plans||[]).forEach((p,i)=>{ const t = planLastTx(p)[0], extra = [t ? `zuletzt ${dShort(t.d)}` : 'noch nie gebucht', p.cat && p.type==='out' ? `<a class="link" data-act="katinfo" data-c="${p.cat}">${esc(bkName(p.cat))} ›</a>` : ''].filter(Boolean).join(' · ');
    h = h.replace(new RegExp(`(data-act="planedit" data-i="${i}">[\\s\\S]*?<div class="wmid"><b>[\\s\\S]*?</b><span>)([\\s\\S]*?)(</span></div>)`), (m,a,b,c)=>a+b+' · '+extra+c); });
  const R = rcOpen();
  const sec = R.length ? `<div class="xcard mt"><div class="ah"><div><h3>Wiederkehrende Kosten aus deinen Buchungen</h3><span class="small muted">Regelmässig bezahlt, aber noch nicht geplant – mit einem Tipp übernehmen</span></div></div>
    ${R.map((r,i)=>`<div class="wrow"><span class="wic" style="background:var(--warn)">${ci(CI.repeat)}</span><div class="wmid"><b>${esc(r.who)}</b><span>${freqName(r.freq)} · ${r.n}× gebucht · zuletzt ${dShort(r.last)} · <a class="link" data-act="katinfo" data-c="${r.cat}">${esc(bkName(r.cat))} ›</a></span></div>
      <div class="wend"><b class="num out">−${chf(r.amount)}</b><span>nächste ~${dShort(r.next)} · <a class="link" data-act="rcadd" data-i="${i}">Übernehmen</a></span></div></div>`).join('')}</div>` : '';
  return h + sec + `<p class="small muted">Hier stehen nur Zahlungen, die du selbst geplant hast (oder in Wallet), und Kosten, die in deinen Buchungen regelmässig vorkamen. Schätzungen aus dem Budget erscheinen hier nicht.</p>`;
})(vPlaene);

/* ---------- Kategorie-Übersicht: alles zu einer Kategorie an einem Ort ---------- */
function katIds(id){ return new Set([id, ...D.cats.filter(x=>x.bud===id).map(x=>x.id)]); }
function vKat(){
  const c = D.cats.find(x=>x.id===S.katId); if(!c) return '<div class="card"><p>Kategorie nicht gefunden.</p></div>';
  const ids = katIds(c.id), y = TODAY.slice(0,4), ms = Array.from({length:12},(_,i)=>ymAdd(TODAY, i-11));
  const istM = m => D.tx.filter(t=>ids.has(t.c) && t.d.startsWith(m)).reduce((s,t)=>s+kSpend(t),0);
  const planM = m => C.m?.[m]?.plan?.[c.id] || 0;
  const rows = ms.map(m=>({m, i:istM(m), p:planM(m)})), mx = Math.max(1, ...rows.map(r=>Math.max(r.i, r.p)));
  const yr = C.months.filter(m=>m.startsWith(y)), pY = yr.reduce((s,m)=>s+planM(m),0), iY = yr.filter(m=>m<=TODAY).reduce((s,m)=>s+istM(m),0);
  const avg = rows.slice(0,11).reduce((s,r)=>s+r.i,0)/11;
  const plans = (D.plans||[]).map((p,i)=>({p,i})).filter(x=>x.p.cat && ids.has(x.p.cat));
  const wpl = (D.walletApi?.planned||[]).filter(p=>p.cat && ids.has(D.cats.find(z=>z.wid===p.cat)?.id));
  const yl = (D.yearly||[]).filter(x=>x.cat && ids.has(x.cat));
  const rc = rcAll().filter(r=>ids.has(r.cat) && !rcCovered(r));
  const mer = {}; for(const t of D.tx){ if(!ids.has(t.c) || t.d < dAdd(todayIso(),-365)) continue; const k = acMer(t) || 'ohne Text'; const o = mer[k] ??= {n:0, s:0, who:t.n}; o.n++; o.s += kSpend(t); }
  const top = Object.entries(mer).sort((a,b)=>b[1].s-a[1].s).slice(0,8);
  const txs = D.tx.filter(t=>ids.has(t.c)).sort((a,b)=>b.d.localeCompare(a.d)).slice(0,15);
  const kids = D.cats.filter(x=>x.bud===c.id), par = c.bud && D.cats.find(x=>x.id===c.bud);
  const link = x => `<a class="link" data-act="katinfo" data-c="${x.id}">${esc(x.name)}</a>`;
  return `<div class="row"><h2 class="sp">${esc(c.name)}</h2><button class="btn sm" data-act="budedit" data-c="${c.id}" data-ym="${TODAY}">Budget ändern</button></div>
    <p class="sub">${esc(GROUPS[c.group]?.n||'')}${c.wparent?' · Hauptkategorie '+esc(c.wparent):''}${par?` · zählt ins Budget von ${link(par)}`:''}${kids.length?` · hier zählen auch: ${kids.map(link).join(', ')}`:''}</p>
    <div class="wcard"><div class="kgrid"><div><span>Budget ${ymShort(TODAY)}</span><b class="num">CHF ${chf0(planM(TODAY))}</b></div><div><span>Effektiv ${ymShort(TODAY)}</span><b class="num ${istM(TODAY)>planM(TODAY)+0.5&&planM(TODAY)?'neg':''}">CHF ${chf0(istM(TODAY))}</b></div>
      <div><span>Budget ${y}</span><b class="num">CHF ${chf0(pY)}</b></div><div><span>Effektiv ${y} bis heute</span><b class="num">CHF ${chf0(iY)}</b></div><div><span>Ø pro Monat (11 Mt.)</span><b class="num">CHF ${chf0(avg)}</b></div></div>
      <div class="kbars">${rows.map(r=>`<div class="kb" title="${ymLabel(r.m)}: effektiv ${chf0(r.i)} · Budget ${chf0(r.p)}"><span>${ymShort(r.m)}</span><div><i style="width:${r.i/mx*100}%" class="${r.p&&r.i>r.p+0.5?'over':''}"></i>${r.p?`<b style="left:${r.p/mx*100}%"></b>`:''}</div><em class="num">${chf0(r.i)}</em></div>`).join('')}</div>
      <p class="small muted" style="margin:6px 0 0">Balken = effektiv ausgegeben, Strich = Budget.</p></div>
    <div class="xcard mt"><div class="ah"><h3>Geplante Zahlungen</h3><button class="btn sm" data-act="plannew">+ Neu</button></div>
      ${plans.map(({p,i})=>{ const t = planLastTx(p)[0]; return `<div class="wrow" data-act="planedit" data-i="${i}"><div class="wmid"><b>${esc(p.name)}</b><span>${freqName(p.freq)}${t?' · zuletzt '+dShort(t.d):''}</span></div><div class="wend"><b class="num out">−${chf(p.amount)}</b></div></div>`; }).join('')}
      ${wpl.map(p=>`<div class="wrow"><div class="wmid"><b>${esc(p.n)}</b><span>in Wallet geplant · ab ${dShort(p.due)}</span></div><div class="wend"><b class="num out">−${chf(Math.abs(p.v))}</b></div></div>`).join('')}
      ${yl.map(x=>`<div class="wrow" data-go="jahr"><div class="wmid"><b>${esc(x.name)}</b><span>Jahreskosten · ${MN[x.month-1]}</span></div><div class="wend"><b class="num out">−${chf(x.amount)}</b></div></div>`).join('')}
      ${rc.map(r=>`<div class="wrow"><div class="wmid"><b>${esc(r.who)}</b><span>wiederkehrend · ${freqName(r.freq)} · ${r.n}× · nächste ~${dShort(r.next)}</span></div><div class="wend"><b class="num out">−${chf(r.amount)}</b><span><a class="link" data-act="rcadd" data-k="${esc(r.key)}">Übernehmen</a></span></div></div>`).join('')}
      ${plans.length||wpl.length||yl.length||rc.length?'':'<p class="small muted">Keine geplanten oder wiederkehrenden Zahlungen in dieser Kategorie.</p>'}</div>
    ${top.length?`<div class="xcard mt"><h3>Wo du dafür bezahlst (12 Monate)</h3>${top.map(([k,o])=>`<div class="krow2"><span class="sp">${esc(niceName(String(o.who||k).split(' · ')[0].slice(0,40)))}</span><span class="small muted">${o.n}×</span><b class="num">CHF ${chf0(o.s)}</b></div>`).join('')}</div>`:''}
    <div class="xcard mt"><h3>Letzte Buchungen</h3>${txs.map(bkTxRow).join('') || '<p class="small muted">Noch keine Buchungen.</p>'}</div>
    <p class="small"><a class="link" data-act="katback">‹ Zurück</a></p>`;
}
render = (prev => function(){
  if(S.view==='katinfo' && D && !S.locked){ S.view = 'budget'; try{ prev.apply(this, arguments); } finally { S.view = 'katinfo'; }
    const c = D.cats.find(x=>x.id===S.katId); $('header h1').textContent = c ? c.name : 'Kategorie'; $('#main').innerHTML = vKat(); pvButton(); pvMaskSoon(); return; }
  const r = prev.apply(this, arguments); pvButton(); return r;
})(render);
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act]'); if(!a || !D) return; const k = a.dataset.act;
  if(k==='katinfo'){ e.stopPropagation(); e.preventDefault(); if($('#dlg').open) $('#dlg').close(); if(S.view!=='katinfo') S.katBack = S.view; S.katId = a.dataset.c; S.view = 'katinfo'; render(); scrollTo(0,0); }
  else if(k==='katback'){ e.stopPropagation(); S.view = S.katBack || 'budget'; render(); }
  else if(k==='rcadd'){ e.stopPropagation(); const R = rcOpen(), r = a.dataset.k ? R.find(x=>x.key===a.dataset.k) : R[+a.dataset.i]; if(!r) return;
    (D.plans ??= []).push({id:'p'+uid(), type:'out', name:r.who, amount:r.amount, freq:r.freq, start:r.next, day:r.day, acc:mainAcc().id, cat:r.cat==='_offen'?'':r.cat, match:r.key});
    save(); toastMsg(`«${r.who}» als geplante Zahlung übernommen`); render(); }
}, true);
// Budget-Seiten: jede Kategorie führt zu ihrer Übersicht
vBudgetP = (prev => function(){ return prev().replace(/(<div class="brow3" data-act="budedit" data-c="([^"]+)"[^>]*><div class="row"><span class="sp nm">)([^<]*)(<\/span>)/g, (m,a,c,n,e)=>`${a}${n} <a class="link katl" data-act="katinfo" data-c="${c}">Übersicht ›</a>${e}`); })(vBudgetP);
vBudgetW = vBudgetP;
vBudgetMonat = (prev => function(tabs){ return prev(tabs).replace(/(<div class="bname" data-act="budedit" data-c="([^"]+)" data-ym="[^"]*"><span>[^<]*<span class="mchev">›<\/span><\/span>)/g, (m,a,c)=>`${a}<a class="link katl" data-act="katinfo" data-c="${c}">Übersicht ›</a>`); })(vBudgetMonat);

// Buchung: Kategorie, Budget und geplante Zahlung sichtbar und verlinkt
function txLinks(t){
  if(!t || !t.c || t.c==='_offen' || isTr(t)) return '';
  const parts = [];
  if(t.c!=='_inc'){ const bc = bhKey(t.c), m = t.d.slice(0,7), pl = C.m?.[m]?.plan?.[bc] || 0, ist = D.tx.filter(x=>katIds(bc).has(x.c) && x.d.startsWith(m)).reduce((s,x)=>s+kSpend(x),0);
    parts.push(`Kategorie: <a class="link" data-act="katinfo" data-c="${bc}">${esc(bkName(bc))} ›</a>${pl?` · ${ymShort(m)}: CHF ${chf0(ist)} von ${chf0(pl)} Budget`:''}`); }
  const p = (D.plans||[]).find(p=>!p.off && planLastTx(p, 24).some(x=>x.id===t.id)); if(p) parts.push(`Gehört zur geplanten Zahlung «${esc(p.name)}» (${freqName(p.freq)})`);
  const r = rcAll().find(r=>r.key===acMer(t)); if(r && !p) parts.push(`Wiederkehrend ${freqName(r.freq).toLowerCase()} · nächste ~${dShort(r.next)}`);
  return parts.length ? `<div class="txlinks small">${parts.map(x=>`<div>${x}</div>`).join('')}</div>` : '';
}
txDialog = (prev => function(t, preset={}, onDone){ const r = prev(t, preset, onDone); try{ const h = txLinks(t), acts = $('#dlgbody .acts'); if(h && acts) acts.insertAdjacentHTML('beforebegin', h); }catch(e){} return r; })(txDialog);
// Geplante Zahlung: die passenden Buchungen zeigen
planDialog = (prev => function(i){ const r = prev(i); try{ const p = i!=null ? D.plans?.[i] : null; if(p && p.type!=='tr'){ const l = planLastTx(p, 6), acts = $('#dlgbody .acts');
  const h = `<div class="txlinks small"><b>Gebuchte Zahlungen</b>${l.map(t=>`<div>${dShort(t.d)} · CHF ${chf(Math.abs(t.imp?t.sa:t.a))} · ${esc(niceName(String(t.n||'').slice(0,40)))}</div>`).join('') || '<div class="muted">Noch keine passende Buchung gefunden.</div>'}${p.cat&&p.type==='out'?`<div><a class="link" data-act="katinfo" data-c="${p.cat}">Kategorie ${esc(bkName(p.cat))} ›</a></div>`:''}</div>`;
  if(acts) acts.insertAdjacentHTML('beforebegin', h); } }catch(e){} return r; })(planDialog);

/* ---------- Beträge ausblenden (pro Gerät) ---------- */
var pvOn = () => bLS('privat')==='1';
var PV_RX = [[/(CHF|Fr\.)\s?[−\-+]?\(?[−\-+]?[\d'’.,]*\d\)?/g, '$1 •••'], [/(?<![\d.,'’])[−\-+]?\d{1,3}(?:['’]\d{3})+(?:\.\d{1,2})?(?![\d'’])/g, '•••'], [/(?<![\d.,'’])[−\-+]?\d+\.\d{2}(?![\d.%])/g, '•••']];
var pvText = s => { let x = s; for(const [rx, r] of PV_RX) x = x.replace(rx, r); return x; };
function pvMask(root){
  if(!pvOn() || !root) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode: n => n.parentElement?.closest('script,style,textarea') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT});
  const ch = []; let n; while((n = w.nextNode())){ const v = n.nodeValue; if(/\d/.test(v)){ const m = pvText(v); if(m!==v) ch.push([n, m]); } }
  for(const [node, m] of ch) node.nodeValue = m;
  root.querySelectorAll?.('[title]').forEach(el=>{ const t = el.getAttribute('title'); if(/\d/.test(t)){ const m = pvText(t); if(m!==t) el.setAttribute('title', m); } });
}
var PVT = null; function pvMaskSoon(){ if(!pvOn() || PVT) return; PVT = requestAnimationFrame(()=>{ PVT = null; pvMask(document.body); }); }
new MutationObserver(()=>pvMaskSoon()).observe(document.documentElement, {childList:true, subtree:true, characterData:true});
function pvSet(on){ bLSset('privat', on ? '1' : '0'); document.body.classList.toggle('privat', on); render(); if(on) toastMsg('Beträge ausgeblendet'); }
function pvButton(){
  document.body.classList.toggle('privat', pvOn());
  const h = document.querySelector('header'); if(!h || !D || S.locked){ $('#privbtn')?.remove(); return; }
  const eye = pvOn() ? '<path d="M3 3l18 18"/><path d="M10.6 6.1A9.6 9.6 0 0 1 12 6c5 0 9 6 9 6a16 16 0 0 1-3.1 3.6M6.2 7.6C4.2 9.1 3 12 3 12s4 6 9 6a8.6 8.6 0 0 0 3.6-.8"/>' : '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';
  let b = $('#privbtn'); if(!b){ h.insertAdjacentHTML('beforeend', `<button class="ibtn" id="privbtn" data-act="privtoggle"></button>`); b = $('#privbtn'); const bell = $('#bell'); if(bell) h.insertBefore(b, bell); }
  b.innerHTML = ci(eye); b.title = pvOn() ? 'Beträge zeigen' : 'Beträge ausblenden'; b.setAttribute('aria-label', b.title); b.classList.toggle('on', pvOn());
}
document.addEventListener('click', e=>{ const a = e.target.closest('[data-act="privtoggle"]'); if(!a) return; e.stopPropagation(); pvSet(!pvOn()); }, true);
document.addEventListener('change', e=>{ if(e.target?.id==='pvcb'){ pvSet(e.target.checked); } });
vDaten2 = (prev => function(){ return `<div class="card"><h3>Beträge ausblenden</h3><p class="small muted">Für Gespräche mit anderen: Alle Frankenbeträge werden verdeckt, Prozente, Kategorien und Daten bleiben sichtbar. Gilt nur auf diesem Gerät. Schnell umschalten mit dem Auge oben rechts.</p>
  <label class="row" style="gap:8px"><input type="checkbox" id="pvcb" ${pvOn()?'checked':''}> Beträge ausblenden</label></div>` + prev(); })(vDaten2);
