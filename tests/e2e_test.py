#!/usr/bin/env python3
"""Automatische Tests der Finanzen-App (laufen bei jedem Build in GitHub).

Nur ERFUNDENE Testdaten – nie persönliche Daten. Die Testdaten entstehen hier im Skript.
Geprüft wird:
  1. Verschlüsselung: PIN setzen, sperren, falsche PIN abgelehnt, richtige PIN öffnet,
     im Speicher steht nichts im Klartext.
  2. Jede Seite lässt sich ohne Fehler öffnen.
  2b. Auf dem Handy: nichts breiter als der Bildschirm, keine gequetschten Spalten.
  3. Jeder Link/Knopf mit Ziel (data-go) führt auf eine existierende Seite und nicht auf
     die Seite, auf der er steht (Fehler aus 1.56.0).
  4. Jeder Knopf (data-act) lässt sich antippen, ohne dass ein Programmfehler entsteht.
Aufruf: python3 tests/e2e_test.py www   → Exit-Code 0 = alles in Ordnung
"""
import sys, threading, functools, http.server, socketserver, json, pathlib
from playwright.sync_api import sync_playwright

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'www').resolve()
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
Handler = functools.partial(Quiet, directory=str(root))
srv = socketserver.TCPServer(('127.0.0.1', 0), Handler); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{port}/index.html'

SEED = r"""() => {
  D = blank();
  const cat = (id,name,group) => D.cats.push({id,name,group,acc:null});
  cat('restaurant','Restaurant','freizeit'); cat('steuern','Steuern','fix'); cat('kv','Krankenkasse','fix');
  cat('einkaufen','Einkaufen','freizeit'); cat('gesundheit','Gesundheit','leben'); cat('handy','Handy-Abo','fix');
  D.accounts.push({id:'kk',name:'Test Kreditkarte',kind:'debt',rate:12,startYm:TODAY,start:0,out:0,outM:{},abos:false,grp:'karte'});
  if(!D.accounts.some(a=>a.id==='spar')) D.accounts.push({id:'spar',name:'Testsparkonto',kind:'asset',liquid:true,rate:0,startYm:TODAY,start:0,out:0,outM:{},abos:false});
  D.bal = {pf:{d:todayIso(),v:2100}, kk:{d:todayIso(),v:-1800}, spar:{d:todayIso(),v:3500}};
  let n = 0; const add = (d,acc,sa,c,nm) => D.tx.push({id:'t'+(n++),d,imp:1,bacc:acc,acc,sa,a:Math.abs(sa),c,n:nm});
  for(let i=7;i>=0;i--){ const ym = ymAdd(TODAY,-i);
    add(ym+'-25','pf',6200,'_inc','Testlohn AG'); add(ym+'-03','kk',-420,'lebensmittel','Testmarkt');
    add(ym+'-12','kk',-90,'restaurant','Testpizzeria'); add(ym+'-15','pf',-1500,'miete','Testvermieter');
    add(ym+'-20','pf',-380,'kv','Testkasse'); add(ym+'-08','kk',-39,'handy','Testabo'); add(ym+'-18','kk',-60,'','Unbekannt Test');
    for(const [c,v] of [['miete',1500],['lebensmittel',450],['restaurant',120],['kv',380],['handy',39],['sparen',500]]){ (D.plan[c] ??= {})[ym] = v; }
    D.income[ym] = 6200; }
  add(ymAdd(TODAY,-3)+'-10','pf',-2400,'steuern','Teststeueramt');
  D.wishes.push({id:'w1',name:'Testkonzert',price:120,type:'erlebnis'});
  D.goals.push({id:'g1',name:'Testziel',target:5000,saved:500});
  save(); calc();
}"""

