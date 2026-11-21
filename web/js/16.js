/* =====================================================================
   24. VERSION 1.6.0 – GERÄTE-SYNC (VERSCHLÜSSELT IN DEINEM PRIVATEN GITHUB-REPO), FINGERABDRUCK ANBIETEN
   Ablage: eine einzige Datei «finanzen.enc.json» in einem PRIVATEN Repository.
   Inhalt: gzip + AES-256-GCM mit einem zufälligen Schlüssel, der nur auf deinen Geräten liegt (im Verbindungscode).
   GitHub (und jeder andere) sieht nur unlesbare Daten. Der Zugangs-Token darf nur dieses eine Repo lesen/schreiben.
   ===================================================================== */
var GH_FILE = 'finanzen.enc.json', GH_PREFIX = 'gh1.';
var ghOn = () => typeof SYNCCODE==='string' && SYNCCODE.startsWith(GH_PREFIX);
function ghParse(code){
  const s = String(code||'').trim().replace(/\s+/g,'');
  if(!s.startsWith(GH_PREFIX)) throw new Error('Das ist kein Verbindungscode dieser App.');
  let o; try{ o = JSON.parse(new TextDecoder().decode(unb64u(s.slice(GH_PREFIX.length)))); }catch(e){ throw new Error('Der Verbindungscode ist unvollständig. Bitte ganz kopieren.'); }
  if(!/^[\w.-]+\/[\w.-]+$/.test(o.r||'') || !o.t || !o.k) throw new Error('Der Verbindungscode ist unvollständig.');
  return o;
}
var ghMake = (r,t,k) => GH_PREFIX + b64u(new TextEncoder().encode(JSON.stringify({r,t,k})));
async function ghKey(k){ return crypto.subtle.importKey('raw', unb64u(k), 'AES-GCM', false, ['encrypt','decrypt']); }
async function gz(bytes, dir){ const s = new Blob([bytes]).stream().pipeThrough(dir==='c' ? new CompressionStream('gzip') : new DecompressionStream('gzip')); return new Uint8Array(await new Response(s).arrayBuffer()); }
async function ghSeal(key, obj){
  const iv = crypto.getRandomValues(new Uint8Array(12)), pt = await gz(new TextEncoder().encode(JSON.stringify(obj)), 'c');
  const ct = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, pt));
  return {iv:b64(iv), ct:b64(ct)};
}
async function ghOpen(key, blob){ const pt = await crypto.subtle.decrypt({name:'AES-GCM', iv:unb64(blob.iv)}, key, unb64(blob.ct)); return JSON.parse(new TextDecoder().decode(await gz(new Uint8Array(pt), 'd'))); }
var b64big = u8 => { let s=''; for(let i=0;i<u8.length;i+=0x8000) s += String.fromCharCode(...u8.subarray(i,i+0x8000)); return btoa(s); };
async function ghReq(o, path, opt={}){
  let r;
  try{ r = await fetch(`https://api.github.com/repos/${o.r}${path?"/"+path:""}`, {...opt, cache:'no-store', credentials:'omit', referrerPolicy:'no-referrer',
      headers:{Authorization:'Bearer '+o.t, 'X-GitHub-Api-Version':'2022-11-28', Accept:'application/vnd.github+json', ...(opt.headers||{})}}); }
  catch(e){ throw new Error('Keine Verbindung zu GitHub. Ist das Gerät online?'); }
  if(r.status===401) throw new Error('GitHub lehnt den Zugangs-Token ab (abgelaufen oder falsch).');
  if(r.status===403) throw new Error('Der Token darf dieses Repository nicht lesen/schreiben (Berechtigung «Contents: Read and write» fehlt?).');
  return r;
}
async function ghRead(o, key){
  const m = await ghReq(o, 'contents/'+GH_FILE);
  if(m.status===404) return {sha:null, rev:0};
  if(!m.ok) throw new Error('GitHub antwortet mit Fehler '+m.status+'.');
  const meta = await m.json();
  const raw = await ghReq(o, 'contents/'+GH_FILE, {headers:{Accept:'application/vnd.github.raw+json'}});
  if(!raw.ok) throw new Error('Daten konnten nicht geladen werden (Fehler '+raw.status+').');
  const f = await raw.json();
  return {sha:meta.sha, rev:f.rev||0, at:f.at, data: key ? await ghOpen(key, f.data) : null, file:f};
}
async function ghWrite(o, key, sha, rev, obj){
  const f = {v:1, rev, at:new Date().toISOString(), data: await ghSeal(key, obj)};
  const body = {message:`Daten (verschlüsselt) · Stand ${rev}`, content: b64big(new TextEncoder().encode(JSON.stringify(f)))};
  if(sha) body.sha = sha;
  const r = await ghReq(o, 'contents/'+GH_FILE, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
  if(r.status===409 || r.status===422) return null;          // jemand war schneller → neu lesen und zusammenführen
  if(!r.ok) throw new Error('Speichern bei GitHub fehlgeschlagen (Fehler '+r.status+').');
  return (await r.json()).content?.sha || true;
}
var GHBUSY = false, GHT = null;
async function ghSync(opt={}){
  if(!D || !ghOn() || GHBUSY) return; GHBUSY = true;
  const say = (t,c='') => { const el=$('#ghstatus'); if(el){ el.textContent=t; el.className='small '+c; } };
  if(opt.manual) say('Synchronisiere …');
  try{
    const o = ghParse(SYNCCODE), key = await ghKey(o.k);
    for(let attempt=0; attempt<3; attempt++){
      const rem = await ghRead(o, key);
      let changed = false;
      if(rem.rev > (D.sync?.rev||0) && rem.data){ D = mergeData(D, rem.data); D.sync = {...(D.sync||{}), rev:rem.rev}; changed = true; }
      if(rem.sha && !D.sync?.dirty && rem.rev===(D.sync?.rev||0)){ D.sync = {...D.sync, at:new Date().toISOString(), err:null}; if(changed) S.ghPulled = true; break; }
      const ok = await ghWrite(o, key, rem.sha, rem.rev+1, syncPayload(D));
      if(!ok) continue;
      D.sync = {rev:rem.rev+1, at:new Date().toISOString(), dirty:false, err:null}; break;
    }
    S.noDirty=true; await save(); S.noDirty=false; if(opt.manual) say('Synchronisiert ✓','pos');
    if(S.ghPulled || opt.manual){ S.ghPulled = false; calc(); safeRender(); }
  }catch(e){
    D.sync = {...(D.sync||{}), err: e.message || String(e)}; S.noDirty=true; save(); S.noDirty=false; say(D.sync.err,'neg');
    if(opt.manual) safeRender();
  }finally{ GHBUSY = false; }
}
// nach jeder Änderung (4 s warten), beim Öffnen und beim Zurückkehren in die App
syncSoon = function(){ if(ghOn()){ clearTimeout(GHT); GHT = setTimeout(()=>ghSync(), 4000); } };
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible' && D && ghOn()) ghSync(); });
var _render160 = render;
render = function(){ _render160(); if(D && !S.locked && ghOn() && !S.ghFirst){ S.ghFirst = true; setTimeout(()=>ghSync(), 800); } };
var _lock160 = lock;
lock = function(){ S.ghFirst = false; _lock160(); };

/* ---------- Einrichten, Verbinden, Anzeigen ---------- */
async function ghCheckRepo(r, t){
  const res = await ghReq({r, t}, '');
  if(res.status===404) throw new Error('Repository nicht gefunden. Name prüfen (Benutzer/Name) und ob der Token Zugriff darauf hat.');
  if(!res.ok) throw new Error('GitHub antwortet mit Fehler '+res.status+'.');
  const j = await res.json();
  if(!j.private) throw new Error('Das Repository ist ÖFFENTLICH. Für deine Daten nur ein privates Repository verwenden.');
  if(j.permissions && !j.permissions.push) throw new Error('Der Token darf nicht schreiben. Bei «Contents» «Read and write» wählen.');
  return j;
}
function ghSetupDialog(){
  dialog(`<h3>Geräte-Sync einrichten</h3>
    <p class="small muted" style="margin-top:-8px">Deine Daten werden verschlüsselt in einem <b>privaten</b> GitHub-Repository abgelegt. Der Schlüssel bleibt auf deinen Geräten.</p>
    <label class="f">Privates Repository (Benutzer/Name)<input id="ghr" value="niv4563/finanzen-daten" autocomplete="off" spellcheck="false"></label>
    <label class="f">Zugangs-Token (fine-grained)<input id="ght" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…"></label>
    <p class="small neg" id="gherr"></p>${acts(true)}`,
  ()=>{ (async()=>{ const r=val('ghr').trim(), t=wbClean(val('ght')), e=$('#gherr');
      try{ e.textContent='Prüfe Zugriff …'; await ghCheckRepo(r, t);
        const ex = await ghRead({r,t}, null);
        if(ex.sha){ e.textContent='In diesem Repository liegen schon Daten. Nimm auf diesem Gerät «Mit Verbindungscode verbinden» oder ein leeres Repository.'; return; }
        const k = b64u(crypto.getRandomValues(new Uint8Array(32)));
        SYNCCODE = ghMake(r, t, k); D.sync = {rev:0, dirty:true}; $('#dlg').close();
        await ghSync({manual:true}); await save(); render(); ghShowCode(true);
      }catch(err){ e.textContent = err.message; } })(); return false; });
}
function ghShowCode(first){
  dialog(`<h3>Verbindungscode</h3>
    <p class="small muted" style="margin-top:-8px">${first?'Fertig – dieses Gerät synchronisiert jetzt. ':''}Mit diesem Code verbindest du weitere Geräte (PC, Tablet). Er ist der Schlüssel zu deinen Daten: <b>wie ein Passwort behandeln</b>, z. B. im Passwort-Manager ablegen – nicht per Mail oder Chat verschicken.</p>
    <textarea class="in" id="ghc" readonly style="width:100%;height:110px;font-family:ui-monospace,monospace;font-size:12px;word-break:break-all">${esc(SYNCCODE)}</textarea>
    <div class="acts"><button class="btn" data-dlg="copy">Kopieren</button><button class="btn pri" data-dlg="cancel">Fertig</button></div>`,
  k=>{ if(k==='copy'){ navigator.clipboard?.writeText(SYNCCODE).catch(()=>{}); $('#ghc').select(); return false; } });
}
function ghJoinDialog(){
  dialog(`<h3>Mit Verbindungscode verbinden</h3>
    <p class="small muted" style="margin-top:-8px">Die Daten auf <b>diesem</b> Gerät werden durch deine synchronisierten Daten ersetzt.</p>
    <label class="f">Verbindungscode<textarea id="ghj" class="in" style="width:100%;height:110px;font-family:ui-monospace,monospace;font-size:12px"></textarea></label>
    <p class="small neg" id="gherr"></p>${acts(true)}`,
  ()=>{ (async()=>{ const e=$('#gherr');
      try{ const code=$('#ghj').value, o=ghParse(code); e.textContent='Lade Daten …';
        await ghCheckRepo(o.r, o.t);
        const rem = await ghRead(o, await ghKey(o.k));
        if(!rem.sha) throw new Error('In diesem Repository liegen noch keine Daten.');
        D = migrate(rem.data); D.sync = {rev:rem.rev, at:new Date().toISOString(), dirty:false}; SYNCCODE = code.trim().replace(/\s+/g,'');
        S.noDirty=true; await save(); S.noDirty=false; $('#dlg').close(); S.view='start'; render();
        if(!CK) setTimeout(()=>pinDialog('set'), 300);
        else alert('Verbunden. Dieses Gerät holt beim Öffnen jetzt immer den neuesten Stand.');
      }catch(err){ e.textContent = err.name==='OperationError' ? 'Der Code passt nicht zu den Daten.' : err.message; } })(); return false; });
}
syncCard = function(){
  const s = D.sync||{}, on = ghOn(), o = on ? (()=>{ try{ return ghParse(SYNCCODE); }catch(e){ return {}; } })() : {};
  return `<div class="card"><h3>Geräte-Sync ${on?'<span class="tag g">aktiv</span>':''}</h3>
    <p class="small muted">Handy, Tablet und PC haben immer den gleichen Stand: Beim Öffnen holt die App die neuesten Daten, Änderungen werden nach ein paar Sekunden gespeichert. Abgelegt wird nur eine verschlüsselte Datei in deinem privaten GitHub-Repository.</p>
    ${on ? `<p class="small">Repository: <b>${esc(o.r||'')}</b></p>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sm pri" data-act="ghsync">Jetzt synchronisieren</button><button class="btn sm" data-act="ghcode">Verbindungscode anzeigen</button><button class="btn sm danger" data-act="ghoff">Sync beenden</button></div>
      <p class="small ${s.err?'neg':'muted'}" id="ghstatus" style="margin-bottom:0">${s.err?esc(s.err):s.at?'Zuletzt: '+new Date(s.at).toLocaleString('de-CH'):''}</p>`
    : `<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sm pri" data-act="ghsetup">Einrichten (erstes Gerät)</button><button class="btn sm" data-act="ghjoin">Mit Verbindungscode verbinden</button></div>
      <details class="small mt"><summary class="muted">Was brauche ich?</summary><ol style="padding-left:18px">
      <li>Auf github.com ein neues Repository <b>finanzen-daten</b> anlegen – Sichtbarkeit <b>Private</b>.</li>
      <li>Einstellungen → Developer settings → Personal access tokens → <b>Fine-grained tokens</b> → Generate: Repository access «Only select repositories» → finanzen-daten; Permissions → Repository → <b>Contents: Read and write</b>.</li>
      <li>Token kopieren und hier bei «Einrichten» einfügen.</li></ol></details>`}
  </div>`;
};
var _renderWelcome160 = renderWelcome;
renderWelcome = function(){
  _renderWelcome160();
  $('#main .welcome')?.insertAdjacentHTML('beforeend', `<div class="card"><h3>Schon auf einem anderen Gerät?</h3><p class="small muted">Mit deinem Verbindungscode holst du deine verschlüsselten Daten auf dieses Gerät.</p><button class="btn pri" data-act="ghjoin">Mit Verbindungscode verbinden</button></div>`);
};
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act]'); if(!a) return; const k = a.dataset.act;
  const H = {
    ghsetup: ()=>ghSetupDialog(),
    ghjoin: ()=>ghJoinDialog(),
    ghsync: ()=>ghSync({manual:true}),
    ghcode: ()=>ghShowCode(false),
    ghoff: ()=>{ if(confirm('Geräte-Sync auf diesem Gerät beenden? Deine Daten bleiben hier und in GitHub erhalten.')){ SYNCCODE = null; D.sync = null; save(); render(); } },
  };
  if(H[k]){ e.stopPropagation(); H[k](); }
}, true);

