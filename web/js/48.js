/* =====================================================================
   56. VERSION 1.32.2 – GROSSE DATENMENGEN STÜCKWEISE UMWANDELN
   Mit vielen Buchungen brach die Umwandlung in Text mit «Maximum call stack size exceeded» ab
   (Speichern, Geräte-Abgleich, Sicherung). Jetzt wird stückweise umgewandelt.
   ===================================================================== */
var b64safe = buf => { const u = new Uint8Array(buf); let s = ''; for(let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
b64big = b64safe;
encryptObj = async function(key, salt, obj){
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, te.encode(JSON.stringify(obj)));
  const b = {v:1, salt:b64safe(salt), iv:b64safe(iv), ct:b64safe(ct)};
  if(KEYV2.has(key)){ b.v = 2; b.d = KEYV2.get(key) ? 1 : 0; b.kdf = 'pbkdf2-sha256-600k+hkdf'; }
  return b;
};
ghSeal = async function(key, obj){
  const iv = crypto.getRandomValues(new Uint8Array(12)), pt = await gz(new TextEncoder().encode(JSON.stringify(obj)), 'c');
  const ct = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, pt));
  return {iv:b64safe(iv), ct:b64safe(ct)};
};
