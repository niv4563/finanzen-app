/* =====================================================================
   88. KONTOARTEN, EMPFÄNGER, GANZER PLAN IM GELDFLUSS, OPTIMIEREN (1.63.0)
   • Jede Kontoart hat eigene Angaben: Zins, Zinsstufe, Gebühren, Bezugslimite, Ziel,
     Depot- und Produktkosten, gebunden bis … (Kreditkarten wie bisher in 82.js).
   • Kästchen sehen je nach Kontoart anders aus (Farbe, Symbol, Form).
   • Empfänger ausserhalb deiner Konten (Hypothek, Vermieter, Versicherung, Krankenkasse,
     Steuern, Energie, Abo …): «gehört nicht dir», gestrichelt, mit Vertragsangaben.
     Technisch ein Ausgaben-Kästchen mit ref 'x:<id>', eigenen Kategorien und Abos.
   • «Plan im Geldfluss»: zeigt, was aus dem Budget noch nicht verbunden ist, und
     verbindet alles mit einem Tipp. Budget lässt sich direkt im Kästchen ändern.
   • «Optimieren»: Zins, Gebühren, zu viel auf dem Alltagskonto, Schulden vs. Sparen,
     Säule 3a, unverteiltes Geld, auslaufende Hypothek, Abokosten.
   Alles wird nur auf dem Gerät gerechnet; nichts wird gebucht.
   ===================================================================== */
Object.assign(AI, {
  piggy:'<path d="M5 11a7 6 0 0 1 12.5-3.5L20 7v4l-1.5.8A7 6 0 0 1 15 17v2h-2.5v-1.5h-3V19H7v-2.5A6 6 0 0 1 5 11z"/><circle cx="15" cy="10.5" r=".8"/>',
  home:'<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5M10 20v-5h4v5"/>',
  lock:'<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  bank:'<path d="M3 9l9-5 9 5M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18"/>',
  doc:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  shield:'<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>',
  bolt:'<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
  phone:'<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
  person:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  cross:'<path d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5z"/>',
  coin:'<circle cx="12" cy="12" r="8"/><path d="M14.5 9.2c-.6-.8-1.5-1.2-2.5-1.2-1.6 0-2.7.9-2.7 2s1 1.7 2.7 2 2.7.9 2.7 2-1.1 2-2.7 2c-1.1 0-2-.4-2.6-1.2M12 6.5v11"/>',
});

/* ---------- Kontoarten: Aussehen ---------- */
var AK_STYLE = {
  alltag:  {c:'#3a6fd8', i:'wallet'},
  sparen:  {c:'#2e9d5b', i:'piggy'},
  haushalt:{c:'#8a5cc7', i:'home'},
  karte:   {c:'#56606d', i:'card'},
  invest:  {c:'#3c4fb3', i:'trend'},
  vorsorge:{c:'#a0702e', i:'lock'},
};
var EXT_K = {
  hypothek:    {l:'Hypothek', i:'bank',   re:/hypothek|hypo\b|eigenmietwert/},
  kredit:      {l:'Kredit / Leasing', i:'bank', re:/leasing|kredit(?!karte)|darlehen|amortis/},
  miete:       {l:'Vermieter', i:'home',  re:/miete|mietzins|wohnung/},
  krankenkasse:{l:'Krankenkasse', i:'cross', re:/krankenkasse|krankenversich|grundversich|zusatzversich|kk-?pr/},
  versicherung:{l:'Versicherung', i:'shield', re:/versicherung|haftpflicht|hausrat|police|motorfahrzeug/},
  steuern:     {l:'Steuern', i:'doc',     re:/steuer/},
  energie:     {l:'Energie', i:'bolt',    re:/strom|\bgas\b|energie|heiz|wasser|nebenkosten/},
  telefon:     {l:'Telefon & Internet', i:'phone', re:/swisscom|salt|sunrise|handy|telefon|internet|\btv\b|mobil/},
  abo:         {l:'Abo', i:'doc',         re:/abo\b|abos|abonnement|streaming/},
  person:      {l:'Person', i:'person',   re:/^$/},
  anderes:     {l:'Empfänger', i:'coin',  re:/^$/},
};
var isExt = n => !!n && n.t==='exp' && String(n.ref).startsWith('x:');
var flAccOf = n => n && n.t==='acc' ? D.accounts.find(a=>a.id===n.ref) : null;
var accDet = a => a ? (a.det ??= {}) : {};
var accRate = a => +((a?.det?.rate) ?? a?.rate) || 0;
var accLabelG = g => (ACC_GRP.find(x=>x[0]===g)||[])[1] || 'Konto';

flCol = (prev => n => { if(isExt(n)) return '#7d838c'; if(n.t==='acc'){ const a = flAccOf(n); if(a) return AK_STYLE[accGrp(a)]?.c || prev(n); } return prev(n); })(flCol);
flKind = (prev => n => isExt(n) ? `Extern · ${(EXT_K[n.ext]||EXT_K.anderes).l}` : prev(n))(flKind);

/* ---------- Empfänger: Kategorien und Abos ---------- */
var aboMonthly = a => !a || a.active===false ? 0 : (a.interval==='J' ? (+a.price||0)/12 : (+a.price||0));
flBud = (prev => (cats, ym) => { let s = 0; const real = [];
  for(const c of cats){ if(typeof c==='string' && c.startsWith('abo:')) s += aboMonthly((D.abos||[]).find(a=>a.id===c.slice(4))); else real.push(c); }
  return prev(real, ym) + s; })(flBud);
flExpCats = (prev => function(n){
  if(isExt(n)){ const own = new Set(FL().nodes.filter(x=>x.t==='exp' && String(x.ref).startsWith('c:')).map(x=>x.ref.slice(2)));
    const cs = (n.cats||[]).filter(c=>D.cats.some(x=>x.id===c && !x.archived) && !own.has(c));
    return cs.length ? cs : (n.abos||[]).filter(id=>(D.abos||[]).some(a=>a.id===id)).map(id=>'abo:'+id); }
  const r = prev(n); if(!String(n.ref).startsWith('g:')) return r;
  const ext = new Set(FL().nodes.filter(isExt).flatMap(x=>x.cats||[]));
  return r.filter(c=>!ext.has(c)); })(flExpCats);
var extLabel = c => String(c).startsWith('abo:') ? ((D.abos||[]).find(a=>a.id===c.slice(4))?.name || 'Abo') : catName(c);

