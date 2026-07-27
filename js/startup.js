/* ===== 5. Démarrage : auth, chargement & synchronisation ===== */
  if(CLOUD){
    var _ab=document.querySelectorAll(".acct-btn");for(var _i=0;_i<_ab.length;_i++)_ab[_i].hidden=false;
    var lf=document.getElementById("login-form");
    if(lf)lf.addEventListener("submit",function(e){e.preventDefault();var em=(document.getElementById("login-email").value||"").trim(),pw=document.getElementById("login-pass").value||"";document.getElementById("login-err").textContent="";auth.signInWithEmailAndPassword(em,pw).catch(function(err){document.getElementById("login-err").textContent="Connexion impossible. Vérifie l'e-mail et le mot de passe.";});});
    auth.onAuthStateChanged(function(u){fbUser=u;if(u){showLogin(false);var _ab2=document.querySelectorAll(".acct-btn");for(var _j=0;_j<_ab2.length;_j++)_ab2[_j].textContent=acctInitial();loadCloud();loadAccess(u);}else{if(unsub){unsub();unsub=null;}if(congesUnsub){congesUnsub();congesUnsub=null;}congesData=null;moduleAccess={voyages:true,conges:true,skincare:true};applyModuleAccess();showLogin(true);hideBoot();}});
  }else{
    store=loadStore();var lg=store.conges;if(lg)delete store.conges;congesData=loadCongesLocal()||lg||{};state=activeTrip();renderTripSwitch();renderAll();renderConges();save();hideBoot();bootRoute();
  }
