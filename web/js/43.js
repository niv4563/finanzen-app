/* =====================================================================
   51. VERSION 1.29.0 – WEB MIT QR-CODE ANMELDEN, DEN GANZEN TAG VERBUNDEN
   • Handy: Einstellungen → Geräte-Sync → «Web anmelden (QR)» zeigt einen QR-Code (gilt bis 23:59).
   • Web: «Mit Handy-QR anmelden» öffnet die Kamera des PCs/Laptops, liest den Code – fertig.
     Kein Verbindungscode abtippen, keine PIN: Die Web-Version bleibt bis Mitternacht verbunden.
   • Um Mitternacht meldet sich die Web-Version selbst ab und löscht ihre Kopie der Daten im Browser.
   • Alles bleibt Ende-zu-Ende verschlüsselt; der QR-Code geht nie über das Internet.
   ===================================================================== */
var DAY_KEY = KEY + '.day', QR_PREFIX = 'fq1.';
var dayEnd = () => { const d = new Date(); d.setHours(23,59,59,0); return d.toISOString().replace(/\.\d+Z$/,'Z'); };
function dayGet(){ try{ const o = JSON.parse(localStorage.getItem(DAY_KEY)||'null'); return o && o.p && o.until && new Date(o.until) > new Date() ? o : null; }catch(e){ return null; } }
function dayEndNow(){                                            // Tag vorbei: abmelden und Kopie im Browser löschen
  if(NATIVE) return; const had = localStorage.getItem(DAY_KEY); if(!had) return;
  try{ if(JSON.parse(had).until && new Date(JSON.parse(had).until) > new Date()) return; }catch(e){}
  localStorage.removeItem(DAY_KEY); localStorage.removeItem(ENC_KEY); localStorage.removeItem(KEY); localStorage.removeItem(KEY+'.sync');
  try{ lock(); }catch(e){} D = null; S.locked = false; render();
}

/* ---------- Handy: QR-Code zeigen ---------- */
async function webQrDialog(){
  if(!ghOn()){ alert('Zuerst den Geräte-Sync einrichten (Einstellungen → Daten & Sicherheit → Geräte-Sync).'); return; }
  try{ await bkLoadScript('vendor/qrcode.js'); }catch(e){ alert(e.message); return; }
  const until = dayEnd(), q = window.qrcode(0, 'M'); q.addData(QR_PREFIX + until + '.' + SYNCCODE); q.make();
  dialog(`<h3>Web anmelden</h3>
    <p class="small muted" style="margin-top:-8px">Öffne die Web-Version am PC, klicke «Mit Handy-QR anmelden» und halte diesen Code vor die Kamera.</p>
    <div class="qrbox">${q.createSvgTag({cellSize:5, margin:4, scalable:true})}</div>
    <p class="small muted">Gültig heute bis 23:59. Danach meldet sich die Web-Version selbst ab. Zeig den Code niemandem sonst.</p>
    <div class="acts"><button class="btn pri" data-dlg="cancel">Fertig</button></div>`, ()=>{});
}
syncCard = (prev => function(){ let h = prev(); if(ghOn()) h = h.replace('<button class="btn sm" data-act="ghcode">', '<button class="btn sm pri" data-act="webqr">Web anmelden (QR)</button><button class="btn sm" data-act="ghcode">'); return h; })(syncCard);
document.addEventListener('click', e=>{ const a = e.target.closest('[data-act="webqr"]'); if(!a) return; e.stopPropagation(); e.preventDefault(); webQrDialog(); }, true);
// Statuszeile «Web verbinden»: bei aktivem Sync direkt der QR-Code
document.addEventListener('click', e=>{ const a = e.target.closest('.sstat [data-act="ghsetup"]'); if(!a || !ghOn()) return; e.stopPropagation(); e.preventDefault(); webQrDialog(); }, true);

