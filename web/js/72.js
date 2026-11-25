/* =====================================================================
   74. KATEGORIEN SAUBER EINORDNEN – STRUKTUR UND MUSS · BRAUCH · WILL
   • Neue Regeln nach Bedeutung (deutsch und englisch, wie Wallet sie liefert): Steuern, Krankenkasse,
     Versicherungen, Miete, Energie, Telefon … sind Muss; Lebensmittel, Gesundheit, Kleidung, Mobilität
     sind Brauch; Restaurant, Freizeit, Ferien, Shopping sind Will; Sparen und Anlagen sind Sparen.
   • Unterkategorien erben von ihrer Kategorie, Kategorien von ihrer Hauptkategorie
     (z. B. Steuern › Gemeindesteuer, Staatssteuer, Bundessteuer → alle Muss).
   • Seite «Kategorien ordnen»: Baum Hauptkategorie › Kategorie › Unterkategorie mit Gruppe und M · B · W,
     Knopf «Automatisch einordnen» mit Vorschau zum Anhaken. Von Hand Gesetztes wird nie überschrieben.
   • Korrektur: Das Merkmal «Persönliche Wünsche» hiess intern wie das Wallet-Feld für Unterkategorien
     (wsub). Es heisst jetzt pw; die Unterkategorien werden beim nächsten Abgleich wieder geholt.
   ===================================================================== */
// [Regel, Gruppe, Muss/Brauch/Will, persönlicher Wunsch]
var CAT_RULES = [
  [/sparen|ersparnis|saving|säule ?3a|\b3a\b|vorsorge|pension|investi|anlage|depot|aktien|etf|krypto|crypto|immobilien|sammlung|collect/i, 'spar', 'brauch'],
  [/darlehen|\bkredit\b(?!karte)|kleinkredit|privatkredit|loan|leasing|raten|abzahlung|rückzahlung|schulden|debt|bobfinance|powerpay|klarna/i, 'schulden', 'muss'],
  [/steuer|\btax(es)?\b|abgabe|wehrpflicht|serafe|billag/i, 'fix', 'muss'],
  [/kranken|grundversicherung|zusatzversicherung|health insurance|css\b|helsana|swica|sanitas|visana|concordia|assura|kpt|sympany|groupe mutuel|ökk|atupri/i, 'fix', 'muss'],
  [/versicherung|insurance|haftpflicht|hausrat/i, 'fix', 'muss'],
  [/miete|mieten|\brent\b|hypothek|mortgage|nebenkosten|energie|energy|strom|electric|wasser|water|\bgas\b|heizung|utilities|wohnen|housing/i, 'fix', 'muss'],
  [/internet|handy|telefon|phone|mobile|swisscom|sunrise|\bsalt\b|wingo|kommunikation|communication/i, 'fix', 'muss'],
  [/gebühr|gebuehr|\bfees?\b|charges|kontoführung|bankspesen|zinsen|interest|finanzausgaben|financial expenses|alimente|unterhalt(?!ung)|kinderbetreuung|child ?care|rückstellung/i, 'fix', 'muss'],
  [/arbeitsweg|pendel|öffentliche verkehr|public transport|\bsbb\b|halbtax|\bga\b|abo öv/i, 'fix', 'muss'],
  [/lebensmittel|groceries|supermarkt|^food/i, 'leben', 'brauch'],
  [/gesundheit|health|arzt|doctor|zahnarzt|dentist|franchise|selbstbehalt|apotheke|pharmacy|drogerie|medikament|kontaktlinse|brille|optiker/i, 'leben', 'brauch'],
  [/kleidung|clothes|schuhe|shoes|coiffeur|friseur|hairdress|körperpflege|hygiene|haushalt|household|reinigung/i, 'leben', 'brauch'],
  [/kraftstoff|benzin|diesel|fuel|tank|parken|parking|fahrzeug|vehicle|auto\b|velo|e-?bike|wartung|reparatur|repair|transport|taxi|postdienst|porto/i, 'leben', 'brauch'],
  [/bildung|weiterbildung|education|kurs\b|schule/i, 'leben', 'brauch'],
  [/geschenk|gift|elektronik|electronic|schmuck|jewel|möbel|furniture|anschaff|wünsch|wunsch|shopping|einkaufen/i, 'freizeit', 'will', 1],
  [/restaurant|fast.?food|take.?away|bar\b|café|cafe|essen gehen|ausgang|nightlife|freizeit|hobby|hobbies|ferien|urlaub|holiday|reise|travel|hotel|ausflug|trip|kultur|culture|kino|cinema|konzert|veranstaltung|event|unterhaltung|entertainment|streaming|\btv\b|spiele|games|software|apps?\b|abos?\b|abonnement|subscription|alkohol|tabak|lotterie|glücksspiel|gambling|wellness|beauty|fitness|sport|dating|leben & unterhaltung|life ?& ?entertainment/i, 'freizeit', 'will'],
  [/puffer|unvorhergesehen|unreg|sonstig|other|misc/i, 'freizeit', 'brauch'],
];
function catRule(s){ s = String(s||''); if(!s) return null; for(const [rx, g, n, pw] of CAT_RULES) if(rx.test(s)) return {g, n, pw:!!pw}; return null; }
// Vorschlag für eine Kategorie: eigener Name, dann übergeordnete Kategorie, dann Hauptkategorie
function catSuggest(c){
  const chain = [c.name, c.wsub && typeof c.wsub==='string' ? c.wsub : null, c.wparent].filter(Boolean);
  for(const s of chain){ const r = catRule(s) || catRule(trCat(s)); if(r) return {...r, from:s}; }
  const b = c.bud && D.cats.find(x=>x.id===c.bud); if(b) return {g:b.group, n:needOfCat(b), pw:!!b.pw, from:b.name};
  return null;
}
GS[3].t = c => c.group==='freizeit' && !!c.pw; GS[4].t = c => c.group==='freizeit' && !c.pw;
wsubFix = () => { for(const c of (D?.cats||[])){ if(c.wsub===true){ c.pw = true; delete c.wsub; } if(c.group==='wunsch'){ c.group = 'freizeit'; c.pw = true; } else if(c.group!=='freizeit' && c.pw) delete c.pw; } };
migrate = (prev => function(d){ const r = prev(d); try{ if(r){ r.flags ??= {};
  for(const c of r.cats) if(c.wsub===true){ c.pw = true; delete c.wsub; }
  if(!r.flags.pw1){ if(r.walletApi) delete r.walletApi.catAt; r.flags.pw1 = true; } } }catch(e){} return r; })(migrate);
