/* =====================================================================
   50. VERSION 1.28.0 (Teil 3) – BUDGET MITNEHMEN, REGELN AUS WALLET, AUSGABE · EINNAHME · ÜBERTRAG
   • Budget: Jede Wallet-Kategorie zählt in das Budget der Kategorie, in der ihre Buchungen
     bisher lagen (z. B. «Gas» → Budget «Miete»). Änderbar unter Kategorie bearbeiten.
   • Automatische Regeln aus Wallet werden übernommen (Stichwörter, Typ, Kategorie/Überweisung, Konto)
     und laufend nachgeführt.
   • Neue Buchung wie in Wallet: oben Ausgabe · Einnahme · Übertrag. Übertrag = von Konto → auf Konto,
     zählt nicht als Ausgabe, geht als Überweisung an Wallet.
   ===================================================================== */
/* ---------- Budget: Wallet-Kategorie → Budget-Kategorie ---------- */
var _calc1282 = calc;
calc = function(){
  if(!D?.tx) return _calc1282.apply(this, arguments);
  const bud = new Map(); for(const c of D.cats) if(c.bud && D.cats.some(x=>x.id===c.bud && !x.wid)) bud.set(c.id, c.bud);
  const sw = []; if(bud.size) for(const t of D.tx){ const b = bud.get(t.c); if(b){ sw.push([t, t.c]); t.c = b; } }
  try{ return _calc1282.apply(this, arguments); } finally { for(const [t,v] of sw) t.c = v; }
};
// Kategorie bearbeiten: «zählt ins Budget»
catDialog = (prev => function(c){
  prev(c); if(!c?.wid) return;
  $('#cg')?.closest('label')?.insertAdjacentHTML('afterend', `<label class="f">Zählt ins Budget von<select id="cbud"><option value="">– eigenes Budget –</option>${D.cats.filter(x=>!x.wid && !x.archived).map(x=>`<option value="${x.id}" ${x.id===c.bud?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>`);
  $('#cbud')?.addEventListener('change', e=>{ c.bud = e.target.value || undefined; save(); });
})(catDialog);

/* ---------- Automatische Regeln aus Wallet ---------- */
async function wbRuleSync(force){
  if(!wbNet() || !D?.walletApi?.token) return;
  const w = D.walletApi; if(!force && w.ruleAt && Date.now()-new Date(w.ruleAt) < 60*60*1000) return;
  let all = [], off = 0;
  for(let p=0;p<5;p++){ const j = await wbGet(`record-rules?limit=200&offset=${off}`), l = wbList(j,'recordRules'); all = all.concat(l); if(j?.nextOffset==null || !l.length) break; off = j.nextOffset; }
  const accByWid = {}; for(const a of D.accounts) if(a.wid) accByWid[a.wid] = a.id;
  const catByWid = {}; for(const c of D.cats) if(c.wid) catByWid[c.wid] = c.id;
  const seen = new Set(); let made = 0;
  for(const r of all){ if(!r?.id) continue; seen.add(r.id);
    const kws = (r.keywords||[]).map(k=>String(k).replace(/^\*/,'').trim()).filter(Boolean); if(!kws.length) continue;
    const ty = String(r.recordType||r.type||'').toLowerCase(), isTrf = !!(r.toAccountId || /transfer/.test(ty) || /transfer/i.test(r.category?.systemId||''));
    const cat = isTrf ? BK_TRANSFER : (catByWid[r.category?.id] || (r.category?.name && D.walletMap[String(r.category.name).toUpperCase()]) || '');
    if(!cat) continue;
    const nr = {name:String(r.name||kws[0]).slice(0,60), text:kws.join(', '), dir: isTrf ? '' : ty==='expense' ? 'out' : ty==='income' ? 'in' : '', acc: accByWid[r.fromAccountId] || '', cat, min:0, max:0, wid:r.id};
    const ex = D.rules.find(x=>x.wid===r.id);
    if(ex){ if(!ex.userEdit) Object.assign(ex, nr, {id:ex.id, off:ex.off}); } else { D.rules.push({id:'r'+uid(), ...nr}); made++; }
  }
  D.rules = D.rules.filter(x=>!x.wid || seen.has(x.wid) || x.userEdit);   // in Wallet gelöschte Regeln entfernen
  w.ruleAt = new Date().toISOString(); save();
  if(made) toastMsg(`${made} automatische Regel(n) übernommen`);
}
wbAccountsSync = (prev => async function(){ await prev(); try{ await wbRuleSync(); }catch(e){} })(wbAccountsSync);
// Regel von Hand geändert → nicht mehr überschreiben
ruleDialog = (prev => function(i){ prev(i); if(i!=null && D.rules[i]?.wid) $('#rn')?.closest('label')?.insertAdjacentHTML('beforebegin', '<p class="small muted" style="margin:-4px 0 8px">Aus Wallet übernommen. Wenn du sie hier änderst, wird sie nicht mehr automatisch nachgeführt.</p>'); })(ruleDialog);
document.addEventListener('click', e=>{ const b = e.target.closest('#dlg [data-dlg="ok"],#dlg .btn.pri'); if(b && $('#rt') && S.view==='autoregeln'){ const n = val('rn'), r = D.rules.find(x=>x.wid && (x.name===n)); if(r) r.userEdit = true; } }, true);

/* ---------- Ausgabe · Einnahme · Übertrag ---------- */
txDialog = (prev => function(t, preset={}, onDone){
  const isTrf = t && isTr(t) && !t.imp;
  prev(t, preset, x=>{
    const ty = S.txType || 'out';
    if(ty==='tr'){ x.c = BK_TRANSFER; x.ta = Math.abs(x.a); x.a = 0; x.acc = val('fk') || x.acc; x.toAcc = val('fto') || x.toAcc; }
    else if(ty==='in'){ x.c = '_inc'; const k = val('fk'); if(k) x.acc = k; }
    onDone?.(x);
  });
  const dlg = $('#dlg'); if(!dlg || !$('#fc')) return;
  const cur = isTrf ? 'tr' : (t?.c==='_inc' ? 'in' : 'out'); S.txType = cur;
  const seg = `<div class="ttype" role="tablist">${[['out','Ausgabe'],['in','Einnahme'],['tr','Übertrag']].map(([k,l])=>`<button type="button" role="tab" data-tt="${k}" class="${k===cur?'on':''}">${l}</button>`).join('')}</div>`;
  dlg.querySelector('h3')?.insertAdjacentHTML('afterend', seg);
  $('#fk')?.closest('label')?.insertAdjacentHTML('afterend', `<label class="f" id="ftol">Auf Konto<select id="fto">${activeAccs().map(a=>`<option value="${a.id}" ${a.id===(t?.toAcc)?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label>`);
  if(isTrf){ $('#fa').value = chf(t.ta||0); }
  const apply = k => { S.txType = k; dlg.querySelectorAll('.ttype button').forEach(b=>b.classList.toggle('on', b.dataset.tt===k));
    const cl = $('#fc').closest('label'), fl = $('#fk').closest('label');
    cl.style.display = k==='tr' ? 'none' : ''; $('#ftol').style.display = k==='tr' ? '' : 'none';
    fl.firstChild.textContent = k==='tr' ? 'Von Konto' : k==='in' ? 'Auf Konto' : 'Bezahlt von';
    if(k==='in') $('#fc').value = '_inc'; else if($('#fc').value==='_inc') $('#fc').value = '';
    if(k==='tr'){ let o = $('#fc').querySelector(`option[value="${BK_TRANSFER}"]`); if(!o){ $('#fc').insertAdjacentHTML('beforeend', `<option value="${BK_TRANSFER}">Übertrag</option>`); } $('#fc').value = BK_TRANSFER; } };
  dlg.querySelectorAll('.ttype button').forEach(b=>b.addEventListener('click', ()=>apply(b.dataset.tt)));
  apply(cur);
})(txDialog);

// Kontostand: von Hand erfasste Überträge (noch nicht von Wallet bestätigt)
bankBalance = (prev => function(accId){
  const b = prev(accId); if(!b || !b.wallet) return b; const at = D.bal[accId]?.at || '';
  let v = b.v; for(const t of D.tx){ if(t.imp || t.wpush || !isTr(t) || !t.ta || (t.created||'') <= at) continue;
    if(t.acc===accId) v -= t.ta; if(t.toAcc===accId) v += t.ta; }
  return {...b, v:r2(v)};
})(bankBalance);
// Übertrag an Wallet senden (als Überweisung)
wbPush = (prev => async function(){
  await prev();
  if(!wbPushOn() || !D) return;
  const todo = D.tx.filter(t=>!t.imp && !t.wpush && !t.wpushErr && isTr(t) && t.ta && t.toAcc && t.acc!==t.toAcc && t.d>=(D.walletApi.pushSince||'9999') && (t.dev ? t.dev===DEVID : NATIVE)).slice(0,20);
  if(!todo.length) return;
  try{
    const M = await wbMaps(), send = todo.filter(t=>M.acc[t.acc] && M.acc[t.toAcc]);
    todo.filter(t=>!send.includes(t)).forEach(t=>t.wpushErr = 'Konto ist keinem Wallet-Konto zugeordnet');
    if(send.length){
      const body = send.map(t=>({accountId:M.acc[t.acc], amount:{value:-Math.abs(t.ta)}, recordDate:wbRecDate(t), recordState:'cleared', ...(t.n?{note:String(t.n).slice(0,255)}:{}), transfer:{pairingMode:'new', accountId:M.acc[t.toAcc]}}));
      const {j} = await wbSend('POST', 'records', body), res = wbResults(j, send.length);
      send.forEach((t,i)=>{ const r = res[i]; if(r && r.success!==false && (r.id||r.data?.id)){ t.wpush = r.id||r.data.id; t.wpush2 = r.createdMirrorRecordId; } else if(r?.success===false) t.wpushErr = String(r.error?.message||r.error||'abgelehnt').slice(0,160); });
    }
    save();
  }catch(e){}
})(wbPush);
// Wallet-Gegenbuchung eines gesendeten Übertrags nicht doppelt übernehmen
bkApply = (prev => function(results, opt){
  if(D?.tx){ const mirror = new Set(D.tx.map(t=>t.wpush2).filter(Boolean)); for(const r of results||[]) if(r?.f?.wallet && Array.isArray(r.list)) r.list = r.list.filter(x=>!x.wid || !mirror.has(x.wid)); }
  return prev(results, opt);
})(bkApply);
