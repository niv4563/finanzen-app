/* =====================================================================
   96. GRUPPEN IM GELDFLUSS · SEITE ÜBERARBEITET (1.69.0)
   - Gruppenkasten: ein Rahmen hinter mehreren Kästchen (z. B. «Fixe Ausgaben»).
     Am Kopf ziehen = ganze Gruppe verschieben, antippen = umbenennen, Farbe,
     Kästchen wählen, auflösen. Ein Kästchen in eine andere Gruppe ziehen = umteilen.
   - Sinnvolle Gruppen sind immer vorgebaut: Einkommen, Zahlungskonten,
     Sparen & Anlagen, Fixe Ausgaben, Persönliche Ausgaben. Neue Kästchen kommen
     von selbst in die passende Gruppe.
   - «Anordnen» ordnet nach Gruppen: jede Gruppe ein Block, Blöcke in Flussrichtung.
   - Seite aufgeräumt: eine Werkzeugleiste, Menüs «+ Hinzufügen» und «Mehr»,
     Legende in der Fläche, Liste der Verbindungen eingeklappt.
   ===================================================================== */

var GRP_DEF = [
  {k:'ein',   n:'Einkommen',            c:'#b8860b'},
  {k:'konto', n:'Zahlungskonten',       c:'#5b6b82'},
  {k:'spar',  n:'Sparen & Anlagen',     c:'#2f6fbf'},
  {k:'fix',   n:'Fixe Ausgaben',        c:'#2f9a5a'},
  {k:'pers',  n:'Persönliche Ausgaben', c:'#d9822b'},
];
var GRP_COL = ['#2f9a5a', '#d9822b', '#2f6fbf', '#b8860b', '#8e5bb5', '#c2477a', '#5b6b82', '#1aa39a'];
var grpOn = () => !FL().grpOff;
var grpOf = n => (FL().groups || []).find(g=>g.id===n?.g);
var grpMem = id => FL().nodes.filter(n=>n.g===id);

