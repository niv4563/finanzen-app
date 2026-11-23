/* =====================================================================
   44. VERSION 1.25.0 – ABGLEICH IN SEKUNDEN
   • Alle 20 Sekunden (solange die App offen ist) fragt die App nur die Kontostände ab –
     eine einzige kleine Anfrage. Hat sich irgendwo etwas geändert, holt sie sofort die neuen
     Buchungen. So ist die App innert Sekunden gleich wie Wallet.
   • Eigene Buchungen gehen nach 1 Sekunde an Wallet, danach werden die Stände sofort neu geholt.
   • Bleibt unter dem Wallet-Limit (300 Anfragen pro Stunde); bei «zu viele Anfragen» kurze Pause.
   ===================================================================== */
var WB_FAST_MS = 20000;
WB_PULL_MS = 10*60*1000;                       // voller Abgleich nur noch als Sicherheitsnetz
var WBFAST = false;
async function wbFastCheck(force){
  if(WBFAST || !NATIVE || !D || S.locked || !D.walletApi?.token || D.walletApi.auto===false || document.visibilityState!=='visible') return;
  if(S.wbPause && Date.now() < S.wbPause) return;
  if(!force && $('#dlg')?.open) return;
  WBFAST = true;
  try{
    S.wbAccC = null;                                           // frisch fragen
    const raw = wbList(await wbGet('accounts'), 'accounts').filter(a=>a && a.id && !a.archived);
    const sig = raw.map(a=>a.id+':'+wbAccBalance(a)+':'+(a.recordStats?.recordCount ?? '')+':'+(a.updatedAt||'')).sort().join('|');
    const changed = sig !== S.wbSig; S.wbSig = sig;
    if(changed || force){
      const w = D.walletApi; w.last = new Date(Date.now()-2*864e5).toISOString();   // nur die letzten Tage nachladen
      await wbSync({quiet:true});                               // Buchungen + Stände (Konten aus Zwischenspeicher)
    } else { D.walletApi.balAt = new Date().toISOString(); }
    safeRender?.();
  }catch(e){ if(/zu viele|429/i.test(e.message||'')) S.wbPause = Date.now() + 10*60*1000; }
  finally{ WBFAST = false; }
}
setInterval(()=>wbFastCheck(false), WB_FAST_MS);
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') setTimeout(()=>wbFastCheck(true), 1200); });
// Eigene Buchung → nach 1 s an Wallet, dann sofort Stände holen
var _wbPushSoon1250 = wbPushSoon;
wbPushSoon = function(ms){ return _wbPushSoon1250(Math.min(ms ?? 1000, 1000)); };
var _wbPush1250 = wbPush;
wbPush = async function(){ const q = D?.walletApi?.pushQ, n0 = (D?.tx||[]).filter(t=>t.wpush).length + (q ? Object.keys(q.patch||{}).length*1000 + (q.del||[]).length*100000 : 0);
  await _wbPush1250(); const q2 = D?.walletApi?.pushQ, n1 = (D?.tx||[]).filter(t=>t.wpush).length + (q2 ? Object.keys(q2.patch||{}).length*1000 + (q2.del||[]).length*100000 : 0);
  if(n1!==n0) setTimeout(()=>{ S.wbSig = null; wbFastCheck(true); }, 1500); };
// Statuszeile: Sekunden statt «gerade eben»
agoTxt = (prev => iso => { if(!iso) return ''; const s = Math.round((Date.now()-new Date(iso))/1000); return s < 60 ? `vor ${Math.max(1,s)} Sek.` : prev(iso); })(agoTxt);