/* ---------- Kontoangaben je Art ---------- */
var VK = [['3a','Säule 3a Konto'], ['3aw','Säule 3a Wertschriften'], ['fz','Freizügigkeitskonto'], ['pk','Pensionskasse'], ['anders','Andere Vorsorge']];
var ACC_DET = {
  alltag: [['bank','Bank','text','z. B. PostFinance'], ['rate','Zins %','pct','z. B. 0'], ['feeM','Kontoführung CHF pro Monat','chf','z. B. 5'], ['minBal','Immer mindestens drauf lassen CHF','chf','z. B. 1500'], ['purpose','Wofür','text','z. B. Lohn und Alltag']],
  sparen: [['bank','Bank','text','z. B. Raiffeisen'], ['rate','Zins %','pct','z. B. 0.75'], ['rateCap','Zins gilt bis CHF','chf','leer = ohne Grenze'], ['rate2','Zins darüber %','pct','z. B. 0.1'], ['wdLimit','Bezug ohne Kündigung CHF pro Jahr','chf','z. B. 25000'], ['notice','Kündigungsfrist (Tage)','int','z. B. 90'], ['goal','Ziel CHF','chf','z. B. 20000'], ['purpose','Wofür','text','z. B. Notgroschen, Eigenheim']],
  haushalt:[['bank','Bank','text',''], ['rate','Zins %','pct','z. B. 0'], ['feeM','Kontoführung CHF pro Monat','chf',''], ['shared','Gemeinsames Konto','chk',''], ['share','Mein Anteil %','pct','z. B. 50'], ['minBal','Immer mindestens drauf lassen CHF','chf',''], ['purpose','Wofür','text','z. B. Hypothek, Nebenkosten, Haushalt']],
  invest: [['bank','Anbieter','text','z. B. Swissquote'], ['feePct','Depotgebühr % pro Jahr','pct','z. B. 0.2'], ['ter','Produktkosten (TER) %','pct','z. B. 0.2'], ['trade','Gebühr pro Kauf CHF','chf','z. B. 9'], ['ret','Erwartete Rendite % pro Jahr','pct','z. B. 4'], ['purpose','Strategie / Wofür','text','z. B. Welt-ETF, langfristig']],
  vorsorge:[['bank','Anbieter','text','z. B. VIAC'], ['vkind','Art','sel',VK], ['rate','Zins bzw. erwartete Rendite %','pct','z. B. 3'], ['feePct','Kosten % pro Jahr','pct','z. B. 0.4'], ['until','Gebunden bis (Jahr)','int','z. B. 2060'], ['purpose','Wofür','text','z. B. Pension, Eigenheim']],
};
function accDetDialog(id){
  const a = D.accounts.find(x=>x.id===id); if(!a) return; const g = accGrp(a);
  if(g==='karte') return kkDetDialog(id);
  const F = ACC_DET[g] || ACC_DET.alltag, d = accDet(a), v = x => x==null ? '' : String(x);
  const field = ([k, l, ty, ph]) => ty==='chk' ? `<label class="chk"><input type="checkbox" id="ad_${k}" ${d[k]?'checked':''}> ${l}</label>`
    : ty==='sel' ? `<label class="f">${l}<select id="ad_${k}"><option value="">– wählen –</option>${ph.map(([x,t])=>`<option value="${x}" ${d[k]===x?'selected':''}>${t}</option>`).join('')}</select></label>`
    : `<label class="f">${l}<input id="ad_${k}" ${ty==='text'?'':'inputmode="decimal"'} value="${esc(ty==='chf'&&d[k]!=null?chf(d[k]):v(d[k]))}" placeholder="${esc(ph)}"></label>`;
  dialog(`<h3>${esc(a.name)}</h3>
    <p class="small muted" style="margin-top:-6px"><span class="akchip" style="--nc:${AK_STYLE[g].c}">${aic(AK_STYLE[g].i)} ${accLabelG(g)}</span> · <a class="link" data-act="acclook" data-id="${a.id}">Kontoart ändern</a></p>
    <p class="small muted">Die Angaben bleiben verschlüsselt auf deinen Geräten. Die App rechnet damit Zins, Kosten und Vorschläge unter «Optimieren».</p>
    <div class="adgrid">${F.map(field).join('')}</div>
    <label class="f">Notiz<input id="ad_note" value="${esc(d.note||'')}" placeholder="z. B. Konditionen gültig ab 1.1."></label>
    <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Speichern</button></div>`,
  k=>{ if(k!=='ok') return; const out = {};
    for(const [key, , ty] of F){ const el = $('#ad_'+key); if(!el) continue;
      if(ty==='chk'){ if(el.checked) out[key] = 1; continue; }
      const s = el.value.trim(); if(!s) continue;
      if(ty==='text' || ty==='sel'){ out[key] = s.slice(0,80); continue; }
      const n = parseNum(s), max = ty==='pct' ? 100 : ty==='int' ? 3000 : 1e8;
      if(!isFinite(n) || n<0 || n>max){ el.style.borderColor = 'var(--bad)'; toastMsg('Bitte eine gültige Zahl eingeben.'); return false; }
      out[key] = ty==='int' ? Math.round(n) : r2(n); }
    const note = $('#ad_note').value.trim(); if(note) out.note = note.slice(0,200);
    a.det = out; if(out.rate!=null) a.rate = out.rate; else delete a.rate;
    toastMsg('Gespeichert'); });
}
// Kurzangaben für Kästchen und Listen
function accFacts(a){
  if(!a) return []; const g = accGrp(a), d = a.det || {}, bal = accBal(a), f = [];
  if(g==='karte'){ if(a.rate) f.push(`${a.rate} % Zins`); if(a.limit) f.push(`Limite ${chf0(a.limit)}`); if(cardFullOf(a)) f.push('ganz bezahlt'); return f; }
  if(d.rate!=null) f.push(`${d.rate} % Zins${d.rateCap?` bis ${chf0(d.rateCap)}`:''}`);
  if(g==='sparen' && d.goal) f.push(`Ziel ${chf0(d.goal)} · ${Math.min(100, Math.round(Math.max(0,bal)/d.goal*100))} %`);
  if(d.minBal) f.push(`Puffer ${chf0(d.minBal)}`);
  if(g==='haushalt' && d.shared) f.push(`gemeinsam${d.share?` · ${d.share} % meins`:''}`);
  if(g==='invest'){ const k = (+d.feePct||0) + (+d.ter||0); if(k) f.push(`Kosten ${r2(k)} % / Jahr`); if(d.ret) f.push(`Rendite ~${d.ret} %`); }
  if(g==='vorsorge'){ f.push(`gebunden${d.until?' bis '+d.until:''}`); if(d.vkind) f.push((VK.find(x=>x[0]===d.vkind)||[])[1]); }
  if(d.feeM) f.push(`Gebühr ${chf0(d.feeM)}/Mt.`);
  return f;
}
var accMissing = a => { const g = accGrp(a), d = a.det || {}; if(g==='karte') return [];
  const m = []; if(d.rate==null && g!=='invest') m.push('Zins'); if(g==='invest' && d.ter==null) m.push('Kosten'); if(!d.bank) m.push(g==='invest'||g==='vorsorge'?'Anbieter':'Bank'); return m; };