// Gruppenauswahl: «Persönliche Wünsche» über pw, Wallet-Unterkategorie (wsub) bleibt erhalten
catDialog = (prev => function(c){ const keep = c && typeof c.wsub==='string' ? c.wsub : null; prev(c); const sel = $('#cg'); if(!sel) return;
  if(c?.group==='freizeit') sel.value = c.pw ? 'wunsch' : 'freizeit';
  sel.addEventListener('change', ()=>{ if(!c) return; if(keep) c.wsub = keep; if(sel.value==='freizeit') delete c.pw; if(sel.value==='wunsch') c.pw = true; }); })(catDialog);
// Neue Wallet-Kategorien gleich richtig einordnen
wGroupNeed = (prev => function(name, parent){ const r = catRule(name) || catRule(trCat(name)) || catRule(parent) || catRule(trCat(parent||'')); return r ? [r.g, r.n] : prev(name, parent); })(wGroupNeed);
// Von Hand gesetzt → nie automatisch ändern
setNeed = (prev => function(c, v){ if(c) c.needUser = 1; return prev(c, v); })(setNeed);
document.addEventListener('click', e=>{ const a = e.target.closest('[data-act="setneed"],[data-act="bneed"]'); if(!a || !D) return;
  const c = D.cats.find(x=>x.id===(a.dataset.c||a.dataset.id)); if(c) c.needUser = 1; }, true);
catDialog = (prev => function(c){ prev(c); const sel = $('#cg'); if(c && sel) sel.addEventListener('change', ()=>{ c.groupUser = 1; }); })(catDialog);

