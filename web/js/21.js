/* =====================================================================
   29. VERSION 1.10.0 – KONTEN WIE IN WALLET: Anzahl, Namen, Reihenfolge, Farben, Kontoart, Währung,
       «in Statistik» – übernommen aus der Wallet-Verbindung oder aus einem Wallet-Export (CSV).
   Es wird nie ein Konto gelöscht. Konten, die es nur in dieser App gibt, kommen ans Ende.
   ===================================================================== */
var W_TYPES = [['konto','Bankkonto'],['spar','Sparkonto'],['karte','Kreditkarte'],['kredit','Kredit / Schulden'],['bar','Bargeld'],['vorsorge','Vorsorge (3a)'],['anlage','Anlage / Invest']];
var W_PAL = ['#5bc236','#0d47a1','#f39c12','#26c6da','#8e44ad','#e74c3c','#16a085','#d35400','#2c3e50','#c0392b'];
function wTypeOf(raw, name){
  const t = String(raw||'').toLowerCase(), n = String(name||'').toLowerCase();
  if(/credit|kredit.?karte|card/.test(t) || /kredit.?karte|visa|master|amex/.test(n)) return 'karte';
  if(/loan|mortgage|overdraft|darlehen/.test(t) || /kredit|darlehen|leasing|finance|powerpay/.test(n)) return 'kredit';
  if(/cash/.test(t) || /bargeld|cash|portemonnaie/.test(n)) return 'bar';
  if(/saving/.test(t) || /spar|reserve/.test(n)) return 'spar';
  if(/insurance|pension/.test(t) || /3a|säule|vorsorge|pension/.test(n)) return 'vorsorge';
  if(/invest|bonus/.test(t) || /invest|depot|anlage|aktien|fonds|krypto/.test(n)) return 'anlage';
  return 'konto';
}
// Konto-Symbol nach Kontoart (überschreibt 1.9.0)
function accIcon(a){
  const t = a.wtype || wTypeOf('', a.name) || (a.kind==='debt' ? 'kredit' : 'konto');
  return {karte:AI.card, kredit:AI.bank, bar:AI.cash, spar:AI.pig, vorsorge:AI.shield, anlage:AI.invest}[a.kind==='debt' && t==='konto' ? 'karte' : t] || AI.bank;
}
var accCur = a => (a.cur || 'CHF').toUpperCase();
var inStats = a => !a.nostats && !a.archived && accCur(a)==='CHF';

/* ---------- Fremdwährung & «nicht in Statistik» ---------- */
// Kontostand eines Kontos in seiner eigenen Währung (für Kacheln)
var accValRaw = a => { const an = D.bal?.[a.id];
  if(an && accCur(a)!=='CHF') return an.v;                       // Fremdwährung: eingetragener Stand (Importe sind in CHF umgerechnet)
  const b = bankBalance(a.id); return b ? b.v : (C.m[TODAY]?.acc[a.id]?.start ?? C.m[C.now]?.acc[a.id]?.start ?? 0); };
// Für Summen, Tachos, Ausblick: nur Konten, die in die Statistik zählen
accVal = a => inStats(a) ? accValRaw(a) : 0;
balAccs = () => { const f = S.af||{}; return D.accounts.filter(a=>D.bal?.[a.id] && inStats(a) && (!f.acc || a.id===f.acc)); };

function homeAccounts(){
  const accs = activeAccs().filter(a=>!a.archived);
  return `<div class="hacc">${accs.map(a=>{ const v = accValRaw(a), dim = !inStats(a), col = a.color || wAccColor(a);
      return `<div class="htile ${dim?'dim':''}" data-act="baledit" data-id="${a.id}" style="${dim?'':'background:'+col}" title="${dim?'Zählt nicht in Statistik und Summen':''}"><span class="n">${ci(accIcon(a))}<span>${esc(a.name)}</span></span><b class="num">${accCur(a)} ${signChf(v)}</b></div>`; }).join('')}
    <div class="htile add" data-act="wbaccs"><span>Konten wie in Wallet</span><b>+</b></div></div>
    <div class="row" style="justify-content:flex-end;margin:10px 0 4px"><button class="btn sm" data-go="buchungen">${ci(CI.list)} Einträge</button></div>`;
}

