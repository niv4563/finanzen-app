/* =====================================================================
   37. VERSION 1.18.0 – SPERRBILDSCHIRM NUR MIT FINGERABDRUCK
   Ist der Fingerabdruck eingerichtet, zeigt der Sperrbildschirm nur den Fingerabdruck.
   Die PIN (Zahlen) erscheint erst, wenn der Fingerabdruck nicht klappt oder abgebrochen wird.
   ===================================================================== */
var pinReveal = () => { S.pinShown = true; const f = $('#unlockf'); if(!f) return; f.style.display = ''; $('#pinlink')?.remove();
  const m = $('#pinmsg'); if(m && m.dataset.bio) m.style.display = ''; setTimeout(()=>$('#pin')?.focus(), 60); };
var _renderLock1180 = renderLock;
renderLock = function(){
  _renderLock1180();
  if(!NATIVE || !bioOn()) return;
  const f = JSON.parse(localStorage.getItem(FAIL_KEY)||'{"n":0,"t":0}');
  if(S.pinShown || f.n>0) return;                                            // nach Fehlversuchen direkt die PIN zeigen
  const form = $('#unlockf'), msg = $('#pinmsg');
  if(form) form.style.display = 'none';
  if(msg){ msg.dataset.bio = '1'; msg.style.display = 'none'; }
  const h = $('#main .welcome h2'), p = $('#main .welcome > p.muted'); if(h) h.textContent = 'Finanzen gesperrt'; if(p) p.textContent = 'Lege deinen Finger auf den Sensor.';
  $('#biobtn')?.insertAdjacentHTML('afterend', `<p class="small" id="pinlink" style="text-align:center;margin:14px 0 0"><a class="link" data-act="pinshow">Mit PIN entsperren</a></p>`);
};
// Fingerabdruck klappt nicht oder wird abgebrochen → PIN-Feld zeigen
var _bioUnlock1180 = bioUnlock;
bioUnlock = async function(){ await _bioUnlock1180(); if(S.locked) pinReveal(); };
var _lock1180 = lock;
lock = function(){ S.pinShown = false; _lock1180(); };
// PIN nur aus Zahlen: Zahlen-Tastatur und keine Buchstaben
document.addEventListener('input', e=>{ if(['p1','p2'].includes(e.target.id)) e.target.value = e.target.value.replace(/\D/g,''); }, true);
document.addEventListener('click', e=>{ const a = e.target.closest('[data-act="pinshow"]'); if(!a) return; e.stopPropagation(); e.preventDefault(); pinReveal(); }, true);
