"use strict";
/* =====================================================================
   1. GRUNDLAGEN
   ===================================================================== */
const KEY = 'finanzen.v1';
const MN = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const MS = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
// Gliederung der Ausgaben. "topf" = Zuordnung zur 50/30/20-Regel
const GROUPS = {
  fix:     {n:'Fixkosten',            c:'var(--fix)',   topf:'bedarf', d:'Miete, Versicherungen, Steuern, Abos mit Vertrag'},
  leben:   {n:'Lebenshaltung',        c:'var(--leben)', topf:'bedarf', d:'Lebensmittel, Körperpflege'},
  freizeit:{n:'Freizeit & Wünsche',   c:'var(--frei)',  topf:'wunsch', d:'Ausgang, Ferien, Anschaffungen, Unvorhergesehenes'},
  schulden:{n:'Schuldenabbau',        c:'var(--sch)',   topf:'spar',   d:'Rückzahlungen von Kreditkarte und Krediten'},
  spar:    {n:'Sparen & Vorsorge',    c:'var(--spar)',  topf:'spar',   d:'Reserve, Eigenheim, Säule 3a, Investieren'},
};
const TOPF = {bedarf:{n:'Bedarf',c:'var(--fix)'}, wunsch:{n:'Wünsche',c:'var(--frei)'}, spar:{n:'Sparen & Schuldenabbau',c:'var(--spar)'}};
const NAV = [
  ['Überblick', [['home','◉','Cockpit'],['empfehlungen','✦','Empfehlungen']]],
  ['Monat & Budget', [['monat','▤','Monat'],['buchungen','≡','Buchungen & Import'],['budget','▦','Budget'],['jahr','◷','Jahreskosten']]],
  ['Vermögen', [['konten','◫','Konten & Schulden'],['ziele','◎','Ziele & Reserve'],['wuensche','★','Wünsche'],['prognose','↗','Prognose']]],
  ['Kontrolle', [['analyse','◐','Ausgaben-Analyse'],['regeln','✓','Regeln'],['abos','↻','Abos'],['daten','⚙','Daten & Backup']]],
];
const BOTTOM = [['home','◉','Cockpit'],['monat','▤','Monat'],['budget','▦','Budget'],['wuensche','★','Wünsche'],['mehr','☰','Mehr']];
const fmtN = new Intl.NumberFormat('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmt0 = new Intl.NumberFormat('de-CH',{maximumFractionDigits:0});
const chf = v => (v==null||isNaN(v)) ? '–' : fmtN.format(v);
const chf0 = v => (v==null||isNaN(v)) ? '–' : fmt0.format(v);
const pct = v => (v==null||!isFinite(v)) ? '–' : (v*100).toFixed(0)+' %';
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ymOf = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
const ymAdd = (ym,n) => { let [y,m]=ym.split('-').map(Number); m+=n; while(m>12){m-=12;y++} while(m<1){m+=12;y--} return y+'-'+String(m).padStart(2,'0'); };
const ymDiff = (a,b) => (+b.slice(0,4)-+a.slice(0,4))*12 + (+b.slice(5)-+a.slice(5));
const ymLabel = ym => MN[+ym.slice(5)-1]+' '+ym.slice(0,4);
const ymShortY = ym => MS[+ym.slice(5)-1]+' '+ym.slice(2,4);
const ymShort = ym => MS[+ym.slice(5)-1];
const uid = () => Math.random().toString(36).slice(2,10);
const TODAY = ymOf(new Date());
const todayIso = () => new Date().toISOString().slice(0,10);
const r2 = v => Math.round(v*100)/100;
const DEBT_TOL = 50;   // Restschulden unter CHF 50 gelten als getilgt
const $ = s => document.querySelector(s);

function parseNum(s){
  // erlaubt 1'200.50, 1200,50 und einfache Rechnungen wie =500+220 – ohne eval
  s = String(s??'').trim().replace(/^=/,'').replace(/['’\s]/g,'').replace(/,/g,'.');
  if(s==='') return 0;
  if(!/^[0-9+\-*/().]+$/.test(s) || s.length>60) return NaN;
  let i=0;
  const num=()=>{ const m=/^\d+(\.\d+)?|^\.\d+/.exec(s.slice(i)); if(!m) throw 0; i+=m[0].length; return parseFloat(m[0]); };
  const fac=()=>{ if(s[i]==='-'){ i++; return -fac(); } if(s[i]==='+'){ i++; return fac(); } if(s[i]==='('){ i++; const v=expr(); if(s[i]!==')') throw 0; i++; return v; } return num(); };
  const term=()=>{ let v=fac(); while(s[i]==='*'||s[i]==='/'){ const o=s[i++], w=fac(); v = o==='*' ? v*w : v/w; } return v; };
  const expr=()=>{ let v=term(); while(s[i]==='+'||s[i]==='-'){ const o=s[i++], w=term(); v = o==='+' ? v+w : v-w; } return v; };
  try{ const v=expr(); if(i!==s.length) return NaN; return isFinite(v) ? r2(v) : NaN; }catch(e){ return NaN; }
}

/* =====================================================================
   2. DATEN (laden, speichern, Migration)
   ===================================================================== */
let D = null;
let S = {view:'home', ym:TODAY, year:TODAY.slice(0,4)};
const DEF_SETTINGS = {autoSync:true,autoLock:5,fix:50,pers:30,spar:20,max3a:7258,notMonate:3,aboLimit:150,kkGuthabenMax:500,puffer:500,wartefrist:30};
/* ---- Sicherheit: PIN, Verschlüsselung (AES-GCM 256, Schlüssel per PBKDF2 aus der PIN) ---- */
const ENC_KEY = KEY+'.enc', TOK_KEY = KEY+'.walletToken', FAIL_KEY = KEY+'.fails';
let CK = null, SALT = null, TOKEN = null, SAVEQ = Promise.resolve();
const te = new TextEncoder(), td = new TextDecoder();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c=>c.charCodeAt(0));
async function deriveKey(pin, salt){
  const base = await crypto.subtle.importKey('raw', te.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:310000, hash:'SHA-256'}, base, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
}
async function encryptObj(key, salt, obj){ const iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, te.encode(JSON.stringify(obj))); return {v:1, salt:b64(salt), iv:b64(iv), ct:b64(ct)}; }
async function decryptObj(key, blob){ const pt=await crypto.subtle.decrypt({name:'AES-GCM', iv:unb64(blob.iv)}, key, unb64(blob.ct)); return JSON.parse(td.decode(pt)); }
const isLockedStore = () => !!localStorage.getItem(ENC_KEY);
// Der Wallet-Token liegt nur noch auf dem gesicherten Server (Cloudflare-Secret), nie im Browser.
localStorage.removeItem(TOK_KEY);
/* ---- Server-Modus: App läuft hinter Cloudflare Access auf deinem Worker ---- */
async function api(path, opts={}){
  const r = await fetch('/api/'+path, {...opts, credentials:'same-origin', cache:'no-store',
    headers:{'X-Requested-With':'finanzen', 'Accept':'application/json', ...(opts.headers||{})}});
  if(r.status===401 || (r.status===403 && r.headers.get('X-Finanzen-Auth')==='denied')) throw new Error('Anmeldung abgelaufen – bitte die Seite neu laden und erneut anmelden.');
  return r;
}
async function detectServer(){
  if(NATIVE || !/^https?:$/.test(location.protocol)) { S.server=null; return; }
  try{ const r=await api('status'); S.server = r.ok ? await r.json() : null; }catch(e){ S.server=null; }
}
/* ---- Android-App (Capacitor) ---- */
const NATIVE = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform==='function' && window.Capacitor.isNativePlatform());
const BUILD = Object.freeze({version:'web', channel:'web', repo:'', ...(window.APP_BUILD||{})});
const PLUG = {}; const plug = n => NATIVE ? (PLUG[n] ??= window.Capacitor.registerPlugin(n)) : null;
const lockAfterMs = () => (NATIVE ? Math.min(1, D?.settings.autoLock||5) : (D?.settings.autoLock||5)) * 60000;
function vcmp(a,b){ const p=x=>String(x).split('.').map(n=>parseInt(n,10)||0); const A=p(a), B=p(b); for(let i=0;i<3;i++){ if((A[i]||0)!==(B[i]||0)) return (A[i]||0)-(B[i]||0); } return 0; }
// Sicherheitskopie des gespeicherten Stands, bevor eine neue App-Version Daten umbaut
function preUpdateSnapshot(){
  if(BUILD.version==='web') return;
  const prev = localStorage.getItem(KEY+'.appver');
  if(prev && prev !== BUILD.version){
    const blob = localStorage.getItem(ENC_KEY) || localStorage.getItem(KEY);
    if(blob) localStorage.setItem(KEY+'.vorUpdate', JSON.stringify({von:prev, auf:BUILD.version, at:new Date().toISOString(), enc:!!localStorage.getItem(ENC_KEY), blob}));
  }
  localStorage.setItem(KEY+'.appver', BUILD.version);
}
function restorePreUpdate(){
  const snap = JSON.parse(localStorage.getItem(KEY+'.vorUpdate')||'null'); if(!snap) return;
  if(!confirm(`Stand vor dem Update auf ${snap.auf} (gespeichert ${new Date(snap.at).toLocaleString('de-CH')}) wiederherstellen? Änderungen seither gehen verloren.`)) return;
  if(snap.enc){ localStorage.setItem(ENC_KEY, snap.blob); localStorage.removeItem(KEY); } else { localStorage.setItem(KEY, snap.blob); localStorage.removeItem(ENC_KEY); }
  location.reload();
}
// Update-Prüfung: nur Kanal «direct» (Play-Store-Version wird vom Play Store aktualisiert)
const UPD_KEY = 'finanzen.update';
async function checkUpdate(manual){
  if(!NATIVE || BUILD.channel!=='direct' || !/^[\w.-]+\/[\w.-]+$/.test(BUILD.repo)) return;
  const st = JSON.parse(localStorage.getItem(UPD_KEY)||'{}');
  if(!manual && Date.now()-(st.at||0) < 12*3600e3){ S.update = st.v && vcmp(st.v, BUILD.version)>0 ? st : null; return; }
  S.updBusy = true; if(manual) render();
  try{
    const r = await fetch(`https://api.github.com/repos/${BUILD.repo}/releases/latest`, {headers:{Accept:'application/vnd.github+json'}, cache:'no-store', credentials:'omit', referrerPolicy:'no-referrer'});
    if(!r.ok) throw new Error(r.status===404 ? 'Noch keine Version veröffentlicht oder Projekt nicht öffentlich.' : 'GitHub antwortet mit Fehler '+r.status+'.');
    const j = await r.json(), v = String(j.tag_name||'').replace(/^v/,'');
    const prefix = `https://github.com/${BUILD.repo}/releases/download/`;
    const apk = (j.assets||[]).find(a => /\.apk$/i.test(a.name) && String(a.browser_download_url).startsWith(prefix));   // nur Dateien aus deinem eigenen Projekt
    const res = {at:Date.now(), v, url:apk?.browser_download_url||'', notes:String(j.body||'').slice(0,2000), date:j.published_at||''};
    localStorage.setItem(UPD_KEY, JSON.stringify(res));
    S.update = apk && vcmp(v, BUILD.version)>0 ? res : null; S.updErr = null;
  }catch(e){ S.updErr = e.message || 'Keine Verbindung.'; }
  S.updBusy = false; S.updChecked = true; if(D || manual) render();
}
function updateBanner(){
  if(!S.update || S.updLater === S.update.v) return '';
  return `<div class="hint upd"><div><b>Neue Version ${esc(S.update.v)} verfügbar.</b> Deine Daten bleiben erhalten – vor dem Umbau legt die App automatisch eine Sicherheitskopie an.
    ${S.update.notes?`<details class="small" style="margin-top:4px"><summary>Was ist neu?</summary><div style="white-space:pre-wrap;margin-top:4px">${esc(S.update.notes)}</div></details>`:''}</div>
    <div class="row" style="margin-top:8px;justify-content:flex-end"><button class="btn sm" data-act="updlater">Später</button><button class="btn sm pri" data-act="doupdate">Jetzt aktualisieren</button></div></div>`;
}
function appCard(){
  if(!NATIVE) return '';
  const snap = JSON.parse(localStorage.getItem(KEY+'.vorUpdate')||'null');
  const ch = BUILD.channel==='play' ? 'Updates kommen automatisch über den Google Play Store.' :
    BUILD.channel==='direct' ? `Updates kommen aus deinem GitHub-Projekt <b>${esc(BUILD.repo)}</b>. Android installiert sie nur, wenn sie mit demselben Schlüssel signiert sind wie diese App.` : '';
  return `<div class="card mt"><h3>App & Updates</h3>
    <p class="small">Version <b>${esc(BUILD.version)}</b>${BUILD.build?` · Build ${esc(BUILD.build)}`:''}</p><p class="small muted">${ch}</p>
    ${S.updErr?`<p class="small neg">Update-Prüfung fehlgeschlagen: ${esc(S.updErr)}</p>`:S.updChecked&&!S.update&&BUILD.channel==='direct'?'<p class="small pos">Du hast die neueste Version.</p>':''}
    <div class="row">${BUILD.channel==='direct'?`<button class="btn" data-act="chkupdate" ${S.updBusy?'disabled':''}>${S.updBusy?'Suche …':'Nach Updates suchen'}</button>`:''}
    ${snap?`<button class="btn" data-act="preupd">Stand vor Update ${esc(snap.auf)} wiederherstellen</button>`:''}</div></div>`;
}
async function nativeSave(name, text){
  const FS = plug('Filesystem'), SH = plug('Share');
  const r = await FS.writeFile({path:name, data:text, directory:'CACHE', encoding:'utf8'});
  try{ await SH.share({title:name, files:[r.uri], dialogTitle:'Datei speichern oder teilen'}); }
  catch(e){ if(!/cancel/i.test(e?.message||'')) alert('Speichern nicht möglich: '+(e?.message||e)); }
  finally{ setTimeout(()=>FS.deleteFile({path:name, directory:'CACHE'}).catch(()=>{}), 120000); }   // temporäre Kopie wieder entfernen
}
function initNative(){
  if(!NATIVE) return;
  const AppP = plug('App');
  ['file','csvfile'].forEach(id=>$('#'+id)?.removeAttribute('accept'));   // Android-Dateiauswahl: Backups aus Mail/Drive haben oft keinen passenden Typ
  AppP.addListener('backButton', ()=>{
    if($('#dlg').open) $('#dlg').close();
    else if(!S.locked && D && S.view!=='home'){ S.view='home'; render(); scrollTo(0,0); }
    else AppP.minimizeApp();
  });
  AppP.addListener('pause', ()=>{ S.hiddenAt = Date.now(); if($('#dlg').open && CK) $('#dlg').close(); });
  AppP.addListener('resume', ()=>{ if(CK && D && S.hiddenAt && Date.now()-S.hiddenAt > lockAfterMs()) lock(); checkUpdate(false); });
  setTimeout(()=>checkUpdate(false), 1500);
}
function load(){
  if(isLockedStore()){ S.locked = true; D = null; return; }
  try{ D = JSON.parse(localStorage.getItem(KEY)); if(D) migrate(D); }catch(e){ D=null; }
  SYNCCODE = localStorage.getItem(KEY+'.sync');
}
function save(){
  if(!D) return SAVEQ; D.savedAt = new Date().toISOString();
  if(!S.noDirty && SYNCCODE){ D.sync = {...(D.sync||{}), dirty:true}; syncSoon(); }
  if(CK){ const key=CK, salt=SALT, payload={d:JSON.parse(JSON.stringify(D,(k,v)=>k==='_p'?undefined:v)), s:SYNCCODE};
    SAVEQ = SAVEQ.then(()=>encryptObj(key, salt, payload)).then(blob=>{ if(CK===key) localStorage.setItem(ENC_KEY, JSON.stringify(blob)); });
    return SAVEQ; }
  localStorage.setItem(KEY, JSON.stringify(D,(k,v)=>k==='_p'?undefined:v)); return SAVEQ;
}
async function unlock(pin){
  const blob = JSON.parse(localStorage.getItem(ENC_KEY)), salt = unb64(blob.salt), key = await deriveKey(pin, salt);
  const payload = await decryptObj(key, blob);   // wirft bei falscher PIN
  CK = key; SALT = salt; D = migrate(payload.d); SYNCCODE = payload.s || null; S.locked = false; S.lastAct = Date.now();
  localStorage.removeItem(FAIL_KEY);
}
function lock(){ if(!CK) return; if($('#dlg').open) $('#dlg').close(); CK=null; D=null; C=null; TOKEN=null; SYNCCODE=null; S.locked=true; S.undo=null; render(); }
async function setPin(pin){
  SALT = crypto.getRandomValues(new Uint8Array(16)); CK = await deriveKey(pin, SALT);
  await save(); localStorage.removeItem(KEY); localStorage.removeItem(TOK_KEY); localStorage.removeItem(KEY+'.sync'); S.lastAct = Date.now();
}
async function verifyPin(pin){ try{ const blob=JSON.parse(localStorage.getItem(ENC_KEY)); await decryptObj(await deriveKey(pin, unb64(blob.salt)), blob); return true; }catch(e){ return false; } }
async function removePin(){ CK=null; SALT=null; save(); if(SYNCCODE) localStorage.setItem(KEY+'.sync',SYNCCODE); localStorage.removeItem(ENC_KEY); }
// automatische Sperre
['pointerdown','keydown','touchstart'].forEach(ev=>document.addEventListener(ev, ()=>{ S.lastAct=Date.now(); }, {passive:true}));
setInterval(()=>{ if(CK && D && Date.now()-(S.lastAct||Date.now()) > (D.settings.autoLock||5)*60000) lock(); }, 15000);
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') S.hiddenAt=Date.now();
  else if(CK && D && S.hiddenAt && Date.now()-S.hiddenAt > lockAfterMs()) lock(); });
