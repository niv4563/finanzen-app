/* =====================================================================
   72. LÖSCHEN NUR NOCH IN DEN EINSTELLUNGEN – MIT BESTÄTIGUNGSWORT
   • Der Sperrbildschirm zeigt kein «Alles löschen und neu beginnen» mehr (kein versehentliches Löschen).
   • Unter Einstellungen → Daten & Sicherheit wird nur gelöscht, wenn das Wort LÖSCHEN eingetippt wird.
   ===================================================================== */
var DEL_WORD = 'LÖSCHEN';
renderLock = (prev => function(){ const r = prev.apply(this, arguments);
  try{ document.querySelectorAll('#main [data-act="resetall"]').forEach(a=>(a.closest('p') || a).remove()); }catch(e){} return r; })(renderLock);
function delDialog(){
  if(!D){ toastMsg('Löschen geht nur in den Einstellungen, wenn die App entsperrt ist.'); return; }
  dialog(`<h3>Alle Daten löschen?</h3>
    <p class="small">Alle Buchungen, Budgets, Konten und Einstellungen werden <b>von diesem Gerät</b> entfernt. Das lässt sich nicht rückgängig machen.</p>
    <p class="small muted">Mach vorher eine Sicherung, wenn du die Daten später noch brauchst. <a class="link" data-act="export">Sicherung speichern</a></p>
    <label class="f">Zum Bestätigen <b>${DEL_WORD}</b> eintippen<input id="delw" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Bestätigungswort"></label>
    <div class="acts"><button class="btn" data-dlg="cancel">Abbrechen</button><button class="btn danger" data-dlg="ok" id="delok" disabled>Endgültig löschen</button></div>`,
  k=>{ if(k!=='ok') return; if(String(val('delw')).trim().toUpperCase() !== DEL_WORD){ toastMsg(`Bitte genau «${DEL_WORD}» eintippen.`); return false; }
    setTimeout(()=>{ wipeAll(); toastMsg('Alle Daten auf diesem Gerät wurden gelöscht.'); }, 30); });
  setTimeout(()=>$('#delw')?.focus(), 50);
}
document.addEventListener('input', e=>{ if(e.target.id==='delw'){ const b = $('#delok'); if(b) b.disabled = e.target.value.trim().toUpperCase() !== DEL_WORD; } });
document.addEventListener('click', e=>{ const a = e.target.closest('[data-act="reset"],[data-act="resetall"]'); if(!a) return;
  e.stopPropagation(); e.preventDefault(); if(S.locked) return; delDialog(); }, true);
