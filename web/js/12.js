
/* =====================================================================
   20. VERSION 1.4.1 – RÄNDER FÜR STATUS-/NAVIGATIONSLEISTE, UPDATE-PRÜFUNG BEI JEDEM START, WALLET SICHTBAR
   ===================================================================== */
// Update-Prüfung: bei jedem Öffnen (höchstens 1× pro Stunde), damit neue Versionen sofort angezeigt werden
async function checkUpdate(manual){
  if(!NATIVE || BUILD.channel!=='direct' || !/^[\w.-]+\/[\w.-]+$/.test(BUILD.repo)) return;
  const st = JSON.parse(localStorage.getItem(UPD_KEY)||'{}');
  if(!manual && Date.now()-(st.at||0) < 3600e3){ S.update = st.v && st.url && vcmp(st.v, BUILD.version)>0 ? st : null; return; }
  S.updBusy = true; if(manual) render();
  try{
    const r = await fetch(`https://api.github.com/repos/${BUILD.repo}/releases/latest`, {headers:{Accept:'application/vnd.github+json'}, cache:'no-store', credentials:'omit', referrerPolicy:'no-referrer'});
    if(!r.ok) throw new Error(r.status===404 ? 'Noch keine Version veröffentlicht oder Projekt nicht öffentlich.' : 'GitHub antwortet mit Fehler '+r.status+'.');
    const j = await r.json(), v = String(j.tag_name||'').replace(/^v/,'');
    const prefix = `https://github.com/${BUILD.repo}/releases/download/`;
    const apk = (j.assets||[]).find(a => /\.apk$/i.test(a.name) && String(a.browser_download_url).startsWith(prefix));
    const res = {at:Date.now(), v, url:apk?.browser_download_url||'', notes:String(j.body||'').slice(0,2000), date:j.published_at||''};
    localStorage.setItem(UPD_KEY, JSON.stringify(res));
    S.update = apk && vcmp(v, BUILD.version)>0 ? res : null; S.updErr = null;
    if(manual && !S.update) S.updMsg = `Du hast die neueste Version (${BUILD.version}).`;
  }catch(e){ S.updErr = e.message || 'Keine Verbindung.'; }
  S.updBusy = false; S.updChecked = true; if(D || manual) render();
}
// Version im Menü anzeigen und Wallet-Hinweis auf der Startseite
var _render141 = render;
render = function(){
  _render141();
  const h = document.querySelector('nav.side .dhead .small');
  if(h && !h.dataset.v){ h.dataset.v = 1; h.insertAdjacentHTML('afterend', `<span class="small ver">Version ${esc(BUILD.version||'')}</span>`); }
};
var _vStart141 = vStart;
vStart = function(){
  let h = _vStart141();
  if(NATIVE && !D.walletApi?.token && !D.flags?.wbHint)
    h = `<div class="hint row"><span class="sp"><b>Wallet by BudgetBakers verbinden?</b> Dann kommen deine Wallet-Buchungen automatisch in diese App.</span><button class="btn sm pri" data-go="wallet">Verbinden</button><button class="btn sm" data-act="wbhintno">Nein</button></div>` + h;
  return h;
};
document.addEventListener('click', e=>{ const a=e.target.closest('[data-act="wbhintno"]'); if(a && D){ e.stopPropagation(); (D.flags??={}).wbHint=1; save(); render(); } }, true);