function renderLock(){
  $('#nav1').innerHTML=''; $('#nav2').innerHTML=''; $('#mnav').style.visibility='hidden'; $('#fab').classList.add('hide');
  const f = JSON.parse(localStorage.getItem(FAIL_KEY)||'{"n":0,"t":0}'), wait = f.n>=5 ? Math.ceil((f.t + 30000*2**(f.n-5) - Date.now())/1000) : 0;
  $('#main').innerHTML = `<div class="welcome"><div class="lockicon">🔒</div><h2>Finanzen gesperrt</h2><p class="muted">PIN eingeben, um deine Daten zu entschlüsseln.</p>
    <div class="card"><form id="unlockf" class="row"><input class="in" id="pin" type="password" autocomplete="current-password" inputmode="numeric" placeholder="PIN" style="flex:1;font-size:20px;letter-spacing:.2em" ${wait>0?'disabled':''} autofocus>
    <button class="btn pri" ${wait>0?'disabled':''}>Entsperren</button></form>
    <p class="small ${wait>0||f.n?'neg':'muted'}" id="pinmsg" style="margin-bottom:0">${wait>0?`Zu viele Fehlversuche – bitte ${wait} Sekunden warten.`:f.n?`Falsche PIN (${f.n} Fehlversuche).`:'PIN vergessen? Dann lassen sich die Daten nicht wiederherstellen – nur ein Backup hilft.'}</p></div>
    <p class="small muted"><a class="link" data-act="resetall" style="font-weight:500">Alles löschen und neu beginnen</a></p></div>`;
  if(wait>0) setTimeout(()=>{ if(S.locked) render(); }, Math.min(wait,30)*1000);
  setTimeout(()=>$('#pin')?.focus(),50);
}
document.addEventListener('submit', async e=>{
  if(e.target.id!=='unlockf') return; e.preventDefault();
  const pin=$('#pin').value; if(!pin) return; $('#pinmsg').textContent='Entschlüssle …'; $('#pinmsg').className='small muted';
  try{ await unlock(pin); const ys=years(); if(!ys.includes(S.year)) S.year=ys.at(-1); if(S.server===undefined) await detectServer(); render(); autoSync(true); syncNow(); }
  catch(err){ const f=JSON.parse(localStorage.getItem(FAIL_KEY)||'{"n":0,"t":0}'); f.n++; f.t=Date.now(); localStorage.setItem(FAIL_KEY,JSON.stringify(f)); render(); }
});
function pinDialog(mode){
  const has = !!CK, title = {set:'App-Sperre einrichten', change:'PIN ändern', remove:'App-Sperre entfernen'}[mode];
  dialog(`<h3>${title}</h3>
    ${mode!=='set'?'<label class="f">Aktuelle PIN<input id="p0" type="password" autocomplete="current-password"></label>':''}
    ${mode!=='remove'?`<label class="f">Neue PIN (mind. 6 Zeichen)<input id="p1" type="password" inputmode="numeric" autocomplete="new-password"></label>
      <label class="f">PIN wiederholen<input id="p2" type="password" inputmode="numeric" autocomplete="new-password"></label>
      <p class="small muted">Je länger, desto sicherer: 6 Ziffern sind das Minimum, 8+ Zeichen oder Buchstaben sind besser. <b>Ohne PIN kommst du nicht mehr an die Daten</b> – mach vorher ein Backup.</p>`
     :'<p class="small muted">Die Daten werden danach wieder unverschlüsselt auf diesem Gerät gespeichert.</p>'}
    <p class="small neg" id="perr"></p>${acts(true)}`,
  k=>{ const err=t=>{ $('#perr').textContent=t; return false; };
    const p1=$('#p1')?.value||'', p2=$('#p2')?.value||'', p0=$('#p0')?.value||'';
    if(mode!=='remove'){ if(p1.length<6) return err('Die PIN muss mindestens 6 Zeichen haben.'); if(p1!==p2) return err('Die beiden PINs stimmen nicht überein.'); }
    (async()=>{ if(mode!=='set' && !(await verifyPin(p0))){ alert('Die aktuelle PIN ist falsch.'); return; }
      if(mode==='remove') await removePin(); else await setPin(p1);
      render(); alert(mode==='remove'?'App-Sperre entfernt.':'App-Sperre aktiv. Deine Daten sind jetzt verschlüsselt gespeichert.'); })();
  });
}
function migrate(d){
  d.settings = Object.assign({}, DEF_SETTINGS, d.settings||{});
  for(const k of ['tx','abos','wishes','goals','cats','accounts','yearly']) d[k] ??= [];
  for(const k of ['income','plan','ist','walletMap']) d[k] ??= {};
  if(!d.v || d.v<2){
    const leben = ['lebensmittel','coiffeur'];
    d.cats.forEach(c=>{ if(c.group==='pers') c.group = leben.includes(c.id)?'leben':'freizeit'; });
    d.accounts.forEach(a=>{ if(a.main||a.notgroschen) a.liquid=true; });
    d.v = 2;
  }
  if(!d.cats.some(c=>c.id==='wuensche')) d.cats.push({id:'wuensche',name:'Wünsche & Anschaffungen',group:'freizeit',acc:null});
  d.cats.forEach(c=>{ if(!GROUPS[c.group]) c.group='freizeit'; });
  return d;
}
function blank(){
  return migrate({v:2, settings:{...DEF_SETTINGS},
    cats:[{id:'miete',name:'Miete',group:'fix',acc:null},{id:'lebensmittel',name:'Lebensmittel',group:'leben',acc:null},{id:'sparen',name:'Sparen (Reserve)',group:'spar',acc:'spar'}],
    income:{[TODAY]:0}, plan:{}, tx:[], ist:{}, abos:[], wishes:[], goals:[],
    accounts:[{id:'pf',name:'Privatkonto',kind:'asset',main:true,liquid:true,rate:0,startYm:TODAY,start:0,out:0,outM:{},abos:false},
              {id:'spar',name:'Sparkonto',kind:'asset',liquid:true,rate:0,startYm:TODAY,start:0,out:0,outM:{},abos:false,notgroschen:true}]});
}
const mainAcc = () => D.accounts.find(a=>a.main) || D.accounts[0];
const accName = id => (D.accounts.find(a=>a.id===id)||{}).name||id;
const catName = id => id==='_inc' ? 'Einkommen' : id==='_offen' ? 'Ohne Kategorie' : (D.cats.find(c=>c.id===id)||{}).name||id;
const isMove = t => t.acc && t.acc!==mainAcc()?.id;   // Zahlung direkt ab einem anderen Konto

