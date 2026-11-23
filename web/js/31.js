/* =====================================================================
   39. VERSION 1.20.0 – WALLET IN BEIDE RICHTUNGEN, AUTOMATISCH
   • Wallet → App: alle 3 Minuten (solange die App offen ist) und beim Öffnen – ohne Knopf.
   • App → Wallet: Buchungen, die du hier (oder in der Web-Version) erfasst, trägt das Handy selbst in
     Wallet ein (offizielle Wallet-Schnittstelle, POST /records). Ändern und Löschen auch.
     Kategorien, die du hier bei Wallet-Buchungen änderst, werden in Wallet nachgeführt.
   So musst du nur noch in einer App erfassen. Daten gehen nur an rest.budgetbakers.com.
   ===================================================================== */
var WB_PULL_MS = 3*60*1000;
var wbPushOn = () => NATIVE && !!D?.walletApi?.token && D.walletApi.push !== false;
async function wbSend(method, path, body){
  const w = D.walletApi, tok = wbClean(w.token), url = WB_BASE + path;
  const headers = {Authorization:'Bearer '+tok, Accept:'application/json', 'Content-Type':'application/json'};
  let r;
  try{ r = await plug('CapacitorHttp').request({url, method, headers, data: body, responseType:'text', connectTimeout:20000, readTimeout:45000}); }
  catch(e){ throw new Error('Keine Verbindung zu Wallet: '+String(e?.message||e).slice(0,120)); }
  let j = null; try{ j = typeof r.data==='string' ? (r.data ? JSON.parse(r.data) : {}) : r.data; }catch(e){}
  if(r.status===401 || r.status===403) throw new Error('Wallet lehnt den Token ab (Fehler '+r.status+').');
  if(r.status===429){ const e = new Error('Wallet: zu viele Anfragen – später automatisch nochmals.'); e.later = true; throw e; }
  if(r.status>=500) { const e = new Error('Wallet ist gerade nicht erreichbar (Fehler '+r.status+').'); e.later = true; throw e; }
  return {status:r.status, j};
}
// Ergebnisse je Eintrag (Wallet antwortet mit «results» und «inputIndex»)
function wbResults(j, n){ const arr = Array.isArray(j) ? j : (j?.results || []), out = Array(n).fill(null);
  arr.forEach((o,k)=>{ const i = o && 'inputIndex' in o ? o.inputIndex : k; if(i>=0 && i<n) out[i] = o; }); return out; }

/* ---------- Zuordnung: Konten und Kategorien der App ↔ Wallet ---------- */
async function wbMaps(){
  if(S.wbMaps && Date.now()-S.wbMaps.at < 30*60*1000) return S.wbMaps;
  const accs = wbList(await wbGet('accounts'), 'accounts'), acc = {};
  for(const a of accs){ const local = D.accMap['wallet:'+String(a.name||a.id).slice(0,60)]; if(local && !acc[local]) acc[local] = a.id; }
  let cats = []; try{ let off = 0; for(let p=0;p<5;p++){ const j = await wbGet(`categories?limit=200&offset=${off}`); cats = cats.concat(wbList(j,'categories')); if(j?.nextOffset==null) break; off = j.nextOffset; } }catch(e){}
  const byName = {}; for(const c of cats) if(c?.id && c.name && !/transfer/i.test(c.systemId||'')) byName[bkNorm(c.name)] = c.id;
  return (S.wbMaps = {at:Date.now(), acc, byName});
}
function wbCatId(M, catId){
  const c = D.cats.find(x=>x.id===catId); if(!c) return null;
  const direct = M.byName[bkNorm(c.name)]; if(direct) return direct;
  for(const [k,v] of Object.entries(D.walletMap||{})) if(v===catId && M.byName[bkNorm(k)]) return M.byName[bkNorm(k)];
  return null;
}
var wbRecDate = t => t.d + 'T12:00:00Z';
var wbSigned = t => r2(t.c==='_inc' ? Math.abs(t.a) : -Math.abs(t.a));

