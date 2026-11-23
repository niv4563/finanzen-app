/* =====================================================================
   52. VERSION 1.30.0 – WEB ZEIGT DEN QR-CODE, DAS HANDY SCANNT IHN
   • Web: «Mit Handy anmelden» zeigt einen QR-Code.
   • Handy: Einstellungen → Geräte-Sync → «Web anmelden (QR scannen)» → Kamera auf den Bildschirm halten → bestätigen.
   • Ablauf ohne eigenen Server: Der QR-Code enthält einen Einmal-Schlüssel (ECDH P-256) des Browsers.
     Das Handy verschlüsselt den Verbindungscode mit diesem Schlüssel (AES-GCM) und legt nur den
     verschlüsselten Block bei einer Durchreiche (ntfy.sh) ab. Nur genau dieser Browser kann ihn öffnen;
     der Einmal-Schlüssel existiert nur im Arbeitsspeicher und verschwindet danach.
   • Gültig bis 23:59 wie bisher (Tages-Anmeldung aus 1.29).
   ===================================================================== */
var PAIR_PREFIX = 'fq2.', PAIR_REPLY = 'fq2r.', PAIR_RELAY = 'https://ntfy.sh/';
const pairInfo = new TextEncoder().encode('finanzen-web-anmeldung-v2');
async function pairKey(priv, pubRaw, topic){
  const pub = await crypto.subtle.importKey('raw', pubRaw, {name:'ECDH', namedCurve:'P-256'}, false, []);
  const bits = await crypto.subtle.deriveBits({name:'ECDH', public:pub}, priv, 256);
  const hk = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'HKDF', hash:'SHA-256', salt:new TextEncoder().encode(topic), info:pairInfo}, hk, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
}
const pairTopicOk = t => /^fa[A-Za-z0-9_-]{24,40}$/.test(t);
// QR-Inhalt als Internet-Adresse: so öffnet auch die gewöhnliche Kamera die Finanzen-App
const pairUrl = payload => 'https://niv4563.github.io/finanzen-app/#v=' + payload;
const pairExtract = t => (String(t||'').match(/fq2\.fa[A-Za-z0-9_-]{24,40}\.[A-Za-z0-9_-]{80,100}/) || [null])[0];
async function pairCode(pubRaw){                                 // 4 Zeichen zum Vergleichen: am PC und im Fingerabdruck-Fenster gleich
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', pubRaw)), A = 'ACDEFGHJKLMNPQRTUVWXY34679';
  return Array.from(h.slice(0,4), b => A[b % A.length]).join('');
}

/* ---------- Web: Daten direkt vom Handy (ohne Geräte-Abgleich) ---------- */
async function webDataLogin(data, until){
  if(!(new Date(until) > new Date())) throw new Error('Dieser Code ist abgelaufen. Bitte neu anzeigen.');
  D = migrate(data); D.sync = null; SYNCCODE = null;
  const p = b64u(crypto.getRandomValues(new Uint8Array(24)));
  S.noDirty = true; await setPin(p); S.noDirty = false;
  localStorage.setItem(DAY_KEY, JSON.stringify({p, until}));
  S.locked = false; $('#dlg').open && $('#dlg').close(); S.view = 'start'; render();
  toastMsg('Verbunden bis heute 23:59');
}

