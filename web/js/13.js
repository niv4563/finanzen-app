
/* =====================================================================
   21. VERSION 1.4.2 – WALLET-VERBINDUNG ROBUSTER, GENAUE FEHLERMELDUNGEN, VERBINDUNGSTEST
   ===================================================================== */
// Token säubern: «Bearer …», Leerzeichen, Zeilenumbrüche und Anführungszeichen entfernen
var wbClean = t => String(t||'').replace(/^\s*(authorization\s*:\s*)?bearer\s+/i,'').replace(/["'\s]/g,'');
async function wbGet(path){
  const w = D.walletApi; if(!w?.token) throw new Error('Kein Token eingetragen.');
  const tok = wbClean(w.token); if(tok!==w.token){ w.token = tok; save(); }
  const isAcc = path.startsWith('accounts');
  if(isAcc) path = 'accounts';                                   // ohne Zusatz-Parameter, die der Server evtl. ablehnt
  const url = WB_BASE + path, headers = {Authorization:'Bearer '+tok, Accept:'application/json'};
  let r;
  try{
    const http = plug('CapacitorHttp');
    r = await http.request({url, method:'GET', headers, responseType:'text', connectTimeout:20000, readTimeout:45000});
  }catch(e){
    const m = String(e?.message||e);
    if(/not implemented|not available/i.test(m)){   // Rückfall: direkter Abruf
      try{ const f = await fetch(url, {headers, credentials:'omit', cache:'no-store', referrerPolicy:'no-referrer'}); r = {status:f.status, data:await f.text()}; }
      catch(e2){ throw new Error('Keine Verbindung zu Wallet möglich (direkter Abruf blockiert): '+String(e2?.message||e2).slice(0,120)); }
    } else throw new Error('Keine Verbindung zu Wallet: '+m.slice(0,160)+(e?.code?` (${e.code})`:'')+'. Ist das Handy online?');
  }
  let body = r.data, j = null;
  if(typeof body==='string'){ try{ j = body ? JSON.parse(body) : {}; }catch(e){ j = null; } } else j = body;
  const detail = (j && (j.message || j.error || j.detail || j.title)) ? String(j.message || j.error || j.detail || j.title).slice(0,160) : (typeof body==='string' ? body.slice(0,120) : '');
  w.lastStatus = r.status;
  if(r.status===401 || r.status===403) throw new Error(`Wallet lehnt den Token ab (Fehler ${r.status}${detail?': '+detail:''}). Prüfe, ob du den ganzen Token kopiert hast und Wallet Premium aktiv ist.`);
  if(r.status===409){ const e = new Error('Wallet bereitet deine Daten für die Schnittstelle vor (passiert beim ersten Mal nach dem Erstellen des Tokens). Die App versucht es in 3 Minuten automatisch nochmals.'); e.retry = true; throw e; }
  if(r.status===429) throw new Error('Zu viele Anfragen an Wallet – bitte in einer Stunde nochmals versuchen.');
  if(isAcc && (r.status<200 || r.status>=300)) return {accounts:[]};   // Kontonamen sind nicht zwingend
  if(r.status<200 || r.status>=300) throw new Error(`Wallet antwortet mit Fehler ${r.status}${detail?': '+detail:''}.`);
  if(j==null) throw new Error('Wallet hat eine unerwartete Antwort geschickt.');
  return j;
}
var _wbSync142 = wbSync;
wbSync = async function(opt={}){
  await _wbSync142(opt);
  const w = D?.walletApi;
  if(w?.err && /bereitet deine Daten/.test(w.err)){ clearTimeout(S.wbRetry); S.wbRetry = setTimeout(()=>wbSync({quiet:true}), 3*60*1000); }
};
async function wbTest(){
  const out = [], add = (ok, t) => out.push(`<div class="li small"><span>${ok?'✓':'✗'}</span><span class="sp">${esc(t)}</span></div>`);
  const w = D.walletApi || {}, tok = wbClean(w.token);
  add(tok.length>=20, tok ? `Token vorhanden (${tok.length} Zeichen)` : 'Kein Token gespeichert');
  add(NATIVE, NATIVE ? 'Android-App' : 'Nur in der Android-App möglich');
  try{ const j = await wbGet('records?limit=1'); add(true, `Wallet antwortet (Status ${w.lastStatus}) · ${wbList(j,'records').length ? 'Buchungen gefunden' : 'noch keine Buchungen'}`);
    try{ const a = wbList(await wbGet('accounts'),'accounts'); add(true, `${a.length} Wallet-Konten gefunden`); }catch(e){ add(false, e.message); } }
  catch(e){ add(false, e.message); }
  dialog(`<h3>Verbindungstest</h3><div class="list">${out.join('')}</div><p class="small muted">App-Version ${esc(BUILD.version||'')} · ${new Date().toLocaleString('de-CH')}</p><div class="acts"><button class="btn pri" data-dlg="cancel">OK</button></div>`, ()=>{});
}
var _vWallet142 = vWallet;
vWallet = function(){
  let h = _vWallet142();
  if(!NATIVE) return h;
  const on = !!D.walletApi?.token;
  if(on) h = h.replace('<p class="small"><a class="link" data-act="wboff">', `<div class="row mt" style="gap:8px;flex-wrap:wrap"><button class="btn sm" data-act="wbtest">Verbindung testen</button><button class="btn sm" data-act="wbtok">Token ändern</button></div><p class="small"><a class="link" data-act="wboff">`);
  return h;
};
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act]'); if(!a || !D) return; const k = a.dataset.act;
  if(k==='wbtest'){ e.stopPropagation(); wbTest(); }
  else if(k==='wbtok'){ e.stopPropagation();
    dialog(`<h3>Token ändern</h3><label class="f">Neuer API-Token<input id="wbt2" type="password" autocomplete="off" spellcheck="false"></label>${acts(true)}`,
      ()=>{ const t = wbClean(val('wbt2')); if(t.length<10) return false; D.walletApi.token = t; D.walletApi.err = null; setTimeout(()=>wbSync({}),50); }); }
}, true);
