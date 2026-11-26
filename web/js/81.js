/* =====================================================================
   VERSION 1.57.0 – iPhone-Version: gleiche App, passende Begriffe
   Auf dem iPhone heisst es «Face ID» statt «Fingerabdruck» und «iOS» statt «Android».
   Updates kommen dort über den App Store bzw. TestFlight (keine eigene Update-Funktion).
   ===================================================================== */
var IOS_WORDS = [
  [/Fingerabdrücke/g, 'Face-ID-Daten'], [/Fingerabdruck-Abfrage/g, 'Face-ID-Abfrage'], [/Fingerabdruck/g, 'Face ID'],
  [/im Handy/g, 'im iPhone'], [/\bAndroid\b/g, 'iOS'], [/Google Play Store/g, 'App Store'],
];
function iosWords(root){
  if(!IOS || !root || !root.nodeType) return;
  const list = [];
  if(root.nodeType === 3) list.push(root);
  else { const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode: n => /Fingerabdr|im Handy|Android|Google Play/.test(n.nodeValue) && !n.parentElement?.closest('script,style,textarea') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP});
    while(tw.nextNode()) list.push(tw.currentNode); }
  for(const n of list){ let v = n.nodeValue; for(const [a,b] of IOS_WORDS) v = v.replace(a, b); if(v !== n.nodeValue) n.nodeValue = v; }
}
if(IOS){
  document.documentElement.classList.add('ios');
  new MutationObserver(ms => { for(const m of ms){ if(m.type === 'characterData') iosWords(m.target); else m.addedNodes.forEach(iosWords); } })
    .observe(document.body || document.documentElement, {childList:true, subtree:true, characterData:true});
  document.addEventListener('DOMContentLoaded', () => iosWords(document.body));
}