// In welche vorgebaute Gruppe gehört ein Kästchen?
function grpKind(n){
  if(!n) return null;
  if(n.t==='inc') return 'ein';
  if(n.t==='acc'){ const g = accGrp(flAccOf(n) || {}); return ['sparen','invest','vorsorge'].includes(g) ? 'spar' : 'konto'; }
  if(n.t==='pot') return isColl(n) ? 'fix' : 'spar';
  if(isExt(n)) return ['abo','person','anderes'].includes(n.ext) ? 'pers' : 'fix';
  if(n.t==='exp'){
    const r = String(n.ref||''); if(r.startsWith('g:')){ const k = r.slice(2); return k==='spar' ? 'spar' : k==='fix' ? 'fix' : 'pers'; }
    const nx = ymAdd(TODAY,1), w = {fix:0, pers:0, spar:0};
    for(const cid of flExpCats(n)){ const c = D.cats.find(x=>x.id===cid); if(!c) continue; const s = gSec(c).k, v = (+(D.plan?.[cid]?.[nx]) || 0) + 0.01;
      w[s==='spar' ? 'spar' : (s==='fix' || isDebtC(c) || isTaxC(c)) ? 'fix' : 'pers'] += v; }
    return Object.entries(w).sort((a,b)=>b[1]-a[1])[0][1] > 0 ? Object.entries(w).sort((a,b)=>b[1]-a[1])[0][0] : 'pers';
  }
  return null;
}
// Vorgebaute Gruppen anlegen und Kästchen ohne Gruppe einteilen
function grpEnsure(){
  const F = FL(); if(!F.nodes.length || F.grpOff) return false; F.groups ??= []; F.grpDel ??= []; let ch = false;
  for(const d of GRP_DEF){ if(F.grpDel.includes(d.k) || F.groups.some(g=>g.k===d.k)) continue; F.groups.push({id:'g'+d.k, k:d.k, n:d.n, c:d.c}); ch = true; }
  for(const n of F.nodes){ if(n.g && F.groups.some(g=>g.id===n.g)) continue; if(n.g){ delete n.g; ch = true; } if(n.gm) continue;
    const g = F.groups.find(x=>x.k===grpKind(n)); if(g){ n.g = g.id; ch = true; } }
  if(ch && F.grpHint==null) F.grpHint = 0;    // einmal zeigen: «Anordnen» ordnet nach Gruppen
  return ch;
}
// Rahmen einer Gruppe aus ihren Kästchen
function grpRect(id, skip){
  const m = grpMem(id).filter(n=>n!==skip); if(!m.length) return null;
  const x0 = Math.min(...m.map(n=>n.x)) - 16, y0 = Math.min(...m.map(n=>n.y)) - 42, x1 = Math.max(...m.map(n=>n.x + FL_W)) + 16, y1 = Math.max(...m.map(n=>n.y + flHt(n))) + 16;
  return {x:x0, y:y0, w:x1-x0, h:y1-y0};
}
function grpFlow(id, P){
  const ins = new Set(grpMem(id).map(n=>n.id)); let i = 0, o = 0;
  for(const e of FL().edges){ const a = ins.has(e.f), b = ins.has(e.t); if(b && !a) i += P.E[e.id] || 0; if(a && !b) o += P.E[e.id] || 0; }
  return {i, o};
}
function grpHtml(P){
  if(!grpOn()) return ''; const F = FL();
  return (F.groups||[]).map(g=>{ const r = grpRect(g.id); if(!r) return ''; const f = grpFlow(g.id, P), n = grpMem(g.id).length;
    const v = f.i > 0.5 ? `CHF ${chf0(f.i)} / Mt. hinein` : f.o > 0.5 ? `CHF ${chf0(f.o)} / Mt. hinaus` : `${n} Kästchen`;
    return `<div class="fgrp" data-g="${g.id}" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;--gc:${g.c}"><div class="fgh" data-ghead="${g.id}" title="Ziehen = ganze Gruppe verschieben · antippen = bearbeiten"><b>${esc(g.n)}</b><span>${v}</span></div></div>`; }).join('');
}
function grpRedraw(){
  for(const el of document.querySelectorAll('#flw .fgrp')){ const r = grpRect(el.dataset.g); if(!r){ el.hidden = true; continue; } el.hidden = false;
    el.style.left = r.x+'px'; el.style.top = r.y+'px'; el.style.width = r.w+'px'; el.style.height = r.h+'px'; }
}
// Überlappt eine Gruppe nach dem Wachsen eine andere darunter: die andere nach unten schieben
function grpResolve(id, depth = 0){
  if(depth > 8) return; const A = grpRect(id); if(!A) return;
  for(const g of FL().groups || []){ if(g.id===id) continue; const B = grpRect(g.id); if(!B) continue;
    const hx = A.x < B.x + B.w && B.x < A.x + A.w, hy = A.y < B.y + B.h && B.y < A.y + A.h;
    if(hx && hy && B.y >= A.y){ const d = A.y + A.h + 24 - B.y; grpMem(g.id).forEach(n=>n.y += d); grpResolve(g.id, depth+1); } }
}

