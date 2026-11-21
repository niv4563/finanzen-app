
/* =====================================================================
   16. VERSION 1.2 – OBERFLÄCHE IM STIL VON WALLET
   Startseite: Kontenkacheln, Kontostand-Verlauf, Ausgaben-Ring, letzte Buchungen, Budgets.
   ===================================================================== */
var W_ACC_COL = ['#1f5fae','#0f7d57','#c2491b','#4f3fb8','#006b00','#b8436f','#8a5f00','#b8302f'];   // dunkle Stufen: weisse Schrift gut lesbar
var W_GRP = [['fix','Fixkosten'],['leben','Lebenshaltung'],['freizeit','Freizeit & Wünsche'],['schulden','Schuldenabbau'],['spar','Sparen'],['_offen','Ohne Kategorie']];
var wGrpCol = g => g==='_offen' ? 'var(--other)' : (GROUPS[g]?.c || 'var(--other)');
BOTTOM2 = [['start','◉','Start'],['buchungen','≡','Buchungen'],['budget','▦','Budget'],['analyse','◐','Statistik'],['mehr','☰','Mehr']];
var wAccColor = a => a.color || W_ACC_COL[Math.max(0, D.accounts.indexOf(a)) % W_ACC_COL.length];
var wOut = t => t.imp ? -t.sa : (t.c==='_inc' ? -t.a : t.a);   // Ausgabe positiv, Rückerstattung negativ

