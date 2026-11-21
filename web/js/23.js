/* =====================================================================
   31. VERSION 1.12.0 – WÄHRUNGEN IN CHF (Tageskurse der EZB über Frankfurter), VERMÖGENSÜBERSICHT,
       UMRECHNER, KONTEN-DATEI MIT STAND / FARBE / STATISTIK
   Für die Kurse schickt die App nur Währungskürzel (z. B. «EUR,USD») an api.frankfurter.dev – keine Daten von dir.
   ===================================================================== */
var FX_URL = 'https://api.frankfurter.dev/v1/latest';
var fxCurs = () => [...new Set(D.accounts.map(accCur).filter(c=>c!=='CHF'))];
// CHF pro 1 Einheit Fremdwährung (eigener Kurs hat Vorrang)
function fxRate(cur){
  cur = String(cur||'CHF').toUpperCase(); if(cur==='CHF') return 1;
  const m = D.fx?.manual?.[cur]; if(m>0) return m;
  const r = D.fx?.rates?.[cur]; return r>0 ? 1/r : null;
}
var toChf = (v, cur) => { const r = fxRate(cur); return r==null ? null : v*r; };
async function fxUpdate(force){
  const list = fxCurs(); if(!list.length) return;
  if(!force && D.fx?.at && Date.now()-new Date(D.fx.at) < 12*3600e3 && list.every(c=>D.fx.rates?.[c] || D.fx.manual?.[c])) return;
  try{
    const r = await fetch(`${FX_URL}?from=CHF&to=${list.map(encodeURIComponent).join(',')}`, {cache:'no-store', credentials:'omit', referrerPolicy:'no-referrer'});
    if(!r.ok) throw new Error('Kursdienst antwortet mit Fehler '+r.status);
    const j = await r.json(); if(!j.rates) throw new Error('Keine Kurse erhalten');
    D.fx = {...(D.fx||{}), rates:{...(D.fx?.rates||{}), ...j.rates}, d:j.date, at:new Date().toISOString(), err:null};
  }catch(e){ D.fx = {...(D.fx||{}), err: e.message||String(e)}; }
  S.noDirty = true; save(); S.noDirty = false; if(force || ['start','statistik','konten'].includes(S.view)) safeRender();
}

/* Fremdwährungskonten zählen jetzt umgerechnet in CHF mit (wenn «in Statistik» und ein Kurs da ist) */
inStats = a => !a.nostats && !a.archived && fxRate(accCur(a))!=null;
accVal = a => inStats(a) ? accValRaw(a) * fxRate(accCur(a)) : 0;
balAccs = () => { const f = S.af||{}; return D.accounts.filter(a=>D.bal?.[a.id] && inStats(a) && accCur(a)==='CHF' && (!f.acc || a.id===f.acc)); };

/* Kacheln: Fremdwährung mit «≈ CHF …» */
var _homeAccounts1120 = homeAccounts;
homeAccounts = function(){
  let h = _homeAccounts1120();
  for(const a of D.accounts){ const c = accCur(a); if(c==='CHF') continue; const chfV = toChf(accValRaw(a), c); if(chfV==null) continue;
    h = h.replace(new RegExp(`(data-id="${a.id}"[^>]*>[\\s\\S]*?<b class="num">${c} [^<]*</b>)`), `$1<span class="fxs">≈ CHF ${signChf(chfV)}</span>`); }
  return h;
};