// Seite «Konten»: Karte «Kontoangaben» und beim Konto ein direkter Weg
function accDetCardHtml(){
  const accs = D.accounts.filter(a=>!a.archived && accGrp(a)!=='karte'); if(!accs.length) return '';
  const by = {}; accs.forEach(a=>(by[accGrp(a)] ??= []).push(a));
  return `<div class="card" id="adcard"><h3>Kontoangaben</h3><p class="small muted" style="margin-top:-6px">Zins, Gebühren und Zweck pro Konto – je nach Kontoart andere Angaben.</p>
    ${ACC_GRP.filter(([g])=>by[g]).map(([g,l])=>`<div class="adgh" style="--nc:${AK_STYLE[g].c}">${aic(AK_STYLE[g].i)} ${l}</div>${by[g].map(a=>{ const f = accFacts(a), m = accMissing(a);
      return `<div class="adrow" data-act="accdet" data-id="${a.id}" role="button"><span class="sp"><b>${esc(a.name)}</b><span class="small muted">${[a.det?.purpose ? esc(a.det.purpose) : '', ...f.map(esc)].filter(Boolean).join(' · ') || 'noch keine Angaben'}${m.length?` · <i>fehlt: ${m.join(', ')}</i>`:''}</span></span><b class="num">${chf0(accBal(a))}</b></div>`; }).join('')}`).join('')}
    ${(()=>{ const o = flOpt(); return o.length ? `<p class="small mt"><a class="link" data-go="geldfluss">${o.length} Optimierung${o.length===1?'':'en'} im Geldfluss ansehen</a></p>` : ''; })()}</div>`;
}
render = (prev => function(){ const r = prev.apply(this, arguments);
  try{ if(D && !S.locked && S.view==='konten' && !$('#adcard')){ const h = accDetCardHtml(), k = $('#kkcard') || $('#acccount'); if(h) k ? k.insertAdjacentHTML('afterend', h) : $('#main')?.insertAdjacentHTML('beforeend', h); } }catch(e){}
  return r; })(render);
balDialog = (prev => function(id){ prev.apply(this, arguments);
  const a = D.accounts.find(x=>x.id===id); if(!a || accGrp(a)==='karte') return; const f = accFacts(a);
  $('#dlgbody h3')?.insertAdjacentHTML('afterend', `<p class="small" style="margin:-4px 0 8px"><a class="link" data-act="accdet" data-id="${id}">Kontoangaben: Zins, Gebühren, Zweck</a>${f.length?` <span class="muted">· ${f.map(esc).join(' · ')}</span>`:''}</p>`); })(balDialog);

/* ---------- Kästchen je nach Art darstellen ---------- */
flNodeHtml = (prev => function(n, P, Fx){ let h = prev(n, P, Fx);
  let cls = '', icon = '', facts = [];
  if(n.t==='acc'){ const a = flAccOf(n); if(!a) return h; const g = accGrp(a); cls = 'ak-'+g; icon = AK_STYLE[g].i; facts = accFacts(a).slice(0,2); }
  else if(isExt(n)){ const k = EXT_K[n.ext] || EXT_K.anderes, d = n.det || {}; cls = 'fn-ext'; icon = k.i;
    if(d.rate) facts.push(`${d.rate} % Zins`); if(d.debt) facts.push(`Schuld ${chf0(d.debt)}`); if(d.until) facts.push(`bis ${ymLabel(d.until)}`);
    if(d.bank) facts.unshift(d.bank);
    const cs = flExpCats(n), lab = cs.length && cs.every(c=>String(c).startsWith('abo:')) ? `${cs.length} Abo${cs.length===1?'':'s'} · nicht dir` : 'pro Monat · gehört nicht dir';
    h = h.replace(/Budget · \d+ Kategorien?/, lab); }
  else if(n.t==='inc') icon = 'coin'; else if(n.t==='pot') icon = 'piggy';
  if(cls) h = h.replace(`class="fnode fn-${n.t}"`, `class="fnode fn-${n.t} ${cls}"`);
  if(icon) h = h.replace(/(<div class="fnh"[^>]*>)/, `$1<span class="fnic">${aic(icon)}</span>`);
  if(facts.length) h = h.replace(/(<div class="fnn">[\s\S]*?<\/div>)/, `$1<div class="fnf">${facts.map(esc).join(' · ')}</div>`);
  return h; })(flNodeHtml);

