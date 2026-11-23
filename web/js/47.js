/* =====================================================================
   55. VERSION 1.32.0 – NUR FINGERABDRUCK, PC NUR PER QR-CODE (AUCH MIT DER GEWÖHNLICHEN KAMERA),
       MONATLICHE SICHERUNG AUF DEM HANDY
   • Handy öffnet nur mit Fingerabdruck. Die PIN erscheint nur noch als Notweg, wenn Android den
     Fingerabdruck-Schlüssel ungültig gemacht hat (z. B. neuer Finger im Handy eingerichtet) –
     sonst wären die Daten auf dem Handy verloren.
   • PC verbinden nur per QR-Code. Die gewöhnliche Kamera öffnet über den Link die App;
     ein Fingerabdruck («PC verbinden», mit Prüfzeichen) entsperrt und verbindet in einem Schritt.
   • Einmal pro Monat legt das Handy eine verschlüsselte Sicherung in «Dokumente/Finanzen» ab.
   ===================================================================== */

/* ---------- Sperrbildschirm: nur Fingerabdruck ---------- */
pinReveal = (prev => function(){ if(NATIVE && bioOn()){ const m = $('#pinmsg'); if(m) m.style.display = ''; return; } return prev(); })(pinReveal);
renderLock = (prev => function(){
  prev();
  if(!NATIVE || !bioOn()) return;                                // ohne Fingerabdruck (oder ungültig geworden): PIN als Notweg
  const form = $('#unlockf'); if(form) form.style.display = 'none';
  $('#pinlink')?.remove();
  const m = $('#pinmsg'); if(m && !m.textContent.trim().startsWith('Zu viele')) { m.dataset.bio = '1'; }
  const p = $('#main .welcome > p.muted'); if(p) p.textContent = 'Lege deinen Finger auf den Sensor.';
})(renderLock);

/* ---------- PC verbinden: Link vom QR-Code, Fingerabdruck, fertig ---------- */
var PAIR_SEEN = new Set();
function pairDialog(text){
  if($('#dlg').open) $('#dlg').close();
  dialog(`<h3>${ICON.pc||''} PC verbinden</h3><p class="small" id="qrs">Bitte mit dem Fingerabdruck bestätigen …</p>
    <div class="acts"><button class="btn" data-dlg="cancel">Schliessen</button></div>`, ()=>{});
}
async function pairAuthorize(code){                                // Fingerabdruck als Bestätigung (mit Prüfzeichen)
  const sub = `Am PC muss «${code}» stehen. Nur bestätigen, wenn du gerade selbst «Mit Handy anmelden» geöffnet hast.`;
  if(NATIVE && bioOn()){
    const r = await bioPlug().unlock({data: localStorage.getItem(BIO_KEY), title: 'PC verbinden', subtitle: sub});
    return bioDec(r.secret);
  }
  if(!confirm('PC verbinden?\n\n' + sub)) throw Object.assign(new Error('Abgebrochen.'), {code:'CANCELED'});
  return null;
}
async function pairSendNow(text){
  const s = () => $('#qrs');
  const [topic, pubS] = text.slice(PAIR_PREFIX.length).split('.');
  if(!pairTopicOk(topic || '') || !pubS) throw new Error('Das ist kein Anmelde-Code der Finanzen-App.');
  const webPub = unb64u(pubS); if(webPub.length !== 65) throw new Error('Das ist kein Anmelde-Code der Finanzen-App.');
  const kp = await crypto.subtle.generateKey({name:'ECDH', namedCurve:'P-256'}, false, ['deriveBits']);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const key = await pairKey(kp.privateKey, webPub, topic), iv = crypto.getRandomValues(new Uint8Array(12));
  const small = {u: dayEnd()}; let attach = null;
  if(ghOn()) small.c = SYNCCODE;
  else {                                                         // ohne Geräte-Abgleich: Daten selbst mitschicken (gepackt + verschlüsselt)
    const json = JSON.stringify(D, (k,v) => k === '_p' ? undefined : v);
    const gz = await new Response(new Blob([te.encode(json)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    const aiv = crypto.getRandomValues(new Uint8Array(12));
    attach = b64u(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv:aiv, additionalData:new TextEncoder().encode(topic + '.d')}, key, gz)));
    small.a = 1; small.aiv = b64u(aiv);
  }
  const ct = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv, additionalData:new TextEncoder().encode(topic)}, key, new TextEncoder().encode(JSON.stringify(small))));
  const msg = PAIR_REPLY + b64u(pub) + '.' + b64u(iv) + '.' + b64u(ct);
  const r = attach
    ? await fetch(PAIR_RELAY + topic + '?filename=d.txt&message=' + encodeURIComponent(msg), {method:'PUT', body: attach, credentials:'omit', referrerPolicy:'no-referrer'})
    : await fetch(PAIR_RELAY + topic, {method:'POST', body: msg, credentials:'omit', referrerPolicy:'no-referrer'});
  if(!r.ok) throw new Error('Senden fehlgeschlagen (' + r.status + '). Bitte am PC einen neuen Code anzeigen und nochmals scannen.');
  if(s()) s().textContent = 'Fertig – der PC ist in ein paar Sekunden verbunden (bis heute 23:59).';
  setTimeout(()=>{ $('#dlg').open && $('#qrs') && $('#dlg').close(); }, 2500);
  toastMsg('PC verbunden bis 23:59');
}
// ersetzt die Bestätigung per Knopf (In-App-Scanner) durch den Fingerabdruck
phonePairSend = async function(text){
  const pl = pairExtract(text); const s = $('#qrs');
  try{
    if(!pl) throw new Error('Das ist kein Anmelde-Code der Finanzen-App.');
    if(s) s.textContent = 'Bitte mit dem Fingerabdruck bestätigen …';
    await pairAuthorize(await pairCode(unb64u(pl.split('.')[2])));
    if($('#qrs')) $('#qrs').textContent = 'Verbinde …';
    await pairSendNow(pl);
  }catch(err){ const q = $('#qrs'); if(q) q.textContent = err?.code === 'CANCELED' ? 'Abgebrochen – der PC wurde nicht verbunden.' : (err.message || String(err)); }
};
// Link aus der gewöhnlichen Kamera (finanzen://verbinden?d=…)
async function pairFromLink(url){
  const pl = pairExtract(url ? decodeURIComponent(url) : ''); if(!pl || PAIR_SEEN.has(pl)) return; PAIR_SEEN.add(pl);
  const code = await pairCode(unb64u(pl.split('.')[2]));
  if(S.locked && NATIVE && bioOn()){                             // ein Fingerabdruck: entsperren UND verbinden
    S.bioTried = true; render(); pairDialog();
    try{
      const pin = await pairAuthorize(code);
      $('#qrs') && ($('#qrs').textContent = 'Entschlüssle …');
      await unlock(pin); render(); pairDialog(); $('#qrs').textContent = 'Verbinde …';
      await pairSendNow(pl);
    }catch(err){ if(!$('#dlg').open) pairDialog(); $('#qrs').textContent = err?.code === 'CANCELED' ? 'Abgebrochen – der PC wurde nicht verbunden.' : (err.message || String(err)); }
    return;
  }
  if(S.locked){ S.pairLater = pl; return; }                       // ohne Fingerabdruck: nach dem Entsperren
  pairDialog(); await phonePairSend(pl);
}
unlock = (prev => async function(pin){ await prev(pin); const pl = S.pairLater; if(pl){ S.pairLater = null; PAIR_SEEN.delete(pl); setTimeout(()=>pairFromLink(pl), 600); } })(unlock);
if(NATIVE){
  try{
    const AppP = plug('App');
    AppP.addListener('appUrlOpen', e => { if(e?.url) pairFromLink(e.url); });
    AppP.getLaunchUrl().then(r => { if(r?.url) setTimeout(()=>pairFromLink(r.url), 400); }).catch(()=>{});
  }catch(e){}
}

