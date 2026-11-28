/* =====================================================================
   98b. KATEGORIEN PRÜFEN (1.72.0)
   Prüft jede Buchung der letzten 24 Monate: Passt die Kategorie wirklich?
   • Krankenkasse nur für Prämien. Kostenbeteiligung, Franchise, Selbstbehalt und
     Rückerstattungen der Krankenkasse gehören zu den Gesundheitskosten, ebenso Arzt,
     Apotheke, Spital. Prämienverbilligung bleibt bei der Krankenkasse.
   • Zahlung an eine Krankenkasse unter einer anderen Kategorie → Krankenkasse.
   • Bekannte Schweizer Händler und Dienste in einer Kategorie, die nicht passt.
   Grundlage: Verzeichnis der zugelassenen Krankenversicherer des BAG (2026) und bekannte
   Schweizer Händler. Alles läuft auf dem Gerät – es geht nichts ins Internet.
   ===================================================================== */
var KP_KK = /\b(css|arcosana|intras|helsana|progres|sansan|avanex|swica|sanitas|wincare|concordia|visana|vivacare|sana24|galenos|assura|kpt|atupri|groupe mutuel|mutuel kranken|avenir kranken|philos kranken|easy sana|okk|egk|sympany|vivao|moove sympany|aquilana|agrisano|kolping|klug kranken|sodalis|rhenusana|birchmeier|einsiedler kranken|glarner kranken|steffisburg kranken|sumiswalder|luzerner hinterland|slkk|vita surselva|visperterminen|curaulta|hotela|amb assurances|mutuelle neuchateloise|krankenkasse|krankenversicherung|krankenversicherer)\b/;
var KP_MED = /\b(arzt|arztin|arztpraxis|hausarzt|zahnarzt|augenarzt|kinderarzt|frauenarzt|dr med|med pract|praxis|gruppenpraxis|permanence|notfall|spital|kantonsspital|klinik|hirslanden|medbase|santemed|sanacare|physio|physiotherapie|ergotherapie|chiropraktik|osteopath|psycholog|psychotherap|labor|radiologie|dental|dentalhygiene|apotheke|pharmacie|amavita|sun ?store|toppharm|coop vitality|benu|rotpunkt|drogerie|aerztekasse|arztekasse|medidata|spitex|optiker|fielmann|visilab|hoergerat)\b/;
var KP_LEIST = /kostenbeteiligung|kostenbet|leistungsabrechnung|leistungsabr|selbstbehalt|franchise|ruckforderung|rueckforderung|beteiligung/;
var KP_PRAEM = /pramie|praemie|pramienrechnung|monatspramie|grundversicherung|zusatzversicherung/;
var KP_IPV = /pramienverbilligung|praemienverbilligung|\bipv\b|sva aargau|sozialversicherungsanstalt|ausgleichskasse/;
var kpIsKK = id => { const n = bkNorm(catName(id)+' '+catName(bhKey(id))); return /krankenkasse|krankenversicherung|krankenkassen/.test(n); };
var kpIsMed = id => /gesundheit|arzt|apotheke|medizin|zahnarzt|drogerie/.test(bkNorm(catName(id)+' '+catName(bhKey(id))));
var kpCatKK = () => acResolve([/^krankenkasse/, /krankenkasse|krankenversicherung/]);
var kpCatMed = () => acResolve([/gesundheitsversorgung|arzt/, /^gesundheit/, /gesundheit/, /apotheke/]);

// Übliche Prämie je Krankenkasse: Median der Zahlungen unter Krankenkasse beim gleichen Empfänger
function kpPremiums(){ return acCache('kpp', ()=>{ const by = {};
  for(const t of D.tx){ if(isTr(t) || acIn(t) || !kpIsKK(t.c)) continue; const k = acMer(t); if(!k) continue; (by[k] ??= []).push(Math.abs(sv(t))); }
  const out = {}; for(const [k, a] of Object.entries(by)){ if(a.length < 3) continue; a.sort((x,y)=>x-y); out[k] = {med:a[a.length>>1], n:a.length}; }
  return out; }); }