/* ---------- Anordnen nach Gruppen ---------- */
function flLayoutGrp(){
  const F = FL(), N = F.nodes; if(!N.length) return;
  const GX = 56, GY = 20, PAD = 18, HEAD = 40, BG = 40, CG = 100;
  // Stufe im Fluss (längster Weg ab Einkommen)
  const dep = {}; N.forEach(n=>dep[n.id] = n.t==='inc' ? 0 : null);
  for(let it=0; it<N.length+1; it++){ let ch = false; for(const e of F.edges){ const a = dep[e.f]; if(a==null) continue; if(dep[e.t]==null || dep[e.t] < a+1){ dep[e.t] = a+1; ch = true; } } if(!ch) break; }
  N.forEach(n=>{ if(dep[n.id]==null) dep[n.id] = n.t==='exp' ? 9 : 1; });
  const stage = n => n.t==='inc' ? 0 : (n.t==='exp' || isColl(n)) ? 3 : grpKind(n)==='spar' ? 2 : 1;
  const RK = {alltag:0, haushalt:1, karte:2, sparen:3, invest:4, vorsorge:5};
  const rank = n => n.t==='acc' ? (RK[accGrp(flAccOf(n)||{})] ?? 0) : n.t==='pot' ? 6 : isExt(n) ? 2 : 1;
  // Blöcke: Gruppen und einzelne Kästchen ohne Gruppe
  const blocks = [], byG = {};
  for(const n of N){ const g = grpOn() ? grpOf(n) : null; if(g) (byG[g.id] ??= {g, mem:[]}).mem.push(n); else blocks.push({g:null, mem:[n]}); }
  blocks.unshift(...Object.values(byG));
  const ord = b => b.g ? (GRP_DEF.findIndex(d=>d.k===b.g.k) + 1 || 6) : 7;
  for(const b of blocks){ const st = b.mem.map(stage).sort((a,c)=>a-c); b.col = st[Math.floor((st.length-1)/2)];
    const keys = [...new Set(b.mem.map(n=>stage(n)===3 ? 99 : dep[n.id]))].sort((a,c)=>a-c);
    b.sub = keys.map(k=>b.mem.filter(n=>(stage(n)===3 ? 99 : dep[n.id])===k).sort((a,c)=>rank(a)-rank(c) || flName(a).localeCompare(flName(c)))); }
  const pred = n => F.edges.filter(e=>e.t===n.id).map(e=>flN(e.f)).filter(Boolean);
  const bary = n => { const p = pred(n); return p.length ? p.reduce((a,o)=>a + o.y + flHt(o)/2, 0)/p.length : null; };
  const place = () => {
    const cols = {}; for(const b of blocks) (cols[b.col] ??= []).push(b);
    const ci = Object.keys(cols).map(Number).sort((a,c)=>a-c);
    for(const b of blocks){ b.w = b.sub.length*(FL_W+GX) - GX + 2*PAD; b.h = HEAD + Math.max(...b.sub.map(s=>s.reduce((a,n)=>a + flHt(n) + GY, 0) - GY)) + PAD; }
    const H = Math.max(...ci.map(c=>cols[c].reduce((a,b)=>a + b.h + BG, 0) - BG));
    let x = 40;
    for(const c of ci){ const L = cols[c], colH = L.reduce((a,b)=>a + b.h + BG, 0) - BG; let y = 60 + Math.max(0, (H - colH)/3);
      for(const b of L){ b.x = x; b.y = y;
        b.sub.forEach((s, si)=>{ let yy = y + HEAD; for(const n of s){ n.x = Math.round(x + PAD + si*(FL_W+GX)); n.y = Math.round(yy); yy += flHt(n) + GY; } });
        y += b.h + BG; }
      x += Math.max(...L.map(b=>b.w)) + CG; }
    return cols;
  };
  let cols = place();
  for(let it=0; it<3; it++){
    // Kästchen und Blöcke nach der Lage ihrer Quellen sortieren, damit sich Drähte wenig kreuzen
    for(const b of blocks) for(const s of b.sub) s.sort((a,c)=>(bary(a) ?? 1e9) - (bary(c) ?? 1e9) || rank(a)-rank(c));
    for(const L of Object.values(cols)) L.sort((a,c)=>{ const ba = a.mem.map(bary).filter(v=>v!=null), bc = c.mem.map(bary).filter(v=>v!=null);
      const va = ba.length ? ba.reduce((s,v)=>s+v,0)/ba.length : 1e9, vc = bc.length ? bc.reduce((s,v)=>s+v,0)/bc.length : 1e9;
      return a.g && c.g && a.col===3 && c.col===3 ? ord(a) - ord(c) : (va - vc) || ord(a) - ord(c); });
    blocks.length = 0; for(const L of Object.values(cols)) blocks.push(...L);
    cols = place(); }
  F.colh = []; S.flView = null;
}
flLayoutAll = (prev => function(){ if(grpOn() && (FL().groups||[]).length){ grpEnsure(); FL().grpHint = 1; return flLayoutGrp(); } return prev.apply(this, arguments); })(flLayoutAll);

