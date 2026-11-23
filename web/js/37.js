/* =====================================================================
   45. VERSION 1.26.0 – PRO KONTO: ZÄHLT / ZÄHLT NICHT, FEHLENDE KONTEN SICHTBAR
   • Du bestimmst für jedes Konto selbst, ob es im Saldo zählt. Deine Wahl bleibt –
     der Abgleich überschreibt sie nicht mehr.
   • Saldo = alle Konten, die du auf «zählt» gestellt hast (auch Konten nur in der App).
   • Seite «Konten»: Liste aller Konten mit Stand und Schalter «zählt im Saldo».
   • Unter Einstellungen → Wallet-Verbindung: welches Wallet-Konto zu welchem App-Konto gehört,
     und ob eines fehlt – mit «Neu anlegen».
   ===================================================================== */
// Eigene Wahl merken und nach jedem Abgleich wieder anwenden
function statsPrefApply(){ const p = D?.statsPref; if(!p) return; for(const a of D.accounts) if(a.id in p){ if(p[a.id]) delete a.nostats; else a.nostats = true; } }
function statsPrefSet(id, on){ (D.statsPref ??= {})[id] = !!on; statsPrefApply(); save(); render(); }
var _wbAccountsSync1260 = wbAccountsSync;
wbAccountsSync = async function(){
  await _wbAccountsSync1260();
  statsPrefApply();
  try{ const raw = wbList(await wbGet('accounts'), 'accounts').filter(a=>a && a.id && !a.archived);   // aus Zwischenspeicher
    D.walletApi.accList = raw.map(w=>{ const n = String(w.name||w.id).slice(0,60), loc = D.accMap['wallet:'+n];
      return {n, cur:wbAccCur(w), loc: loc || '', ok: !!(loc && D.accounts.some(a=>a.id===loc && !a.archived))}; });
    // Namen wie in Wallet (ausser du hast ein Konto selbst umbenannt) – so fehlt keines «unter falschem Namen»
    let ren = 0; for(const x of D.walletApi.accList){ const a = x.ok && D.accounts.find(z=>z.id===x.loc); if(a && !a.nameUser && a.name!==x.n){ a.name = x.n; ren++; } }
    if(ren) save();
  }catch(e){}
};
document.addEventListener('change', e=>{ if(e.target.id==='lkn' && D && S.lookId){ const a = D.accounts.find(x=>x.id===S.lookId); if(a) a.nameUser = true; } });
// Aussehen-Dialog: Häkchen «Zählt in Statistik» als feste Wahl merken
document.addEventListener('change', e=>{ if(e.target.id==='lks' && D && S.lookId){ (D.statsPref ??= {})[S.lookId] = e.target.checked; } });
// Saldo: alle Konten, die zählen
var _homeAccounts1260 = homeAccounts;
homeAccounts = function(){
  statsPrefApply();
  const h = _homeAccounts1260();
  const tot = activeAccs().filter(a=>!a.archived && inStats(a)).reduce((s,a)=>s+(accVal(a)||0),0);
  return h.replace(/(<span class="small muted">Saldo<\/span><b class="num)[^"]*(">)CHF [^<]*(<\/b>)/, `$1 ${tot<0?'neg':''}$2CHF ${signChf(tot)}$3`);
};
// Seite «Konten»: Schalter pro Konto
function cardAccCount(){
  const accs = activeAccs().filter(a=>!a.archived);
  return `<div class="card" id="acccount"><h3>Welche Konten zählen im Saldo?</h3>
    <p class="small muted" style="margin-top:-6px">Tippe den Schalter an. Deine Wahl bleibt, auch nach dem Abgleich.</p>
    ${accs.map(a=>{ const on = !a.nostats && !a.archived; const v = accValRaw(a);
      return `<label class="li acl"><span class="sp"><b>${esc(a.name)}</b><br><span class="small muted">${accCur(a)} ${signChf(v)}</span></span>
        <input type="checkbox" class="sw" data-acc="${a.id}" ${on?'checked':''}></label>`; }).join('')}
    <p class="small muted mt">Saldo: <b>CHF ${signChf(accs.filter(inStats).reduce((s,a)=>s+(accVal(a)||0),0))}</b></p></div>`;
}
var _render1260 = render;
render = function(){
  _render1260(); if(!D || S.locked) return;
  if(S.view==='konten' && !$('#acccount')) $('#main')?.insertAdjacentHTML('afterbegin', cardAccCount());
  if(S.view==='wallet' && NATIVE && D.walletApi?.token && !$('#wbmapcard')){
    const L = D.walletApi.accList || [], miss = L.filter(x=>!x.ok);
    $('#main')?.insertAdjacentHTML('beforeend', `<div class="card" id="wbmapcard"><h3>Konten-Zuordnung ${miss.length?`<span class="tag r">${miss.length} fehlt</span>`:'<span class="tag g">alle da</span>'}</h3>
      ${L.length ? L.map(x=>`<div class="li small"><span class="sp">${esc(x.n)} <span class="muted">(${x.cur})</span></span><span>${x.ok ? '→ '+esc(accName(x.loc)) : '<b class="neg">fehlt</b>'}</span></div>`).join('') : '<p class="small muted">Wird beim nächsten Abgleich geladen.</p>'}
      <button class="btn sm mt" data-act="wbremap">${miss.length?'Fehlende Konten neu anlegen':'Zuordnung neu prüfen'}</button></div>`);
  }
};
document.addEventListener('change', e=>{ const id = e.target?.dataset?.acc; if(!id || !D || !e.target.classList.contains('sw')) return; statsPrefSet(id, e.target.checked); });
document.addEventListener('click', async e=>{ const b = e.target.closest('[data-act="wbremap"]'); if(!b || !D) return; e.stopPropagation();
  b.disabled = true; b.textContent = 'Prüfe …';
  for(const x of D.walletApi.accList||[]) if(!x.ok) delete D.accMap['wallet:'+x.n];    // kaputte Zuordnung lösen → wird neu angelegt
  S.wbAccC = null; try{ await wbAccountsSync(); }catch(err){}
  save(); render(); toastMsg('Konten geprüft'); }, true);
