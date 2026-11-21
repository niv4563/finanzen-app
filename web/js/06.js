});
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); window._installEvt=e; });
if(!NATIVE && 'serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(()=>{});

