/* =====================================================================
   26. VERSION 1.8.0 – ANALYSE WIE WALLET (WEB): ZEITRAUM, FILTER, PERIODENVERGLEICH, KONTOSTANDTREND,
       CASHFLOW-TREND, ART DER AUSGABEN (MUSS · BRAUCH · WILL), AUSGABENSTRUKTUR, KREDITLIMITS, BERICHT
   Alles wird auf dem Gerät berechnet und als eigene SVG-Grafik gezeichnet – keine fremde Bibliothek.
   ===================================================================== */

/* ---------- Muss · Brauch · Will ---------- */
var MBW = {muss:{n:'Muss', c:'#e34948', d:'Unverzichtbar: Miete, Versicherungen, Steuern, Schulden'},
           brauch:{n:'Brauch', c:'#eda100', d:'Nötig, aber beeinflussbar: Lebensmittel, Arbeitsweg, Körperpflege'},
           will:{n:'Will', c:'#1baf7a', d:'Wünsche: Restaurant, Freizeit, Anschaffungen, Ferien'}};
var MBW_DEF = {fix:'muss', schulden:'muss', leben:'brauch', spar:'brauch', freizeit:'will'};
var needOfCat = c => c ? (c.need || MBW_DEF[c.group] || 'brauch') : 'brauch';
var needOf = t => needOfCat(D.cats.find(x=>x.id===t.c));
var CAT_COL = ['#2a78d6','#eb6834','#1baf7a','#eda100','#e87ba4','#008300','#6250d6','#e34948'];
var C_IN = '#1baf7a', C_OUT = '#e34948', C_BAL = '#2a78d6', C_PREV = '#e87ba4', C_YEAR = '#eb6834';

/* ---------- Datum & Zeitraum ---------- */
var dAdd = (s,n) => new Date(Date.parse(s+'T00:00:00Z') + n*864e5).toISOString().slice(0,10);
var dDiff = (a,b) => Math.round((Date.parse(b+'T00:00:00Z') - Date.parse(a+'T00:00:00Z'))/864e5);
var mEnd = ym => dAdd(ymAdd(ym,1)+'-01', -1);
var dShort = s => new Date(s+'T12:00').toLocaleDateString('de-CH',{day:'numeric', month:'short'});
var dLong = s => new Date(s+'T12:00').toLocaleDateString('de-CH',{day:'numeric', month:'short', year:'numeric'});
var AP_PRESETS = [['d7','7 Tage'],['d30','30 Tage'],['m','Monat'],['m3','3 Monate'],['y','Jahr']];
function apSet(p){
  const to = todayIso(), ym = to.slice(0,7), y = to.slice(0,4);
  S.ap = p==='d7' ? {p, to, from:dAdd(to,-6)} : p==='m' ? {p, from:ym+'-01', to:mEnd(ym)} : p==='m3' ? {p, to, from:dAdd(to,-89)}
       : p==='y' ? {p, from:y+'-01-01', to:y+'-12-31'} : {p:'d30', to, from:dAdd(to,-29)};
}
function apGet(){ if(!S.ap) apSet('d30'); return S.ap; }
function apShift(dir){
  const a = apGet();
  if(a.p==='m'){ const ym = ymAdd(a.from.slice(0,7), dir); a.from = ym+'-01'; a.to = mEnd(ym); }
  else if(a.p==='y'){ const y = +a.from.slice(0,4)+dir; a.from = y+'-01-01'; a.to = y+'-12-31'; }
  else { const n = dDiff(a.from,a.to)+1; a.from = dAdd(a.from, dir*n); a.to = dAdd(a.to, dir*n); }
}
function apPrev(a){
  if(a.p==='m'){ const ym = ymAdd(a.from.slice(0,7),-1); return {from:ym+'-01', to:mEnd(ym)}; }
  if(a.p==='y'){ const y = +a.from.slice(0,4)-1; return {from:y+'-01-01', to:y+'-12-31'}; }
  const n = dDiff(a.from,a.to)+1; return {from:dAdd(a.from,-n), to:dAdd(a.to,-n)};
}
var yearBack = s => (+s.slice(0,4)-1) + s.slice(4).replace('02-29','02-28');

