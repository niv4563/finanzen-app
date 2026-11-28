/* =====================================================================
   87. GELDFLUSS: MUSTER ERKENNEN (1.62.0)
   Ein kleiner «Assistent», der nur auf dem Gerät rechnet und aus den Buchungen der letzten
   12 Monate erkennt, wie Geld tatsächlich fliesst:
   • Überträge zwischen Konten: fester Betrag, Prozent vom Lohn, nur in bestimmten Monaten
     (z. B. Säule 3a im Dezember) oder schwankend («deckt, was weitergeht»).
   • Wer bezahlt was: welches Konto welche Budget-Kategorie bezahlt (z. B. Haushaltkonto →
     Hypothek, Gas & Strom), auch aufgeteilt (Freizeit zu 70 % mit Kreditkarte).
   • Sparen: Budget-Kategorien wie «Säule 3a» oder «Sparen» gehören zu Überträgen auf das passende Konto.
   • Rolle jedes Kontos: Durchlauf (Geld geht weiter), sammelt, wird aufgebraucht, Karte.
   Vorschläge werden erst übernommen, wenn du sie anhakst. Neu: Drähte mit Prozent.
   ===================================================================== */
var FLP_N = 12;
var flpMonths = (n=FLP_N) => Array.from({length:n}, (_,i)=>ymAdd(TODAY, i-n));
var flpCV = a => { if(a.length<2) return 0; const m = a.reduce((x,y)=>x+y,0)/a.length; if(!m) return 0; return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/a.length)/m; };
var flpR = v => v >= 200 ? Math.round(v/5)*5 : Math.round(v);
var flpIncAll = ym => flMonthTx(ym).reduce((a,t)=>t.c==='_inc' ? a+Math.max(0, sv(t)) : a, 0);
var flpAccNode = id => FL().nodes.find(n=>n.t==='acc' && n.ref===id);
var flpMain = () => { const e = FL().edges.find(e=>flN(e.f)?.t==='inc' && flN(e.t)?.t==='acc'); return e ? flN(e.t).ref : mainAcc()?.id; };
var flpWords = s => bkNorm(s).split(' ').filter(w=>w.length>=3 || /^\d+a$/.test(w));

/* ---------- Rolle der Konten ---------- */
function flpRoles(){
  const ms = flpMonths(6), io = {};
  const add = (a, k, v) => { if(!a) return; (io[a] ??= {in:0, out:0})[k] += v; };
  for(const ym of ms) for(const t of flMonthTx(ym)){
    if(isTr(t) && !t.imp && t.ta){ add(t.acc, 'out', +t.ta); add(t.toAcc, 'in', +t.ta); continue; }
    const v = sv(t); if(v>0) add(bkAcc(t), 'in', v); else if(v<0) add(bkAcc(t), 'out', -v); }
  const R = {};
  for(const a of D.accounts){ const x = io[a.id] || {in:0,out:0}, g = typeof accGrp==='function' ? accGrp(a) : '';
    R[a.id] = g==='karte' ? 'karte' : (x.in+x.out < 1) ? 'ruht' : x.out < x.in*0.3 ? 'sammelt' : x.out > x.in*1.15 ? 'abnehmend' : 'durchlauf'; }
  return R;
}
var FLP_ROLE = {durchlauf:'Durchlauf', sammelt:'sammelt', abnehmend:'wird aufgebraucht', karte:'Karte', ruht:'ruht'};