/* ---------- Quelle 1: Wallet-Verbindung ---------- */
async function wbAccsFromApi(){
  const raw = wbList(await wbGet('accounts'), 'accounts');
  return raw.map((a,i)=>({
    name: String(a.name||a.title||'Konto').trim(),
    cur: String(a.currencyCode || a.currency?.code || a.currency || 'CHF').toUpperCase().slice(0,3),
    color: /^#?[0-9a-f]{6}$/i.test(a.color||'') ? '#'+String(a.color).replace('#','') : null,
    type: wTypeOf(a.accountType || a.type, a.name),
    stats: !(a.excludeFromStats || a.excludedFromStats || a.archived),
    archived: !!a.archived, pos: a.position ?? i, n: null,
  })).filter(a=>!a.archived).sort((x,y)=>x.pos-y.pos);
}
/* ---------- Quelle 2: Wallet-Export (CSV) ---------- */
function wbAccsFromCsv(text){
  const rows = parseCSV(text); if(!rows.length) throw new Error('Die Datei ist leer.');
  const head = rows[0].map(h=>String(h).trim().toLowerCase()), ia = head.indexOf('account'), ic = head.indexOf('currency');
  if(ia<0) throw new Error('Das ist kein Wallet-Export (Spalte «account» fehlt).');
  const by = new Map();
  for(const c of rows.slice(1)){ const n = String(c[ia]||'').trim(); if(!n) continue;
    const o = by.get(n) || {name:n, cur:String(c[ic]||'CHF').trim().toUpperCase().slice(0,3), n:0}; o.n++; by.set(n, o); }
  return [...by.values()].sort((a,b)=>b.n-a.n).map((a,i)=>({...a, color:null, type:wTypeOf('', a.name), stats:true, pos:i}));
}
/* ---------- Zuordnung vorschlagen und übernehmen ---------- */
function wbGuessApp(w, used){
  const free = D.accounts.filter(a=>!used.has(a.id)), n = w.name.toLowerCase();
  const byMap = D.accMap?.['wallet:'+w.name]; if(byMap && free.some(a=>a.id===byMap)) return byMap;
  const same = free.find(a=>a.name.toLowerCase()===n); if(same) return same.id;
  if(w.cur!=='CHF') return '';
  if(w.type==='konto' && /allgemein|privat|haupt|lohn/.test(n)) return free.find(a=>a.main)?.id || '';
  if(w.type==='spar' && /haushalt/.test(n)) return free.find(a=>/haushalt/i.test(a.name) && /spar/i.test(a.name))?.id || '';
  if(w.type==='spar') return free.find(a=>a.notgroschen)?.id || '';
  if(w.type==='konto' && /haushalt/.test(n)) return free.find(a=>/haushalt/i.test(a.name) && !/spar/i.test(a.name))?.id || '';
  if(w.type==='karte') return free.find(a=>a.kind==='debt' && /karte|visa|master/i.test(a.name))?.id || '';
  if(w.type==='vorsorge') return free.find(a=>/3a|säule|vorsorge/i.test(a.name))?.id || '';
  if(w.type==='anlage') return free.find(a=>/anlage|depot|invest/i.test(a.name))?.id || '';
  const part = free.find(a=>a.name.toLowerCase().includes(n) || n.includes(a.name.toLowerCase())); return part ? part.id : '';
}
function wbRowHtml(r,i,n){
  return `<div class="wbr">
      <div class="wbh"><input type="checkbox" id="wbo${i}" ${r.on!==false?'checked':''} aria-label="Übernehmen"><span class="sw" style="background:${r.color}"></span>
        <input class="in wbn" id="wbn${i}" value="${esc(r.name)}" aria-label="Kontoname"><span class="small muted">${r.cur}${r.n?` · ${r.n}`:''}</span>
        <button class="ibtn" data-dlg="up:${i}" ${i?'':'disabled'} aria-label="Nach oben">▲</button><button class="ibtn" data-dlg="dn:${i}" ${i<n-1?'':'disabled'} aria-label="Nach unten">▼</button></div>
      <div class="wbg"><label class="f">Wird zu<select id="wbm${i}"><option value="">Neues Konto anlegen</option>${D.accounts.map(a=>`<option value="${a.id}" ${a.id===r.map?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label>
        <label class="f">Art<select id="wbt${i}">${W_TYPES.map(([k,l])=>`<option value="${k}" ${k===r.type?'selected':''}>${l}</option>`).join('')}</select></label>
        <label class="f">Währung<input id="wbc${i}" value="${esc(r.cur)}" maxlength="3" style="text-transform:uppercase"></label></div>
      <label class="chk" style="min-height:32px"><input type="checkbox" id="wbs${i}" ${r.stats?'checked':''}> In Statistik und Summen zählen</label></div>`;
}
function wbReadRows(){
  (S.wbRows||[]).forEach((r,i)=>{ if(!$('#wbo'+i)) return; Object.assign(r, {on:$('#wbo'+i).checked, name:$('#wbn'+i).value.trim()||r.name, map:$('#wbm'+i).value, type:$('#wbt'+i).value, cur:($('#wbc'+i).value||'CHF').trim().toUpperCase().slice(0,3), stats:$('#wbs'+i).checked}); });
}
var wbListHtml = () => S.wbRows.map((r,i,all)=>wbRowHtml(r,i,all.length)).join('');
function wbAccDialog(list, src){
  const used = new Set();
  S.wbRows = list.map((w,i)=>{ const m = wbGuessApp(w, used); if(m) used.add(m); return {...w, wname:w.name, map:m, on:true, color:w.color || W_PAL[i % W_PAL.length]}; });
  dialog(`<h3>Konten wie in Wallet</h3>
    <p class="small muted" style="margin-top:-8px">${S.wbRows.length} Konten aus ${src}. Reihenfolge mit ▲▼ wie in Wallet ordnen, Namen bei Bedarf anpassen, Konten ohne Buchungen unten hinzufügen. Nichts wird gelöscht – Konten, die es nur hier gibt, kommen ans Ende.</p>
    <div class="wbl">${wbListHtml()}</div>
    <button class="btn sm" data-dlg="add">+ Konto hinzufügen (z. B. Bargeld USD)</button>
    <label class="chk"><input type="checkbox" id="wbname" checked> Namen und Farben wie hier übernehmen</label>
    <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn pri" data-dlg="ok">Übernehmen</button></div>`,
  k=>{
    if(k==='ok'){ wbReadRows(); wbAccApply(); return; }
    wbReadRows(); const R = S.wbRows;
    if(k==='add') R.push({name:'Neues Konto', cur:'CHF', type:'konto', stats:true, on:true, map:'', color:W_PAL[R.length % W_PAL.length]});
    else { const [d,i] = k.split(':'), j = +i + (d==='up'?-1:1); if(R[j]) [R[i], R[j]] = [R[j], R[i]]; }
    $('.wbl').innerHTML = wbListHtml(); if(k==='add') $('.wbl').lastElementChild?.scrollIntoView({block:'nearest'});
    return false;
  });
}
function wbAccApply(){
  const rows = S.wbRows||[], ren = $('#wbname').checked, order = [], seen = new Set(); let made = 0, renamed = 0;
  for(const r of rows){
    if(!r.on) continue;
    const t = r.type, debt = t==='karte' || t==='kredit';
    let a = r.map && !seen.has(r.map) ? D.accounts.find(x=>x.id===r.map) : null;
    if(!a){ a = {id:'w'+uid(), name:r.name, kind:debt?'debt':'asset', rate:0, startYm:C.now, start:0, out:0, outM:{}, abos:false}; D.accounts.push(a); made++; }
    else if(ren && a.name!==r.name){ a.name = r.name; renamed++; }
    seen.add(a.id); order.push(a);
    Object.assign(a, {wtype:t, kind:debt?'debt':(a.kind==='debt' ? 'asset' : a.kind), cur:r.cur==='CHF'?undefined:r.cur, nostats:!r.stats || undefined});
    if(ren) a.color = r.color;
    if((t==='bar' || t==='konto') && a.liquid===undefined) a.liquid = true;
    (D.accMap ??= {})['wallet:'+(r.wname||r.name)] = a.id;
  }
  D.accounts = [...order, ...D.accounts.filter(a=>!seen.has(a.id))];
  S.wbRows = null; save(); render();
  toastMsg(`Konten übernommen: ${order.length} wie in Wallet${made?`, ${made} neu`:''}${renamed?`, ${renamed} umbenannt`:''}`);
}
async function wbAccStart(){
  if(NATIVE && D.walletApi?.token){
    try{ toastMsg('Hole Konten aus Wallet …'); const l = await wbAccsFromApi(); if(l.length) return wbAccDialog(l, 'deiner Wallet-Verbindung'); }
    catch(e){ alert('Wallet-Konten konnten nicht geladen werden: '+(e.message||e)+'\n\nDu kannst stattdessen einen Wallet-Export (CSV) wählen.'); }
  }
  dialog(`<h3>Konten wie in Wallet</h3>
    <p class="small">So übernimmst du Anzahl, Namen und Reihenfolge deiner Wallet-Konten:</p>
    <ol class="small" style="padding-left:18px">${NATIVE?'<li><b>Am besten:</b> Wallet-Verbindung einrichten (Menü → Import → Wallet-Verbindung). Dann kommen auch Farben, Kontoart und Reihenfolge mit.</li>':''}
      <li><b>Oder:</b> In Wallet (web.budgetbakers.com) → Einträge → Export → CSV. Diese Datei hier wählen. Konten ohne Buchungen fehlen darin – die legst du danach mit «+» an.</li></ol>
    <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button>${NATIVE&&!D.walletApi?.token?'<button class="btn" data-dlg="wb">Wallet verbinden</button>':''}<button class="btn pri" data-dlg="csv">Wallet-Export wählen</button></div>`,
  k=>{ if(k==='wb'){ S.view='wallet'; setTimeout(render,30); return; }
    if(k==='csv'){ (async()=>{ const f = await bkPick('.csv,text/csv,text/plain', false); if(!f.length) return;
      try{ const t = await bkReadFile(f[0]); setTimeout(()=>wbAccDialog(wbAccsFromCsv(typeof t==='string'?t:(t.text||'')), 'deinem Wallet-Export'), 60); }catch(e){ alert(e.message||e); } })(); } });
}
document.addEventListener('click', e=>{ const a = e.target.closest('[data-act="wbaccs"]'); if(a && D){ e.stopPropagation(); wbAccStart(); } }, true);

// Knopf auch auf den Seiten «Konten» und «Wallet-Verbindung»
var _render1100 = render;
render = function(){
  _render1100();
  if(!D || S.locked) return;
  if((S.view==='konten' || S.view==='wallet') && !$('#wbaccbox')) $('#main')?.insertAdjacentHTML('afterbegin', `<div class="wnote" id="wbaccbox" data-act="wbaccs"><span class="wic" style="background:var(--acc)">${ci(AI.bank)}</span><span class="sp"><b>Konten wie in Wallet übernehmen</b><br><span class="small muted">Anzahl, Namen, Reihenfolge, Farben und Kontoart</span></span>›</div>`);
};

// Stand eintragen: bei Fremdwährungskonten in der eigenen Währung
var _balDialog1100 = balDialog;
balDialog = function(accId){
  _balDialog1100(accId);
  const a = D.accounts.find(x=>x.id===accId), cur = accCur(a||{});
  if(cur!=='CHF'){ const l = $('#bv2')?.closest('label'); if(l && l.firstChild) l.firstChild.textContent = 'Stand '+cur; }
};