/* ---------- Empfänger anlegen und bearbeiten ---------- */
function extDialog(nid, preset){
  const F = FL(), n = nid ? flN(nid) : null, d = n?.det || {}, ym = flYm() < TODAY ? TODAY : flYm();
  const kind = n?.ext || preset?.ext || 'anderes', cats = new Set(n?.cats || preset?.cats || []), abos = new Set(n?.abos || []);
  const src = n ? flIn(n.id).map(e=>flSrcAcc(flN(e.f))).find(Boolean) : (preset?.acc || flpMain());
  const ownC = new Set(F.nodes.filter(isExt).filter(x=>x!==n).flatMap(x=>x.cats||[]));
  const catList = D.cats.filter(c=>!c.archived && !c.wid && c.group!=='inc' && !ownC.has(c.id));
  const bud = c => +(D.plan?.[c]?.[ym]) || 0;
  catList.sort((a,b)=>(cats.has(b.id)-cats.has(a.id)) || (bud(b.id)>0)-(bud(a.id)>0) || a.name.localeCompare(b.name));
  dialog(`<h3>${n ? esc(flName(n)) : 'Empfänger hinzufügen'}</h3>
    <p class="small muted" style="margin-top:-6px">Geld, das deine Konten verlässt: an die Bank für die Hypothek, an Vermieter, Versicherung, Krankenkasse, Steuern, ein Abo … Es gehört nicht dir und wird gestrichelt gezeigt.</p>
    <div class="adgrid"><label class="f">Art<select id="xk">${Object.entries(EXT_K).map(([k,x])=>`<option value="${k}" ${k===kind?'selected':''}>${x.l}</option>`).join('')}</select></label>
    <label class="f">Name<input id="xn" value="${esc(n?.name || preset?.name || '')}" placeholder="z. B. Hypothek Raiffeisen"></label>
    <label class="f">Bezahlt vom Konto<select id="xa">${D.accounts.filter(a=>!a.archived).map(a=>`<option value="${a.id}" ${a.id===src?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label>
    <label class="f">Bank / Anbieter<input id="xb" value="${esc(d.bank||'')}" placeholder="z. B. UBS, CSS, Swisscom"></label>
    <label class="f" data-xk="hypothek kredit">Zins %<input id="xr" inputmode="decimal" value="${d.rate??''}" placeholder="z. B. 1.6"></label>
    <label class="f" data-xk="hypothek kredit">Offene Schuld CHF<input id="xd" inputmode="decimal" value="${d.debt?chf(d.debt):''}" placeholder="z. B. 450000"></label>
    <label class="f" data-xk="hypothek kredit miete versicherung krankenkasse telefon abo energie anderes">Vertrag läuft bis<input id="xu" type="month" value="${esc(d.until||'')}"></label>
    <label class="f" data-xk="miete versicherung krankenkasse telefon abo energie anderes">Kündigungsfrist<input id="xf" value="${esc(d.notice||'')}" placeholder="z. B. 3 Monate auf Ende Jahr"></label></div>
    <h4 class="flph">Budget-Kategorien</h4><p class="small muted" style="margin:0 0 4px">Der Betrag pro Monat kommt aus diesen Kategorien. Sie zählen dann nicht mehr im Ausgaben-Bereich mit.</p>
    <div class="xcl">${catList.map(c=>`<label class="chk"><input type="checkbox" class="xc" value="${c.id}" ${cats.has(c.id)?'checked':''}> ${esc(c.name)} <span class="muted small">${bud(c.id)?'CHF '+chf0(bud(c.id)):''}</span></label>`).join('')}</div>
    ${(D.abos||[]).length?`<h4 class="flph">Abos</h4><p class="small muted" style="margin:0 0 4px">Zählen nur, wenn keine Budget-Kategorie gewählt ist – sonst steckt ihr Preis schon im Budget.</p>
    <div class="xcl">${(D.abos||[]).map(a=>`<label class="chk"><input type="checkbox" class="xab" value="${a.id}" ${abos.has(a.id)?'checked':''}> ${esc(a.name)} <span class="muted small">CHF ${chf0(aboMonthly(a))}/Mt.${a.active===false?' · inaktiv':''}</span></label>`).join('')}</div>`:''}
    <label class="f">Notiz<input id="xo" value="${esc(d.note||'')}" placeholder="z. B. Festhypothek 10 Jahre"></label>
    ${n ? acts(false, 'Empfänger entfernen') : `<div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Hinzufügen</button></div>`}`,
  k=>{ if(k==='cancel') return;
    if(k==='del'){ F.edges = F.edges.filter(e=>e.t!==n.id); F.nodes = F.nodes.filter(x=>x!==n); flSync(); save(); render(); return; }
    if(k!=='ok') return;
    const nm = $('#xn').value.trim(); if(!nm){ $('#xn').style.borderColor = 'var(--bad)'; return false; }
    const num = (id, max) => { const s = $('#'+id).value.trim(); if(!s) return null; const x = parseNum(s); return isFinite(x) && x>=0 && x<=max ? r2(x) : NaN; };
    const rate = num('xr', 30), debt = num('xd', 1e8); if(Number.isNaN(rate) || Number.isNaN(debt)){ toastMsg('Bitte eine gültige Zahl eingeben.'); return false; }
    const det = {}; if($('#xb').value.trim()) det.bank = $('#xb').value.trim().slice(0,60);
    if(rate!=null) det.rate = rate; if(debt!=null) det.debt = debt; if($('#xu').value) det.until = $('#xu').value;
    if($('#xf').value.trim()) det.notice = $('#xf').value.trim().slice(0,60); if($('#xo').value.trim()) det.note = $('#xo').value.trim().slice(0,200);
    const cs = [...document.querySelectorAll('.xc:checked')].map(i=>i.value), ab = [...document.querySelectorAll('.xab:checked')].map(i=>i.value);
    extSave(n, {ext:$('#xk').value, name:nm.slice(0,60), det, cats:cs, abos:ab}, $('#xa').value);
  });
  const sk = $('#xk'), upd = () => document.querySelectorAll('[data-xk]').forEach(l=>l.hidden = !l.dataset.xk.split(' ').includes(sk.value)); sk.onchange = upd; upd();
}
function extSave(n, o, acc, quiet){
  const F = FL(); F.since ||= TODAY;
  if(!n){ const id = uid(); n = {id:'n'+id, t:'exp', ref:'x:'+id, x:1000, y:40 + 150*F.nodes.filter(x=>x.t==='exp').length}; F.nodes.push(n); }
  Object.assign(n, o);
  // eine Kategorie bzw. ein Abo gehört zu genau einem Empfänger
  for(const x of F.nodes.filter(isExt)) if(x!==n){ x.cats = (x.cats||[]).filter(c=>!(n.cats||[]).includes(c)); x.abos = (x.abos||[]).filter(c=>!(n.abos||[]).includes(c)); }
  // Kategorien mit eigenem Kästchen gehen im Empfänger auf
  for(const c of n.cats||[]){ const own = F.nodes.find(x=>x.t==='exp' && x.ref==='c:'+c); if(own){ F.edges = F.edges.filter(e=>e.t!==own.id); F.nodes = F.nodes.filter(x=>x!==own); } }
  const cur = flIn(n.id), have = cur.find(e=>flSrcAcc(flN(e.f))===acc);
  if(!have){ F.edges = F.edges.filter(e=>e.t!==n.id); const s = flpEnsureAcc(acc, n.x-330, n.y); flpEnsureIn(s); F.edges.push({id:'e'+uid(), since:TODAY, f:s.id, t:n.id, mode:'deckt'}); }
  flpCache.k = null;
  if(!quiet){ flSync(); save(); render(); toastMsg('Gespeichert'); }
  return n;
}
flNodeDialog = (prev => function(nid){
  const n = flN(nid); if(isExt(n)) return extDialog(nid);
  prev(nid); if(!n) return;
  const sub = $('#dlgbody h3')?.nextElementSibling;
  if(n.t==='acc'){ const a = flAccOf(n); if(!a) return; const f = accFacts(a);
    sub?.insertAdjacentHTML('afterend', `<p class="small">${f.length?f.map(esc).join(' · ')+'<br>':''}<a class="link" data-act="${accGrp(a)==='karte'?'kkdet':'accdet'}" data-id="${a.id}">Kontoangaben ${f.length?'ändern':'ergänzen'}: Zins, Gebühren, Zweck</a></p>`); }
  if(n.t==='exp' && flCanEdit()) budEditInject(flExpCats(n));
})(flNodeDialog);

/* ---------- Budget direkt im Geldfluss ändern ---------- */
function budEditInject(cats){
  cats = cats.filter(c=>D.cats.some(x=>x.id===c)); if(!cats.length) return;
  const ym = flYm() < TODAY ? TODAY : flYm(), cur = c => +(D.plan?.[c]?.[ym]) || 0;
  const html = `<details class="flbud" ${cats.length<=4?'open':''}><summary class="small"><b>Budget ändern</b> ab ${ymLabel(ym)}</summary>
    ${cats.map(c=>`<label class="flbr"><span>${esc(catName(c))}</span><input data-flb="${c}" inputmode="decimal" value="${cur(c)?chf(cur(c)):''}" placeholder="0"></label>`).join('')}
    <label class="chk small"><input type="checkbox" id="flbfwd" checked> auch für alle folgenden Monate</label>
    <p class="small muted" style="margin:4px 0 0">Gleich wie unter «Budget › Planen». Muss-Kategorien nur bewusst ändern.</p></details>`;
  const ac = document.querySelector('#dlgbody .acts'); if(!ac) return; ac.insertAdjacentHTML('beforebegin', html);
  const dl = $('#dlg'), old = dl.onclick;
  dl.onclick = ev => { if(ev.target.closest('[data-dlg="ok"]')){ const fwd = $('#flbfwd')?.checked, ms = fwd ? (C?.months||[]).filter(m=>m>=ym) : [ym]; if(!ms.includes(ym)) ms.unshift(ym);
      for(const i of document.querySelectorAll('[data-flb]')){ const c = i.dataset.flb, s = i.value.trim(), v = s==='' ? 0 : parseNum(s);
        if(!isFinite(v) || v<0){ i.style.borderColor = 'var(--bad)'; return; } if(Math.abs(v - cur(c)) < 0.005) continue;
        for(const m of ms){ (D.plan[c] ??= {}); if(v) D.plan[c][m] = r2(v); else delete D.plan[c][m]; } } }
    return old ? old.call(dl, ev) : undefined; };
}

/* ---------- Muster erkennen: Empfänger ausserhalb ---------- */
function extSuggest(){
  const F = FL(), out = [], inExt = new Set(F.nodes.filter(isExt).flatMap(n=>n.cats||[])), aboExt = new Set(F.nodes.filter(isExt).flatMap(n=>n.abos||[]));
  const kat = new Set(F.edges.flatMap(e=>e.cats||[])), main = flpMain(), ms = flpMonths(6), pay = {};
  for(const ym of ms) for(const t of flMonthTx(ym)){ const v = kSpend(t); if(!v) continue; const c = bhKey(t.c); if(!c) continue; ((pay[c] ??= {})[bkAcc(t)] = (pay[c][bkAcc(t)]||0) + v); }
  const payer = c => { const by = pay[c] || {}, tot = Object.values(by).reduce((a,b)=>a+b,0); const top = Object.entries(by).sort((a,b)=>b[1]-a[1])[0];
    if(top && top[1]/tot >= 0.5 && D.accounts.some(a=>a.id===top[0] && !a.archived && accGrp(a)!=='karte')) return top[0];
    const n = F.nodes.find(x=>x.t==='exp' && flExpCats(x).includes(c)); return (n && flIn(n.id).map(e=>flSrcAcc(flN(e.f))).find(Boolean)) || main; };
  const kindOf = name => { const s = bkNorm(name); for(const [k, x] of Object.entries(EXT_K)) if(x.re.test(s)) return k; return null; };
  for(const c of D.cats.filter(c=>!c.archived && !c.wid && c.group!=='spar' && c.group!=='inc')){
    if(inExt.has(c.id) || kat.has(c.id)) continue; const k = kindOf(c.name); if(!k || k==='abo') continue;
    const avg = [0,1,2].reduce((a,i)=>a+(+(D.plan?.[c.id]?.[ymAdd(TODAY,i)])||0),0)/3; if(avg < 5) continue;
    const acc = payer(c.id);
    out.push({k:'ext', ext:k, c:c.id, acc, name:c.name, pre:true, t:`«${c.name}» geht an: ${EXT_K[k].l}`, d:`CHF ${chf0(avg)} pro Monat vom ${accName(acc)}. Wird als eigener Empfänger gezeigt – Geld, das nicht mehr dir gehört.`}); }
  const ab = (D.abos||[]).filter(a=>a.active!==false && !aboExt.has(a.id)), used = new Set(out.map(s=>s.c));
  if(ab.length){ const aboCat = D.cats.find(c=>!c.archived && !inExt.has(c.id) && !used.has(c.id) && !kat.has(c.id) && /(^|\s)abos?\b|abonnement|streaming/i.test(c.name) && [0,1,2].some(i=>+(D.plan?.[c.id]?.[ymAdd(TODAY,i)])>0));
    const tot = ab.reduce((a,x)=>a+aboMonthly(x),0), byAcc = {}; ab.forEach(a=>byAcc[a.acc] = (byAcc[a.acc]||0)+aboMonthly(a));
    const acc = Object.entries(byAcc).sort((a,b)=>b[1]-a[1])[0]?.[0] || main;
    out.push({k:'ext', ext:'abo', abos:ab.map(a=>a.id), c:aboCat?.id, acc, name:'Abos', pre:true, t:`${ab.length} Abo${ab.length===1?'':'s'} als Empfänger`, d:`Zusammen CHF ${chf0(tot)} pro Monat (CHF ${chf0(tot*12)} im Jahr)${aboCat?`, im Budget unter «${aboCat.name}»`:''}: ${ab.slice(0,5).map(a=>a.name).join(', ')}${ab.length>5?' …':''}.`}); }
  return out;
}
flPatterns = (prev => function(){ const v = prev(); if(v && !v._ext){ v._ext = 1; try{ const x = extSuggest(), xc = new Set(x.map(s=>s.c).filter(Boolean));
    // «wer bezahlt was» für dieselbe Kategorie geht im Empfänger auf (er hängt schon am richtigen Konto)
    v.list = v.list.filter(s=>!(s.k==='cat' && xc.has(s.c))); v.list.push(...x); }catch(e){} } return v; })(flPatterns);
flpDialog = (prev => function(){ prev(); const L = flPatterns().list, it = L.map((s,i)=>({s,i})).filter(x=>x.s.k==='ext'); if(!it.length) return;
  const ac = document.querySelector('#dlgbody .acts'); if(!ac) return;
  ac.insertAdjacentHTML('beforebegin', `<h4 class="flph">Empfänger ausserhalb deiner Konten</h4><p class="small muted" style="margin:0 0 6px">Wohin dein Geld geht, wenn es deine Konten verlässt.</p>${it.map(({s,i})=>`<label class="ltrow flpr"><input type="checkbox" class="flpc" value="${i}" ${s.pre?'checked':''}><span class="sp"><b>${esc(s.t)}</b><em>${esc(s.d)}</em></span></label>`).join('')}`); })(flpDialog);
flpApply = (prev => function(list){ const ex = list.filter(s=>s.k==='ext'), xc = new Set(ex.map(s=>s.c).filter(Boolean)), rest = list.filter(s=>s.k!=='ext' && !(s.k==='cat' && xc.has(s.c)));
  for(const s of ex) extSave(null, {ext:s.ext, name:s.name, det:{}, cats:s.c?[s.c]:[], abos:s.abos||[]}, s.acc, true);
  if(rest.length) prev(rest); else { flLayout(); flpCache.k = null; flSync(); save(); render(); }
  const n = list.length; if(ex.length) toastMsg(`${n} Verbindung${n===1?'':'en'} übernommen`); })(flpApply);

/* ---------- Plan im Geldfluss: was fehlt noch? ---------- */
function flCoverage(ym = TODAY){
  const F = FL(), cov = new Set(), miss = [];
  F.nodes.filter(n=>n.t==='exp').forEach(n=>flExpCats(n).forEach(c=>cov.add(c))); F.edges.forEach(e=>(e.cats||[]).forEach(c=>cov.add(c)));
  let tot = 0, ok = 0;
  for(const c of D.cats.filter(c=>!c.archived && !c.wid && c.group!=='inc')){ const v = +(D.plan?.[c.id]?.[ym]) || 0, nx = [1,2].some(i=>+(D.plan?.[c.id]?.[ymAdd(ym,i)])>0); if(!v && !nx) continue;
    tot += v; if(cov.has(c.id)) ok += v; else miss.push({k:'cat', c:c.id, v, t:catName(c.id), g:gSec(c).k}); }
  const incN = new Set(F.nodes.filter(n=>n.t==='inc').map(n=>n.ref));
  if(!incN.has('lohn') && (+D.income?.[ym]||0) > 0) miss.push({k:'inc', ref:'lohn', t:'Lohn', v:+D.income[ym]});
  (D.incSide||[]).forEach(s=>{ if(!incN.has(s.id) && +(s.plan?.[ym])>0) miss.push({k:'inc', ref:s.id, t:s.name, v:+s.plan[ym]}); });
  for(const p of (D.plans||[]).filter(p=>p.type==='tr' && !p.off && !p.flow && p.acc && p.to && (!p.end || p.end>=ym+'-01')))
    miss.push({k:'tr', p:p.id, t:`${accName(p.acc)} → ${accName(p.to)}`, v:+p.amount||0});
  const inFlow = new Set(F.nodes.filter(n=>n.t==='acc').map(n=>n.ref).concat(F.nodes.filter(n=>n.t==='pot').map(n=>n.acc)));
  for(const a of D.accounts.filter(a=>!a.archived && !inFlow.has(a.id))){ if(Math.abs(accBal(a)) < 1 && !flMonthTx(ym).some(t=>bkAcc(t)===a.id)) continue; miss.push({k:'acc', acc:a.id, t:a.name, v:accBal(a)}); }
  return {miss, pct: tot ? Math.round(ok/tot*100) : 100, tot, ok};
}
function flCoverFix(){
  const F = FL(), Cv = flCoverage(), main = flpMain(); F.since ||= TODAY; let n = 0;
  const mn = () => flpAccNode(main) || flpEnsureAcc(main, 0, 220);
  for(const m of Cv.miss){
    if(m.k==='inc'){ const x = {id:'n'+uid(), t:'inc', ref:m.ref, x:40, y:220}; F.nodes.push(x); F.edges.push({id:'e'+uid(), since:TODAY, f:x.id, t:mn().id, mode:'rest'}); n++; }
    else if(m.k==='tr'){ const p = D.plans.find(x=>x.id===m.p); if(!p) continue; const a = flpEnsureAcc(p.acc, mn().x, mn().y), b = flpEnsureAcc(p.to, a.x, a.y+160);
      if(flCanLink(a.id, b.id)) continue; const e = {id:'e'+uid(), since:TODAY, f:a.id, t:b.id, mode:'fix', a:+p.amount||0, day:+p.day||undefined, adopt:p.id}; F.edges.push(e); p.off = true; p.flowOff = e.id; n++; }
    else if(m.k==='acc'){ const a = D.accounts.find(x=>x.id===m.acc), s = flpEnsureAcc(m.acc, 660, 40); if(a && ['karte','haushalt'].includes(accGrp(a))) flpEnsureIn(s); n++; } }
  // fehlende Kategorien: in den passenden Bereich (Kästchen anlegen, falls es fehlt)
  const grp = {}; Cv.miss.filter(m=>m.k==='cat').forEach(m=>(grp[m.g] ??= []).push(m.c));
  for(const [g, cs] of Object.entries(grp)){ let node = F.nodes.find(x=>x.t==='exp' && x.ref==='g:'+g);
    if(!node){ node = {id:'n'+uid(), t:'exp', ref:'g:'+g, x:1000, y:40}; F.nodes.push(node); }
    if(!flIn(node.id).length){ const pay = {}; for(const ym of flpMonths(6)) for(const t of flMonthTx(ym)){ if(!cs.includes(bhKey(t.c))) continue; const v = kSpend(t); if(v) pay[bkAcc(t)] = (pay[bkAcc(t)]||0)+v; }
      const src = Object.keys(pay).filter(a=>D.accounts.some(x=>x.id===a && !x.archived)).sort((a,b)=>pay[b]-pay[a])[0] || main, s = flpEnsureAcc(src, 660, 40); flpEnsureIn(s);
      F.edges.push({id:'e'+uid(), since:TODAY, f:s.id, t:node.id, mode:'deckt'}); }
    n += cs.length; }
  flLayout(); flpCache.k = null; flSync(); save(); render(); toastMsg(`${n} Posten in den Geldfluss übernommen`);
}

/* ---------- Optimieren ---------- */
var flOptNo = () => (FL().optNo ??= {});
function accOutAvg(id){ const ms = flpMonths(3); let s = 0; for(const ym of ms) for(const t of flMonthTx(ym)){ if(bkAcc(t)!==id) continue; const v = sv(t); if(v<0) s += -v; } return s/3; }
function flOpt(){
  if(!D) return []; const out = [], accs = D.accounts.filter(a=>!a.archived), G = a => accGrp(a), F = FL(), P = F.nodes.length ? flPlan(TODAY) : null;
  const spar = accs.filter(a=>G(a)==='sparen').sort((a,b)=>accRate(b)-accRate(a)), best = spar[0], bestR = best ? accRate(best) : 0;
  const add = (key, o) => { const no = flOptNo()[key]; if(no && no > dAdd(todayIso(), -60)) return; out.push({key, ...o}); };
  // 1. Zu viel Geld auf Alltags- oder Haushaltkonto
  for(const a of accs.filter(a=>['alltag','haushalt'].includes(G(a)))){ const bal = accBal(a); if(bal < 1000) continue;
    const node = F.nodes.find(n=>n.t==='acc' && n.ref===a.id), need = Math.max(P && node ? P.N[node.id]?.out||0 : 0, accOutAvg(a.id));
    const keep = Math.max(+a.det?.minBal || 0, (D.settings?.puffer||500)) + need*1.5, ex = Math.round((bal - keep)/100)*100;
    if(ex >= 1000 && best && best.id!==a.id) add('idle:'+a.id, {gain:ex*(bestR-accRate(a))/100, t:`Auf ${a.name} liegen rund CHF ${chf0(ex)} mehr als nötig`,
      d:`Nötig sind etwa CHF ${chf0(keep)} (Puffer + 1½ Monate Ausgaben). ${bestR>accRate(a)?`Auf ${best.name} (${bestR} %) brächte der Rest ca. CHF ${chf0(ex*(bestR-accRate(a))/100)} Zins im Jahr.`:`Auf ${best.name} wäre er vom Alltag getrennt.`}`,
      b:'Als Übertrag nächsten Monat einplanen', act:'idle', A:a.id, B:best.id, amt:ex}); }
  // 2. Zins fehlt
  for(const a of accs.filter(a=>['sparen','vorsorge','alltag','haushalt'].includes(G(a)) && a.det?.rate==null && Math.abs(accBal(a))>=1000))
    add('rate:'+a.id, {gain:0, t:`Zins bei ${a.name} eintragen`, d:'Ohne Zinssatz kann die App nicht vergleichen, wo dein Geld am meisten bringt.', b:'Angaben ergänzen', act:'det', A:a.id});
  // 3. Sparkonto mit tieferem Zins als ein anderes
  for(const a of spar.slice(1)){ const bal = accBal(a), d = bestR - accRate(a); if(bal >= 5000 && d >= 0.25 && a.det?.rate!=null && !a.det?.purpose)
    add('better:'+a.id, {gain:bal*d/100, t:`${best.name} zahlt ${bestR} % statt ${accRate(a)} %`, d:`Für die CHF ${chf0(bal)} auf ${a.name} wären das ca. CHF ${chf0(bal*d/100)} mehr Zins im Jahr – ausser das Konto hat einen eigenen Zweck (dann unter Kontoangaben «Wofür» eintragen).`, b:'Angaben ansehen', act:'det', A:a.id}); }
  // 4. Zinsstufe überschritten
  for(const a of spar){ const d = a.det||{}, bal = accBal(a); if(d.rateCap && bal > d.rateCap + 500) add('cap:'+a.id, {gain:(bal-d.rateCap)*((d.rate||0)-(d.rate2||0))/100, t:`${a.name}: CHF ${chf0(bal-d.rateCap)} über der Zinsstufe`, d:`Über CHF ${chf0(d.rateCap)} gibt es nur ${d.rate2||0} % statt ${d.rate||0} %. Den Teil darüber auf ein anderes Konto zu legen, brächte mehr.`, b:'Angaben ansehen', act:'det', A:a.id}); }
  // 5. Teure Schuld, während Erspartes liegt
  for(const k of accs.filter(a=>G(a)==='karte' && a.rate && !cardFullOf(a))){ const owed = Math.max(0, -accBal(k)); if(owed < 200) continue;
    const free = spar.reduce((s,a)=>s+Math.max(0, accBal(a)),0); if(free < owed) continue;
    add('debt:'+k.id, {gain:owed*(k.rate-bestR)/100, t:`${k.name}: CHF ${chf0(owed)} zu ${k.rate} % Zins`, d:`Auf den Sparkonten liegen CHF ${chf0(free)} zu höchstens ${bestR} %. Die Schuld abzuzahlen spart ca. CHF ${chf0(owed*(k.rate-bestR)/100)} im Jahr – den Notgroschen danach wieder auffüllen.`, b:'Abzahlen planen', act:'go', go:'plan'}); }
  // 6. Gebühren und Produktkosten
  let fee = 0; const fl = [];
  for(const a of accs){ const d = a.det||{}, bal = Math.max(0, accBal(a)); let f = (+d.feeM||0)*12 + (G(a)==='karte' ? (+a.fee||0) : 0) + bal*((+d.feePct||0)+(+d.ter||0))/100; if(f >= 1){ fee += f; fl.push(`${a.name} ${chf0(f)}`); } }
  if(fee >= 50) add('fee', {gain:0, t:`Konto- und Anlagekosten: ca. CHF ${chf0(fee)} im Jahr`, d:fl.slice(0,5).join(' · ') + '. Bei wiederkehrenden Gebühren lohnt sich ein Vergleich.'});
  for(const a of accs.filter(a=>['invest','vorsorge'].includes(G(a)))){ const k = (+a.det?.feePct||0)+(+a.det?.ter||0); if(k > 0.75 && accBal(a) > 3000) add('ter:'+a.id, {gain:accBal(a)*(k-0.4)/100, t:`${a.name}: Kosten ${r2(k)} % pro Jahr`, d:`Das sind CHF ${chf0(accBal(a)*k/100)} im Jahr. Günstige Lösungen kosten oft unter 0.5 %.`, b:'Angaben ansehen', act:'det', A:a.id}); }
  // 7. Säule 3a dieses Jahr
  const v3 = accs.filter(a=>G(a)==='vorsorge' && (/3a|säule|saule/i.test(a.name) || /^3a/.test(a.det?.vkind||''))), max = +D.settings?.max3a || 7258, yr = TODAY.slice(0,4);
  if(v3.length && +TODAY.slice(5) >= 6){ const ids = new Set(v3.map(a=>a.id)); let done = 0, plan = 0;
    for(let m = yr+'-01'; m <= TODAY; m = ymAdd(m,1)){ const M = flTrMatrix(m); for(const [k2, x] of Object.entries(M)) if(ids.has(k2.split('>')[1])) done += x; }
    if(F.nodes.length) for(let m = ymAdd(TODAY,1); m.startsWith(yr); m = ymAdd(m,1)){ const P2 = flPlan(m); F.edges.forEach(e=>{ const t = flN(e.t); if(t && ids.has(flSrcAcc(t))) plan += P2.E[e.id]||0; }); }
    const gap = max - done - plan; if(gap >= 300) add('3a:'+yr, {gain:gap*0.2, t:`Säule 3a ${yr}: noch CHF ${chf0(gap)} möglich`, d:`Eingezahlt CHF ${chf0(done)}${plan?`, geplant CHF ${chf0(plan)}`:''} von CHF ${chf0(max)}. Bis 31.12. eingezahlt, senkt es die Steuern – je nach Einkommen um etwa CHF ${chf0(gap*0.15)}–${chf0(gap*0.25)}.`, b:'Im Dezember einplanen', act:'3a', B:v3[0].id, amt:Math.round(gap)}); }
  // 8. Geld bleibt jeden Monat unverteilt
  if(P){ const m = flpAccNode(flpMain()); if(m){ const x = P.N[m.id], left = x ? x.in - x.out : 0;
    if(left >= 150 && !flOut(m.id).some(e=>e.mode==='rest') && best) add('rest', {gain:0, t:`Jeden Monat bleiben ca. CHF ${chf0(left)} auf ${accName(m.ref)} unverteilt`, d:`Ein Draht «Rest» aufs ${best.name} spart automatisch, was übrig bleibt – der Betrag passt sich jeden Monat an.`, b:'Rest-Draht anlegen', act:'rest', A:m.ref, B:best.id}); } }
  // 9. Hypothek und Verträge
  for(const n of F.nodes.filter(isExt)){ const d = n.det||{};
    if(d.debt && d.rate) add('hyp:'+n.id, {gain:0, t:`${flName(n)}: ca. CHF ${chf0(d.debt*d.rate/100)} Zins im Jahr`, d:`CHF ${chf0(d.debt)} zu ${d.rate} %${n.ext==='hypothek'?'. Hypothekarzins ist bei den Steuern abziehbar; Amortisation indirekt über die Säule 3a prüfen.':'.'}`});
    if(d.until && d.until >= TODAY && d.until <= ymAdd(TODAY, 12)) add('end:'+n.id+':'+d.until, {gain:0, t:`${flName(n)} läuft im ${ymLabel(d.until)} aus`, d:`${d.notice?'Kündigungsfrist: '+d.notice+'. ':''}Rechtzeitig Angebote vergleichen.`, b:'Ansehen', act:'node', N:n.id}); }
  // 10. Abos
  const ab = (D.abos||[]).filter(a=>a.active!==false), at = ab.reduce((s,a)=>s+aboMonthly(a),0);
  if(ab.length >= 3 && at >= 30) add('abo', {gain:0, t:`${ab.length} Abos kosten CHF ${chf0(at*12)} im Jahr`, d:'Einmal im Jahr durchgehen: Was brauchst du noch?', b:'Abos ansehen', act:'go', go:'abos'});
  return out.sort((a,b)=>(b.gain||0)-(a.gain||0));
}
function flOptDo(key){
  const o = flOpt().find(x=>x.key===key); if(!o) return; const F = FL();
  if(o.act==='det') return accDetDialog(o.A);
  if(o.act==='node') return flNodeDialog(o.N);
  if(o.act==='go'){ S.view = o.go; render(); window.scrollTo(0,0); return; }
  if(o.act==='idle' || o.act==='3a' || o.act==='rest'){ const A = o.A || flpMain(), a = flpEnsureAcc(A, 340, 220), b = flpEnsureAcc(o.B, a.x+330, a.y-160);
    let e = F.edges.find(x=>x.f===a.id && x.t===b.id);
    if(o.act==='rest'){ if(e) e.mode = 'rest'; else if(!flCanLink(a.id, b.id)) F.edges.push({id:'e'+uid(), since:TODAY, f:a.id, t:b.id, mode:'rest'}); }
    else { if(!e){ if(flCanLink(a.id, b.id)){ toastMsg(flCanLink(a.id, b.id)); return; } e = {id:'e'+uid(), since:TODAY, f:a.id, t:b.id, mode:'fix', a:0}; F.edges.push(e); }
      const m = o.act==='3a' ? TODAY.slice(0,4)+'-12' : ymAdd(TODAY,1), cur = flPlan(m).E[e.id] || 0; (e.m ??= {})[m] = r2(cur + o.amt); }
    F.since ||= TODAY; flLayout(); flpCache.k = null; flSync(); save(); render(); toastMsg('Im Geldfluss eingeplant – die App bucht nichts selbst'); }
}

/* ---------- Ansicht: Plan-Abdeckung, Optimieren, Legende, Knöpfe ---------- */
vGeldfluss = (prev => function(){ let h = prev(); if(NATIVE || !FL().nodes.length) return h;
  let extra = '';
  try{ const Cv = flCoverage(flYm() < TODAY ? TODAY : flYm()), ms = Cv.miss;
    if(ms.length){ const cats = ms.filter(m=>m.k==='cat'), oth = ms.filter(m=>m.k!=='cat');
      extra += `<div class="card flcov"><div class="row" style="gap:10px;align-items:center;flex-wrap:wrap"><h3 style="margin:0">Plan im Geldfluss: ${Cv.pct} %</h3><div class="flcb"><i style="width:${Cv.pct}%"></i></div><span class="sp"></span><button class="btn sm pri" data-act="flcov">Alles verbinden</button></div>
        <p class="small muted" style="margin:6px 0 0">Noch nicht im Geldfluss: ${[cats.length?`${cats.length} Budget-Kategorie${cats.length===1?'':'n'} (CHF ${chf0(cats.reduce((a,m)=>a+m.v,0))}: ${cats.slice(0,4).map(m=>esc(m.t)).join(', ')}${cats.length>4?' …':''})`:'', ...oth.map(m=>m.k==='tr'?`Dauerauftrag ${esc(m.t)} (CHF ${chf0(m.v)})`:m.k==='inc'?`Einkommen ${esc(m.t)}`:`Konto ${esc(m.t)}`)].filter(Boolean).join(' · ')}</p></div>`; }
    const o = flOpt();
    if(o.length) extra += `<details class="card flopt" ${S.flOptOpen?'open':''}><summary><h3 style="display:inline;margin:0">Optimieren · ${o.length}</h3>${o[0].gain>=10?` <span class="small muted">bis ca. CHF ${chf0(o.reduce((a,x)=>a+Math.max(0,x.gain||0),0))} im Jahr</span>`:''}</summary>
      ${o.map(x=>`<div class="floi"><div class="sp"><b>${esc(x.t)}</b><span class="small muted">${esc(x.d)}</span></div><div class="row" style="gap:6px">${x.b?`<button class="btn sm" data-act="flopt" data-k="${esc(x.key)}">${esc(x.b)}</button>`:''}<button class="btn sm ghost" data-act="floptno" data-k="${esc(x.key)}" title="Für 60 Tage ausblenden">Erledigt</button></div></div>`).join('')}
      <p class="small muted">Nur Hinweise aus deinen eigenen Zahlen und Kontoangaben – keine Anlageberatung. Die App bucht nichts selbst.</p></details>`; }catch(e){}
  const at = ['<div class="flc" id="flc">', '<p class="small muted">Kästchen und Drähte bearbeitest du am PC.', '<div class="card fllist">'].map(s=>h.indexOf(s)).find(i=>i>=0);
  if(extra && at!=null) h = h.slice(0, at) + extra + h.slice(at);
  const lg = [...ACC_GRP.map(([g,l])=>[AK_STYLE[g].c, AK_STYLE[g].i, FL_AK[g]]), ['#1aa39a','piggy','Topf'], ['#7d838c','bank','Extern']];
  h = h.replace('<div class="flc" id="flc">', `<div class="fllegend">${lg.map(([c,i,l])=>`<span style="--nc:${c}" class="${l==='Extern'?'ext':''}">${aic(i)}${esc(l)}</span>`).join('')}</div><div class="flc" id="flc">`)
       .replace('<button class="btn sm" data-act="fladd">+ Kästchen</button>', '<button class="btn sm" data-act="fladd">+ Kästchen</button><button class="btn sm" data-act="flext">+ Empfänger</button>');
  // Summe: was an Externe geht
  try{ const P = flPlan(flYm()), ex = FL().edges.filter(e=>isExt(flN(e.t))).reduce((a,e)=>a+(P.E[e.id]||0),0);
    if(ex) h = h.replace(/(<span>in Ausgaben <b>CHF [^<]*<\/b><\/span>)/, `$1<span>davon an Externe <b>CHF ${chf0(ex)}</b></span>`); }catch(e){}
  return h; })(vGeldfluss);
CUSTOM_V.geldfluss = vGeldfluss;

// Übersicht und Planen: Empfänger als Ziel zeigen
flCatLink = (prev => function(c){
  const n = FL().nodes.find(x=>isExt(x) && flExpCats(x).includes(c));
  if(n){ const src = [...new Set(flIn(n.id).map(e=>flN(e.f)).filter(Boolean).map(flName))]; return {to:false, name:`${src.length?src.join(' + ')+' → ':''}${flName(n)}`}; }
  return prev(c); })(flCatLink);

// «+ Kästchen» bietet auch Empfänger an
flAddDialog = (prev => function(){ prev(); const s = $('#flt'); if(!s) return;
  s.insertAdjacentHTML('beforeend', '<option value="ext">Empfänger ausserhalb (Hypothek, Vermieter, Versicherung, Abo …)</option>');
  const o = s.onchange; s.onchange = () => { if(s.value==='ext'){ $('#dlg').close(); setTimeout(()=>extDialog(null), 40); return; } o && o(); }; })(flAddDialog);

document.addEventListener('click', ev=>{
  const a = ev.target.closest('[data-act="accdet"],[data-act="flext"],[data-act="flcov"],[data-act="flopt"],[data-act="floptno"]'); if(!a || !D) return;
  ev.stopPropagation(); ev.preventDefault(); const k = a.dataset.act;
  if(k==='accdet'){ if($('#dlg').open) $('#dlg').close(); setTimeout(()=>accDetDialog(a.dataset.id), 40); return; }
  if(k==='flext') return extDialog(null);
  if(k==='flcov') return flCoverFix();
  if(k==='flopt'){ S.flOptOpen = true; return flOptDo(a.dataset.k); }
  if(k==='floptno'){ S.flOptOpen = true; flOptNo()[a.dataset.k] = todayIso(); save(); render(); }
}, true);