/* ---------- Muster suchen ---------- */
var flpCache = {k:null, v:null};
function flPatterns(){
  const key = TODAY+'|'+D.tx.length+'|'+JSON.stringify(FL().edges.map(e=>[e.f,e.t,e.mode,e.a,e.pct,e.cats]))+'|'+FL().nodes.length;
  if(flpCache.k===key) return flpCache.v;
  const ms = flpMonths(), roles = flpRoles(), main = flpMain(), out = [], accOk = id => D.accounts.some(a=>a.id===id && !a.archived);
  const inc = Object.fromEntries(ms.map(m=>[m, flpIncAll(m)]));
  const Mx = Object.fromEntries(ms.map(m=>[m, flTrMatrix(m)]));
  const curEdge = (A, B) => FL().edges.find(e=>{ const f = flN(e.f), t = flN(e.t); return f && t && t.t!=='exp' && flSrcAcc(f)===A && flSrcAcc(t)===B && !(f.t==='pot' && t.t==='pot'); });

  // 1. Sparen: Budget-Kategorien → Konto
  const sparLinked = new Set(FL().edges.flatMap(e=>e.cats||[]));
  const spar = [];
  for(const c of D.cats.filter(c=>!c.archived && !c.wid && c.group==='spar')){
    const bud = [0,1,2].map(i=>+(D.plan?.[c.id]?.[ymAdd(TODAY,i)])||0), avg = bud.reduce((a,b)=>a+b,0)/3; if(avg<=0 || sparLinked.has(c.id)) continue;
    const w = flpWords(c.name), nm = bkNorm(c.name);
    let best = null, bs = 0;
    for(const a of D.accounts.filter(a=>!a.archived && a.id!==main)){ const g = accGrp(a), aw = flpWords(a.name);
      let s = w.filter(x=>aw.includes(x)).length*3;
      if(/3a|saule|vorsorge|pensions/.test(nm) && g==='vorsorge') s += 4;
      if(/invest|aktie|etf|fonds|krypto|depot/.test(nm) && g==='invest') s += 4;
      if(/spar|reserve|notgroschen|ruckstell|eigenheim|ferien/.test(nm) && g==='sparen') s += 2;
      if(c.acc===a.id) s += 5;
      const tr = ms.slice(-6).reduce((x,m)=>x+(Mx[m][main+'>'+a.id]||0),0)/6; if(tr>0) s += Math.min(3, tr/Math.max(avg,1)*2);
      if(s>bs){ bs = s; best = a; } }
    if(best && bs>=3) spar.push({k:'spar', c:c.id, acc:best.id, avg, pre:true,
      t:`Budget «${c.name}» = Übertrag aufs ${best.name}`, d:`Im Budget CHF ${chf0(avg)} pro Monat. Wird zum Draht ${accName(main)} → ${best.name} und zählt als gespart.`}); }
  out.push(...spar);
  const sparPair = new Set(spar.map(s=>main+'>'+s.acc));

  // 2. Überträge zwischen Konten
  const pairs = new Set(); ms.forEach(m=>Object.keys(Mx[m]).forEach(k=>pairs.add(k)));
  for(const k of pairs){ const [A, B] = k.split('>'); if(!accOk(A) || !accOk(B)) continue;
    const vals = ms.map(m=>Mx[m][k]||0), nz = vals.filter(v=>v>0.5), n = nz.length, sum = nz.reduce((a,b)=>a+b,0); if(n<2 || sum<100) continue;
    const md = kMed(nz), fixShare = nz.filter(v=>Math.abs(v-md) <= Math.max(5, md*0.03)).length/n;
    const ratios = ms.map((m,i)=>vals[i]>0.5 && inc[m]>500 ? vals[i]/inc[m] : null).filter(x=>x!=null);
    const gB = accGrp(D.accounts.find(a=>a.id===B)||{});
    let p;
    if(gB==='karte' || (roles[B]==='durchlauf' && fixShare<0.7)) p = {mode:'deckt', t:`${accName(A)} → ${accName(B)}: deckt, was weitergeht`, d:`${n} von ${FLP_N} Monaten, CHF ${chf0(Math.min(...nz))}–${chf0(Math.max(...nz))}. ${accName(B)} ist ein ${gB==='karte'?'Kartenkonto':'Durchlaufkonto'} – der Betrag folgt dem, was von dort bezahlt wird.`};
    else if(n>=4 && fixShare>=0.7) p = {mode:'fix', a:flpR(md), t:`${accName(A)} → ${accName(B)}: fest CHF ${chf0(md)}`, d:`${n} von ${FLP_N} Monaten derselbe Betrag${n<10?' (nicht jeden Monat)':''}.`};
    else if(n>=4 && ratios.length>=4 && flpCV(ratios)<0.1 && flpCV(nz)>0.06){ const pc = Math.round(kMed(ratios)*1000)/10; p = {mode:'pct', pct:pc, of:'inc', t:`${accName(A)} → ${accName(B)}: ${pc} % vom Lohn`, d:`Der Betrag schwankt mit dem Lohn (CHF ${chf0(Math.min(...nz))}–${chf0(Math.max(...nz))}), der Anteil bleibt gleich.`}; }
    else if(n<=3){ const mm = {}; ms.forEach((m,i)=>{ if(vals[i]>0.5){ const nx = ymAdd(m,12); mm[nx<TODAY?ymAdd(nx,12):nx] = flpR(vals[i]); } });
      p = {mode:'fix', a:0, m:mm, t:`${accName(A)} → ${accName(B)}: nur in ${Object.keys(mm).map(x=>MN[+x.slice(5)-1]).join(', ')}`, d:`Kam ${n}× vor (${ms.filter((m,i)=>vals[i]>0.5).map(m=>ymLabel(m)).join(', ')}) – wird für dieselben Monate eingeplant.`}; }
    else { const r6 = vals.slice(-6).filter(v=>v>0.5), a = flpR(kMed(r6.length?r6:nz)); p = {mode:'fix', a, t:`${accName(A)} → ${accName(B)}: etwa CHF ${chf0(a)} pro Monat`, d:`Schwankt (${chf0(Math.min(...nz))}–${chf0(Math.max(...nz))}) – geplant mit dem üblichen Betrag der letzten Monate; einzelne Monate kannst du anpassen.`}; }
    const e = curEdge(A, B);
    const same = e && e.mode===p.mode && (p.mode!=='fix' || (Math.abs((+e.a||0)-(p.a||0))<1 && JSON.stringify(e.m||{})===JSON.stringify(p.m||{}))) && (p.mode!=='pct' || Math.abs((+e.pct||0)-p.pct)<0.2);
    if(same || (e && e.mode==='kat')) continue;
    out.push({k:'tr', A, B, ...p, pre:!sparPair.has(k), cur:e ? flEdgeDesc(e) : null}); }

  // 3. Wer bezahlt was (letzte 6 Monate)
  const m6 = flpMonths(6), pay = {};
  for(const ym of m6) for(const t of flMonthTx(ym)){ const v = kSpend(t); if(!v) continue; const c = bhKey(t.c); if(!c || c==='_offen') continue; const a = bkAcc(t); ((pay[c] ??= {})[a] = (pay[c][a]||0) + v); }
  const srcOfCat = c => { const ns = FL().nodes.filter(n=>n.t==='exp' && flExpCats(n).includes(c)); return {nodes:ns, accs:new Set(ns.flatMap(n=>flIn(n.id).map(e=>flSrcAcc(flN(e.f)))))}; };
  // b) einzelne Kategorien, die klar von einem anderen Konto bezahlt werden (z. B. Hypothek vom Haushaltkonto)
  const catSug = [], grpDone = new Set();
  for(const [c, by] of Object.entries(pay)){ const cat = D.cats.find(x=>x.id===c); if(!cat || cat.archived) continue;
    const tot = Object.values(by).reduce((a,b)=>a+b,0); if(tot/6 < 25) continue;
    const [a, v] = Object.entries(by).sort((x,y)=>y[1]-x[1])[0], sh = v/tot; if(sh < 0.7 || !accOk(a)) continue;
    const s = srcOfCat(c); if(s.accs.has(a)) continue;
    const g = accGrp(D.accounts.find(x=>x.id===a)||{}); if(g==='karte') continue;   // Kartenzahlungen laufen über den ganzen Bereich
    catSug.push({k:'cat', c, acc:a, avg:tot/6, share:Math.round(sh*100), pre: a!==main,
      t:`«${cat.name}» wird vom ${accName(a)} bezahlt`, d:`${Math.round(sh*100)} % der Zahlungen, Ø CHF ${chf0(tot/6)} pro Monat${s.nodes.length?` – bisher unter «${flName(s.nodes[0])}» vom ${[...s.accs].map(accName).join(', ')||'–'}`:''}.`}); }
  catSug.sort((x,y)=>(y.acc!==main)-(x.acc!==main) || y.avg-x.avg); const catTop = catSug.slice(0,15); out.push(...catTop); catSug.length = 0; catSug.push(...catTop);
  // a) ganze Bereiche
  const catTaken = new Set(catSug.filter(x=>x.pre).map(x=>x.c));
  for(const n of FL().nodes.filter(n=>n.t==='exp' && n.ref.startsWith('g:'))){ const cats = flExpCats(n), by = {};
    cats.filter(c=>!catTaken.has(c)).forEach(c=>Object.entries(pay[c]||{}).forEach(([a,v])=>by[a] = (by[a]||0)+v)); const tot = Object.values(by).reduce((a,b)=>a+b,0); if(tot/6 < 50) continue;
    const srcs = new Set(flIn(n.id).map(e=>flSrcAcc(flN(e.f)))), top = Object.entries(by).filter(([a])=>accOk(a)).sort((a,b)=>b[1]-a[1]);
    for(const [a, v] of top.slice(0,2)){ const sh = v/tot; if(sh < 0.2 || srcs.has(a)) continue; grpDone.add(n.id);
      out.push({k:'grp', node:n.id, acc:a, share:Math.round(sh*100), avg:v/6, pre:true,
        t:`${flName(n)}: ${Math.round(sh*100)} % mit ${accName(a)} bezahlt`, d:`Ø CHF ${chf0(v/6)} pro Monat. ${sh>=0.8?'Draht wird umgehängt':'Neuer Draht mit '+Math.round(sh*100)+' % vom Bedarf'}${accGrp(D.accounts.find(x=>x.id===a)||{})==='karte'?'; die Karte wird vom '+accName(main)+' gedeckt':''}.`}); } }

  // 4. Verbindungen ohne Geldfluss: kommen in den Buchungen nie vor bzw. Bereich ohne Budget
  for(const e of FL().edges){ const f = flN(e.f), t = flN(e.t); if(!f || !t || f.t==='inc') continue;
    if(t.t==='exp'){ const need = [0,1,2].reduce((a,i)=>a+flBud(flExpCats(t), ymAdd(TODAY,i)),0), sp = m6.reduce((a,m)=>a+flSpend(flExpCats(t), null, m),0);
      if(need<1 && sp<1) out.push({k:'del', e:e.id, node:t.id, pre:true, t:`Leeres Kästchen «${flName(t)}» entfernen`, d:'Kein Budget und keine Ausgaben in den letzten 6 Monaten (die Kategorien sind schon anderswo verbunden).'}); continue; }
    const A = flSrcAcc(f), B = flSrcAcc(t); if(!A || !B || A===B || e.mode==='kat') continue;
    const eff = ms.reduce((a,m)=>a+(Mx[m][A+'>'+B]||0),0), other = ms.reduce((a,m)=>a+Object.entries(Mx[m]).filter(([k])=>k.endsWith('>'+B) && !k.startsWith(A+'>')).reduce((x,[,v])=>x+v,0),0);
    if(eff<1 && other>0) out.push({k:'del', e:e.id, pre:true, t:`${flName(f)} → ${flName(t)} entfernen`, d:`Kommt in den Buchungen der letzten 12 Monate nie vor – ${flName(t)} bekommt sein Geld von anderswo.`}); }
  flpCache = {k:key, v:{list:out, roles}};
  return flpCache.v;
}
function flEdgeDesc(e){ return e.mode==='fix' ? `fest CHF ${chf0(e.a||0)}` : e.mode==='pct' ? `${e.pct} %` : e.mode==='rest' ? 'Rest' : e.mode==='deckt' ? 'deckt' : 'aus Budget'; }