/* ---------- Fingerabdruck nach dem Entsperren mit PIN anbieten ---------- */
var _unlock160 = unlock;
unlock = async function(pin){
  await _unlock160(pin);
  if(!NATIVE || bioOn() || localStorage.getItem(KEY+'.bioask')==='nein' || S.bioOffered) return;
  S.bioOffered = true;
  let st; try{ st = await bioPlug().status(); }catch(e){ return; }
  if(!st?.available) return;
  setTimeout(()=>dialog(`<h3>${ICON.finger} Mit Fingerabdruck öffnen?</h3><p class="small muted">Künftig reicht dein Finger statt der PIN. Die PIN wird dafür im Sicherheitschip des Handys verschlüsselt.</p>
    <div class="acts"><button class="btn" data-dlg="no">Nicht mehr fragen</button><span class="sp"></span><button class="btn" data-dlg="cancel">Später</button><button class="btn pri" data-dlg="yes">Einschalten</button></div>`,
    k=>{ if(k==='no'){ localStorage.setItem(KEY+'.bioask','nein'); return; }
      if(k==='yes') (async()=>{ try{ const r = await bioPlug().enable({secret:bioEnc(pin)}); localStorage.setItem(BIO_KEY, r.data); render(); alert('Fertig. Ab jetzt öffnest du die App mit deinem Fingerabdruck.'); }
        catch(e){ if(e?.code!=='CANCELED') alert('Fingerabdruck konnte nicht eingerichtet werden: '+(e?.message||e)+(e?.code?' ('+e.code+')':'')); } })(); }), 400);
};
