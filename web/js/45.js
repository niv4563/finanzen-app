/* =====================================================================
   53. VERSION 1.31.0 – ENTSCHEIDUNGEN BLEIBEN, STÄRKERE VERSCHLÜSSELUNG, ABGLEICH BEIM ÖFFNEN
   • Was du einmal wählst (Reiter, Zeiträume, Filter, Ansichten, «Später» bei einer neuen Version …),
     bleibt gespeichert – verschlüsselt in deinen Daten – und wird beim Öffnen nicht neu gefragt.
   • Speicher auf dem Handy: AES-256-GCM. Schlüssel aus PIN (PBKDF2-SHA-256, 600 000 Durchläufe)
     PLUS einem 256-Bit-Geräteschlüssel aus dem Sicherheitschip (Android Keystore / StrongBox).
     Eine kopierte Datei lässt sich so auf keinem anderen Gerät knacken – auch nicht mit kurzer PIN.
     Alte Daten werden beim nächsten Entsperren automatisch umgeschlüsselt.
   • Beim Öffnen der App: sofort Abgleich mit Wallet und Übertragung des aktuellen Stands für den PC.
   ===================================================================== */

/* ---------- Stärkere Verschlüsselung ---------- */
var KDF_ITER2 = 600000, KDF_NEW = false, KEYV2 = new WeakMap(), _deriveKey1310 = deriveKey;
async function devSecret(){
  if(!NATIVE) return null;
  const r = await plug('DeviceKey').get();                     // wirft, wenn der Sicherheitschip nicht antwortet
  return unb64(r.secret);
}
async function deriveKey2(pin, salt, needDev){
  const base = await crypto.subtle.importKey('raw', te.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2', salt, iterations:KDF_ITER2, hash:'SHA-256'}, base, 256));
  let dev = null;
  if(needDev !== false && NATIVE){
    try{ dev = await devSecret(); }
    catch(e){ if(needDev) throw new Error('Der Sicherheitschip des Handys antwortet nicht. Bitte App neu starten.'); }
  }
  const ikm = new Uint8Array(bits.length + (dev ? dev.length : 0)); ikm.set(bits); if(dev) ikm.set(dev, bits.length);
  const hk = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({name:'HKDF', hash:'SHA-256', salt, info:te.encode(dev ? 'finanzen-v2-geraet' : 'finanzen-v2')}, hk, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
  bits.fill(0); ikm.fill(0); if(dev) dev.fill(0);
  KEYV2.set(key, !!dev); return key;
}
// Gespeicherter Stand: neue Art, sobald er damit verschlüsselt ist. Sicherungsdateien bleiben wie bisher lesbar.
deriveKey = async function(pin, salt){
  if(KDF_NEW) return deriveKey2(pin, salt, null);
  try{ const b = JSON.parse(localStorage.getItem(ENC_KEY)||'null');
    if(b && b.v === 2 && b.salt === b64(salt)) return deriveKey2(pin, salt, !!b.d); }catch(e){}
  return _deriveKey1310(pin, salt);
};
encryptObj = (prev => async function(key, salt, obj){
  const b = await prev(key, salt, obj);
  if(KEYV2.has(key)){ b.v = 2; b.d = KEYV2.get(key) ? 1 : 0; b.kdf = 'pbkdf2-sha256-600k+hkdf'; }
  return b;
})(encryptObj);
setPin = (prev => async function(pin){ KDF_NEW = true; try{ return await prev(pin); } finally{ KDF_NEW = false; } })(setPin);
async function rekeyIfOld(pin){
  let b; try{ b = JSON.parse(localStorage.getItem(ENC_KEY)||'null'); }catch(e){ return; }
  if(!b || !CK || !D) return;
  const wantDev = NATIVE;
  if(b.v === 2 && (!!b.d === wantDev || !wantDev)) return;
  try{
    const salt = crypto.getRandomValues(new Uint8Array(16));
    KDF_NEW = true; const key = await deriveKey(pin, salt); KDF_NEW = false;
    if(wantDev && !KEYV2.get(key)) return;                     // Sicherheitschip nicht bereit: beim nächsten Mal
    CK = key; SALT = salt; S.noDirty = true; await save(); S.noDirty = false;
  }catch(e){ KDF_NEW = false; }
}
unlock = (prev => async function(pin){ await prev(pin); await rekeyIfOld(pin); })(unlock);

/* ---------- Entscheidungen merken ---------- */
var UI_KEEP = ['updLater','atab','atab2','stab','sper','bper','bmode','mbw','showOld','showEmpty','mapAll','zAll','facc','fc','af','wtype','txShow','calYm'];
function uiRestore(){
  if(!D || S._uiRestored) return; S._uiRestored = true;
  const u = D.settings?.ui; if(!u) return;
  for(const k of UI_KEEP) if(u[k] !== undefined) S[k] = u[k];
}
function uiRemember(){
  if(!D || !S._uiRestored) return;
  D.settings = D.settings || {}; const u = D.settings.ui || {}, n = {...u}; let ch = false;
  for(const k of UI_KEEP){ const v = S[k];
    if(v === undefined || typeof v === 'function') continue;
    let j; try{ j = JSON.stringify(v); }catch(e){ continue; }
    if(j.length > 2000) continue;
    if(JSON.stringify(u[k]) !== j){ n[k] = JSON.parse(j); ch = true; } }
  if(ch){ D.settings.ui = n; clearTimeout(S._uiT); S._uiT = setTimeout(()=>{ if(D){ S.noDirty = true; save(); S.noDirty = false; } }, 800); }
}
var _render1310 = render;
render = function(){ uiRestore(); _render1310.apply(this, arguments); uiRemember(); };
lock = (prev => function(){ S._uiRestored = false; return prev.apply(this, arguments); })(lock);

/* ---------- Beim Öffnen: sofort abgleichen und den Stand übertragen ---------- */
function openSync(){
  if(!D || S.locked) return;
  try{ if(ghOn()) ghSync(); }catch(e){}
  if(NATIVE || (typeof wbNet === 'function' && wbNet())){
    setTimeout(async()=>{ try{ await wbFastCheck(true); }catch(e){} try{ if(ghOn() && D?.sync?.dirty) ghSync(); }catch(e){} }, 300);
  }
}
unlock = (prev => async function(pin){ await prev(pin); setTimeout(openSync, 200); })(unlock);
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'visible') setTimeout(openSync, 150); });
if(NATIVE) try{ plug('App').addListener('resume', ()=>setTimeout(openSync, 150)); }catch(e){}
