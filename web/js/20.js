/* =====================================================================
   28. WEB-VERSION: Schutz vor Einbetten in fremde Webseiten (Klick-Betrug)
   Läuft die App in einem Rahmen einer anderen Seite, startet sie nicht.
   ===================================================================== */
if(!NATIVE && window.top !== window.self){ document.documentElement.innerHTML = ''; throw new Error('Die App darf nicht in eine andere Seite eingebettet werden.'); }