function kpCheck(){ return acCache('kpc', ()=>{
  const from = dAdd(todayIso(), -730), out = [], P = kpPremiums(), cKK = kpCatKK(), cMed = kpCatMed();
  for(const t of D.tx){
    if(!t.d || t.d < from || t.kpOk || isTr(t) || t.c==='_offen' || !acOk(t.c) || t.planned || t.vorm) continue;
    const tx = acText(t), inc = acIn(t), amt = Math.abs(sv(t)), kk = KP_KK.test(tx), med = !kk && KP_MED.test(tx), inKK = kpIsKK(t.c);
    let to = null, why = '', w = 0;
    if(inKK){
      if(KP_IPV.test(tx)) continue;                                  // Prämienverbilligung bleibt bei der Krankenkasse
      if(med){ to = cMed; why = 'Arzt, Apotheke oder Spital – das sind Gesundheitskosten, keine Prämie.'; w = 0.9; }
      else if(kk && inc){ to = cMed; why = 'Geld von der Krankenkasse zurück (Rückerstattung) – das senkt deine Gesundheitskosten, es ist keine Prämie.'; w = 0.8; }
      else if(kk && KP_LEIST.test(tx)){ to = cMed; why = 'Kostenbeteiligung bzw. Franchise/Selbstbehalt – gehört zu den Gesundheitskosten, nicht zur Prämie.'; w = 0.9; }
      else if(kk){ const p = P[acMer(t)];
        if(p && !KP_PRAEM.test(tx) && amt > 0 && Math.abs(amt - p.med) / p.med > 0.25 && Math.abs(amt/p.med - Math.round(amt/p.med)) > 0.08){
          to = cMed; why = `Betrag weicht von deiner üblichen Prämie (CHF ${chf0(p.med)}) ab – wahrscheinlich Kostenbeteiligung oder Franchise.`; w = 0.6; } }
      else if(P[acMer(t)] && Math.abs(amt - P[acMer(t)].med) / P[acMer(t)].med <= 0.25) continue;   // regelmässig gleicher Betrag beim gleichen Empfänger = deine Prämie
      else if(!inc){ const r = acBest({...t, c:'_offen'}); if(r && r.c!==t.c && !kpIsKK(r.c)){ to = r.c; why = `Im Text steht keine Krankenkasse. Passender: ${bkName(r.c)} (${r.src}).`; w = Math.min(0.85, r.p); }
        else { to = null; why = 'Im Text steht keine Krankenkasse – bitte prüfen.'; w = 0.4; } }
    } else if(kk && !inc && !KP_LEIST.test(tx) && !kpIsMed(t.c) && cKK){
      const p = P[acMer(t)], prem = KP_PRAEM.test(tx) || (p && Math.abs(amt - p.med)/p.med <= 0.15) || amt >= 150;
      if(prem){ to = cKK; why = 'Zahlung an eine Krankenkasse – das ist die Prämie.'; w = 0.8; }
    } else if(!inc){
      for(const [rx, pats] of AC_KNOW){ if(!rx.test(tx)) continue; const cur = bkNorm(catName(t.c)+' '+catName(bhKey(t.c)));
        if(pats.some(p=>p.test(cur))) break; const c = acResolve(pats); if(!c || c===t.c || bhKey(c)===bhKey(t.c)) break;
        // eigene Gewohnheit beim Händler hat Vorrang: nur melden, wenn du sonst auch die andere Kategorie wählst
        const h = acModel().by[acMer(t)+'|out'], tot = h ? Object.values(h.c).reduce((s,x)=>s+x,0) : 0, mine = h ? (h.c[t.c]||0)/tot : 0;
        if(mine > 0.5 && h.n >= 3) break;
        to = c; why = `Bekannter Händler für «${bkName(c)}».`; w = 0.6; break; }
    }
    if(why && (to===null || (to && to!==t.c))) out.push({t, to, why, w});
  }
  return out.sort((a,b)=>b.w-a.w || b.t.d.localeCompare(a.t.d));
}); }

