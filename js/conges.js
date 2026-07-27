/* ===== 4. Module Congés (calendrier, soldes, vacances) ===== */
  var CG_MFULL=["Janv","Févr","Mars","Avr","Mai","Juin","Juil","Août","Sept","Oct","Nov","Déc"];
  var CG_MN=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
  var CG_COLORS={CP:"#FF0000",RTT:"#92D050",CSS:"#94A3B8",MAL:"#FFC000",PREV:"#FFFF00",FRAC:"#00B050",JF:"#DAE3F3"};
  var CG_PALETTE=["#92D050","#00B050","#FF0000","#FFC000","#FFFF00","#94A3B8"];
  var CG_DEFTYPES=[{c:"CP",col:CG_COLORS.CP,quota:25},{c:"RTT",col:CG_COLORS.RTT,quota:10},{c:"CSS",col:CG_COLORS.CSS,quota:0},{c:"MAL",col:CG_COLORS.MAL,quota:0},{c:"PREV",col:CG_COLORS.PREV,quota:0,impute:true},{c:"FRAC",col:CG_COLORS.FRAC,quota:0}];
  var congesYear=(new Date()).getFullYear(),congesActive="CP",congesDrag=false,congesPaintVal=null,congesReadOnly=false;
  var cgJFCur=null,cgVacCur=null,CG_VACCOL="#c084fc",congesAsOf="",congesAnchor=null,congesLast=null,cgPrevCells=[],cgDrag=null,cgSetPop=null,cgArchOpen=false,cgVacByDay={},cgTipHideTimer=null,cgTipVac=null,congesVacView=false,congesEditMode=false,cgSolTips={},cgVacTapAnchor=null,cgSolView=(function(){try{return localStorage.getItem("cg-sol-view")||"bars";}catch(e){return "bars";}})();
  var CONGES_KEY="conges-store-v1",congesData=null,congesTimer=null,congesLastJson=null,congesUnsub=null,congesPendingRemote=null;
  function saveConges(){if(congesReadOnly||!congesData)return;var j=JSON.stringify(congesData);try{localStorage.setItem(CONGES_KEY,j);}catch(e){}if(CLOUD&&fbUser&&db){clearTimeout(congesTimer);congesTimer=setTimeout(function(){congesLastJson=j;try{db.collection("conges").doc(SHARED).set({json:j});}catch(e){}},700);}}
  function loadCongesLocal(){try{var s=JSON.parse(localStorage.getItem(CONGES_KEY));if(s&&typeof s==="object")return s;}catch(e){}return null;}
  function applyCongesRemote(json){var s;try{s=JSON.parse(json);}catch(e){return;}if(!s)return;congesData=s;ensureConges();congesLastJson=json;try{localStorage.setItem(CONGES_KEY,json);}catch(e){}renderConges();}
  function onCongesRemote(json){if(json==null||json===congesLastJson)return;if(congesDrag||isEditing()){congesPendingRemote=json;return;}applyCongesRemote(json);}
  function loadConges(legacy){
    if(!(CLOUD&&db&&fbUser)){congesData=loadCongesLocal()||legacy||{};ensureConges();renderConges();return;}
    var ref=db.collection("conges").doc(SHARED);
    ref.get().then(function(snap){
      var s=null;if(snap.exists){var d=snap.data();if(d&&d.json){try{s=JSON.parse(d.json);}catch(e){}}}
      var hasData=s&&s.grid&&Object.keys(s.grid).length;
      if(!hasData&&legacy&&legacy.grid&&Object.keys(legacy.grid).length)s=legacy;
      congesData=s||{};ensureConges();congesLastJson=JSON.stringify(congesData);
      try{localStorage.setItem(CONGES_KEY,congesLastJson);}catch(e){}
      if(!snap.exists){try{ref.set({json:congesLastJson});}catch(e){}}
      renderConges();
      if(congesUnsub)congesUnsub();
      congesUnsub=ref.onSnapshot(function(sn){if(sn.metadata.hasPendingWrites)return;var dd=sn.data();if(dd&&dd.json)onCongesRemote(dd.json);});
    }).catch(function(){congesData=legacy||loadCongesLocal()||{};ensureConges();renderConges();});
  }
  function ensureConges(){
    if(!congesData)congesData={};var c=congesData;
    if(!c.grid)c.grid={};if(!c.labels)c.labels={};if(!c.vacs)c.vacs=[];
    if(c.vac&&Object.keys(c.vac).length){var arr=Object.keys(c.vac).map(function(k){var p=k.split("-");return new Date(+p[0],+p[1],+p[2]);}).sort(function(a,b){return a-b;});var rs=null,re=null,flush=function(){if(!rs)return;var lbl=(c.labels["v-"+rs.getFullYear()+"-"+rs.getMonth()+"-"+rs.getDate()]||"");c.vacs.push({id:uid(),s:{y:rs.getFullYear(),m:rs.getMonth(),d:rs.getDate()},e:{y:re.getFullYear(),m:re.getMonth(),d:re.getDate()},label:lbl});};arr.forEach(function(dt){if(re&&(dt-re)===86400000)re=dt;else{flush();rs=dt;re=dt;}});flush();c.vac={};}
    if(!c.types||!c.types.length)c.types=CG_DEFTYPES.map(function(t){return{c:t.c,col:t.col,impute:!!t.impute};});
    if(!c.balances)c.balances=[];
    var findT=function(code){for(var i=0;i<c.types.length;i++)if(c.types[i].c===code)return c.types[i];return null;};
    c.types.forEach(function(t){if(t.impute===undefined)t.impute=(t.c==="PREV");});
    var tc={};c.types.forEach(function(t){tc[t.c]=1;});
    Object.keys(c.grid).forEach(function(k){if(tc[c.grid[k]])c.grid[k]="t:"+c.grid[k];});
    c.balances.slice().forEach(function(b){if(b.src){var tt=findT(b.type);if(tt)tt.impute=true;Object.keys(c.grid).forEach(function(k){if(c.grid[k]===b.id)c.grid[k]="i:"+b.type+":"+b.src;});c.balances=c.balances.filter(function(x){return x.id!==b.id;});}});
    c.balances.slice().forEach(function(b){var tt=findT(b.type);if(tt&&tt.impute){Object.keys(c.grid).forEach(function(k){if(c.grid[k]===b.id)c.grid[k]="t:"+b.type;});c.balances=c.balances.filter(function(x){return x.id!==b.id;});}});
    if(!c.balances.length)CG_DEFTYPES.forEach(function(t){if(t.quota>0)c.balances.push({id:uid(),type:t.c,period:(t.c==="RTT"?String((new Date()).getFullYear()):"2025-2026"),days:t.quota,archived:false});});
    return c;
  }
  function cgBal(id){var b=ensureConges().balances;for(var i=0;i<b.length;i++)if(b[i].id===id)return b[i];return null;}
  function cgParse(v){if(!v)return null;var s=String(v),portion="full",i=s.lastIndexOf("|");if(i>=0){var suf=s.slice(i+1);if(suf==="am"||suf==="pm"){portion=suf;s=s.slice(0,i);}}return {base:s,portion:portion};}
  function cgFrac(v){var p=cgParse(v);return p?(p.portion==="full"?1:0.5):0;}
  function cgFmtDays(n){return String(Math.round(n*10)/10);}
  function cgShortPeriod(p){var m=/^\d{2}(\d{2})\s*-\s*\d{2}(\d{2})$/.exec(p||"");return m?(m[1]+"-"+m[2]):(p||"");}
  function cgCatLabel(b){var per=b.period||(b.src?((cgBal(b.src)||{}).period||""):"");return b.type+(per?(" "+cgShortPeriod(per)):"");}
  function cgVacDays(){var c=ensureConges(),set={};(c.vacs||[]).forEach(function(v){var d=new Date(v.s.y,v.s.m,v.s.d),e=new Date(v.e.y,v.e.m,v.e.d);while(d<=e){if(d.getFullYear()===congesYear)set[d.getMonth()+"-"+d.getDate()]=1;d.setDate(d.getDate()+1);}});return set;}
  function cgTodayNum(){var n=new Date();return n.getFullYear()*10000+n.getMonth()*100+n.getDate();}
  function cgScan(cut){var c=ensureConges(),byCompte={},byRaw={},dirPast={},dirFut={},tPast={},tFut={},tPrev={},today=cgTodayNum();Object.keys(c.grid).forEach(function(k){var pa=k.split("-"),cy=+pa[0],cm=+pa[1],cd=+pa[2];if(cut!=null){if(cy>congesYear)return;if(cy===congesYear&&cm>cut)return;}var v=c.grid[k],pp=cgParse(v),base=pp.base,frac=pp.portion==="full"?1:0.5,past=(cy*10000+cm*100+cd)<=today;byRaw[base]=(byRaw[base]||0)+frac;var cid=cgCompteId(base);if(cid){byCompte[cid]=(byCompte[cid]||0)+frac;if(base.indexOf("i:")!==0){var tgt=past?dirPast:dirFut;tgt[cid]=(tgt[cid]||0)+frac;}}else{var ptt=cgPrevTypeTarget(base);if(ptt)tPrev[ptt]=(tPrev[ptt]||0)+frac;else if(base.indexOf("t:")===0){var code=base.slice(2),tg=past?tPast:tFut;tg[code]=(tg[code]||0)+frac;}}});return {byCompte:byCompte,byRaw:byRaw,dirPast:dirPast,dirFut:dirFut,tPast:tPast,tFut:tFut,tPrev:tPrev};}
  function cgScanYear(cut){var c=ensureConges(),byCompte={},byRaw={},dirPast={},dirFut={},tPast={},tFut={},tPrev={},today=cgTodayNum();Object.keys(c.grid).forEach(function(k){var pa=k.split("-"),cy=+pa[0],cm=+pa[1],cd=+pa[2];if(cy!==congesYear)return;if(cut!=null&&cm>cut)return;var v=c.grid[k],pp=cgParse(v),base=pp.base,frac=pp.portion==="full"?1:0.5,past=(cy*10000+cm*100+cd)<=today;byRaw[base]=(byRaw[base]||0)+frac;var cid=cgCompteId(base);if(cid){byCompte[cid]=(byCompte[cid]||0)+frac;if(base.indexOf("i:")!==0){var tgt=past?dirPast:dirFut;tgt[cid]=(tgt[cid]||0)+frac;}}else{var ptt=cgPrevTypeTarget(base);if(ptt)tPrev[ptt]=(tPrev[ptt]||0)+frac;else if(base.indexOf("t:")===0){var code=base.slice(2),tg=past?tPast:tFut;tg[code]=(tg[code]||0)+frac;}}});return {byCompte:byCompte,byRaw:byRaw,dirPast:dirPast,dirFut:dirFut,tPast:tPast,tFut:tFut,tPrev:tPrev};}
  function cgImputedForType(code,byRaw){var n=0;Object.keys(byRaw).forEach(function(k){if(k.indexOf("i:"+code+":")===0)n+=byRaw[k];});return n;}
  function cgPrevForCompte(id,byRaw){var n=0;Object.keys(byRaw).forEach(function(k){if(k.indexOf("i:")===0&&k.split(":")[2]===id)n+=byRaw[k];});return n;}
  function cgBrushes(){var c=ensureConges(),act=c.balances.filter(function(b){return !b.archived;}),out=[];
    c.types.forEach(function(t){
      if(t.impute){out.push({val:"i:"+t.c,type:t.c,label:t.c,impute:true});}
      else if(t.nosolde){out.push({val:"t:"+t.c,type:t.c,label:t.c});}
      else{var cs=act.filter(function(a){return a.type===t.c;});
        if(cs.length)cs.forEach(function(a){out.push({val:a.id,type:t.c,compte:a,label:cgCatLabel(a)});});
        else out.push({val:"t:"+t.c,type:t.c,label:t.c});
      }
    });
    return out;
  }
  function cgType(code){var t=ensureConges().types;for(var i=0;i<t.length;i++)if(t[i].c===code)return t[i];return null;}
  function typeImpute(code){var t=cgType(code);return !!(t&&t.impute);}
  function cgCompteId(v){if(!v)return null;var s=cgParse(v).base;if(s.indexOf("i:")===0){var p=s.split(":");return p[2]==="t"?null:(p[2]||null);}if(s.indexOf("t:")===0)return null;return s;}
  /* Cible "type sans décompte" d'un prévisionnel imputé : "i:CODE:t:TYPE" → "TYPE" */
  function cgPrevTypeTarget(base){if(base.indexOf("i:")!==0)return null;var p=base.split(":");return p[2]==="t"?(p[3]||null):null;}
  function cgCellCode(v){var s=cgParse(v)?cgParse(v).base:String(v);if(s.indexOf("i:")===0)return s.split(":")[1];if(s.indexOf("t:")===0)return s.slice(2);var b=cgBal(s);return b?b.type:"";}
  function cgCellLabel(v){var s=cgParse(v)?cgParse(v).base:String(v);if(s.indexOf("t:")===0)return s.slice(2);if(s.indexOf("i:")===0){var p=s.split(":"),tt=cgPrevTypeTarget(s);if(tt)return p[1]+" → "+tt;var b=cgBal(p[2]);return p[1]+(b?" → "+cgCatLabel(b):"");}var bb=cgBal(s);return bb?cgCatLabel(bb):s;}
  function cgColor(v){if(v==="JF")return CG_COLORS.JF;var t=cgType(cgCellCode(v));if(t)return t.col;return CG_COLORS[v]||"#cbd5e1";}
  /* Pastille d'un jour : reprend la grammaire du calendrier (hachuré teinté / hachuré gris clair pointillé / aplat) */
  function cgDotHTML(code){var pp=cgParse(code),base=pp?pp.base:String(code);
    if(base.indexOf("i:")===0){var ptt=cgPrevTypeTarget(base),col;
      if(ptt){var pt=cgType(ptt);col=pt?pt.col:"#9aa0a8";}
      else{var hb=cgBal(base.split(":")[2]);col=hb?((cgType(hb.type)||{}).col||"#9aa0a8"):"#9aa0a8";}
      return '<i class="cg-tip-dot" style="border-radius:3px;background:repeating-linear-gradient(-45deg,'+col+' 0 2.5px,#fff 2.5px 5px);box-shadow:inset 0 0 0 1px '+col+'"></i>';}
    if(base.indexOf("t:")===0&&typeImpute(base.slice(2)))return '<i class="cg-tip-dot" style="border-radius:3px;background:repeating-linear-gradient(-45deg,#cbd5e1 0 2.5px,#fff 2.5px 5px);border:1px dashed #9aa0a8"></i>';
    return '<i class="cg-tip-dot" style="background:'+cgColor(code)+'"></i>';}
  function cgDIM(y,m){return new Date(y,m+1,0).getDate();}
  function cgEaster(y){var a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,mm=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*mm+114)/31),da=((h+l-7*mm+114)%31)+1;return new Date(y,mo-1,da);}
  function cgJF(y){var s={},ea=cgEaster(y),add=function(dt,n){s[dt.getMonth()+"-"+dt.getDate()]=n;};add(new Date(y,0,1),"Jour de l'An");add(new Date(y,ea.getMonth(),ea.getDate()+1),"Lundi de Pâques");add(new Date(y,4,1),"Fête du Travail");add(new Date(y,4,8),"Victoire 1945");add(new Date(y,ea.getMonth(),ea.getDate()+39),"Ascension");add(new Date(y,ea.getMonth(),ea.getDate()+50),"Lundi de Pentecôte");add(new Date(y,6,14),"Fête nationale");add(new Date(y,7,15),"Assomption");add(new Date(y,10,1),"Toussaint");add(new Date(y,10,11),"Armistice");add(new Date(y,11,25),"Noël");return s;}
  function cgGet(y,m,d){return ensureConges().grid[y+"-"+m+"-"+d];}
  function cgSet(y,m,d,v){var g=ensureConges().grid,k=y+"-"+m+"-"+d;if(v)g[k]=v;else delete g[k];}
  function cgPeriods(y){
    var jf=cgJF(y),days=[],dt=new Date(y,0,1),end=new Date(y,11,31);
    while(dt<=end){var m=dt.getMonth(),d=dt.getDate(),g=dt.getDay(),code=cgGet(y,m,d),isjf=!!jf[m+"-"+d];days.push({m:m,d:d,off:(g===0||g===6)||!!code||isjf,posed:!!code});dt.setDate(dt.getDate()+1);}
    var out=[],i=0;while(i<days.length){if(!days[i].off){i++;continue;}var j=i;while(j<days.length&&days[j].off)j++;var run=days.slice(i,j);if(run.some(function(x){return x.posed;}))out.push({s:run[0],e:run[run.length-1],tot:run.length,posed:run.filter(function(x){return x.posed;}).length});i=j;}
    return out;
  }
  function renderConges(){
    var grid=document.getElementById("cg-grid");if(!grid)return;
    if(congesDrag)return;
    ensureConges();var y=congesYear,jf=cgJF(y),types=ensureConges().types;cgJFCur=jf;cgVacCur=cgVacDays();
    var yEl=document.getElementById("cg-year");if(yEl)yEl.textContent=y;
    var yp=document.getElementById("cg-year-pop");if(yp){var ry=(new Date()).getFullYear(),cells="",yi,yy;for(yi=0;yi<9;yi++){yy=y-4+yi;cells+='<div class="cg-yearcell'+(yy===y?" cur":"")+'" data-cg-year="'+yy+'">'+yy+'</div>';}yp.innerHTML='<div class="cg-yeargrid">'+cells+'</div><div class="cg-yeartoday" data-cg-year="'+ry+'">Année en cours</div>';}
    var roEl=document.getElementById("cg-ro");if(roEl)roEl.hidden=!congesReadOnly;
    var modEl=document.getElementById("module-conges");if(modEl)modEl.classList.toggle("cg-ro-on",congesReadOnly);
    var osEl=document.getElementById("cg-open-set");if(osEl)osEl.hidden=congesReadOnly;
    var sdv=document.getElementById("cg-set-div");if(sdv)sdv.hidden=congesReadOnly;
    var modesEl=document.getElementById("cg-modes");
    if(modesEl){
      var VEYE='<svg viewBox="0 0 24 24" width="13" height="13" style="display:block" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
      var vacBtn='<button type="button" class="cg-vacbtn'+(congesVacView?" on":"")+'" data-cg-vactoggle>'+VEYE+' Vue vacances</button>';
      var left=congesReadOnly
        ?'<span class="cg-modeinfo"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> Consultation uniquement</span>'
        :'<div class="cg-modeseg"><button type="button" class="cg-modebtn'+(!congesEditMode?" on":"")+'" data-cg-mode="view">Consultation</button><button type="button" class="cg-modebtn'+(congesEditMode?" on":"")+'" data-cg-mode="edit">Édition</button></div>';
      modesEl.innerHTML=left+vacBtn;
    }
    var brushes=cgBrushes();
    if(cgViewOnly())congesActive=null;
    else if(congesVacView)congesActive="__vac";
    else if(congesActive!=="__e"&&congesActive!=="__vac"&&!brushes.some(function(br){return br.val===congesActive;}))congesActive=brushes.length?brushes[0].val:"__e";
    var sc=cgScan(null),pal="";
    if(congesReadOnly){pal="";}
    else if(!congesEditMode){pal='<span class="cg-palhint">Passe en « Édition » pour modifier les congés</span>';}
    else if(congesVacView){
      pal='<span class="cg-pb cg-vacbrush sel" data-cg-t="__vac" style="background:'+rgba(CG_VACCOL,0.14)+';border-color:'+rgba(CG_VACCOL,0.55)+';color:'+shade(CG_VACCOL,0.42)+'"><span class="dot" style="background:'+CG_VACCOL+'"></span>Vacances</span>';
    }else{
      pal='<div class="cg-palwrap"><div class="cg-palscroll">';
      pal+=brushes.map(function(br){var t=cgType(br.type),col=br.impute?"#9aa0a8":(t?t.col:"#cbd5e1");
        var cntHtml='';if(br.compte&&br.compte.days>0){var restc=br.compte.days-(sc.byCompte[br.compte.id]||0);cntHtml=' <span class="cnt">'+cgFmtDays(restc)+'</span>';}
        var selp=(congesActive===br.val),stl=selp?('background:'+rgba(col,0.14)+';border-color:'+rgba(col,0.55)+';color:'+shade(col,0.42)):'';
        var dot=br.impute?'<span class="dot dot-prev"></span>':'<span class="dot" style="background:'+col+'"></span>';
        return '<span class="cg-pb'+(selp?" sel":"")+'" data-cg-t="'+esc(br.val)+'"'+(stl?' style="'+stl+'"':'')+' title="'+esc(br.label)+'">'+dot+esc(br.label)+cntHtml+'</span>';
      }).join("");
      pal+='<span class="cg-pb cg-eraser'+(congesActive==="__e"?" sel":"")+'" data-cg-t="__e" title="Effacer"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 20H20"/><path d="M4.7 15.3l4 4a1.5 1.5 0 0 0 2.1 0l8.5-8.5a1.5 1.5 0 0 0 0-2.1l-4-4a1.5 1.5 0 0 0-2.1 0L4.7 13.2a1.5 1.5 0 0 0 0 2.1z"/><path d="M9 10l5 5"/></svg>Effacer</span>';
      pal+='<span class="cg-palsep" aria-hidden="true"></span>';
      var vsel=(congesActive==="__vac"),vstl=vsel?('background:'+rgba(CG_VACCOL,0.14)+';border-color:'+rgba(CG_VACCOL,0.55)+';color:'+shade(CG_VACCOL,0.42)):'';
      pal+='<span class="cg-pb cg-vacbrush'+(vsel?" sel":"")+'" data-cg-t="__vac"'+(vstl?' style="'+vstl+'"':'')+'><span class="dot" style="background:'+CG_VACCOL+'"></span>Vacances</span>';
      pal+='</div></div>';
    }
    document.getElementById("cg-pal").innerHTML=pal;
    var tdy=new Date(),tY=tdy.getFullYear(),tM=tdy.getMonth(),tD=tdy.getDate();
    var h='<tr><th class="cg-mh cg-corner"></th>';for(var dh=1;dh<=31;dh++)h+='<th class="cg-dh" data-cg-d="'+dh+'">'+dh+'</th>';h+='</tr>';
    for(var m=0;m<12;m++){h+='<tr class="cg-row" data-cg-m="'+m+'"><th class="cg-mh">'+CG_MFULL[m]+'</th>';var dim=cgDIM(y,m);
      for(var d=1;d<=31;d++){
        if(d>dim){h+='<td class="cg-cell off"></td>';continue;}
        var code=cgGet(y,m,d),pp=code?cgParse(code):null,isjf=!!jf[m+"-"+d],wd=new Date(y,m,d).getDay(),we=(wd===0||wd===6),onvac=!!cgVacCur[m+"-"+d],showCode=(code&&!congesVacView);
        var istd=(y===tY&&m===tM&&d===tD);
        var cls="cg-cell";if(we&&!showCode&&!isjf)cls+=" we";if(isjf&&!showCode)cls+=" hol";if(showCode)cls+=" lv";if(istd)cls+=" today";
        var st="";if(showCode){
          /* Grammaire prévisionnel : hachuré teinté = prév. d'un compte, pointillé vide = prév. libre */
          var hcol=null,base=pp.base,free=(base.indexOf("t:")===0&&typeImpute(base.slice(2)));
          if(base.indexOf("i:")===0){var ptt=cgPrevTypeTarget(base);if(ptt){var pty=cgType(ptt);hcol=pty?pty.col:"#9aa0a8";}else{var hb=cgBal(base.split(":")[2]);hcol=hb?((cgType(hb.type)||{}).col||"#9aa0a8"):"#9aa0a8";}}
          if(free){
            var lhat="repeating-linear-gradient(-45deg,#cbd5e1 0 3px,#ffffff 3px 6px)";
            if(pp.portion==="am")st+="background:linear-gradient(90deg,transparent 50%,#f3f4f6 50%),"+lhat+";";
            else if(pp.portion==="pm")st+="background:linear-gradient(90deg,#f3f4f6 50%,transparent 50%),"+lhat+";";
            else st+="background:"+lhat+";";
            st+="border:1.5px dashed #9aa0a8;";
          }else if(hcol){
            var hat="repeating-linear-gradient(-45deg,"+hcol+" 0 3px,#ffffff 3px 6px)";
            if(pp.portion==="am")st+="background:linear-gradient(90deg,transparent 50%,#f3f4f6 50%),"+hat+";";
            else if(pp.portion==="pm")st+="background:linear-gradient(90deg,#f3f4f6 50%,transparent 50%),"+hat+";";
            else st+="background:"+hat+";box-shadow:"+(istd?"inset 0 0 0 2px var(--color-primary),inset 0 0 0 3.5px "+hcol:"inset 0 0 0 1.5px "+hcol)+";";
          }else{
            var cc=cgColor(code);st+="background:"+(pp.portion==="am"?"linear-gradient(90deg,"+cc+" 50%,#f3f4f6 50%)":pp.portion==="pm"?"linear-gradient(90deg,#f3f4f6 50%,"+cc+" 50%)":cc)+";";
          }
        }
        var title="";
        h+='<td class="'+cls+'" data-cg-m="'+m+'" data-cg-d="'+d+'"'+(title?' title="'+title+'"':"")+(st?' style="'+st+'"':"")+'></td>';
      }
      h+='</tr>';
    }
    grid.innerHTML=h;
    cgRenderVacOverlay();renderCongesSol();
  }
  function cgRenderVacOverlay(){
    var ov=document.getElementById("cg-vac-ov"),wrap=document.getElementById("cg-gridwrap"),grid=document.getElementById("cg-grid");
    cgVacByDay={};if(!ov)return;ov.innerHTML="";
    var wr=wrap?wrap.getBoundingClientRect():null;
    var vacs=(ensureConges().vacs||[]).filter(function(v){return v.s.y===congesYear||v.e.y===congesYear;});
    vacs.forEach(function(v){
      var start=new Date(Math.max(new Date(v.s.y,v.s.m,v.s.d).getTime(),new Date(congesYear,0,1).getTime()));
      var end=new Date(Math.min(new Date(v.e.y,v.e.m,v.e.d).getTime(),new Date(congesYear,11,31).getTime()));
      var segs=[],cur=null,dd=new Date(start);
      while(dd<=end){var mm=dd.getMonth(),day=dd.getDate();cgVacByDay[mm+"-"+day]=v;if(!cur||cur.m!==mm){if(cur)segs.push(cur);cur={m:mm,a:day,b:day};}else cur.b=day;dd.setDate(dd.getDate()+1);}
      if(cur)segs.push(cur);
      if(!wr||!grid)return;
      segs.forEach(function(sg,si){
        var fc=grid.querySelector('.cg-cell[data-cg-m="'+sg.m+'"][data-cg-d="'+sg.a+'"]'),lc=grid.querySelector('.cg-cell[data-cg-m="'+sg.m+'"][data-cg-d="'+sg.b+'"]');
        if(!fc||!lc)return;
        var fr=fc.getBoundingClientRect(),lr=lc.getBoundingClientRect();
        if(congesVacView){
          var bl=fr.left-wr.left,bt=fr.top-wr.top,bw=lr.right-fr.left,bh=fr.height;
          var bar=document.createElement("div");bar.className="cg-vacbar";bar.style.cssText="left:"+bl+"px;top:"+bt+"px;width:"+bw+"px;height:"+bh+"px;";ov.appendChild(bar);
          if(si===0){
            var txt=(v.label&&v.label.trim())?v.label:"(sans nom)";
            var lab=document.createElement("span");lab.className="cg-vacbar-lbl";lab.textContent=txt;bar.appendChild(lab);
            if(lab.scrollWidth>bw-10){
              bar.removeChild(lab);
              var out=document.createElement("div");out.className="cg-vaclabel-out";out.textContent=txt;ov.appendChild(out);
              var ow=out.offsetWidth,rl=lr.right-wr.left+6,ww=wrap?wrap.offsetWidth:99999;
              out.style.left=((rl+ow<=ww)?rl:Math.max(0,bl-ow-6))+"px";
              out.style.top=(bt+(bh-out.offsetHeight)/2)+"px";
            }
          }
        }else{
          var halo=document.createElement("div");halo.className="cg-halo";halo.style.cssText="left:"+(fr.left-wr.left-3)+"px;top:"+(fr.top-wr.top-3)+"px;width:"+((lr.right-fr.left)+6)+"px;height:"+(fr.height+6)+"px;";ov.appendChild(halo);
        }
      });
    });
  }
  function renderCongesPer(){
    var el=document.getElementById("cg-per");if(!el)return;var c=ensureConges(),hE=document.getElementById("cg-perH");
    var vs=(c.vacs||[]).filter(function(v){return v.s.y===congesYear||v.e.y===congesYear;}).sort(function(a,b){return new Date(a.s.y,a.s.m,a.s.d)-new Date(b.s.y,b.s.m,b.s.d);});
    if(hE)hE.textContent="Vacances — "+vs.length;
    if(!vs.length){el.innerHTML='<div class="cg-empty">Aucune vacances. Sélectionne « + Vacances » puis peins une période sur le calendrier.</div>';return;}
    el.innerHTML=vs.map(function(v){var tot=Math.round((new Date(v.e.y,v.e.m,v.e.d)-new Date(v.s.y,v.s.m,v.s.d))/86400000)+1,rng=v.s.d+" "+CG_MN[v.s.m]+" → "+v.e.d+" "+CG_MN[v.e.m];
      return '<div class="cg-per-row"><span class="cg-per-rng">'+rng+'</span><span class="cg-per-meta">'+tot+' j</span><input class="cg-per-lbl" data-cg-vid="'+v.id+'" placeholder="Où / quoi ?" value="'+esc(v.label||"")+'"'+(congesReadOnly?" disabled":"")+'/>'+(congesReadOnly?'':'<button type="button" class="row-action cg-per-del" data-cg-vdel="'+v.id+'" title="Supprimer">×</button>')+'</div>';
    }).join("");
  }
  function renderCongesSol(){
    var el=document.getElementById("cg-sol");if(!el)return;var c=ensureConges();
    var cut=null;
    var sc=cgScan(cut),scY=cgScanYear(cut);
    var comptes=c.balances.filter(function(b){return !b.archived;});
    cgSolTips={};
    var tabRows=[];
    var rows=comptes.map(function(b){var t=cgType(b.type),col=t?t.col:"#cbd5e1",scan=b.days>0?sc:scY,p=scan.byCompte[b.id]||0;
      var prev=0;Object.keys(scan.byRaw).forEach(function(k){if(k.indexOf("i:")===0&&k.split(":")[2]===b.id)prev+=scan.byRaw[k];});
      var real=p-prev;
      var pris=scan.dirPast[b.id]||0,pose=scan.dirFut[b.id]||0;
      var lbl='<span class="cg-soll"><i class="cg-soldot" style="background:'+col+'"></i><b>'+esc(b.type)+(b.period?' '+esc(cgShortPeriod(b.period)):'')+'</b></span>';
      cgSolTips[b.id]={name:b.type,per:cgShortPeriod(b.period||""),col:col,pris:pris,pose:pose,prev:prev,total:b.days};
      if(b.days>0)tabRows.push({name:b.type,per:cgShortPeriod(b.period||""),col:col,total:b.days,pris:pris,pose:pose,prev:prev});
      if(b.days>0){
        var restant=b.days-real-prev;
        var prisPct=Math.max(0,Math.min(100,pris/b.days*100));
        var posePct=Math.max(0,Math.min(100-prisPct,pose/b.days*100));
        var prevPct=Math.max(0,Math.min(100-prisPct-posePct,prev/b.days*100));
        var bar='<span class="cg-solbar"><i style="width:'+prisPct+'%;background:'+col+'"></i>'
          +(posePct>0?'<i class="cg-solbar-fut" style="width:'+posePct+'%;background:'+col+'"></i>':'')
          +(prevPct>0?'<i style="width:'+prevPct+'%;background:repeating-linear-gradient(-45deg,'+col+' 0 3px,#ffffff 3px 6px)"></i>':'')+'</span>';
        var val='<span class="cg-solv"><b'+(restant<0?' style="color:#e11d48"':'')+'>'+cgFmtDays(restant)+'</b> / '+cgFmtDays(b.days)+' j</span>';
        return '<div class="cg-solr" data-cg-solid="'+b.id+'">'+lbl+bar+val+'</div>';
      }
      return '<div class="cg-solr cg-solr-none" data-cg-solid="'+b.id+'">'+lbl+'<span></span><span class="cg-solv"><small>posé </small><b>'+cgFmtDays(real)+'</b></span></div>';
    }).join("");
    var oth=[];
    c.types.forEach(function(t){var n=scY.byRaw["t:"+t.c]||0;if(!n&&!(scY.tPrev[t.c]>0))return;
      if(t.impute){
        /* 7a — prévisionnel libre : ne pioche dans aucun solde */
        var lb=(t.c==="PREV")?"Prév. libre":(esc(t.c)+" · libre");
        oth.push('<span class="cg-solpill cg-solpill-prev"><i class="cg-prevsq"></i><b>'+lb+'</b><span>'+cgFmtDays(n)+' j</span></span>');
        return;
      }
      var pp=scY.tPast[t.c]||0,pf=scY.tFut[t.c]||0,pv=scY.tPrev[t.c]||0,parts=[];
      if(pp>0&&pf>0){parts.push(cgFmtDays(pp)+" pris");parts.push(cgFmtDays(pf)+" posé"+(pf>1?"s":""));}
      else if(pp>0)parts.push(cgFmtDays(pp)+" j pris");
      else if(pf>0)parts.push(cgFmtDays(pf)+" j posé"+(pf>1?"s":""));
      if(pv>0)parts.push(cgFmtDays(pv)+" prév.");
      oth.push('<span class="cg-solpill"><i class="cg-soldot" style="background:'+esc(t.col||"#cbd5e1")+'"></i><b>'+esc(t.c)+'</b><span>'+parts.join(" · ")+'</span></span>');});
    if(!comptes.length&&!oth.length){el.innerHTML='<div class="cg-empty">Aucun compte. Ajoute-en via ⋮ → Réglages.</div>';return;}
    var isTab=(cgSolView==="table"&&tabRows.length);
    var toggle=tabRows.length?('<div class="cg-sol-toggle"><button type="button" class="cg-solswitch" data-cg-solview="'+(isTab?"bars":"table")+'">⇄ '+(isTab?"Vue barres":"Vue tableau")+'</button></div>'):'';
    var body;
    if(isTab){
      function dash(v){return v>0?cgFmtDays(v):'<span class="z">—</span>';}
      var tot={total:0,pris:0,pose:0,prev:0,aposer:0,apres:0};
      var trs=tabRows.map(function(r){
        var aposer=r.total-r.pris-r.pose,apres=aposer-r.prev;
        tot.total+=r.total;tot.pris+=r.pris;tot.pose+=r.pose;tot.prev+=r.prev;tot.aposer+=aposer;tot.apres+=apres;
        return '<tr><td class="l"><i class="cg-soldot" style="background:'+r.col+'"></i><b>'+esc(r.name)+(r.per?' '+esc(r.per):'')+'</b></td>'
          +'<td>'+cgFmtDays(r.total)+'</td>'
          +'<td class="c-pris">'+dash(r.pris)+'</td><td class="c-pose">'+dash(r.pose)+'</td><td class="c-util">'+dash(r.pris+r.pose)+'</td>'
          +'<td class="hl"><span class="cg-apchip">'+cgFmtDays(aposer)+'</span></td>'
          +'<td class="amb">'+(r.prev>0?cgFmtDays(r.prev):'<span class="z">—</span>')+'</td>'
          +'<td class="ap'+(apres<0?" neg":"")+'">'+cgFmtDays(apres)+'</td></tr>';
      }).join("");
      body='<table class="cg-soltab"><tr><th class="l">Solde</th><th>Total</th><th class="c-pris">Pris</th><th class="c-pose">Posé</th><th class="c-util">Utilisé</th><th class="hl">À poser</th><th>Prév.</th><th>Après prév.</th></tr>'
        +trs
        +'<tr class="tot"><td class="l">Total</td><td>'+cgFmtDays(tot.total)+'</td><td class="c-pris">'+cgFmtDays(tot.pris)+'</td><td class="c-pose">'+cgFmtDays(tot.pose)+'</td><td class="c-util">'+cgFmtDays(tot.pris+tot.pose)+'</td><td class="hlv">'+cgFmtDays(tot.aposer)+'</td><td class="amb">'+cgFmtDays(tot.prev)+'</td><td'+(tot.apres<0?' style="color:#e11d48"':'')+'>'+cgFmtDays(tot.apres)+'</td></tr></table>';
    }else{
      body=rows;
    }
    var leg=isTab?'':'<span class="cg-solleg"><span><i style="background:#64748b"></i>pris</span><span><i class="cg-solbar-fut" style="background:#64748b"></i>posé</span><span><i style="background:repeating-linear-gradient(-45deg,#64748b 0 3px,#fff 3px 6px)"></i>prév. d\'un compte</span><span><i style="width:9px;height:9px;border-radius:3px;background:repeating-linear-gradient(-45deg,#cbd5e1 0 2.5px,#fff 2.5px 5px);border:1.5px dashed #9aa0a8"></i>prév. libre</span></span>';
    el.innerHTML=toggle+body+'<div class="cg-solfoot">'+(oth.length?'<div class="cg-solpills">'+oth.join("")+'</div>':'')+leg+'<span class="note">Tout ce qui est posé pioche dans ces soldes, toutes années confondues.</span></div>';
  }
  function cgSolTipEl(){var t=document.getElementById("cg-soltip");if(!t){t=document.createElement("div");t.id="cg-soltip";t.className="cg-soltip";t.hidden=true;document.body.appendChild(t);}return t;}
  function cgSolTipMove(x,y){var t=cgSolTipEl(),w=t.offsetWidth||200,half=w/2,vw=window.innerWidth;t.style.left=Math.max(half+8,Math.min(vw-half-8,x))+"px";t.style.top=Math.max(t.offsetHeight+8,y-12)+"px";}
  function cgSolTipShow(row,ev){var d=cgSolTips[row.dataset.cgSolid];if(!d)return;var t=cgSolTipEl();
    function line(sw,lb,vv,neg){return '<div class="cg-soltip-row">'+(sw?'<i style="'+sw+'"></i>':'<i style="visibility:hidden"></i>')+'<span class="lb">'+lb+'</span><span class="num">'+(neg?"− ":"")+cgFmtDays(vv)+' j</span></div>';}
    var h='<div class="cg-soltip-hd"><i style="background:'+d.col+'"></i>'+esc(d.name)+(d.per?' '+esc(d.per):'')+'</div>';
    if(d.total>0)h+=line("","Solde initial",d.total);
    h+=line("background:"+d.col,"Pris",d.pris,d.total>0);
    h+=line("background:"+d.col+";background:color-mix(in srgb,"+d.col+" 38%,white)","Posé",d.pose,d.total>0);
    if(d.prev>0)h+=line("background:repeating-linear-gradient(-45deg,"+d.col+" 0 2.5px,#fff 2.5px 5px);box-shadow:inset 0 0 0 1px "+d.col,"Prévisionnel",d.prev,d.total>0);
    if(d.total>0){var est=d.total-d.pris-d.pose-d.prev;
      h+='<div class="cg-soltip-tot cg-soltip-est"><span>Solde estimé</span><span class="num"'+(est<0?' style="color:#e11d48"':'')+'>'+cgFmtDays(est)+' j</span></div>';}
    t.innerHTML=h;t.hidden=false;cgSolTipMove(ev.clientX,ev.clientY);}
  function cgSolTipHide(){var t=document.getElementById("cg-soltip");if(t)t.hidden=true;}
  var CG_ARCH_ICO='<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/></svg>';
  var CG_UNARCH_ICO='<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M12 18v-6M9.5 14.5 12 12l2.5 2.5"/></svg>';
  function cgAnnualType(code){return code==="RTT";}
  function cgNextPeriod(code){var c=ensureConges(),last=null;c.balances.forEach(function(b){if(b.type===code&&b.period&&(!last||b.period>last))last=b.period;});if(last){var ms=/^(\d{4})-(\d{4})$/.exec(last);if(ms)return((+ms[1])+1)+"-"+((+ms[2])+1);var my=/^(\d{4})$/.exec(last);if(my)return String((+my[1])+1);}return cgAnnualType(code)?String(congesYear):((congesYear-1)+"-"+congesYear);}
  function cgDelBalance(b){var c=ensureConges();Object.keys(c.grid).forEach(function(k){var v=String(c.grid[k]),base=cgParse(v)?cgParse(v).base:v;if(base===b.id||(base.indexOf("i:")===0&&base.split(":")[2]===b.id))delete c.grid[k];});c.balances=c.balances.filter(function(x){return x.id!==b.id;});}
  function cgMoveType(srcCode,targetCode,after){
    if(srcCode===targetCode)return;
    var c=ensureConges(),dragT=cgType(srcCode),tgt=cgType(targetCode);if(!dragT||!tgt)return;
    var tgtSans=!!(tgt.impute||tgt.nosolde);
    c.types=c.types.filter(function(x){return x.c!==srcCode;});
    if(tgtSans)dragT.nosolde=true;else{dragT.nosolde=false;dragT.impute=false;}
    var to=-1,i;for(i=0;i<c.types.length;i++)if(c.types[i].c===targetCode){to=i;break;}
    if(to<0)c.types.push(dragT);else{if(after)to+=1;c.types.splice(to,0,dragT);}
    cgSetPop=null;saveConges();renderConges();renderCongesSettings();
  }
  function renderCongesSettings(){
    var el=document.getElementById("cg-settings");if(!el)return;var c=ensureConges();
    var comptes=c.types.filter(function(t){return !t.impute&&!t.nosolde;});
    var sans=c.types.filter(function(t){return t.impute||t.nosolde;});
    var archived=[];c.balances.forEach(function(b){if(b.archived){var t=cgType(b.type);archived.push({b:b,col:t?t.col:"#cbd5e1"});}});
    function head(t){var sws=CG_PALETTE.map(function(h){return '<span class="cgs2-csw'+(String(t.col).toLowerCase()===h.toLowerCase()?" active":"")+'" data-cgsw="'+h+'" data-cgcode="'+esc(t.c)+'" style="background:'+h+'"></span>';}).join("");
      return '<span class="cgs2-grip">⠿</span>'
        +'<span class="cgs2-swwrap"><button type="button" class="cgs2-dot" data-cgtoggle="'+esc(t.c)+'" style="'+(t.impute?'border-radius:5px;background:repeating-linear-gradient(-45deg,#cbd5e1 0 3px,#fff 3px 6px);border:1.5px dashed #9aa0a8':'background:'+esc(t.col))+'" title="'+(t.impute?'Prévisionnel':'Couleur')+'"></button>'
        +'<div class="cgs2-sws" hidden>'+sws+'<button type="button" class="cgs2-csw cgs2-cust" data-cgcustom="'+esc(t.c)+'" title="Couleur personnalisée"></button><input type="color" class="cgs2-custinput" value="'+esc(t.col)+'" data-cgc-col="'+esc(t.c)+'" tabindex="-1"></div></span>'
        +'<input type="text" class="cgs2-name" spellcheck="false" value="'+esc(t.c)+'" data-cgc-name="'+esc(t.c)+'">';}
    function popover(b){
      return '<div class="cgs2-pop">'
        +'<div class="cgs2-pop-hd"><span>'+esc(cgShortPeriod(b.period)||b.period||"Période")+'</span><button type="button" class="cgs2-pop-x" data-cgp-close="1">×</button></div>'
        +'<div class="cgs2-step"><button type="button" class="cgs2-step-b" data-cgp-dec="'+b.id+'">−</button><input type="number" min="0" step="0.5" class="cgs2-step-in" value="'+cgFmtDays(b.days)+'" data-cgp-days="'+b.id+'"><span class="cgs2-step-u">j</span><button type="button" class="cgs2-step-b" data-cgp-inc="'+b.id+'">+</button></div>'
        +'<div class="cgs2-pop-hint">± 1 j, ou saisis une valeur (0,5)</div>'
        +'<div class="cgs2-pop-act"><button type="button" class="btn cgs2-pop-arch" data-cgp-arch="'+b.id+'">'+CG_ARCH_ICO+' Archiver</button></div>'
        +'</div>';
    }
    function chip(b){var open=(cgSetPop===b.id);
      return '<span class="cgs2-chipwrap"><span class="cgs2-chip'+(open?" open":"")+'" data-cgp-open="'+b.id+'"><span class="cgs2-chip-lbl">'+esc(cgShortPeriod(b.period)||b.period||"—")+'</span><span class="cgs2-chip-d">'+cgFmtDays(b.days)+' j</span></span>'+(open?popover(b):'')+'</span>';
    }
    function compteRow(t){var bs=c.balances.filter(function(b){return b.type===t.c&&!b.archived;});
      var chips=bs.map(chip).join("")+'<span class="cgs2-add" data-cgp-add="'+esc(t.c)+'">+ '+esc(cgShortPeriod(cgNextPeriod(t.c)))+'</span>';
      return '<div class="cgs2-row" data-cgtype="'+esc(t.c)+'">'+head(t)+'<div class="cgs2-chips">'+chips+'</div><button type="button" class="cgs2-x" data-cgt-del="'+esc(t.c)+'" title="Supprimer le type">×</button></div>';
    }
    function sansRow(t){var rule=t.impute?"décompté sur un compte au choix, au moment de poser":"jamais décompté";
      return '<div class="cgs2-row" data-cgtype="'+esc(t.c)+'">'+head(t)+'<span class="cgs2-rule">'+rule+'</span><label class="cgs2-imp'+(t.impute?" on":"")+'" title="Se pose sur un compte choisi à la saisie (ex. PREV)"><input type="checkbox" data-cgc-imp="'+esc(t.c)+'"'+(t.impute?" checked":"")+'>s\'impute</label><button type="button" class="cgs2-x" data-cgt-del="'+esc(t.c)+'" title="Supprimer le type">×</button></div>';
    }
    var html='<div class="cgs2-sub">Tes types et tes comptes, en une seule liste.</div>'
      +'<div class="cgs2-sec"><div class="cgs2-hd"><span class="cgs2-lbl">COMPTÉS</span><span class="cgs2-hint">un solde par période</span></div>'
      +'<div class="cgs2-box" data-cgsec="comptes">'+(comptes.length?comptes.map(compteRow).join(""):'<div class="cgs2-drop-empty">Dépose un type ici</div>')+'</div></div>'
      +'<div class="cgs2-sec"><div class="cgs2-hd"><span class="cgs2-lbl">SANS DÉCOMPTE</span><span class="cgs2-hint">pas de solde propre</span></div>'
      +'<div class="cgs2-box" data-cgsec="sans">'+(sans.length?sans.map(sansRow).join(""):'<div class="cgs2-drop-empty">Dépose un type ici</div>')+'</div></div>'
      +'<div class="cgs2-actions"><button type="button" class="btn primary sm" data-cg-addcompte>+ compté</button><button type="button" class="btn cgs2-btn-out" data-cg-addsans>+ sans décompte</button>'
      +(archived.length?('<button type="button" class="btn cgs2-arch-link" data-cg-arch-open>'+CG_ARCH_ICO+' Archivés · '+archived.length+'</button>'):'')
      +'</div>'
      +'<div class="cgs2-foot">Glisse un type d\'une section à l\'autre pour changer sa règle. Un type « s\'impute » (ex. PREV) se décompte sur le compte de ton choix au moment de le poser.</div>'
      +'<h3 class="set-grp">Données</h3>'
      +'<div class="set-card"><p class="set-desc">Sauvegarde complète de tes congés. L\'import remplace toutes les données.</p><div class="set-data"><button type="button" class="btn sm" data-cg-import><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 8l5-5 5 5M12 3v12"/></svg>Importer</button><button type="button" class="btn sm" data-cg-export><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>Exporter</button></div></div>';
    if(cgArchOpen){
      var arows=archived.map(function(a){var b=a.b;return '<div class="cgs2-arow"><span class="cgs2-adot" style="background:'+a.col+'"></span><span class="cgs2-aname">'+esc(b.type)+'</span><span class="cgs2-aper">'+esc(cgShortPeriod(b.period)||b.period||"")+'</span><span class="cgs2-adays">'+cgFmtDays(b.days)+' j</span><button type="button" class="btn cgs2-arestore" data-cgp-restore="'+b.id+'">'+CG_UNARCH_ICO+' Restaurer</button><button type="button" class="cgs2-x" data-cgp-del="'+b.id+'" title="Supprimer">×</button></div>';}).join("");
      html+='<div class="cgs2-ov"><div class="cgs2-ovbox"><div class="cgs2-ovhd"><span>Archivés</span><button type="button" class="cgs2-pop-x" data-cg-arch-close="1">×</button></div><div class="cgs2-ovbody">'+(arows||'<div class="cgs2-drop-empty">Aucune période archivée.</div>')+'<div class="cgs2-foot" style="margin-top:10px">Une période archivée ne compte plus, mais son historique est conservé.</div></div></div></div>';
    }
    el.innerHTML=html;
  }
  function cgVacPeriods(y){var vac=ensureConges().vac,days=[],dt=new Date(y,0,1),end=new Date(y,11,31);while(dt<=end){var m=dt.getMonth(),d=dt.getDate();days.push({m:m,d:d,on:!!vac[y+"-"+m+"-"+d]});dt.setDate(dt.getDate()+1);}var out=[],i=0;while(i<days.length){if(!days[i].on){i++;continue;}var j=i;while(j<days.length&&days[j].on)j++;var run=days.slice(i,j);out.push({s:run[0],e:run[run.length-1],tot:run.length});i=j;}return out;}
  function cgPaintCellVisual(td){var m=+td.dataset.cgM,d=+td.dataset.cgD,y=congesYear;var code=cgGet(y,m,d),isjf=cgJFCur&&cgJFCur[m+"-"+d],wd=new Date(y,m,d).getDay(),we=(wd===0||wd===6),onvac=!!(cgVacCur&&cgVacCur[m+"-"+d]),tdy=new Date(),isTdy=(y===tdy.getFullYear()&&m===tdy.getMonth()&&d===tdy.getDate());var cls="cg-cell";if(we&&!code&&!isjf)cls+=" we";if(isjf&&!code)cls+=" hol";if(code)cls+=" lv";if(isTdy)cls+=" today";td.className=cls;var st="";if(code)st+="background:"+cgColor(code)+";";if(onvac)st+="box-shadow:inset 0 -3px 0 0 "+CG_VACCOL+";";td.setAttribute("style",st);var title="";if(code)title=cgCellLabel(code);else if(isjf)title=cgJFCur[m+"-"+d];if(title)td.title=title;else td.removeAttribute("title");}
  var cgHoverRow=null,cgHoverColTh=null,cgHoverColCells=[];
  function cgClearCols(){if(cgHoverRow){cgHoverRow.classList.remove("hl");cgHoverRow=null;}if(cgHoverColTh){cgHoverColTh.classList.remove("hl");cgHoverColTh=null;}for(var i=0;i<cgHoverColCells.length;i++)cgHoverColCells[i].classList.remove("colhl");cgHoverColCells=[];}
  function cgClearHover(){cgClearCols();cgHideVacUI();}
  function cgHideVacUI(){if(cgTipHideTimer){clearTimeout(cgTipHideTimer);cgTipHideTimer=null;}var t=document.getElementById("cg-tip");if(t)t.hidden=true;cgTipVac=null;}
  function cgScheduleTipHide(){if(cgTipHideTimer)clearTimeout(cgTipHideTimer);cgTipHideTimer=setTimeout(function(){var t=document.getElementById("cg-tip");if(t)t.hidden=true;cgTipVac=null;},300);}
  function cgTipHTML(vac){
    var dates=vac.s.d+" "+CG_MN[vac.s.m]+" → "+vac.e.d+" "+CG_MN[vac.e.m],tot=Math.round((new Date(vac.e.y,vac.e.m,vac.e.d)-new Date(vac.s.y,vac.s.m,vac.s.d))/86400000)+1;
    /* Bulle purement informative seulement pour les droits "lecture seule" ;
       en Consultation avec droits d'écriture, le nom et la corbeille restent disponibles */
    if(congesReadOnly){var nm=(vac.label&&vac.label.trim())?(esc(vac.label)+' · '):'';return '<div class="cg-tip-conge" id="cg-tip-conge"></div><div class="cg-tip-vac">Vacances · '+nm+esc(dates)+' · '+tot+' j</div>';}
    var s='<div class="cg-tip-conge" id="cg-tip-conge"></div><div class="cg-tip-vac">Vacances · '+esc(dates)+' · '+tot+' j</div>';
    s+='<div class="cg-tip-row"><input class="cg-tip-name" placeholder="Nommer…" value="'+esc(vac.label||"")+'"><button type="button" class="cg-tip-del" title="Supprimer"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3"/></svg></button></div>';
    return s;
  }
  function cgVacHover(td){var m=+td.dataset.cgM,d=+td.dataset.cgD,vac=cgVacByDay[m+"-"+d],tip=document.getElementById("cg-tip");
    if(cgTipHideTimer){clearTimeout(cgTipHideTimer);cgTipHideTimer=null;}
    var code=cgGet(congesYear,m,d),hasConge=!!(code&&!congesVacView),isjf=!!(cgJFCur&&cgJFCur[m+"-"+d]);
    if(!vac&&!hasConge&&!isjf){cgScheduleTipHide();return;}
    if(!tip)return;
    if(vac){if(cgTipVac!==vac.id||tip.hidden){tip.innerHTML=cgTipHTML(vac);cgTipVac=vac.id;}}
    else{tip.innerHTML='<div class="cg-tip-conge" id="cg-tip-conge"></div>';cgTipVac=null;}
    var cl=document.getElementById("cg-tip-conge");if(cl){var ct="";if(hasConge){ct=cgDotHTML(code)+esc(cgCellLabel(code));}else{var jfn=cgJFCur&&cgJFCur[m+"-"+d];if(jfn)ct='<i class="cg-tip-dot" style="background:#7c5cd6"></i>'+esc(jfn);}cl.innerHTML=ct;cl.style.display=ct?"flex":"none";}
    tip.hidden=false;
    var r=td.getBoundingClientRect();tip.style.left=(r.left+r.width/2)+"px";tip.style.top=(r.bottom+6)+"px";
  }
  function cgHover(td){cgClearCols();var tr=td.parentNode;if(tr&&tr.classList){tr.classList.add("hl");cgHoverRow=tr;}var g=document.getElementById("cg-grid");if(!g)return;var dcol=td.dataset.cgD,th=g.querySelector('.cg-dh[data-cg-d="'+dcol+'"]');if(th){th.classList.add("hl");cgHoverColTh=th;}var cells=g.querySelectorAll('.cg-cell[data-cg-d="'+dcol+'"]');for(var i=0;i<cells.length;i++){cells[i].classList.add("colhl");cgHoverColCells.push(cells[i]);}}
  function cgRange(a,b){var y=congesYear,d1=new Date(y,a.m,a.d),d2=new Date(y,b.m,b.d),lo=d1<=d2?d1:d2,hi=d1<=d2?d2:d1,out=[],dt=new Date(lo);while(dt<=hi){out.push({m:dt.getMonth(),d:dt.getDate()});dt.setDate(dt.getDate()+1);}return out;}
  function cgClearPreview(){for(var i=0;i<cgPrevCells.length;i++)if(cgPrevCells[i])cgPrevCells[i].classList.remove("prev");cgPrevCells=[];}
  function cgPreview(cells){cgClearPreview();var g=document.getElementById("cg-grid");if(!g)return;cells.forEach(function(c){var td=g.querySelector('.cg-cell[data-cg-m="'+c.m+'"][data-cg-d="'+c.d+'"]');if(td&&!td.classList.contains("off")){td.classList.add("prev");cgPrevCells.push(td);}});}
  function cgViewOnly(){return congesReadOnly||!congesEditMode;}
  function cgTouchScreen(){return !!(window.matchMedia&&window.matchMedia("(hover: none)").matches);}
  /* Ajustement d'une plage de vacances au tap (tactile) : retrait, extension, scission, fusion */
  function cgVD(o){return new Date(o.y,o.m,o.d);}
  function cgVK(dt){return {y:dt.getFullYear(),m:dt.getMonth(),d:dt.getDate()};}
  function cgVShift(dt,n){var r=new Date(dt);r.setDate(r.getDate()+n);return r;}
  function cgVacMergeInto(v){
    var c=ensureConges(),changed=true;
    while(changed){changed=false;
      for(var i=0;i<c.vacs.length;i++){var o=c.vacs[i];if(o===v)continue;
        var os=cgVD(o.s).getTime(),oe=cgVD(o.e).getTime(),vs=cgVD(v.s).getTime(),ve=cgVD(v.e).getTime();
        if(os<=cgVShift(new Date(ve),1).getTime()&&oe>=cgVShift(new Date(vs),-1).getTime()){
          if(os<vs)v.s=o.s;if(oe>ve)v.e=o.e;
          if(!(v.label&&v.label.trim())&&o.label)v.label=o.label;
          c.vacs.splice(i,1);changed=true;break;
        }
      }
    }
  }
  function cgVacAdjustTap(day){
    var c=ensureConges(),vacs=c.vacs||[],x=cgVD(day),xt=x.getTime(),i,v,st,et;
    for(i=0;i<vacs.length;i++){v=vacs[i];st=cgVD(v.s).getTime();et=cgVD(v.e).getTime();
      if(xt<st||xt>et)continue;
      if(st===et){vacs.splice(i,1);toast("Vacances supprimées");}
      else if(xt===st)v.s=cgVK(cgVShift(x,1));
      else if(xt===et)v.e=cgVK(cgVShift(x,-1));
      else{var right={id:uid(),s:cgVK(cgVShift(x,1)),e:v.e,label:v.label||""};v.e=cgVK(cgVShift(x,-1));vacs.splice(i+1,0,right);}
      return true;
    }
    for(i=0;i<vacs.length;i++){v=vacs[i];st=cgVD(v.s);et=cgVD(v.e);
      if(xt===cgVShift(st,-1).getTime()){v.s=cgVK(x);cgVacMergeInto(v);return true;}
      if(xt===cgVShift(et,1).getTime()){v.e=cgVK(x);cgVacMergeInto(v);return true;}
    }
    return false;
  }
  function cgCellArchived(v){var id=cgCompteId(v);if(!id)return false;var b=cgBal(id);return !!(b&&b.archived);}
  function cgCommitRange(cells){var y=congesYear,blocked=false;cells.forEach(function(c){var m=c.m,d=c.d,wd=new Date(y,m,d).getDay();if(wd===0||wd===6)return;if(cgJFCur&&cgJFCur[m+"-"+d])return;if(cgCellArchived(cgGet(y,m,d))){blocked=true;return;}cgSet(y,m,d,congesPaintVal);});if(blocked&&typeof toast==="function")toast("Solde archivé : ces jours sont verrouillés");}
  function cgCycleCell(cell,act){var y=congesYear,m=cell.m,d=cell.d,wd=new Date(y,m,d).getDay();if(wd===0||wd===6)return;if(cgJFCur&&cgJFCur[m+"-"+d])return;
    var cur=cgGet(y,m,d),pp=cur?cgParse(cur):null;
    if(cgCellArchived(cur)){if(typeof toast==="function")toast("Solde archivé : ce jour est verrouillé");return;}
    function apply(base){if(!cur||!pp||pp.base!==base)cgSet(y,m,d,base);else if(pp.portion==="full")cgSet(y,m,d,base+"|am");else if(pp.portion==="am")cgSet(y,m,d,base+"|pm");else cgSet(y,m,d,null);saveConges();renderConges();}
    if(act.indexOf("i:")===0&&act.indexOf(":",2)<0){var code=act.slice(2);if(pp&&cgCellCode(pp.base)===code)apply(pp.base);else cgAskCompte(code,function(compteId){if(!compteId)return;apply(compteId==="__none"?("t:"+code):(act+":"+compteId));});}
    else apply(act);
  }
  function cgDragEnd(){var el=document.getElementById("cg-settings");if(el){var a=el.querySelectorAll(".cgs2-drop,.cgs2-secdrop,.cgs2-dragging"),i;for(i=0;i<a.length;i++){a[i].classList.remove("cgs2-drop");a[i].classList.remove("cgs2-secdrop");a[i].classList.remove("cgs2-dragging");}}cgDrag=null;}
  function cgBindSettings(el){
    if(!el||el._cgBound)return;el._cgBound=true;
    el.addEventListener("change",function(e){if(congesReadOnly)return;var t=e.target,c=ensureConges();
      if(t.dataset.cgcCol){var ty=cgType(t.dataset.cgcCol);if(ty){ty.col=t.value;saveConges();renderConges();renderCongesSettings();}return;}
      if(t.dataset.cgcName){var old=t.dataset.cgcName,nw=(t.value||"").trim();if(nw&&nw!==old&&!cgType(nw)){var ty2=cgType(old);if(ty2){ty2.c=nw;c.balances.forEach(function(b){if(b.type===old)b.type=nw;});Object.keys(c.grid).forEach(function(k){var v=String(c.grid[k]),pp=cgParse(v),base=pp.base,suf=(pp.portion!=="full"?("|"+pp.portion):"");if(base==="t:"+old)c.grid[k]="t:"+nw+suf;else if(base.indexOf("i:")===0){var ip=base.split(":"),ch=false;if(ip[1]===old){ip[1]=nw;ch=true;}if(ip[2]==="t"&&ip[3]===old){ip[3]=nw;ch=true;}if(ch)c.grid[k]=ip.join(":")+suf;}});saveConges();renderConges();}}renderCongesSettings();return;}
      if(t.dataset.cgpPer){var bp=cgBal(t.dataset.cgpPer);if(bp){bp.period=t.value.trim();saveConges();renderConges();renderCongesSettings();}return;}
      if(t.dataset.cgpDays){var bd=cgBal(t.dataset.cgpDays);if(bd){bd.days=parseFloat(String(t.value).replace(",","."))||0;saveConges();renderConges();renderCongesSettings();}return;}
      if(t.dataset.cgcImp){var ty3=cgType(t.dataset.cgcImp);if(ty3){ty3.impute=t.checked;if(!t.checked)ty3.nosolde=true;saveConges();renderConges();renderCongesSettings();}return;}
    });
    el.addEventListener("click",function(e){if(congesReadOnly)return;var c=ensureConges(),b,x;
      x=e.target.closest("[data-cgtoggle]");if(x){var sw=x.parentNode.querySelector(".cgs2-sws");if(sw)sw.hidden=!sw.hidden;return;}
      x=e.target.closest("[data-cgsw]");if(x){var tyc=cgType(x.dataset.cgcode);if(tyc){tyc.col=x.dataset.cgsw;saveConges();renderConges();renderCongesSettings();}return;}
      x=e.target.closest("[data-cgcustom]");if(x){var ci=x.parentNode.querySelector(".cgs2-custinput");if(ci)ci.click();return;}
      if(e.target.closest("[data-cg-arch-open]")){cgArchOpen=true;cgSetPop=null;renderCongesSettings();return;}
      if(e.target.closest("[data-cg-arch-close]")||(e.target.classList&&e.target.classList.contains("cgs2-ov"))){cgArchOpen=false;renderCongesSettings();return;}
      x=e.target.closest("[data-cgp-open]");if(x){var id=x.dataset.cgpOpen;cgSetPop=(cgSetPop===id?null:id);renderCongesSettings();return;}
      if(e.target.closest("[data-cgp-close]")){cgSetPop=null;renderCongesSettings();return;}
      x=e.target.closest("[data-cgp-dec]");if(x){b=cgBal(x.dataset.cgpDec);if(b){b.days=Math.max(0,(b.days||0)-1);saveConges();renderConges();renderCongesSettings();}return;}
      x=e.target.closest("[data-cgp-inc]");if(x){b=cgBal(x.dataset.cgpInc);if(b){b.days=(b.days||0)+1;saveConges();renderConges();renderCongesSettings();}return;}
      x=e.target.closest("[data-cgp-arch]");if(x){b=cgBal(x.dataset.cgpArch);if(b){b.archived=true;cgSetPop=null;saveConges();renderConges();renderCongesSettings();}return;}
      x=e.target.closest("[data-cgp-restore]");if(x){b=cgBal(x.dataset.cgpRestore);if(b){b.archived=false;saveConges();renderConges();renderCongesSettings();}return;}
      x=e.target.closest("[data-cgp-del]");if(x){b=cgBal(x.dataset.cgpDel);if(b&&confirm("Supprimer cette période et les jours posés associés ?")){cgDelBalance(b);cgSetPop=null;saveConges();renderConges();renderCongesSettings();}return;}
      x=e.target.closest("[data-cgp-add]");if(x){var nb={id:uid(),type:x.dataset.cgpAdd,period:cgNextPeriod(x.dataset.cgpAdd),days:0,archived:false};c.balances.push(nb);cgSetPop=nb.id;saveConges();renderConges();renderCongesSettings();return;}
      x=e.target.closest("[data-cgt-del]");if(x){var code2=x.dataset.cgtDel,used=c.balances.filter(function(a){return a.type===code2;});if(c.types.length<=1){alert("Au moins un type est nécessaire.");return;}if(!confirm("Supprimer le type « "+code2+" »"+(used.length?(" ainsi que ses "+used.length+" période(s) et les jours posés ?"):" ?")))return;var ids={};used.forEach(function(a){ids[a.id]=1;});Object.keys(c.grid).forEach(function(k){var v=String(c.grid[k]),base=cgParse(v)?cgParse(v).base:v,cid=cgCompteId(base);if(ids[cid]||base==="t:"+code2||base.indexOf("i:"+code2+":")===0)delete c.grid[k];});c.balances=c.balances.filter(function(a){return a.type!==code2;});c.types=c.types.filter(function(a){return a.c!==code2;});cgSetPop=null;saveConges();renderConges();renderCongesSettings();return;}
      if(e.target.closest("[data-cg-addcompte]")){var n=1,cc="T"+n;while(cgType(cc)){n++;cc="T"+n;}c.types.push({c:cc,col:palette[c.types.length%palette.length],impute:false,nosolde:false});saveConges();renderConges();renderCongesSettings();return;}
      if(e.target.closest("[data-cg-addsans]")){var n2=1,cs="T"+n2;while(cgType(cs)){n2++;cs="T"+n2;}c.types.push({c:cs,col:palette[c.types.length%palette.length],impute:false,nosolde:true});saveConges();renderConges();renderCongesSettings();return;}
      if(e.target.closest("[data-cg-export]")){cgDoExport();return;}
      if(e.target.closest("[data-cg-import]")){var cfi=document.getElementById("cg-file-input");if(cfi)cfi.click();return;}
      var ops=el.querySelectorAll(".cgs2-sws:not([hidden])");if(ops.length&&!e.target.closest(".cgs2-swwrap")){for(var oi=0;oi<ops.length;oi++)ops[oi].hidden=true;}
      if(cgSetPop&&!e.target.closest(".cgs2-chipwrap")){cgSetPop=null;renderCongesSettings();}
    });
    enableDrag(el,".cgs2-row",".cgs2-grip",function(it){return it.dataset.cgtype;},function(s,t,a){if(congesReadOnly)return;cgMoveType(s,t,a);},"cgs2-dpb","cgs2-dpa");
  }
  function cgAskCompte(code,cb){
    var c=ensureConges(),comptes=c.balances.filter(function(b){return !b.archived&&!typeImpute(b.type);});
    var sans=c.types.filter(function(t){return !t.impute&&!c.balances.some(function(b){return !b.archived&&b.type===t.c;});});
    var body='<div class="cg-choose">'+comptes.map(function(b){var t=cgType(b.type);return '<button type="button" class="cg-choose-b" data-compte="'+b.id+'"><span class="dot" style="background:'+(t?t.col:"#cbd5e1")+'"></span>'+esc(cgCatLabel(b))+'</button>';}).join("")
      +sans.map(function(t){return '<button type="button" class="cg-choose-b" data-compte="t:'+esc(t.c)+'"><span class="dot" style="background:'+esc(t.col||"#cbd5e1")+'"></span>'+esc(t.c)+'</button>';}).join("")
      +'<button type="button" class="cg-choose-b cg-choose-none" data-compte="__none"><span class="cg-nc-ico">×</span>Sans compte (prévisionnel libre)</button></div>';
    modalCtx={type:"prevChoose"};
    openModal("Imputer « "+code+" » sur…",body,false);
    var ft=document.querySelector(".modal-foot");if(ft)ft.style.display="none";
    var mb=document.getElementById("modal-body");
    if(mb)Array.prototype.forEach.call(mb.querySelectorAll("[data-compte]"),function(btn){btn.addEventListener("click",function(){var id=btn.dataset.compte;closeModal();cb(id);});});
  }
  function openCongesSettings(){if(congesReadOnly)return;modalCtx={type:"congesSet"};cgSetPop=null;cgArchOpen=false;openModal("Réglages",'<div id="cg-settings"></div>',false);var ft=document.querySelector(".modal-foot");if(ft)ft.style.display="none";renderCongesSettings();cgBindSettings(document.getElementById("cg-settings"));}
  (function(){
    var grid=document.getElementById("cg-grid"),pal=document.getElementById("cg-pal"),per=document.getElementById("cg-per"),sol=document.getElementById("cg-sol"),modes=document.getElementById("cg-modes");
    if(pal)pal.addEventListener("click",function(e){if(cgViewOnly())return;var b=e.target.closest(".cg-pb");if(!b)return;congesActive=b.dataset.cgT;cgVacTapAnchor=null;renderConges();});
    if(modes)modes.addEventListener("click",function(e){var vt=e.target.closest("[data-cg-vactoggle]");if(vt){congesVacView=!congesVacView;cgVacTapAnchor=null;cgHideVacUI();renderConges();return;}var b=e.target.closest("[data-cg-mode]");if(b&&!congesReadOnly){congesEditMode=(b.dataset.cgMode==="edit");cgVacTapAnchor=null;cgHideVacUI();renderConges();}});
    if(grid){
      grid.addEventListener("click",function(e){if(!cgViewOnly())return;var td=e.target.closest(".cg-cell");if(td&&!td.classList.contains("off")){cgVacHover(td);if(cgTipHideTimer){clearTimeout(cgTipHideTimer);cgTipHideTimer=null;}}});
      grid.addEventListener("mousedown",function(e){if(cgViewOnly())return;var td=e.target.closest(".cg-cell");if(!td||td.classList.contains("off"))return;e.preventDefault();congesDrag=true;congesAnchor={m:+td.dataset.cgM,d:+td.dataset.cgD};congesLast={m:congesAnchor.m,d:congesAnchor.d};cgClearHover();cgPreview([congesAnchor]);});
      grid.addEventListener("mouseover",function(e){var td=e.target.closest(".cg-cell");if(!td||td.classList.contains("off"))return;if(congesDrag){congesLast={m:+td.dataset.cgM,d:+td.dataset.cgD};cgPreview(cgRange(congesAnchor,congesLast));}else{if(cgTouchScreen()&&!cgViewOnly())return;cgHover(td);cgVacHover(td);}});
      grid.addEventListener("mouseleave",function(){cgClearCols();cgScheduleTipHide();});
    }
    document.addEventListener("mouseup",function(){if(!congesDrag)return;congesDrag=false;cgClearPreview();
      var cells=congesAnchor?cgRange(congesAnchor,congesLast||congesAnchor):[];var single=(cells.length===1);congesAnchor=null;congesLast=null;if(!cells.length)return;
      var act=congesActive;
      if(act==="__vac"){var a=cells[0],b=cells[cells.length-1];
        /* Sur tactile : tap dans/adjacent à une plage = ajustement direct ;
           tap isolé = sélection en deux taps (début puis fin), le glisser servant au défilement */
        if(cgTouchScreen()&&single){
          if(!cgVacTapAnchor||cgVacTapAnchor.y!==congesYear){
            if(cgVacAdjustTap({y:congesYear,m:a.m,d:a.d})){saveConges();renderConges();return;}
            cgVacTapAnchor={y:congesYear,m:a.m,d:a.d};cgPreview([a]);toast("Début sélectionné — tape le jour de fin");return;
          }
          var vr=cgRange(cgVacTapAnchor,a);cgVacTapAnchor=null;cgClearPreview();a=vr[0];b=vr[vr.length-1];
        }
        var nv={id:uid(),s:{y:congesYear,m:a.m,d:a.d},e:{y:congesYear,m:b.m,d:b.d},label:""};ensureConges().vacs.push(nv);saveConges();renderConges();var fcell=document.querySelector('#cg-grid .cg-cell[data-cg-m="'+a.m+'"][data-cg-d="'+a.d+'"]');if(fcell)cgVacHover(fcell);return;}
      if(act==="__e"){congesPaintVal=null;cgCommitRange(cells);saveConges();renderConges();return;}
      if(single){cgCycleCell(cells[0],act);return;}
      if(act.indexOf("i:")===0&&act.indexOf(":",2)<0){var code=act.slice(2);cgAskCompte(code,function(compteId){if(!compteId)return;congesPaintVal=(compteId==="__none")?("t:"+code):(act+":"+compteId);cgCommitRange(cells);saveConges();renderConges();});return;}
      congesPaintVal=act;cgCommitRange(cells);saveConges();renderConges();
    });
    var tip=document.getElementById("cg-tip");
    if(tip){
      tip.addEventListener("mouseenter",function(){if(cgTipHideTimer){clearTimeout(cgTipHideTimer);cgTipHideTimer=null;}});
      tip.addEventListener("mouseleave",function(){cgScheduleTipHide();});
      tip.addEventListener("input",function(e){var inp=e.target.closest(".cg-tip-name");if(!inp||!cgTipVac)return;var v=(ensureConges().vacs||[]).filter(function(x){return x.id===cgTipVac;})[0];if(v){v.label=inp.value;saveConges();cgRenderVacOverlay();}});
      tip.addEventListener("click",function(e){var dl=e.target.closest(".cg-tip-del");if(!dl||!cgTipVac)return;if(!confirm("Supprimer cette vacance ?"))return;var c=ensureConges();c.vacs=(c.vacs||[]).filter(function(x){return x.id!==cgTipVac;});saveConges();tip.hidden=true;cgTipVac=null;renderConges();});
    }
    /* Tooltip des soldes (style Patrimoine) */
    var solHost=document.getElementById("cg-sol");
    if(solHost){
      solHost.addEventListener("click",function(e){var b=e.target.closest("[data-cg-solview]");if(!b)return;cgSolView=b.dataset.cgSolview;try{localStorage.setItem("cg-sol-view",cgSolView);}catch(err){}cgSolTipHide();renderCongesSol();});
      solHost.addEventListener("mouseover",function(e){var r=e.target.closest(".cg-solr");if(r&&r.dataset.cgSolid)cgSolTipShow(r,e);});
      solHost.addEventListener("mousemove",function(e){var t=document.getElementById("cg-soltip");if(t&&!t.hidden)cgSolTipMove(e.clientX,e.clientY);});
      solHost.addEventListener("mouseout",function(e){var r=e.target.closest(".cg-solr");if(r&&!(e.relatedTarget&&e.relatedTarget.closest&&e.relatedTarget.closest(".cg-solr")))cgSolTipHide();});
      document.addEventListener("click",function(e){if(!e.target.closest(".cg-solr"))cgSolTipHide();});
    }
    window.addEventListener("resize",function(){if(curModule==="conges")cgRenderVacOverlay();});
    var yprev=document.getElementById("cg-yprev");if(yprev)yprev.addEventListener("click",function(){congesYear--;renderConges();});
    var ynext=document.getElementById("cg-ynext");if(ynext)ynext.addEventListener("click",function(){congesYear++;renderConges();});
    var ybtn=document.getElementById("cg-year-btn");if(ybtn)ybtn.addEventListener("click",function(e){e.stopPropagation();var p=document.getElementById("cg-year-pop");if(p)p.hidden=!p.hidden;});
    var yp2=document.getElementById("cg-year-pop");if(yp2)yp2.addEventListener("click",function(e){var cc=e.target.closest("[data-cg-year]");if(!cc)return;congesYear=+cc.dataset.cgYear;yp2.hidden=true;renderConges();});
  })();
  function showLogin(on){var l=document.getElementById("login");if(l)l.hidden=!on;var c=document.querySelector(".container");if(c)c.style.display=on?"none":"";}
  function hideBoot(){var b=document.getElementById("boot");if(b)b.hidden=true;}
  function isEditing(){var a=document.activeElement;if(a&&(a.tagName==="INPUT"||a.tagName==="TEXTAREA"||a.tagName==="SELECT"||a.isContentEditable))return true;var md=document.getElementById("modal");if(md&&!md.hidden)return true;return false;}
  function safeRender(){try{renderTripSwitch();renderAll();renderConges();}catch(err){if(typeof console!=="undefined"&&console.error)console.error("Erreur de rendu Mosaïque :",err);}}
  function applyRemote(json){if(json==null||json===lastJson)return;var s;try{s=JSON.parse(json);}catch(e){return;}if(!s||!s.trips)return;lastJson=json;store=migrate(s);if(!store.activeId||!store.trips.some(function(t){return t.id===store.activeId;}))store.activeId=(store.trips[0]||{}).id;try{localStorage.setItem(STORE_KEY,json);}catch(e){}state=activeTrip();safeRender();}
  function onRemote(json){if(json==null)return;if(isEditing()){pendingRemote=json;return;}applyRemote(json);}
  document.addEventListener("focusout",function(){setTimeout(function(){if(pendingRemote!=null&&!isEditing()){var j=pendingRemote;pendingRemote=null;applyRemote(j);}if(congesPendingRemote!=null&&!isEditing()&&!congesDrag){var cj=congesPendingRemote;congesPendingRemote=null;applyCongesRemote(cj);}},150);});
  function loadCloud(){
    var ref=db.collection("budgets").doc(SHARED);
    setTimeout(hideBoot,5000);
    ref.get().then(function(snap){
      var s=null;if(snap.exists){var d=snap.data();if(d&&d.json){try{s=JSON.parse(d.json);}catch(e){}}}
      if(!s||!s.trips||!s.trips.length)s=loadStore();
      store=migrate(s);if(!store.activeId||!store.trips.some(function(t){return t.id===store.activeId;}))store.activeId=store.trips[0].id;
      var congesLegacy=store.conges;if(congesLegacy)delete store.conges;
      lastJson=JSON.stringify(store);
      state=activeTrip();safeRender();hideBoot();bootRoute();
      try{ref.set({json:lastJson});}catch(e){}
      if(unsub)unsub();
      unsub=ref.onSnapshot(function(sn){if(sn.metadata.hasPendingWrites)return;var dd=sn.data();if(dd&&dd.json)onRemote(dd.json);});
      loadConges(congesLegacy);loadSkincare();
    }).catch(function(){store=loadStore();var lg=store.conges;if(lg)delete store.conges;state=activeTrip();safeRender();hideBoot();bootRoute();loadConges(lg);loadSkincare();});
  }
  