/* ---------- Vorschläge übernehmen ---------- */
function flpEnsureAcc(id, nearX, nearY){
  let n = flpAccNode(id); if(n) return n;
  n = {id:'n'+uid(), t:'acc', ref:id, x:(nearX||340)+330, y:nearY||40}; FL().nodes.push(n); return n;
}
function flpEnsureIn(n){   // ein neues Konto braucht einen Zufluss: Karte/Durchlauf «deckt» vom Hauptkonto
  if(flIn(n.id).length) return; const m = flpAccNode(flpMain()); if(!m || m===n) return;
  FL().edges.push({id:'e'+uid(), since:TODAY, f:m.id, t:n.id, mode:'deckt'});
}
function flpApply(list){
  const F = FL(), main = flpMain(); let n = 0; F.since ||= TODAY;
  const mn = () => flpAccNode(main) || flpEnsureAcc(main, 0, 220);
  for(const s of list){
    if(s.k==='tr'){ const a = flpEnsureAcc(s.A, mn().x, mn().y), b = flpEnsureAcc(s.B, a.x, a.y+160);
      let e = F.edges.find(e=>{ const f = flN(e.f), t = flN(e.t); return f && t && flSrcAcc(f)===s.A && flSrcAcc(t)===s.B && t.t!=='exp'; });
      if(!e){ if(flCanLink(a.id, b.id)) continue; e = {id:'e'+uid(), since:TODAY, f:a.id, t:b.id}; F.edges.push(e); }
      Object.assign(e, {mode:s.mode}); if(s.mode==='fix'){ e.a = s.a||0; e.m = {...(s.m||{})}; } if(s.mode==='pct'){ e.pct = s.pct; e.of = s.of; } n++; }
    else if(s.k==='spar'){ const a = mn(), b = flpEnsureAcc(s.acc, a.x, a.y-160);
      let e = F.edges.find(e=>e.f===a.id && e.t===b.id);
      if(!e){ e = {id:'e'+uid(), since:TODAY, f:a.id, t:b.id, mode:'kat', cats:[]}; F.edges.push(e); }
      if(e.mode!=='kat'){ e.mode = 'kat'; e.cats = []; } if(!e.cats.includes(s.c)) e.cats.push(s.c); n++; }
    else if(s.k==='grp'){ const t = flN(s.node); if(!t) continue; const src = flpEnsureAcc(s.acc, t.x-660, t.y); flpEnsureIn(src);
      if(s.share >= 80){ flIn(t.id).forEach(e=>{ F.edges = F.edges.filter(x=>x!==e); }); F.edges.push({id:'e'+uid(), since:TODAY, f:src.id, t:t.id, mode:'deckt'}); }
      else if(!flCanLink(src.id, t.id)) F.edges.push({id:'e'+uid(), since:TODAY, f:src.id, t:t.id, mode:'pct', pct:s.share, of:'need'});
      n++; }
    else if(s.k==='del'){ F.edges = F.edges.filter(x=>x.id!==s.e); if(s.node && !flIn(s.node).length && !flOut(s.node).length) F.nodes = F.nodes.filter(x=>x.id!==s.node); n++; }
    else if(s.k==='cat'){ const src = flpEnsureAcc(s.acc, 660, 40); flpEnsureIn(src);
      let t = F.nodes.find(x=>x.t==='exp' && x.ref==='c:'+s.c);
      if(!t){ t = {id:'n'+uid(), t:'exp', ref:'c:'+s.c, x:src.x+330, y:src.y + 30*flOut(src.id).length}; F.nodes.push(t); }
      flIn(t.id).forEach(e=>{ F.edges = F.edges.filter(x=>x!==e); });
      F.edges.push({id:'e'+uid(), since:TODAY, f:src.id, t:t.id, mode:'deckt'}); n++; }
  }
  flLayout(); flpCache.k = null; flSync(); save(); render();
  toastMsg(`${n} Verbindung${n===1?'':'en'} übernommen`);
}
function flpDialog(){
  const P = flPatterns(), L = P.list;
  if(!L.length){ dialog(`<h3>Muster erkennen</h3><p>Dein Geldfluss passt schon zu deinen Buchungen der letzten 12 Monate – keine neuen Vorschläge.</p><div class="acts"><button class="btn pri" data-dlg="cancel">OK</button></div>`, ()=>{}); return; }
  const sec = (k, h, sub) => { const it = L.map((s,i)=>({s,i})).filter(x=>x.s.k===k || (k==='pay' && (x.s.k==='grp' || x.s.k==='cat'))); if(!it.length) return '';
    return `<h4 class="flph">${h}</h4><p class="small muted" style="margin:0 0 6px">${sub}</p>${it.map(({s,i})=>`<label class="ltrow flpr"><input type="checkbox" class="flpc" value="${i}" ${s.pre?'checked':''}><span class="sp"><b>${esc(s.t)}</b><em>${esc(s.d)}${s.cur?` Bisher: ${esc(s.cur)}.`:''}</em></span></label>`).join('')}`; };
  dialog(`<h3>Erkannte Muster</h3><p class="small muted" style="margin-top:0">Aus deinen Buchungen der letzten 12 Monate – nur auf dem Gerät berechnet. Angehakte Vorschläge werden in den Geldfluss übernommen; nichts wird gebucht.</p>
    ${sec('spar','Sparen','Budget-Kategorien, die in Wirklichkeit Überträge auf ein Spar- oder Vorsorgekonto sind.')}
    ${sec('tr','Überträge zwischen Konten','Wie viel regelmässig von welchem Konto wohin fliesst.')}
    ${sec('pay','Wer bezahlt was','Welches Konto deine Ausgaben tatsächlich bezahlt.')}
    ${sec('del','Aufräumen','Verbindungen, die in deinen Buchungen nicht vorkommen.')}
    <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Angehakte übernehmen</button></div>`,
  k=>{ if(k!=='ok') return; const sel = [...document.querySelectorAll('.flpc:checked')].map(i=>L[+i.value]); if(!sel.length) return; setTimeout(()=>flpApply(sel), 20); });
}