/* ---------- Buchungen filtern & einteilen ---------- */
var sv = t => t.imp ? t.sa : (t.c==='_inc' ? t.a : -t.a);       // Vorzeichen: + Eingang, − Ausgang
var isTr = t => t.c===BK_TRANSFER;
var inAmt = t => isTr(t) ? Math.max(0, sv(t)) : t.c==='_inc' ? sv(t) : 0;
var outAmt = t => isTr(t) ? Math.max(0, -sv(t)) : t.c==='_inc' ? 0 : -sv(t);
function afActive(){ const f = S.af||{}; return ['q','acc','cat','need','min','max'].filter(k=>f[k]!==undefined && f[k]!=='').length + (f.tr?1:0); }
function afTx(from, to, noNeed){
  const f = S.af||{}, q = (f.q||'').toLowerCase(), mn = f.min===''||f.min==null ? null : +f.min, mx = f.max===''||f.max==null ? null : +f.max;
  return D.tx.filter(t => t.d>=from && t.d<=to && (f.tr || !isTr(t)) && (!f.acc || bkAcc(t)===f.acc) && (!f.cat || t.c===f.cat)
    && (noNeed || !f.need || (t.c!=='_inc' && !isTr(t) && needOf(t)===f.need))
    && (!q || (bkName(t.c)+' '+(t.n||'')+' '+(t.wc||'')).toLowerCase().includes(q))
    && (mn===null || Math.abs(sv(t))>=mn) && (mx===null || Math.abs(sv(t))<=mx));
}
// Zeitachse: Tage, Wochen oder Monate – je nach Länge des Zeitraums
function buckets(from, to){
  const n = dDiff(from,to)+1, g = n<=45 ? 'd' : n<=200 ? 'w' : 'm', out = [];
  if(g==='d') for(let d=from; d<=to; d=dAdd(d,1)) out.push({k:d, from:d, to:d, l:dShort(d), L:new Date(d+'T12:00').toLocaleDateString('de-CH',{weekday:'short', day:'numeric', month:'long'})});
  else if(g==='w') for(let d=from; d<=to; d=dAdd(d,7)){ const e = dAdd(d,6)>to ? to : dAdd(d,6); out.push({k:d, from:d, to:e, l:dShort(d), L:dShort(d)+' – '+dShort(e)}); }
  else { let ym = from.slice(0,7); while(ym<=to.slice(0,7)){ out.push({k:ym, from:ym+'-01'<from?from:ym+'-01', to:mEnd(ym)>to?to:mEnd(ym), l:MN[+ym.slice(5)-1].slice(0,3), L:ymLabel(ym)}); ym = ymAdd(ym,1); } }
  return {g, list:out, idx:d=>{ for(let i=0;i<out.length;i++) if(d>=out[i].from && d<=out[i].to) return i; return -1; }};
}
// Kontostand an einem Tag (aus «Stand eintragen» + importierten Buchungen, wie Wallet)
function balAt(acc, d){
  const an = D.bal?.[acc]; if(!an) return null; let v = an.v;
  if(d >= an.d){ for(const t of D.tx) if(t.imp && t.bacc===acc && t.d>an.d && t.d<=d) v += t.sa; }
  else { for(const t of D.tx) if(t.imp && t.bacc===acc && t.d>d && t.d<=an.d) v -= t.sa; }
  return v;
}
var balAccs = () => { const f = S.af||{}; return D.accounts.filter(a=>D.bal?.[a.id] && (!f.acc || a.id===f.acc)); };
var balTotal = d => balAccs().reduce((s,a)=>s+(balAt(a.id,d)||0), 0);