/* =====================================================================
   3. RECHENKERN
   ===================================================================== */
function allMonths(){
  const set = new Set(Object.keys(D.income));
  for(const c in D.plan) for(const ym in D.plan[c]) set.add(ym);
  D.tx.forEach(t=>set.add(t.d.slice(0,7)));
  const arr=[...set].sort(); if(!arr.length) return [TODAY];
  const out=[]; for(let ym=arr[0]; ym<=arr[arr.length-1]; ym=ymAdd(ym,1)) out.push(ym);
  return out;
}
const viewFrom = () => (S.showOld ? '0000-00' : (D?.settings.viewFrom || '0000-00'));
const vis = list => list.filter(m=>m>=viewFrom());            // Monate ab «Ansicht ab»
const activeAccs = () => D.accounts.filter(a=>!a.archived || S.showOld);
function years(){ return [...new Set(allMonths().filter(m=>m>=viewFrom()).map(m=>m.slice(0,4)))]; }
function oldNote(){ const vf=D.settings.viewFrom; if(!vf) return '';
  return `<p class="small muted">${S.showOld?'Alle Monate und archivierten Konten werden angezeigt · <a class="link" data-act="toggleold">nur ab '+ymLabel(vf)+' zeigen</a>':'Monate vor '+ymLabel(vf)+' und abbezahlte Konten sind ausgeblendet · <a class="link" data-act="toggleold">anzeigen</a>'}</p>`; }
