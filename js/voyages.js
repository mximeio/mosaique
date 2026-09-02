/* ===== 2. Module Voyages (données, rendu, dépenses, parts, réglages) ===== */
  function seed(){
    return {tripName:"Vacances été 2026",seqP:3,seqE:10,
      people:["Maxime","Sophie","Léa"],
      periods:[
        {id:"p1",name:"Séjour 1",start:"2026-07-05",end:"2026-07-12",members:["Maxime","Sophie","Léa"]},
        {id:"p2",name:"Séjour 2",start:"2026-07-12",end:"2026-07-19",members:["Maxime","Sophie"]}
      ],
      expenses:[
        {id:"e1",label:"Location voiture",amount:420,scope:"all",basis:"days"},
        {id:"e2",label:"Gîte",amount:600,scope:"p1"},
        {id:"e3",label:"Courses",amount:120,scope:"p2"},
        {id:"e4",label:"Billet d'avion",amount:180,scope:"individual",person:"Léa"}
      ]};
  }
  function seedTrip(){var t=seed();t.id=uid();return t;}
  var DEFAULT_CATS=[{id:"cav",name:"Avion",color:"#0ea5e9"},{id:"clo",name:"Logement",color:"#4f46e5"},{id:"ctr",name:"Transport",color:"#f59e0b"},{id:"cac",name:"Activité",color:"#10b981"}];
  function migrate(s){
    if(s&&!s.categories)s.categories=DEFAULT_CATS.map(function(c){return {id:c.id,name:c.name,color:c.color};});
    if(s&&s.trips)s.trips.forEach(function(t){if(!t.emails)t.emails={};if(t.periods)t.periods.sort(function(a,b){var x=a.start||"",y=b.start||"";return x<y?-1:x>y?1:0;});var pids=(t.periods||[]).map(function(p){return p.id;});(t.expenses||[]).forEach(function(e){
      if(e.scope==="individual"){e.scope="custom";e.people=e.person?[e.person]:[];delete e.person;}
      else if(e.scope==="all"){e.scope="sejour";e.periods=pids.slice();if(!e.basis)e.basis="nights";}
      else if(e.scope!=="custom"&&e.scope!=="sejour"){var pid=e.scope;e.scope="sejour";e.periods=[pid];if(!e.basis)e.basis="nights";}
    });});
    return s;}
  function catById(id){var a=store.categories||[];for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null;}
  function loadStore(){
    try{var s=JSON.parse(localStorage.getItem(STORE_KEY));if(s&&s.trips&&s.trips.length){s.trips.forEach(function(t){if(!t.id)t.id=uid();});if(!s.activeId||!s.trips.some(function(t){return t.id===s.activeId;}))s.activeId=s.trips[0].id;return migrate(s);}}catch(e){}
    try{var old=JSON.parse(localStorage.getItem(KEY));if(old&&old.people){if(!old.id)old.id=uid();return migrate({trips:[old],activeId:old.id});}}catch(e){}
    var t=seedTrip();return {trips:[t],activeId:t.id};
  }
  function userEmail(){return (CLOUD&&fbUser&&fbUser.email)?fbUser.email.trim().toLowerCase():null;}
  function tripEmails(t){var e=t.emails||{},out=[];for(var k in e){if(e[k]&&String(e[k]).trim())out.push(String(e[k]).trim().toLowerCase());}return out;}
  function canSee(t){var em=tripEmails(t);if(!em.length)return true;var u=userEmail();return u?em.indexOf(u)>=0:true;}
  function visibleTrips(){return store.trips.filter(canSee);}
  function tripStart(t){var ps=(t.periods||[]).map(function(p){return p.start;}).filter(Boolean).sort();return ps[0]||"";}
  function byStartDesc(a,b){var sa=tripStart(a),sb=tripStart(b);if(sa===sb)return 0;if(!sa)return 1;if(!sb)return -1;return sa<sb?1:-1;}
  function mainTrips(){return visibleTrips().filter(function(t){return !t.archived;}).sort(byStartDesc);}
  function archivedTrips(){return visibleTrips().filter(function(t){return t.archived;}).sort(byStartDesc);}
  function sortPeriods(arr){if(arr)arr.sort(function(a,b){var x=a.start||"",y=b.start||"";return x<y?-1:x>y?1:0;});return arr;}
  function tNights(p){var d=Math.round((Date.parse(p.end)-Date.parse(p.start))/86400000);return d>0?d:0;}
  function tDays(trip,p){var n=tNights(p);if(n<=0)return 0;var base=n+1,ps=trip.periods||[];for(var i=0;i<ps.length;i++){if(ps[i]!==p&&ps[i].end===p.start){base-=1;break;}}return base;}
  function tMembers(trip,p){return (p.members||[]).filter(function(x){return (trip.people||[]).indexOf(x)>=0;});}
  function personInTrip(trip){var u=userEmail();if(!u)return null;var em=trip.emails||{};for(var k in em){if(em[k]&&String(em[k]).trim().toLowerCase()===u)return k;}return null;}
  function personTripCost(trip,name){var total=0;(trip.expenses||[]).forEach(function(e){
    if(e.scope==="custom"){var mc=(e.people||[]).filter(function(x){return (trip.people||[]).indexOf(x)>=0;});if(mc.indexOf(name)>=0&&mc.length)total+=e.amount/mc.length;}
    else{var sel;if(e.scope==="all")sel=trip.periods||[];else if(e.scope==="sejour"){var ids=e.periods||[];sel=(trip.periods||[]).filter(function(p){return ids.indexOf(p.id)>=0;});}else sel=(trip.periods||[]).filter(function(p){return p.id===e.scope;});
      var fn=(e.basis==="days")?function(p){return tDays(trip,p);}:tNights,tw=0;sel.forEach(function(p){tw+=fn(p);});
      if(tw>0)sel.forEach(function(p){var m=tMembers(trip,p);if(m.indexOf(name)>=0&&m.length)total+=e.amount*fn(p)/tw/m.length;});}
  });return total;}
  function personTripDays(trip,name){var d=0;(trip.periods||[]).forEach(function(p){if((p.members||[]).indexOf(name)>=0)d+=tDays(trip,p);});return d;}
  function tripRange(t){var ps=(t.periods||[]).filter(function(p){return p.start&&p.end;});if(!ps.length)return"";var mn=ps[0].start,mx=ps[0].end;ps.forEach(function(p){if(p.start<mn)mn=p.start;if(p.end>mx)mx=p.end;});return frDate(mn,{day:"numeric",month:"short"})+" → "+frDate(mx,{day:"numeric",month:"short",year:"numeric"});}
  /* Plage limitée aux périodes où `name` est présent (pour les stats perso) ; retombe sur la plage complète si aucune période membre. */
  function personTripRange(t,name){var ps=(t.periods||[]).filter(function(p){return p.start&&p.end&&(p.members||[]).indexOf(name)>=0;});if(!ps.length)return tripRange(t);var mn=ps[0].start,mx=ps[0].end;ps.forEach(function(p){if(p.start<mn)mn=p.start;if(p.end>mx)mx=p.end;});return frDate(mn,{day:"numeric",month:"short"})+" → "+frDate(mx,{day:"numeric",month:"short",year:"numeric"});}
  function tripMainYear(t){var by={};(t.periods||[]).forEach(function(p){if(!p.start||!p.end)return;var d=new Date(p.start+"T00:00:00"),e=new Date(p.end+"T00:00:00");while(d<e){var y=d.getFullYear();by[y]=(by[y]||0)+1;d.setDate(d.getDate()+1);}});var best="",max=-1;for(var y in by){if(by[y]>max){max=by[y];best=y;}}return best||((tripStart(t)||"").slice(0,4));}
  function activeTrip(){
    for(var i=0;i<store.trips.length;i++)if(store.trips[i].id===store.activeId){if(canSee(store.trips[i]))return store.trips[i];break;}
    var t=mainTrips()[0]||visibleTrips()[0]||store.trips[0];
    if(t&&store.activeId!==t.id)store.activeId=t.id;
    return t;
  }
  function save(){var j=JSON.stringify(store);try{localStorage.setItem(STORE_KEY,j);}catch(e){} if(CLOUD&&fbUser&&db){clearTimeout(cloudTimer);cloudTimer=setTimeout(function(){var jj=JSON.stringify(store);lastJson=jj;try{db.collection("budgets").doc(SHARED).set({json:jj});}catch(e){}},700);}}
  function renderTripSwitch(){
    var cur=activeTrip();
    var lbl=document.getElementById("trip-current");if(lbl)lbl.textContent=cur?(cur.tripName||"Sans titre"):"—";
    var list=document.getElementById("trip-list");if(!list)return;
    var main=mainTrips(),arch=archivedTrips(),multi=visibleTrips().length>1;
    function row(t,isA){var active=t.id===store.activeId;
      return '<button class="dd-trip'+(active?" active":"")+'" data-tripsel="'+t.id+'"><span class="dd-check">'+(active?CHK:'')+'</span><span class="dd-tname">'+esc(t.tripName||"Sans titre")+'</span><span class="dd-link" data-triplink="'+t.id+'" title="Copier le lien">'+LINKIC+'</span><span class="dd-ico" data-trip'+(isA?'unarch':'arch')+'="'+t.id+'" title="'+(isA?'Désarchiver':'Archiver')+'">'+(isA?UNARCH:ARCH)+'</span>'+(multi?'<span class="dd-del" data-tripdel="'+t.id+'" title="Supprimer">×</span>':'')+'</button>';
    }
    var html=main.map(function(t){return row(t,false);}).join("")||'<div class="meta" style="padding:8px 10px">Aucun voyage</div>';
    if(arch.length)html+='<div class="dd-div"></div><button class="dd-item" id="arch-toggle" type="button"><span class="dd-ico" style="opacity:1">'+ARCH+'</span> Archivés ('+arch.length+')</button><div id="arch-list" hidden>'+arch.map(function(t){return row(t,true);}).join("")+'</div>';
    list.innerHTML=html;
  }
  function hideMenus(){var a=document.getElementById("trip-menu"),b=document.getElementById("kebab-menu"),cgm=document.getElementById("cg-kebab-menu");if(a)a.hidden=true;if(b)b.hidden=true;if(cgm)cgm.hidden=true;}
  function toggleMenu(id){var m=document.getElementById(id),o=document.getElementById(id==="trip-menu"?"kebab-menu":"trip-menu");if(o)o.hidden=true;if(m)m.hidden=!m.hidden;}
  function switchTrip(id){store.activeId=id;state=activeTrip();save();renderTripSwitch();renderAll();syncHash();}
  var routeLock=false,routedOnce=false;
  function slugify(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"voyage";}
  function tripSlug(t){if(!t)return"";var base=slugify(t.tripName);var same=store.trips.filter(function(x){return slugify(x.tripName)===base;});if(same.length>1)return base+"-"+String(t.id).replace(/[^a-z0-9]/gi,"").slice(-4);return base;}
  function tripBySlug(slug){var ts=store.trips.filter(canSee),i;for(i=0;i<ts.length;i++)if(tripSlug(ts[i])===slug)return ts[i];for(i=0;i<ts.length;i++)if(slugify(ts[i].tripName)===slug)return ts[i];return null;}
  function notesOpen(){return !!(modalCtx&&modalCtx.type==="notes");}
  function latestTripId(){var ts=store.trips.filter(canSee);if(!ts.length)ts=store.trips;var best=null,bs="";ts.forEach(function(t){var s=tripStart(t)||"";if(best===null||s>bs){bs=s;best=t;}});return best?best.id:((store.trips[0]||{}).id);}
  function tripURL(t){return location.origin+location.pathname+"#voyages-"+tripSlug(t);}
  function syncHash(){if(routeLock)return;var h;if(curModule==="conges")h="#conges";else if(curModule==="skincare")h="#skincare";else{if(!state)return;h="#voyages-"+tripSlug(state);}if(location.hash!==h){routeLock=true;location.hash=h;setTimeout(function(){routeLock=false;},0);}}
  function applyHash(){if(!store||!store.trips)return;var raw=decodeURIComponent((location.hash||"").replace(/^#/,"")),low=raw.toLowerCase();
    if(low.indexOf("cong")===0){if(moduleAccess.conges)setModule("conges");return;}
    if(low.indexOf("skin")===0){if(moduleAccess.skincare)setModule("skincare");return;}
    if(low.indexOf("voyage")===0){setModule("voyages");var slug=raw.replace(/^voyages?-?/i,""),id=null;if(slug){var t=tripBySlug(slug);if(t)id=t.id;}if(!id)id=latestTripId();if(id&&id!==store.activeId){store.activeId=id;state=activeTrip();renderTripSwitch();renderAll();}return;}
  }
  function bootRoute(){if(routedOnce)return;routedOnce=true;window.addEventListener("hashchange",function(){if(routeLock)return;applyHash();});if((location.hash||"").replace(/^#\/?/,"").length)applyHash();else syncHash();}
  function fallbackCopy(txt){var i=document.createElement("textarea");i.value=txt;i.style.position="fixed";i.style.opacity="0";document.body.appendChild(i);i.focus();i.select();try{document.execCommand("copy");}catch(e){}document.body.removeChild(i);}
  function copyLink(url){function ok(){toast("Lien copié");}try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(ok,function(){fallbackCopy(url);ok();});return;}}catch(e){}fallbackCopy(url);ok();}
  function archiveTrip(id,val){var t=store.trips.filter(function(x){return x.id===id;})[0];if(!t)return;t.archived=val;if(val&&store.activeId===id){var m=mainTrips();if(m[0])store.activeId=m[0].id;}save();state=activeTrip();renderTripSwitch();renderAll();syncHash();toast(val?"Voyage archivé":"Voyage désarchivé");}
  function addTrip(){var t={id:uid(),tripName:"Nouveau voyage",seqP:1,seqE:1,people:[],periods:[],expenses:[],colors:{},emails:{}};store.trips.push(t);switchTrip(t.id);toast("Nouveau voyage");}
  function dupTrip(){var t=JSON.parse(JSON.stringify(state));t.id=uid();t.tripName=(state.tripName||"Voyage")+" (copie)";t.expenses=[];t.seqE=1;t.archived=false;store.trips.push(t);switchTrip(t.id);toast("Voyage dupliqué");}
  function delTripById(id){if(store.trips.length<=1){toast("Au moins un voyage");return;}if(!confirm("Supprimer ce voyage de l'historique ?"))return;store.trips=store.trips.filter(function(t){return t.id!==id;});if(store.activeId===id)store.activeId=store.trips[0].id;state=activeTrip();save();renderTripSwitch();renderAll();syncHash();hideMenus();toast("Voyage supprimé");}

  function defaultColor(name){var h=0;for(var i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))>>>0;return palette[h%palette.length];}
  function color(name){return (state.colors&&state.colors[name])?state.colors[name]:defaultColor(name);}
  function avatar(name){return '<span class="av" data-colperson="'+esc(name)+'" title="Changer la couleur" style="background:'+color(name)+'">'+(name?name[0].toUpperCase():"?")+'</span>';}
  function nights(p){var d=Math.round((Date.parse(p.end)-Date.parse(p.start))/86400000);return d>0?d:0;}
  function days(p){var n=nights(p);if(n<=0)return 0;var base=n+1;for(var i=0;i<state.periods.length;i++){var q=state.periods[i];if(q!==p&&q.end===p.start){base-=1;break;}}return base;}
  var nf=new Intl.NumberFormat("fr-FR",{maximumFractionDigits:2});
  function fmt(n){return nf.format(Math.round(n*100)/100)+" €";}
  function fmtResp(n){return '<span class="amt-full">'+nf.format(Math.round(n*100)/100)+' €</span><span class="amt-round">'+nf.format(Math.round(n))+' €</span>';}
  function frDate(s,o){var d=new Date(s+"T00:00:00");return isNaN(d)?s:d.toLocaleDateString("fr-FR",o);}
  function durLabel(s,e){var n=Math.round((Date.parse(e)-Date.parse(s))/86400000);n=n>0?n:0;var d=n>0?n+1:0;return n+" nuit"+(n>1?"s":"")+" · "+d+" jour"+(d>1?"s":"");}
  function period(id){for(var i=0;i<state.periods.length;i++)if(state.periods[i].id===id)return state.periods[i];return null;}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];});}
  function basisLabel(b){return b==="days"?"jours":"nuits";}
  function expPeriods(e){if(e.scope==="all")return state.periods.slice();if(e.scope==="sejour"){var ids=e.periods||[];return state.periods.filter(function(p){return ids.indexOf(p.id)>=0;});}var p=period(e.scope);return p?[p]:[];}
  function scopeLabel(e){
    if(e.scope==="custom"){var c=(e.people||[]).filter(function(x){return state.people.indexOf(x)>=0;}).length;return c+" personne"+(c>1?"s":"");}
    var sel=expPeriods(e);if(!sel.length)return"—";
    var base=(sel.length===state.periods.length)?"tout le séjour":sel.map(function(p){return esc(p.name);}).join(", ");
    return base+(sel.length>=2?" · "+basisLabel(e.basis):"");
  }
  function toast(msg){var t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");clearTimeout(t._t);t._t=setTimeout(function(){t.classList.remove("show");},1800);}

  function matrix(){
    var rows=[],tot={};
    state.people.forEach(function(n){tot[n]=0;});
    state.expenses.forEach(function(e){
      var sh={};state.people.forEach(function(n){sh[n]=0;});
      if(e.scope==="custom"){
        var mc=(e.people||[]).filter(function(x){return state.people.indexOf(x)>=0;});
        if(mc.length){var perc=e.amount/mc.length;mc.forEach(function(n){sh[n]+=perc;});}
      }else if(e.scope==="individual"){
        if(sh[e.person]!==undefined)sh[e.person]+=e.amount;
      }else{
        var sel=expPeriods(e),fn=(e.basis==="days")?days:nights,tw=0;
        sel.forEach(function(p){tw+=fn(p);});
        if(tw>0)sel.forEach(function(p){
          var m=p.members.filter(function(x){return state.people.indexOf(x)>=0;});
          if(!m.length)return;var per=e.amount*fn(p)/tw/m.length;
          m.forEach(function(n){sh[n]+=per;});
        });
      }
      state.people.forEach(function(n){tot[n]+=sh[n];});
      rows.push({e:e,sh:sh});
    });
    return{rows:rows,tot:tot};
  }

  function renderHeader(){
    document.getElementById("trip-name").value=state.tripName;
    var m=matrix(),grand=0;state.people.forEach(function(n){grand+=m.tot[n];});
    document.getElementById("st-total").textContent=fmt(grand);
    var rEl=document.getElementById("hero-range");
    if(state.periods.length){
      var mn=null,mx=null;state.periods.forEach(function(p){if(mn===null||p.start<mn)mn=p.start;if(mx===null||p.end>mx)mx=p.end;});
      var tn=state.periods.reduce(function(a,p){return a+nights(p);},0);
      rEl.textContent=frDate(mn,{day:"numeric",month:"short"})+" → "+frDate(mx,{day:"numeric",month:"short",year:"numeric"})+" · "+state.periods.length+" séjour"+(state.periods.length>1?"s":"")+" · "+tn+" nuits";
    }else rEl.textContent=state.people.length+" personne"+(state.people.length>1?"s":"")+" · aucun séjour";
    var hp=document.getElementById("hero-people");
    hp.innerHTML=state.people.map(function(n,i){return '<span class="hero-av" style="background:'+color(n)+';margin-left:'+(i?-8:0)+'px">'+esc(n[0].toUpperCase())+'</span>';}).join("")+(state.people.length?'<span class="hero-names">'+state.people.map(esc).join(", ")+'</span>':"");
    var bar=document.getElementById("hero-bar"),leg=document.getElementById("hero-legend");
    bar.innerHTML=state.people.map(function(n){return '<span style="width:'+(grand>0?(m.tot[n]/grand*100):0)+'%;background:'+color(n)+'"></span>';}).join("");
    leg.innerHTML=state.people.map(function(n){return '<span><span class="dot" style="background:'+color(n)+'"></span>'+esc(n)+'</span>';}).join("");
  }

  function renderMatrix(){
    var el=document.getElementById("matrix");
    var cols=state.periods.map(function(p){
      return '<th class="mx-col" data-pedit="'+p.id+'" title="Modifier la période"><div class="mx-cname">'+esc(p.name)+'</div><div class="mx-cdates">'+frDate(p.start,{day:"2-digit",month:"2-digit"})+' → '+frDate(p.end,{day:"2-digit",month:"2-digit"})+'</div></th>';
    }).join("");
    var cg='<colgroup><col>'+state.periods.map(function(){return "<col>";}).join("")+'</colgroup>';
    var head='<thead><tr><th class="mx-corner"></th>'+cols+'</tr></thead>';
    var body=state.people.map(function(n){
      var col=color(n);
      var cells=state.periods.map(function(p){
        var on=p.members.indexOf(n)>=0;
        return '<td class="mx-cell" data-period="'+p.id+'" data-person="'+esc(n)+'" title="'+esc(n)+' · '+esc(p.name)+'">'+(on
          ?'<span class="mx-band" style="background:'+rgba(col,0.13)+';color:'+shade(col,0.45)+'"><span class="mx-dot" style="background:'+col+'">'+CHK+'</span><span class="mx-bandtxt">présent</span></span>'
          :'<span class="mx-off"><span class="mx-plus">+</span></span>')+'</td>';
      }).join("");
      return '<tr class="mx-pr" data-prow="'+esc(n)+'"><th class="mx-row"><div class="mx-rowin"><span class="mx-grip" title="Glisser pour réordonner">⠿</span><span class="mx-rowedit" data-pedit-person="'+esc(n)+'" title="Modifier la personne"><span class="ppav" style="background:'+col+'">'+esc(n[0].toUpperCase())+'</span><span class="mx-rname">'+esc(n)+'</span></span></div></th>'+cells+'</tr>';
    }).join("");
    el.innerHTML=cg+head+'<tbody>'+body+'</tbody>';
    renderHeader();
  }

  function expById(id){for(var i=0;i<state.expenses.length;i++)if(state.expenses[i].id===id)return state.expenses[i];return null;}
  function optScope(sel){if(sel!=="custom")sel="sejour";return '<option value="sejour"'+(sel==="sejour"?" selected":"")+'>Séjour</option><option value="custom"'+(sel==="custom"?" selected":"")+'>Personnes</option>';}
  function optBasis(sel){var b=sel||"nights";return '<option value="nights"'+(b==="nights"?" selected":"")+'>nuits</option><option value="days"'+(b==="days"?" selected":"")+'>jours</option>';}
  function optPerson(sel){return state.people.map(function(n){return '<option'+(sel===n?" selected":"")+'>'+esc(n)+'</option>';}).join("");}

  function expPart(e){
    if(e.scope==="custom"){var mc=(e.people||[]).filter(function(x){return state.people.indexOf(x)>=0;}).length;return '<span class="exp-part">'+(mc?fmt(e.amount/mc)+" /pers":"")+'</span>';}
    if(e.scope==="individual")return '<span class="exp-part ind">'+(e.person?'<span class="av-mini" style="background:'+color(e.person)+'" title="'+esc(e.person)+'">'+esc(e.person[0].toUpperCase())+'</span>':'—')+'</span>';
    var sel=expPeriods(e);
    if(sel.length>=2)return '<span class="exp-part">prorata</span>';
    if(sel.length===1){var m1=sel[0].members.filter(function(x){return state.people.indexOf(x)>=0;}).length;return '<span class="exp-part">'+(m1?fmt(e.amount/m1)+" /pers":"")+'</span>';}
    return '<span class="exp-part"></span>';
  }
  function repText(e){
    if(e.scope==="custom"){var ppl=(e.people||[]).filter(function(x){return state.people.indexOf(x)>=0;});return ppl.length?ppl.map(esc).join(", "):"—";}
    var sel=expPeriods(e);if(!sel.length)return"—";
    var base=(sel.length===state.periods.length)?"Tout le séjour":sel.map(function(p){return esc(p.name);}).join(", ");
    return base+(sel.length>=2?" · "+basisLabel(e.basis):"");
  }
  function partText(e){
    if(e.scope==="custom"){var mc=(e.people||[]).filter(function(x){return state.people.indexOf(x)>=0;}).length;return mc?fmt(e.amount/mc)+" /pers":"";}
    var sel=expPeriods(e);
    if(sel.length>=2)return "prorata";
    if(sel.length===1){var m1=sel[0].members.filter(function(x){return state.people.indexOf(x)>=0;}).length;return m1?fmt(e.amount/m1)+" /pers":"";}
    return "";
  }
  function expShares(e){
    var sh={};state.people.forEach(function(n){sh[n]=0;});
    if(e.scope==="custom"){var mc=(e.people||[]).filter(function(x){return state.people.indexOf(x)>=0;});if(mc.length){var perc=e.amount/mc.length;mc.forEach(function(n){sh[n]+=perc;});}}
    else if(e.scope==="individual"){if(sh[e.person]!==undefined)sh[e.person]+=e.amount;}
    else{var sel=expPeriods(e),fn=(e.basis==="days")?days:nights,tw=0;sel.forEach(function(p){tw+=fn(p);});if(tw>0)sel.forEach(function(p){var m=p.members.filter(function(x){return state.people.indexOf(x)>=0;});if(!m.length)return;var per=e.amount*fn(p)/tw/m.length;m.forEach(function(n){sh[n]+=per;});});}
    return state.people.filter(function(n){return sh[n]>0.004;}).map(function(n){return {name:n,amount:sh[n]};});
  }
  function expSharesHtml(e){
    var sh=expShares(e);
    if(!sh.length)return '<div class="exp-l2">'+repText(e)+'</div>';
    return '<div class="exp-shares">'+sh.map(function(s){return '<span class="exp-share"><span class="av-mini" style="background:'+color(s.name)+'" title="'+esc(s.name)+'">'+esc(s.name[0].toUpperCase())+'</span>'+fmtResp(s.amount)+'</span>';}).join('')+'</div>';
  }
  function expRow(e){
    var hasC=!!(e.comment&&e.comment.replace(/<[^>]*>/g,"").trim());
    var lab=(e.label&&esc(e.label))||'<span class="exp-noname">Sans libellé</span>';
    var cat=e.category?catById(e.category):null;
    var dot=cat?'<span class="exp-cdot" style="background:'+cat.color+'" title="'+esc(cat.name)+'"></span>':'';
    return '<div class="exp-item'+(e.reserved?" reserved":"")+'" data-id="'+e.id+'">'
      +'<div class="exp-row">'
      +'<span class="drag-handle" title="Glisser pour réordonner">⠿</span>'
      +(function(){var st=e.paid?2:(e.reserved?1:0);var cls=st===2?" paid":(st===1?" res":"");var ico=st===2?"€":(st===1?CHK:"");var ttl=st===0?"À réserver — cliquer pour marquer réservé":(st===1?"Réservé — cliquer pour marquer payé":"Réservé et payé — cliquer pour réinitialiser");return '<button class="exp-state'+cls+'" data-state="'+e.id+'" title="'+ttl+'" aria-label="'+ttl+'">'+ico+'</button>';})()
      +'<div class="exp-main"><div class="exp-l1">'+lab+'</div>'+expSharesHtml(e)+'</div>'
      +'<div class="exp-r"><div class="exp-r1 num-f">'+dot+fmt(e.amount)+'</div></div>'
      +'<button class="exp-edit" data-edit="'+e.id+'" title="Modifier">'+PENCIL+'</button>'
      +'</div>'
      +(hasC?'<div class="exp-comment">'+ARROW+'<div class="exp-comment-body">'+e.comment+'</div></div>':'')
      +'</div>';
  }
  function renderExpenses(){
    var t=document.getElementById("expenses");
    var rc=document.getElementById("resa-count");
    if(rc){var n=state.expenses.length;rc.textContent=n?("· "+state.expenses.filter(function(e){return e.reserved;}).length+"/"+n+" réservé · "+state.expenses.filter(function(e){return e.paid;}).length+"/"+n+" payé"):"";}
    if(!state.expenses.length){t.innerHTML='<div class="exp-empty">Aucune dépense. Ajoute-en une ci-dessous.</div>';return;}
    t.innerHTML=state.expenses.map(expRow).join("");
  }

  function rgba(hex,a){var h=hex.replace("#","");if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];var r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return "rgba("+r+","+g+","+b+","+a+")";}
  function shade(hex,f){var h=hex.replace("#","");if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];var r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return "rgb("+Math.round(r*(1-f))+","+Math.round(g*(1-f))+","+Math.round(b*(1-f))+")";}
  function renderParts(){
    var m=matrix(),el=document.getElementById("parts"),cats=store.categories||[];
    var cards=state.people.map(function(n){
      var col=color(n),tot=0,paid=0,reste=0,byCat={};
      m.rows.forEach(function(r){var a=r.sh[n];if(a>0.004){tot+=a;if(r.e.paid)paid+=a;else reste+=a;var cid=r.e.category||"";byCat[cid]=(byCat[cid]||0)+a;}});
      var order=cats.map(function(c){return c.id;}).concat([""]);
      var lines=order.filter(function(cid){return byCat[cid]>0.004;}).map(function(cid){
        var c=cid?catById(cid):null,cn=c?esc(c.name):"Sans catégorie",cc=c?c.color:"#94a3b8";
        return '<div class="pline"><span class="pcat"><span class="pdot" style="background:'+cc+'"></span>'+cn+'</span><span>'+fmt(byCat[cid])+'</span></div>';
      }).join("")||'<div class="pline" style="border:none"><span class="meta">Aucune part</span></div>';
      var badges=state.periods.filter(function(p){return p.members.indexOf(n)>=0;}).map(function(p){return '<span class="ppbadge">'+esc(p.name)+'</span>';}).join("")||'<span class="ppbadge muted">aucun séjour</span>';
      return '<div class="ppcard">'
        +'<div class="ppcard-h"><span class="ppav static" style="background:'+col+'">'+esc(n[0].toUpperCase())+'</span>'
        +'<div><div class="ppname">'+esc(n)+'</div><div class="ppbadges">'+badges+'</div></div></div>'
        +'<div class="ppcard-total num-f">'+fmt(tot)+'</div>'
        +'<div class="ppstat"><span><span class="ppstat-l">Payé </span><span class="ppstat-v" style="color:#10b981">'+fmt(paid)+'</span></span><span><span class="ppstat-l">Reste </span><span class="ppstat-v" style="color:'+(reste>0.004?"#e11d48":"#10b981")+'">'+fmt(reste)+'</span></span></div>'
        +'<div class="plines">'+lines+'</div>'
        +'</div>';
    }).join("");
    el.innerHTML=cards||'<div class="exp-empty">Aucune personne. Ajoute-en une avec « + Personne ».</div>';
    renderHeader();
  }

  var QTOOL=[[{header:[1,2,3,false]}],["bold","italic","underline"],[{color:[]}],[{list:"ordered"},{list:"bullet"}],["link","clean"]];
  var notesQuill=null,notesLoading=false,cmtQuill=null;
  function hasQuill(){return typeof Quill!=="undefined";}
  var NOTE_FULL='<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" fill-rule="evenodd"><path d="M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm4 5.5a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2H9Zm0 4a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2H9Z"/></svg>';
  var NOTE_OUTLINE='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h14v16H5zM9 9h6M9 13h6"/></svg>';
  /* ===== Notes en Markdown =====
     Migration ADDITIVE : le Markdown vit dans `notesMd`, l'ancien HTML reste dans
     `notes` et n'est JAMAIS ecrase (retour arriere possible sans sauvegarde). */
  function mdHasRender(){return typeof marked!=="undefined";}
  function looksLikeHtml(s){return /<(p|div|h[1-6]|table|ul|ol|li|strong|em|br|img|a)\b[^>]*>/i.test(s||"");}
  function noteMd(t){
    if(!t)return "";
    if(typeof t.notesMd==="string")return t.notesMd;
    var h=(typeof t.notes==="string")?t.notes:"";
    if(!h)return "";
    /* premiere ouverture : on convertit une fois, sans toucher a `notes` */
    t.notesMd = looksLikeHtml(h) ? htmlToMd(h) : h;
    save();
    return t.notesMd;
  }
  function setNoteMd(t,v){if(t){t.notesMd=v;save();renderNotesBtn();}}
  function notesEmpty(){return noteMd(state).replace(/[\s*_#>|`~\-]/g,"").length===0;}
  function renderNotesBtn(){var b=document.getElementById("notes-btn");if(!b)return;var full=!notesEmpty();var ic=b.querySelector(".notes-ico");if(ic)ic.innerHTML=full?NOTE_FULL:NOTE_OUTLINE;b.classList.toggle("has-note",full);b.title=full?"Notes du voyage":"Notes du voyage (vide)";}
  function openNotesModal(){
    modalCtx={type:"notes"};
    var md=noteMd(state);
    var body='<div id="nm" class="nm">'
      +'<div class="nm-bar">'
        +'<div class="nm-seg" id="nm-seg">'
          +'<button type="button" data-nm="apercu" class="on">Aperçu</button>'
          +'<button type="button" data-nm="ecrire">Écrire</button>'
        +'</div>'
        +'<div class="nm-tools" id="nm-tools" hidden>'
          +'<button type="button" data-w="**" title="Gras (Ctrl+B)"><b>B</b></button>'
          +'<button type="button" data-w="*" title="Italique (Ctrl+I)"><i>I</i></button>'
          +'<button type="button" data-w="~~" title="Barré"><span class="nm-s">S</span></button>'
          +'<span class="nm-sep"></span>'
          +'<button type="button" data-p="## " title="Titre">H2</button>'
          +'<button type="button" data-p="### " title="Sous-titre">H3</button>'
          +'<span class="nm-sep"></span>'
          +'<button type="button" data-p="- " title="Liste à puces">•</button>'
          +'<button type="button" data-p="1. " title="Liste numérotée">1.</button>'
          +'<button type="button" data-p="> " title="Citation">&rdquo;</button>'
          +'<span class="nm-sep"></span>'
          +'<button type="button" data-nma="lien" title="Lien">Lien</button>'
          +'<button type="button" data-nma="tableau" title="Tableau">Tableau</button>'
        +'</div>'
      +'</div>'
      +'<div class="nm-body" id="nm-duo">'
        +'<textarea class="nm-src hidden" id="nm-src" spellcheck="false" placeholder="Planning, réservations (réfs, liens, adresses), idées, numéros utiles…"></textarea>'
        +'<div class="nm-prev" id="nm-prev"></div>'
      +'</div>'
    +'</div>';
    openModal("Notes du voyage",body,false);
    var mo=document.querySelector(".modal");if(mo)mo.classList.add("modal--notes");
    var ft=document.querySelector(".modal-foot");if(ft)ft.style.display="none";
    var src=document.getElementById("nm-src");
    src.value=md;
    nmApply();
    syncHash();
  }
  function nmRender(){
    var src=document.getElementById("nm-src"),pv=document.getElementById("nm-prev");
    if(!src||!pv)return;
    if(mdHasRender()){try{pv.innerHTML=marked.parse(src.value,{gfm:true,breaks:true});nmFigures(pv);}catch(e){pv.textContent=src.value;}}
    else pv.textContent=src.value;   /* CDN indisponible : on montre au moins le texte */
  }
  /* Une image collee depuis un chat arrive seule dans son <p> : sans traitement elle
     s'affiche en pleine largeur (mesure : 782x586). On les rend en vignettes alignees,
     comme dans le chat d'origine, et un clic les agrandit sur place. */
  function nmFigures(pv){
    var ps=pv.querySelectorAll("p"),i;
    for(i=0;i<ps.length;i++){
      var kids=ps[i].childNodes;
      if(kids.length===1&&kids[0].nodeType===1&&kids[0].tagName==="IMG")ps[i].className="nm-fig";
    }
  }
  function nmLarge(){return window.innerWidth>900;}
  function nmApply(){
    var seg=document.getElementById("nm-seg");if(!seg)return;
    var b=seg.querySelector("button.on"),apercu=!b||b.dataset.nm==="apercu";
    var src=document.getElementById("nm-src"),pv=document.getElementById("nm-prev"),
        duo=document.getElementById("nm-duo"),tools=document.getElementById("nm-tools");
    tools.hidden=apercu;
    if(apercu){src.classList.add("hidden");pv.classList.remove("hidden");duo.classList.remove("nm-duo2");nmRender();}
    else{
      src.classList.remove("hidden");
      var l=nmLarge();
      pv.classList.toggle("hidden",!l);
      duo.classList.toggle("nm-duo2",l);
      if(l)nmRender();
    }
  }
  /* --- outils d'ecriture --- */
  function nmWrap(av,ap){
    var t=document.getElementById("nm-src");if(!t)return;
    var d=t.selectionStart,f=t.selectionEnd,sel=t.value.slice(d,f)||"texte";
    t.value=t.value.slice(0,d)+av+sel+(ap||av)+t.value.slice(f);
    t.focus();t.setSelectionRange(d+av.length,d+av.length+sel.length);nmChanged();
  }
  function nmPrefix(pre){
    var t=document.getElementById("nm-src");if(!t)return;
    var d=t.selectionStart,f=t.selectionEnd,v=t.value;
    var deb=v.lastIndexOf("\n",d-1)+1,fin=v.indexOf("\n",f);if(fin<0)fin=v.length;
    var lignes=v.slice(deb,fin).split("\n").map(function(l,i){
      var p=/^\d+\. /.test(pre)?(i+1)+". ":pre;
      return p+l.replace(/^(#{1,6} |[-*] |\d+\. |> )/,"");
    });
    t.value=v.slice(0,deb)+lignes.join("\n")+v.slice(fin);
    t.focus();t.setSelectionRange(deb,deb+lignes.join("\n").length);nmChanged();
  }
  function nmInsert(txt){
    var t=document.getElementById("nm-src");if(!t)return;
    var d=t.selectionStart;
    t.value=t.value.slice(0,d)+txt+t.value.slice(d);
    t.focus();t.setSelectionRange(d+txt.length,d+txt.length);nmChanged();
  }
  function nmChanged(){
    var t=document.getElementById("nm-src");if(!t)return;
    setNoteMd(state,t.value);
    if(!document.getElementById("nm-prev").classList.contains("hidden"))nmRender();
  }
  /* --- HTML -> Markdown : sert a la migration ET au collage --- */
  function htmlToMd(html){
    var root=document.createElement("div");root.innerHTML=html;
    var jetables=root.querySelectorAll("span.ql-ui, style, script");
    for(var i=0;i<jetables.length;i++)jetables[i].parentNode.removeChild(jetables[i]);
    function inline(n){
      var out="",cs=n.childNodes;
      for(var k=0;k<cs.length;k++){
        var c=cs[k];
        if(c.nodeType===3){out+=c.nodeValue.replace(/\u00a0/g," ");continue;}
        if(c.nodeType!==1)continue;
        var t=c.tagName.toLowerCase(),x=inline(c);
        if(t==="strong"||t==="b")out+=x.trim()?"**"+x.trim()+"**":"";
        else if(t==="em"||t==="i")out+=x.trim()?"*"+x.trim()+"*":"";
        else if(t==="s"||t==="del")out+=x.trim()?"~~"+x.trim()+"~~":"";
        else if(t==="code")out+=x.trim()?"`"+x.trim()+"`":"";
        else if(t==="a")out+="["+x+"]("+(c.getAttribute("href")||"")+")";
        else if(t==="img")out+="!["+(c.getAttribute("alt")&&c.getAttribute("alt").indexOf("http")!==0?c.getAttribute("alt"):"")+"]("+(c.getAttribute("src")||"")+")";
        else if(t==="br")out+="  \n";
        else out+=x;
      }
      return out;
    }
    function cell(td){return inline(td).replace(/\s+/g," ").replace(/\|/g,"\\|").trim();}
    var blocs=[];
    function bloc(el){
      var t=el.tagName.toLowerCase(),x;
      if(/^h[1-6]$/.test(t)){x=inline(el).trim();if(x)blocs.push(new Array(+t[1]+1).join("#")+" "+x);}
      else if(t==="p"){x=inline(el).trim();if(x)blocs.push(x);}
      else if(t==="blockquote"){x=inline(el).trim();if(x)blocs.push("> "+x);}
      else if(t==="pre"){blocs.push("```\n"+el.textContent.replace(/\s+$/,"")+"\n```");}
      else if(t==="hr"){blocs.push("---");}
      else if(t==="ol"||t==="ul"){
        var puce=(t==="ul")||!!el.querySelector("li[data-list=bullet]"),l=[];
        for(var i=0;i<el.children.length;i++){
          var li=inline(el.children[i]).trim();
          if(li)l.push((puce?"- ":(i+1)+". ")+li);
        }
        if(l.length)blocs.push(l.join("\n"));
      }
      else if(t==="table"){
        var trs=el.querySelectorAll("tr"),rows=[],n=0,r,j;
        for(j=0;j<trs.length;j++){r=[];for(var q=0;q<trs[j].children.length;q++)r.push(cell(trs[j].children[q]));rows.push(r);if(r.length>n)n=r.length;}
        if(!rows.length)return;
        /* en-tete fusionnee (1 seule cellule) : on complete pour garder un tableau valide */
        if(rows[0].length===1&&n>1){while(rows[0].length<n)rows[0].push("");}
        var pad=function(rw){var c2=rw.slice();while(c2.length<n)c2.push("");return "| "+c2.join(" | ")+" |";};
        var out=[pad(rows[0]),"|"+new Array(n+1).join(" --- |")];
        for(j=1;j<rows.length;j++)out.push(pad(rows[j]));
        blocs.push(out.join("\n"));
      }
      else if(el.children.length){for(var m=0;m<el.children.length;m++)bloc(el.children[m]);}
      else{x=inline(el).trim();if(x)blocs.push(x);}
    }
    for(var z=0;z<root.children.length;z++)bloc(root.children[z]);
    return blocs.join("\n\n").replace(/\n{3,}/g,"\n\n").trim();
  }
  /* --- Interactions de l'editeur de notes (delegation sur #modal-body) --- */
  (function(){
    var mb=document.getElementById("modal-body");
    if(!mb)return;
    mb.addEventListener("click",function(e){
      if(!notesOpen())return;
      var sg=e.target.closest("#nm-seg button[data-nm]");
      if(sg){
        var bs=sg.parentNode.querySelectorAll("button");
        for(var i=0;i<bs.length;i++)bs[i].classList.toggle("on",bs[i]===sg);
        nmApply();
        if(sg.dataset.nm==="ecrire"){
          /* Differe d'un tick : le passage de display:none a visible fait replacer le
             curseur en fin de champ par le navigateur, APRES nous. Mesure du 18/08/2026. */
          setTimeout(function(){var t=document.getElementById("nm-src");
            if(t){t.focus();t.setSelectionRange(0,0);t.scrollTop=0;}},0);
        }
        return;
      }
      var b=e.target.closest("#nm-tools button, .nm-bar button[data-nma]");
      if(!b)return;
      if(b.dataset.w)return nmWrap(b.dataset.w);
      if(b.dataset.p)return nmPrefix(b.dataset.p);
      if(b.dataset.nma==="tableau")return nmInsert("\n| Colonne A | Colonne B |\n| --- | --- |\n|  |  |\n|  |  |\n\n");
      if(b.dataset.nma==="lien"){
        var t2=document.getElementById("nm-src");if(!t2)return;
        var d=t2.selectionStart,f=t2.selectionEnd,sel=t2.value.slice(d,f)||"texte du lien";
        t2.value=t2.value.slice(0,d)+"["+sel+"](url)"+t2.value.slice(f);
        t2.focus();t2.setSelectionRange(d+sel.length+3,d+sel.length+6);nmChanged();
      }
    });
    mb.addEventListener("click",function(e){
      if(!notesOpen())return;
      var im=e.target.closest("#nm-prev p.nm-fig img");
      if(im)im.parentNode.classList.toggle("nm-fig-open");
    });
    mb.addEventListener("input",function(e){if(notesOpen()&&e.target.id==="nm-src")nmChanged();});
    mb.addEventListener("keydown",function(e){
      if(!notesOpen()||e.target.id!=="nm-src")return;
      var meta=e.ctrlKey||e.metaKey;
      if(meta&&e.key.toLowerCase()==="b"){e.preventDefault();return nmWrap("**");}
      if(meta&&e.key.toLowerCase()==="i"){e.preventDefault();return nmWrap("*");}
      if(e.key==="Enter"&&!e.shiftKey){
        var t=e.target,d=t.selectionStart,v=t.value,deb=v.lastIndexOf("\n",d-1)+1,ligne=v.slice(deb,d);
        var m=ligne.match(/^([-*] |\d+\. |> )/);if(!m)return;
        e.preventDefault();
        if(ligne.trim()===m[1].trim()){t.value=v.slice(0,deb)+v.slice(d);t.setSelectionRange(deb,deb);nmChanged();return;}
        var suite=/^\d+\. /.test(m[1])?(parseInt(m[1],10)+1)+". ":m[1];
        t.value=v.slice(0,d)+"\n"+suite+v.slice(d);
        t.setSelectionRange(d+1+suite.length,d+1+suite.length);nmChanged();
      }
    });
    /* Collage depuis un chat : le presse-papier porte du HTML, on le convertit */
    mb.addEventListener("paste",function(e){
      if(!notesOpen()||e.target.id!=="nm-src")return;
      var html=e.clipboardData&&e.clipboardData.getData("text/html");
      if(!html)return;                       /* texte brut : comportement normal */
      e.preventDefault();
      var md=htmlToMd(html),t=e.target,d=t.selectionStart,f=t.selectionEnd;
      t.value=t.value.slice(0,d)+md+t.value.slice(f);
      t.setSelectionRange(d+md.length,d+md.length);
      nmChanged();toast("Collage converti en Markdown");
    });
    window.addEventListener("resize",function(){if(notesOpen())nmApply();});
  })();
  function renderAll(){renderMatrix();renderExpenses();renderParts();renderNotesBtn();}

  function addPerson(){
    var v=document.getElementById("person-input").value.trim();
    if(!v||state.people.indexOf(v)>=0)return;
    state.people.push(v);state.periods.forEach(function(p){if(p.members.indexOf(v)<0)p.members.push(v);});
    document.getElementById("person-input").value="";save();renderAll();
  }
  function removePerson(n){
    if(!confirm("Supprimer « "+n+" » ? Ses dépenses individuelles seront aussi supprimées."))return;
    state.people=state.people.filter(function(x){return x!==n;});
    state.periods.forEach(function(p){p.members=p.members.filter(function(x){return x!==n;});});
    state.expenses.forEach(function(e){if(e.people)e.people=e.people.filter(function(x){return x!==n;});});
    state.expenses=state.expenses.filter(function(e){return !(e.scope==="individual"&&e.person===n);});
    if(state.emails)delete state.emails[n];
    save();renderAll();return true;
  }
  function addPeriod(){
    var last=state.periods[state.periods.length-1];
    var start=last?last.end:"2026-07-05";
    var s=new Date(start+"T00:00:00"),e=new Date(s.getTime()+7*86400000);
    state.periods.push({id:"p"+(state.seqP++),name:"Séjour "+(state.periods.length+1),start:start,end:e.toISOString().slice(0,10),members:state.people.slice()});
    sortPeriods(state.periods);
    save();renderAll();
  }
  function removePeriod(id){
    var pp=period(id);
    if(!confirm("Supprimer la période « "+(pp?pp.name:"")+" » ? Les dépenses liées seront aussi supprimées."))return;
    state.periods=state.periods.filter(function(p){return p.id!==id;});
    state.expenses=state.expenses.filter(function(e){return e.scope!==id;});
    save();renderAll();return true;
  }
  function movePerson(src,target,after){
    if(src===target)return;
    var arr=state.people,from=arr.indexOf(src);if(from<0)return;
    arr.splice(from,1);
    var to=arr.indexOf(target);if(to<0){arr.splice(from,0,src);return;}
    if(after)to+=1;
    arr.splice(to,0,src);
    save();renderAll();
  }
  function moveExpense(srcId,targetId,after){
    if(srcId===targetId)return;
    var arr=state.expenses,from=-1,i;
    for(i=0;i<arr.length;i++)if(arr[i].id===srcId){from=i;break;}
    if(from<0)return;
    var src=arr.splice(from,1)[0],to=-1;
    for(i=0;i<arr.length;i++)if(arr[i].id===targetId){to=i;break;}
    if(to<0){arr.splice(from,0,src);return;}
    if(after)to+=1;
    arr.splice(to,0,src);
    save();renderExpenses();renderParts();
  }
  function moveCat(srcId,targetId,after){
    if(srcId===targetId)return;
    var arr=store.categories||[],from=-1,i;
    for(i=0;i<arr.length;i++)if(arr[i].id===srcId){from=i;break;}
    if(from<0)return;
    var src=arr.splice(from,1)[0],to=-1;
    for(i=0;i<arr.length;i++)if(arr[i].id===targetId){to=i;break;}
    if(to<0){arr.splice(from,0,src);return;}
    if(after)to+=1;
    arr.splice(to,0,src);
    save();var mc=document.getElementById("m-cats");if(mc)mc.innerHTML=settingsCatsHtml();renderExpenses();renderParts();
  }

  var colorTarget=null;
  function openColorPop(name,anchor){
    colorTarget=name;
    var cur=color(name).toLowerCase(),pop=document.getElementById("color-pop");
    pop.innerHTML=palette.map(function(hex){return '<span class="sw'+(cur===hex.toLowerCase()?" active":"")+'" data-sw="'+hex+'" style="background:'+hex+'" title="'+hex+'"></span>';}).join("")+'<button type="button" class="sw sw-cust" data-pcustom title="Couleur personnalisée"></button><input type="color" class="pcolorinput" value="'+cur+'" data-pcolorinput tabindex="-1" style="position:absolute;left:8px;bottom:8px;width:1px;height:1px;opacity:0;pointer-events:none">';
    pop.hidden=false;
    var r=anchor.getBoundingClientRect(),pw=pop.offsetWidth;
    pop.style.left=Math.max(8,Math.min(r.left,window.innerWidth-pw-8))+"px";
    pop.style.top=(r.bottom+6)+"px";
  }
  document.addEventListener("click",function(e){
    var pcu=e.target.closest("[data-pcustom]");
    if(pcu){var pin=document.getElementById("color-pop").querySelector(".pcolorinput");if(pin)pin.click();return;}
    var sw=e.target.closest("[data-sw]");
    if(sw){if(colorTarget){state.colors=state.colors||{};state.colors[colorTarget]=sw.dataset.sw;save();renderAll();}document.getElementById("color-pop").hidden=true;return;}
    if(!e.target.closest("[data-colperson]")&&!e.target.closest("#color-pop"))document.getElementById("color-pop").hidden=true;
  });
  document.addEventListener("change",function(e){
    var pci=e.target.closest("[data-pcolorinput]");
    if(pci&&colorTarget){state.colors=state.colors||{};state.colors[colorTarget]=e.target.value;save();renderAll();var cp=document.getElementById("color-pop");if(cp)cp.hidden=true;}
  });

  /* Modale création / édition */
  var modalCtx=null;
  function openModal(title,bodyHtml,showDelete){
    document.getElementById("modal-title").textContent=title;
    document.getElementById("modal-body").innerHTML=bodyHtml;
    document.getElementById("modal-delete").style.display=showDelete?"":"none";
    var md=document.querySelector(".modal");if(md){md.classList.remove("modal--notes");md.classList.remove("modal--sm");}
    var ft=document.querySelector(".modal-foot");if(ft)ft.style.display="";
    document.getElementById("modal").hidden=false;
  }
  function closeModal(){var wasNotes=notesOpen();document.getElementById("modal").hidden=true;modalCtx=null;notesQuill=null;if(wasNotes)syncHash();}
  function acctInitial(){var u=(auth&&auth.currentUser)?auth.currentUser:fbUser;var em=u&&u.email?u.email:"";return em?em[0].toUpperCase():"M";}
  function openAccountModal(){
    hideMenus();
    var u=(auth&&auth.currentUser)?auth.currentUser:fbUser;
    var email=u&&u.email?u.email:"—",init=acctInitial();
    modalCtx={type:"account"};
    var lock='<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
    var lout='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>';
    var body=''
      +'<div style="margin-bottom:18px"><div class="acc-sect">COMPTE</div>'
      +'<div class="acc-card"><span class="acc-av">'+esc(init)+'</span><span style="font-size:13px;color:var(--color-text)">'+esc(email)+'</span></div></div>'
      +'<div style="margin-bottom:16px"><div class="acc-sect">'+lock+'MOT DE PASSE</div>'
      +'<input id="acc-cur" class="acc-fld" type="password" placeholder="Mot de passe actuel" autocomplete="current-password"/>'
      +'<input id="acc-new" class="acc-fld" type="password" placeholder="Nouveau mot de passe (6 caractères min.)" autocomplete="new-password"/>'
      +'<input id="acc-new2" class="acc-fld" type="password" placeholder="Confirmer le nouveau mot de passe" autocomplete="new-password"/>'
      +'<button type="button" id="acc-save" class="btn primary acc-save">Enregistrer le mot de passe</button>'
      +'<div class="acc-msg" id="acc-msg"></div></div>'
      +'<div style="border-top:1px solid var(--color-border-light);padding-top:14px"><button type="button" id="acc-logout" class="btn danger">'+lout+'Se déconnecter</button></div>';
    openModal("Paramètres généraux",body,false);
    var md=document.querySelector(".modal");if(md)md.classList.add("modal--sm");
    var ft=document.querySelector(".modal-foot");if(ft)ft.style.display="none";
  }
  function accSavePassword(){
    var msg=document.getElementById("acc-msg");if(!msg)return;
    msg.className="acc-msg";
    var cur=(document.getElementById("acc-cur").value||""),np=(document.getElementById("acc-new").value||""),np2=(document.getElementById("acc-new2").value||"");
    if(!cur||!np){msg.textContent="Renseigne ton mot de passe actuel et le nouveau.";msg.classList.add("err");return;}
    if(np.length<6){msg.textContent="Le nouveau mot de passe doit faire au moins 6 caractères.";msg.classList.add("err");return;}
    if(np!==np2){msg.textContent="Les deux nouveaux mots de passe ne correspondent pas.";msg.classList.add("err");return;}
    var u=auth&&auth.currentUser;if(!u){msg.textContent="Tu n'es pas connecté.";msg.classList.add("err");return;}
    if(!confirm("Confirmer le changement de mot de passe ?"))return;
    msg.textContent="Enregistrement…";
    var cred=firebase.auth.EmailAuthProvider.credential(u.email,cur);
    u.reauthenticateWithCredential(cred).then(function(){return u.updatePassword(np);}).then(function(){
      msg.className="acc-msg ok";msg.textContent="Mot de passe mis à jour.";
      document.getElementById("acc-cur").value="";document.getElementById("acc-new").value="";document.getElementById("acc-new2").value="";
    }).catch(function(err){
      var m="Impossible de changer le mot de passe.",c=err&&err.code;
      if(c==="auth/wrong-password"||c==="auth/invalid-credential")m="Mot de passe actuel incorrect.";
      else if(c==="auth/weak-password")m="Nouveau mot de passe trop faible.";
      else if(c==="auth/too-many-requests")m="Trop de tentatives, réessaie plus tard.";
      msg.className="acc-msg err";msg.textContent=m;
    });
  }
  function openPeriodModal(id){
    var isNew=!id,p;
    if(isNew){var last=state.periods[state.periods.length-1];var start=last?last.end:"2026-07-05";var s=new Date(start+"T00:00:00"),e=new Date(s.getTime()+7*86400000);p={name:"Séjour "+(state.periods.length+1),start:start,end:e.toISOString().slice(0,10),members:state.people.slice()};}
    else p=period(id);
    modalCtx={type:"period",id:id,isNew:isNew};
    var mem=state.people.length?state.people.map(function(n){var on=p.members.indexOf(n)>=0;return '<div class="mem-item'+(on?" on":"")+'" data-mem="'+esc(n)+'"><span class="chk">'+(on?CHK:'')+'</span><span class="av" style="background:'+color(n)+'">'+esc(n[0].toUpperCase())+'</span>'+esc(n)+'</div>';}).join(""):'<div class="meta">Ajoute d\'abord des personnes.</div>';
    var body='<div class="fld-row"><label>Nom</label><input id="m-name" class="fld" type="text" value="'+esc(p.name)+'"/></div>'
      +'<div class="fld-row"><label>Dates</label><div class="date-range"><div class="date-field"><span class="date-cap">Début</span><button type="button" id="m-start" class="fld dpick" data-iso="'+p.start+'">'+frDate(p.start,{day:"numeric",month:"short",year:"numeric"})+'</button></div><div class="date-arrow">→</div><div class="date-field"><span class="date-cap">Fin</span><button type="button" id="m-end" class="fld dpick" data-iso="'+p.end+'">'+frDate(p.end,{day:"numeric",month:"short",year:"numeric"})+'</button></div></div><div class="date-dur" id="m-dur">'+durLabel(p.start,p.end)+'</div></div>'
      +'<div class="fld-row"><label>Présents</label><div class="mem-list" id="m-members">'+mem+'</div></div>';
    openModal(isNew?"Nouvelle période":"Modifier la période",body,!isNew);
  }
  function savePeriodModal(){
    var name=(document.getElementById("m-name").value||"").trim()||"Séjour";
    var start=document.getElementById("m-start").dataset.iso,end=document.getElementById("m-end").dataset.iso;
    var members=[],els=document.querySelectorAll("#m-members .mem-item.on");for(var i=0;i<els.length;i++)members.push(els[i].dataset.mem);
    if(modalCtx.isNew)state.periods.push({id:"p"+(state.seqP++),name:name,start:start,end:end,members:members});
    else{var p=period(modalCtx.id);if(p){p.name=name;p.start=start;p.end=end;p.members=members;}}
    sortPeriods(state.periods);
    save();renderAll();closeModal();
  }
  function openPersonModal(name){
    var isNew=!name;
    var used=state.people.map(function(n){return color(n).toLowerCase();});
    var cur=isNew?(palette.filter(function(h){return used.indexOf(h.toLowerCase())<0;})[0]||palette[0]):color(name);
    modalCtx={type:"person",name:name,isNew:isNew,col:cur};
    var isCustom=palette.map(function(h){return h.toLowerCase();}).indexOf(cur.toLowerCase())<0;
    var sws=palette.map(function(hex){return '<span class="sw'+(cur.toLowerCase()===hex.toLowerCase()?" active":"")+'" data-msw="'+hex+'" style="background:'+hex+'"></span>';}).join("")+'<button type="button" class="sw sw-cust'+(isCustom?" active":"")+'" data-mcustom title="Couleur personnalisée"></button><input type="color" class="m-colorinput" value="'+cur+'" data-mcolorinput tabindex="-1" style="position:absolute;left:0;bottom:0;width:1px;height:1px;opacity:0;pointer-events:none">';
    var curMail=isNew?"":((state.emails&&state.emails[name])||"");
    var body='<div class="fld-row"><label>Nom</label><input id="m-pname" class="fld" type="text" value="'+(isNew?"":esc(name))+'" placeholder="Nom"/></div>'
      +'<div class="fld-row"><label>Couleur</label><div class="sw-row" id="m-colors" style="position:relative">'+sws+'</div></div>'
      +'<div class="fld-row"><label>E-mail (facultatif)</label><input id="m-pemail" class="fld" type="email" value="'+esc(curMail)+'" placeholder="E-mail"/><div class="field-hint">Si renseigné sur les personnes d\'un voyage, seuls ces comptes verront le voyage.</div></div>';
    openModal(isNew?"Nouvelle personne":"Modifier la personne",body,!isNew);
  }
  function savePersonModal(){
    var name=(document.getElementById("m-pname").value||"").trim();
    if(!name){toast("Nom requis");return;}
    var col=modalCtx.col;state.colors=state.colors||{};state.emails=state.emails||{};
    var mail=(document.getElementById("m-pemail").value||"").trim();
    if(modalCtx.isNew){
      if(state.people.indexOf(name)>=0){toast("Déjà présent");return;}
      state.people.push(name);state.periods.forEach(function(p){if(p.members.indexOf(name)<0)p.members.push(name);});
      state.colors[name]=col;
    }else{
      var old=modalCtx.name;
      if(name!==old){
        if(state.people.indexOf(name)>=0){toast("Nom déjà pris");return;}
        var idx=state.people.indexOf(old);if(idx>=0)state.people[idx]=name;
        state.periods.forEach(function(p){var mi=p.members.indexOf(old);if(mi>=0)p.members[mi]=name;});
        state.expenses.forEach(function(ex){if(ex.scope==="individual"&&ex.person===old)ex.person=name;if(ex.people)ex.people=ex.people.map(function(x){return x===old?name:x;});});
        if(state.colors[old]!==undefined)delete state.colors[old];
        if(state.emails[old]!==undefined)delete state.emails[old];
      }
      state.colors[name]=col;
    }
    if(mail)state.emails[name]=mail;else delete state.emails[name];
    save();renderTripSwitch();renderAll();closeModal();
  }
  function updateExpenseModal(){
    var sp=document.querySelector("#m-exscope-pick .catpick.on"),sc=sp?sp.dataset.scopepick:"sejour";
    var rr=document.getElementById("m-experiods-row"),br=document.getElementById("m-exbasis-row"),pe=document.getElementById("m-expeople-row");
    if(rr)rr.style.display=sc==="sejour"?"":"none";
    if(pe)pe.style.display=sc==="custom"?"":"none";
    var nsel=document.querySelectorAll("#m-experiods .mem-item.on").length;
    if(br)br.style.display=(sc==="sejour"&&nsel>=2)?"":"none";
    renderExpReparto();
  }
  function expModalShares(){
    var ae=document.getElementById("m-examount");var amt=ae?parseFloat(ae.value):NaN;if(isNaN(amt))amt=0;
    var sp=document.querySelector("#m-exscope-pick .catpick.on"),sc=sp?sp.dataset.scopepick:"sejour";
    var e={amount:amt},i;
    if(sc==="custom"){var ppl=[],pels=document.querySelectorAll("#m-expeople .mem-item.on");for(i=0;i<pels.length;i++)ppl.push(pels[i].dataset.mem);e.scope="custom";e.people=ppl;}
    else{var psel=[],pers=document.querySelectorAll("#m-experiods .mem-item.on");for(i=0;i<pers.length;i++)psel.push(pers[i].dataset.mem);e.scope="sejour";e.periods=psel.length?psel:state.periods.map(function(p){return p.id;});var bs=document.getElementById("m-exbasis");e.basis=bs?bs.value:"nights";}
    return expShares(e);
  }
  function renderExpReparto(){
    var box=document.getElementById("m-exreparto");if(!box)return;
    var sh=expModalShares();
    if(!sh.length){box.style.display="none";box.innerHTML="";return;}
    box.style.display="";
    var tot=sh.reduce(function(a,s){return a+s.amount;},0);
    box.innerHTML='<div class="exr-list">'+sh.map(function(s){return '<span class="exr-item"><span class="av-mini" style="background:'+color(s.name)+'" title="'+esc(s.name)+'">'+esc(s.name[0].toUpperCase())+'</span>'+fmt(s.amount)+'</span>';}).join('')+'</div><span class="exr-tot">∑ '+fmt(tot)+'</span>';
  }
  function openExpenseModal(id){
    var ex=id?expById(id):null,isNew=!ex;
    var sc=ex&&ex.scope==="custom"?"custom":"sejour";
    var selPeriods=(ex&&ex.scope==="sejour"&&ex.periods&&ex.periods.length)?ex.periods:state.periods.map(function(p){return p.id;});
    var selPeople=(ex&&ex.scope==="custom"&&ex.people&&ex.people.length)?ex.people:state.people.slice();
    var basis=(ex&&ex.basis)?ex.basis:"nights";
    modalCtx={type:"expense",id:id||null};
    var periodsItems=state.periods.length?state.periods.map(function(p){var on=selPeriods.indexOf(p.id)>=0;return '<div class="mem-item'+(on?" on":"")+'" data-mem="'+p.id+'"><span class="chk">'+(on?CHK:'')+'</span><span class="mem-pname">'+esc(p.name)+'</span><span class="mem-pdates">'+frDate(p.start,{day:"2-digit",month:"2-digit"})+' → '+frDate(p.end,{day:"2-digit",month:"2-digit"})+'</span></div>';}).join(""):'<div class="meta">Ajoute d\'abord des périodes.</div>';
    var peopleItems=state.people.map(function(n){var on=selPeople.indexOf(n)>=0;return '<div class="mem-item'+(on?" on":"")+'" data-mem="'+esc(n)+'"><span class="chk">'+(on?CHK:'')+'</span><span class="av" style="background:'+color(n)+'">'+esc(n[0].toUpperCase())+'</span>'+esc(n)+'</div>';}).join("");
    var body='<div class="fld-row"><label>Libellé</label><input id="m-exlabel" class="fld" type="text" placeholder="Libellé" value="'+(ex?esc(ex.label||""):"")+'"/></div>'
      +'<div class="fld-row"><label>Montant</label><input id="m-examount" class="fld" type="number" min="0" step="0.01" placeholder="€" value="'+(ex?ex.amount:"")+'"/></div>'
      +'<div class="fld-row"><label>Catégorie</label><div class="catpicks" id="m-excat">'+(store.categories||[]).map(function(c){var on=ex&&ex.category===c.id;return '<span class="catpick'+(on?" on":"")+'" data-catpick="'+c.id+'" style="--c:'+c.color+'">'+esc(c.name)+'</span>';}).join("")+'</div></div>'
      +'<div class="fld-row"><label>Répartition</label><div class="catpicks" id="m-exscope-pick"><span class="catpick scope'+(sc==="sejour"?" on":"")+'" data-scopepick="sejour">Séjour</span><span class="catpick scope'+(sc==="custom"?" on":"")+'" data-scopepick="custom">Personnes</span></div></div>'
      +'<div class="fld-row" id="m-experiods-row"><label>Périodes</label><div class="mem-list" id="m-experiods">'+periodsItems+'</div></div>'
      +'<div class="fld-row" id="m-exbasis-row"><label>Base de calcul</label><select id="m-exbasis" class="fld">'+optBasis(basis)+'</select></div>'
      +'<div class="fld-row" id="m-expeople-row"><label>Personnes concernées</label><div class="mem-list" id="m-expeople">'+peopleItems+'</div></div>'
      +'<div class="exp-reparto" id="m-exreparto"></div>'
      +'<div class="fld-row"><label>Commentaires</label>'+(hasQuill()?'<div id="m-cmt-editor"></div>':rtEditor("m-excmt","Lien, adresse, planning…",110,(ex&&ex.comment)||""))+'</div>';
    cmtQuill=null;
    openModal(isNew?"Nouvelle dépense":"Modifier la dépense",body,!isNew);
    updateExpenseModal();
    if(hasQuill()){cmtQuill=new Quill("#m-cmt-editor",{theme:"snow",bounds:document.getElementById("modal"),placeholder:"Lien, adresse, planning…",modules:{toolbar:QTOOL}});cmtQuill.root.innerHTML=(ex&&ex.comment)||"";}
  }
  function rtEditor(id,ph,minH,html){
    var rtCols=["#0f172a","#4f46e5","#0ea5e9","#10b981","#f43f5e","#8b5cf6"];
    var sw=rtCols.map(function(cc){return '<button type="button" class="rt-btn rt-color" data-cmd="color" data-color="'+cc+'" title="Couleur du texte"><span class="rt-swatch" style="background:'+cc+'"></span></button>';}).join("");
    return '<div class="rt"><div class="rt-toolbar">'
      +'<button type="button" class="rt-btn" data-cmd="h3" title="Titre">H</button>'
      +'<button type="button" class="rt-btn" data-cmd="bold" title="Gras"><b>B</b></button>'
      +'<button type="button" class="rt-btn" data-cmd="italic" title="Italique"><i>I</i></button>'
      +'<button type="button" class="rt-btn" data-cmd="underline" title="Souligné"><u>U</u></button>'
      +'<button type="button" class="rt-btn" data-cmd="strikeThrough" title="Barré"><s>S</s></button>'
      +'<span class="rt-sep"></span>'
      +'<button type="button" class="rt-btn" data-cmd="insertUnorderedList" title="Liste à puces">•</button>'
      +'<button type="button" class="rt-btn" data-cmd="insertOrderedList" title="Liste numérotée">1.</button>'
      +'<span class="rt-sep"></span>'
      +'<button type="button" class="rt-btn" data-cmd="link" title="Lien"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1"/><path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1"/></svg></button>'
      +'<button type="button" class="rt-btn" data-cmd="unlink" title="Retirer le lien"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 15l6-6M10 14l-1 1a3.5 3.5 0 0 1-5-5l1-1M14 10l1-1a3.5 3.5 0 0 1 5 5l-1 1M4 4l16 16"/></svg></button>'
      +'<button type="button" class="rt-btn" data-cmd="removeFormat" title="Effacer la mise en forme"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 5h12M9 5l-2 14M13 5l-1 7M5 19h7"/></svg></button>'
      +'<span class="rt-sep"></span>'+sw
      +'</div><div id="'+id+'" class="rt-area" contenteditable="true" data-ph="'+esc(ph)+'" style="min-height:'+minH+'px">'+(html||"")+'</div></div>';
  }
  function openCommentModal(id){var ex=expById(id);if(!ex)return;modalCtx={type:"comment",id:id};cmtQuill=null;var body='<div class="fld-row"><label>Commentaire — '+esc(ex.label)+'</label>'+(hasQuill()?'<div id="m-cmt-editor"></div>':rtEditor("m-cmt","Lien, adresse, référence…",110,ex.comment||""))+'</div>';openModal("Commentaire",body,false);if(hasQuill()){cmtQuill=new Quill("#m-cmt-editor",{theme:"snow",bounds:document.getElementById("modal"),placeholder:"Lien, adresse, référence…",modules:{toolbar:QTOOL}});cmtQuill.root.innerHTML=ex.comment||"";}}
  function saveCommentModal(){var ex=expById(modalCtx.id);if(ex){ex.comment=cmtQuill?cmtQuill.root.innerHTML:(document.getElementById("m-cmt")?document.getElementById("m-cmt").innerHTML:"");save();renderExpenses();}cmtQuill=null;closeModal();}
  function saveExpenseModal(){
    var lab=(document.getElementById("m-exlabel").value||"").trim(),amt=parseFloat(document.getElementById("m-examount").value);
    if(!lab){toast("Libellé requis");return;}
    amt=(amt>0)?amt:0;
    var spk=document.querySelector("#m-exscope-pick .catpick.on"),sc=spk?spk.dataset.scopepick:"sejour";
    var ex=modalCtx.id?expById(modalCtx.id):null;
    if(!ex){ex={id:"e"+(state.seqE++)};state.expenses.push(ex);}
    ex.label=lab;ex.amount=amt;ex.scope=(sc==="custom"?"custom":"sejour");
    if(sc==="custom"){var sel=[],els=document.querySelectorAll("#m-expeople .mem-item.on");for(var i=0;i<els.length;i++)sel.push(els[i].dataset.mem);ex.people=sel.length?sel:state.people.slice();delete ex.periods;delete ex.basis;}
    else{var psel=[],pels=document.querySelectorAll("#m-experiods .mem-item.on");for(var j=0;j<pels.length;j++)psel.push(pels[j].dataset.mem);ex.periods=psel.length?psel:state.periods.map(function(p){return p.id;});ex.basis=document.getElementById("m-exbasis").value;delete ex.people;}
    var cc=document.querySelector("#m-excat .catpick.on");ex.category=cc?cc.dataset.catpick:"";
    ex.comment=cmtQuill?cmtQuill.root.innerHTML:(document.getElementById("m-excmt")?document.getElementById("m-excmt").innerHTML:(ex.comment||""));
    cmtQuill=null;
    save();renderExpenses();renderParts();closeModal();
  }
  function settingsCatsHtml(){return (store.categories||[]).map(function(c,i){
    var sws=palette.map(function(h){return '<span class="csw'+(c.color.toLowerCase()===h.toLowerCase()?" active":"")+'" data-catsw="'+h+'" data-catid="'+c.id+'" style="background:'+h+'"></span>';}).join("");
    sws+='<button type="button" class="csw cat-cust" data-catcustom="'+c.id+'" title="Couleur personnalisée"></button><input type="color" class="cat-custinput" value="'+c.color+'" data-catcolinput="'+c.id+'" tabindex="-1">';
    return '<div class="cat-item" data-catdrag data-catid="'+c.id+'" data-idx="'+i+'"><div class="cat-top"><span class="cat-grip" title="Glisser pour réordonner">⠿</span><button type="button" class="cat-dot" data-cattoggle="'+c.id+'" style="background:'+c.color+'" title="Couleur"></button><input type="text" class="cat-name" data-catid="'+c.id+'" value="'+esc(c.name)+'"/><button class="row-action" data-catdel="'+c.id+'" title="Supprimer">×</button></div><div class="cat-sws" hidden>'+sws+'</div></div>';
  }).join("");}
  function openSettingsModal(){
    modalCtx={type:"settings"};
    var body='<div class="settings">'
      +'<h3 class="set-grp">Catégories</h3>'
      +'<div class="set-card"><p class="set-desc">Catégories pour classer les dépenses — communes à tous tes voyages.</p><div id="m-cats">'+settingsCatsHtml()+'</div><button type="button" class="btn primary sm" id="m-cat-add" style="margin-top:12px">+ Catégorie</button></div>'
      +'<h3 class="set-grp">Données</h3>'
      +'<div class="set-card"><p class="set-desc">Sauvegarde complète de tous tes voyages. L\'import remplace toutes les données.</p><div class="set-data"><button type="button" class="btn sm" id="m-import"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 8l5-5 5 5M12 3v12"/></svg>Importer</button><button type="button" class="btn sm" id="m-export"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>Exporter</button></div></div>'
      +'</div>';
    openModal("Réglages",body,false);
    var ft=document.querySelector(".modal-foot");if(ft)ft.style.display="none";
  }
  function tripColor(t){return defaultColor(String((t&&(t.id||t.tripName))||""));}
  var statsState=null;
  function statsInner(){
    var st=statsState,sel=st.sel;
    var maxTot=0;st.years.forEach(function(y){if(st.tot[y]>maxTot)maxTot=st.tot[y];});
    var bars=st.years.map(function(y){
      var h=maxTot>0?Math.max(6,st.tot[y]/maxTot*78):6;
      return '<div class="sv-yb'+(y===sel?" sel":"")+'" data-statyear="'+esc(y)+'"><div class="sv-yt">'+fmt(st.tot[y])+'</div><div class="sv-bar" style="height:'+h+'px"></div><div class="sv-yl">'+(y==="—"?"Sans date":esc(y))+'</div></div>';
    }).join("");
    var trips=st.byYear[sel]||[];
    var byCost=trips.slice().sort(function(a,b){return b.cost-a.cost;});
    var byDay=trips.slice().sort(function(a,b){return b.perDay-a.perDay;});
    function bars2(items,fmtv,key){
      var max=0;items.forEach(function(i){if(i[key]>max)max=i[key];});
      return items.map(function(i){
        var w=max>0?Math.max(3,i[key]/max*100):3;
        return '<div class="sv-row"><div class="sv-rtop"><span class="sv-nm">'+esc(i.name)+(i.arch?'<span class="sv-arch">archivé</span>':'')+'</span><span class="sv-vl">'+fmtv(i)+'</span></div>'
          +(i.dates?'<div class="sv-dt">'+i.dates+'</div>':'')
          +'<div class="sv-track"><div class="sv-fill" style="width:'+w+'%;background:'+i.color+'"></div></div></div>';
      }).join("");
    }
    return '<div class="sv-head">Coût par année — clique pour explorer</div><div class="sv-bars">'+bars+'</div>'
      +'<div class="sv-sep"><div class="sv-title">'+(sel==="—"?"Sans date":esc(sel))+' · '+fmt(st.tot[sel])+' · '+trips.length+' voyage'+(trips.length>1?'s':'')+'</div>'
      +'<div class="sv-grid">'
      +'<div><div class="sv-head">Coût par voyage</div>'+bars2(byCost,function(i){return fmt(i.cost);},"cost")+'</div>'
      +'<div><div class="sv-head">Coût par jour</div>'+bars2(byDay,function(i){return i.days>0?fmt(i.perDay)+"/jour":"—";},"perDay")+'</div>'
      +'</div></div>';
  }
  function openStatsModal(){
    modalCtx={type:"stats"};
    var rows=[],missing=0;
    store.trips.filter(canSee).sort(byStartDesc).forEach(function(t){
      var name=personInTrip(t);if(!name){missing++;return;}
      var days=personTripDays(t,name),cost=personTripCost(t,name);
      rows.push({name:(t.tripName||"Sans titre"),cost:cost,days:days,perDay:days>0?cost/days:0,color:tripColor(t),dates:personTripRange(t,name),arch:!!t.archived,year:tripMainYear(t)||"—"});
    });
    var miss=missing?'<div class="field-hint" style="margin-top:14px">'+missing+' voyage'+(missing>1?'s':'')+' non compté'+(missing>1?'s':'')+' : ton e-mail n\'y est pas renseigné.</div>':'';
    if(!rows.length){
      statsState=null;
      openModal("Mes statistiques",'<div class="meta">Aucun voyage où tu figures. Renseigne ton e-mail sur ta fiche dans chaque voyage.</div>'+miss,false);
      var ft0=document.querySelector(".modal-foot");if(ft0)ft0.style.display="none";return;
    }
    var byYear={},tot={};
    rows.forEach(function(r){(byYear[r.year]=byYear[r.year]||[]).push(r);tot[r.year]=(tot[r.year]||0)+r.cost;});
    var years=Object.keys(byYear).filter(function(y){return y!=="—";}).sort();if(byYear["—"])years.push("—");
    var numeric=years.filter(function(y){return y!=="—";});
    statsState={byYear:byYear,tot:tot,years:years,sel:(numeric.length?numeric[numeric.length-1]:years[0])};
    openModal("Mes statistiques",'<div id="stats-wrap">'+statsInner()+'</div>'+miss,false);
    var ft=document.querySelector(".modal-foot");if(ft)ft.style.display="none";
  }
  var modalEl=document.getElementById("modal");
  var modalDownOnBg=false;
  modalEl.addEventListener("mousedown",function(e){modalDownOnBg=(e.target===modalEl);});
  modalEl.addEventListener("click",function(e){
    if((e.target===modalEl&&modalDownOnBg)||e.target.closest("#modal-close")||e.target.closest("#modal-cancel")){closeModal();return;}
    if(e.target===modalEl)return;
    if(e.target.closest("#acc-save")){accSavePassword();return;}
    if(e.target.closest("#acc-logout")){if(!confirm("Se déconnecter ?"))return;closeModal();if(auth)auth.signOut();return;}
    var sy=e.target.closest("[data-statyear]");
    if(sy&&statsState){statsState.sel=sy.dataset.statyear;var w=document.getElementById("stats-wrap");if(w)w.innerHTML=statsInner();return;}
    if(modalCtx&&modalCtx.type==="settings"){
      var cdt=e.target.closest("[data-cattoggle]");if(cdt){var sws=cdt.closest(".cat-item").querySelector(".cat-sws");if(sws)sws.hidden=!sws.hidden;return;}
      var ccu=e.target.closest("[data-catcustom]");if(ccu){var cin=ccu.closest(".cat-item").querySelector(".cat-custinput");if(cin)cin.click();return;}
      var csw=e.target.closest(".csw");if(csw){var cco=catById(csw.dataset.catid);if(cco){cco.color=csw.dataset.catsw;save();document.getElementById("m-cats").innerHTML=settingsCatsHtml();renderExpenses();renderParts();}return;}
      if(e.target.closest("#m-cat-add")){store.categories=store.categories||[];store.categories.push({id:uid(),name:"Nouvelle",color:palette[(store.categories.length)%palette.length]});save();document.getElementById("m-cats").innerHTML=settingsCatsHtml();renderExpenses();renderParts();return;}
      var cd=e.target.closest("[data-catdel]");if(cd){var cid=cd.dataset.catdel;var cdo=catById(cid);if(!confirm("Supprimer la catégorie"+(cdo&&cdo.name?" « "+cdo.name+" »":"")+" ? Les dépenses associées seront reclassées sans catégorie."))return;store.categories=(store.categories||[]).filter(function(x){return x.id!==cid;});store.trips.forEach(function(t){(t.expenses||[]).forEach(function(ex){if(ex.category===cid)ex.category="";});});save();document.getElementById("m-cats").innerHTML=settingsCatsHtml();renderExpenses();renderParts();return;}
      if(e.target.closest("#m-export")){doExport();return;}
      if(e.target.closest("#m-import")){closeModal();document.getElementById("file-input").click();return;}
    }
    if(e.target.closest("#modal-save")){if(modalCtx&&modalCtx.type==="period")savePeriodModal();else if(modalCtx&&modalCtx.type==="person")savePersonModal();else if(modalCtx&&modalCtx.type==="expense")saveExpenseModal();else if(modalCtx&&modalCtx.type==="comment")saveCommentModal();else if(modalCtx&&modalCtx.type==="skinprod")saveSkinProdModal();else closeModal();return;}
    if(e.target.closest("#modal-delete")){if(!modalCtx)return;
      if(modalCtx.type==="skinprod"){if(skinDeleteProd())closeModal();return;}
      if(modalCtx.type==="expense"){var ed=expById(modalCtx.id),el=(ed&&ed.label||"").trim();if(!confirm("Supprimer la dépense"+(el?" « "+el+" »":"")+" ?"))return;state.expenses=state.expenses.filter(function(x){return x.id!==modalCtx.id;});save();renderExpenses();renderParts();closeModal();return;}
      var ok=modalCtx.type==="period"?removePeriod(modalCtx.id):removePerson(modalCtx.name);if(ok)closeModal();return;}
    var spk=e.target.closest("[data-scopepick]");
    if(spk){var sall=modalEl.querySelectorAll("#m-exscope-pick .catpick");for(var s2=0;s2<sall.length;s2++)sall[s2].classList.remove("on");spk.classList.add("on");updateExpenseModal();return;}
    var cp=e.target.closest("[data-catpick]");
    if(cp){var wasOn=cp.classList.contains("on"),all=modalEl.querySelectorAll("#m-excat .catpick");for(var k=0;k<all.length;k++)all[k].classList.remove("on");if(!wasOn)cp.classList.add("on");return;}
    var mi=e.target.closest(".mem-item");
    if(mi&&mi.dataset.mem){mi.classList.toggle("on");mi.querySelector(".chk").innerHTML=mi.classList.contains("on")?CHK:'';if(modalCtx&&modalCtx.type==="expense")updateExpenseModal();return;}
    var mcu=e.target.closest("[data-mcustom]");
    if(mcu){var mpin=modalEl.querySelector(".m-colorinput");if(mpin)mpin.click();return;}
    var sw=e.target.closest("[data-msw]");
    if(sw&&modalCtx){modalCtx.col=sw.dataset.msw;var a=modalEl.querySelectorAll("[data-msw],[data-mcustom]");for(var i=0;i<a.length;i++)a[i].classList.remove("active");sw.classList.add("active");return;}
  });
  modalEl.addEventListener("change",function(e){
    var mci=e.target.closest("[data-mcolorinput]");if(mci&&modalCtx){modalCtx.col=e.target.value;var aa=modalEl.querySelectorAll("[data-msw],[data-mcustom]");for(var ii=0;ii<aa.length;ii++)aa[ii].classList.remove("active");var mcb=modalEl.querySelector("[data-mcustom]");if(mcb)mcb.classList.add("active");return;}
    var cci=e.target.closest("[data-catcolinput]");if(cci){var cc2=catById(cci.dataset.catcolinput);if(cc2){cc2.color=e.target.value;save();var mc=document.getElementById("m-cats");if(mc)mc.innerHTML=settingsCatsHtml();renderExpenses();renderParts();}return;}
    var cc=e.target.closest(".cat-color");if(cc){var c=catById(cc.dataset.catid);if(c){c.color=e.target.value;save();renderExpenses();renderParts();}return;}
    if(e.target.id==="m-exbasis"&&modalCtx&&modalCtx.type==="expense"){renderExpReparto();return;}
  });
  modalEl.addEventListener("input",function(e){var cn=e.target.closest(".cat-name");if(cn){var c=catById(cn.dataset.catid);if(c){c.name=e.target.value;save();renderExpenses();renderParts();}return;}if(e.target.id==="m-examount"&&modalCtx&&modalCtx.type==="expense"){renderExpReparto();}});
  modalEl.addEventListener("click",function(e){var t=e.target.closest(".dpick");if(t)openDatePicker(t);});
  enableDrag(modalEl,".cat-item",".cat-grip",function(it){return it.dataset.catid;},moveCat,"cat-dpb","cat-dpa");
  var dp={anchor:null,y:0,m:0};
  function isoOf(y,m,d){return y+"-"+String(m+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");}
  function todayIso(){var d=new Date();return isoOf(d.getFullYear(),d.getMonth(),d.getDate());}
  function openDatePicker(anchor){dp.anchor=anchor;var iso=anchor.dataset.iso||todayIso();var d=new Date(iso+"T00:00:00");if(isNaN(d))d=new Date();dp.y=d.getFullYear();dp.m=d.getMonth();var pop=document.getElementById("datepop");renderDatePop();pop.hidden=false;positionDatePop(anchor);}
  function renderDatePop(){
    var pop=document.getElementById("datepop"),y=dp.y,m=dp.m;
    var title=new Date(y,m,1).toLocaleDateString("fr-FR",{month:"long",year:"numeric"});
    var first=new Date(y,m,1).getDay(),off=first===0?6:first-1,dim=new Date(y,m+1,0).getDate(),prevMax=new Date(y,m,0).getDate();
    var total=Math.ceil((off+dim)/7)*7,sel=dp.anchor?dp.anchor.dataset.iso:"",today=todayIso(),cells="";
    for(var i=0;i<total;i++){var dd,mm,yy,out=false;
      if(i<off){dd=prevMax-off+i+1;mm=m===0?11:m-1;yy=m===0?y-1:y;out=true;}
      else if(i<off+dim){dd=i-off+1;mm=m;yy=y;}
      else{dd=i-off-dim+1;mm=m===11?0:m+1;yy=m===11?y+1:y;out=true;}
      var iso=isoOf(yy,mm,dd);
      cells+='<button type="button" class="dp-cell'+(out?" out":"")+(iso===sel?" sel":"")+(iso===today?" today":"")+'" data-dpiso="'+iso+'">'+dd+'</button>';
    }
    pop.innerHTML='<div class="dp-nav"><button type="button" class="dp-navbtn" data-dpnav="-1">‹</button><div class="dp-title">'+esc(title)+'</div><button type="button" class="dp-navbtn" data-dpnav="1">›</button></div>'
      +'<div class="dp-head"><div class="dp-hcell">L</div><div class="dp-hcell">M</div><div class="dp-hcell">M</div><div class="dp-hcell">J</div><div class="dp-hcell">V</div><div class="dp-hcell">S</div><div class="dp-hcell">D</div></div>'
      +'<div class="dp-grid">'+cells+'</div>'
      +'<div class="dp-foot"><button type="button" class="dp-today-btn" data-dptoday>Aujourd\'hui</button></div>';
  }
  function positionDatePop(anchor){var pop=document.getElementById("datepop"),r=anchor.getBoundingClientRect();var PW=300,PH=pop.offsetHeight||340,M=8,vw=window.innerWidth,vh=window.innerHeight;var top=r.bottom+M;if(top+PH+M>vh&&r.top-PH-M>=M)top=r.top-PH-M;top=Math.max(M,Math.min(top,vh-PH-M));var cx=r.left+r.width/2,half=PW/2,left=Math.max(M+half,Math.min(cx,vw-half-M));pop.style.top=top+"px";pop.style.left=left+"px";pop.style.transform="translateX(-50%)";}
  function closeDatePop(){var pop=document.getElementById("datepop");if(pop)pop.hidden=true;dp.anchor=null;}
  function pickDate(iso){if(!dp.anchor)return;dp.anchor.dataset.iso=iso;dp.anchor.textContent=frDate(iso,{day:"numeric",month:"short",year:"numeric"});var dl=document.getElementById("m-dur"),s=document.getElementById("m-start"),en=document.getElementById("m-end");if(dl&&s&&en)dl.textContent=durLabel(s.dataset.iso,en.dataset.iso);closeDatePop();}
  (function(){var pop=document.getElementById("datepop");if(!pop)return;
    pop.addEventListener("click",function(e){var t;
      if((t=e.target.closest("[data-dpnav]"))){dp.m+=parseInt(t.dataset.dpnav,10);if(dp.m<0){dp.m=11;dp.y--;}if(dp.m>11){dp.m=0;dp.y++;}renderDatePop();positionDatePop(dp.anchor);return;}
      if((t=e.target.closest("[data-dpiso]"))){pickDate(t.dataset.dpiso);return;}
      if(e.target.closest("[data-dptoday]")){pickDate(todayIso());return;}
    });
    document.addEventListener("mousedown",function(e){if(pop.hidden)return;if(!pop.contains(e.target)&&!(dp.anchor&&dp.anchor.contains(e.target)))closeDatePop();},true);
  })();

  var c=document.querySelector(".container");
  c.addEventListener("click",function(e){
    var t;
    if(e.target.closest("#trip-btn")){toggleMenu("trip-menu");return;}
    if(e.target.closest("#notes-btn")){hideMenus();openNotesModal();return;}
    if(e.target.closest("#kebab-btn")){toggleMenu("kebab-menu");return;}
    if(e.target.closest(".acct-btn")){openAccountModal();return;}
    if(e.target.closest("#cg-open-set")){openCongesSettings();return;}
    if((t=e.target.closest("[data-triparch]"))){archiveTrip(t.dataset.triparch,true);return;}
    if((t=e.target.closest("[data-tripunarch]"))){archiveTrip(t.dataset.tripunarch,false);return;}
    if(e.target.closest("#arch-toggle")){var al=document.getElementById("arch-list");if(al)al.hidden=!al.hidden;return;}
    if((t=e.target.closest("[data-tripdel]"))){delTripById(t.dataset.tripdel);return;}
    if((t=e.target.closest("[data-triplink]"))){var lt=store.trips.filter(function(x){return x.id===t.dataset.triplink;})[0];if(lt)copyLink(tripURL(lt,false));return;}
    if((t=e.target.closest("[data-tripsel]"))){switchTrip(t.dataset.tripsel);hideMenus();return;}
    if(e.target.closest("#trip-new")){addTrip();hideMenus();return;}
    if(e.target.closest("#trip-dup")){dupTrip();hideMenus();return;}
    if(e.target.closest("#btn-stats")){hideMenus();openStatsModal();return;}
    if(e.target.closest("#btn-settings")){hideMenus();openSettingsModal();return;}
    if(e.target.closest("#btn-export")){doExport();hideMenus();return;}
    if(e.target.closest("#btn-import")){hideMenus();document.getElementById("file-input").click();return;}
    if(e.target.closest("[data-padd]")){openPeriodModal(null);return;}
    if(e.target.closest("[data-personadd]")){openPersonModal(null);return;}
    if((t=e.target.closest("[data-rmperiod]"))){removePeriod(t.dataset.rmperiod);return;}
    if((t=e.target.closest("[data-rmperson]"))){removePerson(t.dataset.rmperson);return;}
    if((t=e.target.closest("[data-pedit]"))){openPeriodModal(t.dataset.pedit);return;}
    if((t=e.target.closest("[data-pedit-person]"))){openPersonModal(t.dataset.peditPerson);return;}
    if((t=e.target.closest(".mx-cell"))&&t.dataset.period){var p=period(t.dataset.period),i=p.members.indexOf(t.dataset.person);if(i>=0)p.members.splice(i,1);else p.members.push(t.dataset.person);save();renderAll();return;}
    if((t=e.target.closest("[data-del]"))){var ed=expById(t.dataset.del),el=(ed&&ed.label||"").trim();if(!confirm("Supprimer la dépense"+(el?" « "+el+" »":"")+" ?"))return;state.expenses=state.expenses.filter(function(x){return x.id!==t.dataset.del;});save();renderExpenses();renderParts();return;}
    if((t=e.target.closest("[data-state]"))){var sx=expById(t.dataset.state);if(sx){var st=((sx.paid?2:(sx.reserved?1:0))+1)%3;sx.reserved=(st>=1);sx.paid=(st===2);save();renderExpenses();renderParts();}return;}
    if((t=e.target.closest("[data-exptoggle]"))){var tex=expById(t.dataset.exptoggle);if(tex){tex.people=tex.people||[];var nm=t.dataset.name,ix=tex.people.indexOf(nm);if(ix>=0)tex.people.splice(ix,1);else tex.people.push(nm);save();renderExpenses();renderParts();}return;}
    if((t=e.target.closest("[data-pertoggle]"))){var rex=expById(t.dataset.pertoggle);if(rex){rex.periods=rex.periods||[];var pid=t.dataset.pid,pix=rex.periods.indexOf(pid);if(pix>=0)rex.periods.splice(pix,1);else rex.periods.push(pid);save();renderExpenses();renderParts();}return;}
    if((t=e.target.closest("[data-basisset]"))){var sex=expById(t.dataset.basisset);if(sex){sex.basis=t.dataset.val;save();renderExpenses();renderParts();}return;}
    if((t=e.target.closest("[data-cmt]"))){openCommentModal(t.dataset.cmt);return;}
    if((t=e.target.closest("[data-edit]"))){openExpenseModal(t.dataset.edit);return;}
    if(e.target.closest("#ex-add-btn")){openExpenseModal();return;}
  });
  c.addEventListener("change",function(e){
    var x=e.target.closest("[data-exp]");
    if(x){var ex=expById(x.dataset.exp);if(!ex)return;var f=x.dataset.field;
      if(f==="scope"){ex.scope=e.target.value;
        if(ex.scope==="sejour"){if(!ex.periods||!ex.periods.length)ex.periods=state.periods.map(function(p){return p.id;});if(!ex.basis)ex.basis="nights";}
        if(ex.scope==="custom"&&(!ex.people||!ex.people.length))ex.people=state.people.slice();
        save();renderExpenses();renderParts();return;}
      if(f==="basis"){ex.basis=e.target.value;save();renderParts();return;}
      if(f==="person"){ex.person=e.target.value;save();renderExpenses();renderParts();return;}
      return;}
    var d=e.target.closest("[data-period][data-field]");
    if(d){var p=period(d.dataset.period);p[d.dataset.field]=e.target.value;save();renderAll();return;}
    if(e.target.id==="file-input"){doImport(e.target.files[0]);return;}
    if(e.target.id==="cg-file-input"){cgDoImport(e.target.files[0]);return;}
  });
  c.addEventListener("input",function(e){
    if(e.target.id==="trip-name"){state.tripName=e.target.value;save();renderTripSwitch();return;}
    var x=e.target.closest("[data-exp]");
    if(x){var ex=expById(x.dataset.exp);if(!ex)return;var f=x.dataset.field;
      if(f==="label"){ex.label=e.target.value;save();renderParts();return;}
      if(f==="amount"){ex.amount=parseFloat(e.target.value)||0;save();renderParts();var pc=document.querySelector('.exp-item[data-id="'+ex.id+'"] .exp-part');if(pc)pc.outerHTML=expPart(ex);return;}
      return;}
    var n=e.target.closest("[data-name]");
    if(n){var p=period(n.dataset.name);p.name=e.target.value;save();renderParts();return;}
  });

  /* Glisser-déposer souris + tactile (iOS) via Pointer Events */
  function enableDrag(container,itemSel,handleSel,getId,onDrop,mBefore,mAfter){
    if(!container)return;
    var src=null,srcId=null,started=false,sy=0;
    function clear(){var r=container.querySelectorAll("."+mBefore+",."+mAfter);for(var i=0;i<r.length;i++)r[i].classList.remove(mBefore,mAfter);}
    container.addEventListener("pointerdown",function(e){
      if(e.pointerType==="mouse"&&e.button!==0)return;
      if(!e.target.closest(handleSel))return;
      var it=e.target.closest(itemSel);if(!it)return;
      src=it;srcId=getId(it);started=false;sy=e.clientY;
      try{e.target.setPointerCapture(e.pointerId);}catch(_){}
      e.preventDefault();
    });
    container.addEventListener("pointermove",function(e){
      if(!src)return;
      if(!started){if(Math.abs(e.clientY-sy)<6)return;started=true;src.classList.add("dragging");}
      e.preventDefault();
      var el=document.elementFromPoint(e.clientX,e.clientY);
      var tg=el&&el.closest?el.closest(itemSel):null;
      clear();
      if(tg&&tg!==src){var r=tg.getBoundingClientRect();tg.classList.add((e.clientY-r.top)>r.height/2?mAfter:mBefore);}
    });
    function end(){
      if(!src)return;
      if(started){
        var m=container.querySelector("."+mBefore+",."+mAfter),tg=null,after=false;
        if(m){tg=m;after=m.classList.contains(mAfter);}
        clear();src.classList.remove("dragging");
        if(tg&&tg!==src)onDrop(srcId,getId(tg),after);
      }
      src=null;srcId=null;started=false;
    }
    container.addEventListener("pointerup",end);
    container.addEventListener("pointercancel",end);
  }
  enableDrag(document.getElementById("expenses"),".exp-item",".drag-handle",function(it){return it.dataset.id;},moveExpense,"drop-before","drop-after");
  enableDrag(document.getElementById("matrix"),"tr.mx-pr",".mx-grip",function(it){return it.dataset.prow;},movePerson,"mx-drop-before","mx-drop-after");
  var peopleEl=document.getElementById("parts");
  peopleEl.addEventListener("keydown",function(e){if(e.target.id==="person-input"&&e.key==="Enter")addPerson();});

  function doExport(){
    var blob=new Blob([JSON.stringify(store,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="budget-vacances-sauvegarde.json";
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);toast("Sauvegarde exportée");
  }
  function doImport(file){
    if(!file)return;var r=new FileReader();
    r.onload=function(){
      try{
        var s=JSON.parse(r.result);
        if(!((s&&s.trips&&s.trips.length)||(s&&s.people))){alert("Fichier invalide.");return;}
        if(!confirm("Importer cette sauvegarde ? Cela remplacera tous tes voyages actuels.")){document.getElementById("file-input").value="";return;}
        if(s.trips&&s.trips.length){
          s.trips.forEach(function(t){if(!t.id)t.id=uid();if(!t.colors)t.colors={};});
          if(!s.activeId||!s.trips.some(function(t){return t.id===s.activeId;}))s.activeId=s.trips[0].id;
          store=s;
        }else{
          if(!s.id)s.id=uid();if(!s.seqP)s.seqP=(s.periods?s.periods.length:0)+1;if(!s.seqE)s.seqE=(s.expenses?s.expenses.length:0)+1;if(!s.colors)s.colors={};
          store={trips:[s],activeId:s.id};
        }
        migrate(store);
        state=activeTrip();save();renderTripSwitch();renderAll();toast("Sauvegarde importée");
      }catch(err){alert("Lecture impossible.");}
    };
    r.readAsText(file);document.getElementById("file-input").value="";
  }
  function cgDoExport(){
    var data={app:"vacances-conges",version:1,exportedAt:new Date().toISOString(),conges:ensureConges()};
    var blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="conges-sauvegarde.json";
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);toast("Congés exportés");
  }
  function cgDoImport(file){
    var fi=document.getElementById("cg-file-input");
    if(!file){if(fi)fi.value="";return;}
    var r=new FileReader();
    r.onload=function(){
      try{
        var s=JSON.parse(r.result),d=(s&&s.conges)?s.conges:s;
        if(!d||typeof d!=="object"||!Array.isArray(d.types)||!d.types.length){alert("Fichier de congés invalide.");if(fi)fi.value="";return;}
        if(!confirm("Importer cette sauvegarde ? Cela remplacera tous tes congés actuels.")){if(fi)fi.value="";return;}
        congesData=d;ensureConges();saveConges();renderConges();
        if(document.getElementById("cg-settings"))renderCongesSettings();
        toast("Congés importés");
      }catch(err){alert("Lecture impossible.");}
      if(fi)fi.value="";
    };
    r.readAsText(file);
  }

  document.addEventListener("click",function(e){
    if(!e.target.closest(".trip-switch")){var a=document.getElementById("trip-menu");if(a)a.hidden=true;}
    if(!e.target.closest(".kebab-wrap")){var b=document.getElementById("kebab-menu");if(b)b.hidden=true;var cg=document.getElementById("cg-kebab-menu");if(cg)cg.hidden=true;}
    if(!e.target.closest(".cg-yearsel")){var yop=document.getElementById("cg-year-pop");if(yop)yop.hidden=true;}
  });
  document.addEventListener("mousedown",function(e){if(e.target.closest(".rt-btn"))e.preventDefault();});
  document.addEventListener("click",function(e){
    var b=e.target.closest(".rt-btn");if(!b)return;
    var cmd=b.dataset.cmd;
    if(cmd==="link"){var u=prompt("Lien (URL) :","https://");if(u)try{document.execCommand("createLink",false,u);}catch(_){}}
    else if(cmd==="h3"){var cur="";try{cur=(document.queryCommandValue("formatBlock")||"").toLowerCase();}catch(_){}try{document.execCommand("formatBlock",false,cur==="h3"?"<p>":"<h3>");}catch(_){}}
    else if(cmd==="color"){try{document.execCommand("styleWithCSS",false,true);}catch(_){}try{document.execCommand("foreColor",false,b.dataset.color);}catch(_){}}
    else if(cmd==="removeFormat"){try{document.execCommand("removeFormat",false,null);}catch(_){}try{document.execCommand("formatBlock",false,"<p>");}catch(_){}}
    else try{document.execCommand(cmd,false,null);}catch(_){}
    var area=b.closest(".rt").querySelector(".rt-area");
    if(area)area.focus();
  });
  