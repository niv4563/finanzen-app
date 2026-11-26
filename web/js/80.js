/* =====================================================================
   VERSION 1.57.0 – Sicherheit auf Bank-Niveau (OWASP MASVS L2)
   1. Geräteprüfung nach dem Entsperren: Root, Hooking, Debugger, echte Signatur.
      Die App WARNT nur – sie sperrt nie, damit deine Daten erreichbar bleiben.
   2. Zugangsschlüssel für den Geräte-Abgleich: Warnung, wenn er mehr darf als nötig
      (klassischer Token oder Zugriff auf das App-Projekt → könnte Updates verändern).
   3. PC-Version: darf nicht in fremde Seiten eingebettet werden (Clickjacking).
   Alles wird auf dem Gerät geprüft; nichts davon geht ins Internet ausser der
   Token-Prüfung bei GitHub (nur lesend, mit deinem eigenen Token).
   ===================================================================== */
var SEC = {dev:null, tok:null, shown:false};

/* ---------- 3. Clickjacking-Schutz (PC-Version) ---------- */
(() => { try{ if(window.top !== window.self){ document.documentElement.innerHTML = ''; window.top.location = window.self.location; } }catch(e){ document.documentElement.innerHTML = ''; } })();

/* ---------- 1. Geräteprüfung ---------- */
var IOS = !!(NATIVE && window.Capacitor?.getPlatform?.() === 'ios');
async function secDevice(){
  if(!NATIVE) return null;
  try{ const p = PLUG.Integrity || (PLUG.Integrity = window.Capacitor.Plugins?.Integrity || window.Capacitor.registerPlugin('Integrity'));
    SEC.dev = await p.check(); }catch(e){ SEC.dev = null; }
  return SEC.dev;
}
function secIssues(){
  const d = SEC.dev, out = []; if(!d) return out;
  if(d.signatureOk === false) out.push({lvl:'bad', t:'Diese App ist nicht die offizielle Version', d:'Sie ist nicht mit deinem Schlüssel signiert. Jemand könnte sie verändert haben. Sichere deine Daten, deinstalliere die App und installiere sie neu aus deinem GitHub-Projekt.'});
  if(d.hooked) out.push({lvl:'bad', t:'Fremder Code beobachtet die App', d:'Ein Werkzeug wie Frida oder Xposed läuft. Es kann Eingaben und angezeigte Beträge mitlesen. Entferne es, bevor du die App weiter benutzt.'});
  if(d.rooted) out.push({lvl:'warn', t: IOS ? 'Das iPhone ist gejailbreakt' : 'Das Handy ist gerootet', d:'Apps mit Systemrechten können Daten anderer Apps lesen. Deine Daten bleiben verschlüsselt, solange die PIN geheim bleibt – Bank-Apps verweigern auf solchen Geräten den Dienst.'});
  if(d.debugger) out.push({lvl:'warn', t:'Ein Debugger ist angehängt', d:'Damit lässt sich die App von aussen steuern. Trenne das Handy vom PC (USB-Debugging).'});
  return out;
}
function secDialog(list){
  dialog(`<h3>Sicherheitswarnung</h3>
    ${list.map(x=>`<div class="secw ${x.lvl}"><b>${esc(x.t)}</b><p class="small">${esc(x.d)}</p></div>`).join('')}
    <p class="small muted">Die App bleibt nutzbar. Die Prüfung läuft bei jedem Entsperren nur auf dem Gerät.</p>
    <div class="acts"><button class="btn pri" data-dlg="cancel">Verstanden</button></div>`);
}
async function secAfterUnlock(){
  await secDevice(); const l = secIssues();
  if(l.length && !SEC.shown){ SEC.shown = true; setTimeout(()=>{ if(D && !$('#dlg').open) secDialog(l); }, 400); }
  secToken();
}
unlock = (prev => async function(){ const r = await prev.apply(this, arguments); setTimeout(()=>secAfterUnlock(), 600); return r; })(unlock);