function aboMonthly(acc){ return D.abos.filter(a=>a.active!==false && (acc==null||a.acc===acc)).reduce((s,a)=>s+(a.interval==='J'? a.price/12 : a.price),0); }

let C = null;
function calc(){
  const months = allMonths(), mainId = mainAcc()?.id;
  const ist = {}, moves = {};
  for(const t of D.tx){ const ym=t.d.slice(0,7);
    if(isMove(t)){ (moves[t.acc]??={}); moves[t.acc][ym]=(moves[t.acc][ym]||0)+t.a; }
    else { (ist[t.c]??={}); ist[t.c][ym]=r2((ist[t.c][ym]||0)+t.a); } }
  const res = {months, ist, moves, m:{}};
  const prev = {};
  for(const ym of months){
    const past = ym < TODAY;
    const yc = {cats:{}, out:{}}, mo = +ym.slice(5);   // Jahreskosten in diesem Monat
    for(const x of D.yearly){ if(ym < x.from) continue;
      if(x.mode==='verteilt'){   // gleichmässig 1/12 pro Monat (wahlweise bis zur ersten Fälligkeit schneller ansparen)
        let due=x.from; while(+due.slice(5)!==x.month) due=ymAdd(due,1);
        const rate = (D.settings.rueckFast && ym<=due) ? x.amount/(ymDiff(x.from,due)+1) : x.amount/12;   // Standard: gleichmässig 1/12
        yc.cats.rueck=(yc.cats.rueck||0)+rate; if(x.month===mo) yc.out.rueck=(yc.out.rueck||0)+x.amount; }
      else if(x.month===mo) yc.cats[x.cat]=(yc.cats[x.cat]||0)+x.amount; }
    const pl = c => ((D.plan[c]?.[ym])||0) + (yc.cats[c]||0), iv = c => ist[c]?.[ym];
    // Vergangenheit: Ist (falls erfasst) sonst Plan.  Laufend/Zukunft: max(Plan, Ist) = vorsichtige Prognose
    const eff = c => { const i=iv(c); if(i==null) return pl(c); return past ? i : Math.max(pl(c), i); };
    const incPlan = D.income[ym]||0, incIst = iv('_inc');
    const inc = incIst!=null ? (past ? incIst : Math.max(incPlan,incIst)) : incPlan;
    const cats = {}, plan = {}, g = {fix:0,leben:0,freizeit:0,schulden:0,spar:0};
    for(const c of D.cats){ const v=eff(c.id); cats[c.id]=v; plan[c.id]=pl(c.id); g[c.group]+=v; }
    const t = {bedarf:0,wunsch:0,spar:0}; for(const k in g) t[GROUPS[k].topf]+=g[k];
    const out = t.bedarf+t.wunsch+t.spar, rest = inc-out;
    const acc = {};
    for(const a of D.accounts){
      if(ym < a.startYm){ acc[a.id]=null; continue; }
      const istSet = D.ist[a.id]?.[ym];
      const start = istSet!=null ? istSet : (ym===a.startYm ? a.start : (prev[a.id] ?? a.start));
      const interest = (a.rate && start<0) ? -start*a.rate/1200 : 0;
      const inflow = a.id===mainId ? rest : D.cats.filter(c=>c.acc===a.id).reduce((s,c)=>s+cats[c.id],0);
      const fixOut = ((a.outM?.[ym] ?? a.out) || 0) + (yc.out[a.id]||0);
      const abo = a.abos ? aboMonthly(a.id) : 0;
      const mv = moves[a.id]?.[ym] || 0;
      const end = start + inflow - interest - fixOut - abo - mv;
      acc[a.id] = {start, end, interest, inflow, out:fixOut+abo+mv, istSet:istSet!=null};
      prev[a.id] = end;
    }
    res.m[ym] = {inc, incPlan, incIst, cats, plan, yc, g, t, out, rest, acc, past};
  }
  // Kennzahlen für Reserve & Wünsche
  const fwd = months.filter(m=>m>=TODAY).slice(0,12), base = fwd.length ? fwd : months.slice(-12);
  res.bedarf = base.reduce((s,m)=>s+res.m[m].t.bedarf,0)/Math.max(1,base.length);   // Ø Bedarf pro Monat
  res.reserveZiel = D.settings.notMonate * res.bedarf;
  for(const ym of months){ const m=res.m[ym];
    m.netto = D.accounts.reduce((s,a)=>s+(m.acc[a.id]?.end||0),0);
    m.liquid = D.accounts.filter(a=>a.liquid).reduce((s,a)=>s+(m.acc[a.id]?.end||0),0);
    m.schulden = D.accounts.filter(a=>a.kind==='debt').reduce((s,a)=>s+Math.min(0,m.acc[a.id]?.end||0),0);
    m.schuldenfrei = m.schulden > -DEBT_TOL;
    m.frei = m.liquid - res.reserveZiel - D.settings.puffer;   // frei verfügbar für Wünsche
  }
  res.now = res.m[TODAY] ? TODAY : (TODAY < months[0] ? months[0] : months.at(-1));
  // Topf «Unter Leuten»: Budget minus Ausgaben, Rest wird in den nächsten Monat übertragen
  let carry = 0; const lf = D.settings.leuteFrom || '9999-99';
  for(const ym of months){ const m=res.m[ym];
    if(ym < lf){ m.topfStart=0; m.topf=0; continue; }
    const plan = m.plan.leute||0, ist = ist_leute(ym);
    m.topfStart = carry;
    m.topfAvail = carry + plan - (ist||0);                               // jetzt verfügbar in diesem Monat
    carry = ym < TODAY ? carry + plan - (ist ?? plan) : carry - Math.max(0,(ist||0)-plan);
    m.topf = Math.max(0, carry);
    m.frei -= m.topf;                                                     // zweckgebunden – nicht für andere Wünsche
  }
  C = res; wishPlan(); return res;
  function ist_leute(ym){ return ist.leute?.[ym]; }
}
// erster Monat ab heute, in dem eine Bedingung erfüllt ist
const firstFrom = (from, fn) => C.months.find(m=>m>=from && fn(C.m[m], m));