/* ---- Automatisch einordnen: Vorschau ---- */
var gLabel = (g, pw) => g==='freizeit' ? (pw ? 'Persönliche Wünsche' : 'Freizeit') : (GROUPS[g]?.n || g);
function catProposals(){
  const out = [];
  for(const c of D.cats){ if(c.archived || c.id==='rueck') continue; const s = catSuggest(c); if(!s) continue;
    const ng = c.groupUser ? c.group : s.g, nn = c.needUser ? needOfCat(c) : s.n, npw = c.groupUser ? !!c.pw : (ng==='freizeit' && s.pw);
    if(ng===c.group && nn===needOfCat(c) && npw===!!c.pw) continue;
    out.push({c, g:ng, n:nn, pw:npw, from:s.from, pre: !!c.wid || (nn==='muss' && needOfCat(c)!=='muss')}); }
  return out;
}
function catAutoDialog(first){
  const P = catProposals();
  if(!P.length){ if(!first) dialog(`<h3>Kategorien einordnen</h3><p>Alles ist schon passend eingeordnet.</p><div class="acts"><button class="btn pri" data-dlg="cancel">OK</button></div>`, ()=>{}); return; }
  const mb = v => `<span class="mbwtag ${v}">${MBW[v]?.n||v}</span>`;
  dialog(`<h3>Kategorien neu einordnen</h3>
    <p class="small muted" style="margin-top:0">${first ? 'Einige Kategorien waren falsch eingeordnet (z. B. Steuern oder Krankenkasse als Will). ' : ''}Vorschlag nach Bedeutung des Namens – Unterkategorien erben von ihrer Kategorie. Was du von Hand gesetzt hast, bleibt. Deine eigenen Budget-Kategorien sind nur angehakt, wenn sie Muss sein sollten.</p>
    <div class="autos">${P.map((p,i)=>`<label class="autor"><input type="checkbox" data-cp="${i}" ${p.pre?'checked':''}><span class="sp"><b>${esc(p.c.name)}</b>
      <span class="small muted">${esc(gLabel(p.c.group, p.c.pw))} ${mb(needOfCat(p.c))} → <b style="color:var(--ink)">${esc(gLabel(p.g, p.pw))}</b> ${mb(p.n)}${p.from!==p.c.name?` · wie «${esc(trCat(p.from))}»`:''}</span></span></label>`).join('')}</div>
    <div class="acts"><button class="btn" data-dlg="cancel">Später</button><button class="btn pri" data-dlg="ok">${P.length} übernehmen</button></div>`,
  k=>{ if(k!=='ok') return; let n = 0;
    document.querySelectorAll('[data-cp]').forEach(x=>{ if(!x.checked) return; const p = P[+x.dataset.cp]; const c = p.c;
      c.group = p.g; c.need = p.n; if(p.g==='freizeit' && p.pw) c.pw = true; else delete c.pw; n++; });
    setTimeout(()=>toastMsg(`${n} Kategorien neu eingeordnet`), 50); });
}
document.addEventListener('click', e=>{ const a = e.target.closest('[data-act="catauto"]'); if(!a || !D) return; e.stopPropagation(); e.preventDefault(); catAutoDialog(false); }, true);
// Einmal nach dem Update: falsch eingeordnete Kategorien zum Bestätigen zeigen
render = (prev => function(){ const r = prev.apply(this, arguments);
  try{ if(D && !S.locked && !D.flags?.cls1 && !$('#dlg').open && !S._clsAsked){ S._clsAsked = true;
    setTimeout(()=>{ if(!D || S.locked || $('#dlg').open) return; (D.flags ??= {}).cls1 = true; save(); catAutoDialog(true); }, 1200); } }catch(e){} return r; })(render);

