/* =====================================================================
   25. VERSION 1.7.0 – FINGERABDRUCK AUTOMATISCH, OBERFLÄCHE NOCH NÄHER AN WALLET
   ===================================================================== */

/* ---------- Fingerabdruck: automatisch einschalten (ohne Nachfrage) ----------
   Sobald die PIN bekannt ist (neu gesetzt oder eingegeben), richtet die App den Fingerabdruck selbst ein.
   Android verlangt dabei einmal den Finger – das ist die Bestätigung. Ausschalten in den Einstellungen bleibt möglich. */
var BIO_OFF = KEY + '.bioask';
async function bioAuto(pin){
  if(!NATIVE || !pin || bioOn() || localStorage.getItem(BIO_OFF)==='nein' || S.bioAutoTried) return;
  S.bioAutoTried = true;
  let st; try{ st = await bioPlug().status(); }catch(e){ return; }
  if(!st?.available) return;
  await new Promise(r=>setTimeout(r, 350));
  try{
    const r = await bioPlug().enable({secret:bioEnc(pin)});
    localStorage.setItem(BIO_KEY, r.data); safeRender(); toastMsg('Fingerabdruck ist eingeschaltet');
  }catch(e){
    if(e?.code==='CANCELED') return;                     // abgebrochen → beim nächsten Entsperren wieder
    alert('Fingerabdruck konnte nicht eingeschaltet werden: '+(e?.message||e)+(e?.code?' ('+e.code+')':''));
  }
}
unlock = async function(pin){ await _unlock160(pin); bioAuto(pin); };     // ersetzt die Nachfrage aus 1.6.0
var _setPin170 = setPin;
setPin = async function(pin){ await _setPin170(pin); S.bioAutoTried = false; bioAuto(pin); };
var _lock170 = lock;
lock = function(){ S.bioAutoTried = false; _lock170(); };
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act="biooff"],[data-act="bioon"]'); if(!a) return;
  if(a.dataset.act==='bioon') localStorage.removeItem(BIO_OFF);
  else setTimeout(()=>{ if(!bioOn()) localStorage.setItem(BIO_OFF,'nein'); }, 50);
}, true);

function toastMsg(t){
  let el = $('#toast'); if(!el){ el = document.createElement('div'); el.id='toast'; document.body.appendChild(el); }
  el.textContent = t; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(()=>el.classList.remove('on'), 2600);
}

/* ---------- Kategorie-Symbole wie bei Wallet ---------- */
var CI = {
  cart:'<path d="M3 4h2l2.4 11h11l2-8H6.2"/><circle cx="9" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
  food:'<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 21V3c-2 1-3 3.5-3 7h3"/>',
  bus:'<rect x="4" y="4" width="16" height="13" rx="2"/><path d="M4 11h16M8 20v-3M16 20v-3"/><circle cx="8" cy="14" r=".6"/><circle cx="16" cy="14" r=".6"/>',
  car:'<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="13" r=".7"/><circle cx="16.5" cy="13" r=".7"/>',
  home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/>',
  heart:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  shield:'<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/>',
  phone:'<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18h2"/>',
  gym:'<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
  gift:'<rect x="3" y="8" width="18" height="5"/><path d="M5 13v8h14v-8M12 8v13M12 8c-2-4-6-3-5 0M12 8c2-4 6-3 5 0"/>',
  bag:'<path d="M5 8h14l-1 13H6z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  plane:'<path d="M10 14 3 12l1-2 7 1 4-6h2l-2 7 5 1 1 2-6 0-3 5h-2z"/>',
  scissors:'<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8 7.5 20 18M8 16.5 20 6"/>',
  pig:'<path d="M4 12a7 6 0 0 1 13-3h3v4l-2 1v3h-3v2h-3v-2H9v2H6v-3a6 6 0 0 1-2-4z"/><circle cx="15" cy="11" r=".6"/>',
  card:'<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19"/>',
  repeat:'<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  tax:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  inc:'<path d="M12 4v13M6 11l6 6 6-6"/><path d="M4 20h16"/>',
  transfer:'<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
  q:'<path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6"/><circle cx="12" cy="17.5" r=".6"/>',
  tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
};
var CI_RULES = [[/lebensmittel|einkauf|migros|coop|supermarkt/i,'cart'],[/restaurant|take|essen|kantine|café|cafe/i,'food'],[/arbeitsweg|öv|zug|bahn|verkehr|velo/i,'bus'],
  [/auto|benzin|tank|park/i,'car'],[/miete|wohn|haushalt|strom|nebenkosten/i,'home'],[/kranken|arzt|apothe|gesund/i,'heart'],[/versicher/i,'shield'],
  [/swisscom|handy|internet|telefon|tv/i,'phone'],[/fitness|movemi|sport/i,'gym'],[/geschenk|leute|spende/i,'gift'],[/kleid|anschaff|wünsch|shopping/i,'bag'],
  [/ferien|reise|urlaub/i,'plane'],[/coiffeur|körper|pflege/i,'scissors'],[/spar|reserve|3a|säule|anlage|invest|eigenheim/i,'pig'],[/kredit|schuld|rückzahl/i,'card'],
  [/abo|netflix|spotify/i,'repeat'],[/steuer/i,'tax']];