OPEN = "v => { if($('#dlg').open) $('#dlg').close(); S.view = v; render(); document.querySelectorAll('#main details').forEach(d => d.open = true); }"
fails = []
def fail(msg):
    fails.append(msg); print('FEHLER:', msg)

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = b.new_context(viewport={'width': 412, 'height': 900}, service_workers='block')
    ctx.route('**/*', lambda r: r.continue_() if r.request.url.startswith(f'http://127.0.0.1:{port}') else r.abort())  # kein Internet
    p = ctx.new_page(); errs = []
    p.on('pageerror', lambda e: errs.append(str(e)))
    p.on('dialog', lambda d: d.dismiss())   # Rückfragen immer mit «Abbrechen» beantworten → nichts wird gelöscht
    p.goto(URL); p.wait_for_timeout(1500)
    p.evaluate(SEED); p.wait_for_timeout(300)

    # 1. Verschlüsselung
    r = p.evaluate("""async () => {
      await setPin('482915'); await SAVEQ; const all = Object.keys(localStorage).map(k=>localStorage.getItem(k)).join('\\n');
      const plain = /Testpizzeria|Testlohn/.test(all);
      lock(); const locked = D===null;
      const wrong = await verifyPin('111111'), right = await verifyPin('482915');
      await unlock('482915'); const back = !!D && D.tx.some(t=>t.n==='Testpizzeria');
      return {plain, locked, wrong, right, back}; }""")
    if r['plain']: fail('Verschlüsselung: Testdaten stehen im Klartext im Speicher')
    if not r['locked']: fail('Sperren: Daten bleiben nach dem Sperren im Speicher')
    if r['wrong']: fail('Verschlüsselung: falsche PIN wurde akzeptiert')
    if not (r['right'] and r['back']): fail('Verschlüsselung: richtige PIN öffnet die Daten nicht')
    print('Verschlüsselung geprüft:', r)

    # 2.–4. Alle Seiten und Knöpfe
    views = p.evaluate("() => [...new Set([...Object.keys(TITLES), ...HUBS.flatMap(h=>h.tabs.map(t=>t[0]))])]")
    skip_act = {'blank','seed','import','alldel','wipe','reset','logout','update','pairscan','scan','photo','camera'}
    sel = "#main [data-act], #main [data-go]"
    total = 0
    ok_js = """v => { const ok = new Set([...Object.keys(TITLES), ...HUBS.flatMap(h=>h.tabs.map(t=>t[0])), 'schulden']);
          return [...document.querySelectorAll('#main [data-go]')].filter(e => {
            const g = e.dataset.go; if(g.startsWith('@')) return false;
            if(!ok.has(g)) return true;
            return g === S.view && !e.closest('.hubtabs, .tabs, .seg, nav');
          }).map(e => e.dataset.go + ' («' + e.textContent.trim().slice(0,40) + '»)'); }"""
    # Durchgang 1: jede Seite öffnen und alle Ziele prüfen (bevor Knöpfe etwas verändern)
    for v in views:
        e0 = len(errs)
        p.evaluate(OPEN, v); p.wait_for_timeout(120)
        if len(errs) > e0: fail(f'Seite «{v}»: {errs[-1][:160]}'); continue
        w = p.evaluate("() => [document.documentElement.scrollWidth, innerWidth, [...document.querySelectorAll('#main .grid.g2')].filter(g => getComputedStyle(g).gridTemplateColumns.split(' ').length > 1).length]")
        if w[0] > w[1] + 1: fail(f'Seite «{v}»: auf dem Handy breiter als der Bildschirm ({w[0]} statt {w[1]} px)')
        if w[2]: fail(f'Seite «{v}»: {w[2]} Bereich(e) auf dem Handy gequetscht nebeneinander statt untereinander')
        for x in p.evaluate(ok_js, v): fail(f'Seite «{v}»: Ziel {x} fehlt oder zeigt auf dieselbe Seite')
    # Durchgang 2: jeden Knopf antippen
    for v in views:
        n = p.evaluate("v => { S.view = v; render(); document.querySelectorAll('#main details').forEach(d => d.open = true); return document.querySelectorAll('" + sel + "').length; }", v)
        for i in range(n):
            p.evaluate(OPEN, v)
            el = p.query_selector_all(sel)
            if i >= len(el): break
            act = el[i].get_attribute('data-act') or ''
            if act in skip_act or not el[i].is_visible(): continue
            e0 = len(errs); total += 1
            try: el[i].click(timeout=800, no_wait_after=True)
            except Exception: continue
            p.wait_for_timeout(60)
            if len(errs) > e0: fail(f'Seite «{v}», Knopf «{act or el[i].get_attribute("data-go")}»: {errs[-1][:160]}')
    print(f'{len(views)} Seiten und {total} Knöpfe geprüft')
    b.close()

if fails:
    print(f'\n{len(fails)} Fehler'); sys.exit(1)
print('Alle Tests bestanden')
