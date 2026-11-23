/* =====================================================================
   42. VERSION 1.23.0 – OHNE BESTÄTIGEN, KONTEN NACH BEDEUTUNG GRUPPIERT
   • Wallet-Abgleich fragt nichts mehr: keine «OK»-Meldung nach jedem Abgleich, keine
     Zuordnungs-Abfrage für neue Konten (sie werden vorher automatisch angelegt).
   • Nach dem Entsperren startet der Abgleich (Wallet und Web) sofort.
   • Konten auf der Startseite nach Bedeutung gruppiert: Zahlungskonten & Bargeld, Sparen & Haushalt,
     Karten, Fremdwährung, Vorsorge & Anlagen. Gruppe pro Konto änderbar (Konto antippen → Aussehen).
   ===================================================================== */
// 1) Keine Bestätigungen
wbBanner = function(){ return ''; };
var _wbSync1230 = wbSync;
wbSync = async function(opt={}){
  try{ await wbFixAccMap(); }catch(e){}            // neue Wallet-Konten vorher anlegen → keine Abfrage
  const r = await _wbSync1230(opt); S.wbMsg = null; return r;
};
// 2) Direkt nach dem Entsperren abgleichen
var _render1230 = render;
render = function(){
  const was = S._wasLocked; if(D && !S.locked) fixPfType(); _render1230(); S._wasLocked = !!S.locked;
  if(was && !S.locked && D){ setTimeout(()=>{ try{ if(typeof ghOn==='function' && ghOn()) ghSync(); }catch(e){} if(D.walletApi) D.walletApi.last = null; wbAutoPull(); }, 400); }
};

// «PostFinance» ist kein Kredit (früher wurde «finance» im Namen als Kredit erkannt)
var _wTypeOf1230 = wTypeOf;
wTypeOf = function(raw, name){ return _wTypeOf1230(raw, String(name||'').replace(/post\s*finance/ig,'')); };
function fixPfType(){ if(!D || D.flags?.pf123) return; for(const a of D.accounts) if(a.wtype==='kredit' && /post\s*finance/i.test(a.name) && !/kredit|darlehen|leasing/i.test(a.name)){ a.wtype = wTypeOf('', a.name); if(a.wtype!=='karte' && a.kind==='debt') a.kind = 'asset'; } (D.flags ??= {}).pf123 = 1; S.noDirty = true; save(); S.noDirty = false; }

// 3) Konten nach Bedeutung gruppieren
var ACC_GRP = [['alltag','Zahlungskonten & Bargeld'],['sparen','Sparen & Haushalt'],['karte','Karten'],['fx','Fremdwährung'],['vorsorge','Vorsorge & Anlagen']];
function accGrp(a){
  if(a.grp && ACC_GRP.some(g=>g[0]===a.grp)) return a.grp;
  const n = String(a.name||'').toLowerCase(), t = a.wtype || wTypeOf('', a.name);
  if(/3a|säule|saule|vorsorge|invest|depot|anlage|aktie|etf|pension/.test(n) || t==='anlage' || t==='vorsorge') return 'vorsorge';
  if(accCur(a)!=='CHF') return 'fx';
  if(/spar|haushalt|rückstell|ruckstell|reserve|notgroschen/.test(n) || t==='spar') return 'sparen';
  if(/kreditkarte|karte|revolut|visa|master|amex/.test(n) || t==='karte' || (t==='kredit' && !/post\s*finance/.test(n))) return 'karte';
  return 'alltag';
}
var _homeAccounts1230 = homeAccounts;
homeAccounts = function(){
  const h = _homeAccounts1230();
  const box = document.createElement('div'); box.innerHTML = h;
  const grid = box.querySelector('.hacc'); if(!grid) return h;
  const tiles = [...grid.querySelectorAll('.htile[data-id]')], add = grid.querySelector('.htile.add');
  const by = {}; for(const el of tiles){ const a = D.accounts.find(x=>x.id===el.dataset.id); const g = a ? accGrp(a) : 'alltag'; (by[g] ??= []).push(el.outerHTML); }
  const parts = ACC_GRP.filter(([g])=>by[g]?.length).map(([g,l])=>`<div class="hgrp">${l}</div><div class="hacc">${by[g].join('')}</div>`);
  grid.outerHTML = parts.join('') + (add ? `<div class="hacc">${add.outerHTML}</div>` : '');
  return box.innerHTML;
};
// Gruppe im Aussehen-Dialog wählbar
var _lookDialog1230 = lookDialog;
lookDialog = function(id){
  _lookDialog1230(id); const a = D.accounts.find(x=>x.id===id); if(!a) return;
  $('#lkt')?.closest('label')?.insertAdjacentHTML('beforebegin', `<label class="f mt">Gruppe auf der Startseite<select id="lkg">${ACC_GRP.map(([g,l])=>`<option value="${g}" ${accGrp(a)===g?'selected':''}>${l}</option>`).join('')}</select></label>`);
};
document.addEventListener('change', e=>{ if(e.target.id!=='lkg' || !D) return; const n = $('#lkn')?.value; const a = D.accounts.find(x=>x.name===n) || null;
  const id = S.lookId; const acc = D.accounts.find(x=>x.id===id) || a; if(acc){ acc.grp = e.target.value; save(); } });
var _lookDialog1230b = lookDialog;
lookDialog = function(id){ S.lookId = id; _lookDialog1230b(id); };
