/* =====================================================================
   35. VERSION 1.16.0 – SOFORT SPERREN, WENN DIE APP VERLASSEN WIRD (beim Zurückkommen Fingerabdruck).
   Ausnahmen: Foto, Datei-Auswahl, Teilen, Fingerabdruck- und Berechtigungs-Fenster.
   ===================================================================== */
var _render1160 = render;
render = function(){
  _render1160();
  if(D && !S.locked && !D.flags?.lock116){ (D.flags ??= {}).lock116 = 1; D.settings.bgLock = -1; S.noDirty = true; save(); S.noDirty = false; }
};
/* ---------- Sofort sperren beim Verlassen – ausser bei Foto, Datei-Auswahl, Teilen, Fingerabdruck ---------- */
bgLockMs = () => { if(S.extUntil && Date.now() < S.extUntil) return Infinity; const m = D?.settings.bgLock ?? 30; return m===-1 ? 0 : m===0 ? Infinity : m*60000; };
document.addEventListener('click', e=>{
  if(e.target.closest('input[type=file], label:has(input[type=file]), [data-act*="import"], [data-act*="photo"], [data-act*="rcp"], [data-act*="csv"], [data-act*="backup"], [data-act*="share"], [data-act*="export"], [data-act*="xlsx"], [data-dlg="csv"], [data-sheet], #ntf, [data-act*="bio"]'))
    S.extUntil = Date.now() + 10*60000;
}, true);
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState==='visible'){ if(S.extUntil) S.extUntil = Math.min(S.extUntil, Date.now()+3000); return; }
  if(!CK || !D || (D.settings.bgLock ?? 30)!==-1 || (S.extUntil && Date.now() < S.extUntil)) return;
  lock();                                                                    // Daten sind bereits verschlüsselt gespeichert
});
var _bioPlug1160 = bioPlug;   // Fingerabdruck-Fenster: während der Abfrage nicht sperren
bioPlug = () => { const p = _bioPlug1160(); if(!p) return p; const g = f => o => { S.extUntil = Date.now() + 60000; return p[f](o); };
  return {status:o=>p.status(o), disable:o=>p.disable(o), enable:g('enable'), unlock:g('unlock')}; };
var _vDaten1160 = vDaten2;
vDaten2 = function(){ return _vDaten1160().replace(`data-k="bgLock">`, `data-k="bgLock"><option value="-1" ${(D.settings.bgLock??30)===-1?'selected':''}>sofort (empfohlen)</option>`); };