/* ---------- Anordnen: Spalten nach Flussrichtung ---------- */
function flLayout(){
  const F = FL(), depth = {}, inc = F.nodes.filter(n=>n.t==='inc');
  const visit = (id, d) => { if((depth[id] ?? -1) >= d || d > 12) return; depth[id] = d; flOut(id).forEach(e=>visit(e.t, d+1)); };
  inc.forEach(n=>visit(n.id, 0));
  const maxAcc = Math.max(1, ...F.nodes.filter(n=>n.t!=='exp' && depth[n.id]!=null).map(n=>depth[n.id]));
  F.nodes.forEach(n=>{ if(n.t==='exp') depth[n.id] = maxAcc+1; else if(depth[n.id]==null) depth[n.id] = n.t==='inc' ? 0 : 1; });
  const cols = {}; F.nodes.forEach(n=>(cols[depth[n.id]] ??= []).push(n));
  for(const c of Object.keys(cols).map(Number).sort((a,b)=>a-b)){
    const list = cols[c].map(n=>{ const ps = flIn(n.id).map(e=>flN(e.f)).filter(Boolean); return {n, k: ps.length ? ps.reduce((a,p)=>a+p.y,0)/ps.length : (flOut(n.id).length ? n.y : 1e6 + n.y)}; }).sort((a,b)=>a.k-b.k);
    const H = 150, top = Math.max(20, (list.length>1 ? 0 : 200));
    list.forEach((x,i)=>{ x.n.x = 40 + c*330; x.n.y = top + i*H; }); }
  S.flView = null;
}