/* ---------- Web: QR-Code zeigen und auf das Handy warten ---------- */
async function webPairShow(){
  try{ await bkLoadScript('vendor/qrcode.js'); }catch(e){ alert(e.message); return; }
  let stop = false, timer = null;
  const start = async () => {
    const kp = await crypto.subtle.generateKey({name:'ECDH', namedCurve:'P-256'}, false, ['deriveBits']);
    const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
    const topic = 'fa' + b64u(crypto.getRandomValues(new Uint8Array(21)));
    const q = window.qrcode(0, 'M'); q.addData(pairUrl(PAIR_PREFIX + topic + '.' + b64u(pub))); q.make();
    const box = $('#pairqr'); if(!box) return; box.innerHTML = q.createSvgTag({cellSize:5, margin:4, scalable:true});
    $('#qrs').textContent = 'Warte auf das Handy …'; const pc = $('#paircode'); if(pc) pc.textContent = await pairCode(pub);
    const t0 = Date.now();
    const poll = async () => {
      if(stop) return;
      if(Date.now() - t0 > 5*60*1000){ $('#qrs').textContent = 'Neuer Code …'; return start(); }
      try{
        const r = await fetch(PAIR_RELAY + topic + '/json?poll=1&since=10m', {cache:'no-store', credentials:'omit', referrerPolicy:'no-referrer'});
        if(r.ok) for(const line of (await r.text()).split('\n')){
          let m; try{ m = JSON.parse(line); }catch(e){ continue; }
          if(m.event !== 'message' || !String(m.message||'').startsWith(PAIR_REPLY)) continue;
          const [ph, iv, ct] = m.message.slice(PAIR_REPLY.length).split('.');
          try{
            const key = await pairKey(kp.privateKey, unb64u(ph), topic);
            const pt = await crypto.subtle.decrypt({name:'AES-GCM', iv:unb64u(iv), additionalData:new TextEncoder().encode(topic)}, key, unb64u(ct));
            const o = JSON.parse(new TextDecoder().decode(pt));
            if(!o.u || !(o.c || o.a)) continue;
            stop = true; $('#qrs').textContent = 'Erkannt – lade deine Daten …'; box.style.opacity = '.3';
            if(o.c){ await webQrLogin(QR_PREFIX + o.u + '.' + o.c); return; }
            // ohne Geräte-Abgleich: das Handy schickt die Daten selbst (verschlüsselt, als Anhang)
            try{
              const url = String(m.attachment?.url||''); if(!url.startsWith(PAIR_RELAY + 'file/')) throw new Error('Die Daten vom Handy fehlen. Bitte nochmals scannen.');
              const enc = await (await fetch(url, {cache:'no-store', credentials:'omit', referrerPolicy:'no-referrer'})).text();
              const raw = await crypto.subtle.decrypt({name:'AES-GCM', iv:unb64u(o.aiv), additionalData:new TextEncoder().encode(topic + '.d')}, key, unb64u(enc.trim()));
              const data = JSON.parse(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
              await webDataLogin(data, o.u);
            }catch(err){ $('#qrs').textContent = err.message || String(err); }
            return;
          }catch(e){ /* fremde oder kaputte Nachricht: ignorieren */ }
        }
      }catch(e){ $('#qrs').textContent = 'Keine Verbindung – versuche es weiter …'; }
      timer = setTimeout(poll, 2000);
    };
    poll();
  };
  dialog(`<h3>Mit Handy anmelden</h3>
    <p class="small muted" style="margin-top:-8px">Auf dem Handy: Einstellungen → Daten &amp; Sicherheit → «PC anmelden (QR-Code scannen)» und die Kamera auf diesen Code halten.</p>
    <div class="qrbox" id="pairqr"></div>
    <p class="small" style="text-align:center">Prüfzeichen: <b id="paircode" style="font-size:18px;letter-spacing:.15em">····</b><br><span class="muted">Das Handy zeigt beim Fingerabdruck dieselben Zeichen.</span></p>
    <p class="small" id="qrs">Code wird erstellt …</p>
    <p class="small muted">Mit der Kamera des Handys oder in der App unter Einstellungen → «PC verbinden» scannen. Danach bleibt dieser PC bis heute 23:59 verbunden.</p>
    <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button></div>`, ()=>{});
  $('#dlg').addEventListener('close', ()=>{ stop = true; clearTimeout(timer); }, {once:true});
  start().catch(e => { $('#qrs').textContent = 'Auf diesem PC geht die Anmeldung per QR-Code nicht: ' + (e.message||e); });
}

/* ---------- Handy: QR-Code am Bildschirm scannen ---------- */
async function phonePairScan(){
  if(!navigator.mediaDevices?.getUserMedia){ alert('Die Kamera ist hier nicht verfügbar.'); return; }
  try{ await bkLoadScript('vendor/jsQR.js'); }catch(e){ alert(e.message); return; }
  dialog(`<h3>PC anmelden</h3>
    <p class="small muted" style="margin-top:-8px">Am PC die Finanzen-Seite öffnen, «Mit Handy anmelden» klicken und die Kamera auf den Code halten.</p>
    <video id="qrv" playsinline muted style="width:100%;border-radius:12px;background:#000;max-height:50vh"></video>
    <p class="small" id="qrs">Kamera wird gestartet …</p>
    <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button></div>`, ()=>{});
  let stream = null, stop = false;
  const end = () => { stop = true; stream?.getTracks().forEach(t=>t.stop()); };
  $('#dlg').addEventListener('close', end, {once:true});
  try{ stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}, width:{ideal:1280}}, audio:false}); }
  catch(e){ $('#qrs').textContent = 'Die App darf die Kamera nicht verwenden. In den Android-Einstellungen → Apps → Finanzen → Berechtigungen die Kamera erlauben.'; return; }
  const v = $('#qrv'); v.srcObject = stream; await v.play().catch(()=>{}); $('#qrs').textContent = 'Suche QR-Code …';
  const c = document.createElement('canvas'), g = c.getContext('2d', {willReadFrequently:true});
  const tick = async () => {
    if(stop) return;
    if(v.videoWidth){ c.width = v.videoWidth; c.height = v.videoHeight; g.drawImage(v, 0, 0);
      const r = window.jsQR(g.getImageData(0,0,c.width,c.height).data, c.width, c.height, {inversionAttempts:'attemptBoth'});
      const pl = pairExtract(r?.data); if(pl){ end(); await phonePairSend(pl); return; } }
    requestAnimationFrame(tick);
  };
  tick();
}
async function phonePairSend(text){
  const s = $('#qrs');
  try{
    const [topic, pubS] = text.slice(PAIR_PREFIX.length).split('.');
    if(!pairTopicOk(topic || '') || !pubS) throw new Error('Das ist kein Anmelde-Code der Finanzen-App.');
    const webPub = unb64u(pubS); if(webPub.length !== 65) throw new Error('Das ist kein Anmelde-Code der Finanzen-App.');
    if(!confirm('Diesen PC bis heute 23:59 mit deinen Finanzen verbinden?\n\nNur bestätigen, wenn du den Code gerade selbst an deinem PC geöffnet hast.')){ $('#dlg').close(); return; }
    s.textContent = 'Verbinde …';
    const kp = await crypto.subtle.generateKey({name:'ECDH', namedCurve:'P-256'}, false, ['deriveBits']);
    const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
    const key = await pairKey(kp.privateKey, webPub, topic), iv = crypto.getRandomValues(new Uint8Array(12));
    const pt = new TextEncoder().encode(JSON.stringify({u: dayEnd(), c: SYNCCODE}));
    const ct = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv, additionalData:new TextEncoder().encode(topic)}, key, pt));
    const r = await fetch(PAIR_RELAY + topic, {method:'POST', body: PAIR_REPLY + b64u(pub) + '.' + b64u(iv) + '.' + b64u(ct), credentials:'omit', referrerPolicy:'no-referrer'});
    if(!r.ok) throw new Error('Senden fehlgeschlagen (' + r.status + '). Bitte nochmals scannen.');
    s.textContent = 'Fertig – der PC ist in ein paar Sekunden verbunden.';
    setTimeout(()=>{ $('#dlg').open && $('#dlg').close(); }, 1500);
    toastMsg('PC angemeldet bis 23:59');
  }catch(err){ if(s) s.textContent = err.message || String(err); }
}

