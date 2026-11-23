/* =====================================================================
   49. VERSION 1.28.0 (Teil 2) – ALLE KATEGORIEN WIE IN WALLET
   • Die App holt deinen ganzen Kategorienbaum direkt aus Wallet – Hauptkategorien, Kategorien
     und deine eigenen Unterkategorien (z. B. Wohnen › Energie, Nebenkosten › Gas) – auch solche
     ohne Buchungen. Neue oder umbenannte Kategorien in Wallet kommen automatisch nach.
   • Buchungen aus Wallet landen direkt in der gleichen Kategorie; eigene Buchungen gehen mit
     genau dieser Kategorie zurück an Wallet.
   • Auswahl beim Erfassen: geordnet wie in Wallet.
   • Bestehende Kategorien (mit Budget) bleiben – gleichnamige werden verknüpft statt doppelt angelegt.
   ===================================================================== */
var W_INC_TOP = /^(einkommen|income)$/i, W_MISS = /^(fehlt|fehlend|missing|unknown)$/i;
async function wbCatSync(force){
  if(!wbNet() || !D?.walletApi?.token) return;
  const w = D.walletApi; if(!force && w.catAt && Date.now()-new Date(w.catAt) < 30*60*1000) return;
  let all = [], off = 0;
  for(let p=0;p<10;p++){ const j = await wbGet(`categories?limit=200&offset=${off}`), l = wbList(j,'categories'); all = all.concat(l); if(j?.nextOffset==null || !l.length) break; off = j.nextOffset; }
  all = all.filter(c=>c && c.id && c.name && c.enabled!==false && !c.archived && !/transfer/i.test(c.systemId||''));
  if(!all.length) return;
  const nameOf = c => String(c.name).trim().slice(0,60);
  const tops = []; let made = 0, linked = 0, ren = 0, moved = 0;
  for(const wc of all){
    const top = String(wc.group?.name || wc.envelopeGroup?.name || '').trim() || null;
    const par = String(wc.parentName || wc.parent?.name || '').trim();
    const name = nameOf(wc), KEY = name.toUpperCase();
    if(top && !tops.includes(top)) tops.push(top);
    if(top && W_INC_TOP.test(top)){ if(!D.walletMap[KEY]) D.walletMap[KEY] = '_inc'; continue; }        // Einkommen → Einnahme
    if(W_MISS.test(name)){ if(!D.walletMap[KEY]) D.walletMap[KEY] = '_offen'; continue; }
    let c = D.cats.find(x=>x.wid===wc.id);
    if(c){ if(!c.nameUser && c.name!==name){ c.name = name; ren++; } }
    else { c = D.cats.find(x=>!x.wid && !x.archived && x.name.toLowerCase()===name.toLowerCase());
      if(c){ c.wid = wc.id; linked++; }
      else { const parent = top || wParentOf(name), [group, need] = wGroupNeed(name, parent);
        c = {id:'wc_'+uid(), name, group, need, wid:wc.id}; D.cats.push(c); made++; } }
    c.wparent = top || c.wparent || wParentOf(name); c.wsub = (par && par!==top && par!==name) ? par : undefined; c.archived = undefined;
    // Budget mitnehmen: bisherige (eigene) Budget-Kategorie merken, Buchungen in die Wallet-Kategorie
    let prev = D.walletMap[KEY]; if(!prev || prev===c.id){ const cnt = {}; for(const t of D.tx) if(t.src==='wallet' && t.wc===KEY && t.c!==c.id && t.c!=='_offen' && !isTr(t) && t.c!=='_inc') cnt[t.c] = (cnt[t.c]||0)+1; const best = Object.entries(cnt).sort((x,y)=>y[1]-x[1])[0]; if(best) prev = best[0]; }
    const pc = prev && D.cats.find(x=>x.id===prev);
    if(pc && !pc.wid && pc.id!==c.id && !c.bud) c.bud = pc.id;
    D.walletMap[KEY] = c.id;
    for(const t of D.tx) if(t.src==='wallet' && t.wc===KEY && t.c!==c.id && (t.c==='_offen' || t.c===prev)){ t.c = c.id; moved++; }
  }
  w.catTops = tops; w.catAt = new Date().toISOString();
  // Buchungen aus Wallet ohne Kategorie nachträglich zuordnen
  for(const t of D.tx){ if(t.src!=='wallet' || !t.wc || t.c!=='_offen') continue; const m = D.walletMap[t.wc]; if(m && m!=='_offen' && m!=='_skip'){ if(t.imp) setCat(t, m); else t.c = m; moved++; } }
  if(made || linked || ren || moved){ calc(); save(); if(made) toastMsg(`${made} Kategorie(n) angelegt`); }
}
wbAccountsSync = (prev => async function(){ await prev(); try{ await wbCatSync(); }catch(e){} })(wbAccountsSync);