/* ---------- Prozent-Drähte ---------- */
flPlan = (prev => function(ym){
  const F = FL(), pe = F.edges.filter(e=>e.mode==='pct' && e.m?.[ym]==null); if(!pe.length) return prev(ym);
  // Prozent zuerst aus dem Ergebnis ohne sie berechnen, dann als fester Monatsbetrag einsetzen
  const save0 = pe.map(e=>[e, e.mode, e.a]); pe.forEach(e=>{ e.mode = 'fix'; e.a = 0; });
  let R = prev(ym);
  pe.forEach(e=>{ const f = flN(e.f), t = flN(e.t); let base = 0;
    if(e.of==='need') base = t?.t==='exp' ? flBud(flExpCats(t), ym) : (R.N[t?.id]?.out||0);
    else if(e.of==='inc') base = F.nodes.filter(n=>n.t==='inc').reduce((a,n)=>a+flIncomeOf(n, ym),0);
    else base = f?.t==='inc' ? flIncomeOf(f, ym) : (R.N[f?.id]?.in||0);
    e.a = Math.round(base * (+e.pct||0)) / 100; });
  R = prev(ym);
  save0.forEach(([e, m, a])=>{ e.mode = m; if(a===undefined) delete e.a; else e.a = a; });
  return R;
})(flPlan);

