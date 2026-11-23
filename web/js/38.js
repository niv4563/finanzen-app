/* =====================================================================
   46. VERSION 1.26.1 – ALLE WALLET-KONTEN HOLEN (AUCH ÜBER MEHRERE SEITEN)
   Wallet liefert die Kontenliste seitenweise. Bisher wurde nur die erste Seite gelesen –
   Konten auf weiteren Seiten (z. B. ein Sparkonto) fehlten. Jetzt werden alle Seiten geholt.
   ===================================================================== */
async function wbAllAccounts(){
  let all = [], off = 0, ok = false;
  for(let p=0; p<10; p++){
    let r; try{ r = await wbSend('GET', `accounts?limit=200&offset=${off}`); }catch(e){ if(p===0) break; throw e; }
    if(r.status<200 || r.status>=300){ if(p===0) break; throw new Error('Wallet antwortet mit Fehler '+r.status+'.'); }
    ok = true; const l = wbList(r.j, 'accounts'); all = all.concat(l);
    if(r.j?.nextOffset==null || !l.length) break; off = r.j.nextOffset;
  }
  if(!ok){ const j = await _wbGet1220('accounts'); all = wbList(j,'accounts'); }   // Rückfall wie bisher
  const seen = new Set(); return all.filter(a=>a && a.id && !seen.has(a.id) && seen.add(a.id));
}
wbGet = (prev => async function(path){
  if(path.startsWith('accounts')){
    if(S.wbAccC && Date.now()-S.wbAccC.at < 20000) return S.wbAccC.j;
    const j = {accounts: await wbAllAccounts()}; S.wbAccC = {at:Date.now(), j}; return j;
  }
  return prev(path);
})(wbGet);
// Auf der Wallet-Seite: wie viele Konten Wallet meldet
var _render1261 = render;
render = function(){ _render1261(); if(S.view==='wallet' && D?.walletApi?.accList && $('#wbmapcard h3') && !$('#wbmapn')) $('#wbmapcard h3').insertAdjacentHTML('afterend', `<p class="small muted" id="wbmapn" style="margin-top:-6px">Wallet meldet ${D.walletApi.accList.length} aktive Konten.</p>`); };