// Neue Kästchen: in den Rahmen ihrer Gruppe, unter die anderen – der Rest bleibt, wo er ist
flLayout = (prev => function(){
  const F = FL(); if(!grpOn() || !F.nodes.length) return prev.apply(this, arguments);
  grpEnsure(); const neu = F.nodes.filter(n=>!n.pl);
  if(!neu.length) return; if(neu.length === F.nodes.length){ flLayoutAll(); F.nodes.forEach(n=>n.pl = 1); return; }
  const placed = F.nodes.filter(n=>n.pl), GAP = 20, touched = new Set();
  // nur Kästchen der eigenen Gruppe (und ohne Gruppe) zählen – andere Gruppen rücken danach nach unten
  const hit = (n, x, y) => placed.find(o=>o!==n && (!o.g || o.g===n.g) && Math.abs(o.x - x) < FL_W + 24 && y < o.y + flHt(o) + GAP && y + flHt(n) + GAP > o.y);
  for(const n of neu){ const mem = placed.filter(o=>o.g && o.g===n.g); if(!mem.length) continue;
    const same = mem.filter(o=>o.t===n.t), ref = same.length ? same : mem, xs = ref.map(o=>o.x).sort((a,b)=>a-b), x = xs[Math.floor(xs.length/2)];
    const colm = mem.filter(o=>Math.abs(o.x - x) < FL_W); let y = colm.length ? Math.max(...colm.map(o=>o.y + flHt(o))) + GAP : Math.max(...mem.map(o=>o.y + flHt(o))) + GAP;
    for(let i=0, o; i<300 && (o = hit(n, x, y)); i++) y = o.y + flHt(o) + GAP;
    n.x = Math.round(x); n.y = Math.round(y); n.pl = 1; placed.push(n); touched.add(n.g); }
  touched.forEach(g=>grpResolve(g));
  return prev.apply(this, arguments);      // Kästchen ohne Gruppe wie bisher
})(flLayout);