/* ---------- Knöpfe ---------- */
syncCard = (prev => function(){
  let h = prev();
  if(ghOn()) h = h.replace('<button class="btn sm pri" data-act="webqr">Web anmelden (QR)</button>', '<button class="btn sm pri" data-act="webpairscan">PC anmelden (QR-Code scannen)</button>');
  return h;
})(syncCard);
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act="webpairscan"],[data-act="webpair"]'); if(!a) return;
  e.stopPropagation(); e.preventDefault();
  a.dataset.act === 'webpair' ? webPairShow() : phonePairScan();
}, true);
// Statuszeile «Web verbinden» auf dem Handy: direkt scannen
window.addEventListener('click', e=>{ const a = e.target.closest?.('.sstat [data-act="ghsetup"],.sstat [data-act="ghjoin"]'); if(!a || !NATIVE) return; e.stopPropagation(); e.preventDefault(); phonePairScan(); }, true);

var _render1300 = render;
render = function(){
  _render1300();
  if(NATIVE) return;
  const w = $('#webqrbtn');
  if(w && !w.dataset.v2){ w.dataset.v2 = '1';
    w.innerHTML = `<h3>Mit dem Handy anmelden</h3><p class="small muted">Code hier anzeigen und mit der Finanzen-App auf dem Handy scannen – ohne Code abtippen und ohne PIN, verbunden bis Mitternacht.</p><button class="btn pri" data-act="webpair">Mit Handy anmelden</button>`; }
};
ghJoinDialog = (prev => function(){
  prev();
  const b = $('#dlg [data-act="webqrscan"]');
  if(b && !NATIVE){ b.dataset.act = 'webpair'; b.textContent = 'Stattdessen mit dem Handy anmelden (QR-Code)'; }
})(ghJoinDialog);