/* ---------- Diagramm-Baukasten (SVG, gemessen an der echten Breite) ---------- */
var CHD = {}, chN = 0;
function chart(spec){ const id = 'ch'+(++chN); CHD[id] = spec; return `<div class="ch" id="${id}" style="height:${spec.h||220}px" role="img" aria-label="${esc(spec.label||'Diagramm')}"></div>`; }
function niceStep(r){ const p = Math.pow(10, Math.floor(Math.log10(r||1))), m = r/p; return (m<=1?1:m<=2?2:m<=2.5?2.5:m<=5?5:10)*p; }
var axN = v => Math.abs(v)>=10000 ? Math.round(v/1000)+'k' : String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g,"'");
function smoothPath(pts){
  if(!pts.length) return ''; let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for(let i=1;i<pts.length;i++){ const [x0,y0]=pts[i-1], [x1,y1]=pts[i], xm=(x0+x1)/2; d += ` C${xm.toFixed(1)},${y0.toFixed(1)} ${xm.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`; }
  return d;
}
function chartSvg(s, W){
  const H = s.h||220, L = 46, R = 10, T = 10, B = 24, n = s.labels.length; if(!n) return '';
  const bars = s.series.filter(x=>x.kind==='bar'), lines = s.series.filter(x=>x.kind!=='bar');
  const pos = Array(n).fill(0), neg = Array(n).fill(0);
  for(const b of bars) b.values.forEach((v,i)=>{ if(v>0) pos[i]+=v; else neg[i]+=v; });
  let lo = Math.min(0, ...neg, ...lines.flatMap(x=>x.values.filter(v=>v!=null))), hi = Math.max(0, ...pos, ...lines.flatMap(x=>x.values.filter(v=>v!=null)));
  if(lo===hi) hi = lo+1;
  const st = niceStep((hi-lo)/4); lo = Math.floor(lo/st)*st; hi = Math.ceil(hi/st)*st;
  const pw = W-L-R, ph = H-T-B, Y = v => T + (hi-v)/(hi-lo)*ph, band = pw/n, X = i => L + band*(i+0.5);
  let g = '';
  for(let v=lo; v<=hi+st/2; v+=st) g += `<line x1="${L}" x2="${W-R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="var(--line)" stroke-dasharray="${Math.abs(v)<1e-9?'':'3 4'}"/><text x="${L-6}" y="${(Y(v)+4).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--muted)">${axN(v)}</text>`;
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(pw/58))));
  s.labels.forEach((l,i)=>{ if(i%every===0 || i===n-1 && n-1-Math.floor((n-1)/every)*every>every/2) g += `<text x="${X(i).toFixed(1)}" y="${H-6}" text-anchor="middle" font-size="11" fill="var(--muted)">${esc(l)}</text>`; });
  // Balken (gestapelt, 2 px Abstand zwischen Teilen, abgerundete Enden)
  const bw = Math.max(2, Math.min(26, band*0.68)), up = Array(n).fill(0), dn = Array(n).fill(0);
  for(const b of bars) b.values.forEach((v,i)=>{ if(!v) return; const base = v>0?up[i]:dn[i], top = base+v; if(v>0) up[i]=top; else dn[i]=top;
    const y1 = Y(Math.max(base,top)), y2 = Y(Math.min(base,top)), h = Math.max(1, y2-y1-(Math.abs(v)>0?1:0));
    g += `<rect x="${(X(i)-bw/2).toFixed(1)}" y="${(y1+0.5).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(3,bw/3)}" fill="${b.color}"/>`; });
  // Linien / Flächen
  for(const ln of lines){
    const pts = ln.values.map((v,i)=>v==null?null:[X(i), Y(v)]).filter(Boolean); if(!pts.length) continue;
    const p = smoothPath(pts);
    if(ln.kind==='area') g += `<path d="${p} L${pts.at(-1)[0].toFixed(1)},${Y(Math.max(lo,0)).toFixed(1)} L${pts[0][0].toFixed(1)},${Y(Math.max(lo,0)).toFixed(1)} Z" fill="${ln.color}" opacity=".14"/>`;
    g += `<path d="${p}" fill="none" stroke="${ln.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" ${ln.dash?'stroke-dasharray="5 4"':''}/>`;
  }
  g += `<line class="chx" x1="0" x2="0" y1="${T}" y2="${T+ph}" stroke="var(--muted)" stroke-dasharray="3 3" style="display:none"/>`;
  for(let i=0;i<n;i++) g += `<rect class="hz" data-i="${i}" x="${(L+band*i).toFixed(1)}" y="${T}" width="${band.toFixed(1)}" height="${ph}" fill="transparent"/>`;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${g}</svg><div class="chtip"></div>`;
}
function drawCharts(){ for(const el of document.querySelectorAll('.ch')){ const s = CHD[el.id]; if(s) el.innerHTML = chartSvg(s, el.clientWidth||320); } }
function chTip(z){
  const el = z.closest('.ch'), s = CHD[el.id]; if(!s) return; const i = +z.dataset.i, tip = el.querySelector('.chtip'), x = +z.getAttribute('x') + +z.getAttribute('width')/2;
  const rows = s.series.filter(x=>x.values[i]!=null && (x.kind!=='bar' || x.values[i])).map(x=>`<div><i style="background:${x.color}"></i><span>${esc(x.name)}</span><b>${chf(x.tipAbs?Math.abs(x.values[i]):x.values[i])}</b></div>`).join('');
  tip.innerHTML = `<b>${esc((s.tips||s.labels)[i])}</b>${rows||'<div><span>keine Buchungen</span></div>'}`; tip.classList.add('on');
  const w = tip.offsetWidth; tip.style.left = Math.max(4, Math.min(el.clientWidth-w-4, x+12 > el.clientWidth-w ? x-w-12 : x+12))+'px';
  const xh = el.querySelector('.chx'); xh.setAttribute('x1',x); xh.setAttribute('x2',x); xh.style.display='';
}
function chHide(except){ document.querySelectorAll('.ch').forEach(el=>{ if(el===except) return; el.querySelector('.chtip')?.classList.remove('on'); const x = el.querySelector('.chx'); if(x) x.style.display='none'; }); }
document.addEventListener('pointermove', e=>{ const z = e.target.closest?.('.ch .hz'); chHide(z?.closest('.ch')); if(z) chTip(z); }, {passive:true});
document.addEventListener('pointerdown', e=>{ const z = e.target.closest?.('.ch .hz'); chHide(z?.closest('.ch')); if(z) chTip(z); }, {passive:true});
var _rsT; addEventListener('resize', ()=>{ clearTimeout(_rsT); _rsT = setTimeout(()=>{ if(document.querySelector('.ch')) drawCharts(); }, 150); });

function donut(parts, top, mid, size=150){
  const tot = parts.reduce((s,x)=>s+x.v,0)||1, R = size/2-14, C2 = 2*Math.PI*R; let off = 0;
  const segs = parts.map(x=>{ const len = x.v/tot*C2, gap = parts.length>1?2:0;
    const s = `<circle r="${R}" cx="${size/2}" cy="${size/2}" fill="none" stroke="${x.c}" stroke-width="20" stroke-dasharray="${Math.max(0.1,len-gap).toFixed(2)} ${C2.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${size/2} ${size/2})"><title>${esc(x.n)}: CHF ${chf(x.v)}</title></circle>`;
    off += len; return s; }).join('');
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${esc(top)}">${parts.length?segs:`<circle r="${R}" cx="${size/2}" cy="${size/2}" fill="none" stroke="var(--line)" stroke-width="20"/>`}
    <text x="${size/2}" y="${size/2-4}" text-anchor="middle" font-size="11" fill="var(--muted)">${esc(top)}</text>
    <text x="${size/2}" y="${size/2+15}" text-anchor="middle" font-size="16" font-weight="700" fill="var(--ink)">${esc(mid)}</text></svg>`;
}
var seg = (key, opts, def) => { const cur = (S.aseg||{})[key] ?? def; return `<div class="sgm">${opts.map(([v,l])=>`<button class="${v===cur?'on':''}" data-act="aseg" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`; };
var segV = (key, def) => (S.aseg||{})[key] ?? def;
var legend = items => `<div class="clg">${items.map(([c,n,v])=>`<span><i style="background:${c}"></i>${esc(n)}${v!=null?` <b class="num">${v}</b>`:''}</span>`).join('')}</div>`;
var apct = (a,b) => Math.abs(b)>=1 ? (a-b)/Math.abs(b)*100 : null;
function delta(a, b, goodUp=true){
  const p = apct(a,b); if(p==null || !isFinite(p)) return '<span class="dl">–</span>';
  const good = (p>=0) === goodUp; return `<span class="dl ${Math.abs(p)<0.5?'':good?'g':'b'}">${p>=0?'▲':'▼'} ${Math.abs(p)>=1000?'>999':Math.round(Math.abs(p))}%</span>`;
}

/* ---------- Kennzahlen eines Zeitraums ---------- */
function stats(from, to, noNeed){
  const l = afTx(from, to, noNeed); let inc = 0, out = 0; for(const t of l){ inc += inAmt(t); out += outAmt(t); }
  const days = Math.max(1, Math.min(dDiff(from,to)+1, dDiff(from, todayIso())+1));
  return {l, inc, out, net:inc-out, rate: inc>0 ? (inc-out)/inc*100 : null, perDay: out/days};
}

/* ---------- Karten ---------- */
function cardBalance(a, xw){
  const accs = balAccs();
  if(!accs.length) return `<div class="xcard ${xw?'xw':''}"><div class="ah"><h3>Kontostandtrend</h3></div><p class="small muted">Trag bei deinen Konten den heutigen Stand ein (Startseite → Konto antippen) oder lade Bankdateien hoch – dann entsteht hier der Verlauf.</p></div>`;
  const B = buckets(a.from, a.to), endOf = b => b.to>todayIso() ? null : balTotal(b.to);
  const vals = B.list.map(endOf), last = [...vals].reverse().find(v=>v!=null) ?? balTotal(todayIso()), pr = apPrev(a), prevEnd = balTotal(pr.to);
  return `<div class="xcard ${xw?'xw':''}"><div class="ah"><h3>Kontostandtrend</h3><span class="small muted">${(S.af||{}).acc?esc(accName(S.af.acc)):'Alle Konten mit Stand'}</span></div>
    <div class="kpibig"><div><span class="small muted">${dLong(a.from)} – ${dLong(a.to)}</span><b class="num">CHF ${chf(last)}</b></div><div class="r"><span class="small muted">vs. vorheriger Zeitraum</span>${delta(last, prevEnd)}</div></div>
    ${chart({label:'Kontostand im Zeitraum', h:xw?260:200, labels:B.list.map(b=>b.l), tips:B.list.map(b=>b.L), series:[{name:'Kontostand', color:C_BAL, kind:'area', values:vals}]})}</div>`;
}
function cardCompare(a){
  const mode = segV('cmp','net'), n = dDiff(a.from,a.to)+1, pr = apPrev(a), ya = {from:yearBack(a.from), to:yearBack(a.to)};
  const cum = (from, len) => { const l = afTx(from, dAdd(from,len-1)), by = {}; for(const t of l){ const k = dDiff(from,t.d); by[k] = (by[k]||0) + (mode==='out'?outAmt(t):mode==='in'?inAmt(t):inAmt(t)-outAmt(t)); }
    const r = []; let s = 0; for(let i=0;i<len;i++){ s += by[i]||0; r.push(s); } return r; };
  const today = todayIso(), cur = cum(a.from, n).map((v,i)=>dAdd(a.from,i)>today?null:v), prv = cum(pr.from, n), yr = cum(ya.from, n);
  const B = buckets(a.from, a.to), at = arr => B.list.map(b=>arr[Math.min(n-1, dDiff(a.from,b.to))]);
  return `<div class="xcard xw"><div class="ah"><h3>Periodenvergleich</h3></div>${seg('cmp',[['net','Cashflow'],['out','Ausgaben'],['in','Einnahmen']],'net')}
    ${chart({label:'Periodenvergleich', h:260, labels:B.list.map(b=>b.l), tips:B.list.map(b=>b.L), series:[
      {name:'Aktueller Zeitraum', color:C_BAL, kind:'area', values:at(cur)}, {name:'Vorheriger Zeitraum', color:C_PREV, kind:'line', values:at(prv)}, {name:'Gleicher Zeitraum vor einem Jahr', color:C_YEAR, kind:'line', values:at(yr), dash:true}]})}
    ${legend([[C_BAL,'Aktueller Zeitraum'],[C_PREV,'Vorheriger Zeitraum'],[C_YEAR,'Vor einem Jahr']])}</div>`;
}
function cardCashflow(a, xw=true){
  const B = buckets(a.from, a.to), inc = Array(B.list.length).fill(0), out = Array(B.list.length).fill(0);
  for(const t of afTx(a.from, a.to)){ const i = B.idx(t.d); if(i<0) continue; inc[i] += inAmt(t); out[i] += outAmt(t); }
  const net = inc.map((v,i)=>v-out[i]);
  return `<div class="xcard ${xw?'xw':''}"><div class="ah"><h3>Cashflow-Trend</h3></div>
    ${chart({label:'Einnahmen und Ausgaben pro Zeitabschnitt', h:260, labels:B.list.map(b=>b.l), tips:B.list.map(b=>b.L), series:[
      {name:'Einnahmen', color:C_IN, kind:'bar', values:inc}, {name:'Ausgaben', color:C_OUT, kind:'bar', values:out.map(v=>-v), tipAbs:true}, {name:'Cashflow', color:'var(--ink)', kind:'line', values:net}]})}
    ${legend([['var(--ink)','Cashflow'],[C_OUT,'Ausgaben'],[C_IN,'Einnahmen']])}</div>`;
}
function cardNeeds(a){
  const sel = segV('need','all'), B = buckets(a.from, a.to), v = {muss:[], brauch:[], will:[]}, tot = {muss:0, brauch:0, will:0};
  for(const k in v) v[k] = Array(B.list.length).fill(0);
  for(const t of afTx(a.from, a.to, true)){ if(t.c==='_inc' || isTr(t)) continue; const i = B.idx(t.d), k = needOf(t), o = outAmt(t); if(i>=0){ v[k][i] += o; tot[k] += o; } }
  const all = tot.muss+tot.brauch+tot.will || 1, keys = sel==='all' ? ['muss','brauch','will'] : [sel];
  return `<div class="xcard"><div class="ah"><h3>Art der Ausgaben</h3><a class="link small" data-go="mbw">Einteilen</a></div>
    ${seg('need',[['all','Alle'],['muss','Muss'],['brauch','Brauch'],['will','Will']],'all')}
    ${chart({label:'Ausgaben nach Muss, Brauch und Will', h:200, labels:B.list.map(b=>b.l), tips:B.list.map(b=>b.L), series:keys.map(k=>({name:MBW[k].n, color:MBW[k].c, kind:'bar', values:v[k]}))})}
    <div class="mbwsum">${['muss','brauch','will'].map(k=>`<div class="${keys.includes(k)?'':'dim'}"><i style="background:${MBW[k].c}"></i><span>${MBW[k].n}</span><b class="num">${chf0(tot[k])}</b><em>${Math.round(tot[k]/all*100)}%</em></div>`).join('')}</div></div>`;
}
function cardStructure(a){
  const l = afTx(a.from, a.to).filter(t=>t.c!=='_inc' && !isTr(t)), by = {};
  for(const t of l) by[t.c] = (by[t.c]||0) + outAmt(t);
  const all = Object.entries(by).filter(([,v])=>v>0.004).sort((x,y)=>y[1]-x[1]), top = all.slice(0,7), rest = all.slice(7).reduce((s,[,v])=>s+v,0);
  const parts = top.map(([c,v],i)=>({id:c, n:c==='_offen'?'Ohne Kategorie':bkName(c), v, c:CAT_COL[i]})); if(rest>0.004) parts.push({id:'_rest', n:'Andere', v:rest, c:'#8a96a3'});
  const tot = parts.reduce((s,x)=>s+x.v,0), B = buckets(a.from, a.to);
  const series = parts.map(p=>({name:p.n, color:p.c, kind:'bar', values:B.list.map(()=>0)}));
  for(const t of l){ const i = B.idx(t.d); if(i<0) continue; let k = parts.findIndex(p=>p.id===t.c); if(k<0) k = parts.findIndex(p=>p.id==='_rest'); if(k>=0) series[k].values[i] += outAmt(t); }
  return `<div class="xcard xw"><div class="ah"><h3>Ausgabenstruktur</h3></div>
    <div class="struct"><div class="sd">${donut(parts, 'Ausgaben', 'CHF '+chf0(tot), 170)}</div>
      <div class="dleg2">${parts.map(p=>`<div data-act="afcat" data-c="${p.id}"><i style="background:${p.c}"></i><span class="sp">${esc(p.n)}</span><b class="num">${chf0(p.v)}</b><em>${tot?Math.round(p.v/tot*100):0}%</em></div>`).join('')||'<p class="small muted">Keine Ausgaben im Zeitraum.</p>'}</div></div>
    ${parts.length?chart({label:'Ausgaben nach Kategorie über die Zeit', h:220, labels:B.list.map(b=>b.l), tips:B.list.map(b=>b.L), series}):''}</div>`;
}
function cardRecent(a){
  const l = afTx(a.from, a.to).sort((x,y)=>y.d.localeCompare(x.d)).slice(0,6);
  return `<div class="xcard"><div class="ah"><h3>Letzte Einträge</h3><a class="link small" data-go="buchungen">Alle</a></div>${l.map(bkTxRow).join('')||'<p class="small muted">Keine Buchungen im Zeitraum.</p>'}</div>`;
}
function cardCredit(){
  const debts = D.accounts.filter(x=>x.kind==='debt' && !x.archived);
  const rows = debts.map(x=>{ const b = bankBalance(x.id), bal = b ? b.v : (C.m[TODAY]?.acc[x.id]?.start ?? x.start ?? 0), used = Math.max(0,-bal);
    if(!x.limit) return `<div class="crow"><span class="sp"><b>${esc(x.name)}</b><br><span class="small muted">Schuld CHF ${chf(used)}</span></span><button class="btn sm" data-act="limset" data-id="${x.id}">Limit eintragen</button></div>`;
    const p = Math.min(100, used/x.limit*100), col = p>80?'#e34948':p>50?'#eb6834':'#1baf7a';
    return `<div class="crow" data-act="limset" data-id="${x.id}">${donut([{n:'genutzt', v:used, c:col}, {n:'frei', v:Math.max(0,x.limit-used), c:'var(--line)'}], 'genutzt', Math.round(p)+'%', 104)}
      <span class="sp"><b>${esc(x.name)}</b><br><span class="small muted">Kontostand</span> <b class="num">CHF ${chf(used)}</b><br><span class="small muted">Kreditlimit</span> <b class="num">CHF ${chf(x.limit)}</b></span></div>`; });
  return `<div class="xcard"><div class="ah"><h3>Nutzung der Kreditlimits</h3></div>${rows.join('')||'<p class="small muted">Keine Kreditkarten oder Kredite erfasst.</p>'}</div>`;
}
function cardMerchants(a){
  const by = {}; for(const t of afTx(a.from, a.to)){ if(t.c==='_inc' || isTr(t)) continue; const k = niceName(t.wc && t.imp ? t.wc : (t.n||bkName(t.c))); (by[k] ??= {v:0, n:0}); by[k].v += outAmt(t); by[k].n++; }
  const top = Object.entries(by).filter(([,x])=>x.v>0).sort((x,y)=>y[1].v-x[1].v).slice(0,6), mx = top[0]?.[1].v || 1;
  return `<div class="xcard"><div class="ah"><h3>Top-Händler</h3></div>${top.map(([k,x])=>`<div class="mrow"><span class="sp"><b>${esc(k)}</b> <span class="small muted">${x.n}×</span><div class="mbar"><i style="width:${x.v/mx*100}%"></i></div></span><b class="num">${chf0(x.v)}</b></div>`).join('')||'<p class="small muted">Keine Ausgaben im Zeitraum.</p>'}</div>`;
}
function kpis(a){
  const c = stats(a.from, a.to), pr = apPrev(a), p = stats(pr.from, pr.to);
  const k = (n, v, d, cls='') => `<div class="kpi"><span>${n}</span><b class="num ${cls}">${v}</b>${d}</div>`;
  return `<div class="kpis">${k('Einnahmen', chf0(c.inc), delta(c.inc,p.inc,true), 'in')}${k('Ausgaben', chf0(c.out), delta(c.out,p.out,false), 'out')}
    ${k('Cashflow', (c.net<0?'−':'')+chf0(Math.abs(c.net)), delta(c.net,p.net,true), c.net<0?'out':'in')}
    ${k('Sparquote', c.rate==null?'–':Math.round(c.rate)+'%', c.rate==null||p.rate==null?'<span class="dl">–</span>':`<span class="dl ${c.rate>=p.rate?'g':'b'}">${c.rate>=p.rate?'▲':'▼'} ${Math.abs(Math.round(c.rate-p.rate))} Pkt.</span>`)}
    ${k('Ø Ausgaben pro Tag', chf0(c.perDay), delta(c.perDay,p.perDay,false))}</div>`;
}

/* ---------- Einnahmen & Ausgaben Bericht ---------- */
function report(a){
  const pr = apPrev(a), c = afTx(a.from, a.to), p = afTx(pr.from, pr.to), sum = (l, f) => l.reduce((s,t)=>s+f(t),0);
  const byCat = l => { const r = {}; for(const t of l){ if(t.c==='_inc'||isTr(t)) continue; r[t.c] = (r[t.c]||0)+outAmt(t); } return r; };
  const cc = byCat(c), pc = byCat(p), ids = [...new Set([...Object.keys(cc), ...Object.keys(pc)])];
  const row = (n, x, y, goodUp, cls='') => `<tr class="${cls}"><td>${n}</td><td class="num">${chf(x)}</td><td class="num muted">${chf(y)}</td><td>${delta(x,y,goodUp)}</td></tr>`;
  const inc = sum(c,inAmt), pinc = sum(p,inAmt), out = sum(c,outAmt), pout = sum(p,outAmt);
  let body = row('<b>Einnahmen</b>', inc, pinc, true, 'grp') + row('<b>Ausgaben</b>', out, pout, false, 'grp');
  for(const k of ['muss','brauch','will']){
    const list = ids.filter(id=>needOfCat(D.cats.find(x=>x.id===id))===k).sort((x,y)=>(cc[y]||0)-(cc[x]||0));
    const tx = list.reduce((s,id)=>s+(cc[id]||0),0), ty = list.reduce((s,id)=>s+(pc[id]||0),0); if(!tx && !ty) continue;
    body += row(`<i class="dot" style="background:${MBW[k].c}"></i><b>${MBW[k].n}</b>`, tx, ty, false, 'sub') + list.map(id=>row('<span class="ind">'+esc(id==='_offen'?'Ohne Kategorie':bkName(id))+'</span>', cc[id]||0, pc[id]||0, false)).join('');
  }
  body += row('<b>Cashflow</b>', inc-out, pinc-pout, true, 'grp');
  return `<div class="xcard xw"><div class="ah"><h3>Einnahmen & Ausgaben Bericht</h3><span class="small muted">vs. ${dShort(pr.from)} – ${dShort(pr.to)}</span></div>
    <div class="tw"><table class="rep"><thead><tr><th></th><th>Zeitraum</th><th>Vorher</th><th>Änderung</th></tr></thead><tbody>${body}</tbody></table></div></div>`;
}
function balTable(a){
  const accs = balAccs(); if(!accs.length) return '';
  return `<div class="xcard xw"><div class="ah"><h3>Konten im Zeitraum</h3></div><div class="tw"><table class="rep"><thead><tr><th>Konto</th><th>Anfang</th><th>Ende</th><th>Veränderung</th></tr></thead><tbody>
    ${accs.map(x=>{ const s = balAt(x.id, dAdd(a.from,-1)), e = balAt(x.id, a.to>todayIso()?todayIso():a.to); return `<tr><td>${esc(x.name)}</td><td class="num">${chf(s)}</td><td class="num">${chf(e)}</td><td class="num ${e-s<0?'out':'in'}">${e-s<0?'−':'+'}${chf(Math.abs(e-s))}</td></tr>`; }).join('')}</tbody></table></div></div>`;
}
function cashTable(a){
  const B = buckets(a.from, a.to), r = B.list.map(()=>({i:0, o:0}));
  for(const t of afTx(a.from, a.to)){ const i = B.idx(t.d); if(i>=0){ r[i].i += inAmt(t); r[i].o += outAmt(t); } }
  return `<div class="xcard xw"><div class="ah"><h3>Cashflow pro ${B.g==='d'?'Tag':B.g==='w'?'Woche':'Monat'}</h3></div><div class="tw"><table class="rep"><thead><tr><th></th><th>Einnahmen</th><th>Ausgaben</th><th>Cashflow</th></tr></thead><tbody>
    ${B.list.map((b,i)=>r[i].i||r[i].o?`<tr><td>${esc(b.L)}</td><td class="num in">${chf(r[i].i)}</td><td class="num out">${chf(r[i].o)}</td><td class="num ${r[i].i-r[i].o<0?'out':'in'}">${chf(r[i].i-r[i].o)}</td></tr>`:'').reverse().join('')}</tbody></table></div></div>`;
}

/* ---------- Seite «Analyse» ---------- */
function filterPanel(){
  const f = S.af||{};
  return `<div class="afp ${S.afOpen?'open':''}">
    <label class="f">Suchen<input id="afq" value="${esc(f.q||'')}" placeholder="Händler, Text, Kategorie"></label>
    <label class="f">Konten<select id="afacc"><option value="">Alle Konten</option>${activeAccs().map(x=>`<option value="${x.id}" ${x.id===f.acc?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>
    <label class="f">Kategorien<select id="afcat"><option value="">Alle Kategorien</option><option value="_offen" ${f.cat==='_offen'?'selected':''}>Ohne Kategorie</option>${catOptions(f.cat)}</select></label>
    <label class="f">Art der Ausgabe<select id="afneed"><option value="">Muss, Brauch und Will</option>${Object.entries(MBW).map(([k,x])=>`<option value="${k}" ${f.need===k?'selected':''}>${x.n}</option>`).join('')}</select></label>
    <div class="f"><span>Betrag CHF</span><div class="row"><input class="in" id="afmin" inputmode="decimal" placeholder="von" value="${esc(f.min??'')}"><input class="in" id="afmax" inputmode="decimal" placeholder="bis" value="${esc(f.max??'')}"></div></div>
    <label class="chk"><input type="checkbox" id="aftr" ${f.tr?'checked':''}> Überträge zwischen eigenen Konten einbeziehen</label>
    <button class="btn wide" data-act="afreset">Filter zurücksetzen</button></div>`;
}
vStatistik = function(){
  const a = apGet(), tab = S.atab||'over', nf = afActive();
  const tabs = [['over','Übersicht'],['bal','Kontostandtrend'],['cash','Cashflow'],['rep','Bericht']];
  let body = '';
  if(tab==='over') body = kpis(a) + `<div class="agrid">${cardBalance(a,true)}${cardCompare(a)}${cardRecent(a)}${cardNeeds(a)}${cardCredit()}${cardMerchants(a)}${cardCashflow(a)}${cardStructure(a)}</div>`;
  else if(tab==='bal') body = `<div class="agrid">${cardBalance(a,true)}${balTable(a)}</div>`;
  else if(tab==='cash') body = kpis(a) + `<div class="agrid">${cardCashflow(a)}${cardCompare(a)}${cashTable(a)}</div>`;
  else body = kpis(a) + `<div class="agrid">${report(a)}${cardNeeds(a)}${cardStructure(a)}</div>`;
  return `<div class="aper"><button class="ibtn2" data-act="apprev" aria-label="Früherer Zeitraum">‹</button><b>${dLong(a.from)} – ${dLong(a.to)}</b><button class="ibtn2" data-act="apnext" aria-label="Späterer Zeitraum">›</button></div>
    <div class="apre">${AP_PRESETS.map(([p,l])=>`<button class="${a.p===p?'on':''}" data-act="ap" data-p="${p}">${l}</button>`).join('')}</div>
    <div class="atabs">${tabs.map(([k,l])=>`<button class="${k===tab?'on':''}" data-act="atab" data-t="${k}">${l}</button>`).join('')}
      <button class="aff ${nf?'on':''}" data-act="afopen">Filter${nf?' ('+nf+')':''}</button></div>
    ${filterPanel()}${body}`;
};

/* ---------- Einstellungsseite Muss · Brauch · Will ---------- */
function vMbw(){
  return `<p class="sub">Teile jede Kategorie ein. Die Analyse zeigt dann, wie viel du für Unverzichtbares, Nötiges und Wünsche ausgibst.</p>
    <div class="mbwhelp">${Object.values(MBW).map(x=>`<div><i style="background:${x.c}"></i><b>${x.n}</b><span>${x.d}</span></div>`).join('')}</div>
    ${Object.entries(GROUPS).map(([g,G])=>{ const cs = D.cats.filter(c=>c.group===g && !c.archived); if(!cs.length) return '';
      return `<div class="xcard"><div class="ah"><h3>${esc(G.n)}</h3></div>${cs.map(c=>{ const v = needOfCat(c);
        return `<div class="nrow"><span class="sp">${esc(c.name)}</span><div class="sgm sm">${Object.entries(MBW).map(([k,x])=>`<button class="${k===v?'on':''}" style="${k===v?`background:${x.c};color:#fff`:''}" data-act="setneed" data-id="${c.id}" data-v="${k}">${x.n}</button>`).join('')}</div></div>`; }).join('')}</div>`; }).join('')}`;
}

/* ---------- Bedienung ---------- */
var _afT;
function afRender(focusId){ render(); if(focusId){ const el = $('#'+focusId); if(el){ el.focus(); if(el.setSelectionRange && el.value) el.setSelectionRange(el.value.length, el.value.length); } } }
document.addEventListener('input', e=>{
  const id = e.target.id; if(!['afq','afmin','afmax'].includes(id)) return; const f = (S.af ??= {});
  f[{afq:'q', afmin:'min', afmax:'max'}[id]] = id==='afq' ? e.target.value : e.target.value.replace(/[^\d.,]/g,'').replace(',','.');
  clearTimeout(_afT); _afT = setTimeout(()=>afRender(id), 450);
});
document.addEventListener('change', e=>{
  const id = e.target.id; const m = {afacc:'acc', afcat:'cat', afneed:'need'}; const f = (S.af ??= {});
  if(m[id]){ f[m[id]] = e.target.value; render(); } else if(id==='aftr'){ f.tr = e.target.checked; render(); }
});
document.addEventListener('click', e=>{
  const a = e.target.closest('[data-act]'); if(!a || !D) return; const k = a.dataset.act;
  const H = {
    ap: ()=>apSet(a.dataset.p), apprev: ()=>apShift(-1), apnext: ()=>apShift(1),
    atab: ()=>{ S.atab = a.dataset.t; }, afopen: ()=>{ S.afOpen = !S.afOpen; }, afreset: ()=>{ S.af = {}; },
    aseg: ()=>{ (S.aseg ??= {})[a.dataset.k] = a.dataset.v; },
    afcat: ()=>{ if(a.dataset.c!=='_rest'){ (S.af ??= {}).cat = a.dataset.c; S.afOpen = true; } },
    setneed: ()=>{ const c = D.cats.find(x=>x.id===a.dataset.id); if(c){ c.need = a.dataset.v; save(); } },
    limset: ()=>{ const x = D.accounts.find(y=>y.id===a.dataset.id); if(!x) return 'skip';
      dialog(`<h3>Kreditlimit – ${esc(x.name)}</h3><label class="f">Limit CHF<input id="lim" inputmode="decimal" value="${x.limit?chf(x.limit):''}" placeholder="z. B. 5000"></label>${acts(true)}`,
        ()=>{ const v = parseNum(val('lim')); if(isNaN(v)||v<0) return false; x.limit = v||null; }); return 'skip'; },
  };
  if(!H[k]) return; e.stopPropagation(); if(H[k]()!=='skip') render();
}, true);

/* ---------- Einbinden: Menü, Titel, Zeichnen nach jedem Aufbau ---------- */
(()=>{ const s0 = NAV4[0][1].find(x=>x[0]==='statistik'); if(s0) s0[2] = 'Analyse';
  NAV4.find(s=>s[0]==='Budgets & Ziele')?.[1].push(['mbw', ICON.goal, 'Muss · Brauch · Will']); })();
TITLES.statistik = 'Analyse'; TITLES.mbw = 'Muss · Brauch · Will';
if(typeof BOTTOM2!=='undefined') BOTTOM2.forEach(b=>{ if(b[0]==='statistik') b[2] = 'Analyse'; });
var _render180 = render;
render = function(){
  if(S.view==='mbw' && !S.locked && D){ const keep = S.view; S.view = 'autoregeln'; _render180(); S.view = keep;
    $('header h1').textContent = TITLES.mbw; $('#main').innerHTML = vMbw();
    document.querySelectorAll('nav.side a').forEach(x=>x.classList.toggle('on', x.dataset.go==='mbw')); return; }
  CHD = {}; chN = 0;
  _render180();
  if(document.querySelector('.ch')) drawCharts();
};
