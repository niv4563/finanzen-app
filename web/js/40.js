/* =====================================================================
   48. VERSION 1.28.0 – WEB-VERSION FUNKTIONIERT AUCH OHNE HANDY
   • Die Web-Version spricht selbst mit Wallet (gleicher Token, verschlüsselt in deinen Daten):
     Konten, Stände, Buchungen holen und eigene Buchungen eintragen – auch wenn das Handy aus ist.
   • Ist das Handy gleichzeitig offen, fragt nur ein Gerät Wallet ab (Limit 300/Std.);
     das andere bekommt alles über den Geräte-Sync.
   • Jede Buchung trägt nur das Gerät in Wallet ein, auf dem sie erfasst wurde → keine Doppelten.
   • Lässt der Browser die direkte Verbindung nicht zu, sagt die Statuszeile das klar.
   ===================================================================== */
function wbNet(){ return NATIVE || S.wbWeb !== false; }
var DEVID = (()=>{ try{ let v = localStorage.getItem(KEY+'.dev'); if(!v){ v = (NATIVE?'a':'w') + Math.random().toString(36).slice(2,10); localStorage.setItem(KEY+'.dev', v); } return v; }catch(e){ return NATIVE?'a':'w'; } })();

// Browser blockiert direkte Verbindung → merken, nicht ständig neu versuchen
wbGet = (prev => async function(path){
  try{ return await prev(path); }
  catch(e){ if(!NATIVE && /blockiert|Failed to fetch|NetworkError|Load failed/i.test(e.message||'')){ S.wbWeb = false; safeRender?.(); } throw e; }
})(wbGet);
wbSend = (prev => async function(m, p, b){
  try{ return await prev(m, p, b); }
  catch(e){ if(!NATIVE && /Failed to fetch|NetworkError|Load failed|Keine Verbindung/i.test(e.message||'')){ S.wbWeb = false; safeRender?.(); } throw e; }
})(NATIVE ? wbSend : (...a)=>wbSendWeb(...a));

// Neue Buchung: Gerät merken
txDialog = (prev => function(t, preset={}, onDone){ const isNew = !t; return prev(t, preset, x=>{ if(isNew && !x.dev) x.dev = DEVID; onDone?.(x); }); })(txDialog);
// Nur das eigene Gerät trägt seine Buchungen in Wallet ein (alte ohne Gerät: nur das Handy)
wbPush = (prev => async function(){
  if(!D) return prev();
  const other = D.tx.filter(t=>!t.wpush && !t.wpushErr && !t.imp && (t.dev ? t.dev!==DEVID : !NATIVE));
  other.forEach(t=>t.wpushErr = '__other');
  try{ return await prev(); } finally { other.forEach(t=>{ if(t.wpushErr==='__other') delete t.wpushErr; }); }
})(wbPush);
// Wer zuletzt Wallet abgefragt hat
wbAccountsSync = (prev => async function(){ await prev(); if(D?.walletApi){ D.walletApi.balBy = DEVID; } })(wbAccountsSync);
// Ist ein anderes Gerät gerade aktiv (< 60 s), fragt dieses nicht zusätzlich ab
var _wbFastCheck1280 = wbFastCheck;
wbFastCheck = async function(force){
  const w = D?.walletApi; if(w?.balBy && w.balBy!==DEVID && w.balAt && Date.now()-new Date(w.balAt) < 60000 && !force) return;
  return _wbFastCheck1280(force);
};
// Statuszeile: auch im Web «Synchron», oder klarer Hinweis
syncStatus = (prev => function(){
  if(!NATIVE && D?.walletApi?.token && S.wbWeb===false){
    const gh = typeof ghOn==='function' && ghOn(), wAt = D.walletApi.balAt;
    return `<div class="sstat warn"><span class="dot"></span><span class="sp">Dieser Browser lässt die direkte Verbindung nicht zu${gh?` – Stände kommen vom Handy${wAt?' · '+agoTxt(wAt):''}`:'.'}</span>${gh?'':'<a class="link small" data-act="ghjoin">Verbinden</a>'}</div>`;
  }
  if(!NATIVE && D?.walletApi?.token && S.wbWeb!==false){ const w = D.walletApi, err = w.err || w.pushErr || w.balErr, wAt = w.balAt || w.last;
    return `<div class="sstat ${err?'warn':'ok'}"><span class="dot"></span><span class="sp">${err?'Abgleich: '+esc(String(err).slice(0,80)):'Synchron'}${wAt?' · '+agoTxt(wAt):''}</span></div>`; }
  return prev();
})(syncStatus);
// Web: beim Öffnen sofort abgleichen
if(!NATIVE) setTimeout(()=>{ if(D && !S.locked && D.walletApi?.token) wbFastCheck(true); }, 2500);