function catIcon(t){
  if(t.c===BK_TRANSFER) return CI.transfer; if(t.c==='_inc') return CI.inc; if(t.c==='_offen') return CI.q;
  const n = D.cats.find(c=>c.id===t.c)?.name||''; for(const [re,k] of CI_RULES) if(re.test(n)) return CI[k]; return CI.tag;
}
var ci = d => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
var niceName = s => /[a-zäöü]/.test(s) ? s : String(s).toLowerCase().replace(/(^|[\s\-\/.(])([a-zäöüé])/g,(m,a,b)=>a+b.toUpperCase());

/* ---------- Buchungszeile wie bei Wallet: Kategorie oben, Text darunter, Betrag farbig, Konto rechts ---------- */
bkTxRow = function(t){
  const out = t.imp ? t.sa : (t.c==='_inc' ? t.a : -t.a), tr = t.c===BK_TRANSFER;
  const grp = D.cats.find(c=>c.id===t.c)?.group, col = tr?'#8a96a3':t.c==='_offen'?'var(--warn)':t.c==='_inc'?'var(--ok)':(GROUPS[grp]?.c||'var(--acc)');
  const title = tr ? 'Übertrag' : t.c==='_offen' ? 'Ohne Kategorie' : bkName(t.c);
  const note = niceName(t.wc && t.imp ? t.wc : (t.n||''));
  return `<div class="wrow" data-act="${t.c==='_offen'?'mapcats':'edittx'}" data-id="${t.id}">
    <span class="wic" style="background:${col}">${ci(catIcon(t))}</span>
    <div class="wmid"><b>${esc(title)}</b>${note&&note!==title?`<span>${esc(note)}</span>`:''}</div>
    <div class="wend"><b class="num ${tr?'tr':out>0?'in':'out'}">${out>0?'':'−'}${chf(Math.abs(out))}</b><span>${esc(accName(bkAcc(t)))}</span></div></div>`;
};
var dayLabel = d => { const t=todayIso(), y=new Date(Date.now()-864e5).toISOString().slice(0,10);
  return d===t?'Heute':d===y?'Gestern':new Date(d+'T12:00').toLocaleDateString('de-CH',{weekday:'long',day:'numeric',month:'long'}); };

/* ---------- Seite «Buchungen» neu: ohne doppelte Überschrift und Erklärtext, Suche + Filter kompakt ---------- */
vBuchungen2 = function(){
  const ym=S.ym, q=(S.q||'').toLowerCase(), fa=S.facc||'';
  const list=D.tx.filter(t=>t.d.startsWith(ym) && (!fa||bkAcc(t)===fa) && (!q || (bkName(t.c)+' '+(t.n||'')+' '+(t.wc||'')).toLowerCase().includes(q))).sort((a,b)=>b.d.localeCompare(a.d));
  const val = t => t.imp ? t.sa : (t.c==='_inc'?t.a:-t.a);
  const out=list.filter(t=>t.c!=='_inc'&&t.c!==BK_TRANSFER).reduce((s,t)=>s-val(t),0), inc=list.filter(t=>t.c==='_inc').reduce((s,t)=>s+val(t),0);
  const unm=D.tx.filter(t=>t.c==='_offen').length, days={}; list.slice(0,S.txShow||150).forEach(t=>(days[t.d]??=[]).push(t));
  return `<div class="wfilter"><input class="in" id="fq" placeholder="Suchen" value="${esc(S.q||'')}">
      <select class="in" id="facc"><option value="">Alle Konten</option>${activeAccs().map(a=>`<option value="${a.id}" ${a.id===fa?'selected':''}>${esc(a.name)}</option>`).join('')}</select></div>
    <div class="wsum"><div><span>Ausgaben</span><b class="num ${out>0.004?'out':''}">${out>0.004?'−':''}${chf(out)}</b></div><div><span>Einnahmen</span><b class="num in">${chf(inc)}</b></div><div><span>Saldo</span><b class="num ${inc-out<0?'out':'in'}">${inc-out<0?'−':''}${chf(Math.abs(inc-out))}</b></div></div>
    ${unm?`<div class="wnote" data-act="mapcats"><span class="wic" style="background:var(--warn)">${ci(CI.q)}</span><span class="sp"><b>${unm} Buchungen ohne Kategorie</b><br><span class="small muted">Antippen zum Zuordnen</span></span>›</div>`:''}
    ${Object.entries(days).map(([d,l])=>{ const s=l.filter(t=>t.c!==BK_TRANSFER).reduce((a,t)=>a+val(t),0);
      return `<div class="wday"><div class="wdayh"><span>${dayLabel(d)}</span><span class="num ${Math.abs(s)<0.005?'':s<0?'out':'in'}">${s<-0.004?'−':''}${chf(Math.abs(s))}</span></div>${l.map(bkTxRow).join('')}</div>`; }).join('')
      || `<div class="wempty">${ci(CI.list||CI.tag)}<b>Keine Buchungen in ${ymLabel(ym)}</b><span>Tippe auf + um eine Buchung zu erfassen oder eine Bankdatei hochzuladen.</span></div>`}
    ${list.length>(S.txShow||150)?`<button class="btn wide mt" data-act="txmore">Weitere anzeigen</button>`:''}`;
};
CI.list = '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>';

/* ---------- Startseite: keine Knopf-Reihe mehr – alles über den runden Plus-Knopf ---------- */
bkActions = () => '';

/* ---------- Plus-Knopf öffnet ein Auswahlblatt wie bei Wallet ---------- */
var FAB_VIEWS = ['start','buchungen','budget','statistik','konten','rechnungen','monat'];
function fabSheet(){
  const it = [['addtx', CI.tag, 'Buchung erfassen', 'Ausgabe, Einnahme oder Übertrag von Hand'],
    ['rcphoto', '<rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/>', 'Rechnung oder Beleg fotografieren', 'QR-Rechnung oder Kassenzettel'],
    ['bkimport', '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>', 'Bankdatei hochladen', 'CSV von PostFinance oder Wallet']];
  if(D.walletApi?.token) it.push(['wbsyncnow', CI.repeat, 'Wallet jetzt abgleichen', 'Neue Buchungen aus Wallet holen']);
  dialog(`<div class="sheet">${it.map(([k,i,n,d])=>`<button class="sheetbtn" data-sheet="${k}"><span class="wic" style="background:var(--acc)">${ci(i)}</span><span class="sp"><b>${n}</b><span>${d}</span></span></button>`).join('')}
    <button class="btn wide" data-dlg="cancel">Abbrechen</button></div>`);
  $('#dlg').classList.add('bottom');
}
document.addEventListener('click', e=>{
  if(e.target.closest('#fab')){ e.stopPropagation(); e.preventDefault(); fabSheet(); return; }
  const s = e.target.closest('[data-sheet]'); if(!s) return;
  e.stopPropagation(); const k = s.dataset.sheet; $('#dlg').close();
  setTimeout(()=>{
    if(k==='addtx') return txDialog(null);
    if(k==='wbsyncnow') return S.view='wallet', render();
    const b = document.createElement('button'); b.dataset.act = k; b.hidden = true; document.body.appendChild(b); b.click(); b.remove();
  }, 60);
}, true);
$('#dlg')?.addEventListener('close', ()=>$('#dlg').classList.remove('bottom'));

var _render170 = render;
render = function(){
  _render170();
  if(!D || S.locked) return;
  document.body.dataset.view = S.view;
  $('#fab')?.classList.toggle('hide', !FAB_VIEWS.includes(S.view));
  // doppelte Seitenüberschrift (steht schon oben in der grünen Leiste) auf dem Handy ausblenden
  const first = $('#main > .row:first-child > h2.sp, #main > h2:first-child'); if(first) first.classList.add('dup');
};
