/* =====================================================================
   94. BUDGET AUF 10 FRANKEN GENAU (1.67.1)
   Statt auf 50 Franken werden Vorschläge aus «Budget aus Zahlungen» und alle
   Beträge des Fluss-Assistenten auf 10 Franken gerundet.
   ===================================================================== */
var BUD_STEP = 10;
r50 = v => v > 0.5 ? Math.max(BUD_STEP, Math.round(v/BUD_STEP)*BUD_STEP) : 0;   // Budgetbeträge
f50 = v => v > 0.5 ? Math.floor(v/BUD_STEP)*BUD_STEP : 0;                       // Drähte aus der Rechnung: nie mehr als frei
