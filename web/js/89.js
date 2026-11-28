/* =====================================================================
   89. KREDITKARTE ABZAHLEN – ÜBERALL GLEICH (1.63.1)
   Ein Abzahlbetrag pro Monat (derselbe wie in «Mein Plan»):
   • direkt bei der Kreditkarte eingeben, mit «schuldenfrei im …» und Zinskosten,
   • im Geldfluss auf dem Draht zur Karte zusätzlich zu dem, was neu ausgegeben wird –
     Monat für Monat, bis die Schuld weg ist (danach nur noch «deckt»),
   • wird so auch zum geplanten Übertrag für Prognose und Kommende Zahlungen.
   ===================================================================== */
var kkOwed = a => Math.max(0, -accBal(a));
// Restschuld zu Beginn eines Monats, wenn ab diesem Monat jeden Monat «amt» abbezahlt wird
function kkLeft(owed, amt, ym){ const r = kkZins()/100/12; let b = owed; for(let m = TODAY; m < ym && b > 0.5; m = ymAdd(m,1)) b = b*(1+r) - amt; return Math.max(0, b); }
function kkExtra(card, ym){ const amt = +PL().kkAmt || 0, tot = kkTot(); if(!amt || !tot || ym < TODAY) return 0;
  const share = kkOwed(card)/tot; if(!share) return 0; const left = kkLeft(tot, amt, ym); return r2(Math.min(amt, left*(1+kkZins()/1200)) * share); }

flPlan = (prev => function(ym){ const R = prev(ym);
  try{ const F = FL(); let changed = false;
    for(const n of F.nodes.filter(n=>n.t==='acc')){ const a = flAccOf(n); if(!a || accGrp(a)!=='karte' || !kkOwed(a)) continue;
      const ins = flIn(n.id).filter(e=>{ const f = flN(e.f); return f && f.t!=='inc' && e.mode==='deckt' && e.m?.[ym]==null; }); if(!ins.length) continue;
      const x = kkExtra(a, ym); if(!x) continue;
      ins.forEach(e=>{ const v = x/ins.length; R.E[e.id] = r2((R.E[e.id]||0) + v); (R.X ??= {})[e.id] = r2(v); const f = R.N[e.f]; if(f) f.out += v; R.N[n.id].in += v; }); changed = true; }
  }catch(e){} return R; })(flPlan);

// Draht: «+ 300 Abzahlung»
flWires = (prev => function(P, Fx){ let h = prev(P, Fx); if(!P.X) return h;
  for(const [id, v] of Object.entries(P.X)) h = h.replace(new RegExp(`(data-e="${id}"[\\s\\S]*?<b>)([^<]*)(</b>)`), (m, a, b, c) => `${a}${b} · davon ${chf0(v)} Abzahlung${c}`);
  return h; })(flWires);

// Kästchen der Karte: Schuld und schuldenfrei
var kkFreeYm = () => { const t = kkTot(), amt = +PL().kkAmt || 0; if(!t || !amt) return null; const s = kkSim(t, amt); return isFinite(s.m) ? ymAdd(TODAY, s.m) : null; };
accFacts = (prev => function(a){ const f = prev(a); if(!a || accGrp(a)!=='karte') return f; const o = kkOwed(a); if(!o) return f;
  const end = kkFreeYm(); return [`Schuld ${chf0(o)}`, end ? `frei im ${ymLabel(end)}` : 'kein Abzahlbetrag', ...f]; })(accFacts);