/* ---------- App → Wallet ---------- */
var WBPUSHBUSY = false, WBPT = null;
function wbPushSoon(ms=2500){ if(!wbPushOn()) return; const wait = Math.max(ms, (S.wbHold||0)-Date.now()); clearTimeout(WBPT); WBPT = setTimeout(()=>wbPush(), wait); }
async function wbPush(){
  if(!wbPushOn() || WBPUSHBUSY || S.locked || !D) return; WBPUSHBUSY = true;
  const w = D.walletApi; w.pushSince ??= todayIso(); w.pushQ ??= {patch:{}, del:[]};
  let changed = false;
  try{
    // 1) neue eigene Buchungen
    const todo = D.tx.filter(t=>!t.imp && !t.wpush && !t.wpushErr && !isTr(t) && t.d>=w.pushSince && t.a && t.acc).slice(0,50);
    if(todo.length){
      const M = await wbMaps(), send = todo.filter(t=>M.acc[t.acc]), skip = todo.filter(t=>!M.acc[t.acc]);
      skip.forEach(t=>{ t.wpushErr = 'Konto ist keinem Wallet-Konto zugeordnet'; changed = true; });
      if(send.length){
        const body = send.map(t=>{ const o = {accountId:M.acc[t.acc], amount:{value:wbSigned(t)}, recordDate:wbRecDate(t), recordState:'cleared'};
          const cid = wbCatId(M, t.c); if(cid) o.categoryId = cid; if(t.n) o.note = String(t.n).slice(0,255); return o; });
        const {status, j} = await wbSend('POST', 'records', body), res = wbResults(j, send.length);
        send.forEach((t,i)=>{ const r = res[i];
          if(r && (r.success!==false) && (r.id || r.data?.id)){ t.wpush = r.id || r.data.id; changed = true; }
          else if(status===200 && !r){ t.wpushErr = 'Antwort von Wallet unklar – bitte in Wallet prüfen'; changed = true; }
          else if(r && r.success===false){ t.wpushErr = String(r.error?.message || r.error || 'von Wallet abgelehnt').slice(0,160); changed = true; } });
      }
    }
    // 2) Änderungen (Betrag, Datum, Text, Kategorie)
    const pids = Object.keys(w.pushQ.patch).slice(0,10);
    if(pids.length){
      const M = await wbMaps(), items = [], keys = [];
      for(const wid of pids){ const t = D.tx.find(x=>x.wpush===wid || x.id==='wb_'+wid); if(!t){ delete w.pushQ.patch[wid]; continue; }
        const o = {id:wid}, cid = wbCatId(M, t.c); if(cid) o.categoryId = cid;
        if(!t.imp){ o.amount = {value:wbSigned(t)}; o.recordDate = wbRecDate(t); o.note = t.n ? String(t.n).slice(0,255) : null; if(M.acc[t.acc]) o.accountId = M.acc[t.acc]; }
        items.push(o); keys.push(wid); }
      if(items.length){ await wbSend('PATCH', 'records', items); keys.forEach(k=>delete w.pushQ.patch[k]); changed = true; }
    }
    // 3) Löschungen
    const dels = w.pushQ.del.slice(0,10);
    if(dels.length){ await wbSend('DELETE', 'records', {ids:dels}); w.pushQ.del = w.pushQ.del.slice(dels.length); changed = true; }
    w.pushErr = null; w.pushAt = new Date().toISOString(); S.wbHold = 0;
  }catch(e){ w.pushErr = e.message||String(e); changed = true; S.wbHold = Date.now() + (e.later ? 5 : 2)*60*1000; }
  finally{ WBPUSHBUSY = false; if(changed){ save(); } }
}
// Buchung bearbeitet → Änderung vormerken (eigene schon übertragene oder aus Wallet stammende)
var _txDialog1200 = txDialog;
txDialog = function(t, preset={}, onDone){
  const before = t ? JSON.stringify([t.a, t.d, t.n, t.c, t.acc]) : null;
  _txDialog1200(t, preset, x=>{ onDone?.(x);
    const wid = x.wpush || (String(x.id||'').startsWith('wb_') ? x.id.slice(3) : null);
    if(wid && wbPushOn() && JSON.stringify([x.a, x.d, x.n, x.c, x.acc])!==before){ D.walletApi.pushQ ??= {patch:{}, del:[]}; D.walletApi.pushQ.patch[wid] = 1; }
    if(wbPushOn()) wbPushSoon(); });
};
// Buchung gelöscht → auch in Wallet löschen
var _markDel1200 = markDel;
markDel = function(id){
  _markDel1200(id);
  if(!D?.walletApi?.token || D.walletApi.push===false) return;
  const t = D.tx.find(x=>x.id===id), wid = t?.wpush || (String(id).startsWith('wb_') ? String(id).slice(3) : (D.walletApi.pushIds||{})[id]);
  if(wid){ D.walletApi.pushQ ??= {patch:{}, del:[]}; if(!D.walletApi.pushQ.del.includes(wid)) D.walletApi.pushQ.del.push(wid); wbPushSoon(); }
};
// Merkliste lokale Id → Wallet-Id (falls die Buchung beim Löschen schon entfernt ist)
var _save1200 = save;
save = function(){ if(D?.walletApi){ const m = {}; for(const t of D.tx) if(t.wpush) m[t.id] = t.wpush; D.walletApi.pushIds = m; } const r = _save1200.apply(this, arguments); if(wbPushOn() && D.tx.some(t=>!t.imp && !t.wpush && !t.wpushErr && t.d>=(D.walletApi.pushSince||'9999'))) wbPushSoon(); return r; };
// Beim Abholen aus Wallet: Buchungen, die von hier kamen, nicht doppelt übernehmen
var _bkApply1200 = bkApply;
bkApply = function(results, opt){
  if(D?.tx){ const pushed = new Set(D.tx.map(t=>t.wpush).filter(Boolean)); for(const r of results||[]) if(r?.f?.wallet && Array.isArray(r.list)) r.list = r.list.filter(x=>!x.wid || !pushed.has(x.wid)); }
  return _bkApply1200(results, opt);
};

