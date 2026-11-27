/* 1.59.0 – Handy: Reiter oben zeigen, dass es weitergeht, und der gewählte Reiter ist sichtbar */
function hubTabsFit(){
  document.querySelectorAll('.hubtabs').forEach(h => {
    const upd = () => { h.classList.toggle('ml', h.scrollLeft > 4); h.classList.toggle('mr', h.scrollLeft + h.clientWidth < h.scrollWidth - 4); };
    const on = h.querySelector('a.on');
    if(on && !h.dataset.fit){ const l = on.offsetLeft - h.offsetLeft, r = l + on.offsetWidth;
      if(r > h.clientWidth - 24 || l < h.scrollLeft) h.scrollLeft = Math.max(0, l - 24); }
    if(!h.dataset.fit){ h.dataset.fit = 1; h.addEventListener('scroll', upd, {passive:true}); }
    upd();
  });
}
render = (prev => function(){ const r = prev.apply(this, arguments); try{ hubTabsFit(); }catch(e){} return r; })(render);
addEventListener('resize', () => { try{ hubTabsFit(); }catch(e){} });