/* =====================================================================
   4. WÜNSCHE – wann kann ich es mir leisten?
   Reihenfolge: 1. keine Schulden  2. Reserve bleibt unangetastet  3. Bedenkzeit vorbei
   Wünsche werden nach Priorität nacheinander finanziert.
   ===================================================================== */
// Ab wann ist ein Betrag (inkl. vorher eingeplanter Wünsche) leistbar?
function affordAt(cum, fromYm){
  const last = C.months.at(-1), m12 = C.months.at(-13);
  const slope = m12 ? (C.m[last].frei - C.m[m12].frei)/12 : 0;   // Zuwachs pro Monat am Ende des Plans
  const hit = firstFrom(fromYm, m=>m.schuldenfrei && m.frei>=cum);
  if(hit) return {ym:hit, est:false};
  if(slope>0 && C.m[last].schuldenfrei) return {ym:ymAdd(last, Math.max(1,Math.ceil((cum - C.m[last].frei)/slope))), est:true};
  return {ym:null, est:false};
}
const WTYPE = {erlebnis:['Erlebnis mit Menschen','👥'], regel:['Regelmässig (pro Monat)','↻'], ding:['Anschaffung','🛍']};
const wtype = w => w.type || 'ding';
const WCAT_DEF = [['menschen','Menschen & Erlebnisse'],['gesundheit','Gesundheit & Sport'],['bildung','Weiterbildung'],['wohnen','Wohnen & Haushalt'],['mobil','Mobilität'],['kleidung','Kleidung & Pflege'],['technik','Technik & Hobby'],['sonst','Sonstiges']];
function wcats(){ if(!D.wcats?.length) D.wcats = WCAT_DEF.map(([id,name])=>({id,name})); return D.wcats; }
const wcatOf = w => wcats().find(c=>c.id===w.wc) || wcats().find(c=>c.id===(wtype(w)==='erlebnis'?'menschen':'sonst')) || wcats().at(-1);
const wcatRank = w => wcats().indexOf(wcatOf(w));
const wishOrder = (a,b) => (wcatRank(a)-wcatRank(b)) || (a.prio-b.prio) || a.added.localeCompare(b.added);
const openWishes = () => D.wishes.filter(w=>!w.done && !(wtype(w)==='regel' && w.active)).sort(wishOrder);
const leuteMonthly = () => C.m[C.now]?.plan.leute || D.settings.leuteBudget || 0;
const leuteCommitted = () => D.wishes.filter(w=>wtype(w)==='regel' && w.active && !w.done).reduce((t,w)=>t+w.price,0);
function leuteCount(ym){ return D.tx.filter(t=>t.c==='leute' && t.d.startsWith(ym)).length + (D.acts||[]).filter(a=>a.d.startsWith(ym)).length; }
function wishPlan(){
  let cum = 0, topf = Math.max(0, C.m[C.now]?.topfAvail||0), freeMonthly = Math.max(0, leuteMonthly() - leuteCommitted());
  for(const w of openWishes()){
    const t = wtype(w);
    if(t==='regel'){   // monatliche Kosten: passt es in den Topf oder ins Budget?
      const fut = C.months.filter(m=>m>C.now).slice(0,12), minRest = fut.length ? Math.min(...fut.map(m=>C.m[m].rest)) : 0;
      const extra = Math.max(0, w.price - freeMonthly);
      w._p = {regel:true, fitsTopf: extra===0, extra, fitsBudget: extra>0 && minRest>=extra, ym: extra===0 || minRest>=extra ? C.now : null};
      if(extra===0) freeMonthly -= w.price;
      continue;
    }
    if(t==='erlebnis'){
      if(w.price <= topf){ w._p = {ym:C.now, topf:true}; topf -= w.price; continue; }
      const n = Math.ceil((w.price - topf) / Math.max(1, freeMonthly));
      if(n <= 6){ w._p = {ym:ymAdd(C.now,n), topf:true, est:false, saveMonths:n}; topf = 0; continue; }
    }
    cum += w.price;
    const wait = ymOf(new Date(new Date(w.added).getTime() + D.settings.wartefrist*864e5));
    const r = {cum, wait, waitDays: Math.ceil((new Date(w.added).getTime()+D.settings.wartefrist*864e5-Date.now())/864e5), ...affordAt(cum, wait > C.now ? wait : C.now)};
    r.block = !C.m[C.now]?.schuldenfrei ? 'schulden' : C.m[C.now].liquid < C.reserveZiel ? 'reserve' : null;
    w._p = r;
  }
}
// Schnell-Check: Preis eingeben → Datum
function quickCheck(price){
  if(!price || isNaN(price) || price<=0) return '<p class="small muted" style="margin:10px 0 0">Gib einen Preis ein, z. B. 800.</p>';
  const others = openWishes().reduce((t,w)=>t+w.price,0);
  const a = affordAt(price, C.now), b = affordAt(price+others, C.now);
  const fmtD = r => !r.ym ? 'nicht absehbar' : r.ym<=C.now ? 'jetzt' : (r.est?'ca. ':'')+ymLabel(r.ym);
  const months = r => r.ym && r.ym>C.now ? ` <span class="small muted">in ${ymDiff(C.now,r.ym)} Monaten</span>` : '';
  const m=C.m[C.now];
  return `<div class="qres"><div class="small muted">Leistbar ab</div><div class="qdate ${a.ym?'':'neg'}">${fmtD(a)}${months(a)}</div>
    <div class="small muted" style="margin-top:6px">${!m.schuldenfrei?'Erst nach dem Schuldenabbau. ':''}${others?`Nach deinen ${openWishes().length} anderen Wünschen: <b>${fmtD(b)}</b>. `:''}Ohne Schulden und ohne die Reserve anzutasten${a.ym&&a.ym>C.now?` – oder separat ca. CHF ${chf0(price/Math.max(1,ymDiff(C.now,a.ym)))}/Monat sparen`:''}.</div>
    <div class="row" style="margin-top:10px"><button class="btn sm" data-act="qadd">Als Wunsch speichern</button></div></div>`;
}
function quickCard(){
  return `<div class="card"><h3>Wann kann ich mir das leisten?</h3>
    <div class="row"><input class="in" id="qname" placeholder="Was? (optional)" style="flex:1;min-width:120px"><input class="in amt" id="qprice" inputmode="decimal" placeholder="Preis CHF" value="${S.qp||''}"></div>
    <div id="qout">${quickCheck(S.qp)}</div></div>`;
}

