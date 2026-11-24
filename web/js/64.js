/* =====================================================================
   66. GERÄTE-ABGLEICH OHNE VERLUSTE (Drei-Wege-Abgleich)
   Bisher galt beim Abgleich: Wer zuletzt gespeichert hat, gewinnt – für alles ausser den Buchungen.
   Das Handy speichert laufend (z. B. neue Kontostände aus Wallet) und überschrieb so Änderungen vom PC
   an Budget, geplanten Zahlungen, Kategorien usw.
   Neu merkt sich jedes Gerät den zuletzt gemeinsamen Stand («Basis»). Beim Abgleich wird pro Feld
   entschieden: nur hier geändert → das gilt; nur dort geändert → das gilt; beide geändert → das neuere.
   Gilt auch für einzelne Buchungen (z. B. Kategorie am PC geändert).
   ===================================================================== */
var SB_ARR = ['tx','wishes','goals','yearly','abos','acts'];
var SB_SKIP = new Set(['sync','walletSync','alerts','_p','_sb','del','savedAt','v']);
SYNC_SKIP.add('_sb');
var sbHash = s => { let h = 5381; for(let i=0;i<s.length;i++) h = ((h<<5)+h+s.charCodeAt(i))|0; return (h>>>0).toString(36)+s.length.toString(36); };
var sbJ = x => JSON.stringify(x, (k,v)=>k==='_p'?undefined:v);
function sbSnap(d){
  const b = {}, h = {};
  for(const [k,v] of Object.entries(d)) if(!SB_SKIP.has(k) && !SB_ARR.includes(k)) b[k] = v;
  for(const k of SB_ARR){ const m = h[k] = {}; for(const x of d[k]||[]) if(x?.id!=null) m[x.id] = sbHash(sbJ(x)); }
  return {b: JSON.parse(sbJ(b)), h, at: new Date().toISOString()};
}
var sbEq = (a,b) => a===b || (a!==undefined && b!==undefined && sbJ(a)===sbJ(b));
var sbObj = x => x && typeof x==='object' && !Array.isArray(x);
var sbIdArr = a => Array.isArray(a) && a.length>0 && a.every(x=>sbObj(x) && x.id!=null);
function sbM3(b, l, r, pr){
  if(sbEq(l,r)) return l;
  if(b!==undefined || l===undefined || r===undefined){
    if(sbEq(l,b)) return r;          // nur auf dem anderen Gerät geändert
    if(sbEq(r,b)) return l;          // nur hier geändert
  }
  if(sbObj(l) && sbObj(r)){ const o = {}, bb = sbObj(b) ? b : {};
    for(const k of new Set([...Object.keys(l), ...Object.keys(r)])){ const v = sbM3(bb[k], l[k], r[k], pr); if(v!==undefined) o[k] = v; } return o; }
  if((sbIdArr(l)||!l?.length) && (sbIdArr(r)||!r?.length) && Array.isArray(l) && Array.isArray(r)){
    const bm = new Map((Array.isArray(b)?b:[]).filter(sbObj).map(x=>[x.id,x])), lm = new Map(l.map(x=>[x.id,x])), rm = new Map(r.map(x=>[x.id,x]));
    const ids = [...l.map(x=>x.id), ...r.map(x=>x.id).filter(id=>!lm.has(id))], out = [];
    for(const id of ids){ const v = sbM3(bm.get(id), lm.get(id), rm.get(id), pr); if(v!==undefined) out.push(v); }
    return out;
  }
  return pr ? r : l;                 // beide geändert: neuerer Stand gewinnt
}
mergeData = (prev => function(local, remote){
  const out = prev(local, remote), base = local?._sb;
  if(!base?.b || !remote) return out;
  try{
    const pr = (remote.savedAt||'') > (local.savedAt||'');
    for(const k of new Set([...Object.keys(local), ...Object.keys(remote)])){
      if(SB_SKIP.has(k) || SB_ARR.includes(k)) continue;
      const v = sbM3(base.b[k], local[k], remote[k], pr);
      if(v===undefined) delete out[k]; else out[k] = JSON.parse(sbJ(v));
    }
    // einzelne Buchungen, Wünsche usw.: nur dort geändert → das gilt
    for(const k of SB_ARR){ const bh = base.h?.[k] || {}, lm = new Map((local[k]||[]).map(x=>[x.id,x])), rm = new Map((remote[k]||[]).map(x=>[x.id,x]));
      out[k] = (out[k]||[]).map(x=>{ const L = lm.get(x.id), R = rm.get(x.id); if(!L || !R) return x; const hl = sbHash(sbJ(L)), hr = sbHash(sbJ(R)); if(hl===hr) return x;
        if(bh[x.id]===hl) return JSON.parse(sbJ(R)); if(bh[x.id]===hr) return JSON.parse(sbJ(L)); return x; }); }
    out._sb = local._sb;
    return migrate(out);
  }catch(e){ return out; }
})(mergeData);
// Nach erfolgreichem Abgleich: aktueller Stand = gemeinsame Basis
function sbAfter(){ if(D && D.sync && !D.sync.err && !D.sync.dirty && D.sync.rev && D._sb?.rev!==D.sync.rev){ D._sb = {...sbSnap(D), rev:D.sync.rev}; S.noDirty = true; save(); S.noDirty = false; } }
if(typeof ghSync==='function') ghSync = (prev => async function(...a){ const r = await prev.apply(this, a); try{ sbAfter(); }catch(e){} return r; })(ghSync);
if(typeof syncNow==='function') syncNow = (prev => async function(...a){ const r = await prev.apply(this, a); try{ sbAfter(); }catch(e){} return r; })(syncNow);