/* ---------- Web: QR mit der Kamera lesen ---------- */
async function webQrScan(){
  if(!navigator.mediaDevices?.getUserMedia){ alert('Dieser Browser kann die Kamera nicht verwenden. Bitte Chrome, Edge oder Safari nehmen.'); return; }
  try{ await bkLoadScript('vendor/jsQR.js'); }catch(e){ alert(e.message); return; }
  dialog(`<h3>Mit Handy-QR anmelden</h3>
    <p class="small muted" style="margin-top:-8px">Auf dem Handy: Einstellungen → Geräte-Sync → «Web anmelden (QR)». Den Code vor die Kamera halten.</p>
    <video id="qrv" playsinline muted style="width:100%;border-radius:12px;background:#000;max-height:50vh"></video>
    <p class="small" id="qrs">Kamera wird gestartet …</p>
    <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button></div>`, ()=>{});
  let stream = null, stop = false;
  const end = () => { stop = true; stream?.getTracks().forEach(t=>t.stop()); };
  $('#dlg').addEventListener('close', end, {once:true});
  try{ stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user', width:{ideal:1280}}, audio:false}); }
  catch(e){ $('#qrs').textContent = 'Keine Kamera erlaubt oder vorhanden. Im Browser oben die Kamera erlauben, oder den Verbindungscode einfügen.'; return; }
  const v = $('#qrv'); v.srcObject = stream; await v.play().catch(()=>{}); $('#qrs').textContent = 'Suche QR-Code …';
  const c = document.createElement('canvas'), g = c.getContext('2d', {willReadFrequently:true});
  const tick = async () => {
    if(stop) return;
    if(v.videoWidth){ c.width = v.videoWidth; c.height = v.videoHeight; g.drawImage(v, 0, 0);
      const r = window.jsQR(g.getImageData(0,0,c.width,c.height).data, c.width, c.height, {inversionAttempts:'dontInvert'});
      if(r?.data?.startsWith(QR_PREFIX)){ end(); $('#qrs').textContent = 'Erkannt – lade deine Daten …'; await webQrLogin(r.data); return; } }
    requestAnimationFrame(tick);
  };
  tick();
}
async function webQrLogin(text){
  const s = $('#qrs');
  try{
    const rest = text.slice(QR_PREFIX.length), i = rest.indexOf('.'), until = rest.slice(0, i), code = rest.slice(i+1).trim();
    if(!(new Date(until) > new Date())) throw new Error('Dieser QR-Code ist abgelaufen. Auf dem Handy neu anzeigen.');
    const o = ghParse(code); await ghCheckRepo(o.r, o.t);
    const rem = await ghRead(o, await ghKey(o.k)); if(!rem.sha) throw new Error('Im Sync liegen noch keine Daten.');
    D = migrate(rem.data); D.sync = {rev:rem.rev, at:new Date().toISOString(), dirty:false}; SYNCCODE = code;
    const p = b64u(crypto.getRandomValues(new Uint8Array(24)));             // zufälliger Tages-Schlüssel statt PIN
    S.noDirty = true; await setPin(p); S.noDirty = false;
    localStorage.setItem(DAY_KEY, JSON.stringify({p, until}));
    S.locked = false; $('#dlg').open && $('#dlg').close(); S.view = 'start'; render();
    toastMsg('Verbunden bis heute 23:59');
  }catch(err){ if(s) s.textContent = err.name==='OperationError' ? 'Der Code passt nicht zu den Daten.' : (err.message||String(err)); }
}
// Knöpfe im Web: Startbildschirm, gesperrter Bildschirm und «Mit Verbindungscode verbinden»
var _render1290 = render;
render = function(){
  _render1290();
  if(NATIVE) return;
  const w = $('#main .welcome');
  if(w && !$('#webqrbtn')) w.insertAdjacentHTML('beforeend', `<div class="card" id="webqrbtn"><h3>Mit dem Handy anmelden</h3><p class="small muted">QR-Code vom Handy scannen – ohne Code und ohne PIN, verbunden bis Mitternacht.</p><button class="btn pri" data-act="webqrscan">Mit Handy-QR anmelden</button></div>`);
};
document.addEventListener('click', e=>{ const a = e.target.closest('[data-act="webqrscan"]'); if(!a) return; e.stopPropagation(); e.preventDefault(); webQrScan(); }, true);
ghJoinDialog = (prev => function(){ prev(); if(!NATIVE) $('#dlg h3')?.insertAdjacentHTML('afterend', `<button class="btn pri wide" type="button" data-act="webqrscan" style="margin:0 0 10px">Stattdessen QR-Code vom Handy scannen</button>`); })(ghJoinDialog);

// Tages-Anmeldung: automatisch entsperren, um Mitternacht abmelden
async function dayAutoUnlock(){
  if(NATIVE || !S.locked || CK) return; const d = dayGet(); if(!d){ dayEndNow(); return; }
  try{ await unlock(d.p); render(); }catch(e){}
}
lock = (prev => function(){ prev(); if(!NATIVE && dayGet()) setTimeout(dayAutoUnlock, 100); })(lock);
if(!NATIVE){ setTimeout(dayAutoUnlock, 50); setInterval(()=>{ dayEndNow(); if(S.locked && dayGet()) dayAutoUnlock(); }, 15000); }
