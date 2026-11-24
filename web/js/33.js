/* =====================================================================
   41. VERSION 1.22.0 – JEDES WALLET-KONTO EINZELN, GEPLANTE ZAHLUNGEN AUS WALLET
   • Früher konnten mehrere Wallet-Konten auf dasselbe App-Konto zeigen (z. B. Bargeld CHF/EUR/USD)
     oder auf «nicht übernehmen» stehen. Jetzt bekommt jedes Wallet-Konto sein eigenes App-Konto
     (gleiche Währung), und seine Buchungen werden nachgeholt bzw. richtig zugeordnet.
   • Geplante Zahlungen aus Wallet (Daueraufträge) erscheinen bei «Bevorstehende Zahlungen»,
     im Kalender und im Ausblick.
   ===================================================================== */
function wbRecItem(r, wname){
  let v = +(r.amount?.value ?? r.amount); if(r.recordType==='expense' && v>0) v = -v;
  return {wid:r.id, d:String(r.recordDate).slice(0,10), sa:r2(v), text:[r.counterParty||r.payee, r.note].filter(Boolean).join(' · ') || (r.category?.name||'Wallet'), saldo:NaN,
    wcat:String(r.category?.name||'').slice(0,80), wacc:wname, wtransfer: r.recordType==='transfer' || !!r.transfer};
}
// Alle Buchungen eines Wallet-Kontos (für neu angelegte oder neu zugeordnete Konten)
async function wbAccRecords(wid){
  let all = [], off = 0;
  for(let p=0; p<25; p++){ const j = await wbGet(`records?accountId=${encodeURIComponent(wid)}&recordDate=gte.2010-01-01&limit=200&offset=${off}`), recs = wbList(j,'records');
    all = all.concat(recs); if(j?.nextOffset==null || !recs.length) break; off = j.nextOffset; }
  return all.filter(r=>r && r.id && r.recordDate);
}
// Zuordnung bereinigen: jedes Wallet-Konto ↔ genau ein App-Konto mit gleicher Währung
async function wbFixAccMap(){
  if(!NATIVE || !D?.walletApi?.token) return;
  const raw = wbList(await wbGet('accounts'), 'accounts').filter(a=>a && a.id && !a.archived);
  if(!raw.length) return;
  raw.sort((x,y)=>(x.position ?? 0)-(y.position ?? 0));
  const used = new Map(), redo = [];
  for(const w of raw){
    const wname = String(w.name||w.id).slice(0,60), key = 'wallet:'+wname, cur = wbAccCur(w), local = D.accMap[key];
    const a = local ? D.accounts.find(x=>x.id===local) : null;
    const clash = a && used.has(a.id), curBad = a && accCur(a)!==cur;
    if(a && !clash && !curBad){ used.set(a.id, wname); continue; }
    // eigenes Konto anlegen (Name und Währung wie in Wallet)
    const t = wTypeOf(w.accountType || w.type, wname), debt = t==='karte' || t==='kredit';
    let mine = D.accounts.find(x=>x.name===wname && accCur(x)===cur && !used.has(x.id));
    if(!mine){ mine = {id:'w'+uid(), name:wname, kind:debt?'debt':'asset', rate:0, startYm:C.now, start:0, out:0, outM:{}, abos:false, wtype:t, cur:cur==='CHF'?undefined:cur};
      if(t==='bar' || t==='konto') mine.liquid = true; D.accounts.push(mine); }
    D.accMap[key] = mine.id; used.set(mine.id, wname); redo.push({w, wname, acc:mine.id});
  }
  // Buchungen dieser Konten nachholen bzw. umhängen
  for(const x of redo){
    let recs = []; try{ recs = await wbAccRecords(x.w.id); }catch(e){ continue; }
    const ids = new Set(recs.map(r=>'wb_'+String(r.id).slice(0,80)));
    for(const t of D.tx) if(ids.has(t.id)) t.bacc = x.acc;
    const fresh = recs.map(r=>wbRecItem(r, x.wname)).filter(i=>i.d && isFinite(i.sa) && i.sa && !D.tx.some(t=>t.id==='wb_'+String(i.wid).slice(0,80)));
    if(fresh.length) bkApply([{file:'Wallet', f:{wallet:true, bank:'Wallet', accKey:'wallet'}, list:fresh}], {quiet:true});
  }
  if(redo.length){ save(); S.wbMaps = null; }
  if(redo.length) toastMsg(`${redo.length} Wallet-Konto/Konten eigenständig angelegt und Buchungen zugeordnet`);
}
var _wbAccountsSync1220 = wbAccountsSync;
wbAccountsSync = async function(){
  try{ await wbFixAccMap(); }catch(e){}
  await _wbAccountsSync1220();
  try{ await wbPlannedSync(); }catch(e){}
};
/* ---------- Geplante Zahlungen aus Wallet ---------- */
async function wbPlannedSync(){
  const w = D.walletApi; if(w.plannedAt && Date.now()-new Date(w.plannedAt) < 30*60*1000 && (w.planned||[]).every(p=>'ty' in p)) return;
  let list = [], off = 0;
  for(let p=0;p<5;p++){ const j = await wbGet(`standing-orders?limit=200&offset=${off}`), l = wbList(j,'standingOrders'); list = list.concat(l); if(j?.nextOffset==null || !l.length) break; off = j.nextOffset; }
  const byWid = {}; for(const [k,v] of Object.entries(D.accMap)) if(k.startsWith('wallet:') && v){ const a = D.accounts.find(x=>x.id===v); if(a?.wid) byWid[a.wid] = a.id; }
  w.planned = list.filter(o=>o && o.id && o.dueDate && +o.amount).map(o=>{ let v = +o.amount; const ty = String(o.type||'').toLowerCase(); if(ty==='income') v = Math.abs(v); else if(ty==='expense') v = -Math.abs(v);
    const f = /FREQ=(\w+)/i.exec(String(o.recurrenceRule||'')), iv = /INTERVAL=(\d+)/i.exec(String(o.recurrenceRule||''));
    return {id:o.id, n:String(o.name||o.counterParty||'Geplante Zahlung').slice(0,60), acc:byWid[o.accountId]||null, v:r2(v), cur:String(o.currencyCode||'CHF').toUpperCase(),
      due:String(o.dueDate).slice(0,10), freq:f?f[1].toUpperCase():null, iv:iv?+iv[1]:1, cat:o.categoryId||null, ty, to:o.toAccountId?(byWid[o.toAccountId]||'x'):null}; });
  w.plannedAt = new Date().toISOString(); save();
}
function wbPlannedOcc(from, until){
  const out = [], step = (d,p) => p.freq==='DAILY' ? dAdd(d,p.iv) : p.freq==='WEEKLY' ? dAdd(d,7*p.iv) : p.freq==='YEARLY' ? ymAdd(d.slice(0,7),12*p.iv)+d.slice(7) : p.freq==='MONTHLY' ? ymAdd(d.slice(0,7),p.iv)+'-'+String(Math.min(+d.slice(8,10), +mEnd(ymAdd(d.slice(0,7),p.iv)).slice(8))).padStart(2,'0') : null;
  for(const p of D.walletApi?.planned||[]){
    let d = p.due, k = 0;
    while(d && d<=until && k++<60){ if(d>=from) out.push({d, n:p.n, sub:'Wallet'+(p.acc?' · '+accName(p.acc):''), v:-p.v, c:(p.cat && D.cats.find(c=>c.wid===p.cat)?.id)||null, go:'kalender', wp:p.id}); d = step(d,p); }
  }
  return out;
}
var _upcoming1220 = upcoming;
upcoming = function(days=35){
  const l = _upcoming1220(days), today = todayIso(), until = dAdd(today, days);
  for(const x of wbPlannedOcc(dAdd(today,-20), until))
    if(!l.some(y=>Math.abs(Math.abs(y.v)-Math.abs(x.v))<1 && Math.abs(dDiff(y.d,x.d))<=3)) l.push(x);
  return l.sort((a,b)=>a.d.localeCompare(b.d));
};
// Kontenliste kurz zwischenspeichern, damit ein Abgleich Wallet nur einmal danach fragt (Limit 300/Std.)
var _wbGet1220 = wbGet;
wbGet = async function(path){
  if(path.startsWith('accounts')){ if(S.wbAccC && Date.now()-S.wbAccC.at < 20000) return S.wbAccC.j; const j = await _wbGet1220(path); S.wbAccC = {at:Date.now(), j}; return j; }
  return _wbGet1220(path);
};
