/* =====================================================================
   40. VERSION 1.21.0 – KONTEN & KONTOSTÄNDE GENAU WIE IN WALLET
   • Bei jedem Wallet-Abgleich (alle 3 Min.) holt die App die echten Kontostände aus Wallet
     und übernimmt sie 1:1 – auch Fremdwährung, Kreditkarte, Säule 3a.
   • Neue Wallet-Konten werden automatisch angelegt (Name, Währung, Farbe, Art, «in Statistik»),
     Reihenfolge, Farbe und «in Statistik» bleiben mit Wallet gleich.
   • Handy und Web: Die Stände reisen über den Geräte-Sync mit. Ohne Geräte-Sync zeigt die App
     deutlich «Nicht synchron» statt still andere Zahlen.
   • Anzeige: Saldo oben, Stand-Hinweis «aus Wallet · vor 2 Min.», Währungszeichen wie in Wallet.
   ===================================================================== */
var wbNum = x => { if(x==null) return NaN; if(typeof x==='object') x = x.value ?? x.amount; const n = +x; return isFinite(n) ? n : NaN; };
// Kontostand eines Wallet-Kontos wie in der Wallet-App angezeigt (Kreditkarte als Minus)
function wbAccBalance(a){
  const b = a.balance || {};
  let v = wbNum(b.rawCurrentBalance); const raw = isFinite(v);
  if(!raw) v = wbNum(b.currentBalance);
  if(!isFinite(v)) v = wbNum(a.currentBalance ?? a.balance);
  if(!isFinite(v)) return NaN;
  // Kreditkarte: Wallet meldet die Schuld je nach Modus positiv – dargestellt wird sie als Minus
  if(!raw && /credit/i.test(a.accountType||'') && v>0 && /inverse|reversed/i.test(b.balanceMode||'')) v = -v;
  return r2(v);
}
var wbAccCur = a => String(a.balance?.currencyCode || a.currencyCode || a.initialBalance?.currencyCode || 'CHF').toUpperCase().slice(0,3);

