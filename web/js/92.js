/* =====================================================================
   92. DRÄHTE AUS JEDER SEITE (1.66.0)
   Eingang links oder oben (1.67: oben, wenn die Quelle darüber liegt). Der Ausgang wählt die Seite, die zum Ziel zeigt:
   rechts (Ziel daneben), unten (Ziel darunter) oder oben (Ziel darüber).
   Mehrere Drähte auf derselben Seite werden nebeneinander verteilt, damit sie sich
   nicht überdecken. Kleine Punkte zeigen, wo ein Draht das Kästchen verlässt.
   ===================================================================== */
var FL_W = 220;
S.flH ??= {};
var flHt = n => S.flH[n.id] || (n.t==='exp' ? 150 : n.t==='inc' ? 110 : 175);
function flPorts(){
  const F = FL(), out = {}, groups = {}, ins = {};
  for(const e of F.edges){ const f = flN(e.f), t = flN(e.t); if(!f || !t) continue;
    const h = flHt(f), cy = f.y + h/2, gapX = t.x - (f.x + FL_W), gapY = t.y - (f.y + h);
    // Eingang oben, wenn die Quelle deutlich darüber liegt und nicht klar links daneben
    const top = gapY >= 30 && (gapX < 40 || gapY > gapX*1.2);
    let side;
    if(top) side = 'b';
    else { const ty = t.y + 46, dx = gapX, dy = ty - cy; side = dx >= 40 && Math.abs(dy) <= Math.max(dx, h/2 + 20) ? 'r' : dy > 0 ? 'b' : 't'; }
    (groups[f.id+side] ??= {f, side, es:[]}).es.push({e, t});
    if(top) (ins[t.id] ??= {t, es:[]}).es.push({e, f}); }
  for(const g of Object.values(groups)){ const {f, side, es} = g, h = flHt(f);
    es.sort((a,b)=> side==='r' ? a.t.y - b.t.y : a.t.x - b.t.x || a.t.y - b.t.y);
    es.forEach((x, i)=>{ const k = (i+1)/(es.length+1);
      out[x.e.id] = side==='r' ? {x:f.x+FL_W, y:f.y + 28 + (h-44)*k, side} : side==='b' ? {x:f.x + 24 + (FL_W-48)*k, y:f.y + h, side} : {x:f.x + 24 + (FL_W-48)*k, y:f.y, side}; }); }
  for(const g of Object.values(ins)){ const {t, es} = g; es.sort((a,b)=>a.f.x - b.f.x || a.f.y - b.f.y);
    es.forEach((x, i)=>{ const o = out[x.e.id]; if(!o) return; o.iside = 't'; o.ix = t.x + 24 + (FL_W-48)*(i+1)/(es.length+1); o.iy = t.y; }); }
  return out;
}
flWires = (prev => function(P, Fx){ let h = prev(P, Fx); const ports = flPorts(), dots = [];
  h = h.split('</g>').map(chunk=>{ const m = /data-e="([^"]+)"/.exec(chunk); if(!m) return chunk; const e = flE(m[1]), p = ports[m[1]]; if(!e || !p) return chunk;
    const t = flN(e.t), f = flN(e.f), top = p.iside==='t', x2 = top ? p.ix : t.x, y2 = top ? p.iy : t.y + 46, x1 = p.x, y1 = p.y;
    const k = Math.max(50, Math.min(220, Math.hypot(x2-x1, y2-y1)*0.45));
    const c1 = p.side==='r' ? [x1+k, y1] : p.side==='b' ? [x1, y1+k] : [x1, y1-k], c2 = top ? [x2, y2-Math.max(50, k*0.8)] : [x2-Math.max(50, k*0.8), y2];
    const d = `M${x1},${y1} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${x2},${y2}`;
    const mx = (x1 + 3*c1[0] + 3*c2[0] + x2)/8, my = (y1 + 3*c1[1] + 3*c2[1] + y2)/8;
    dots.push(`<circle class="fwdot" cx="${x1}" cy="${y1}" r="4.5" style="fill:${flCol(f)}"/>`);
    if(top) dots.push(`<circle class="fwdot fwin" cx="${x2}" cy="${y2}" r="4.5" style="stroke:${flCol(f)}"/>`);
    return chunk.replace(/ d="[^"]*"/g, ` d="${d}"`).replace(/<foreignObject x="[^"]*" y="[^"]*"/, `<foreignObject x="${mx-70}" y="${my-19}"`); }).join('</g>');
  return h + dots.join(''); })(flWires);

// Höhe der Kästchen messen, damit Drähte unten genau am Rand ansetzen
render = (prev => function(){ const r = prev.apply(this, arguments);
  try{ if(S.view==='geldfluss' && !NATIVE){ let ch = false;
      document.querySelectorAll('#flw .fnode[data-n]').forEach(el=>{ const h = el.offsetHeight; if(h && Math.abs((S.flH[el.dataset.n]||0) - h) > 1){ S.flH[el.dataset.n] = h; ch = true; } });
      if(ch){ const svg = $('#flw svg.fls'), ym = flYm(), P = flPlan(ym), Fx = flEff(ym, P); if(svg) svg.innerHTML = flWires(P, Fx); } } }catch(e){}
  return r; })(render);