// Angaben der Kreditkarte: Abzahlbetrag direkt hier
kkDetDialog = (prev => function(id){ prev(id); const a = D.accounts.find(x=>x.id===id); if(!a || isLoanAcc(a)) return;
  const tot = kkTot(), amt = +PL().kkAmt || 0, ac = document.querySelector('#dlgbody .acts'); if(!ac) return;
  const info = v => { if(!tot) return 'Zurzeit keine offene Kartenschuld.'; if(!(v>0)) return `Offen CHF ${chf0(tot)} – ohne Abzahlbetrag kostet das ca. CHF ${chf0(tot*kkZins()/1200)} Zins pro Monat.`;
    const s = kkSim(tot, v); return isFinite(s.m) ? `Schuldenfrei im <b>${ymLabel(ymAdd(TODAY, s.m))}</b> (in ${s.m} Monat${s.m===1?'':'en'}), Zins bis dahin ca. CHF ${chf0(s.int)}.` : `<span class="neg">Zu tief – der Betrag deckt nicht einmal den Zins (CHF ${chf0(tot*kkZins()/1200)} pro Monat).</span>`; };
  ($('#dlgbody h3')?.nextElementSibling || ac).insertAdjacentHTML(($('#dlgbody h3')?.nextElementSibling ? 'afterend' : 'beforebegin'), `<div class="kkpay"><label class="f">Abzahlen pro Monat CHF <span class="muted small">(zusätzlich zu dem, was du neu mit der Karte zahlst)</span><input id="kd_pay" inputmode="decimal" value="${amt?chf(amt):''}" placeholder="z. B. ${chf0(kkSuggest()||300)}"></label>
    <p class="small" id="kd_payi" style="margin:-4px 0 6px">${info(amt)}</p>
    <p class="small muted" style="margin:0 0 8px">Gilt für alle Kreditkarten zusammen (gleich wie in «Mein Plan»). Im Geldfluss fliesst der Betrag jeden Monat zusätzlich auf die Karte, bis sie schuldenfrei ist.</p></div>`);
  const inp = $('#kd_pay'); inp.oninput = () => { const v = parseNum(inp.value); $('#kd_payi').innerHTML = info(isFinite(v) ? v : 0); };
  const dl = $('#dlg'), old = dl.onclick;
  dl.onclick = ev => { if(ev.target.closest('[data-dlg="ok"]')){ const s = inp.value.trim(), v = s ? parseNum(s) : 0;
      if(!isFinite(v) || v<0 || v>1e6){ inp.style.borderColor = 'var(--bad)'; return; }
      if(v) PL().kkAmt = r2(v); else delete PL().kkAmt; try{ flpCache.k = null; if(FL().nodes.length) flSync(); }catch(e){} }
    return old ? old.call(dl, ev) : undefined; };
})(kkDetDialog);

// «Mein Plan» › Abzahlbetrag: Geldfluss nachführen
kkDialog = (prev => function(){ prev(); const dl = $('#dlg'), old = dl.onclick;
  dl.onclick = ev => { const r = old ? old.call(dl, ev) : undefined; if(ev.target.closest('[data-dlg="ok"]')) setTimeout(()=>{ try{ if(FL().nodes.length){ flSync(); save(); render(); } }catch(e){} }, 30); return r; };
})(kkDialog);

// Seite Konten › Kreditkarten: Abzahlplan sichtbar
kkCardHtml = (prev => function(){ let h = prev(); if(!h) return h; const tot = kkTot(); if(!tot) return h; const amt = +PL().kkAmt || 0, end = kkFreeYm();
  const line = amt ? `<p class="small" style="margin:0 0 6px">Abzahlplan: <b>CHF ${chf0(amt)} pro Monat</b>${end?` – schuldenfrei im <b>${ymLabel(end)}</b>`:' – zu tief, deckt den Zins nicht'}.</p>`
    : `<p class="small" style="margin:0 0 6px"><b>Noch kein Abzahlbetrag.</b> Offen CHF ${chf0(tot)} – <a class="link" data-act="kkset">Abzahlbetrag festlegen</a></p>`;
  return h.replace(/(<div class="card" id="kkcard"><h3>[^<]*<\/h3>)/, `$1${line}`); })(kkCardHtml);

// Optimieren: Kartenschuld ohne Abzahlplan
flOpt = (prev => function(){ const o = prev(); try{ const tot = kkTot();
  o.forEach(x=>{ if(String(x.key).startsWith('debt:')){ x.act = 'kk'; x.b = 'Abzahlbetrag festlegen'; } });
  if(tot >= 200 && !(+PL().kkAmt) && !o.some(x=>String(x.key).startsWith('debt:'))){ const no = flOptNo()['kkplan']; if(!(no && no > dAdd(todayIso(), -60)))
    o.unshift({key:'kkplan', gain:tot*kkZins()/100, act:'kk', b:'Abzahlbetrag festlegen', t:`Kreditkarte: CHF ${chf0(tot)} offen, ohne Abzahlplan`, d:`Bei ${kkZins()} % kostet das ca. CHF ${chf0(tot*kkZins()/100)} Zins im Jahr. Mit einem festen Betrag pro Monat weisst du, wann sie weg ist – z. B. CHF ${chf0(kkSuggest())} pro Monat.`}); }
  }catch(e){} return o; })(flOpt);
flOptDo = (prev => function(key){ const o = flOpt().find(x=>x.key===key); if(o && o.act==='kk') return kkDialog(); return prev(key); })(flOptDo);