/* ---------- 2. Zugangsschlüssel prüfen ---------- */
async function secToken(force){
  if(typeof ghOn !== 'function' || !ghOn()) { SEC.tok = null; return; }
  const day = todayIso(), last = localStorage.getItem(KEY+'.tokchk');
  if(!force && last === day && SEC.tok) return;
  let o; try{ o = ghParse(SYNCCODE); }catch(e){ return; }
  const res = {classic:false, appWrite:false, ok:true};
  if(/^(ghp_|gho_|ghu_)/.test(o.t)) res.classic = true;
  const app = (window.APP_BUILD && APP_BUILD.repo) || '';
  if(app && app !== o.r){
    try{ const r = await fetch(`https://api.github.com/repos/${app}/hooks?per_page=1`, {cache:'no-store', credentials:'omit', referrerPolicy:'no-referrer',
        headers:{Authorization:'Bearer '+o.t, 'X-GitHub-Api-Version':'2022-11-28', Accept:'application/vnd.github+json'}});
      if(r.status === 200) res.appWrite = true;
      const sc = r.headers.get('x-oauth-scopes'); if(sc && /\brepo\b/.test(sc)) res.classic = true;
    }catch(e){ return; }
  }
  res.ok = !res.classic && !res.appWrite; SEC.tok = res; localStorage.setItem(KEY+'.tokchk', day);
  if(!res.ok && !SEC.tokShown){ SEC.tokShown = true; setTimeout(()=>{ if(D && !$('#dlg').open) secDialog([{lvl:'bad', t:'Der Zugangsschlüssel für den Abgleich darf zu viel', d:(res.appWrite?`Er hat Verwaltungsrechte für dein App-Projekt (${app}). Wer ihn stiehlt, könnte damit ein verändertes Update veröffentlichen. `:'Es ist ein klassischer Zugangsschlüssel mit Zugriff auf alle deine Repositories. ')+'Erstelle bei GitHub einen «Fine-grained token» nur für das Daten-Repository (Contents: Read and write) und trage ihn unter Einstellungen › Daten & Sicherheit › Geräte-Abgleich neu ein. Lösche danach den alten Token bei GitHub.'}]); }, 900); }
}

/* ---------- Anzeige in Einstellungen › Daten & Sicherheit ---------- */
function secCard(){
  const d = SEC.dev, l = secIssues(), t = SEC.tok;
  const row = (ok, txt) => `<li class="${ok===true?'in':ok===false?'out':'muted'}">${ok===true?'✓':ok===false?'✗':'–'} ${txt}</li>`;
  return `<div class="card seccard"><h3>Sicherheitsprüfung</h3>
    <p class="small muted" style="margin-top:0">Wie bei Bank-Apps prüft die App bei jedem Entsperren das Gerät und sich selbst. Sie warnt nur und sperrt nie.</p>
    <ul class="seclist">
      ${NATIVE ? row(d ? d.signatureOk!==false : null, d && d.signatureOk===null ? 'Offizielle Signatur (in diesem Test-Build nicht prüfbar)' : 'Offizielle, unveränderte App') : row(null, 'Signatur – nur in der Handy-App prüfbar')}
      ${NATIVE ? row(d ? !d.rooted : null, IOS ? 'Kein Jailbreak' : 'Nicht gerootet') : ''}
      ${NATIVE ? row(d ? !d.hooked : null, 'Kein fremder Code (Frida, Xposed …)') : ''}
      ${NATIVE ? row(d ? !d.debugger : null, 'Kein Debugger') : ''}
      ${row(t ? t.ok : null, t ? (t.ok ? 'Zugangsschlüssel darf nur das Daten-Repository' : 'Zugangsschlüssel darf zu viel – bitte ersetzen') : 'Zugangsschlüssel (nur mit Geräte-Abgleich)')}
      ${row(true, NATIVE ? 'Daten verschlüsselt (AES-256-GCM, Schlüssel aus PIN und Sicherheitschip)' : 'Daten verschlüsselt (AES-256-GCM, Schlüssel aus PIN)')}
      ${row(true, 'Nur verschlüsselte Verbindungen zu festgelegten Diensten')}
    </ul>
    ${l.length ? `<p class="small out">${l.length} Warnung${l.length>1?'en':''} – <a class="link" data-act="secshow">anzeigen</a></p>` : ''}
    <div class="row"><button class="btn sm" data-act="secrun">Jetzt prüfen</button></div></div>`;
}
vDaten2 = (prev => function(){ return secCard() + prev.apply(this, arguments); })(vDaten2);
document.addEventListener('click', async e => {
  const a = e.target.closest('[data-act="secrun"],[data-act="secshow"]'); if(!a || !D) return; e.stopPropagation();
  if(a.dataset.act === 'secshow') return secDialog(secIssues());
  a.disabled = true; await secDevice(); await secToken(true); render();
  const l = secIssues(); toastMsg(l.length || (SEC.tok && !SEC.tok.ok) ? 'Warnungen gefunden – siehe Sicherheitsprüfung' : 'Alles in Ordnung');
}, true);