/* ---------- Vermögensübersicht in CHF + Umrechner ---------- */
function cardWealth(){
  const accs = activeAccs().filter(a=>!a.archived);
  const rows = accs.map(a=>{ const c = accCur(a), raw = accValRaw(a), r = fxRate(c), chfV = r==null ? null : raw*r; return {a, c, raw, r, chfV, st:inStats(a)}; });
  const sum = f => rows.filter(f).reduce((s,x)=>s+(x.chfV||0),0);
  const saldo = sum(x=>x.st), assets = sum(x=>x.a.kind!=='debt' && (x.chfV||0)>0);
  const debt = rows.filter(x=>x.a.kind==='debt').reduce((s,x)=>s+Math.max(0,-(x.chfV||0)),0);
  const curs = fxCurs(), fx = D.fx||{};
  return `<div class="xcard xw" id="wealth"><div class="ah"><div><h3>Vermögen in CHF</h3><span class="small muted">Alle Konten, Fremdwährungen zum Tageskurs umgerechnet</span></div></div>
    <div class="wkpi"><div><span>Saldo (in Statistik)</span><b class="num">${signChf(saldo)}</b></div><div><span>Guthaben total</span><b class="num">${chf(assets)}</b></div><div><span>Schulden</span><b class="num out">${debt?'−':''}${chf(debt)}</b></div><div><span>Netto</span><b class="num ${assets-debt<0?'out':''}">${signChf(assets-debt)}</b></div></div>
    <div class="tw"><table class="rep"><thead><tr><th>Konto</th><th>Stand</th><th class="fxk">Kurs</th><th>CHF</th></tr></thead><tbody>
    ${rows.map(x=>`<tr class="${x.st?'':'dimr'}"><td>${esc(x.a.name)}</td><td class="num">${x.c} ${signChf(x.raw)}</td><td class="num fxk">${x.c==='CHF'?'–':x.r==null?'<a class="link" data-act="fxset" data-c="'+x.c+'">eintragen</a>':`<a class="link" data-act="fxset" data-c="${x.c}">${x.r.toFixed(4)}</a>`}</td><td class="num ${(x.chfV||0)<0?'out':''}">${x.chfV==null?'–':signChf(x.chfV)}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="small muted" style="margin:6px 0 0">Grau = zählt wie bei Wallet nicht im Saldo.</p>
    ${curs.length?`<p class="small muted">Kurse: ${curs.map(c=>`<a class="link" data-act="fxset" data-c="${c}">1 ${c} = ${fxRate(c)?.toFixed(4)??'?'} CHF${D.fx?.manual?.[c]?' (eigener Kurs)':''}</a>`).join(' · ')}${fx.d?` · EZB-Referenzkurs vom ${fx.d.split('-').reverse().join('.')}`:''}${fx.err?` · <span class="neg">${esc(fx.err)}</span>`:''} <a class="link" data-act="fxnow">Kurse aktualisieren</a></p>`:''}
    <div class="fxconv"><b>Umrechner</b><div class="row"><input class="in" id="fxa" inputmode="decimal" placeholder="Betrag" value="${esc(S.fxa??'100')}"><select class="in" id="fxc">${[...new Set(['EUR','USD','GBP','CAD',...curs])].map(c=>`<option ${c===(S.fxc||curs[0]||'EUR')?'selected':''}>${c}</option>`).join('')}</select><span class="fxr" id="fxr"></span></div></div></div>`;
}
function fxConv(){
  const a = parseNum($('#fxa')?.value||''), c = $('#fxc')?.value, out = $('#fxr'); if(!out) return;
  S.fxa = $('#fxa').value; S.fxc = c;
  const r = fxRate(c); if(r==null && !D.fx?.rates?.[c]){ out.textContent = 'Kurs wird geholt …'; fxOne(c); return; }
  out.innerHTML = isFinite(a) ? `= <b>CHF ${chf(a*r)}</b> · CHF ${chf(a)} = ${c} ${chf(a/r)}` : '';
}
async function fxOne(c){ try{ const r = await fetch(`${FX_URL}?from=CHF&to=${encodeURIComponent(c)}`, {credentials:'omit', referrerPolicy:'no-referrer'}); const j = await r.json(); if(j.rates?.[c]){ D.fx = {...(D.fx||{}), rates:{...(D.fx?.rates||{}), [c]:j.rates[c]}, d:j.date}; fxConv(); } }catch(e){ const o=$('#fxr'); if(o) o.textContent = 'Kein Kurs (offline?)'; } }
document.addEventListener('input', e=>{ if(e.target.id==='fxa') fxConv(); });
document.addEventListener('change', e=>{ if(e.target.id==='fxc') fxConv(); });
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act="fxset"],[data-act="fxnow"]'); if(!a || !D) return; e.stopPropagation();
  if(a.dataset.act==='fxnow'){ fxUpdate(true); return; }
  const c = a.dataset.c, auto = D.fx?.rates?.[c] ? (1/D.fx.rates[c]).toFixed(4) : '';
  dialog(`<h3>Kurs ${esc(c)} → CHF</h3><p class="small muted" style="margin-top:-8px">${auto?`Tageskurs EZB: 1 ${c} = ${auto} CHF. `:''}Leer lassen = automatisch den Tageskurs verwenden.</p>
    <label class="f">1 ${esc(c)} = CHF<input id="fxm" inputmode="decimal" value="${D.fx?.manual?.[c]||''}" placeholder="${auto}"></label>${acts(true)}`,
  ()=>{ const v = parseNum(val('fxm')); D.fx ??= {}; D.fx.manual ??= {}; if(isFinite(v) && v>0) D.fx.manual[c] = v; else delete D.fx.manual[c]; });
}, true);

/* Übersicht auf der Startseite (unter den Konten) und in der Statistik (Reiter Saldo) */
var _vStart1120 = vStart;
vStart = function(){ const h = _vStart1120(); return (S.stab||'konten')==='konten' ? h.replace('<div class="agrid home">', `<div class="agrid home">${cardWealth()}`) : h; };
var _vStat1120 = vStatistik;
vStatistik = function(){ const h = _vStat1120(); return (S.atab2||'saldo')==='saldo' ? h.replace('<div class="agrid">', `<div class="agrid">${cardWealth()}`) : h; };
var _render1120 = render;
render = function(){ _render1120(); if(D && !S.locked && document.getElementById('fxr')) fxConv(); };
// Kurse beim Öffnen (höchstens alle 12 Stunden) und wenn Fremdwährungskonten dazukommen
setTimeout(()=>{ if(D && !S.locked) fxUpdate(); }, 1500);
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible' && D && !S.locked) fxUpdate(); });

/* ---------- Konten-Datei: zusätzlich Stand, Farbe, Statistik und Art übernehmen ---------- */
function wbAccsFromCsv(text){
  const rows = parseCSV(text); if(!rows.length) throw new Error('Die Datei ist leer.');
  const head = rows[0].map(h=>String(h).trim().toLowerCase()), ix = n => head.indexOf(n);
  const ia = ix('account'), ic = ix('currency'), ib = ix('balance'), il = ix('color'), is = ix('stats'), it = ix('type');
  if(ia<0) throw new Error('Das ist kein Wallet-Export (Spalte «account» fehlt).');
  const by = new Map();
  for(const c of rows.slice(1)){ const n = String(c[ia]||'').trim(); if(!n) continue;
    const o = by.get(n) || {name:n, cur:String(c[ic]||'CHF').trim().toUpperCase().slice(0,3), n:0}; o.n++;
    if(ib>=0 && String(c[ib]).trim()!=='') o.bal = csvNum(c[ib]);
    if(il>=0 && /^#[0-9a-f]{6}$/i.test(String(c[il]).trim())) o.color = String(c[il]).trim();
    if(is>=0) o.stats = !/^(0|false|nein|no)$/i.test(String(c[is]).trim());
    if(it>=0 && W_TYPES.some(([k])=>k===String(c[it]).trim())) o.type = String(c[it]).trim();
    by.set(n, o); }
  const file = ib>=0;   // Konten-Datei: Reihenfolge der Datei behalten; Wallet-Export: nach Anzahl Buchungen
  const list = [...by.values()]; if(!file) list.sort((a,b)=>b.n-a.n);
  return list.map((a,i)=>({...a, n:file?0:a.n, color:a.color||null, type:a.type||wTypeOf('', a.name), stats:a.stats ?? true, pos:i}));
}
var _wbAccDialog1120 = wbAccDialog;
wbAccDialog = function(list, src){
  _wbAccDialog1120(list, src);
  const nb = list.filter(x=>x.bal!=null).length;
  if(nb) $('#wbname')?.closest('label')?.insertAdjacentHTML('beforebegin', `<label class="chk"><input type="checkbox" id="wbbal" checked> Kontostände von heute übernehmen (${nb} Konten)</label>`);
};
function wbAccApply(){
  const rows = S.wbRows||[], ren = $('#wbname').checked, bal = $('#wbbal')?.checked, order = [], seen = new Set(); let made = 0, renamed = 0, bals = 0;
  for(const r of rows){
    if(!r.on) continue;
    const t = r.type, debt = t==='karte' || t==='kredit';
    let a = r.map && !seen.has(r.map) ? D.accounts.find(x=>x.id===r.map) : null;
    if(!a){ a = {id:'w'+uid(), name:r.name, kind:debt?'debt':'asset', rate:0, startYm:C.now, start:0, out:0, outM:{}, abos:false}; D.accounts.push(a); made++; }
    else if(ren && a.name!==r.name){ a.name = r.name; renamed++; }
    seen.add(a.id); order.push(a);
    Object.assign(a, {wtype:t, kind:debt?'debt':(a.kind==='debt' ? 'asset' : a.kind), cur:r.cur==='CHF'?undefined:r.cur, nostats:!r.stats || undefined, archived:undefined});
    if(ren) a.color = r.color;
    if((t==='bar' || t==='konto') && a.liquid===undefined) a.liquid = true;
    if(bal && r.bal!=null && isFinite(r.bal)){ (D.bal ??= {})[a.id] = {d:todayIso(), v:r.bal}; bals++; }
    (D.accMap ??= {})['wallet:'+(r.wname||r.name)] = a.id;
  }
  D.accounts = [...order, ...D.accounts.filter(a=>!seen.has(a.id))];
  S.wbRows = null; save(); render(); fxUpdate(true);
  toastMsg(`Konten übernommen: ${order.length} wie in Wallet${made?`, ${made} neu`:''}${renamed?`, ${renamed} umbenannt`:''}${bals?`, ${bals} Stände`:''}`);
}