/* ---------- Wallet → App: automatisch, ohne Knopf ---------- */
function wbAutoPull(){
  if(!NATIVE || !D || S.locked || !D.walletApi?.token || D.walletApi.auto===false || document.visibilityState!=='visible' || $('#dlg')?.open) return;
  const last = D.walletApi.last ? new Date(D.walletApi.last).getTime() : 0;
  if(Date.now()-last >= WB_PULL_MS) wbSync({quiet:true}).then(()=>wbPush());
}
setInterval(wbAutoPull, 30*1000);
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') setTimeout(wbAutoPull, 1500); });

/* ---------- Anzeige auf der Wallet-Seite ---------- */
var _vWallet1200 = vWallet;
vWallet = function(){
  let h = _vWallet1200(); if(!NATIVE || !D.walletApi?.token) return h;
  const w = D.walletApi, sent = D.tx.filter(t=>t.wpush).length, errs = D.tx.filter(t=>t.wpushErr), open = D.tx.filter(t=>!t.imp && !t.wpush && !t.wpushErr && !isTr(t) && t.d>=(w.pushSince||'9999')).length;
  const box = `<div class="card"><h3>Automatischer Abgleich <span class="tag g">an</span></h3>
    <p class="small muted">Du musst nichts mehr anklicken. <b>Wallet → App:</b> alle 3 Minuten, solange die App offen ist, und beim Öffnen.${w.last?' Zuletzt: '+new Date(w.last).toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'})+'.':''}</p>
    ${chk('wbpush', w.push!==false, '<b>App → Wallet:</b> Buchungen, die ich hier erfasse, ändere oder lösche, automatisch auch in Wallet nachführen')}
    <p class="small muted" style="margin:4px 0 0">${w.push!==false?`Übertragen: ${sent}${open?` · wartend: ${open}`:''}${w.pushSince?` · ab ${dShort(w.pushSince)}`:''}`:'Aus – Buchungen bleiben nur in dieser App.'}</p>
    ${w.pushErr?`<p class="small neg">${esc(w.pushErr)}</p>`:''}
    ${errs.length?`<p class="small neg">${errs.length} Buchung(en) nicht übertragen: ${esc(errs[0].wpushErr)}. <a class="link" data-act="wbpushretry">Nochmals versuchen</a></p>`:''}</div>`;
  return h.replace(/Die App holt deine Buchungen[^<]*/, 'Die App gleicht automatisch in beide Richtungen ab – du musst nichts anklicken. Was du schon per Bankdatei importiert hast, wird nicht doppelt übernommen.') + box;
};
document.addEventListener('change', e=>{ if(e.target.id!=='wbpush' || !D?.walletApi) return;
  D.walletApi.push = e.target.checked; if(e.target.checked && !D.walletApi.pushSince) D.walletApi.pushSince = todayIso(); save(); render(); if(e.target.checked) wbPush(); });
document.addEventListener('click', e=>{ const a = e.target.closest('[data-act="wbpushretry"]'); if(!a || !D) return; e.stopPropagation();
  D.tx.forEach(t=>{ delete t.wpushErr; }); S.wbMaps = null; save(); wbPush().then(()=>render()); }, true);
// Beim ersten Start dieser Version: App → Wallet ab heute einschalten
var _render1200 = render;
render = function(){ _render1200(); if(D && !S.locked && D.walletApi?.token && !D.flags?.wbpush120){ (D.flags ??= {}).wbpush120 = 1; D.walletApi.push ??= true; D.walletApi.pushSince ??= todayIso(); S.noDirty = true; save(); S.noDirty = false; } };