/* ---------- Dialog: Art «Prozent» ---------- */
flEdgeDialog = (prev => function(eid, ymx){
  prev(eid, ymx); const e = flE(eid), sel = $('#flmode'); if(!e || !sel) return;
  sel.insertAdjacentHTML('beforeend', `<option value="pct" ${e.mode==='pct'?'selected':''}>Prozent</option>`);
  $('#flfix').insertAdjacentHTML('afterend', `<div id="flpct" ${e.mode==='pct'?'':'hidden'}><div class="row" style="gap:8px"><label class="f" style="flex:0 0 110px">Prozent<input id="flpv" inputmode="decimal" value="${e.pct??''}" placeholder="z. B. 10"></label>
    <label class="f sp">vom<select id="flpo"><option value="src" ${e.of!=='inc'&&e.of!=='need'?'selected':''}>Zufluss von ${esc(flName(flN(e.f)))}</option><option value="inc" ${e.of==='inc'?'selected':''}>ganzen Einkommen</option><option value="need" ${e.of==='need'?'selected':''}>Bedarf von ${esc(flName(flN(e.t)))}</option></select></label></div></div>`);
  sel.onchange = () => { $('#flfix').hidden = sel.value!=='fix'; $('#flpct').hidden = sel.value!=='pct'; };
  const d = $('#dlg'), old = d.onclick;
  d.onclick = ev => { const b = ev.target.closest('[data-dlg="ok"]');
    if(b && sel.value==='pct'){ const v = parseNum($('#flpv').value); if(isNaN(v) || v<0 || v>100){ $('#flpv').style.borderColor = 'var(--bad)'; return; } e.pct = v; e.of = $('#flpo').value; }
    return old.call(d, ev); };
})(flEdgeDialog);
// Drahtbeschriftung «10 %»
flWires = (prev => function(P, Fx){ let h = prev(P, Fx);
  for(const e of FL().edges.filter(e=>e.mode==='pct')) h = h.replace(new RegExp(`(data-e="${e.id}"[\\s\\S]*?<b>)([^<]*)(</b>)`), (m, a, b, c) => `${a}${b} · ${e.pct} %${c}`);
  return h; })(flWires);