/* ---- Seite «Kategorien ordnen» (Baum) ---- */
TITLES.mbw = 'Kategorien ordnen';
vMbw = function(){
  const cs = D.cats.filter(c=>!c.archived), P = new Set(catProposals().map(p=>p.c.id));
  const row = (c, lvl) => `<div class="ktrow l${lvl}"><div class="ktname" data-act="catedit" data-id="${c.id}"><b>${esc(c.name)}</b>
      <span class="small muted">${esc(gLabel(c.group, c.pw))}${c.bud ? ` · zählt ins Budget von ${esc(catName(c.bud))}` : ''}${P.has(c.id)?' · <span style="color:var(--warn)">Vorschlag offen</span>':''}</span></div>
      ${c.group==='spar' || c.id==='rueck' ? '<span class="small muted">Sparen</span>' : mbwSel(c)}</div>`;
  // Wallet-Baum: Hauptkategorie › Kategorie › Unterkategorie
  const tops = [...new Set(cs.filter(c=>c.wid).map(c=>c.wparent || 'Sonstiges'))];
  const order = D.walletApi?.catTops || []; tops.sort((a,b)=>((order.indexOf(a)+1)||99)-((order.indexOf(b)+1)||99));
  let tree = '';
  for(const t of tops){ const all = cs.filter(c=>c.wid && (c.wparent||'Sonstiges')===t); if(!all.length) continue;
    const mains = all.filter(c=>typeof c.wsub!=='string'), subs = all.filter(c=>typeof c.wsub==='string');
    const orphans = subs.filter(s=>!mains.some(m=>m.name===s.wsub));
    tree += bDet('kt_'+t, `<span class="chev"></span><div class="sp"><h3>${esc(trCat(t))}</h3><div class="small muted">${all.length} Kategorien</div></div>`,
      mains.map(m=>row(m,1) + subs.filter(s=>s.wsub===m.name).map(s=>row(s,2)).join('')).join('')
      + [...new Set(orphans.map(s=>s.wsub))].map(p=>`<div class="ktrow l1 ktgrp"><b>${esc(p)}</b></div>` + orphans.filter(s=>s.wsub===p).map(s=>row(s,2)).join('')).join(''), 'card mt bsec');
  }
  // Eigene Budget-Kategorien nach Gruppe
  const own = cs.filter(c=>!c.wid);
  const ownH = GS.map(s=>{ const l = own.filter(c=>gSec(c)===s); return l.length ? `<div class="ktrow l1 ktgrp"><span class="dot" style="background:${s.c}"></span><b>${s.n}</b></div>` + l.map(c=>row(c,2)).join('') : ''; }).join('');
  return `<div class="row"><h2 class="sp">Kategorien ordnen</h2><button class="btn sm pri" data-act="catauto">Automatisch einordnen</button></div>
    <p class="sub">Jede Kategorie hat eine Budget-Gruppe und Muss · Brauch · Will. Muss = unverzichtbar (Steuern, Krankenkasse, Miete), Brauch = nötig, aber beeinflussbar (Lebensmittel, Kleidung), Will = Wunsch (Restaurant, Freizeit). Antippen ändert Name und Gruppe.</p>
    ${bDet('kt__own', `<span class="chev"></span><div class="sp"><h3>Budget-Kategorien</h3><div class="small muted">deine eigenen, nach Gruppe</div></div>`, ownH, 'card mt bsec')}
    ${tree ? `<h3 style="margin:18px 0 0">Kategorien aus Wallet</h3><p class="small muted" style="margin:2px 0 0">Hauptkategorie › Kategorie › Unterkategorie, wie in Wallet.</p>${tree}` : ''}`;
};
document.addEventListener('click', e=>{ const a = e.target.closest('[data-act="catedit"]'); if(!a || !D) return; e.stopPropagation();
  const c = D.cats.find(x=>x.id===a.dataset.id); if(c) catDialog(c); }, true);
// Menü: «Kategorien ordnen» unter «Import & Ordnung»
(() => { let it = null; for(const s of NAV4){ const k = s[1].findIndex(i=>i[0]==='mbw'); if(k>=0) [it] = s[1].splice(k,1); }
  const g = NAV4.find(s=>s[0]==='Import & Ordnung'); it = it || ['mbw', ICON.goal, 'Kategorien ordnen']; it[2] = 'Kategorien ordnen';
  (g || NAV4[0])[1].splice(1, 0, it); for(let i = NAV4.length-1; i>=0; i--) if(!NAV4[i][1].length) NAV4.splice(i,1); })();