/* ---------- Nur deutsche Begriffe in der Oberfläche ---------- */
var DE_WORDS = [
  [/Web anmelden \(QR\)/g, 'Code für PC zeigen'], [/Mit Handy-QR anmelden/g, 'Mit Handy-QR-Code anmelden'],
  [/Geräte-Sync/g, 'Geräte-Abgleich'], [/\bSync\b/g, 'Abgleich'], [/\bsynchron\b/g, 'abgeglichen'],
  [/Web-Version/g, 'PC-Version'], [/\bWeb verbinden\b/g, 'PC verbinden'], [/\bim Web\b/g, 'am PC'], [/\bWeb\b/g, 'PC'],
  [/\bBrowsers?\b/g, 'Internetprogramm'], [/\bBackups\b/g, 'Sicherungen'], [/\bBackup\b/g, 'Sicherung'],
  [/\bToken\b/g, 'Zugangsschlüssel'], [/\bRepository\b/g, 'Ablage'], [/\bScreenshots?\b/g, 'Bildschirmfotos'],
  [/\bUpdates\b/g, 'Aktualisierungen'], [/\bUpdate\b/g, 'Aktualisierung'], [/\bCashflow\b/g, 'Geldfluss'],
  [/\bLabels\b/g, 'Etiketten'], [/\bLabel\b/g, 'Etikett'], [/Finanz-Coach/g, 'Finanz-Berater'], [/\bCoach\b/g, 'Berater'],
  [/\bLogin\b/g, 'Anmeldung'], [/\bDownload\b/g, 'Herunterladen'], [/\bOnline\b/g, 'Im Internet'], [/\bonline\b/g, 'im Internet'],
];
function deWords(root){
  if(!root || !root.nodeType) return;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode: n => {
    const p = n.parentElement; if(!p || p.closest('script,style,textarea,[contenteditable="true"],.nodeutsch')) return NodeFilter.FILTER_REJECT;
    return /Sync|synchron|Web|Browser|Backup|Token|Repository|Screenshot|Update|Cashflow|Label|Coach|Login|Download|nline/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP; }});
  const list = []; if(root.nodeType === 3){ const p = root.parentElement; if(p && !p.closest('script,style,textarea,[contenteditable="true"],.nodeutsch')) list.push(root); } else while(tw.nextNode()) list.push(tw.currentNode);
  for(const n of list){ let v = n.nodeValue; for(const [a,b] of DE_WORDS) v = v.replace(a, b); if(v !== n.nodeValue) n.nodeValue = v; }
}
new MutationObserver(ms => { for(const m of ms) for(const n of m.addedNodes) if(n.nodeType === 1 || n.nodeType === 3) deWords(n); })
  .observe(document.documentElement, {childList:true, subtree:true});
document.addEventListener('DOMContentLoaded', ()=>deWords(document.body));
setTimeout(()=>deWords(document.body), 0);
