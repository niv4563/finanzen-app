
/* =====================================================================
   17. VERSION 1.2.1 – APP-SPERRE EINSTELLBAR
   «Im Hintergrund sperren nach»: 1 Min. bis 1 Std. oder erst beim Neustart der App.
   Der Schlüssel bleibt nur im Arbeitsspeicher; beendet Android die App, ist die PIN wieder nötig.
   ===================================================================== */
var bgLockMs = () => { const m = D?.settings.bgLock ?? 30; return m===0 ? Infinity : m*60000; };
// Läuft vor der alten Prüfung (Capture-Phase): innerhalb der gewählten Zeit wird nicht gesperrt.
window.addEventListener('visibilitychange', ()=>{
  if(!NATIVE) return;
  if(document.visibilityState==='hidden'){ S.bgAt = Date.now(); S.lastAct = Date.now()+bgLockMs(); return; }   // Inaktivitäts-Sperre ruht im Hintergrund
  if(CK && D && S.bgAt && Date.now()-S.bgAt <= bgLockMs()){ S.hiddenAt = null; S.lastAct = Date.now(); }
}, true);
function initNative(){
  if(!NATIVE) return;
  const AppP = plug('App');
  ['file','csvfile'].forEach(id=>$('#'+id)?.removeAttribute('accept'));
  AppP.addListener('backButton', ()=>{
    if($('#dlg').open) $('#dlg').close();
    else if(!S.locked && D && S.view!=='start'){ S.view='start'; render(); scrollTo(0,0); }
    else AppP.minimizeApp();
  });
  AppP.addListener('pause', ()=>{ S.hiddenAt = Date.now(); S.bgAt = S.bgAt || Date.now(); if($('#dlg').open && CK) $('#dlg').close(); });
  AppP.addListener('resume', ()=>{ const t = S.bgAt || S.hiddenAt; if(CK && D && t && Date.now()-t > bgLockMs()) lock(); else { S.hiddenAt = null; S.lastAct = Date.now(); } S.bgAt = null; checkUpdate(false); });
  setTimeout(()=>checkUpdate(false), 1500);
}
var _vDaten121 = vDaten2;
vDaten2 = function(){
  let h = _vDaten121();
  if(!CK) return h;
  const bg = D.settings.bgLock ?? 30, al = D.settings.autoLock || 5;
  h = h.replace('<p class="small muted">Wenn du die App verlässt, sperrt sie sich spätestens nach 1 Minute.</p>', '');
  h = h.replace(/<label class="f">Automatisch sperren nach<select class="in setting-sel" data-k="autoLock">[\s\S]*?<\/select><\/label>/,
    `<label class="f">Sperren, wenn ich die App verlasse, nach<select class="in setting-sel" data-k="bgLock">${[[1,'1 Minute'],[5,'5 Minuten'],[15,'15 Minuten'],[30,'30 Minuten'],[60,'1 Stunde'],[0,'erst wenn die App neu startet']].map(([v,l])=>`<option value="${v}" ${bg===v?'selected':''}>${l}</option>`).join('')}</select></label>
     <label class="f">Sperren, wenn die App offen ist, aber nicht benutzt wird, nach<select class="in setting-sel" data-k="autoLock">${[[5,'5 Minuten'],[15,'15 Minuten'],[30,'30 Minuten'],[60,'1 Stunde'],[1440,'nie']].map(([v,l])=>`<option value="${v}" ${al===v?'selected':''}>${l}</option>`).join('')}</select></label>
     <p class="small muted">Längere Zeiten sind bequemer. Dann schützt vor allem die Bildschirmsperre deines Handys deine Daten – sie sollte also eingeschaltet sein. Gespeichert bleibt alles verschlüsselt; die PIN wird nie gespeichert.</p>`);
  return h;
};
