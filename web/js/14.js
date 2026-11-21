
/* =====================================================================
   22. VERSION 1.4.3 – ANDROID-FUNKTIONEN RICHTIG ANBINDEN
   Die App lädt keine Fremd-Bibliothek für die Brücke zu Android. Die Funktionen von Android
   (Zurück-Taste, Sperre beim Verlassen, Fingerabdruck, Backup teilen, Screenshots, Wallet)
   liegen unter window.Capacitor.Plugins – hier werden sie einmal fest verbunden.
   ===================================================================== */
(function nativeLink(){
  if(!NATIVE) return;
  const C = window.Capacitor || {};
  const viaPromise = n => new Proxy({}, {get:(_, m) => {
    if(m==='then') return undefined;
    if(m==='addListener') return (ev, cb) => (typeof C.addListener==='function' ? C.addListener(n, ev, cb) : {remove(){}});
    return (opt={}) => typeof C.nativePromise==='function' ? C.nativePromise(n, m, opt) : Promise.reject(new Error('Android-Funktion «'+n+'» nicht verfügbar'));
  }});
  for(const n of ['App','BioLock','CapacitorHttp','Filesystem','Share','Screen']){
    if(PLUG[n]) continue;
    const p = C.Plugins?.[n];
    PLUG[n] = p || (typeof C.registerPlugin==='function' ? C.registerPlugin(n) : viaPromise(n));
  }
})();