/* ---------- Handy-Browser: QR-Code wurde mit der gewöhnlichen Kamera geöffnet ---------- */
if(!NATIVE && /^#v=/.test(location.hash)){
  const pl = pairExtract(location.hash);
  const android = /Android/i.test(navigator.userAgent);
  const intent = pl ? `intent://verbinden?d=${encodeURIComponent(pl)}#Intent;scheme=finanzen;package=ch.nivaram.finanzen;end` : '';
  var _render1320 = render;
  render = function(){
    if(!pl){ history.replaceState(null, '', location.pathname); return _render1320.apply(this, arguments); }
    $('#nav1') && ($('#nav1').innerHTML = ''); $('#nav2') && ($('#nav2').innerHTML = ''); $('#fab')?.classList.add('hide');
    $('#main').innerHTML = `<div class="welcome"><h2>PC verbinden</h2>
      ${android ? `<p class="muted">Tippe auf den Knopf. Die Finanzen-App öffnet sich und fragt nach deinem Fingerabdruck.</p>
      <a class="btn pri wide" href="${esc(intent)}" style="display:block;text-align:center;font-size:17px;padding:16px">In der Finanzen-App öffnen</a>`
      : `<p class="muted">Diesen QR-Code bitte mit dem Handy scannen, auf dem die Finanzen-App installiert ist.</p>`}</div>`;
  };
  if(android && pl) setTimeout(()=>{ try{ location.href = intent; }catch(e){} }, 300);
}

/* ---------- PC: Verbindung nur per QR-Code ---------- */
if(!NATIVE){
  window.addEventListener('click', e=>{ const a = e.target.closest?.('[data-act="ghjoin"],[data-act="webqrscan"]'); if(!a) return; e.stopPropagation(); e.preventDefault(); webPairShow(); }, true);
  var _render1321 = render;
  render = function(){
    _render1321.apply(this, arguments);
    document.querySelectorAll('#main .welcome .card').forEach(c => { if(c.id !== 'webqrbtn' && c.querySelector('[data-act="ghjoin"]')) c.remove(); });
  };
}
// Handy: Verbindungscode nicht mehr als Text zeigen
syncCard = (prev => function(){ return prev().replace(/<button class="btn sm" data-act="ghcode">[^<]*<\/button>/, ''); })(syncCard);

