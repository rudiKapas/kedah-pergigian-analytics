(function () {
  "use strict";

  /* ---------- helpers ---------- */
  function colIndexFromLetter(L){var n=0,i;for(i=0;i<L.length;i++)n=n*26+(L.charCodeAt(i)-64);return n-1;}
  function niceNum(n){if(n==null)return"—";return n>=1e6?(n/1e6).toFixed(2)+"M":n>=1e3?(n/1e3).toFixed(1)+"k":Number(n).toLocaleString();}

  async function fetchCSV(url){
    try{
      const r = await fetch(url,{mode:"cors",cache:"no-store"});
      if(!r.ok) throw new Error("HTTP "+r.status);
      return await r.text();
    }catch(e){
      // CORS-safe proxy fallback
      const proxy = "https://r.jina.ai/http/" + url.replace(/^https?:\/\//,"");
      const r2 = await fetch(proxy,{cache:"no-store"});
      if(!r2.ok) throw new Error("Proxy HTTP "+r2.status);
      return await r2.text();
    }
  }

  /* ---------- TILE 1: AKSES ---------- */
  const CSV1="https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1057141723&single=true&output=csv";
  const MAP=[{name:"Kota Setar",col:"C"},{name:"Pendang",col:"D"},{name:"Kuala Muda",col:"E"},{name:"Sik",col:"F"},{name:"Kulim",col:"G"},{name:"Bandar Baru",col:"H"},{name:"Kubang Pasu",col:"I"},{name:"Padang Terap",col:"J"},{name:"Baling",col:"K"},{name:"Yan",col:"L"},{name:"Langkawi",col:"M"},{name:"Kedah",col:"N"}];

  function cleanPop(x){if(x==null)return null;var s=String(x).replace(/\u00A0/g,"").replace(/[\s,]/g,"").trim();var v=Number(s);return isNaN(v)?null:v;}
  function cleanPct(x){if(x==null)return null;var s=String(x).replace(/\u00A0/g,"").trim();var had=s.includes("%");s=s.replace(/[%\s]/g,"").replace(/,/g,".");var p=s.split(".");if(p.length>2)s=p[0]+"."+p.slice(1).join("");var v=Number(s);if(isNaN(v))return null;if(!had&&v>0&&v<=1)v=v*100;return +v.toFixed(2);}

  let RAW1=null, CHART1=null;

  function padEnds(labels,series){
    const s=[0,...series.map(v=>v??0),0];
    const l=["",...labels,""];
    return {labels:l,series:s};
  }
  function xTickCallbackAll(X){
    return (v,i)=> (i===0||i===X.length-1) ? "" : ((window.innerWidth<560? (i%3===0):(i%2===0)) ? X[i] : "");
  }
  function draw1(rows, ctxId, dense){
    const L = rows.map(r=>r.name);
    const A = rows.map(r=>r.access ?? 0);
    const P = rows.map(r=>r.population ?? 0);
    const pA = padEnds(L,A), pP = padEnds(L,P), X = pA.labels;

    const ctx=document.getElementById(ctxId).getContext("2d");
    const g1=ctx.createLinearGradient(0,0,0,520); g1.addColorStop(0,"rgba(245,158,11,0.45)"); g1.addColorStop(1,"rgba(245,158,11,0.02)");
    const g2=ctx.createLinearGradient(0,0,0,520); g2.addColorStop(0,"rgba(99,102,241,0.45)"); g2.addColorStop(1,"rgba(99,102,241,0.02)");

    if(CHART1 && ctxId==="infogChart") CHART1.destroy();
    const chart = new Chart(ctx,{
      type:"line",
      data:{labels:X,datasets:[
        {label:"% Menerima Perkhidmatan",data:pA.series,borderColor:"#f59e0b",backgroundColor:g1,borderWidth:3,tension:.45,fill:true,spanGaps:true,
          pointRadius:c=> (c.dataIndex===0||c.dataIndex===X.length-1)?0:4, pointHoverRadius:c=> (c.dataIndex===0||c.dataIndex===X.length-1)?0:6, yAxisID:"y1"},
        {label:"Anggaran Penduduk",data:pP.series,borderColor:"#6366f1",backgroundColor:g2,borderWidth:3,tension:.45,fill:true,spanGaps:true,
          pointRadius:c=> (c.dataIndex===0||c.dataIndex===X.length-1)?0:4, pointHoverRadius:c=> (c.dataIndex===0||c.dataIndex===X.length-1)?0:6, yAxisID:"y2"},
      ]},
      options:{
        responsive:true,maintainAspectRatio:false,layout:{padding:{bottom:16}},
        plugins:{legend:{display:false},tooltip:{mode:"index",intersect:false,
          filter:i=> !(i.dataIndex===0||i.dataIndex===X.length-1),
          callbacks:{label:c=> c.datasetIndex===0 ? ` Akses: ${c.parsed.y||0}%` : ` Populasi: ${niceNum(c.parsed.y)}`}}},
        scales:{
          x:{grid:{display:false},ticks:{autoSkip:false,maxRotation:40,minRotation:40,
            callback: dense ? ((v,i)=> (i===0||i===X.length-1) ? "" : X[i]) : xTickCallbackAll(X)}},
          y1:{position:"left",beginAtZero:true,grid:{color:"rgba(15,23,42,.06)"},ticks:{callback:v=>v+"%"}},
          y2:{position:"right",beginAtZero:true,grid:{display:false},ticks:{callback:v=>niceNum(v)}}
        }
      }
    });
    if(ctxId==="infogChart") CHART1=chart;
    return chart;
  }
  function compute1(){
    if(!RAW1) return [];
    const popR=RAW1[9]||[], accR=RAW1[10]||[];
    return MAP.map(m=>{
      const i=colIndexFromLetter(m.col);
      let access = cleanPct(accR[i]);
      if(access===null && String(accR[i]||"").trim()==="0") access=0;
      return {name:m.name, population:cleanPop(popR[i]), access};
    });
  }
  async function load1(){
    const err=document.getElementById("err"); err.style.display="none"; err.textContent="";
    try{
      const csv = await fetchCSV(CSV1);
      RAW1 = Papa.parse(csv,{header:false,skipEmptyLines:true}).data;
      draw1(compute1(),"infogChart",false);
      document.getElementById("lastUpdated").textContent="Dikemas kini: "+new Date().toLocaleString();
    }catch(e){
      console.error("Tile 1 CSV error:", e);
      err.style.display='block';
      err.textContent="Gagal memuatkan data CSV (Tile 1).";
    }
  }
  document.getElementById("refreshBtn").addEventListener("click",load1);
  load1();

  /* ---------- TILE 2: PESAKIT PRIMER ---------- */
  const CSV2="https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1808391684&single=true&output=csv";
  const DIST=[{name:"Kota Setar",col:"D"},{name:"Pendang",col:"E"},{name:"Kuala Muda",col:"F"},{name:"Sik",col:"G"},{name:"Kulim",col:"H"},{name:"Bandar Baru",col:"I"},{name:"Kubang Pasu",col:"J"},{name:"Padang Terap",col:"K"},{name:"Baling",col:"L"},{name:"Yan",col:"M"},{name:"Langkawi",col:"N"},{name:"Kedah",col:"O"}];
  const CATS=[{key:"<5 tahun",b:[8,10],u:[9,11]},{key:"5-6 tahun",b:[12],u:[13]},{key:"7-12 tahun",b:[14,16],u:[15,17]},{key:"13-17 tahun",b:[18,20],u:[19,21]},{key:"18-59 tahun",b:[22,24,26,28],u:[23,25,27,29]},{key:"<60 tahun",b:[30],u:[31]},{key:"Ibu mengandung",b:[34],u:[35]},{key:"OKU",b:[36],u:[37]},{key:"Bukan warganegara",b:[38],u:[39]}];
  const CAT_COLOR={"<5 tahun":"#0ea5e9","5-6 tahun":"#4f46e5","7-12 tahun":"#10b981","13-17 tahun":"#ef4444","18-59 tahun":"#8b5cf6","<60 tahun":"#14b8a6","Ibu mengandung":"#f59e0b","OKU":"#22c55e","Bukan warganegara":"#a855f7"};

  function cleanInt(x){if(x==null)return 0;var s=String(x).replace(/\u00A0/g,"").trim();s=s.replace(/[%\s]/g,"").replace(/,/g,"");var v=Number(s);return isNaN(v)?0:v;}
  function cell(arr,addr){var m=/^([A-Z]+)(\d+)$/.exec(addr);if(!m)return 0;var col=m[1],row=parseInt(m[2],10);var r=row-1,c=colIndexFromLetter(col);return cleanInt((arr[r]||[])[c]);}
  function sumCells(arr,letter,rows){return rows.reduce((t,r)=>t+cell(arr,letter+String(r)),0);}

  let RAW2=null, CHART2=null;

  function ensureDropdown(){
    const menu=document.getElementById("ddMenu");
    if(menu.querySelector(".dd-row")) return;
    const footer=menu.querySelector(".dd-footer");
    const frag=document.createDocumentFragment();
    CATS.forEach((c,idx)=>{
      const lab=document.createElement("label");
      lab.className="dd-row";
      lab.innerHTML=`<input type="checkbox" data-key="${c.key}" ${idx===0?'checked':''}> ${c.key}`;
      frag.appendChild(lab);
    });
    menu.insertBefore(frag,footer);
  }
  function selectedKeys(){
    const ks=new Set();
    document.querySelectorAll("#ddMenu input[type=checkbox]").forEach(i=>{if(i.checked) ks.add(i.getAttribute("data-key"));});
    if(ks.size===0) ks.add("<5 tahun");
    return ks;
  }
  function updateTagsAndLegend(){
    const tags=document.getElementById("selectedTags"); tags.innerHTML="";
    const legend=document.getElementById("legend2"); legend.innerHTML="";
    Array.from(selectedKeys()).forEach(k=>{
      const t=document.createElement("span"); t.className="tag"; t.textContent=k; tags.appendChild(t);
      const item=document.createElement("div"); item.style.display="flex"; item.style.alignItems="center"; item.style.gap="8px";
      const dot=document.createElement("span"); dot.className="dot"; dot.style.background=CAT_COLOR[k]||"#64748b";
      const txt=document.createElement("span"); txt.textContent=k;
      item.append(dot,txt); legend.appendChild(item);
    });
  }
  function computePerCat(arr,keys){
    const labels=["",...DIST.map(d=>d.name),""];
    const perCat=[];
    CATS.forEach(cat=>{
      if(!keys.has(cat.key)) return;
      const baru = [0], ulangan=[0];
      DIST.forEach(d=>{
        baru.push(sumCells(arr,d.col,cat.b));
        ulangan.push(sumCells(arr,d.col,cat.u));
      });
      baru.push(0); ulangan.push(0);
      perCat.push({key:cat.key,baru,ulangan});
    });
    return {labels,perCat};
  }
  function draw2(data,showB,showU, ctxId, dense){
    const ctx=document.getElementById(ctxId).getContext("2d");
    if(CHART2 && ctxId==="chartPrimer") CHART2.destroy();
    const sets=[];
    data.perCat.forEach(cat=>{
      const color=CAT_COLOR[cat.key]||"#64748b";
      if(showB) sets.push({label:cat.key+" • Baru",data:cat.baru,borderColor:color,backgroundColor:"transparent",borderWidth:3,tension:.45,fill:false,borderDash:[],pointRadius:c=> (c.dataIndex===0||c.dataIndex===data.labels.length-1)?0:3,pointHoverRadius:5});
      if(showU) sets.push({label:cat.key+" • Ulangan",data:cat.ulangan,borderColor:color,backgroundColor:"transparent",borderWidth:3,tension:.45,fill:false,borderDash:[6,4],pointRadius:c=> (c.dataIndex===0||c.dataIndex===data.labels.length-1)?0:3,pointHoverRadius:5});
    });
    const chart=new Chart(ctx,{type:"line",data:{labels:data.labels,datasets:sets},options:{
      responsive:true,maintainAspectRatio:false,layout:{padding:{bottom:16}},
      plugins:{legend:{display:false},tooltip:{mode:"index",intersect:false,filter:i=> !(i.dataIndex===0||i.dataIndex===data.labels.length-1)}},
      scales:{
        x:{grid:{display:false},ticks:{autoSkip:false,maxRotation:40,minRotation:40,
          callback: dense ? ((v,i)=> (i===0||i===data.labels.length-1) ? "" : data.labels[i])
                           : ((v,i)=> (i===0||i===data.labels.length-1) ? "" : ((window.innerWidth<560? (i%3===0):(i%2===0)) ? data.labels[i] : ""))}},
        y:{beginAtZero:true,grid:{color:"rgba(15,23,42,.06)"},ticks:{callback:v=>Number(v).toLocaleString()}}
      }
    }});
    if(ctxId==="chartPrimer") CHART2=chart;
    return chart;
  }

  async function load2(){
    const err=document.getElementById("err2"); err.style.display="none"; err.textContent="";
    try{
      ensureDropdown(); updateTagsAndLegend();

      const csv = await fetchCSV(CSV2);
      RAW2 = Papa.parse(csv,{header:false,skipEmptyLines:true}).data;

      const data = computePerCat(RAW2,selectedKeys());
      draw2(data,document.getElementById("chkBaru").checked,document.getElementById("chkUlangan").checked,"chartPrimer",false);

      // dropdown wiring (after it exists)
      const ddBtn=document.getElementById("ddBtn");
      const ddMenu=document.getElementById("ddMenu");
      ddBtn.onclick=()=> ddMenu.classList.toggle("open");
      document.getElementById("btnClose").onclick=()=> ddMenu.classList.remove("open");
      document.getElementById("btnAll").onclick=()=>{
        ddMenu.querySelectorAll("input[type=checkbox]").forEach(i=>i.checked=true);
        updateTagsAndLegend(); const d=computePerCat(RAW2,selectedKeys());
        draw2(d,document.getElementById("chkBaru").checked,document.getElementById("chkUlangan").checked,"chartPrimer",false);
      };
      document.getElementById("btnNone").onclick=()=>{
        ddMenu.querySelectorAll("input[type=checkbox]").forEach(i=>i.checked=false);
        updateTagsAndLegend(); const d=computePerCat(RAW2,selectedKeys());
        draw2(d,document.getElementById("chkBaru").checked,document.getElementById("chkUlangan").checked,"chartPrimer",false);
      };
      ddMenu.querySelectorAll("input[type=checkbox]").forEach(i=>{
        i.addEventListener("change",()=>{
          updateTagsAndLegend(); const d=computePerCat(RAW2,selectedKeys());
          draw2(d,document.getElementById("chkBaru").checked,document.getElementById("chkUlangan").checked,"chartPrimer",false);
        });
      });
      document.addEventListener("click",(ev)=>{const box=document.getElementById("ddBox"); if(!box.contains(ev.target)) ddMenu.classList.remove("open");});
      document.getElementById("chkBaru").addEventListener("change",()=>{const d=computePerCat(RAW2,selectedKeys()); draw2(d,document.getElementById("chkBaru").checked,document.getElementById("chkUlangan").checked,"chartPrimer",false);});
      document.getElementById("chkUlangan").addEventListener("change",()=>{const d=computePerCat(RAW2,selectedKeys()); draw2(d,document.getElementById("chkBaru").checked,document.getElementById("chkUlangan").checked,"chartPrimer",false);});

      document.getElementById("lastUpdated2").textContent="Dikemas kini: "+new Date().toLocaleString();
    }catch(e){
      console.error("Tile 2 CSV error:", e);
      err.style.display='block';
      err.textContent="Gagal memuatkan CSV (Tile 2). Pastikan pautan 'Publish to web' aktif atau cuba semula.";
    }
  }
  document.getElementById("refreshBtn2").addEventListener("click",load2);
  load2();

  /* ---------- Modal (zoom) ---------- */
  const modal=document.getElementById("modal");
  const modalTitle=document.getElementById("modalTitle");
  const modalClose=document.getElementById("modalClose");
  let MODAL_CHART=null;

  function openModal(title){modalTitle.textContent=title;modal.classList.add("open");}
  function closeModal(){if(MODAL_CHART){MODAL_CHART.destroy();MODAL_CHART=null;}modal.classList.remove("open");}
  modalClose.addEventListener("click",closeModal);
  modal.addEventListener("click",e=>{if(e.target===modal)closeModal();});

  document.getElementById("zoom1").addEventListener("click",()=>{
    openModal("Akses Kepada Perkhidmatan Kesihatan Pergigian");
    if(!RAW1) return;
    MODAL_CHART=draw1(compute1(),"modalChart",true);
  });
  document.getElementById("zoom2").addEventListener("click",()=>{
    openModal("Jumlah Kedatangan Baru & Ulangan Mengikut Kumpulan");
    if(!RAW2) return;
    const d=computePerCat(RAW2,selectedKeys());
    MODAL_CHART=draw2(d,document.getElementById("chkBaru").checked,document.getElementById("chkUlangan").checked,"modalChart",true);
  });

  // Redraw on resize for nicer x-axis labels
  window.addEventListener("resize",()=>{
    if(RAW1){draw1(compute1(),"infogChart",false);}
    if(RAW2){const d=computePerCat(RAW2,selectedKeys());
      draw2(d,document.getElementById("chkBaru").checked,document.getElementById("chkUlangan").checked,"chartPrimer",false);}
  });
}());