/* ---------- Rahmen zeichnen, Seite aufräumen ---------- */
vGeldfluss = (prev => function(){ let h = prev(); if(NATIVE || !FL().nodes.length) return h;
  const F = FL(), ym = flYm(); grpEnsure();
  const t = document.createElement('template'); t.innerHTML = h; const R = t.content;
  // Rahmen hinter Drähten und Kästchen
  const svg = R.querySelector('#flw svg.fls'); if(svg){ const P = flPlan(ym); svg.insertAdjacentHTML('beforebegin', grpHtml(P)); if(grpOn() && (F.groups||[]).length) R.querySelectorAll('.flcolh').forEach(x=>x.remove()); }
  const bar = R.querySelector('.flbar'), c = R.querySelector('#flc');
  if(bar && c){
    const take = a => { const b = bar.querySelector(`[data-act="${a}"]`); b?.remove(); return b; };
    const ai = take('flai'), pat = take('flpat'), add = take('fladd'), coll = take('flcoll'), ext = take('flext'), lay = take('fllay'), fit = take('flfit'), reb = take('flrebuild');
    bar.querySelectorAll(':scope > .sp').forEach(x=>x.remove());
    const mi = (b, label) => b ? `<button class="flmi" data-act="${b.dataset.act}">${label}</button>` : '';
    bar.insertAdjacentHTML('beforeend', `<div class="flacts">
      ${ai ? ai.outerHTML : ''}${pat ? pat.outerHTML : ''}
      <details class="flmenu"><summary class="btn sm">+ Hinzufügen</summary><div class="flmp">
        ${mi(add, '<b>Kästchen</b><span>Konto, Topf oder Ausgaben</span>')}${mi(coll, '<b>Kasten zum Zurücklegen</b><span>z. B. alle Steuern zusammen</span>')}${mi(ext, '<b>Empfänger</b><span>Hypothek, Vermieter, Versicherung, Abo …</span>')}
        <button class="flmi" data-act="flgrpnew"><b>Gruppe</b><span>Rahmen um mehrere Kästchen</span></button></div></details>
      ${lay ? `<button class="btn sm" data-act="fllay">Anordnen</button>` : ''}${fit ? `<button class="btn sm ghost" data-act="flfit">Einpassen</button>` : ''}
      <details class="flmenu"><summary class="btn sm ghost">Mehr</summary><div class="flmp">
        <button class="flmi" data-act="flgrpauto"><b>Gruppen neu vorschlagen</b><span>alle Kästchen wieder automatisch einteilen</span></button>
        <button class="flmi" data-act="flgrpoff"><b>${grpOn() ? 'Gruppen ausblenden' : 'Gruppen einblenden'}</b><span>${grpOn() ? 'nur Kästchen und Drähte zeigen' : 'Rahmen wieder zeigen'}</span></button>
        ${mi(reb, '<b>Neu aufbauen</b><span>aus Konten, Daueraufträgen und Budget – ersetzt alles</span>')}</div></details></div>`);
    if(grpOn() && F.grpHint===0) bar.insertAdjacentHTML('afterend', `<div class="card flgrphint"><span class="sp"><b>Gruppen sind vorgebaut:</b> Einkommen, Zahlungskonten, Sparen & Anlagen, Fixe Ausgaben, Persönliche Ausgaben. Deine Anordnung bleibt – «Nach Gruppen anordnen» stellt jede Gruppe als eigenen Block zusammen.</span><button class="btn sm pri" data-act="fllay">Nach Gruppen anordnen</button><button class="btn sm ghost" data-act="flgrphint">Später</button></div>`);
    // Legende in die Fläche
    const lg = R.querySelector('.fllegend'), wl = R.querySelector('.flwlg');
    c.insertAdjacentHTML('afterbegin', `<details class="flleg"><summary>Legende</summary><div class="fllegb"></div></details>`);
    const lb = c.querySelector('.fllegb'); if(lg) lb.appendChild(lg); if(wl) lb.appendChild(wl);
    lb.insertAdjacentHTML('beforeend', `<p class="small muted" style="margin:6px 0 0">Gruppe: am Kopf ziehen = ganze Gruppe verschieben · antippen = umbenennen, Farbe, Kästchen wählen · ein Kästchen in einen anderen Rahmen ziehen = umteilen.</p>`);
    // Liste der Verbindungen eingeklappt
    const li = R.querySelector('.card.fllist'); if(li){ const h3 = li.querySelector('h3'), d = document.createElement('details'); d.className = 'card fllist fllistd'; if(S.flListOpen) d.open = true;
      d.innerHTML = `<summary><h3>${h3 ? h3.innerHTML : 'Alle Verbindungen'} <span class="muted small">(${F.edges.length})</span></h3></summary>`; h3?.remove(); while(li.firstChild) d.appendChild(li.firstChild); li.replaceWith(d); }
  }
  return t.innerHTML; })(vGeldfluss);
CUSTOM_V.geldfluss = vGeldfluss;
render = (prev => function(){ try{ if(D && S.view==='geldfluss') grpEnsure(); }catch(e){} const r = prev.apply(this, arguments);
  try{ if(D && S.view==='geldfluss' && !NATIVE && $('#flw')) flFixOverlap(); }catch(e){} return r; })(render);
// Wird ein Kästchen höher (mehr Angaben), rutscht das darunter nach – nur so weit, dass nichts überlappt
function flFixOverlap(){
  const N = FL().nodes.slice().sort((a,b)=>a.y-b.y), moved = new Set();
  for(let it=0; it<60; it++){ let ch = false;
    for(let i=0; i<N.length; i++) for(let j=i+1; j<N.length; j++){ const a = N[i], b = N[j];
      if(Math.abs(a.x - b.x) < FL_W + 4 && b.y >= a.y && b.y < a.y + flHt(a) + 12){ b.y = Math.round(a.y + flHt(a) + 18); moved.add(b); ch = true; } }
    if(!ch) break; N.sort((a,b)=>a.y-b.y); }
  if(!moved.size) return;
  moved.forEach(n=>{ const el = document.querySelector(`#flw .fnode[data-n="${n.id}"]`); if(el) el.style.top = n.y+'px'; });
  (FL().groups||[]).forEach(g=>grpResolve(g.id)); FL().nodes.forEach(n=>{ const el = document.querySelector(`#flw .fnode[data-n="${n.id}"]`); if(el) el.style.top = n.y+'px'; });
  grpRedraw(); const s = $('#flw svg.fls'), ym = flYm(), P = flPlan(ym); if(s) s.innerHTML = flWires(P, flEff(ym, P)); save();
}