/* ---------- Monatliche Sicherung auf dem Handy ---------- */
async function monthSnap(force){
  if(!NATIVE || !D || S.locked) return;
  const ym = new Date().toISOString().slice(0,7);
  if(!force && D.snapYm === ym) return;
  const FS = plug('Filesystem'); if(!FS) return;
  D.archKey = D.archKey || b64u(crypto.getRandomValues(new Uint8Array(32)));
  const key = await crypto.subtle.importKey('raw', unb64u(D.archKey), 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12)), at = new Date().toISOString();
  const data = JSON.parse(JSON.stringify(D, (k,v) => k === '_p' ? undefined : v));
  const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv, additionalData: te.encode('finanzen-monat-v1')}, key, te.encode(JSON.stringify({d:data, at})));
  const body = JSON.stringify({format:'finanzen-monat', v:1, ym, at, iv:b64(iv), ct:b64(ct)});
  const path = `Finanzen/Finanzen_${ym}.enc.json`;
  let where = 'DOCUMENTS';
  try{ await FS.writeFile({path, data:body, directory:'DOCUMENTS', encoding:'utf8', recursive:true}); }
  catch(e){ where = 'DATA'; await FS.writeFile({path, data:body, directory:'DATA', encoding:'utf8', recursive:true}); }
  D.snapYm = ym; D.snapWhere = where; S.noDirty = true; await save(); S.noDirty = false;
  try{ const l = (await FS.readdir({path:'Finanzen', directory:where})).files.map(f => f.name || f).filter(n => /^Finanzen_\d{4}-\d{2}\.enc\.json$/.test(n)).sort();
    for(const n of l.slice(0, Math.max(0, l.length - 24))) await FS.deleteFile({path:'Finanzen/'+n, directory:where}).catch(()=>{}); }catch(e){}
}
async function monthList(){
  const FS = plug('Filesystem'), where = D?.snapWhere || 'DOCUMENTS';
  try{ return (await FS.readdir({path:'Finanzen', directory:where})).files.map(f => f.name || f).filter(n => /^Finanzen_\d{4}-\d{2}\.enc\.json$/.test(n)).sort().reverse(); }catch(e){ return []; }
}
async function monthRestore(name){
  const FS = plug('Filesystem'), where = D?.snapWhere || 'DOCUMENTS';
  try{
    const f = JSON.parse((await FS.readFile({path:'Finanzen/'+name, directory:where, encoding:'utf8'})).data);
    const key = await crypto.subtle.importKey('raw', unb64u(D.archKey), 'AES-GCM', false, ['decrypt']);
    const o = JSON.parse(td.decode(await crypto.subtle.decrypt({name:'AES-GCM', iv:unb64(f.iv), additionalData: te.encode('finanzen-monat-v1')}, key, unb64(f.ct))));
    if(!confirm(`Stand vom ${new Date(o.at).toLocaleDateString('de-CH')} wiederherstellen? Alles, was seither geändert wurde, wird ersetzt.`)) return;
    const keep = {archKey: D.archKey, snapYm: D.snapYm, snapWhere: D.snapWhere};
    D = migrate(o.d); Object.assign(D, keep); D.sync = {...(D.sync||{}), dirty:true};
    await save(); render(); toastMsg('Wiederhergestellt');
  }catch(e){ alert('Diese Sicherung lässt sich nicht öffnen: ' + (e.message || e)); }
}
vDaten2 = (prev => function(){
  let h = prev(); if(!NATIVE) return h;
  return h + `<div class="card mt"><h3>Monatliche Sicherung</h3>
    <p class="small muted">Einmal pro Monat legt die App eine verschlüsselte Sicherung im Handy ab (Dokumente › Finanzen, die letzten 24 Monate).${D.snapYm ? ' Letzte: ' + esc(D.snapYm) + '.' : ''}</p>
    <div id="monlist" class="small muted">Wird geladen …</div>
    <div class="row" style="margin-top:8px"><button class="btn sm" data-act="monnow">Jetzt sichern</button></div></div>`;
})(vDaten2);
render = (prev => function(){
  prev.apply(this, arguments);
  const el = $('#monlist'); if(!el || el.dataset.done) return; el.dataset.done = '1';
  monthList().then(l => { el.innerHTML = l.length ? l.map(n => `<div class="li"><span class="sp">${esc(n.slice(9,16))}</span><button class="btn sm" data-act="monrest" data-n="${esc(n)}">Wiederherstellen</button></div>`).join('') : 'Noch keine Sicherung.'; });
})(render);
document.addEventListener('click', async e=>{
  const a = e.target.closest('[data-act="monnow"],[data-act="monrest"]'); if(!a) return; e.stopPropagation(); e.preventDefault();
  if(a.dataset.act === 'monnow'){ try{ await monthSnap(true); toastMsg('Gesichert'); render(); }catch(err){ alert('Sichern nicht möglich: ' + (err.message || err)); } }
  else monthRestore(a.dataset.n);
}, true);
unlock = (prev => async function(pin){ await prev(pin); setTimeout(()=>monthSnap(false).catch(()=>{}), 4000); })(unlock);