/* Web: dieselbe Wallet-Abfrage wie in der App (statt «nur Android») */
async function wbSyncWeb(opt={}){
  if(!D || !wbNet() || !D.walletApi?.token || S.wbBusy) return;
  const w = D.walletApi;
  if(opt.auto && (w.auto===false || (w.last && Date.now()-new Date(w.last) < 30*60*1000))) return;
  S.wbBusy = true; if(!opt.quiet) render();
  try{
    const accs = wbList(await wbGet('accounts?limit=200'), 'accounts'), accName2 = {};
    accs.forEach(a=>{ if(a?.id) accName2[a.id] = String(a.name||a.id).slice(0,60); });
    const from = opt.from || (w.last ? new Date(new Date(w.last).getTime()-10*864e5).toISOString().slice(0,10) : (w.since || ymAdd(TODAY,-2)+'-01'));
    let all = [], offset = 0;
    for(let page=0; page<(opt.from?120:20); page++){
      const j = await wbGet(`records?limit=200&offset=${offset}&recordDate=gte.${from}`), recs = wbList(j,'records');
      all = all.concat(recs); if(j?.nextOffset==null || !recs.length) break; offset = j.nextOffset;
    }
    const list = all.filter(r=>r && r.id && r.recordDate).map(r=>{ let v = +(r.amount?.value ?? r.amount); if(r.recordType==='expense' && v>0) v=-v;
      const aid = r.accountId || r.account?.id || '', an = accName2[aid] || r.account?.name || 'Wallet';
      return {wid:r.id, d:String(r.recordDate).slice(0,10), sa:r2(v), text:[r.counterParty||r.payee, r.note].filter(Boolean).join(' · ') || (r.category?.name||'Wallet'), saldo:NaN,
        wcat:String(r.category?.name||'').slice(0,80), wacc:an, wtransfer: r.recordType==='transfer' || !!r.transfer}; }).filter(x=>x.d && isFinite(x.sa) && x.sa);
    // Konten zuordnen (einmalig)
    const unknown = [...new Set(list.map(x=>x.wacc))].filter(n=>!(('wallet:'+n) in D.accMap));
    if(unknown.length){
      if(opt.quiet){ S.wbMsg = 'Wallet: neue Konten gefunden – bitte unter «Wallet-Verbindung» zuordnen.'; w.pendingAccs = unknown; save(); return; }
      await new Promise(res=>{ dialog(`<h3>Wallet-Konten zuordnen</h3><p class="small muted" style="margin-top:-8px">Nur beim ersten Mal. Welches Konto in der App entspricht welchem Wallet-Konto?</p>
        ${unknown.map((n,i)=>`<label class="f">Wallet: «${esc(n)}»<select id="wk${i}">${activeAccs().map(a=>`<option value="${a.id}" ${a.id===bkGuessAcc(n,{})?'selected':''}>${esc(a.name)}</option>`).join('')}<option value="_skip">nicht übernehmen</option></select></label>`).join('')}${acts(true)}`,
        ()=>{ unknown.forEach((n,i)=>{ const v=val('wk'+i); if(v!=='_skip') D.accMap['wallet:'+n]=v; else D.accMap['wallet:'+n]=''; }); setTimeout(res,30); });
        $('#dlg').addEventListener('close', ()=>setTimeout(res,60), {once:true}); });
      w.pendingAccs = [];
    }
    // was schon aus einer Bankdatei da ist, nicht doppelt übernehmen
    const bankTx = D.tx.filter(t=>t.imp && t.src==='bank');
    let fromBank = 0;
    const fresh = list.filter(x=>{ const acc = D.accMap['wallet:'+x.wacc]; if(!acc) return false;
      const dup = bankTx.some(t=>t.bacc===acc && Math.abs(t.sa-x.sa)<0.01 && Math.abs(new Date(t.d)-new Date(x.d))<=2*864e5); if(dup) fromBank++; return !dup; });
    const st = bkApply([{file:'Wallet', f:{wallet:true, bank:'Wallet', accKey:'wallet'}, list:fresh}], {quiet: !!opt.quiet});
    w.last = new Date().toISOString(); w.err = null; w.n = st?.neu||0; w.checked = all.length; w.fromBank = fromBank; save();
  }catch(e){ w.err = e.message || String(e); w.errAt = new Date().toISOString(); save(); if(!opt.quiet) alert(w.err); }
  finally{ S.wbBusy = false; if(!opt.quiet) render(); }
}
function vWalletWeb(){
  const w = D.walletApi || {}, on = !!w.token;
  if(!wbNet()) return `<div class="wcard"><h3>Wallet-Verbindung</h3><p class="small">Die direkte Verbindung zu Wallet gibt es nur in der Android-App. Hier im Browser kannst du einen Wallet-Export (CSV) unter «Bankdateien» hochladen.</p></div>`;
  const maps = Object.entries(D.accMap).filter(([k])=>k.startsWith('wallet:'));
  return `<div class="wcard"><h3>Wallet by BudgetBakers ${on?'<span class="tag g">verbunden</span>':''}</h3>
    <p class="small">Die App holt deine Buchungen direkt aus Wallet – automatisch beim Öffnen (höchstens alle 30 Minuten) oder auf Knopfdruck. Sie liest nur und ändert nichts in Wallet. Was du schon per Bankdatei importiert hast, wird nicht doppelt übernommen.</p>
    ${on ? `<div class="stats" style="grid-template-columns:1fr 1fr;border:0;margin:0 -4px">${kpi('Letzter Abgleich', w.last?new Date(w.last).toLocaleString('de-CH',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'noch nie', w.last?`${w.n||0} neu · ${w.checked||0} geprüft`:'')}${kpi('Schon aus Bankdatei', w.fromBank||0, 'übersprungen')}</div>
      ${w.err?`<p class="small neg">Letzter Fehler: ${esc(w.err)}</p>`:''}
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn pri" data-act="wbsync" ${S.wbBusy?'disabled':''}>${S.wbBusy?'Lädt …':'Jetzt abgleichen'}</button><button class="btn" data-act="wbfull">Alles übernehmen …</button></div>
      ${chk('wbauto', w.auto!==false, 'Automatisch abgleichen, wenn ich die App öffne')}
      ${maps.length?`<details class="small mt"><summary class="muted">Konten-Zuordnung (${maps.length})</summary>${maps.map(([k,v])=>`<div class="li small"><span class="sp">${esc(k.slice(7))}</span><span>${v?esc(accName(v)):'nicht übernehmen'}</span><button class="ibtn" data-act="wbaccdel" data-k="${esc(k)}" title="neu zuordnen">✕</button></div>`).join('')}</details>`:''}
      <p class="small"><a class="link" data-act="wboff">Verbindung trennen (Token löschen)</a></p>`
    : `<ol class="small" style="padding-left:18px;margin:6px 0 10px"><li>Am PC <b>web.budgetbakers.com</b> öffnen und anmelden (Wallet Premium nötig).</li><li><b>Einstellungen → API Tokens</b> → neuen Token erstellen und kopieren.</li><li>Hier einfügen und «Verbinden» tippen.</li></ol>
      <label class="f">API-Token<input id="wbtok" type="password" autocomplete="off" spellcheck="false" placeholder="Token einfügen"></label>
      <label class="f">Beim ersten Mal übernehmen ab<input id="wbsince" type="date" value="${ymAdd(TODAY,-2)}-01"></label>
      <button class="btn pri" data-act="wbconnect">Verbinden</button>
      <p class="small muted">Der Token wird nur verschlüsselt in deinen App-Daten gespeichert (wie deine Buchungen) und nur an rest.budgetbakers.com geschickt. Er steckt auch in deinem verschlüsselten Backup.</p>`}</div>`;
}
if(!NATIVE){ _wbSync142 = wbSyncWeb; _vWallet142 = vWalletWeb; }

/* Web: Konten, Zuordnung und Schnell-Abgleich wie in der App */
async function wbAccountsSyncWeb(){
  if(!wbNet() || !D?.walletApi?.token) return;
  const raw = wbList(await wbGet('accounts'), 'accounts').filter(a=>a && a.id && !a.archived);
  if(!raw.length) return;
  raw.sort((x,y)=>(x.position ?? 0)-(y.position ?? 0));
  const order = [], seen = new Set(); let made = 0, bals = 0;
  for(const w of raw){
    const wname = String(w.name||w.id).slice(0,60), key = 'wallet:'+wname;
    let a = D.accMap[key] ? D.accounts.find(x=>x.id===D.accMap[key]) : null;
    if(D.accMap[key]==='') continue;                         // bewusst «nicht übernehmen»
    const t = wTypeOf(w.accountType || w.type, wname), debt = t==='karte' || t==='kredit', cur = wbAccCur(w);
    if(!a){ a = {id:'w'+uid(), name:wname, kind:debt?'debt':'asset', rate:0, startYm:C.now, start:0, out:0, outM:{}, abos:false, wtype:t, cur:cur==='CHF'?undefined:cur};
      if(t==='bar' || t==='konto') a.liquid = true; D.accounts.push(a); D.accMap[key] = a.id; made++; }
    if(seen.has(a.id)) continue; seen.add(a.id); order.push(a);
    if(/^#?[0-9a-f]{6}$/i.test(w.color||'')) a.color = '#'+String(w.color).replace('#','');
    const ns = !!(w.excludeFromStats || w.excludedFromStats); a.nostats = ns || undefined; a.archived = undefined; a.wid = w.id;
    const v = wbAccBalance(w);
    if(isFinite(v)){ const old = D.bal?.[a.id]; if(!old || old.v!==v || old.d!==todayIso()){ (D.bal ??= {})[a.id] = {d:todayIso(), v, src:'wallet', at:new Date().toISOString()}; bals++; } else old.at = new Date().toISOString(); }
  }
  // Reihenfolge wie in Wallet, Konten nur aus dieser App ans Ende
  const before = D.accounts.map(a=>a.id).join();
  D.accounts = [...order, ...D.accounts.filter(a=>!seen.has(a.id))];
  D.walletApi.balAt = new Date().toISOString();
  if(made || bals || before!==D.accounts.map(a=>a.id).join()){ save(); if(made) toastMsg(made+' Konto/Konten aus Wallet angelegt'); }
}
async function wbFixAccMapWeb(){
  if(!wbNet() || !D?.walletApi?.token) return;
  const raw = wbList(await wbGet('accounts'), 'accounts').filter(a=>a && a.id && !a.archived);
  if(!raw.length) return;
  raw.sort((x,y)=>(x.position ?? 0)-(y.position ?? 0));
  const used = new Map(), redo = [];
  for(const w of raw){
    const wname = String(w.name||w.id).slice(0,60), key = 'wallet:'+wname, cur = wbAccCur(w), local = D.accMap[key];
    const a = local ? D.accounts.find(x=>x.id===local) : null;
    const clash = a && used.has(a.id), curBad = a && accCur(a)!==cur;
    if(a && !clash && !curBad){ used.set(a.id, wname); continue; }
    // eigenes Konto anlegen (Name und Währung wie in Wallet)
    const t = wTypeOf(w.accountType || w.type, wname), debt = t==='karte' || t==='kredit';
    let mine = D.accounts.find(x=>x.name===wname && accCur(x)===cur && !used.has(x.id));
    if(!mine){ mine = {id:'w'+uid(), name:wname, kind:debt?'debt':'asset', rate:0, startYm:C.now, start:0, out:0, outM:{}, abos:false, wtype:t, cur:cur==='CHF'?undefined:cur};
      if(t==='bar' || t==='konto') mine.liquid = true; D.accounts.push(mine); }
    D.accMap[key] = mine.id; used.set(mine.id, wname); redo.push({w, wname, acc:mine.id});
  }
  // Buchungen dieser Konten nachholen bzw. umhängen
  for(const x of redo){
    let recs = []; try{ recs = await wbAccRecords(x.w.id); }catch(e){ continue; }
    const ids = new Set(recs.map(r=>'wb_'+String(r.id).slice(0,80)));
    for(const t of D.tx) if(ids.has(t.id)) t.bacc = x.acc;
    const fresh = recs.map(r=>wbRecItem(r, x.wname)).filter(i=>i.d && isFinite(i.sa) && i.sa && !D.tx.some(t=>t.id==='wb_'+String(i.wid).slice(0,80)));
    if(fresh.length) bkApply([{file:'Wallet', f:{wallet:true, bank:'Wallet', accKey:'wallet'}, list:fresh}], {quiet:true});
  }
  if(redo.length){ save(); S.wbMaps = null; }
  if(redo.length) toastMsg(`${redo.length} Wallet-Konto/Konten eigenständig angelegt und Buchungen zugeordnet`);
}
async function wbFastCheckWeb(force){
  if(WBFAST || !wbNet() || !D || S.locked || !D.walletApi?.token || D.walletApi.auto===false || document.visibilityState!=='visible') return;
  if(S.wbPause && Date.now() < S.wbPause) return;
  if(!force && $('#dlg')?.open) return;
  WBFAST = true;
  try{
    S.wbAccC = null;                                           // frisch fragen
    const raw = wbList(await wbGet('accounts'), 'accounts').filter(a=>a && a.id && !a.archived);
    const sig = raw.map(a=>a.id+':'+wbAccBalance(a)+':'+(a.recordStats?.recordCount ?? '')+':'+(a.updatedAt||'')).sort().join('|');
    const changed = sig !== S.wbSig; S.wbSig = sig;
    if(changed || force){
      const w = D.walletApi; w.last = new Date(Date.now()-2*864e5).toISOString();   // nur die letzten Tage nachladen
      await wbSync({quiet:true});                               // Buchungen + Stände (Konten aus Zwischenspeicher)
    } else { D.walletApi.balAt = new Date().toISOString(); }
    safeRender?.();
  }catch(e){ if(/zu viele|429/i.test(e.message||'')) S.wbPause = Date.now() + 10*60*1000; }
  finally{ WBFAST = false; }
}
async function wbSendWeb(method, path, body){
  const w = D.walletApi, tok = wbClean(w.token), url = WB_BASE + path;
  const headers = {Authorization:'Bearer '+tok, Accept:'application/json'}; if(body!==undefined) headers['Content-Type'] = 'application/json';
  let r; try{ const f = await fetch(url, {method, headers, body: body===undefined ? undefined : JSON.stringify(body), credentials:'omit', cache:'no-store', referrerPolicy:'no-referrer'}); r = {status:f.status, data: await f.text()}; }
  catch(e){ throw new Error('Keine Verbindung zu Wallet: '+String(e?.message||e).slice(0,120)); }
  let j = null; try{ j = r.data ? JSON.parse(r.data) : {}; }catch(e){}
  if(r.status===401 || r.status===403) throw new Error('Wallet lehnt den Token ab (Fehler '+r.status+').');
  if(r.status===429){ const e = new Error('Wallet: zu viele Anfragen – später automatisch nochmals.'); e.later = true; throw e; }
  if(r.status>=500){ const e = new Error('Wallet ist gerade nicht erreichbar (Fehler '+r.status+').'); e.later = true; throw e; }
  return {status:r.status, j};
}
if(!NATIVE){
  _wbAccountsSync1220 = wbAccountsSyncWeb; wbFixAccMap = wbFixAccMapWeb; _wbFastCheck1280 = wbFastCheckWeb;
  _wbGet1220 = async path => { const {status, j} = await wbSend('GET', path); if(status<200 || status>=300) throw new Error('Wallet antwortet mit Fehler '+status+'.'); if(j==null) throw new Error('Wallet hat eine unerwartete Antwort geschickt.'); D.walletApi.lastStatus = status; return j; };
  wbPushOn = () => wbNet() && !!D?.walletApi?.token && D.walletApi.push !== false;
  setInterval(()=>{ if(D && !S.locked && D.walletApi?.token && D.walletApi.auto!==false && document.visibilityState==='visible' && wbNet()){ const last = D.walletApi.last ? new Date(D.walletApi.last).getTime() : 0; if(Date.now()-last >= WB_PULL_MS) wbSync({quiet:true}).then(()=>wbPush()); } }, 30000);
}
