/* =====================================================================
   61. VERSION 1.34.1 – VON–BIS ZEIGT IMMER DEN BETRACHTETEN ZEITRAUM
   Die Datumsfelder stehen bei Buchungen und Analyse immer da und zeigen den Zeitraum, den du
   gerade anschaust (auch nach Woche · Monat · Jahr oder ‹ ›). Ändern = neuer Zeitraum.
   ===================================================================== */
vBuchungen2 = (prev => function(){
  const keep = S.bCustOpen; S.bCustOpen = true;                    // Von–Bis immer zeigen
  let h; try{ h = prev(); } finally { S.bCustOpen = keep; }
  return h.replace(/<button class="[^"]*" data-act="bcustopen">Zeitraum<\/button>/, '');
})(vBuchungen2);