/* =====================================================================
   5. REGELN
   ===================================================================== */
const RULES = [
  {id:'bedarf', t:'Bedarf ≤ {fix} %', info:'Fixkosten + Lebenshaltung'},
  {id:'wunsch', t:'Freizeit & Wünsche ≤ {pers} %'},
  {id:'spar',   t:'Sparen & Schuldenabbau ≥ {spar} %'},
  {id:'budget', t:'Nicht mehr ausgeben als einnehmen'},
  {id:'konten', t:'Kein Konto im Minus'},
  {id:'neuschuld', t:'Keine neuen Schulden'},
  {id:'kk',     t:'Kreditkarte ohne Zinsen'},
  {id:'not',    t:'Reserve ≥ {notMonate} Monate Bedarf'},
  {id:'s3a',    t:'Säule 3a im Rahmen (max. CHF {max3a})'},
  {id:'kat',    t:'Kategorie-Budgets eingehalten'},
  {id:'abo',    t:'Abos ≤ CHF {aboLimit}/Monat'},
];
const ruleTitle = r => r.t.replace(/\{(\w+)\}/g,(_,k)=>chf0(D.settings[k]));
function checkMonth(ym){
  const m = C.m[ym], s = D.settings, out = {};
  if(!m) return out;
  const sh = v => m.inc>0 ? v/m.inc : NaN;
  const lim = (v,max) => !isFinite(v) ? ['na','Kein Einkommen geplant'] : v<=max/100 ? ['ok',pct(v)+' vom Einkommen'] : v<=(max+10)/100 ? ['warn',pct(v)+' – über '+max+' %'] : ['bad',pct(v)+' – deutlich über '+max+' %'];
  out.bedarf = lim(sh(m.t.bedarf),s.fix); out.wunsch = lim(sh(m.t.wunsch),s.pers);
  const sp = sh(m.t.spar);
  out.spar = !isFinite(sp) ? ['na','Kein Einkommen geplant'] : sp>=s.spar/100 ? ['ok',pct(sp)+' vom Einkommen'] : sp>=(s.spar-10)/100 ? ['warn','nur '+pct(sp)+' – Ziel '+s.spar+' %'] : ['bad','nur '+pct(sp)+' – Ziel '+s.spar+' %'];
  out.budget = m.rest>=0 ? ['ok','Rest CHF '+chf(m.rest)] : ['bad','Fehlbetrag CHF '+chf(-m.rest)];
  const minus = D.accounts.filter(a=>a.kind==='asset' && m.acc[a.id] && m.acc[a.id].end < -0.5).map(a=>a.name+' ('+chf(m.acc[a.id].end)+')');
  out.konten = minus.length ? ['bad',minus.join(', ')] : ['ok','Alle Guthabenkonten im Plus'];
  const deeper = D.accounts.filter(a=>a.kind==='debt' && m.acc[a.id] && m.acc[a.id].end < Math.min(0,m.acc[a.id].start) - 0.5).map(a=>a.name);
  out.neuschuld = deeper.length ? ['bad','Schulden steigen: '+deeper.join(', ')] : ['ok', m.schuldenfrei?'Schuldenfrei':'Schulden sinken'];
  const k = m.acc.kk;
  if(!k) out.kk=['na','Keine Kreditkarte erfasst'];
  else if(k.interest>0.5) out.kk=['bad','Saldo '+chf(k.start)+' → ca. CHF '+chf(k.interest)+' Zins'];
  else if(k.end > s.kkGuthabenMax) out.kk=['warn','Guthaben CHF '+chf(k.end)+' – lieber aufs Sparkonto'];
  else out.kk=['ok','Kein Zins'];
  const na = D.accounts.find(a=>a.notgroschen);
  if(!na || !m.acc[na.id]) out.not=['na','Kein Reservekonto gewählt'];
  else { const need = C.reserveZiel, have = m.acc[na.id].end;
    out.not = have>=need ? ['ok',chf0(have)+' von '+chf0(need)+' CHF'] : have>=need/2 ? ['warn',chf0(have)+' von '+chf0(need)+' CHF'] : ['bad',chf0(have)+' von '+chf0(need)+' CHF']; }
  const y = ym.slice(0,4); let ytd=0; for(let i=1;i<=+ym.slice(5);i++){ ytd += (C.m[y+'-'+String(i).padStart(2,'0')]?.cats.s3a)||0; }
  if(!D.cats.some(c=>c.id==='s3a')) out.s3a=['na','Keine Kategorie «Säule 3a»'];
  else if(ytd > s.max3a) out.s3a=['bad','CHF '+chf0(ytd)+' – über dem Maximum, Überschuss nicht abzugsfähig'];
  else if(ym.slice(5)==='12' && ytd < s.max3a) out.s3a=['warn','Jahr: CHF '+chf0(ytd)+' – noch CHF '+chf0(s.max3a-ytd)+' Steuerabzug möglich'];
  else out.s3a=['ok','Bis hier CHF '+chf0(ytd)];
  const over = D.cats.filter(c=>{const i=C.ist[c.id]?.[ym]; return i!=null && i > (m.plan[c.id]||0)+0.5;});
  const anyIst = D.cats.some(c=>C.ist[c.id]?.[ym]!=null);
  out.kat = !anyIst ? ['na','Noch keine Buchungen'] : over.length ? ['warn','Überschritten: '+over.map(c=>c.name).join(', ')] : ['ok','Alle im Rahmen'];
  const ab = aboMonthly(null);
  out.abo = ab<=s.aboLimit ? ['ok','CHF '+chf(ab)+'/Monat'] : ['warn','CHF '+chf(ab)+'/Monat'];
  return out;
}
const stIcon = s => `<span class="st ${s}">${s==='ok'?'✓':s==='warn'?'!':s==='bad'?'✕':'–'}</span>`;

