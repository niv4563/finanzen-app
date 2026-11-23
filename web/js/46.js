/* =====================================================================
   54. VERSION 1.31.1 – MENÜPUNKT «PC VERBINDEN» UNTER EINSTELLUNGEN (HANDY)
   • Eigene, gut sichtbare Seite: grosser Knopf «QR-Code am PC scannen».
   ===================================================================== */
ICON.pc = svgI('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>');
TITLES.pcverbinden = 'PC verbinden';
if(NATIVE){
  const sett = NAV4.find(s => s[0] === 'Einstellungen');
  if(sett && !sett[1].some(it => it[0] === 'pcverbinden')) sett[1].unshift(['pcverbinden', ICON.pc, 'PC verbinden']);
}
function vPcVerbinden(){
  return `<div class="card"><h3>PC verbinden</h3>
    <ol class="small" style="padding-left:18px;margin:6px 0 14px;line-height:1.7">
      <li>Am PC die Finanzen-Seite öffnen: <b>niv4563.github.io/finanzen-app</b></li>
      <li>Dort auf <b>«Mit Handy anmelden»</b> klicken – ein QR-Code erscheint.</li>
      <li>Hier unten tippen und die Kamera auf den QR-Code halten.</li>
    </ol>
    <button class="btn pri wide" data-act="webpairscan" style="font-size:17px;padding:16px">QR-Code am PC scannen</button>
    <p class="small muted" style="margin-top:12px">Es geht auch mit der gewöhnlichen Kamera des Handys: QR-Code scannen, Link antippen, Fingerabdruck – fertig. Der PC bleibt bis heute 23:59 verbunden und meldet sich danach selbst ab.</p></div>`;
}
var _render1311 = render;
render = function(){
  if(S.view === 'pcverbinden' && !S.locked && D){
    if(!NATIVE){ S.view = 'start'; return _render1311.apply(this, arguments); }
    S.view = 'autoregeln'; _render1311.apply(this, arguments); S.view = 'pcverbinden';
    $('header h1').textContent = TITLES.pcverbinden; $('#main').innerHTML = vPcVerbinden();
    document.querySelectorAll('nav.side a').forEach(x => x.classList.toggle('on', x.dataset.go === 'pcverbinden'));
    return;
  }
  return _render1311.apply(this, arguments);
};