async function wbAccountsSync(){
  if(!NATIVE || !D?.walletApi?.token) return;
  const raw = wbList(await wbGet('accounts'), 'accounts').filter(a=>a && a.id && !a.archived);
  if(!raw.length) return;
  raw.sort((x,y)=>(x.position ?? 0)-(y.position ?? 0));
  const order = [], seen = new Set(); let made = 0, bals = 0;
  for(const w of raw){
    const wname = String(w.name||w.id).slice(0,60), key = 'wallet:'+wname;
    let a = D.accMap[key] ? D.accounts.find(x=>x.id===D.accMap[key]) : null;
    if(D.accMap[key]==='') continue;                         // bewusst «nicht übernehmen»
    const t = wTypeOf(w.accountType || w.type, wname), debt = t==='karte' || t==='kredit', cur = wbAccCur(w);
    if(!a){ a = {id:'w'+uid(), name:wname, kind:debt?'debt':'asset', rate:0, startYm:C.now, start:0, out:0, outM:{}, abos:false, wtype:t, cur:cur==='CHF'?undefined:cur};
      if(t==='bar' || t==='konto') a.liquid = true; D.accounts.push(a); D.accMap[key] = a.id; made++; }
    if(seen.has(a.id)) continue; seen.add(a.id); order.push(a);
    if(/^#?[0-9a-f]{6}$/i.test(w.color||'')) a.color = '#'+String(w.color).replace('#','');
    const ns = !!(w.excludeFromStats || w.excludedFromStats); a.nostats = ns || undefined; a.archived = undefined; a.wid = w.id;
    const v = wbAccBalance(w);
    if(isFinite(v)){ const old = D.bal?.[a.id]; if(!old || old.v!==v || old.d!==todayIso()){ (D.bal ??= {})[a.id] = {d:todayIso(), v, src:'wallet', at:new Date().toISOString()}; bals++; } else old.at = new Date().toISOString(); }
  }
  // Reihenfolge wie in Wallet, Konten nur aus dieser App ans Ende
  const before = D.accounts.map(a=>a.id).join();
  D.accounts = [...order, ...D.accounts.filter(a=>!seen.has(a.id))];
  D.walletApi.balAt = new Date().toISOString();
  if(made || bals || before!==D.accounts.map(a=>a.id).join()){ save(); if(made) toastMsg(made+' Konto/Konten aus Wallet angelegt'); }
}
// Nach jedem Abgleich Buchungen → Stände nachziehen
var _wbSync1210 = wbSync;
wbSync = async function(opt={}){
  await _wbSync1210(opt);
  try{ await wbAccountsSync(); }catch(e){ if(D?.walletApi) D.walletApi.balErr = e.message||String(e); }
  if(!opt.quiet) render(); else safeRender?.();
};
// Ab dem Wallet-Stand zählen nur noch Buchungen, die nach dem Abruf dazukamen und noch nicht in Wallet sind
var _bankBalance1210 = bankBalance;
bankBalance = function(accId){
  const an = D.bal?.[accId];
  if(!an || an.src!=='wallet') return _bankBalance1210(accId);
  const at = an.at || an.d+'T23:59';
  let v = an.v, n = 0;
  for(const t of D.tx){ if(t.wpush || t.imp) continue; if(t.acc!==accId || isTr(t) || !t.a) continue;
    if((t.created||'') > at || (!t.created && t.d > an.d)){ v += (t.c==='_inc' ? Math.abs(t.a) : -Math.abs(t.a)); n++; } }
  return {v:r2(v), d:an.d, since:n, wallet:true, at:an.at};
};
// Neue eigene Buchung: Zeitpunkt merken (für die Zwischenzeit bis Wallet sie meldet)
var _txDialog1210 = txDialog;
txDialog = function(t, preset={}, onDone){ const isNew = !t; _txDialog1210(t, preset, x=>{ if(isNew && !x.created) x.created = new Date().toISOString(); onDone?.(x); }); };
// Nach dem Senden an Wallet gleich die Stände holen
var _wbPush1210 = wbPush;
wbPush = async function(){ const n0 = D?.tx?.filter(t=>t.wpush).length||0; await _wbPush1210(); if(D && (D.tx.filter(t=>t.wpush).length!==n0)) { try{ await wbAccountsSync(); safeRender?.(); }catch(e){} } };

/* ---------- Anzeige ---------- */
var CUR_SYM = {CHF:'CHF', EUR:'EUR', USD:'$', CAD:'CA$', GBP:'£', AUD:'A$', JPY:'¥'};
var agoTxt = iso => { if(!iso) return ''; const m = Math.round((Date.now()-new Date(iso))/60000);
  return m<1 ? 'gerade eben' : m<60 ? `vor ${m} Min.` : m<24*60 ? `vor ${Math.round(m/60)} Std.` : new Date(iso).toLocaleDateString('de-CH',{day:'numeric',month:'short'}); };
function syncStatus(){
  const w = D.walletApi||{}, wAt = w.balAt || w.last, gh = typeof ghOn==='function' && ghOn();
  if(NATIVE && w.token){
    const err = w.err || w.pushErr || w.balErr;
    return `<div class="sstat ${err?'warn':'ok'}"><span class="dot"></span><span class="sp">${err?'Wallet: '+esc(String(err).slice(0,80)):'Synchron mit Wallet'}${wAt?' · '+agoTxt(wAt):''}</span>${gh?'<span class="small">+ Web</span>':'<a class="link small" data-act="ghsetup">Web verbinden</a>'}</div>`;
  }
  if(!NATIVE){
    if(!gh) return `<div class="sstat warn"><span class="dot"></span><span class="sp"><b>Nicht synchron:</b> Diese Web-Version hat nicht die Zahlen vom Handy.</span><a class="link small" data-act="ghjoin">Verbinden</a></div>`;
    return `<div class="sstat ok"><span class="dot"></span><span class="sp">Stände vom Handy${wAt?' (Wallet '+agoTxt(wAt)+')':''}${S.ghLiveAt?' · live':''}</span></div>`;
  }
  return '';
}
var _homeAccounts1210 = homeAccounts;
homeAccounts = function(){
  let h = _homeAccounts1210();
  for(const [c,s] of Object.entries(CUR_SYM)) if(s!==c) h = h.replace(new RegExp(`<b class="num">${c} `,'g'), `<b class="num">${s} `);
  h = h.replace(/<b class="num">([^<]{12,})<\/b>/g, '<b class="num lng">$1</b>');
  const linked = D.accounts.some(a=>a.wid), accs = activeAccs().filter(a=>!a.archived && inStats(a) && (!linked || a.wid));
  const tot = accs.reduce((s,a)=>s+(accVal(a)||0),0);
  const head = `<div class="hsum"><div><span class="small muted">Saldo${D.accounts.some(a=>a.wid)?' wie in Wallet':''}</span><b class="num ${tot<0?'neg':''}">CHF ${signChf(tot)}</b></div>${syncStatus()}</div>`;
  return head + h;
};
