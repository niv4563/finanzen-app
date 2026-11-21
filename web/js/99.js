
/* =====================================================================
   START (immer als letzte Datei, damit alle Erweiterungen geladen sind)
   ===================================================================== */
preUpdateSnapshot(); load(); if(D){ const ys=years(); if(!ys.includes(S.year)) S.year=ys.at(-1); } render(); initNative();
detectServer().then(()=>{ if(D){ render(); autoSync(); syncNow(); } });
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') syncNow(); });
setInterval(()=>syncNow(), 5*60*1000);