/* ---------- Gruppe verschieben, umteilen ---------- */
var grpDrag = null;
window.addEventListener('pointerdown', ev=>{
  if(S.view!=='geldfluss' || ev.button!==0) return; const h = ev.target.closest?.('[data-ghead]'); if(!h) return;
  ev.stopPropagation(); ev.preventDefault();
  if(!flCanEdit()){ grpDialog(h.dataset.ghead); return; }
  const g = h.dataset.ghead, mem = grpMem(g); grpDrag = {g, mem, st:mem.map(n=>[n.x, n.y]), p0:flWorld(ev), moved:false};
  $('#flc')?.setPointerCapture?.(ev.pointerId); }, true);
window.addEventListener('pointermove', ev=>{
  if(grpDrag){ const p = flWorld(ev), dx = p.x - grpDrag.p0.x, dy = p.y - grpDrag.p0.y; if(Math.abs(dx) + Math.abs(dy) > 4) grpDrag.moved = true; if(!grpDrag.moved) return;
    grpDrag.mem.forEach((n, i)=>{ n.x = Math.round(grpDrag.st[i][0] + dx); n.y = Math.round(grpDrag.st[i][1] + dy); const el = document.querySelector(`#flw .fnode[data-n="${n.id}"]`); if(el){ el.style.left = n.x+'px'; el.style.top = n.y+'px'; } });
    grpRedraw(); if(!grpDrag.P){ grpDrag.P = flPlan(flYm()); grpDrag.Fx = flEff(flYm(), grpDrag.P); } const s = $('#flw svg.fls'); if(s) s.innerHTML = flWires(grpDrag.P, grpDrag.Fx); return; }
  if(typeof flDrag!=='undefined' && flDrag?.k==='move') grpRedraw(); });
window.addEventListener('pointerup', ev=>{
  if(grpDrag){ const d = grpDrag; grpDrag = null; if(d.moved){ save(); render(); } else grpDialog(d.g); return; }
  // Kästchen in einen anderen Rahmen gezogen: dorthin umteilen
  if(typeof flDrag!=='undefined' && flDrag?.k==='move' && flDrag.moved && grpOn()){ const n = flDrag.n, cx = n.x + FL_W/2, cy = n.y + 30;
    const tgt = (FL().groups||[]).find(g=>{ if(g.id===n.g) return false; const r = grpRect(g.id, n); return r && cx > r.x && cx < r.x + r.w && cy > r.y && cy < r.y + r.h; });
    if(tgt){ n.g = tgt.id; n.gm = 1; toastMsg(`«${flName(n)}» ist jetzt in «${tgt.n}»`); }
    setTimeout(grpRedraw, 0); } }, true);

