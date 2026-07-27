/* ===== 3. Shell multi-modules (onglets + droits par module) ===== */
  var MODULES=["voyages","conges","skincare"];
  var moduleAccess={voyages:true,conges:true,skincare:true},curModule="voyages";
  function allowedModules(){return MODULES.filter(function(m){return moduleAccess[m];});}
  function setModule(mod){
    if(!moduleAccess[mod])mod=allowedModules()[0]||"voyages";
    MODULES.forEach(function(m){var el=document.getElementById("module-"+m);if(el)el.hidden=(m!==mod);});
    var tabs=document.querySelectorAll(".mod-tab");for(var i=0;i<tabs.length;i++)tabs[i].classList.toggle("active",tabs[i].dataset.mod===mod);
    curModule=mod;
    if(mod==="conges")renderConges();
    if(mod==="skincare")renderSkincare();
  }
  function applyModuleAccess(){
    var tabs=document.querySelectorAll(".mod-tab"),i;
    for(i=0;i<tabs.length;i++)tabs[i].hidden=!moduleAccess[tabs[i].dataset.mod];
    var navs=document.querySelectorAll(".mod-nav"),shown=(allowedModules().length>1);for(i=0;i<navs.length;i++)navs[i].style.display=shown?"":"none";
    setModule(moduleAccess[curModule]?curModule:(allowedModules()[0]||"voyages"));
  }
  function loadAccess(u){
    var uid=u&&u.uid;
    moduleAccess={voyages:true,conges:true,skincare:true};congesReadOnly=false;
    if(!(CLOUD&&db&&u)){applyModuleAccess();renderConges();return;}
    db.collection("config").doc("conges").get().then(function(snap){
      if(snap.exists){var d=snap.data()||{},w=d.write||[],r=d.read||[];
        if(w.length||r.length){
          if(uid&&w.indexOf(uid)>=0){moduleAccess.conges=true;congesReadOnly=false;}
          else if(uid&&r.indexOf(uid)>=0){moduleAccess.conges=true;congesReadOnly=true;}
          else{moduleAccess.conges=false;}
        }
      }
      applyModuleAccess();renderConges();
    }).catch(function(){applyModuleAccess();renderConges();});
  }
  (function(){
    document.addEventListener("click",function(e){var b=e.target.closest(".mod-tab");if(b&&moduleAccess[b.dataset.mod]){setModule(b.dataset.mod);syncHash();}});
    try{document.title="Mosaïque";}catch(e){}
    applyModuleAccess();
  })();
  