// Zurück an Wallet: verknüpfte Kategorie zuerst
wbCatId = (prev => function(M, catId){ const c = D.cats.find(x=>x.id===catId); return c?.wid || prev(M, catId); })(wbCatId);

// Auswahl wie in Wallet geordnet (Hauptkategorie, darunter Kategorien, Unterkategorien eingerückt)
var _catOptions1280 = catOptions;
catOptions = function(sel){
  const tops = D.walletApi?.catTops, linked = D.cats.filter(c=>c.wid && (!c.archived || c.id===sel));
  if(!tops?.length || !linked.length) return _catOptions1280(sel);
  const opt = (c, sub) => `<option value="${c.id}" ${c.id===sel?'selected':''}>${sub?' ':''}${esc(c.name)}</option>`;
  let h = `<option value="_inc" ${sel==='_inc'?'selected':''}>Einkommen</option>`;
  for(const t of tops){ if(W_INC_TOP.test(t)) continue; const cs = linked.filter(c=>c.wparent===t); if(!cs.length) continue;
    const mains = cs.filter(c=>!c.wsub), subs = cs.filter(c=>c.wsub);
    h += `<optgroup label="${esc(t)}">` + mains.map(m=>opt(m) + subs.filter(s=>s.wsub===m.name).map(s=>opt(s,1)).join('')).join('')
      + subs.filter(s=>!mains.some(m=>m.name===s.wsub)).map(s=>opt(s,1)).join('') + `</optgroup>`; }
  const own = D.cats.filter(c=>!c.wid && (!c.archived || c.id===sel));
  if(own.length) h += `<optgroup label="Eigene (Budget)">${own.map(c=>opt(c)).join('')}</optgroup>`;
  return h + `<option value="_offen" ${sel==='_offen'?'selected':''}>Ohne Kategorie</option>`;
};

// Einstellungen → Wallet-Verbindung: Kategorien jetzt holen
var _render1281 = render;
render = function(){ _render1281();
  if(S.view==='wallet' && D?.walletApi?.token && !$('#wbcatcard')){
    const n = D.cats.filter(c=>c.wid).length, at = D.walletApi.catAt;
    $('#main')?.insertAdjacentHTML('beforeend', `<div class="card" id="wbcatcard"><h3>Kategorien</h3><p class="small muted" style="margin-top:-6px">${n ? `${n} Kategorien wie in Wallet${at?' · zuletzt '+agoTxt(at):''}. Neue Kategorien in Wallet kommen automatisch.` : 'Noch nicht übernommen.'}</p><button class="btn sm" data-act="wbcatnow">Kategorien jetzt übernehmen</button></div>`);
  } };
document.addEventListener('click', async e=>{ const b = e.target.closest('[data-act="wbcatnow"]'); if(!b || !D) return; e.stopPropagation(); b.disabled = true; b.textContent = 'Hole …';
  try{ await wbCatSync(true); toastMsg('Kategorien übernommen'); }catch(err){ alert(err.message||String(err)); } render(); }, true);
