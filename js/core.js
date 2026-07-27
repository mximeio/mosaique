"use strict";

  /* ============================================================
     ESPACE — application mono-fichier. Plan du script :
       1. Config, état global & Firebase
       2. Module Voyages (données, rendu, dépenses, parts, réglages)
       3. Shell multi-modules (onglets + droits par module)
       4. Module Congés (calendrier, soldes, vacances)
       5. Démarrage : auth, chargement & synchronisation
     ============================================================ */
  /* ===== 1. Config, état global & Firebase ===== */
  var KEY="budget-vacances-v1",STORE_KEY="budget-vacances-store-v2";
  var palette=["#4f46e5","#0ea5e9","#10b981","#f59e0b","#f43f5e","#8b5cf6","#06b6d4","#ec4899","#14b8a6","#f97316"];
  var store,state;
  function uid(){return "t"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
  var FB={apiKey:"AIzaSyC5jQMCRydOVHWYiRhC1LAG_VJVOWzWv7Y",authDomain:"mosaique-652b4.firebaseapp.com",projectId:"mosaique-652b4",storageBucket:"mosaique-652b4.firebasestorage.app",messagingSenderId:"245540730613",appId:"1:245540730613:web:2230a37948f709d778f7bc"};
  var CLOUD=false,auth=null,db=null,fbUser=null,cloudTimer=null,SHARED="shared",lastJson=null,pendingRemote=null,unsub=null;
  try{if(typeof firebase!=="undefined"&&FB.apiKey){firebase.initializeApp(FB);auth=firebase.auth();db=firebase.firestore();CLOUD=true;}}catch(e){}
  var CHK='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>';
  var BUBBLE='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 9 9 0 0 1-4-1L3 20l1-4.5a8.5 8.5 0 1 1 16-4z"/></svg>';
  var ARROW='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--color-text-tertiary);flex:none;margin-top:2px"><path d="M5 5v6a4 4 0 0 0 4 4h10M15 11l4 4-4 4"/></svg>';
  var PENCIL='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
  var ARCH='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/></svg>';
  var UNARCH='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M12 18v-6M9 15l3-3 3 3"/></svg>';
  var LINKIC='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>';

  