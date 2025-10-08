(function () {
  "use strict";

  /* ===== Helpers ===== */
  function colIndexFromLetter(L){var n=0,i;for(i=0;i<L.length;i++)n=n*26+(L.charCodeAt(i)-64);return n-1;}
  function niceNum(n){if(n==null)return"—";return n>=1e6?(n/1e6).toFixed(2)+"M":n>=1e3?(n/1e3).toFixed(1)+"k":Number(n).toLocaleString();}
  function fetchCSV(url){
    return fetch(url,{mode:"cors",cache:"no-store"}).then(function(r){if(!r.ok)throw 0;return r.text();})
    .catch(function(){var proxy="https://r.jina.ai/http/"+url.replace(/^https?:\/\//,"");return fetch(proxy,{cache:"no-store"}).then(function(r2){if(!r2.ok)throw new Error("proxy");return r2.text();});});
  }

  /* ===== Tile 1: Akses ===== */
  var CSV1="https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1057141723&single=true&output=csv";
  var MAP=[{name:"Kota Setar",col:"C"},{name:"Pendang",col:"D"},{name:"Kuala Muda",col:"E"},{name:"Sik",col:"F"},{name:"Kulim",col:"G"},{name:"Bandar Baru",col:"H"},{name:"Kubang Pasu",col:"I"},{name:"Padang Terap",col:"J"},{name:"Baling",col:"K"},{name:"Yan",col:"L"},{name:"Langkawi",col:"M"},{name:"Kedah",col:"N"}];

  function cleanPop(x){if(x==null)return null;var s=String(x).replace(/\u00A0/g,"").replace(/[\s,]/g,"").trim();var v=Number(s);return isNaN(v)?null:v;}
  function cleanPct(x){if(x==null)return null;var s=String(x).replace(/\u00A0/g,"").trim();var had=s.indexOf("%")>-1;s=s.replace(/[%\s]/g,"").replace(/,/g,".");var p=s.split(".");if(p.length>2)s=p[0]+"."+p.slice(1).join("");var v=Number(s);if(isNaN(v))return null;if(!had&&v>0&&v<=1)v=v*100;return +v.toFixed(2);}

  var RAW1=null,CHART1=null;
  function padEnds(labels,series){
    var s=[0],i,l=[""];for(i=0;i<series.length;i++)s.push(series[i]==null?0:series[i]);s.push(0);
    for(i=0;i<labels.length;i++)l.push(labels[i]);l.push("");return {labels:l,series:s};
  }
  function xTickCallbackAll(X){
    return function(v,i){
      if(i===0||i===X.length-1)return"";
      var step=(window.innerWidth<560)?3:2;
      return (i%step===0)?X[i]:"";
    };
  }
  function draw1(rows, ctxId, dense){
    var L=[],A=[],P=[],i;for(i=0;i<rows.length;i++){L.push(rows[i].name);A.push(rows[i].access||0);P.push(rows[i].population||0);}
    var pA=padEnds(L,A),pP=padEnds(L,P),X=pA.labels;
    var ctx=document.getElementById(ctxId).getContext("2d");
    var g1=ctx.createLinearGradient(0,0,0,520);g1.addColorStop(0,"rgba(245,158,11,0.45)");g1.addColorStop(1,"rgba(245,158,11,0.02)");
    var g2=ctx.createLinearGradient(0,0,0,520);g2.addColorStop(0,"rgba(99,102,241,0.45)");g2.addColorStop(1,"rgba(99,102,241,0.02)");
    if(CHART1 && ctxId==="infogChart"){CHART1.destroy();}
    var chart = new Chart(ctx,{type:"line",
      data:{labels:X,datasets:[
        {label:"% Menerima Perkhidmatan",data:pA.series,borderColor:"#f59e0b",backgroundColor:g1,borderWidth:3,tension:.45,fill:true,spanGaps:true,
         pointRadius:function(c){return(c.dataIndex===0||c.dataIndex===X.length-1)?0:4;},pointHoverRadius:function(c){return(c.dataIndex===0||c.dataIndex===X.length-1)?0:6;},yAxisID:"y1"},
        {label:"Anggaran Penduduk",data:pP.series,borderColor:"#6366f1",backgroundColor:g2,borderWidth:3,tension:.45,fill:true,spanGaps:true,
         pointRadius:function(c){return(c.dataIndex===0||c.dataIndex===X.length-1)?0:4;},pointHoverRadius:function(c){return(c.dataIndex===0||c.dataIndex===X.length-1)?0:6;},yAxisID:"y2"}
      ]},
      options:{
        responsive:true,maintainAspectRatio:false,layout:{padding:{bottom:16}},
        plugins:{legend:{display:false},tooltip:{mode:"index",intersect:false,
          filter:function(i){return !(i.dataIndex===0||i.dataIndex===X.length-1);},
          callbacks:{label:function(c){return c.datasetIndex===0?" Akses: "+(c.parsed.y||0)+"%":" Populasi: "+niceNum(c.parsed.y);}}
        }},
        scales:{
          x:{grid:{display:false},ticks:{
            autoSkip:false,maxRotation: dense?40:40,minRotation: dense?40:40,
            callback: dense?function(v,i){if(i===0||i===X.length-1)return"";return X[i];}:xTickCallbackAll(X)
          }},
          y1:{position:"left",beginAtZero:true,grid:{color:"rgba(15,23,42,.06)"},ticks:{callback:function(v){return v+"%";}}},
          y2:{position:"right",beginAtZero:true,grid:{display:false},ticks:{callback:function(v){return niceNum(v);}}}
        }
      }
    });
    if(ctxId==="infogChart"){CHART1=chart;}
    return chart;
  }
  function compute1(){
    if(!RAW1)return[];
    var popR=RAW1[9]||[],accR=RAW1[10]||[],out=[],i,idx,pop,acc;
    for(i=0;i<MAP.length;i++){
      idx=colIndexFromLetter(MAP[i].col);pop=cleanPop(popR[idx]);acc=cleanPct(accR[idx]);
      if(acc===null&&String(accR[idx]||"").trim()==="0")acc=0;
      out.push({name:MAP[i].name,population:pop,access:acc});
    }
    return out;
  }
  function load1(){
    var e=document.getElementById("err");e.style.display="none";e.textContent="";
    fetchCSV(CSV1).then(function(csv){
      RAW1=Papa.parse(csv,{header:false,skipEmptyLines:true}).data;
      draw1(compute1(),"infogChart",false);
      document.getElementById("lastUpdated").textContent="Dikemas kini: "+new Date().toLocaleString();
    }).catch(function(err){console.error(err);e.style.display="block";e.textContent="Gagal memuatkan data CSV (Tile 1).";});
  }
  document.getElementById("refreshBtn").addEventListener("click",load1);
  load1();

  /* ===== Tile 2: Pesakit Primer ===== */
  var CSV2="https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1808391684&single=true&output=csv";
  var DIST=[{name:"Kota Setar",col:"D"},{name:"Pendang",col:"E"},{name:"Kuala Muda",col:"F"},{name:"Sik",col:"G"},{name:"Kulim",col:"H"},{name:"Bandar Baru",col:"I"},{name:"Kubang Pasu",col:"J"},{name:"Padang Terap",col:"K"},{name:"Baling",col:"L"},{name:"Yan",col:"M"},{name:"Langkawi",col:"N"},{name:"Kedah",col:"O"}];
  var CATS=[{key:"<5 tahun",b:[8,10],u:[9,11]},{key:"5-6 tahun",b:[12],u:[13]},{key:"7-12 tahun",b:[14,16],u:[15,17]},{key:"13-17 tahun",b:[18,20],u:[19,21]},{key:"18-59 tahun",b:[22,24,26,28],u:[23,25,27,29]},{key:"<60 tahun",b:[30],u:[31]},{key:"Ibu mengandung",b:[34],u:[35]},{key:"OKU",b:[36],u:[37]},{key:"Bukan warganegara",b:[38],u:[39]}];
  var CAT_COLOR={"<5 tahun":"#0ea5e9","5-6 tahun":"#4f46e5","7-12 tahun":"#10b981","13-17 tahun":"#ef4444","18-59 tahun":"#8b5cf6","<60 tahun":"#14b8a6","Ibu mengandung":"#f59e0b","OKU":"#22c55e","Bukan warganegara":"#a855f7"};

  function cleanInt(x){if(x==null)return 0;var s=String(x).replace(/\u00A0/g,"").trim();s=s.replace(/[%\s]/g,"").replace(/,/g,"");var v=Number(s);return isNaN(v)?0:v;}
  function cell(arr,addr){var m=/^([A-Z]+)(\d+)$/.exec(addr);if(!m)return 0;var col=m[1],row=parseInt(m[2],10);var r=row-1,c=colIndexFromLetter(col);return cleanInt((arr[r]||[])[c]);}
  function sumCells(arr,letter,rows){var t=0,i;for(i=0;i<rows.length;i++)t+=cell(arr,letter+String(rows[i]));return t;}

  var RAW2=null,CHART2=null;

  function renderDropdown(){
    var menu=document.getElementById("ddMenu");var footer=menu.querySelector(".dd-footer");if(menu.querySelector(".dd-row"))return;
    var frag=document.createDocumentFragment(),i,lab;
    for(i=0;i<CATS.length;i++){lab=document.createElement("label");lab.className="dd-row";lab.innerHTML='<input type="checkbox" data-key="'+CATS[i].key+'" '+(i===0?'checked':'')+'> '+CATS[i].key;frag.appendChild(lab);}
    menu.insertBefore(frag,footer);
  }
  function selectedKeys(){
    var k=new Set(),boxes=document.querySelectorAll("#ddMenu input[type=checkbox]"),i;for(i=0;i<boxes.length;i++)if(boxes[i].checked)k.add(boxes[i].getAttribute("data-key"));
    if(k.size===0)k.add("<5 tahun");return k;
  }
  function updateTagsAndLegend(){
    var tags=document.getElementById("selectedTags");tags.innerHTML="";
    var ks=Array.from(selectedKeys()),legend=document.getElementById("legend2"),i,t,item,dot,txt;legend.innerHTML="";
    for(i=0;i<ks.length;i++){
      t=document.createElement("span");t.className="tag";t.textContent=ks[i];tags.appendChild(t);
      item=document.createElement("div");item.style.display="flex";item.style.alignItems="center";item.style.gap="8px";
      dot=document.createElement("span");dot.className="dot";dot.style.background=CAT_COLOR[ks[i]]||"#64748b";
      txt=document.createElement("span");txt.textContent=ks[i];item.appendChild(dot);item.appendChild(txt);legend.appendChild(item);
    }
  }
  function computePerCat(arr,keys){
    var out=[],labels=[""],d,c,cat,baru,ulang,col,d2;for(d=0;d<DIST.length;d++)labels.push(DIST[d].name);labels.push("");
    for(c=0;c<CATS.length;c++){
      cat=CATS[c];if(!keys.has(cat.key))continue;baru=[];ulang=[];
      for(d2=0;d2<DIST.length;d2++){col=DIST[d2].col;baru.push(sumCells(arr,col,cat.b));ulang.push(sumCells(arr,col,cat.u));}
      baru=[0].concat(baru).concat([0]);ulang=[0].concat(ulang).concat([0]);
      out.push({key:cat.key,baru:baru,ulangan:ulang});
    }
    return {labels:labels,perCat:out};
  }
  function draw2(data,showB,showU, ctxId, dense){
    var ctx=document.getElementById(ctxId).getContext("2d");if(CHART2 && ctxId==="chartPrimer")CHART2.destroy();
    var sets=[],i,cat,color;
    for(i=0;i<data.perCat.length;i++){
      cat=data.perCat[i];color=CAT_COLOR[cat.key]||"#64748b";
      if(showB)sets.push({label:cat.key+" • Baru",data:cat.baru,borderColor:color,backgroundColor:"transparent",borderWidth:3,tension:.45,fill:false,borderDash:[],pointRadius:function(c){return(c.dataIndex===0||c.dataIndex===data.labels.length-1)?0:3;},pointHoverRadius:5});
      if(showU)sets.push({label:cat.key+" • Ulangan",data:cat.ulangan,borderColor:color,backgroundColor:"transparent",borderWidth:3,tension:.45,fill:false,borderDash:[6,4],pointRadius:function(c){return(c.dataIndex===0||c.dataIndex===data.labels.length-1)?0:3;},pointHoverRadius:5});
    }
    var chart=new Chart(ctx,{type:"line",data:{labels:data.labels,datasets:sets},options:{
      responsive:true,maintainAspectRatio:false,layout:{padding:{bottom:16}},
      plugins:{legend:{display:false},tooltip:{mode:"index",intersect:false,filter:function(i){return !(i.dataIndex===0||i.dataIndex===data.labels.length-1);}}},
      scales:{
        x:{grid:{display:false},ticks:{
          autoSkip:false,maxRotation:40,minRotation:40,
          callback: dense?function(v,i){if(i===0||i===data.labels.length-1)return"";return data.labels[i];}
                           :function(v,i){if(i===0||i===data.labels.length-1)return"";var step=(window.innerWidth<560)?3:2;return (i%step===0)?data.labels[i]:"";}
        }},
        y:{beginAtZero:true,grid:{color:"rgba(15,23,42,.06)"},ticks:{callback:function(v){return Number(v).toLocaleString();}}}
      }
    }});
    if(ctxId==="chartPrimer")CHART2=chart;
    return chart;
  }
  function load2(){
    var e=document.getElementById("err2");e.style.display="none";e.textContent="";
    renderDropdown();updateTagsAndLegend();
    fetchCSV(CSV2).then(function(csv){
      RAW2=Papa.parse(csv,{header:false,skipEmptyLines:true}).data;
      var data=computePerCat(RAW2,selectedKeys());
      draw2(data,document.getElementById("chkBaru").checked,document.getElementById("chkUlangan").checked,"chartPrimer",false);

      // dropdown bindings
      var ddBtn=document.getElementById("ddBtn"),ddMenu=document.getElementById("ddMenu");
      ddBtn.onclick=function(){ddMenu.classList.toggle("open");};
      document.getElementById("btnClose").onclick=function(){ddMenu.classList.remove("open");};
      document.getElementById("btnAll").onclick=function(){
        ddMenu.querySelectorAll("input[type=checkbox]").forEach(function(i){i.checked=true;});
        updateTagsAndLegend();var d=computePerCat(RAW2,selectedKeys());
        draw2(d,document.getElementById("chkBaru").checked,document.getElementById("chkUlangan").checked,"chartPrimer",false);
      };
      document.getElementById("btnNone").onclick=function(){
        ddMenu.querySelectorAll("input[type=checkbox]").forEach(function(i){i.checked=false;});
        updateTagsAndLegend();var d2=computePerCat(RAW2,selectedKeys());
        draw2(d2,document.getElementById("chkBaru").checked,document.getElementById("chkUlangan").checked,"chartPrimer",false);
      };
      ddMenu.querySelectorAll("input[type=checkbox>").forEach(function(i){
        i.addEventListener("change",function(){
          updateTagsAndLegend();var d3=computePerCat(RAW2,selectedKeys());
          draw2(d3,document.getElementById("chkBaru").checked,document.getElementById("chkUlangan").checked,"chartPrimer",false);
        });
      });
      document.addEventListener("click",function(ev){var box=document.getElementById("ddBox");if(!box.contains(ev.target))ddMenu.classList.remove("open");});

      // baru/ulangan toggles
      document.getElementById("chkBaru").addEventListener("change",function(){var d4=computePerCat(RAW2,selectedKeys());draw2(d4,this.checked,document.getElementById("chkUlangan").checked,"chartPrimer",false);});
      document.getElementById("chkUlangan").addEventListener("change",function(){var d5=computePerCat(RAW2,selectedKeys());draw2(d5,document.getElementById("chkBaru").checked,this.checked,"chartPrimer",false);});

      document.getElementById("lastUpdated2").textContent="Dikemas kini: "+new Date().toLocaleString();
    }).catch(function(err){console.error(err);e.style.display="block";e.textContent="Gagal memuatkan CSV (Tile 2).";});
  }
  document.getElementById("refreshBtn2").addEventListener("click",load2);
  load2();

  /* ===== Modal (Zoom) ===== */
  var modal=document.getElementById("modal");
  var modalTitle=document.getElementById("modalTitle");
  var modalClose=document.getElementById("modalClose");
  var MODAL_CHART=null;

  function openModal(title){modalTitle.textContent=title;modal.classList.add("open");}
  function closeModal(){if(MODAL_CHART){MODAL_CHART.destroy();MODAL_CHART=null;}modal.classList.remove("open");}
  modalClose.addEventListener("click",closeModal);
  modal.addEventListener("click",function(e){if(e.target===modal)closeModal();});

  document.getElementById("zoom1").addEventListener("click",function(){
    openModal("Akses Kepada Perkhidmatan Kesihatan Pergigian");
    if(!RAW1){return;} MODAL_CHART=draw1(compute1(),"modalChart",true);
  });
  document.getElementById("zoom2").addEventListener("click",function(){
    openModal("Jumlah Kedatangan Baru & Ulangan Mengikut Kumpulan");
    if(!RAW2){return;} var data=computePerCat(RAW2,selectedKeys());
    MODAL_CHART=draw2(data,document.getElementById("chkBaru").checked,document.getElementById("chkUlangan").checked,"modalChart",true);
  });

  window.addEventListener("resize",function(){
    if(RAW1){draw1(compute1(),"infogChart",false);}
    if(RAW2){var data=computePerCat(RAW2,selectedKeys());
      draw2(data,document.getElementById("chkBaru").checked,document.getElementById("chkUlangan").checked,"chartPrimer",false);}
  });
}());
