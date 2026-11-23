/* =====================================================================
   38. VERSION 1.19.0 – GERÄTE-SYNC LIVE: Handy und Web sind innert Sekunden auf dem gleichen Stand.
   Änderungen werden nach 1 Sekunde hochgeladen. Solange die App offen ist, fragt sie alle 5 Sekunden
   bei GitHub nach, ob es etwas Neues gibt (mit ETag: «nichts Neues» kostet praktisch nichts und
   zählt nicht gegen das GitHub-Limit). Übertragen wird weiterhin nur die verschlüsselte Datei.
   ===================================================================== */
var GH_LIVE_MS = 5000;
var _syncSoon1190 = syncSoon;
syncSoon = function(){ if(typeof ghOn==='function' && ghOn()){ clearTimeout(GHT); GHT = setTimeout(()=>ghSync(), 1000); } else _syncSoon1190(); };
async function ghLiveCheck(){
  if(!D || S.locked || !ghOn() || GHBUSY || document.visibilityState!=='visible' || $('#dlg')?.open || D.sync?.dirty) return;
  try{
    const o = ghParse(SYNCCODE);
    const r = await ghReq(o, 'contents/'+GH_FILE, {method:'GET', headers: S.ghEtag ? {'If-None-Match': S.ghEtag} : {}});
    if(r.status===304) { S.ghLiveAt = Date.now(); return; }
    if(!r.ok) return;
    const et = r.headers.get('ETag'), first = !S.ghEtag; S.ghEtag = et || null; S.ghLiveAt = Date.now();
    if(!first){ const before = D.sync?.rev||0; await ghSync(); if((D?.sync?.rev||0) > before) toastMsg('Aktualisiert – Änderung vom anderen Gerät'); }
  }catch(e){}
}
setInterval(ghLiveCheck, GH_LIVE_MS);
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') setTimeout(ghLiveCheck, 300); });
// Anzeige im Sync-Bereich
var _syncCard1190 = syncCard;
syncCard = function(){ const h = _syncCard1190(); return ghOn() ? h.replace('<span class="tag g">aktiv</span>', '<span class="tag g">live</span>') .replace('Änderungen werden nach ein paar Sekunden gespeichert', 'Änderungen sind nach 1–5 Sekunden auf allen geöffneten Geräten') : h; };