/* ---------- Dialoge ---------- */
function grpDialog(id){
  const F = FL(), g = id ? (F.groups||[]).find(x=>x.id===id) : null, ed = flCanEdit();
  const mem = new Set(g ? grpMem(g.id).map(n=>n.id) : []), col = g?.c || GRP_COL[(F.groups||[]).length % GRP_COL.length];
  const list = F.nodes.slice().sort((a,b)=>(mem.has(b.id) - mem.has(a.id)) || a.x - b.x || a.y - b.y);
  dialog(`<h3>${g ? esc(g.n) : 'Neue Gruppe'}</h3>
    <p class="small muted" style="margin-top:-6px">Ein Rahmen um zusammengehörige Kästchen – nur zur Übersicht, an den Beträgen ändert sich nichts.</p>
    <label class="f">Name<input id="grpn" value="${esc(g?.n||'')}" placeholder="z. B. Wohnen, Auto, Ferien"></label>
    <div class="f"><span class="small">Farbe</span><div class="grpcols">${GRP_COL.map(c=>`<label style="--gc:${c}"><input type="radio" name="grpc" value="${c}" ${c===col?'checked':''}><i></i></label>`).join('')}</div></div>
    <div class="f"><span class="small">Kästchen in dieser Gruppe</span><div class="grpli">${list.map(n=>{ const o = grpOf(n); return `<label class="chk"><input type="checkbox" data-grpm="${n.id}" ${mem.has(n.id)?'checked':''} ${ed?'':'disabled'}> ${esc(flName(n))}${o && o.id!==g?.id ? ` <span class="small muted">· jetzt in ${esc(o.n)}</span>` : ''}</label>`; }).join('')}</div></div>
    <div class="acts">${g && ed ? '<button class="btn danger" data-dlg="del">Gruppe auflösen</button>' : ''}<button class="btn" data-dlg="cancel">Abbrechen</button>${ed ? `<button class="btn pri" data-dlg="ok">${g ? 'Speichern' : 'Gruppe anlegen'}</button>` : ''}</div>`,
  k=>{ if(k==='cancel') return;
    if(k==='del'){ if(g.k && g.k!=='u') (F.grpDel ??= []).push(g.k); F.groups = F.groups.filter(x=>x!==g); grpMem(g.id).forEach(n=>{ delete n.g; n.gm = 1; }); save(); render(); toastMsg(`Gruppe «${g.n}» aufgelöst – die Kästchen bleiben`); return; }
    if(k!=='ok') return; const nm = val('grpn').trim(); if(!nm){ $('#grpn').style.borderColor = 'var(--bad)'; return false; }
    const c = document.querySelector('input[name="grpc"]:checked')?.value || col;
    let G = g; if(!G){ G = {id:'g'+uid(), k:'u', n:nm, c}; (F.groups ??= []).push(G); F.grpOff = false; } else { G.n = nm; G.c = c; }
    for(const i of document.querySelectorAll('[data-grpm]')){ const n = flN(i.dataset.grpm); if(!n) continue;
      if(i.checked && n.g!==G.id){ n.g = G.id; n.gm = 1; } else if(!i.checked && n.g===G.id){ delete n.g; n.gm = 1; } }
    grpResolve(G.id); save(); render(); toastMsg(g ? 'Gruppe gespeichert' : `Gruppe «${nm}» angelegt`); });
}
document.addEventListener('click', ev=>{
  const a = ev.target.closest('[data-act="flgrpnew"],[data-act="flgrpauto"],[data-act="flgrpoff"],[data-act="flgrphint"]'); if(!a || !D) return;
  a.closest('details.flmenu')?.removeAttribute('open');
  const F = FL(), act = a.dataset.act;
  ev.stopPropagation(); ev.preventDefault();
  if(act==='flgrpnew') return grpDialog(null);
  if(act==='flgrphint'){ F.grpHint = 1; save(); render(); return; }
  if(act==='flgrpoff'){ F.grpOff = !F.grpOff; save(); render(); toastMsg(F.grpOff ? 'Gruppen ausgeblendet' : 'Gruppen eingeblendet'); return; }
  if(act==='flgrpauto'){ F.grpOff = false; F.grpDel = []; F.nodes.forEach(n=>{ delete n.g; delete n.gm; }); F.groups = (F.groups||[]).filter(g=>g.k==='u');
    grpEnsure(); F.grpHint = 0; save(); render(); toastMsg('Gruppen neu vorgeschlagen – «Nach Gruppen anordnen» stellt sie als Blöcke zusammen'); }
}, true);
// Menüs schliessen, wenn daneben getippt wird; Liste merken
document.addEventListener('click', ev=>{ document.querySelectorAll('details.flmenu[open]').forEach(d=>{ if(!d.contains(ev.target)) d.removeAttribute('open'); }); });
document.addEventListener('toggle', ev=>{ if(ev.target?.classList?.contains('fllistd')) S.flListOpen = ev.target.open; }, true);