function kpCard(full){
  const L = kpCheck(); S.kpL = L;
  if(!L.length) return full ? `<div class="card"><h3 style="margin:0 0 4px">Kategorien prüfen</h3><p class="small">✓ Alle Buchungen der letzten 24 Monate passen zu ihrer Kategorie.</p></div>` : '';
  const sure = L.filter(x=>x.to && x.w>=0.8), kk = L.filter(x=>kpIsKK(x.t.c)).length, show = full ? 40 : 6;
  return `<div class="card kpcard" id="kpcard"><div class="row" style="gap:8px;align-items:center;flex-wrap:wrap"><h3 class="sp" style="margin:0">Kategorien prüfen · ${L.length}</h3>
      ${sure.length?`<button class="btn sm pri" data-act="kpall">${sure.length} sichere ändern</button>`:''}${full?'':`<button class="btn sm" data-go="zuordnung">Alle ansehen</button>`}</div>
    <p class="small muted" style="margin:4px 0 6px">Passt die Kategorie wirklich? Z. B. gehört zur Krankenkasse nur die Prämie – Franchise, Selbstbehalt, Arzt und Apotheke sind Gesundheitskosten. Geprüft wird nur auf dem Gerät.</p>
    ${kk?`<p class="small kpsum"><span>Krankenkasse: <b>${kk}</b> zu prüfen</span></p>`:''}
    ${L.slice(0,show).map((x,i)=>`<div class="kprow"><span class="kpt"><b>${esc(niceName(x.t.n||x.t.text||'Ohne Text'))}</b><em>${dShort(x.t.d)} · CHF ${chf(Math.abs(sv(x.t)))} · jetzt: ${esc(bkName(x.t.c))}${x.to?` → <span class="kpto">${esc(bkName(x.to))}</span>`:''}</em></span>
      <span class="kpa">${x.to?`<button class="btn sm" data-act="kpfix" data-i="${i}">Ändern</button>`:''}<button class="btn sm ghost" data-act="kpok" data-i="${i}">Stimmt so</button></span>
      <span class="kpw muted">${esc(x.why)}</span></div>`).join('')}
    ${L.length>show?`<p class="small muted">… und ${L.length-show} weitere.</p>`:''}</div>`;
}
var kpSet = (t, c) => { acAssign(t, c); t.ai = 3; t.kpOk = 1; };
vZuordnung = (prev => function(){ return kpCard(true) + prev(); })(vZuordnung);
vKat = (prev => function(){ let h = prev(); try{ const c = S.katId, L = kpCheck().filter(x=>bhKey(x.t.c)===c || x.t.c===c || x.to===c);
  if(L.length) h = h.replace(/(<\/div>)/, `$1<div class="card"><b>${L.length} Buchung${L.length===1?'':'en'} prüfen</b><p class="small muted" style="margin:2px 0 6px">${esc(L[0].why)}</p><button class="btn sm" data-go="zuordnung">Kategorien prüfen</button></div>`); }catch(e){}
  return h; })(vKat);
window.addEventListener('click', e=>{ const a = e.target.closest?.('[data-act^="kp"]'); if(!a || !D) return; const k = a.dataset.act; if(!['kpfix','kpok','kpall'].includes(k)) return;
  e.stopPropagation(); e.preventDefault(); const L = S.kpL || [];
  if(k==='kpall'){ const s = L.filter(x=>x.to && x.w>=0.8); s.forEach(x=>kpSet(x.t, x.to)); toastMsg(`${s.length} Buchung${s.length===1?'':'en'} geändert`); }
  else { const x = L[+a.dataset.i]; if(!x) return; if(k==='kpfix' && x.to){ kpSet(x.t, x.to); toastMsg(`Geändert: ${bkName(x.to)}`); } else { x.t.kpOk = 1; } }
  calc(); save(); if(typeof wbPushSoon==='function') wbPushSoon(); render(); }, true);
// Hinweis bei den Buchungen
vBuchungen2 = (prev => function(){ const h = prev(); try{ const n = kpCheck().length; if(n) return `<div class="card kphint row" style="gap:10px;align-items:center;padding:10px 14px"><span class="sp small"><b>${n} Buchung${n===1?'':'en'}</b> mit fraglicher Kategorie (z. B. Franchise unter Krankenkasse)</span><button class="btn sm" data-go="zuordnung">Prüfen</button></div>` + h; }catch(e){} return h; })(vBuchungen2);