// Tagesverlauf eines Kontos aus Anker + importierten Buchungen (rückwärts gerechnet)
function wSeries(accId, days){
  const an = D.bal?.[accId]; if(!an) return null;
  const tx = D.tx.filter(t=>t.imp && t.bacc===accId), out = [];
  for(let i=days-1;i>=0;i--){
    const d = new Date(Date.now()-i*864e5).toISOString().slice(0,10);
    let v = an.v;
    for(const t of tx){ if(t.d>an.d && t.d<=d) v += t.sa; else if(t.d>d && t.d<=an.d) v -= t.sa; }
    out.push({d, v:r2(v)});
  }
  return out;
}
function wTrend(accId){
  const s = wSeries(accId, 30); if(!s) return '';
  const W=320, H=150, P=6, min=Math.min(...s.map(x=>x.v)), max=Math.max(...s.map(x=>x.v)), span=(max-min)||1;
  const X = i => P + i*(W-2*P)/(s.length-1), Y = v => H-22 - (v-min)/span*(H-40);
  const pts = s.map((x,i)=>`${X(i).toFixed(1)},${Y(x.v).toFixed(1)}`).join(' ');
  const delta = s.at(-1).v - s[0].v;
  return `<div class="wcard"><h3>Kontostand-Verlauf</h3><div class="wsub">${esc(accName(accId))} · letzte 30 Tage · <b class="${delta<0?'neg':'pos'}">${delta>=0?'+':''}${chf0(delta)}</b></div>
    <div class="trend" data-series='${esc(JSON.stringify(s))}'>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Kontostand der letzten 30 Tage">
        <line x1="${P}" x2="${W-P}" y1="${Y(min)}" y2="${Y(min)}" stroke="var(--line)" stroke-width="1"/>
        <line x1="${P}" x2="${W-P}" y1="${Y(max)}" y2="${Y(max)}" stroke="var(--line)" stroke-width="1"/>
        <polyline points="${P},${H-22} ${pts} ${W-P},${H-22}" fill="var(--acc-soft)" stroke="none"/>
        <polyline points="${pts}" fill="none" stroke="var(--acc)" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
        <line class="xh" x1="0" x2="0" y1="0" y2="${H-22}" stroke="var(--muted)" stroke-width="1" vector-effect="non-scaling-stroke" style="display:none"/>
        <text x="${P}" y="${H-6}" font-size="11" fill="var(--muted)">${s[0].d.slice(8)}.${s[0].d.slice(5,7)}.</text>
        <text x="${W-P}" y="${H-6}" font-size="11" fill="var(--muted)" text-anchor="end">heute</text>
      </svg><div class="tip"></div></div>
    <div class="small muted">Tiefster Stand CHF ${chf0(min)} · höchster CHF ${chf0(max)}</div></div>`;
}
function wDonut(ym){
  const sums = {}; let tot = 0;
  for(const t of D.tx){ if(!t.d.startsWith(ym) || t.c==='_inc' || t.c===BK_TRANSFER) continue;
    const g = t.c==='_offen' ? '_offen' : (D.cats.find(c=>c.id===t.c)?.group || '_offen'); sums[g]=(sums[g]||0)+wOut(t); }
  const parts = W_GRP.map(([g,n])=>({g, n, v:Math.max(0, r2(sums[g]||0))})).filter(x=>x.v>0); tot = parts.reduce((s,x)=>s+x.v,0);
  if(!tot) return `<div class="wcard"><h3>Ausgaben</h3><div class="wsub">${ymLabel(ym)}</div><p class="small muted">Noch keine Ausgaben in diesem Monat.</p></div>`;
  const R=60, C2=2*Math.PI*R; let off=0;
  const segs = parts.map(x=>{ const len=x.v/tot*C2, gap=parts.length>1?2:0;
    const s=`<circle r="${R}" cx="75" cy="75" fill="none" stroke="${wGrpCol(x.g)}" stroke-width="22" stroke-dasharray="${Math.max(0.1,len-gap).toFixed(2)} ${C2.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 75 75)"><title>${esc(x.n)}: CHF ${chf0(x.v)}</title></circle>`;
    off+=len; return s; }).join('');
  // Kategorien mit dem grössten Anteil
  const byCat = {}; for(const t of D.tx){ if(!t.d.startsWith(ym) || ['_inc',BK_TRANSFER].includes(t.c)) continue; byCat[t.c]=(byCat[t.c]||0)+wOut(t); }
  const top = Object.entries(byCat).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,5);
  return `<div class="wcard"><h3>Ausgaben</h3><div class="wsub">${ymLabel(ym)} · ohne Überträge zwischen eigenen Konten</div>
    <div class="donut"><svg viewBox="0 0 150 150" width="150" height="150" role="img" aria-label="Ausgaben nach Bereich">${segs}
      <text x="75" y="72" text-anchor="middle" font-size="11" fill="var(--muted)">Total</text>
      <text x="75" y="90" text-anchor="middle" font-size="17" font-weight="700" fill="var(--ink)">${chf0(tot)}</text></svg>
    <div class="dleg">${parts.map(x=>`<div><i style="background:${wGrpCol(x.g)}"></i><span class="sp">${esc(x.n)}</span><b class="num">${chf0(x.v)}</b><span class="p">${Math.round(x.v/tot*100)}%</span></div>`).join('')}</div></div>
    ${top.length?`<div class="small muted" style="margin-top:8px">Grösste Posten: ${top.map(([c,v])=>esc(bkName(c))+' '+chf0(v)).join(' · ')}</div>`:''}
    <a class="wmore" data-go="analyse">Statistik öffnen</a></div>`;
}
vStart = function(){
  const n=C.now, ms=TODAY, m=C.m[TODAY]||C.m[n];
  const accs = activeAccs().filter(a=>!['rueck','anlage'].includes(a.id) || bankBalance(a.id));
  const val0 = a => { const b=bankBalance(a.id); return b ? b.v : (C.m[n]?.acc[a.id]?.start ?? 0); };
  const tiles = accs.map(a=>{ const b=bankBalance(a.id), v=val0(a);
    return `<div class="wtile" data-act="baledit" data-id="${a.id}" style="background:${wAccColor(a)}"><span class="n">${esc(a.name)}</span><b class="num">CHF ${chf(v)}</b><span class="s">${b?'Bank · '+b.d.slice(8)+'.'+b.d.slice(5,7)+'.':'Plan · tippen zum Eintragen'}</span></div>`; }).join('');
  const liquid = accs.filter(a=>a.liquid||a.main).reduce((s,a)=>s+val0(a),0);
  const open = D.bills.filter(b=>b.status==='offen').sort((a,b)=>(a.due||'').localeCompare(b.due||''));
  const soon = open.filter(b=>b.due && b.due<=new Date(Date.now()+14*864e5).toISOString().slice(0,10)), soonSum = soon.reduce((s,b)=>s+b.amount,0);
  const mb = bankBalance(mainAcc().id), unm = D.tx.filter(t=>t.c==='_offen').length;
  const tx = [...D.tx].filter(t=>t.d<=todayIso()).sort((a,b)=>b.d.localeCompare(a.d)||(b.imp?1:0)-(a.imp?1:0)).slice(0,6);
  const cats = m ? D.cats.filter(c=>['leben','freizeit','fix'].includes(c.group) && (m.plan[c.id]||0)>0).map(c=>({c, ist:C.ist[c.id]?.[ms]||0, plan:m.plan[c.id]||0})).sort((a,b)=>b.ist/b.plan-a.ist/a.plan).slice(0,5) : [];
  const warn = [];
  if(unm) warn.push(`<div class="hint row"><span class="sp"><b>${unm} Buchungen ohne Kategorie.</b> Einmal pro Händler zuordnen – danach geht es automatisch.</span><button class="btn sm" data-act="mapcats">Zuordnen</button></div>`);
  if(soon.length) warn.push(`<div class="hint row" style="${mb&&mb.v<soonSum?'background:color-mix(in srgb,var(--bad) 12%,var(--card))':''}"><span class="sp"><b>${soon.length} Rechnung${soon.length>1?'en':''} bis in 14 Tagen fällig: CHF ${chf0(soonSum)}.</b>${mb?(mb.v<soonSum?` Auf dem ${esc(mainAcc().name)} sind nur CHF ${chf0(mb.v)} – rechtzeitig umbuchen.`:` Dein ${esc(mainAcc().name)} deckt das.`):''}</span><button class="btn sm" data-go="rechnungen">Ansehen</button></div>`);
  return `<div class="wtotal"><span class="small muted">Verfügbar</span><b class="num ${liquid<0?'neg':''}">CHF ${chf(liquid)}</b></div>
  <div class="wtiles">${tiles}</div>
  ${bkActions()}
  ${warn.join('')}
  <div class="wgrid">
    <div>
      ${mb ? wTrend(mainAcc().id) : `<div class="wcard"><h3>Kontostand-Verlauf</h3><p class="small muted">Lade eine Bankdatei hoch oder tippe oben auf dein Privatkonto und trag den heutigen Stand ein – dann siehst du hier den Verlauf.</p></div>`}
      <div class="wcard"><h3>Letzte Buchungen</h3><div class="wsub">Alle Konten</div>
        ${tx.length?tx.map(bkTxRow).join(''):'<p class="small muted">Noch keine Buchungen. Lade eine Bankdatei hoch oder tippe auf +.</p>'}
        <a class="wmore" data-go="buchungen">Alle Buchungen</a></div>
    </div>
    <div>
      ${wDonut(ms)}
      <div class="wcard"><h3>Budgets</h3><div class="wsub">${MN[+ms.slice(5)-1]} · ausgegeben von geplant</div>
        ${cats.map(x=>{ const p=x.ist/x.plan, col=p>1?'var(--bad)':p>0.85?'var(--warn)':'var(--ok)'; return `<div class="drow" data-go="budget"><span class="sp">${esc(x.c.name)}</span><span class="small muted num">${chf0(x.ist)} / ${chf0(x.plan)}</span><div class="bar" style="flex-basis:100%"><i style="width:${Math.min(100,p*100)}%;background:${col}"></i></div></div>`; }).join('')||'<p class="small muted">Noch kein Budget für diesen Monat.</p>'}
        <a class="wmore" data-go="budget">Budget öffnen</a></div>
      <div class="wcard"><h3>Offene Rechnungen</h3>
        ${open.slice(0,4).map(b=>billRow(b)).join('')||'<p class="small muted">Keine offenen Rechnungen. Fotografiere eine QR-Rechnung – Betrag und Empfänger werden exakt übernommen.</p>'}
        <a class="wmore" data-go="rechnungen">Alle Rechnungen</a></div>
      ${leuteCard(true)}
    </div>
  </div>
  <p class="small muted mt"><a class="link" data-go="home">Cockpit mit Stufenplan, Fahrplan und Empfehlungen →</a></p>`;
};
// Buchungen: Tagessumme rechts im Tageskopf (wie bei Wallet)
var _vBuch12 = vBuchungen2;
vBuchungen2 = function(){
  let h = _vBuch12(); const sums = {};
  for(const t of D.tx) if(t.d.startsWith(S.ym) && t.c!==BK_TRANSFER){ const v = t.imp ? t.sa : (t.c==='_inc'?t.a:-t.a); sums[t.d]=(sums[t.d]||0)+v; }
  for(const [d,v] of Object.entries(sums)){
    const lab = new Date(d).toLocaleDateString('de-CH',{weekday:'short',day:'numeric',month:'long'});
    h = h.replace(`<div class="dayh">${lab}</div>`, `<div class="dayh"><span>${lab}</span><span class="num ${v<0?'':'pos'}">${v>0?'+':''}${chf(v)}</span></div>`);
  }
  return h;
};
var _vMehr12 = vMehr2;
vMehr2 = function(){ return _vMehr12().replace('<div class="card morelist">', '<div class="card morelist"><a data-go="wuensche"><span class="i">★</span><span class="sp"><b>Wünsche</b><br><span class="small muted">Erlebnisse, Anschaffungen, Rangfolge</span></span>›</a>'); };

// Hover / Antippen im Verlauf: Fadenkreuz und Wert
function wTrendHover(e){
  const box = e.target.closest?.('.trend'); if(!box) return;
  const s = JSON.parse(box.dataset.series), svg = box.querySelector('svg'), r = svg.getBoundingClientRect();
  const fx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), i = Math.round(fx*(s.length-1)), x = 6 + i*(320-12)/(s.length-1);
  const xh = svg.querySelector('.xh'); xh.setAttribute('x1',x); xh.setAttribute('x2',x); xh.style.display='';
  const tip = box.querySelector('.tip'); tip.style.display='block'; tip.style.left = (x/320*r.width)+'px';
  tip.textContent = `${s[i].d.slice(8)}.${s[i].d.slice(5,7)}. · CHF ${chf(s[i].v)}`;
}
document.addEventListener('pointermove', wTrendHover);
document.addEventListener('pointerdown', wTrendHover);
document.addEventListener('pointerleave', e=>{ const b=e.target.closest?.('.trend'); if(b){ b.querySelector('.tip').style.display='none'; b.querySelector('.xh').style.display='none'; } }, true);