/* ---------- Kontorolle im Kästchen ---------- */
flNodeHtml = (prev => function(n, P, Fx){ let h = prev(n, P, Fx); if(n.t!=='acc') return h;
  const r = flPatterns().roles[n.ref]; if(!r || r==='ruht') return h;
  return h.replace('<span class="fnk">', `<span class="fnrole r-${r}" title="${r==='durchlauf'?'Geld geht von hier weiter':r==='sammelt'?'Geld bleibt hier und wächst':r==='abnehmend'?'Es geht mehr raus als rein':'Kartenkonto'}">${FLP_ROLE[r]}</span><span class="fnk">`); })(flNodeHtml);

/* ---------- Leiste: Muster erkennen, Anordnen; volle Breite ---------- */
vGeldfluss = (prev => function(){ let h = prev(); if(NATIVE || !FL().nodes.length) return h;
  let n = 0; try{ n = flPatterns().list.filter(s=>s.pre).length; }catch(e){}
  return h.replace('<button class="btn sm" data-act="fladd">+ Kästchen</button>', `<button class="btn sm ${n?'pri':''}" data-act="flpat">Muster erkennen${n?` · ${n}`:''}</button><button class="btn sm" data-act="fladd">+ Kästchen</button><button class="btn sm ghost" data-act="fllay">Anordnen</button>`)
    .replace('<p class="small muted">Kästchen und Drähte bearbeitest du am PC.', `${n?`<button class="btn sm pri" data-act="flpat" style="margin-bottom:8px">Muster erkennen · ${n}</button>`:''}<p class="small muted">Kästchen und Drähte bearbeitest du am PC.`); })(vGeldfluss);
