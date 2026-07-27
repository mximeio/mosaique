/* ===== 4ter. Module Skincare (routines de soins) ===== */
  var SKIN_KEY="skincare-store-v1";
  var skinData=null,skinActive=null,skinMoment=null,skinRetinol=false,skinUnsub=null,skinTimers={},skinReadOnly=false;
  var skinCfg=null,skinCfgLoaded=false; /* config/skincare : mapping { routineId: uid } */
  function skinEmail(){return (fbUser&&fbUser.email)?fbUser.email.trim().toLowerCase():"";}
  function skinUid(){return (fbUser&&fbUser.uid)?fbUser.uid:"";}
  function skinDefaultMoment(){var h=new Date().getHours();return (h>=5&&h<16)?"matin":"soir";}
  function skinCtxIdx(){return skinMoment==="matin"?0:(skinRetinol?2:1);}
  function skinRoutine(){if(!skinData||!skinData.routines)return null;var a=skinData.routines,i;for(i=0;i<a.length;i++)if(a[i].id===skinActive)return a[i];return a[0]||null;}
  /* Appartenance pilotée par config/skincare (comme config/conges) : mapping id→uid,
     éditable en console uniquement. Pas de config, ou routine non listée → ouvert. */
  function skinEditable(r){if(!r)return false;if(!skinCfgLoaded)return true;if(!skinCfg)return true;var o=skinCfg[r.id];return !o||o===skinUid();}
  function ensureSkin(){
    if(!skinData||!skinData.routines)skinData={routines:[]};
    skinData.routines.forEach(function(r){
      if(!r.id)r.id=uid();if(!r.products)r.products=[];if(typeof r.seq!=="number")r.seq=r.products.length+2;
      r.products.forEach(function(p){if(!p.id)p.id="s"+(r.seq++);if(!p.ctx||p.ctx.length!==3)p.ctx=[0,0,0];if(!p.refs)p.refs=[];
        p.refs.forEach(function(rf){if(!rf.id)rf.id="r"+(r.seq++);});
        if(p.refs.length&&!p.refs.some(function(rf){return rf.active;}))p.refs[0].active=true;});
    });
    if(skinMoment==null)skinMoment=skinDefaultMoment();
    if(skinActive==null||!skinData.routines.some(function(r){return r.id===skinActive;})){
      var mine=skinData.routines.filter(function(r){return skinCfg&&skinUid()&&skinCfg[r.id]===skinUid();})[0];
      skinActive=(mine||skinData.routines[0]||{}).id||null;
    }
    return skinData;
  }
  function skinActiveRef(p){for(var i=0;i<p.refs.length;i++)if(p.refs[i].active)return p.refs[i];return null;}
  function skinCache(){try{localStorage.setItem(SKIN_KEY,JSON.stringify(skinData));}catch(e){}}
  function skinSort(){if(skinData&&skinData.routines)skinData.routines.sort(function(a,b){return (a.name||"").localeCompare(b.name||"");});}
  function skinFromSnap(snap){var out={routines:[]};snap.forEach(function(doc){var d=doc.data()||{},r={};try{r=JSON.parse(d.json||"{}");}catch(e){r={};}r.id=doc.id;out.routines.push(r);});return out;}
  function skinPayload(r){return {json:JSON.stringify({name:r.name,color:r.color,seq:r.seq,products:r.products})};}
  function loadSkincareColl(){
    var coll=db.collection("skincare");
    coll.get().then(function(snap){
      skinData=skinFromSnap(snap);skinSort();ensureSkin();skinCache();
      if(curModule==="skincare")renderSkincare();
      if(skinUnsub)skinUnsub();
      skinUnsub=coll.onSnapshot(function(sn){if(sn.metadata.hasPendingWrites)return;skinData=skinFromSnap(sn);skinSort();ensureSkin();skinCache();if(curModule==="skincare"&&!isEditing())renderSkincare();});
    }).catch(function(){try{var s=JSON.parse(localStorage.getItem(SKIN_KEY));if(s&&s.routines)skinData=s;}catch(e){}ensureSkin();if(curModule==="skincare")renderSkincare();});
  }
  function loadSkincare(){
    if(!(CLOUD&&db&&fbUser)){try{var s=JSON.parse(localStorage.getItem(SKIN_KEY));if(s&&s.routines)skinData=s;}catch(e){}ensureSkin();if(curModule==="skincare")renderSkincare();return;}
    /* Appartenance : config/skincare (mapping id→uid), édité en console comme config/conges. */
    db.collection("config").doc("skincare").get().then(function(cs){skinCfg=(cs.exists?(cs.data()||null):null);skinCfgLoaded=true;loadSkincareColl();}).catch(function(){skinCfg=null;skinCfgLoaded=true;loadSkincareColl();});
  }
  function skinSave(r){
    if(!r||!skinEditable(r))return;skinCache();
    if(!(CLOUD&&fbUser&&db))return;
    clearTimeout(skinTimers[r.id]);
    skinTimers[r.id]=setTimeout(function(){try{db.collection("skincare").doc(r.id).set(skinPayload(r));}catch(e){}},700);
  }
  function renderSkincare(){
    var body=document.getElementById("sk-body"),sel=document.getElementById("sk-persel"),title=document.getElementById("sk-title");
    if(!body)return;
    if(!skinData){body.innerHTML='<div class="sk-empty">Chargement…</div>';if(sel)sel.innerHTML="";return;}
    ensureSkin();
    var r=skinRoutine();
    var LOCK='<span class="sk-lock" title="Lecture seule"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span>';
    if(sel)sel.innerHTML=skinData.routines.map(function(x){var lk=!skinEditable(x);return '<button type="button" class="sk-pchip'+(x.id===skinActive?" on":"")+'" data-sk-per="'+esc(x.id)+'"><span class="sk-av" style="background:'+esc(x.color||"#818cf8")+'">'+esc((x.name||"?")[0].toUpperCase())+'</span>'+esc(x.name||"Routine")+(lk?LOCK:'')+'</button>';}).join("");
    skinReadOnly=!skinEditable(r);
    if(title)title.innerHTML=r?("Skincare — "+esc(r.name)+(skinReadOnly?LOCK:'')):"Skincare";
    if(!r){body.innerHTML='<div class="sk-empty">Aucune routine.</div>';return;}
    var ed=!skinReadOnly,ci=skinCtxIdx();
    var mbar='<div class="sk-momentbar"><div class="sk-momseg" id="sk-momseg"><button type="button" data-sk-m="matin"'+(skinMoment==="matin"?' class="on"':'')+'>☀️ Matin</button><button type="button" data-sk-m="soir"'+(skinMoment==="soir"?' class="on"':'')+'>🌙 Soir</button></div>'
      +(skinMoment==="soir"?'<span class="sk-ret">Rétinol<button type="button" id="sk-ret-sw" class="sk-sw'+(skinRetinol?" on":"")+'"></button></span>':'')
      +(ed?'<button type="button" class="btn primary sk-add" data-sk-add="1">+ Produit</button>':'')+'</div>';
    /* Tableau (desktop) */
    var rows=r.products.map(function(p){
      var ar=skinActiveRef(p),nm='<td class="sk-name">'+(ed?'<span class="sk-drag" title="Glisser pour réordonner">⠿</span>':'')+esc(p.name)+(ar?'<small>'+esc(ar.label)+'</small>':'')+'</td>';
      var cells="";for(var c=0;c<3;c++){cells+='<td class="sk-cell'+(c===ci?" sk-now":"")+(ed?"":" sk-ro")+'" data-sk-cell="'+esc(p.id)+'" data-sk-c="'+c+'">'+(p.ctx[c]?'<span class="sk-y">✓</span>':'<span class="sk-x">—</span>')+'</td>';}
      var pen=ed?'<td><button type="button" class="sk-pen" data-sk-edit="'+esc(p.id)+'" title="Fiche produit"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg></button></td>':'<td></td>';
      return '<tr data-sk-row="'+esc(p.id)+'">'+nm+cells+pen+'</tr>';
    }).join("");
    var tab='<div class="sk-tab-wrap"><table class="sk-tab"><tr><th class="sk-lh">Produit</th><th'+(ci===0?' class="sk-now"':'')+'>☀️ Matin</th><th'+(ci===1?' class="sk-now"':'')+'>🌙 Soir</th><th'+(ci===2?' class="sk-now"':'')+'>🌙 Soir + R</th><th style="width:34px"></th></tr>'+(rows||'')+'</table>'+(r.products.length?'':'<div class="sk-empty">Aucun produit'+(ed?' — « + Produit » pour commencer.':'.')+'</div>')+'</div>';
    /* Liste du moment (mobile) */
    var list=r.products.filter(function(p){return p.ctx[ci];});
    var lrows=list.map(function(p,i){var ar=skinActiveRef(p);
      return '<div class="sk-step"'+(ed?' data-sk-edit="'+esc(p.id)+'" style="cursor:pointer"':'')+'><span class="sk-n">'+(i+1)+'</span><span class="sk-tx"><b>'+esc(p.name)+(p.name.indexOf("Rétin")===0?' <span class="sk-rtag">RÉTINOL</span>':'')+'</b>'+(ar?'<small>'+esc(ar.label)+'</small>':'')+'</span>'+(ed?'<button type="button" class="sk-pen" data-sk-edit="'+esc(p.id)+'"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg></button>':'')+'</div>';
    }).join("");
    var listWrap='<div class="sk-list">'+(list.length?lrows:'<div class="sk-empty">Rien à ce moment-là.</div>')+(ed?'<div style="padding:10px 0 4px"><button type="button" class="btn primary" data-sk-add="1" style="width:100%;justify-content:center">+ Produit</button></div>':'')+'</div>';
    body.innerHTML=mbar+tab+listWrap;
  }
  function skinMoveProduct(src,target,after){var r=skinRoutine();if(!r||!skinEditable(r))return;var a=r.products,it=null,i;for(i=0;i<a.length;i++)if(a[i].id===src){it=a.splice(i,1)[0];break;}if(!it)return;var ti=-1;for(i=0;i<a.length;i++)if(a[i].id===target){ti=i;break;}if(ti<0)a.push(it);else a.splice(after?ti+1:ti,0,it);skinSave(r);renderSkincare();}
  function skinProd(id){var r=skinRoutine();if(!r)return null;for(var i=0;i<r.products.length;i++)if(r.products[i].id===id)return r.products[i];return null;}
  function openSkinProdModal(id){
    var r=skinRoutine();if(!r||!skinEditable(r))return;
    var isNew=!id,p=isNew?{id:"s"+(r.seq++),name:"",ctx:[0,0,0],refs:[]}:skinProd(id);
    if(!p)return;
    modalCtx={type:"skinprod",id:p.id,isNew:isNew};
    var refsHtml=p.refs.map(function(rf){return skinRefRow(rf);}).join("");
    var body='<div style="margin-bottom:16px"><div class="skm-lab">Nom</div><input id="skm-name" class="skm-fld" value="'+esc(p.name)+'" placeholder="Nom du produit"/></div>'
      +'<div style="margin-bottom:16px"><div class="skm-lab">Application</div><div class="skm-ctx" id="skm-ctx">'
        +'<button type="button" data-skm-c="0"'+(p.ctx[0]?' class="on"':'')+'>☀️ Matin</button>'
        +'<button type="button" data-skm-c="1"'+(p.ctx[1]?' class="on"':'')+'>🌙 Soir</button>'
        +'<button type="button" data-skm-c="2"'+(p.ctx[2]?' class="on"':'')+'>🌙 Soir + R</button></div></div>'
      +'<div><div class="skm-lab">Références</div><div id="skm-refs">'+refsHtml+'</div>'
      +'<button type="button" class="skm-addref" data-skm-addref="1">+ référence</button>'
      +'<div style="font-size:11px;color:var(--color-text-soft);margin-top:2px">Le rond vert = référence utilisée ; tape un rond vide pour la choisir.</div></div>';
    openModal(isNew?"Nouveau produit":"Produit",body,!isNew);
  }
  function skinRefRow(rf){return '<div class="skm-ref'+(rf.active?" cur":"")+'" data-skm-ref="'+esc(rf.id)+'"><span class="skm-sel" data-skm-active="'+esc(rf.id)+'">'+(rf.active?"✓":"")+'</span><input value="'+esc(rf.label)+'" placeholder="Marque — produit" data-skm-lab="'+esc(rf.id)+'"/><button type="button" class="skm-del" data-skm-delref="'+esc(rf.id)+'">×</button></div>';}
  function saveSkinProdModal(){
    var r=skinRoutine();if(!r)return;var mb=document.getElementById("modal-body");if(!mb)return;
    var p=modalCtx.isNew?{id:modalCtx.id,name:"",ctx:[0,0,0],refs:[]}:skinProd(modalCtx.id);if(!p)return;
    p.name=(mb.querySelector("#skm-name").value||"").trim()||"Sans nom";
    var ctxBtns=mb.querySelectorAll("#skm-ctx button");p.ctx=[0,0,0];for(var i=0;i<ctxBtns.length;i++)if(ctxBtns[i].classList.contains("on"))p.ctx[+ctxBtns[i].dataset.skmC]=1;
    var refs=[],rows=mb.querySelectorAll(".skm-ref");for(i=0;i<rows.length;i++){var idr=rows[i].dataset.skmRef,inp=rows[i].querySelector("input"),lab=(inp.value||"").trim();if(!lab)continue;refs.push({id:idr,label:lab,active:rows[i].classList.contains("cur")});}
    if(refs.length&&!refs.some(function(x){return x.active;}))refs[0].active=true;
    p.refs=refs;
    if(modalCtx.isNew)r.products.push(p);
    skinSave(r);closeModal();renderSkincare();
  }
  function skinDeleteProd(){var r=skinRoutine();if(!r||!modalCtx)return;var nm=(skinProd(modalCtx.id)||{}).name||"";if(!confirm("Supprimer le produit"+(nm?" « "+nm+" »":"")+" ?"))return false;r.products=r.products.filter(function(x){return x.id!==modalCtx.id;});skinSave(r);renderSkincare();return true;}
  /* Interactions Skincare */
  (function(){
    var body=document.getElementById("sk-body"),sel=document.getElementById("sk-persel");
    if(body)enableDrag(body,"tr[data-sk-row]",".sk-drag",function(it){return it.dataset.skRow;},skinMoveProduct,"sk-drop-before","sk-drop-after");
    if(sel)sel.addEventListener("click",function(e){var b=e.target.closest("[data-sk-per]");if(!b)return;skinActive=b.dataset.skPer;renderSkincare();syncHash();});
    if(body)body.addEventListener("click",function(e){
      var m=e.target.closest("[data-sk-m]");if(m){skinMoment=m.dataset.skM;renderSkincare();return;}
      if(e.target.closest("#sk-ret-sw")){skinRetinol=!skinRetinol;renderSkincare();return;}
      if(e.target.closest("[data-sk-add]")){openSkinProdModal(null);return;}
      var pe=e.target.closest("[data-sk-edit]");if(pe){openSkinProdModal(pe.dataset.skEdit);return;}
      var cl=e.target.closest("[data-sk-cell]");if(cl&&!cl.classList.contains("sk-ro")){var r=skinRoutine(),p=r&&skinProd(cl.dataset.skCell);if(p&&skinEditable(r)){var c=+cl.dataset.skC;p.ctx[c]=p.ctx[c]?0:1;skinSave(r);renderSkincare();}return;}
    });
    var mb=document.getElementById("modal-body");
    if(mb)mb.addEventListener("click",function(e){
      if(!(modalCtx&&modalCtx.type==="skinprod"))return;
      var cb=e.target.closest("#skm-ctx button");if(cb){cb.classList.toggle("on");return;}
      var ar=e.target.closest("[data-skm-active]");if(ar){var rows=mb.querySelectorAll(".skm-ref");for(var i=0;i<rows.length;i++){var on=rows[i].dataset.skmRef===ar.dataset.skmActive;rows[i].classList.toggle("cur",on);rows[i].querySelector(".skm-sel").textContent=on?"✓":"";}return;}
      var dr=e.target.closest("[data-skm-delref]");if(dr){var row=dr.closest(".skm-ref");if(row)row.remove();return;}
      if(e.target.closest("[data-skm-addref]")){var r=skinRoutine(),host=document.getElementById("skm-refs");if(host&&r){var tmp=document.createElement("div");tmp.innerHTML=skinRefRow({id:"r"+(r.seq++),label:"",active:host.children.length===0});host.appendChild(tmp.firstChild);var ni=host.lastChild.querySelector("input");if(ni)ni.focus();}return;}
    });
  })();
  