/* =====================================================================
   6. STUFENPLAN zur finanziellen Stabilität
   ===================================================================== */
function ladder(){
  const n = C.now, m = C.m[n], s = D.settings, B = C.bedarf;
  const past12 = vis(C.months).filter(x=>x<=n).slice(-12);
  const incY = past12.reduce((t,x)=>t+C.m[x].inc,0), sparY = past12.reduce((t,x)=>t+C.m[x].t.spar,0);
  const y = n.slice(0,4), y3a = C.months.filter(x=>x.startsWith(y)).reduce((t,x)=>t+(C.m[x].cats.s3a||0),0);
  const na = D.accounts.find(a=>a.notgroschen), res = na ? (m.acc[na.id]?.end||0) : 0;
  const inv = C.months.filter(x=>x>=n).slice(0,12).reduce((t,x)=>t+(C.m[x].cats.invest||0),0);
  const when = fn => { const h = firstFrom(n, fn); return h ? 'Laut Plan erreicht: '+ymLabel(h) : 'Im aktuellen Plan noch nicht erreicht'; };
  const st = [
    {t:'Budget im Griff', ok: m.rest>=0 && C.months.filter(x=>x>=n).slice(0,3).every(x=>C.m[x].rest>=0),
      d:'Jeden Monat weniger ausgeben als einnehmen.', how:'Budget so anpassen, dass der Restbetrag in den nächsten 3 Monaten nicht negativ ist.'},
    {t:'Mini-Reserve (1 Monat)', ok: m.liquid >= B, d:`Mind. CHF ${chf0(B)} flüssig (Privat- + Sparkonto).`, how: when(x=>x.liquid>=B)},