CUSTOM_V.geldfluss = vGeldfluss;
document.addEventListener('click', ev=>{ const a = ev.target.closest('[data-act="flpat"],[data-act="fllay"]'); if(!a || !D) return; ev.stopPropagation(); ev.preventDefault();
  if(a.dataset.act==='flpat') return flpDialog();
  flLayout(); save(); render(); }, true);

/* ---------- Übersicht und Planen: Verbindungen aus dem Geldfluss zeigen ---------- */
function flCatLink(c){
  const F = FL(); if(!F.nodes.length) return null; const main = flpMain();
  const ke = F.edges.find(e=>(e.cats||[]).includes(c)); if(ke){ const t = flN(ke.t); return {to:true, acc:flSrcAcc(t), name:flName(t)}; }
  const n = F.nodes.find(n=>n.t==='exp' && n.ref==='c:'+c) || F.nodes.find(n=>n.t==='exp' && n.ref.startsWith('g:') && flExpCats(n).includes(c)); if(!n) return null;
  const src = [...new Set(flIn(n.id).map(e=>flN(e.f)).filter(Boolean).map(f=>flName(f)))]; const accs = flIn(n.id).map(e=>flSrcAcc(flN(e.f)));
  if(!src.length || (accs.length===1 && accs[0]===main)) return null;
  return {to:false, name:src.join(' + ')};
}
render = (prev => function(){ const r = prev.apply(this, arguments);
  try{ const m = $('#main'); if(m) m.classList.toggle('wide', m.classList.contains('wide') || (S.view==='geldfluss' && innerWidth>=900));
    if(D && (S.view==='budget' || S.view==='budgetedit') && D.flow?.nodes?.length){
      document.querySelectorAll('#main .brow3[data-c] .nm, #main .bname[data-c]').forEach(el=>{ if(el.querySelector('.fltag')) return;
        const c = el.dataset.c || el.closest('[data-c]')?.dataset.c, L = c && flCatLink(c); if(!L) return;
        const tag = `<span class="fltag" ${NATIVE?"":"data-go=\"geldfluss\""} title="Laut Geldfluss">${L.to?'→ ':'↳ '}${esc(L.name)}</span>`;
        const first = el.querySelector('.katl') || null; if(first) first.insertAdjacentHTML('beforebegin', tag); else el.insertAdjacentHTML('beforeend', tag); }); } }catch(e){}
  return r; })(render);
