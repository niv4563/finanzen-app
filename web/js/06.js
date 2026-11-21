});
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); window._installEvt=e; });
if(!NATIVE && 'serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(()=>{});

preUpdateSnapshot(); load(); if(D){ const ys=years(); if(!ys.includes(S.year)) S.year=ys.at(-1); } render(); initNative();
detectServer().then(()=>{ if(D){ render(); autoSync(); syncNow(); } });
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') syncNow(); });
setInterval(()=>syncNow(), 5*60*1000);
