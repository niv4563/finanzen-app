/* =====================================================================
   43. VERSION 1.24.0 – WALLET NUR NOCH IN DEN EINSTELLUNGEN
   Die Verbindung arbeitet unsichtbar. Auf Startseite, Konten, Plus-Menü, Hinweisen und
   Meldungen steht nirgends mehr «Wallet». Sichtbar ist sie nur unter
   Menü → Einstellungen → Wallet-Verbindung.
   ===================================================================== */
// Menü: «Wallet-Verbindung» von «Import» nach «Einstellungen»
(()=>{ const imp = NAV4.find(s=>s[0]==='Import'), set = NAV4.find(s=>s[0]==='Einstellungen');
  if(imp && set){ const i = imp[1].findIndex(x=>x[0]==='wallet'); if(i>=0){ const [it] = imp[1].splice(i,1); set[1].push(it); } } })();
// Banner/Hinweise ausblenden (Fehler zeigt die kleine Statuszeile neutral an)
syncBanner = function(){ return ''; };
// Statuszeile und Saldo neutral
syncStatus = (function(prev){ return function(){
  return prev().replace('Synchron mit Wallet','Synchron').replace(/>Wallet: /,'>Abgleich: ').replace(/ \(Wallet ([^)]*)\)/,' · $1');
}; })(syncStatus);
var _homeAccounts1240 = homeAccounts;
homeAccounts = function(){
  let h = _homeAccounts1240().replace('Saldo wie in Wallet','Saldo');
  // Kachel «Konten wie in Wallet» braucht es nicht mehr: Konten kommen automatisch
  if(D.walletApi?.token) h = h.replace(/<div class="hacc"><div class="htile add" data-act="wbaccs">[\s\S]*?<\/div><\/div>/, '');
  return h;
};
// Geplante Zahlungen: Konto statt «Wallet»
var _wbPlannedOcc1240 = wbPlannedOcc;
wbPlannedOcc = function(from, until){ return _wbPlannedOcc1240(from, until).map(x=>({...x, sub: x.sub.replace(/^Wallet( · )?/,'') || 'Geplante Zahlung'})); };
// Plus-Menü ohne Wallet-Eintrag
var _fabSheet1240 = fabSheet;
fabSheet = function(){
  _fabSheet1240();
  document.querySelector('#dlg [data-sheet="wbsyncnow"]')?.remove();
  document.querySelectorAll('#dlg .sheetbtn span').forEach(s=>{ if(s.textContent==='CSV von PostFinance oder Wallet') s.textContent = 'CSV von deiner Bank'; });
};
// Meldungen neutral
var _toastMsg1240 = toastMsg;
toastMsg = function(t){ return _toastMsg1240(String(t).replace(/ aus Wallet angelegt/,' angelegt').replace(/Wallet-Konto\/Konten eigenständig angelegt/,'Konto/Konten angelegt').replace(/Aktualisiert – Änderung vom anderen Gerät/,'Aktualisiert')); };
// Konten- und Import-Seite: Wallet-Kästen nur auf der Wallet-Seite selbst
var _render1240 = render;
render = function(){
  _render1240(); if(!D || S.locked) return;
  const box = (id, act, title, sub) => `<div class="wnote" id="${id}" data-act="${act}"><span class="wic" style="background:var(--acc)">${ci(CI.tag)}</span><span class="sp"><b>${title}</b><br><span class="small muted">${sub}</span></span>›</div>`;
  if(S.view==='wallet'){   // Einmal-Werkzeuge für Wallet nur hier
    if(!$('#wbcatbox')) $('#main')?.insertAdjacentHTML('beforeend', box('wbcatbox','wbcats','Kategorien wie in Wallet übernehmen','Namen, Hauptkategorien, Zuordnung aller Wallet-Buchungen'));
    if(!$('#wbrulebox')) $('#main')?.insertAdjacentHTML('beforeend', box('wbrulebox','wbrules','Regeln aus Wallet-Buchungen ableiten','Händler, die in Wallet immer gleich zugeordnet waren'));
    return; }
  if(S.view==='daten') return;
  ['#wbaccbox','#wbcatbox','#wbrulebox'].forEach(q=>$(q)?.remove());
  document.querySelectorAll('#main .wcard').forEach(c=>{ if(/Wallet by BudgetBakers/.test(c.querySelector('h3')?.textContent||'')) c.remove(); });
  const main = $('#main'); if(!main) return;
  const tw = document.createTreeWalker(main, NodeFilter.SHOW_TEXT); const fix = [];
  while(tw.nextNode()) if(tw.currentNode.nodeValue.includes('Wallet')) fix.push(tw.currentNode);
  for(const n of fix) n.nodeValue = n.nodeValue.replace(/ wie bei Wallet/g,'').replace(/Wallet-Export oder /g,'').replace(/, Wallet-Export/g,'').replace(/ oder Wallet\b/g,'').replace(/Wallet-\/CSV-/g,'CSV-').replace(/Wallet, CSV/g,'Import, CSV').replace(/Verbinde Wallet oder importiere/g,'Importiere');
};
TITLES.wallet = 'Wallet-Verbindung';
